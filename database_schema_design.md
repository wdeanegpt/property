# Comprehensive Property Management System - Database Schema Design

## Overview

The Comprehensive Property Management System utilizes a multi-database approach to efficiently handle different types of data and optimize performance. The system employs:

1. **PostgreSQL** for structured relational data
2. **MongoDB** for unstructured data and document storage
3. **Redis** for caching and performance optimization

This document provides a comprehensive overview of the database schema design across all three database systems.

## PostgreSQL Schema

PostgreSQL serves as the primary database for structured data, handling relationships between entities such as properties, tenants, leases, and financial transactions.

### Core Tables

#### Users and Authentication

```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    user_type ENUM('tenant', 'landlord', 'property_manager', 'admin') NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    profile_image_url VARCHAR(255)
);

CREATE TABLE user_roles (
    role_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL,
    UNIQUE(user_id, role_name)
);

CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);
```

#### Properties and Units

```sql
CREATE TABLE properties (
    property_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    property_name VARCHAR(255) NOT NULL,
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    property_type ENUM('single_family', 'multi_family', 'apartment', 'condo', 'commercial') NOT NULL,
    year_built INTEGER,
    square_footage INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    has_hud_approval BOOLEAN DEFAULT FALSE,
    hud_approval_date TIMESTAMP WITH TIME ZONE,
    hud_program_type VARCHAR(100)
);

CREATE TABLE units (
    unit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(property_id) ON DELETE CASCADE,
    unit_number VARCHAR(50) NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms DECIMAL(3,1) NOT NULL,
    square_footage INTEGER NOT NULL,
    monthly_rent DECIMAL(10,2) NOT NULL,
    is_occupied BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unit_features JSONB,
    UNIQUE(property_id, unit_number)
);

CREATE TABLE amenities (
    amenity_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL
);

CREATE TABLE property_amenities (
    property_id UUID REFERENCES properties(property_id) ON DELETE CASCADE,
    amenity_id INTEGER REFERENCES amenities(amenity_id) ON DELETE CASCADE,
    PRIMARY KEY (property_id, amenity_id)
);

CREATE TABLE unit_amenities (
    unit_id UUID REFERENCES units(unit_id) ON DELETE CASCADE,
    amenity_id INTEGER REFERENCES amenities(amenity_id) ON DELETE CASCADE,
    PRIMARY KEY (unit_id, amenity_id)
);
```

#### Tenants and Leases

```sql
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    date_of_birth DATE NOT NULL,
    ssn_last_four VARCHAR(4) NOT NULL,
    income DECIMAL(12,2),
    employment_status VARCHAR(50),
    employer_name VARCHAR(255),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    background_check_status ENUM('pending', 'approved', 'denied', 'not_submitted') DEFAULT 'not_submitted',
    credit_check_status ENUM('pending', 'approved', 'denied', 'not_submitted') DEFAULT 'not_submitted'
);

CREATE TABLE leases (
    lease_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(unit_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2) NOT NULL,
    lease_status ENUM('draft', 'active', 'expired', 'terminated', 'renewed') DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    lease_document_url VARCHAR(255),
    is_signed BOOLEAN DEFAULT FALSE,
    special_terms TEXT,
    auto_renewal BOOLEAN DEFAULT FALSE
);

CREATE TABLE lease_tenants (
    lease_id UUID REFERENCES leases(lease_id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (lease_id, tenant_id)
);

CREATE TABLE lease_documents (
    document_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES leases(lease_id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_url VARCHAR(255) NOT NULL,
    uploaded_by UUID REFERENCES users(user_id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_signed BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMP WITH TIME ZONE
);
```

#### Financial Management

```sql
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES leases(lease_id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(property_id) ON DELETE CASCADE,
    transaction_type ENUM('rent', 'deposit', 'fee', 'maintenance', 'utility', 'other') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE,
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    payment_status ENUM('pending', 'paid', 'late', 'partial', 'waived') DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    reference_number VARCHAR(100),
    is_recurring BOOLEAN DEFAULT FALSE
);

CREATE TABLE recurring_transactions (
    recurring_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lease_id UUID REFERENCES leases(lease_id) ON DELETE CASCADE,
    transaction_type ENUM('rent', 'fee', 'utility', 'other') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    frequency ENUM('monthly', 'quarterly', 'annually') DEFAULT 'monthly',
    day_of_month INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

CREATE TABLE late_fees (
    late_fee_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    days_late INTEGER NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_waived BOOLEAN DEFAULT FALSE,
    waived_by UUID REFERENCES users(user_id),
    waived_at TIMESTAMP WITH TIME ZONE,
    waive_reason TEXT
);
```

