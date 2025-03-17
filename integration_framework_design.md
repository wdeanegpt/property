# Integration Framework Design Document

## Overview

The Integration Framework is a crucial component of the Comprehensive Property Management System, enabling seamless connectivity with external systems, third-party services, and APIs. This document outlines the architecture, features, and implementation details for the Integration Framework component.

## Architecture

The Integration Framework follows a modular architecture with the following layers:

1. **API Gateway Layer**: Central entry point for all external API requests
2. **Authentication & Authorization Layer**: Security layer for validating access
3. **Service Connector Layer**: Adapters for connecting to various external services
4. **Webhook Management Layer**: System for event-driven integrations
5. **Data Transformation Layer**: Converters for mapping between different data formats
6. **Monitoring & Logging Layer**: Tools for tracking integration performance and issues

### Component Hierarchy

```
IntegrationFramework
├── APIGateway
│   ├── APIRouteManager
│   ├── RateLimiter
│   ├── RequestValidator
│   ├── ResponseFormatter
│   └── VersionManager
├── AuthenticationService
│   ├── APIKeyManager
│   ├── OAuthConnector
│   ├── JWTValidator
│   └── PermissionManager
├── ServiceConnectors
│   ├── PaymentProcessors
│   │   ├── StripeConnector
│   │   ├── PayPalConnector
│   │   └── BankACHConnector
│   ├── BackgroundChecks
│   │   ├── TransUnionConnector
│   │   ├── EquifaxConnector
│   │   └── ExperianConnector
│   ├── PropertyListings
│   │   ├── ZillowConnector
│   │   ├── ApartmentsComConnector
│   │   └── RentComConnector
│   ├── CommunicationServices
│   │   ├── TwilioConnector
│   │   ├── SendGridConnector
│   │   └── MailchimpConnector
│   └── AccountingSystems
│       ├── QuickBooksConnector
│       ├── XeroConnector
│       └── SageConnector
├── WebhookSystem
│   ├── WebhookManager
│   ├── EventSubscriber
│   ├── PayloadProcessor
│   └── RetryManager
└── DataTransformer
    ├── DataMapper
    ├── SchemaValidator
    ├── FormatConverter
    └── DataEnricher
```

## Core Features

### 1. API Gateway

The API Gateway serves as the central entry point for all external API requests, providing routing, rate limiting, request validation, and response formatting.

#### Implementation Details

```javascript
// apiGateway.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { validateRequest } = require('./requestValidator');
const { formatResponse } = require('./responseFormatter');
const { authenticateRequest } = require('../authenticationService/authenticationService');
const { routeRequest } = require('./apiRouteManager');
const { logRequest, logResponse } = require('../monitoring/loggingService');

const router = express.Router();

// Configure rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.'
  }
});

// Apply rate limiting to all API routes
router.use(apiLimiter);

// Log all incoming requests
router.use((req, res, next) => {
  logRequest(req);
  next();
});

// Authenticate all API requests
router.use(authenticateRequest);

// Process API requests
router.all('/:version/:resource/:action?', async (req, res) => {
  try {
    // Validate the request format and parameters
    const validationResult = validateRequest(req);
    if (!validationResult.isValid) {
      return res.status(400).json(formatResponse({
        status: 'error',
        message: validationResult.message,
        errors: validationResult.errors
      }));
    }

    // Route the request to the appropriate handler
    const result = await routeRequest(req);

    // Format the response
    const formattedResponse = formatResponse(result);

    // Log the response
    logResponse(req, formattedResponse);

    // Send the response
    return res.status(result.statusCode || 200).json(formattedResponse);
  } catch (error) {
    // Log the error
    logResponse(req, { status: 'error', message: error.message });

    // Send error response
    return res.status(error.statusCode || 500).json(formatResponse({
      status: 'error',
      message: error.message,
      errors: error.errors
    }));
  }
});

module.exports = router;
```

```javascript
// apiRouteManager.js
const { getServiceConnector } = require('../serviceConnectors/serviceConnectorFactory');
const { transformRequest, transformResponse } = require('../dataTransformer/dataTransformer');

/**
 * Routes the API request to the appropriate service connector
 * @param {Object} req - Express request object
 * @returns {Object} - Result from the service connector
 */
async function routeRequest(req) {
  const { version, resource, action } = req.params;
  
  // Validate API version
  if (!isValidVersion(version)) {
    throw new Error(`Unsupported API version: ${version}`);
  }
  
  // Get the appropriate service connector
  const connector = getServiceConnector(resource);
  if (!connector) {
    throw new Error(`Unknown resource: ${resource}`);
  }
  
  // Transform the request data for the connector
  const transformedData = transformRequest(req.body, resource, action);
  
  // Call the appropriate method on the connector
  let result;
  if (action) {
    if (typeof connector[action] !== 'function') {
      throw new Error(`Unknown action: ${action} for resource: ${resource}`);
    }
    result = await connector[action](transformedData, req.query, req.user);
  } else {
    // Default actions based on HTTP method
    switch (req.method) {
      case 'GET':
        result = await connector.get(req.query, req.user);
        break;
      case 'POST':
        result = await connector.create(transformedData, req.user);
        break;
      case 'PUT':
        result = await connector.update(transformedData, req.user);
        break;
      case 'DELETE':
        result = await connector.delete(req.query, req.user);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${req.method}`);
    }
  }
  
  // Transform the response data
  return transformResponse(result, resource, action);
}

/**
 * Validates the API version
 * @param {string} version - API version string (e.g., 'v1')
 * @returns {boolean} - Whether the version is valid
 */
function isValidVersion(version) {
  const supportedVersions = ['v1', 'v2'];
  return supportedVersions.includes(version);
}

module.exports = {
  routeRequest
};
```

### 2. Authentication Service

The Authentication Service manages API keys, OAuth connections, JWT validation, and permission management for secure integration with external systems.

#### Implementation Details

```javascript
// authenticationService.js
const jwt = require('jsonwebtoken');
const { getAPIKey, validateAPIKey } = require('./apiKeyManager');
const { validateOAuthToken } = require('./oAuthConnector');
const { checkPermissions } = require('./permissionManager');
const { logAuthAttempt } = require('../monitoring/loggingService');

/**
 * Authenticates an incoming API request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function authenticateRequest(req, res, next) {
  try {
    // Get authentication method from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    let user;
    
    // Handle different authentication methods
    if (authHeader.startsWith('Bearer ')) {
      // JWT or OAuth token
      const token = authHeader.substring(7);
      
      // Try to validate as JWT
      try {
        user = validateJWT(token);
      } catch (jwtError) {
        // If JWT validation fails, try OAuth
        try {
          user = await validateOAuthToken(token);
        } catch (oauthError) {
          logAuthAttempt(req, false, 'Invalid token');
          return res.status(401).json({
            status: 'error',
            message: 'Invalid authentication token'
          });
        }
      }
    } else if (authHeader.startsWith('ApiKey ')) {
      // API Key authentication
      const apiKey = authHeader.substring(7);
      try {
        user = await validateAPIKey(apiKey);
      } catch (error) {
        logAuthAttempt(req, false, 'Invalid API key');
        return res.status(401).json({
          status: 'error',
          message: 'Invalid API key'
        });
      }
    } else {
      logAuthAttempt(req, false, 'Unsupported authentication method');
      return res.status(401).json({
        status: 'error',
        message: 'Unsupported authentication method'
      });
    }
    
    // Check if user has permission for the requested resource and action
    const { version, resource, action } = req.params;
    const hasPermission = await checkPermissions(user, resource, action || req.method);
    
    if (!hasPermission) {
      logAuthAttempt(req, false, 'Insufficient permissions');
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions'
      });
    }
    
    // Attach user to request object
    req.user = user;
    
    // Log successful authentication
    logAuthAttempt(req, true);
    
    // Continue to next middleware
    next();
  } catch (error) {
    logAuthAttempt(req, false, error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Authentication error',
      error: error.message
    });
  }
}

/**
 * Validates a JWT token
 * @param {string} token - JWT token
 * @returns {Object} - User object from token payload
 */