#### Maintenance Management

```sql
CREATE TABLE maintenance_requests (
    request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES units(unit_id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(tenant_id),
    category VARCHAR(100) NOT NULL,
    priority ENUM('low', 'medium', 'high', 'emergency') DEFAULT 'medium',
    description TEXT NOT NULL,
    status ENUM('submitted', 'assigned', 'in_progress', 'completed', 'cancelled') DEFAULT 'submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_tenant_caused BOOLEAN,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2)
);

CREATE TABLE maintenance_images (
    image_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES maintenance_requests(request_id) ON DELETE CASCADE,
    image_url VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_before BOOLEAN DEFAULT TRUE
);

CREATE TABLE vendors (
    vendor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    service_category VARCHAR(100) NOT NULL,
    is_preferred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    insurance_expiry DATE,
    license_number VARCHAR(100)
);

CREATE TABLE work_orders (
    work_order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES maintenance_requests(request_id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(vendor_id),
    assigned_by UUID REFERENCES users(user_id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scheduled_date DATE,
    scheduled_time_start TIME,
    scheduled_time_end TIME,
    status ENUM('assigned', 'scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'assigned',
    completion_notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    invoice_amount DECIMAL(10,2),
    invoice_paid BOOLEAN DEFAULT FALSE,
    invoice_paid_date TIMESTAMP WITH TIME ZONE
);
```

#### Pricing and Accessibility Module

```sql
CREATE TABLE subscription_plans (
    plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_name VARCHAR(100) NOT NULL,
    plan_description TEXT,
    price_per_unit DECIMAL(10,2),
    minimum_price DECIMAL(10,2),
    maximum_units INTEGER,
    is_custom BOOLEAN DEFAULT FALSE,
    features JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(plan_id),
    start_date DATE NOT NULL,
    end_date DATE,
    status ENUM('active', 'cancelled', 'expired', 'trial') DEFAULT 'active',
    payment_frequency ENUM('monthly', 'annual') DEFAULT 'monthly',
    unit_count INTEGER NOT NULL,
    current_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    is_auto_renew BOOLEAN DEFAULT TRUE
);

CREATE TABLE feature_access (
    feature_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_name VARCHAR(100) NOT NULL,
    feature_description TEXT,
    feature_category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plan_features (
    plan_id UUID REFERENCES subscription_plans(plan_id) ON DELETE CASCADE,
    feature_id UUID REFERENCES feature_access(feature_id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT TRUE,
    usage_limit INTEGER,
    PRIMARY KEY (plan_id, feature_id)
);

CREATE TABLE usage_tracking (
    tracking_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    feature_id UUID REFERENCES feature_access(feature_id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 1,
    first_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_pricing_recommendations (
    recommendation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    current_plan_id UUID REFERENCES subscription_plans(plan_id),
    recommended_plan_id UUID REFERENCES subscription_plans(plan_id),
    recommendation_reason TEXT,
    estimated_savings DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMP WITH TIME ZONE
);
```

#### HUD Integration

```sql
CREATE TABLE housing_authorities (
    authority_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    state VARCHAR(50) NOT NULL,
    county VARCHAR(100),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    website VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hud_programs (
    program_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_name VARCHAR(100) NOT NULL,
    program_code VARCHAR(50) NOT NULL,
    description TEXT,
    eligibility_criteria TEXT,
    required_forms JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE property_hud_programs (
    property_id UUID REFERENCES properties(property_id) ON DELETE CASCADE,
    program_id UUID REFERENCES hud_programs(program_id) ON DELETE CASCADE,
    authority_id UUID REFERENCES housing_authorities(authority_id),
    approval_date DATE,
    expiration_date DATE,
    status ENUM('pending', 'approved', 'expired', 'revoked') DEFAULT 'pending',
    PRIMARY KEY (property_id, program_id)
);

CREATE TABLE hud_applications (
    application_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    program_id UUID REFERENCES hud_programs(program_id),
    authority_id UUID REFERENCES housing_authorities(authority_id),
    application_date DATE NOT NULL,
    status ENUM('draft', 'submitted', 'under_review', 'approved', 'denied') DEFAULT 'draft',
    submission_date TIMESTAMP WITH TIME ZONE,
    decision_date TIMESTAMP WITH TIME ZONE,
    voucher_amount DECIMAL(10,2),
    voucher_start_date DATE,
    voucher_end_date DATE,
    notes TEXT
);

CREATE TABLE hud_forms (
    form_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES hud_applications(application_id) ON DELETE CASCADE,
    form_type VARCHAR(100) NOT NULL,
    form_number VARCHAR(50),
    document_url VARCHAR(255),
    submitted_at TIMESTAMP WITH TIME ZONE,
    status ENUM('pending', 'submitted', 'accepted', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT
);
```

### Indexes

```sql
-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);

-- Property indexes
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE INDEX idx_properties_city_state ON properties(city, state);
CREATE INDEX idx_properties_hud_approval ON properties(has_hud_approval);

-- Unit indexes
CREATE INDEX idx_units_property_id ON units(property_id);
CREATE INDEX idx_units_is_available ON units(is_available);
CREATE INDEX idx_units_monthly_rent ON units(monthly_rent);

-- Tenant indexes
CREATE INDEX idx_tenants_user_id ON tenants(user_id);
CREATE INDEX idx_tenants_background_check ON tenants(background_check_status);

-- Lease indexes
CREATE INDEX idx_leases_unit_id ON leases(unit_id);
CREATE INDEX idx_leases_status ON leases(lease_status);
CREATE INDEX idx_leases_dates ON leases(start_date, end_date);

-- Transaction indexes
CREATE INDEX idx_transactions_lease_id ON transactions(lease_id);
CREATE INDEX idx_transactions_property_id ON transactions(property_id);
CREATE INDEX idx_transactions_payment_status ON transactions(payment_status);
CREATE INDEX idx_transactions_due_date ON transactions(due_date);

-- Maintenance indexes
CREATE INDEX idx_maintenance_unit_id ON maintenance_requests(unit_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX idx_maintenance_priority ON maintenance_requests(priority);

-- Subscription indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_dates ON subscriptions(start_date, end_date);

-- HUD indexes
CREATE INDEX idx_hud_applications_tenant_id ON hud_applications(tenant_id);
CREATE INDEX idx_hud_applications_status ON hud_applications(status);
CREATE INDEX idx_property_hud_programs_property_id ON property_hud_programs(property_id);
```

## MongoDB Collections

MongoDB is used for storing unstructured data, documents, and AI-related data that doesn't fit well into a relational model.

### Collection: documents

```javascript
{
  _id: ObjectId(),
  documentType: String,  // "lease", "application", "maintenance", "hud_form", etc.
  referenceId: String,   // UUID reference to PostgreSQL entity
  fileName: String,
  fileSize: Number,
  mimeType: String,
  url: String,
  uploadedBy: String,    // UUID of user
  uploadedAt: Date,
  metadata: {
    // Flexible metadata fields
    pages: Number,
    signatureStatus: String,
    expirationDate: Date,
    tags: [String]
  },
  textContent: String,   // Extracted text for searchability
  isArchived: Boolean,
  archivedAt: Date
}
```

### Collection: notifications

```javascript
{
  _id: ObjectId(),
  userId: String,        // UUID of recipient
  type: String,          // "maintenance", "payment", "lease", etc.
  title: String,
  message: String,
  referenceId: String,   // UUID reference to related entity
  referenceType: String, // Type of related entity
  isRead: Boolean,
  createdAt: Date,
  expiresAt: Date,
  priority: String,      // "low", "medium", "high"
  actions: [
    {
      label: String,
      url: String,
      type: String       // "link", "button", "api_call"
    }
  ]
}
```

### Collection: chat_messages

```javascript
{
  _id: ObjectId(),
  conversationId: String,
  senderId: String,      // UUID of sender
  recipientId: String,   // UUID of recipient (or null for group chats)
  message: String,
  attachments: [
    {
      fileName: String,
      fileSize: Number,
      mimeType: String,
      url: String
    }
  ],
  isRead: Boolean,
  readAt: Date,
  createdAt: Date,
  updatedAt: Date,
  isDeleted: Boolean,
  deletedAt: Date
}
```

### Collection: usage_patterns