function validateJWT(token) {
  const secret = process.env.JWT_SECRET;
  const decoded = jwt.verify(token, secret);
  
  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp && decoded.exp < now) {
    throw new Error('Token expired');
  }
  
  return decoded.user;
}

module.exports = {
  authenticateRequest,
  validateJWT
};
```

```javascript
// apiKeyManager.js
const crypto = require('crypto');
const { getDatabase } = require('../../database/databaseService');

/**
 * Generates a new API key for a user
 * @param {string} userId - User ID
 * @param {string} scope - API key scope (e.g., 'read', 'write', 'admin')
 * @returns {Object} - API key details
 */
async function generateAPIKey(userId, scope) {
  // Generate a random API key
  const apiKey = crypto.randomBytes(32).toString('hex');
  
  // Hash the API key for storage
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  // Store the hashed key in the database
  const db = getDatabase();
  const result = await db.collection('api_keys').insertOne({
    userId,
    hashedKey,
    scope,
    createdAt: new Date(),
    lastUsed: null,
    isActive: true
  });
  
  return {
    id: result.insertedId,
    apiKey,
    scope,
    createdAt: new Date()
  };
}

/**
 * Validates an API key
 * @param {string} apiKey - API key to validate
 * @returns {Object} - User object if valid
 */
async function validateAPIKey(apiKey) {
  // Hash the provided API key
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  // Look up the key in the database
  const db = getDatabase();
  const keyRecord = await db.collection('api_keys').findOne({ hashedKey, isActive: true });
  
  if (!keyRecord) {
    throw new Error('Invalid API key');
  }
  
  // Update last used timestamp
  await db.collection('api_keys').updateOne(
    { _id: keyRecord._id },
    { $set: { lastUsed: new Date() } }
  );
  
  // Get user details
  const user = await db.collection('users').findOne({ _id: keyRecord.userId });
  if (!user) {
    throw new Error('User not found');
  }
  
  // Add API key scope to user object
  user.scope = keyRecord.scope;
  
  return user;
}

/**
 * Revokes an API key
 * @param {string} keyId - API key ID
 * @returns {boolean} - Success status
 */
async function revokeAPIKey(keyId) {
  const db = getDatabase();
  const result = await db.collection('api_keys').updateOne(
    { _id: keyId },
    { $set: { isActive: false } }
  );
  
  return result.modifiedCount > 0;
}

/**
 * Gets all API keys for a user
 * @param {string} userId - User ID
 * @returns {Array} - List of API key records
 */
async function getAPIKeysForUser(userId) {
  const db = getDatabase();
  const keys = await db.collection('api_keys')
    .find({ userId })
    .project({ hashedKey: 0 }) // Don't return the hashed key
    .toArray();
  
  return keys;
}

module.exports = {
  generateAPIKey,
  validateAPIKey,
  revokeAPIKey,
  getAPIKeysForUser
};
```

### 3. Service Connectors

The Service Connectors provide adapters for connecting to various external services, including payment processors, background check services, property listing platforms, communication services, and accounting systems.

#### Implementation Details

```javascript
// serviceConnectorFactory.js
const StripeConnector = require('./paymentProcessors/stripeConnector');
const PayPalConnector = require('./paymentProcessors/payPalConnector');
const BankACHConnector = require('./paymentProcessors/bankACHConnector');
const TransUnionConnector = require('./backgroundChecks/transUnionConnector');
const EquifaxConnector = require('./backgroundChecks/equifaxConnector');
const ExperianConnector = require('./backgroundChecks/experianConnector');
const ZillowConnector = require('./propertyListings/zillowConnector');
const ApartmentsComConnector = require('./propertyListings/apartmentsComConnector');
const RentComConnector = require('./propertyListings/rentComConnector');
const TwilioConnector = require('./communicationServices/twilioConnector');
const SendGridConnector = require('./communicationServices/sendGridConnector');
const MailchimpConnector = require('./communicationServices/mailchimpConnector');
const QuickBooksConnector = require('./accountingSystems/quickBooksConnector');
const XeroConnector = require('./accountingSystems/xeroConnector');
const SageConnector = require('./accountingSystems/sageConnector');

// Map of resource names to connector classes
const connectorMap = {
  // Payment processors
  'payments/stripe': StripeConnector,
  'payments/paypal': PayPalConnector,
  'payments/ach': BankACHConnector,
  
  // Background check services
  'background-checks/transunion': TransUnionConnector,
  'background-checks/equifax': EquifaxConnector,
  'background-checks/experian': ExperianConnector,
  
  // Property listing platforms
  'listings/zillow': ZillowConnector,
  'listings/apartments': ApartmentsComConnector,
  'listings/rent': RentComConnector,
  
  // Communication services
  'communications/twilio': TwilioConnector,
  'communications/sendgrid': SendGridConnector,
  'communications/mailchimp': MailchimpConnector,
  
  // Accounting systems
  'accounting/quickbooks': QuickBooksConnector,
  'accounting/xero': XeroConnector,
  'accounting/sage': SageConnector
};

// Singleton instances of connectors
const connectorInstances = {};

/**
 * Gets a service connector instance for the specified resource
 * @param {string} resource - Resource name
 * @returns {Object} - Service connector instance
 */
function getServiceConnector(resource) {
  // Check if resource exists in the connector map
  if (!connectorMap[resource]) {
    throw new Error(`Unknown resource: ${resource}`);
  }
  
  // Create instance if it doesn't exist
  if (!connectorInstances[resource]) {
    const ConnectorClass = connectorMap[resource];
    connectorInstances[resource] = new ConnectorClass();
  }
  
  return connectorInstances[resource];
}

module.exports = {
  getServiceConnector
};
```

```javascript
// stripeConnector.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { logIntegrationEvent } = require('../../monitoring/loggingService');

class StripeConnector {
  /**
   * Creates a payment intent
   * @param {Object} data - Payment data
   * @param {Object} user - User making the request
   * @returns {Object} - Created payment intent
   */
  async createPaymentIntent(data, user) {
    try {
      logIntegrationEvent('stripe', 'createPaymentIntent', 'start', { userId: user.id });
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency || 'usd',
        description: data.description,
        metadata: {
          propertyId: data.propertyId,
          unitId: data.unitId,
          tenantId: data.tenantId,
          paymentType: data.paymentType
        }
      });
      
      logIntegrationEvent('stripe', 'createPaymentIntent', 'success', { 
        userId: user.id,
        paymentIntentId: paymentIntent.id
      });
      
      return {
        status: 'success',
        data: {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount / 100, // Convert back to dollars
          currency: paymentIntent.currency,
          status: paymentIntent.status
        }
      };
    } catch (error) {
      logIntegrationEvent('stripe', 'createPaymentIntent', 'error', { 
        userId: user.id,
        error: error.message
      });
      
      throw {
        status: 'error',
        message: 'Failed to create payment intent',
        error: error.message,
        statusCode: 400
      };
    }
  }
  
  /**
   * Retrieves a payment intent
   * @param {Object} query - Query parameters
   * @param {Object} user - User making the request
   * @returns {Object} - Payment intent details
   */
  async getPaymentIntent(query, user) {
    try {
      if (!query.paymentIntentId) {
        throw new Error('Payment intent ID is required');
      }
      
      logIntegrationEvent('stripe', 'getPaymentIntent', 'start', { 
        userId: user.id,
        paymentIntentId: query.paymentIntentId
      });
      
      const paymentIntent = await stripe.paymentIntents.retrieve(query.paymentIntentId);
      
      logIntegrationEvent('stripe', 'getPaymentIntent', 'success', { 
        userId: user.id,
        paymentIntentId: query.paymentIntentId
      });
      
      return {
        status: 'success',
        data: {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert to dollars
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          description: paymentIntent.description,
          metadata: paymentIntent.metadata
        }
      };
    } catch (error) {
      logIntegrationEvent('stripe', 'getPaymentIntent', 'error', { 
        userId: user.id,
        paymentIntentId: query.paymentIntentId,
        error: error.message
      });
      
      throw {
        status: 'error',
        message: 'Failed to retrieve payment intent',
        error: error.message,
        statusCode: 400
      };
    }
  }
  
  /**
   * Creates a customer
   * @param {Object} data - Customer data
   * @param {Object} user - User making the request
   * @returns {Object} - Created customer
   */
  async createCustomer(data, user) {
    try {
      logIntegrationEvent('stripe', 'createCustomer', 'start', { userId: user.id });
      
      const customer = await stripe.customers.create({
        email: data.email,
        name: data.name,
        phone: data.phone,
        metadata: {
          tenantId: data.tenantId,
          propertyId: data.propertyId,
          unitId: data.unitId
        }
      });
      
      logIntegrationEvent('stripe', 'createCustomer', 'success', { 
        userId: user.id,
        customerId: customer.id
      });
      
      return {
        status: 'success',
        data: {
          customerId: customer.id,
          email: customer.email,
          name: customer.name,
          phone: customer.phone
        }
      };
    } catch (error) {
      logIntegrationEvent('stripe', 'createCustomer', 'error', { 
        userId: user.id,
        error: error.message
      });
      
      throw {
        status: 'error',
        message: 'Failed to create customer',
        error: error.message,
        statusCode: 400
      };
    }
  }
  
  /**
   * Creates a subscription
   * @param {Object} data - Subscription data
   * @param {Object} user - User making the request
   * @returns {Object} - Created subscription
   */
  async createSubscription(data, user) {
    try {
      if (!data.customerId) {
        throw new Error('Customer ID is required');
      }
      
      if (!data.priceId) {
        throw new Error('Price ID is required');
      }
      
      logIntegrationEvent('stripe', 'createSubscription', 'start', { 
        userId: user.id,
        customerId: data.customerId
      });
      
      const subscription = await stripe.subscriptions.create({
        customer: data.customerId,
        items: [{ price: data.priceId }],
        metadata: {
          propertyId: data.propertyId,
          unitId: data.unitId,
          tenantId: data.tenantId,
          subscriptionType: data.subscriptionType
        }
      });
      
      logIntegrationEvent('stripe', 'createSubscription', 'success', { 
        userId: user.id,
        subscriptionId: subscription.id
      });
      
      return {
        status: 'success',
        data: {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000)
        }
      };
    } catch (error) {
      logIntegrationEvent('stripe', 'createSubscription', 'error', { 
        userId: user.id,
        error: error.message
      });
      
      throw {
        status: 'error',
        message: 'Failed to create subscription',
        error: error.message,
        statusCode: 400
      };
    }
  }
  
  /**
   * Cancels a subscription
   * @param {Object} data - Subscription data
   * @param {Object} user - User making the request
   * @returns {Object} - Canceled subscription
   */
  async cancelSubscription(data, user) {
    try {
      if (!data.subscriptionId) {
        throw new Error('Subscription ID is required');
      }
      
      logIntegrationEvent('stripe', 'cancelSubscription', 'start', { 
        userId: user.id,
        subscriptionId: data.subscriptionId
      });
      
      const subscription = await stripe.subscriptions.del(data.subscriptionId);
      
      logIntegrationEvent('stripe', 'cancelSubscription', 'success', { 
        userId: user.id,
        subscriptionId: data.subscriptionId
      });
      
      return {
        status: 'success',
        data: {
          subscriptionId: subscription.id,
          status: subscription.status,
          canceledAt: new Date(subscription.canceled_at * 1000)
        }
      };
    } catch (error) {
      logIntegrationEvent('stripe', 'cancelSubscription', 'error', { 
        userId: user.id,
        subscriptionId: data.subscriptionId,
        error: error.message
      });
      
      throw {
        status: 'error',
        message: 'Failed to cancel subscription',
        error: error.message,
        statusCode: 400
      };
    }
  }
  
  /**
   * Handles a webhook event from Stripe
   * @param {Object} data - Webhook event data
   * @returns {Object} - Processing result
   */
  async handleWebhook(data) {
    try {
      const event = stripe.webhooks.constructEvent(
        data.payload,
        data.signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      
      logIntegrationEvent('stripe', 'webhook', 'received', { 
        eventType: event.type,
        eventId: event.id
      });
      
      // Process different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        default:
          // Log unhandled event type
          logIntegrationEvent('stripe', 'webhook', 'unhandled', { 
            eventType: event.type,
            eventId: event.id
          });
      }
      
      return {
        status: 'success',
        message: 'Webhook processed successfully'
      };
    } catch (error) {
      logIntegrationEvent('stripe', 'webhook', 'error', { 
        error: error.message
      });
      
      throw {
        status: 'error',
        message: 'Failed to process webhook',
        error: error.message,
        statusCode: 400
      };
    }
  }
  
  // Private webhook event handlers
  
  async handlePaymentSucceeded(paymentIntent) {
    // Implementation for handling successful payments
    // Update payment records in the database
    // Notify relevant users
    logIntegrationEvent('stripe', 'paymentSucceeded', 'processed', { 
      paymentIntentId: paymentIntent.id
    });
  }
  
  async handlePaymentFailed(paymentIntent) {
    // Implementation for handling failed payments
    // Update payment records in the database
    // Notify relevant users
    logIntegrationEvent('stripe', 'paymentFailed', 'processed', { 
      paymentIntentId: paymentIntent.id,
      error: paymentIntent.last_payment_error?.message
    });
  }
  
  async handleSubscriptionCreated(subscription) {
    // Implementation for handling new subscriptions
    // Update subscription records in the database
    logIntegrationEvent('stripe', 'subscriptionCreated', 'processed', { 
      subscriptionId: subscription.id
    });
  }
  
  async handleSubscriptionUpdated(subscription) {
    // Implementation for handling subscription updates
    // Update subscription records in the database
    logIntegrationEvent('stripe', 'subscriptionUpdated', 'processed', { 
      subscriptionId: subscription.id,
      status: subscription.status
    });
  }
  
  async handleSubscriptionDeleted(subscription) {
    // Implementation for handling subscription deletions
    // Update subscription records in the database
    logIntegrationEvent('stripe', 'subscriptionDeleted', 'processed', { 
      subscriptionId: subscription.id
    });
  }
}

module.exports = StripeConnector;
```

### 4. Webhook System

The Webhook System enables event-driven integrations, allowing external systems to subscribe to events and receive notifications when those events occur.

#### Implementation Details

```javascript
// webhookManager.js
const crypto = require('crypto');
const { getDatabase } = require('../../database/databaseService');
const { logWebhookEvent } = require('../monitoring/loggingService');
const { validateSignature } = require('./webhookSecurity');

/**
 * Registers a new webhook subscription
 * @param {Object} subscription - Webhook subscription details
 * @returns {Object} - Created subscription
 */
async function registerWebhook(subscription) {
  try {
    // Validate required fields
    if (!subscription.url || !subscription.events || !subscription.userId) {
      throw new Error('Missing required fields: url, events, userId');
    }
    
    // Generate a secret for the webhook
    const secret = crypto.randomBytes(32).toString('hex');
    
    // Create the subscription record
    const db = getDatabase();
    const result = await db.collection('webhook_subscriptions').insertOne({
      url: subscription.url,
      events: Array.isArray(subscription.events) ? subscription.events : [subscription.events],
      userId: subscription.userId,
      description: subscription.description || '',
      secret,
      createdAt: new Date(),
      isActive: true,
      lastTriggered: null,
      failureCount: 0
    });
    
    logWebhookEvent('register', 'success', {
      subscriptionId: result.insertedId,
      userId: subscription.userId
    });
    
    return {
      id: result.insertedId,
      url: subscription.url,
      events: Array.isArray(subscription.events) ? subscription.events : [subscription.events],
      description: subscription.description || '',
      secret,
      createdAt: new Date()
    };
  } catch (error) {
    logWebhookEvent('register', 'error', {
      error: error.message,
      subscription
    });
    
    throw error;
  }
}

/**
 * Updates an existing webhook subscription
 * @param {string} id - Subscription ID
 * @param {Object} updates - Fields to update
 * @returns {Object} - Updated subscription
 */