```javascript
{
  _id: ObjectId(),
  userId: String,        // UUID of user
  sessionId: String,
  features: [
    {
      featureId: String, // UUID of feature
      usageCount: Number,
      lastUsed: Date,
      usageDuration: Number,
      actions: [
        {
          actionType: String,
          timestamp: Date,
          metadata: Object
        }
      ]
    }
  ],
  pageViews: [
    {
      page: String,
      viewCount: Number,
      lastViewed: Date,
      averageDuration: Number
    }
  ],
  loginHistory: [
    {
      timestamp: Date,
      ipAddress: String,
      userAgent: String,
      duration: Number
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### Collection: ai_training_data

```javascript
{
  _id: ObjectId(),
  dataType: String,      // "pricing", "maintenance", "tenant_behavior", etc.
  features: [Mixed],     // Array of feature values
  labels: [Mixed],       // Array of label values
  source: String,        // Source of the data
  timestamp: Date,
  isValidated: Boolean,
  validatedBy: String,   // UUID of validator
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### Collection: ai_models

```javascript
{
  _id: ObjectId(),
  modelName: String,
  modelType: String,     // "pricing", "maintenance", "tenant_behavior", etc.
  version: String,
  parameters: Object,
  performance: {
    accuracy: Number,
    precision: Number,
    recall: Number,
    f1Score: Number
  },
  trainedAt: Date,
  deployedAt: Date,
  isActive: Boolean,
  createdBy: String,     // UUID of creator
  modelUrl: String,      // URL to model file
  metadata: Object
}
```

### Indexes

```javascript
// documents collection
db.documents.createIndex({ "documentType": 1 });
db.documents.createIndex({ "referenceId": 1 });
db.documents.createIndex({ "uploadedBy": 1 });
db.documents.createIndex({ "textContent": "text" });

// notifications collection
db.notifications.createIndex({ "userId": 1 });
db.notifications.createIndex({ "isRead": 1 });
db.notifications.createIndex({ "createdAt": 1 });
db.notifications.createIndex({ "expiresAt": 1 });

// chat_messages collection
db.chat_messages.createIndex({ "conversationId": 1 });
db.chat_messages.createIndex({ "senderId": 1 });
db.chat_messages.createIndex({ "recipientId": 1 });
db.chat_messages.createIndex({ "createdAt": 1 });

// usage_patterns collection
db.usage_patterns.createIndex({ "userId": 1 });
db.usage_patterns.createIndex({ "sessionId": 1 });
db.usage_patterns.createIndex({ "features.featureId": 1 });

// ai_training_data collection
db.ai_training_data.createIndex({ "dataType": 1 });
db.ai_training_data.createIndex({ "isValidated": 1 });
db.ai_training_data.createIndex({ "timestamp": 1 });

// ai_models collection
db.ai_models.createIndex({ "modelType": 1 });
db.ai_models.createIndex({ "version": 1 });
db.ai_models.createIndex({ "isActive": 1 });
```

## Redis Caching Structure

Redis is used for caching frequently accessed data, session management, and rate limiting to improve performance.

### Key Patterns and Data Structures

#### User Sessions and Authentication

```
# User session cache (Hash)
user:session:{sessionId} -> {
  userId: String,
  email: String,
  firstName: String,
  lastName: String,
  userType: String,
  roles: String (comma-separated),
  expiresAt: ISO8601 timestamp
}
TTL: 24 hours

# User permissions cache (Set)
user:permissions:{userId} -> Set of permission strings
TTL: 1 hour

# Authentication rate limiting (Sorted Set)
auth:ratelimit:login:{ip} -> Sorted set of timestamps
TTL: 10 minutes
```

#### Feature Access and Subscription

```
# Subscription status cache (Hash)
subscription:status:{userId} -> {
  planId: String,
  planName: String,
  status: String,
  unitCount: Number,
  startDate: ISO8601 date,
  endDate: ISO8601 date,
  isAutoRenew: Boolean
}
TTL: 1 hour

# Feature access cache (Hash)
feature:access:{userId}:{featureId} -> {
  isEnabled: Boolean,
  usageLimit: Number,
  currentUsage: Number,
  lastChecked: ISO8601 timestamp
}
TTL: 15 minutes

# Rate limiting for API endpoints (Sorted Set)
ratelimit:api:{userId}:{endpoint} -> Sorted set of timestamps
TTL: 1 minute
```

#### Application Data Caching

```
# Property details cache (Hash)
property:{propertyId} -> {
  name: String,
  address: String,
  city: String,
  state: String,
  zipCode: String,
  unitCount: Number,
  ownerName: String
}
TTL: 30 minutes

# Unit availability cache (Hash)
unit:availability:{propertyId} -> {
  totalUnits: Number,
  availableUnits: Number,
  lastUpdated: ISO8601 timestamp
}
TTL: 5 minutes

# Maintenance request counts (Hash)
maintenance:counts:{propertyId} -> {
  total: Number,
  emergency: Number,
  high: Number,
  medium: Number,
  low: Number,
  open: Number,
  inProgress: Number
}
TTL: 5 minutes

# Recent transactions (List)
transactions:recent:{userId} -> List of transaction JSON strings
TTL: 15 minutes
```

#### Search and Lookup Caches

```
# City/State lookup cache (Hash)
lookup:cities:{stateCode} -> Hash of city names to city IDs
TTL: 24 hours

# Amenity lookup cache (Hash)
lookup:amenities -> Hash of amenity IDs to amenity names
TTL: 24 hours

# Search results cache (String)
search:properties:{queryHash} -> JSON string of search results
TTL: 5 minutes
```

#### Real-time Notifications

```
# Notification counters (String)
notifications:count:{userId} -> Number of unread notifications
TTL: None (updated on read)

# Active maintenance workers (Set)
maintenance:active:workers -> Set of worker IDs
TTL: None (managed by worker heartbeats)

# Chat presence (Hash)
chat:presence:{userId} -> {
  status: String,
  lastActive: ISO8601 timestamp
}
TTL: 5 minutes (refreshed on activity)
```

### Pub/Sub Channels

```
# Notification channels
notifications:{userId}
maintenance:updates:{propertyId}
chat:messages:{conversationId}
system:broadcasts

# Real-time updates
property:changes:{propertyId}
unit:changes:{unitId}
lease:changes:{leaseId}
```

## Database Integration

The three database systems are integrated through a unified data access layer that handles:

1. **Data Consistency**: Ensuring data remains consistent across all databases
2. **Transaction Management**: Handling distributed transactions when necessary
3. **Caching Strategy**: Determining what data to cache and for how long
4. **Data Migration**: Managing schema changes and data migrations
5. **Performance Optimization**: Monitoring and optimizing database performance

### Integration Services

```javascript
// Database integration service
class DatabaseIntegrationService {
  // PostgreSQL operations
  async queryRelationalData(query, params) { ... }
  async executeTransaction(operations) { ... }
  
  // MongoDB operations
  async queryDocuments(collection, filter, options) { ... }
  async insertDocument(collection, document) { ... }
  
  // Redis operations
  async getCachedData(key) { ... }
  async setCachedData(key, value, ttl) { ... }
  
  // Cross-database operations
  async getEntityWithDocuments(entityType, entityId) { ... }
  async saveEntityWithDocuments(entityType, entity, documents) { ... }
  
  // Cache management
  async invalidateCache(pattern) { ... }
  async refreshCache(entityType, entityId) { ... }
}
```

## Schema Evolution and Migration

The database schema is designed to evolve over time through a structured migration process:

1. **Version Control**: All schema changes are versioned and tracked
2. **Migration Scripts**: Dedicated scripts handle schema changes and data migrations
3. **Backward Compatibility**: Ensuring backward compatibility during transitions
4. **Testing**: Comprehensive testing of migrations before deployment
5. **Rollback Plans**: Ability to roll back changes if issues arise

### Migration Process

```
1. Create migration script with unique version number
2. Implement up() and down() methods for migration and rollback
3. Test migration in development environment
4. Apply migration to staging environment and validate
5. Schedule production migration during maintenance window
6. Apply migration to production
7. Verify successful migration
8. Update application code to use new schema
```

## Conclusion

The multi-database approach of the Comprehensive Property Management System provides:

1. **Flexibility**: Different data types are stored in the most appropriate database
2. **Performance**: Caching and optimized queries ensure fast response times
3. **Scalability**: Each database component can scale independently
4. **Reliability**: Data redundancy and backup strategies ensure data safety
5. **Evolvability**: The schema can evolve over time to meet changing requirements

This database schema design supports all current features of the system and provides a foundation for future expansion, particularly for the upcoming advanced accounting module, enhanced tenant management system, and maintenance management module.