async function updateWebhook(id, updates) {
  try {
    const db = getDatabase();
    
    // Get the current subscription
    const subscription = await db.collection('webhook_subscriptions').findOne({ _id: id });
    if (!subscription) {
      throw new Error('Webhook subscription not found');
    }
    
    // Prepare update object
    const updateObj = {};
    if (updates.url) updateObj.url = updates.url;
    if (updates.events) updateObj.events = Array.isArray(updates.events) ? updates.events : [updates.events];
    if (updates.description !== undefined) updateObj.description = updates.description;
    if (updates.isActive !== undefined) updateObj.isActive = updates.isActive;
    
    // Update the subscription
    await db.collection('webhook_subscriptions').updateOne(
      { _id: id },
      { $set: updateObj }
    );
    
    // Get the updated subscription
    const updatedSubscription = await db.collection('webhook_subscriptions').findOne({ _id: id });
    
    logWebhookEvent('update', 'success', {
      subscriptionId: id,
      userId: subscription.userId
    });
    
    return {
      id: updatedSubscription._id,
      url: updatedSubscription.url,
      events: updatedSubscription.events,
      description: updatedSubscription.description,
      isActive: updatedSubscription.isActive,
      createdAt: updatedSubscription.createdAt,
      lastTriggered: updatedSubscription.lastTriggered
    };
  } catch (error) {
    logWebhookEvent('update', 'error', {
      error: error.message,
      subscriptionId: id
    });
    
    throw error;
  }
}

/**
 * Deletes a webhook subscription
 * @param {string} id - Subscription ID
 * @returns {boolean} - Success status
 */
async function deleteWebhook(id) {
  try {
    const db = getDatabase();
    
    // Get the subscription to log the userId
    const subscription = await db.collection('webhook_subscriptions').findOne({ _id: id });
    if (!subscription) {
      throw new Error('Webhook subscription not found');
    }
    
    // Delete the subscription
    const result = await db.collection('webhook_subscriptions').deleteOne({ _id: id });
    
    logWebhookEvent('delete', 'success', {
      subscriptionId: id,
      userId: subscription.userId
    });
    
    return result.deletedCount > 0;
  } catch (error) {
    logWebhookEvent('delete', 'error', {
      error: error.message,
      subscriptionId: id
    });
    
    throw error;
  }
}

/**
 * Gets all webhook subscriptions for a user
 * @param {string} userId - User ID
 * @returns {Array} - List of webhook subscriptions
 */
async function getWebhooksForUser(userId) {
  try {
    const db = getDatabase();
    const subscriptions = await db.collection('webhook_subscriptions')
      .find({ userId })
      .project({ secret: 0 }) // Don't return the secret
      .toArray();
    
    return subscriptions.map(sub => ({
      id: sub._id,
      url: sub.url,
      events: sub.events,
      description: sub.description,
      isActive: sub.isActive,
      createdAt: sub.createdAt,
      lastTriggered: sub.lastTriggered,
      failureCount: sub.failureCount
    }));
  } catch (error) {
    logWebhookEvent('getForUser', 'error', {
      error: error.message,
      userId
    });
    
    throw error;
  }
}

/**
 * Triggers webhooks for a specific event
 * @param {string} eventType - Type of event
 * @param {Object} eventData - Event data
 * @returns {Object} - Delivery results
 */
async function triggerWebhooks(eventType, eventData) {
  try {
    const db = getDatabase();
    
    // Find all active subscriptions for this event type
    const subscriptions = await db.collection('webhook_subscriptions')
      .find({
        events: eventType,
        isActive: true
      })
      .toArray();
    
    if (subscriptions.length === 0) {
      return { delivered: 0, failed: 0 };
    }
    
    // Prepare the payload
    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: eventData
    };
    
    // Deliver to each subscription
    const deliveryPromises = subscriptions.map(subscription => 
      deliverWebhook(subscription, payload)
    );
    
    // Wait for all deliveries to complete
    const results = await Promise.allSettled(deliveryPromises);
    
    // Count successes and failures
    const delivered = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - delivered;
    
    logWebhookEvent('trigger', 'complete', {
      eventType,
      delivered,
      failed,
      total: subscriptions.length
    });
    
    return { delivered, failed };
  } catch (error) {
    logWebhookEvent('trigger', 'error', {
      error: error.message,
      eventType
    });
    
    throw error;
  }
}

/**
 * Delivers a webhook payload to a subscription
 * @param {Object} subscription - Webhook subscription
 * @param {Object} payload - Event payload
 * @returns {boolean} - Success status
 */
async function deliverWebhook(subscription, payload) {
  try {
    // Generate signature for the payload
    const signature = crypto
      .createHmac('sha256', subscription.secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    // Send the webhook
    const response = await fetch(subscription.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      body: JSON.stringify(payload)
    });
    
    const success = response.ok;
    
    // Update the subscription record
    const db = getDatabase();
    await db.collection('webhook_subscriptions').updateOne(
      { _id: subscription._id },
      { 
        $set: { lastTriggered: new Date() },
        $inc: { failureCount: success ? 0 : 1 }
      }
    );
    
    // Log the delivery
    logWebhookEvent('deliver', success ? 'success' : 'failure', {
      subscriptionId: subscription._id,
      url: subscription.url,
      eventType: payload.event,
      statusCode: response.status
    });
    
    return success;
  } catch (error) {
    // Update the failure count
    const db = getDatabase();
    await db.collection('webhook_subscriptions').updateOne(
      { _id: subscription._id },
      { 
        $set: { lastTriggered: new Date() },
        $inc: { failureCount: 1 }
      }
    );
    
    // Log the error
    logWebhookEvent('deliver', 'error', {
      subscriptionId: subscription._id,
      url: subscription.url,
      eventType: payload.event,
      error: error.message
    });
    
    return false;
  }
}

/**
 * Validates a webhook request
 * @param {Object} req - Express request object
 * @returns {boolean} - Validation result
 */
async function validateWebhookRequest(req) {
  try {
    // Get the signature from the headers
    const signature = req.headers['x-webhook-signature'];
    if (!signature) {
      return false;
    }
    
    // Get the webhook ID from the URL
    const webhookId = req.params.webhookId;
    if (!webhookId) {
      return false;
    }
    
    // Get the webhook subscription
    const db = getDatabase();
    const subscription = await db.collection('webhook_subscriptions').findOne({ _id: webhookId });
    if (!subscription) {
      return false;
    }
    
    // Validate the signature
    return validateSignature(req.body, signature, subscription.secret);
  } catch (error) {
    logWebhookEvent('validate', 'error', {
      error: error.message
    });
    
    return false;
  }
}

module.exports = {
  registerWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhooksForUser,
  triggerWebhooks,
  validateWebhookRequest
};
```

```javascript
// webhookController.js
const express = require('express');
const { 
  registerWebhook, 
  updateWebhook, 
  deleteWebhook, 
  getWebhooksForUser,
  validateWebhookRequest
} = require('./webhookManager');
const { authenticateRequest } = require('../authenticationService/authenticationService');

const router = express.Router();

// Apply authentication to all webhook routes
router.use(authenticateRequest);

// Register a new webhook
router.post('/', async (req, res) => {
  try {
    const subscription = {
      ...req.body,
      userId: req.user.id
    };
    
    const result = await registerWebhook(subscription);
    
    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get all webhooks for the authenticated user
router.get('/', async (req, res) => {
  try {
    const webhooks = await getWebhooksForUser(req.user.id);
    
    res.status(200).json({
      status: 'success',
      data: webhooks
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Update a webhook
router.put('/:id', async (req, res) => {
  try {
    const result = await updateWebhook(req.params.id, req.body);
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Delete a webhook
router.delete('/:id', async (req, res) => {
  try {
    const result = await deleteWebhook(req.params.id);
    
    res.status(200).json({
      status: 'success',
      data: { deleted: result }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Webhook receiver endpoint
router.post('/receive/:webhookId', async (req, res) => {
  try {
    const isValid = await validateWebhookRequest(req);
    
    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid webhook signature'
      });
    }
    
    // Process the webhook payload
    // Implementation depends on the specific webhook type
    
    res.status(200).json({
      status: 'success',
      message: 'Webhook received successfully'
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
```

### 5. Data Transformer

The Data Transformer provides utilities for mapping between different data formats, validating schemas, and enriching data with additional information.

#### Implementation Details

```javascript
// dataTransformer.js
const Ajv = require('ajv');
const { getSchemaForResource } = require('./schemaRegistry');
const { logTransformationEvent } = require('../monitoring/loggingService');

// Initialize JSON schema validator
const ajv = new Ajv({ allErrors: true });

/**
 * Transforms request data for a service connector
 * @param {Object} data - Request data
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 * @returns {Object} - Transformed data
 */
function transformRequest(data, resource, action) {
  try {
    logTransformationEvent('request', 'start', { resource, action });
    
    // Get the schema for this resource and action
    const schema = getSchemaForResource(resource, action, 'request');
    
    // Validate the data against the schema
    if (schema) {
      const validate = ajv.compile(schema);
      const valid = validate(data);
      
      if (!valid) {
        const errors = validate.errors.map(err => ({
          field: err.dataPath,
          message: err.message
        }));
        
        logTransformationEvent('request', 'validation_error', { 
          resource, 
          action,
          errors
        });
        
        throw {
          message: 'Invalid request data',
          errors
        };
      }
    }
    
    // Apply resource-specific transformations
    let transformedData = { ...data };
    
    switch (resource) {
      case 'payments/stripe':
        transformedData = transformStripeRequest(data, action);
        break;
      case 'background-checks/transunion':
        transformedData = transformTransUnionRequest(data, action);
        break;
      case 'listings/zillow':
        transformedData = transformZillowRequest(data, action);
        break;
      // Add cases for other resources as needed
      default:
        // No specific transformation needed
        break;
    }
    
    logTransformationEvent('request', 'success', { resource, action });
    
    return transformedData;
  } catch (error) {
    logTransformationEvent('request', 'error', { 
      resource, 
      action,
      error: error.message
    });
    
    throw error;
  }
}

/**
 * Transforms response data from a service connector
 * @param {Object} data - Response data
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 * @returns {Object} - Transformed data
 */
function transformResponse(data, resource, action) {
  try {
    logTransformationEvent('response', 'start', { resource, action });
    
    // Get the schema for this resource and action
    const schema = getSchemaForResource(resource, action, 'response');
    
    // Validate the data against the schema
    if (schema) {
      const validate = ajv.compile(schema);
      const valid = validate(data);
      
      if (!valid) {
        const errors = validate.errors.map(err => ({
          field: err.dataPath,
          message: err.message
        }));
        
        logTransformationEvent('response', 'validation_error', { 
          resource, 
          action,
          errors
        });
        
        throw {
          message: 'Invalid response data from external service',
          errors
        };
      }
    }
    
    // Apply resource-specific transformations
    let transformedData = { ...data };
    
    switch (resource) {
      case 'payments/stripe':
        transformedData = transformStripeResponse(data, action);
        break;
      case 'background-checks/transunion':
        transformedData = transformTransUnionResponse(data, action);
        break;
      case 'listings/zillow':
        transformedData = transformZillowResponse(data, action);
        break;
      // Add cases for other resources as needed
      default:
        // No specific transformation needed
        break;
    }
    
    logTransformationEvent('response', 'success', { resource, action });
    
    return transformedData;
  } catch (error) {
    logTransformationEvent('response', 'error', { 
      resource, 
      action,
      error: error.message
    });
    
    throw error;
  }
}

// Resource-specific transformation functions

function transformStripeRequest(data, action) {
  // Apply Stripe-specific transformations
  switch (action) {
    case 'createPaymentIntent':
      // Convert amount from dollars to cents
      return {
        ...data,
        amount: Math.round(data.amount * 100)
      };
    default:
      return data;
  }
}

function transformStripeResponse(data, action) {
  // Apply Stripe-specific transformations
  switch (action) {
    case 'createPaymentIntent':
    case 'getPaymentIntent':
      // Convert amount from cents to dollars
      if (data.data && data.data.amount) {
        return {
          ...data,
          data: {
            ...data.data,
            amount: data.data.amount / 100
          }
        };
      }
      return data;
    default:
      return data;
  }
}

function transformTransUnionRequest(data, action) {
  // Apply TransUnion-specific transformations
  switch (action) {
    case 'requestCreditReport':
      // Format SSN without dashes
      if (data.ssn) {
        return {
          ...data,
          ssn: data.ssn.replace(/-/g, '')
        };
      }
      return data;
    default:
      return data;
  }
}

function transformTransUnionResponse(data, action) {
  // Apply TransUnion-specific transformations
  return data;
}

function transformZillowRequest(data, action) {
  // Apply Zillow-specific transformations
  return data;
}

function transformZillowResponse(data, action) {
  // Apply Zillow-specific transformations
  return data;
}

module.exports = {
  transformRequest,
  transformResponse
};
```

```javascript
// schemaRegistry.js
// This file contains JSON schemas for validating requests and responses

const schemas = {
  'payments/stripe': {
    'createPaymentIntent': {
      request: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number', minimum: 0.5 },
          currency: { type: 'string', default: 'usd' },
          description: { type: 'string' },
          propertyId: { type: 'string' },
          unitId: { type: 'string' },
          tenantId: { type: 'string' },
          paymentType: { type: 'string' }
        }
      },
      response: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success', 'error'] },
          data: {
            type: 'object',
            required: ['paymentIntentId', 'clientSecret', 'amount', 'currency', 'status'],
            properties: {
              paymentIntentId: { type: 'string' },
              clientSecret: { type: 'string' },
              amount: { type: 'number' },
              currency: { type: 'string' },
              status: { type: 'string' }
            }
          }
        }
      }
    },
    'getPaymentIntent': {
      request: {
        type: 'object',
        required: ['paymentIntentId'],
        properties: {
          paymentIntentId: { type: 'string' }
        }
      },
      response: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success', 'error'] },
          data: {
            type: 'object',
            required: ['paymentIntentId', 'amount', 'currency', 'status'],
            properties: {
              paymentIntentId: { type: 'string' },
              amount: { type: 'number' },
              currency: { type: 'string' },
              status: { type: 'string' },
              description: { type: 'string' },
              metadata: { type: 'object' }
            }
          }
        }
      }
    }
  },
  'background-checks/transunion': {
    'requestCreditReport': {
      request: {
        type: 'object',
        required: ['firstName', 'lastName', 'ssn', 'dateOfBirth', 'address'],
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          ssn: { type: 'string', pattern: '^[0-9]{3}-?[0-9]{2}-?[0-9]{4}$' },
          dateOfBirth: { type: 'string', format: 'date' },
          address: {
            type: 'object',
            required: ['street', 'city', 'state', 'zipCode'],
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string', minLength: 2, maxLength: 2 },
              zipCode: { type: 'string', pattern: '^[0-9]{5}(-[0-9]{4})?$' }
            }
          }
        }
      },
      response: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success', 'error'] },
          data: {
            type: 'object',
            required: ['reportId', 'creditScore'],
            properties: {
              reportId: { type: 'string' },
              creditScore: { type: 'number' },
              reportUrl: { type: 'string' },
              reportDate: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  }
  // Add schemas for other resources and actions as needed
};

/**
 * Gets the JSON schema for a specific resource, action, and direction
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 * @param {string} direction - 'request' or 'response'
 * @returns {Object|null} - JSON schema or null if not found
 */
function getSchemaForResource(resource, action, direction) {
  if (!schemas[resource]) {
    return null;
  }
  
  if (!schemas[resource][action]) {
    return null;
  }
  
  return schemas[resource][action][direction] || null;
}

module.exports = {
  getSchemaForResource
};
```

## API Services

The Integration Framework communicates with external systems through the following services:

### Integration Service

```javascript
// integrationService.js
const axios = require('axios');
const { getServiceConnector } = require('../serviceConnectors/serviceConnectorFactory');
const { logIntegrationEvent } = require('../monitoring/loggingService');

/**
 * Executes an integration operation
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 * @param {Object} data - Request data
 * @param {Object} user - User making the request
 * @returns {Object} - Result from the integration
 */
async function executeIntegration(resource, action, data, user) {
  try {
    logIntegrationEvent(resource, action, 'start', { userId: user.id });
    
    // Get the appropriate service connector
    const connector = getServiceConnector(resource);
    if (!connector) {
      throw new Error(`Unknown resource: ${resource}`);
    }
    
    // Check if the connector supports the requested action
    if (typeof connector[action] !== 'function') {
      throw new Error(`Unknown action: ${action} for resource: ${resource}`);
    }
    
    // Execute the action
    const result = await connector[action](data, user);
    
    logIntegrationEvent(resource, action, 'success', { 
      userId: user.id,
      resultStatus: result.status
    });
    
    return result;
  } catch (error) {
    logIntegrationEvent(resource, action, 'error', { 
      userId: user.id,
      error: error.message
    });
    
    throw error;
  }
}

/**
 * Gets available integrations for a user
 * @param {Object} user - User object
 * @returns {Array} - List of available integrations
 */
async function getAvailableIntegrations(user) {
  try {
    // This would typically come from a database
    // For now, we'll return a static list based on user role
    const integrations = [];
    
    // Payment processors - available to all roles
    integrations.push({
      category: 'Payment Processors',
      integrations: [
        {
          id: 'payments/stripe',
          name: 'Stripe',
          description: 'Process credit card payments and subscriptions',
          status: 'available',
          actions: ['createPaymentIntent', 'getPaymentIntent', 'createCustomer', 'createSubscription', 'cancelSubscription']
        },
        {
          id: 'payments/paypal',
          name: 'PayPal',
          description: 'Process PayPal payments',
          status: 'available',
          actions: ['createPayment', 'getPayment', 'refundPayment']
        },
        {
          id: 'payments/ach',
          name: 'Bank ACH',
          description: 'Process bank transfers via ACH',
          status: 'available',
          actions: ['initiateTransfer', 'getTransferStatus']
        }
      ]
    });
    
    // Background check services - only for property managers and admins
    if (['property_manager', 'admin'].includes(user.role)) {
      integrations.push({
        category: 'Background Check Services',
        integrations: [
          {
            id: 'background-checks/transunion',
            name: 'TransUnion',
            description: 'Run credit and background checks',
            status: 'available',
            actions: ['requestCreditReport', 'requestBackgroundCheck', 'getReportStatus']
          },
          {
            id: 'background-checks/equifax',
            name: 'Equifax',
            description: 'Run credit checks',
            status: 'available',
            actions: ['requestCreditReport', 'getReportStatus']
          },
          {
            id: 'background-checks/experian',
            name: 'Experian',
            description: 'Run credit checks',
            status: 'available',
            actions: ['requestCreditReport', 'getReportStatus']
          }
        ]
      });
    }
    
    // Property listing platforms - only for property managers and admins
    if (['property_manager', 'admin'].includes(user.role)) {
      integrations.push({
        category: 'Property Listing Platforms',
        integrations: [
          {
            id: 'listings/zillow',
            name: 'Zillow',
            description: 'List properties on Zillow',
            status: 'available',
            actions: ['createListing', 'updateListing', 'deleteListing', 'getListing']
          },
          {
            id: 'listings/apartments',
            name: 'Apartments.com',
            description: 'List properties on Apartments.com',
            status: 'available',
            actions: ['createListing', 'updateListing', 'deleteListing', 'getListing']
          },
          {
            id: 'listings/rent',
            name: 'Rent.com',
            description: 'List properties on Rent.com',
            status: 'available',
            actions: ['createListing', 'updateListing', 'deleteListing', 'getListing']
          }
        ]
      });
    }
    
    // Communication services - available to all roles
    integrations.push({
      category: 'Communication Services',
      integrations: [
        {
          id: 'communications/twilio',
          name: 'Twilio',
          description: 'Send SMS and make phone calls',
          status: 'available',
          actions: ['sendSMS', 'makeCall', 'getMessageStatus']
        },
        {
          id: 'communications/sendgrid',
          name: 'SendGrid',
          description: 'Send transactional emails',
          status: 'available',
          actions: ['sendEmail', 'getEmailStatus']
        },
        {
          id: 'communications/mailchimp',
          name: 'Mailchimp',
          description: 'Send marketing emails and newsletters',
          status: 'available',
          actions: ['addContact', 'removeContact', 'createCampaign', 'sendCampaign']
        }
      ]
    });
    
    // Accounting systems - only for property managers and admins
    if (['property_manager', 'admin'].includes(user.role)) {
      integrations.push({
        category: 'Accounting Systems',
        integrations: [
          {
            id: 'accounting/quickbooks',
            name: 'QuickBooks',
            description: 'Sync financial data with QuickBooks',
            status: 'available',
            actions: ['syncInvoices', 'syncPayments', 'syncExpenses', 'getAccountBalance']
          },
          {
            id: 'accounting/xero',
            name: 'Xero',
            description: 'Sync financial data with Xero',
            status: 'available',
            actions: ['syncInvoices', 'syncPayments', 'syncExpenses', 'getAccountBalance']
          },
          {
            id: 'accounting/sage',
            name: 'Sage',
            description: 'Sync financial data with Sage',
            status: 'available',
            actions: ['syncInvoices', 'syncPayments', 'syncExpenses', 'getAccountBalance']
          }
        ]
      });
    }
    
    return integrations;
  } catch (error) {
    logIntegrationEvent('getAvailableIntegrations', 'error', { 
      userId: user.id,
      error: error.message
    });
    
    throw error;
  }
}

/**
 * Gets integration settings for a user
 * @param {string} userId - User ID
 * @returns {Object} - Integration settings
 */
async function getIntegrationSettings(userId) {
  try {
    // This would typically come from a database
    // For now, we'll return a static object
    return {
      'payments/stripe': {
        enabled: true,
        settings: {
          publicKey: 'pk_test_...',
          webhookEnabled: true
        }
      },
      'background-checks/transunion': {
        enabled: true,
        settings: {
          autoRequestReports: true
        }
      },
      'listings/zillow': {
        enabled: false,
        settings: {}
      },
      'communications/twilio': {
        enabled: true,
        settings: {
          defaultSender: '+15551234567'
        }
      },
      'accounting/quickbooks': {
        enabled: false,
        settings: {}
      }
    };
  } catch (error) {
    logIntegrationEvent('getIntegrationSettings', 'error', { 
      userId,
      error: error.message
    });
    
    throw error;
  }
}

/**
 * Updates integration settings for a user
 * @param {string} userId - User ID
 * @param {string} integrationId - Integration ID
 * @param {Object} settings - New settings
 * @returns {Object} - Updated settings
 */
async function updateIntegrationSettings(userId, integrationId, settings) {
  try {
    // This would typically update a database
    // For now, we'll just return the input
    return {
      enabled: settings.enabled,
      settings: settings.settings
    };
  } catch (error) {
    logIntegrationEvent('updateIntegrationSettings', 'error', { 
      userId,
      integrationId,
      error: error.message
    });
    
    throw error;
  }
}

module.exports = {
  executeIntegration,
  getAvailableIntegrations,
  getIntegrationSettings,
  updateIntegrationSettings
};
```

### Webhook Service

```javascript
// webhookService.js
const { 
  registerWebhook, 
  updateWebhook, 
  deleteWebhook, 
  getWebhooksForUser,
  triggerWebhooks
} = require('../webhookSystem/webhookManager');
const { logWebhookEvent } = require('../monitoring/loggingService');

/**
 * Registers a new webhook subscription
 * @param {Object} subscription - Webhook subscription details
 * @returns {Object} - Created subscription
 */
async function createWebhookSubscription(subscription) {
  try {
    return await registerWebhook(subscription);
  } catch (error) {
    logWebhookEvent('service_create', 'error', {
      error: error.message,
      subscription
    });
    
    throw error;
  }
}

/**
 * Updates an existing webhook subscription
 * @param {string} id - Subscription ID
 * @param {Object} updates - Fields to update
 * @returns {Object} - Updated subscription
 */
async function updateWebhookSubscription(id, updates) {
  try {
    return await updateWebhook(id, updates);
  } catch (error) {
    logWebhookEvent('service_update', 'error', {
      error: error.message,
      subscriptionId: id
    });
    
    throw error;
  }
}

/**
 * Deletes a webhook subscription
 * @param {string} id - Subscription ID
 * @returns {boolean} - Success status
 */
async function deleteWebhookSubscription(id) {
  try {
    return await deleteWebhook(id);
  } catch (error) {
    logWebhookEvent('service_delete', 'error', {
      error: error.message,
      subscriptionId: id
    });
    
    throw error;
  }
}

/**
 * Gets all webhook subscriptions for a user
 * @param {string} userId - User ID
 * @returns {Array} - List of webhook subscriptions
 */
async function getUserWebhookSubscriptions(userId) {
  try {
    return await getWebhooksForUser(userId);
  } catch (error) {
    logWebhookEvent('service_getForUser', 'error', {
      error: error.message,
      userId
    });
    
    throw error;
  }
}

/**
 * Triggers webhooks for a specific event
 * @param {string} eventType - Type of event
 * @param {Object} eventData - Event data
 * @returns {Object} - Delivery results
 */
async function triggerEvent(eventType, eventData) {
  try {
    return await triggerWebhooks(eventType, eventData);
  } catch (error) {
    logWebhookEvent('service_trigger', 'error', {
      error: error.message,
      eventType
    });
    
    throw error;
  }
}

/**
 * Gets available webhook event types
 * @returns {Array} - List of available event types
 */
function getAvailableEventTypes() {
  // This would typically come from a configuration file or database
  return [
    {
      category: 'Tenant Events',
      events: [
        { id: 'tenant.created', description: 'A new tenant is created' },
        { id: 'tenant.updated', description: 'Tenant information is updated' },
        { id: 'tenant.deleted', description: 'A tenant is deleted' }
      ]
    },
    {
      category: 'Property Events',
      events: [
        { id: 'property.created', description: 'A new property is created' },
        { id: 'property.updated', description: 'Property information is updated' },
        { id: 'property.deleted', description: 'A property is deleted' }
      ]
    },
    {
      category: 'Unit Events',
      events: [
        { id: 'unit.created', description: 'A new unit is created' },
        { id: 'unit.updated', description: 'Unit information is updated' },
        { id: 'unit.deleted', description: 'A unit is deleted' },
        { id: 'unit.vacant', description: 'A unit becomes vacant' },
        { id: 'unit.occupied', description: 'A unit becomes occupied' }
      ]
    },
    {
      category: 'Lease Events',
      events: [
        { id: 'lease.created', description: 'A new lease is created' },
        { id: 'lease.updated', description: 'Lease information is updated' },
        { id: 'lease.renewed', description: 'A lease is renewed' },
        { id: 'lease.terminated', description: 'A lease is terminated' },
        { id: 'lease.expiring_soon', description: 'A lease is expiring soon' }
      ]
    },
    {
      category: 'Payment Events',
      events: [
        { id: 'payment.created', description: 'A new payment is created' },
        { id: 'payment.processed', description: 'A payment is processed' },
        { id: 'payment.failed', description: 'A payment fails' },
        { id: 'payment.refunded', description: 'A payment is refunded' }
      ]
    },
    {
      category: 'Maintenance Events',
      events: [
        { id: 'maintenance.request_created', description: 'A new maintenance request is created' },
        { id: 'maintenance.request_updated', description: 'A maintenance request is updated' },
        { id: 'maintenance.request_completed', description: 'A maintenance request is completed' },
        { id: 'maintenance.request_canceled', description: 'A maintenance request is canceled' }
      ]
    }
  ];
}

module.exports = {
  createWebhookSubscription,
  updateWebhookSubscription,
  deleteWebhookSubscription,
  getUserWebhookSubscriptions,
  triggerEvent,
  getAvailableEventTypes
};
```

## Database Schema Updates

To support the Integration Framework, the following database tables need to be created or updated:

```sql
-- API Keys Table
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  hashed_key VARCHAR(255) NOT NULL,
  scope VARCHAR(50) NOT NULL, -- 'read', 'write', 'admin'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Integration Settings Table
CREATE TABLE integration_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  integration_id VARCHAR(100) NOT NULL, -- e.g., 'payments/stripe'
  is_enabled BOOLEAN DEFAULT FALSE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, integration_id)
);

-- Integration Credentials Table (encrypted)
CREATE TABLE integration_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  integration_id VARCHAR(100) NOT NULL,
  credentials BYTEA NOT NULL, -- Encrypted credentials
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, integration_id)
);

-- Webhook Subscriptions Table
CREATE TABLE webhook_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  url VARCHAR(255) NOT NULL,
  events TEXT[] NOT NULL,
  description TEXT,
  secret VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER DEFAULT 0
);

-- Webhook Delivery History Table
CREATE TABLE webhook_delivery_history (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER REFERENCES webhook_subscriptions(id),
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'success', 'failed'
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Integration Logs Table
CREATE TABLE integration_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  integration_id VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'start', 'success', 'error'
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  execution_time INTEGER, -- in milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OAuth Tokens Table
CREATE TABLE oauth_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  integration_id VARCHAR(100) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(50),
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, integration_id)
);
```

## Frontend Components

The Integration Framework includes the following frontend components for managing integrations:

### Integration Dashboard

```jsx
// IntegrationDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getAvailableIntegrations, 
  getIntegrationSettings 
} from '../services/integrationService';
import IntegrationCard from './IntegrationCard';
import IntegrationSetup from './IntegrationSetup';
import './IntegrationDashboard.css';

const IntegrationDashboard = () => {
  const { currentUser } = useAuth();
  const [integrationCategories, setIntegrationCategories] = useState([]);
  const [integrationSettings, setIntegrationSettings] = useState({});
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        setLoading(true);
        
        // Load available integrations
        const categories = await getAvailableIntegrations(currentUser);
        setIntegrationCategories(categories);
        
        // Load integration settings
        const settings = await getIntegrationSettings(currentUser.id);
        setIntegrationSettings(settings);
      } catch (err) {
        setError('Failed to load integrations');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadIntegrations();
  }, [currentUser]);

  const handleIntegrationSelect = (integration) => {
    setSelectedIntegration(integration);
  };

  const handleCloseSetup = () => {
    setSelectedIntegration(null);
  };

  const handleSettingsUpdate = (integrationId, newSettings) => {
    setIntegrationSettings({
      ...integrationSettings,
      [integrationId]: newSettings
    });
  };

  if (loading) {
    return <div className="loading-spinner">Loading integrations...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="integration-dashboard">
      <h1>Integrations</h1>
      
      {selectedIntegration ? (
        <IntegrationSetup 
          integration={selectedIntegration}
          settings={integrationSettings[selectedIntegration.id] || { enabled: false, settings: {} }}
          onClose={handleCloseSetup}
          onSettingsUpdate={handleSettingsUpdate}
        />
      ) : (
        <>
          <p className="dashboard-description">
            Connect your property management system with external services and platforms.
          </p>
          
          {integrationCategories.map(category => (
            <div key={category.category} className="integration-category">
              <h2>{category.category}</h2>
              <div className="integration-cards">
                {category.integrations.map(integration => (
                  <IntegrationCard 
                    key={integration.id}
                    integration={integration}
                    settings={integrationSettings[integration.id] || { enabled: false, settings: {} }}
                    onSelect={() => handleIntegrationSelect(integration)}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default IntegrationDashboard;
```

### Webhook Manager

```jsx
// WebhookManager.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getUserWebhookSubscriptions, 
  getAvailableEventTypes,
  createWebhookSubscription,
  updateWebhookSubscription,
  deleteWebhookSubscription
} from '../services/webhookService';
import WebhookList from './WebhookList';
import WebhookForm from './WebhookForm';
import './WebhookManager.css';

const WebhookManager = () => {
  const { currentUser } = useAuth();
  const [webhooks, setWebhooks] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const loadWebhooks = async () => {
      try {
        setLoading(true);
        
        // Load user's webhook subscriptions
        const userWebhooks = await getUserWebhookSubscriptions(currentUser.id);
        setWebhooks(userWebhooks);
        
        // Load available event types
        const availableEventTypes = getAvailableEventTypes();
        setEventTypes(availableEventTypes);
      } catch (err) {
        setError('Failed to load webhooks');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadWebhooks();
  }, [currentUser.id]);

  const handleCreateWebhook = () => {
    setEditingWebhook(null);
    setShowForm(true);
  };

  const handleEditWebhook = (webhook) => {
    setEditingWebhook(webhook);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingWebhook(null);
  };

  const handleSaveWebhook = async (webhookData) => {
    try {
      let result;
      
      if (editingWebhook) {
        // Update existing webhook
        result = await updateWebhookSubscription(editingWebhook.id, webhookData);
        
        // Update the webhooks list
        setWebhooks(webhooks.map(webhook => 
          webhook.id === editingWebhook.id ? result : webhook
        ));
        
        setSuccess('Webhook updated successfully');
      } else {
        // Create new webhook
        const subscription = {
          ...webhookData,
          userId: currentUser.id
        };
        
        result = await createWebhookSubscription(subscription);
        
        // Add to the webhooks list
        setWebhooks([...webhooks, result]);
        
        setSuccess('Webhook created successfully');
      }
      
      // Close the form
      setShowForm(false);
      setEditingWebhook(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save webhook');
      console.error(err);
    }
  };

  const handleDeleteWebhook = async (webhookId) => {
    try {
      await deleteWebhookSubscription(webhookId);
      
      // Remove from the webhooks list
      setWebhooks(webhooks.filter(webhook => webhook.id !== webhookId));
      
      setSuccess('Webhook deleted successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete webhook');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading webhooks...</div>;
  }

  return (
    <div className="webhook-manager">
      <div className="webhook-header">
        <h1>Webhook Manager</h1>
        <button 
          className="create-webhook-button"
          onClick={handleCreateWebhook}
        >
          Create Webhook
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {showForm ? (
        <WebhookForm 
          webhook={editingWebhook}
          eventTypes={eventTypes}
          onSave={handleSaveWebhook}
          onCancel={handleCloseForm}
        />
      ) : (
        <WebhookList 
          webhooks={webhooks}
          onEdit={handleEditWebhook}
          onDelete={handleDeleteWebhook}
        />
      )}
    </div>
  );
};

export default WebhookManager;
```

## Testing Strategy

The Integration Framework will be tested using the following approach:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions and API service calls
3. **Mock Tests**: Test integrations with external services using mocks
4. **End-to-End Tests**: Test complete integration flows

### Example Unit Test

```javascript
// apiGateway.test.js
const request = require('supertest');
const express = require('express');
const apiGateway = require('./apiGateway');
const { validateRequest } = require('./requestValidator');
const { formatResponse } = require('./responseFormatter');
const { authenticateRequest } = require('../authenticationService/authenticationService');
const { routeRequest } = require('./apiRouteManager');
const { logRequest, logResponse } = require('../monitoring/loggingService');

// Mock dependencies
jest.mock('./requestValidator');
jest.mock('./responseFormatter');
jest.mock('../authenticationService/authenticationService');
jest.mock('./apiRouteManager');
jest.mock('../monitoring/loggingService');

describe('API Gateway', () => {
  let app;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api', apiGateway);
    
    // Set up default mock behavior
    authenticateRequest.mockImplementation((req, res, next) => {
      req.user = { id: 'user-1', role: 'admin' };
      next();
    });
    
    logRequest.mockImplementation(() => {});
    logResponse.mockImplementation(() => {});
    
    formatResponse.mockImplementation(data => data);
  });
  
  test('should validate requests', async () => {
    // Set up mocks
    validateRequest.mockReturnValue({ isValid: true });
    routeRequest.mockResolvedValue({
      status: 'success',
      data: { message: 'Test successful' }
    });
    
    // Make request
    const response = await request(app)
      .post('/api/v1/payments/stripe/createPaymentIntent')
      .set('Authorization', 'Bearer test-token')
      .send({ amount: 100 });
    
    // Assertions
    expect(response.status).toBe(200);
    expect(validateRequest).toHaveBeenCalled();
    expect(routeRequest).toHaveBeenCalled();
    expect(response.body).toEqual({
      status: 'success',
      data: { message: 'Test successful' }
    });
  });
  
  test('should return 400 for invalid requests', async () => {
    // Set up mocks
    validateRequest.mockReturnValue({ 
      isValid: false, 
      message: 'Invalid request',
      errors: [{ field: 'amount', message: 'Amount is required' }]
    });
    
    // Make request
    const response = await request(app)
      .post('/api/v1/payments/stripe/createPaymentIntent')
      .set('Authorization', 'Bearer test-token')
      .send({});
    
    // Assertions
    expect(response.status).toBe(400);
    expect(validateRequest).toHaveBeenCalled();
    expect(routeRequest).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      status: 'error',
      message: 'Invalid request',
      errors: [{ field: 'amount', message: 'Amount is required' }]
    });
  });
  
  test('should require authentication', async () => {
    // Override the auth mock to simulate authentication failure
    authenticateRequest.mockImplementation((req, res, next) => {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    });
    
    // Make request
    const response = await request(app)
      .post('/api/v1/payments/stripe/createPaymentIntent')
      .send({ amount: 100 });
    
    // Assertions
    expect(response.status).toBe(401);
    expect(validateRequest).not.toHaveBeenCalled();
    expect(routeRequest).not.toHaveBeenCalled();
    expect(response.body).toEqual({
      status: 'error',
      message: 'Authentication required'
    });
  });
  
  test('should handle errors from service connectors', async () => {
    // Set up mocks
    validateRequest.mockReturnValue({ isValid: true });
    routeRequest.mockRejectedValue({
      status: 'error',
      message: 'Service error',
      statusCode: 500
    });
    
    // Make request
    const response = await request(app)
      .post('/api/v1/payments/stripe/createPaymentIntent')
      .set('Authorization', 'Bearer test-token')
      .send({ amount: 100 });
    
    // Assertions
    expect(response.status).toBe(500);
    expect(validateRequest).toHaveBeenCalled();
    expect(routeRequest).toHaveBeenCalled();
    expect(response.body).toEqual({
      status: 'error',
      message: 'Service error'
    });
  });
  
  test('should log requests and responses', async () => {
    // Set up mocks
    validateRequest.mockReturnValue({ isValid: true });
    routeRequest.mockResolvedValue({
      status: 'success',
      data: { message: 'Test successful' }
    });
    
    // Make request
    await request(app)
      .post('/api/v1/payments/stripe/createPaymentIntent')
      .set('Authorization', 'Bearer test-token')
      .send({ amount: 100 });
    
    // Assertions
    expect(logRequest).toHaveBeenCalled();
    expect(logResponse).toHaveBeenCalled();
  });
});
```

## Deployment Considerations

When deploying the Integration Framework, consider the following:

1. **Security Measures**:
   - Implement proper authentication and authorization for API access
   - Encrypt sensitive credentials and API keys
   - Use HTTPS for all API endpoints
   - Implement rate limiting to prevent abuse
   - Validate all incoming requests against schemas

2. **Scalability**:
   - Design the system to handle a large number of integration requests
   - Implement connection pooling for external service connections
   - Consider using a message queue for asynchronous processing of webhooks

3. **Reliability**:
   - Implement retry mechanisms for failed integration calls
   - Set up circuit breakers to prevent cascading failures
   - Monitor integration health and performance

4. **Monitoring and Logging**:
   - Log all integration events for auditing and debugging
   - Set up alerts for integration failures
   - Monitor API usage and rate limits

5. **Documentation**:
   - Provide comprehensive API documentation for developers
   - Document integration setup procedures for administrators
   - Create user guides for configuring integrations

## Integration Points

The Integration Framework integrates with the following components:

1. **Tenant Interface**: Enables tenants to make payments and access services
2. **Property Management Interface**: Allows property managers to configure integrations
3. **Financial Management**: Connects with payment processors and accounting systems
4. **Maintenance Management**: Integrates with service providers and vendors
5. **Reporting and Analytics**: Provides data for reports and analytics
6. **AI Enhancement Layer**: Utilizes AI for data enrichment and anomaly detection

## Next Steps

After implementing the Integration Framework, the following steps should be taken:

1. Develop additional service connectors for popular platforms
2. Enhance the webhook system with more event types
3. Implement OAuth flows for third-party authentication
4. Create a developer portal for API documentation
5. Set up monitoring and alerting for integration health

## Handoff Document Updates

To add this component to the handoff document:

1. Copy this entire design document to the handoff document under a new section titled "Integration Framework Component"
2. Update the implementation status in the handoff document
3. Add links to the relevant code files in the GitHub repository
4. Update the component dependencies diagram to show the Integration Framework connections
