/**
 * index.js
 * Main server entry point
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const serverConfig = require('./config/server');
const db = require('./config/database');

// Import routes
const rentTrackingRoutes = require('./routes/rentTracking.routes');
const lateFeeRoutes = require('./routes/lateFee.routes');
const trustAccountRoutes = require('./routes/trustAccount.routes');
const expenseManagementRoutes = require('./routes/expenseManagement.routes');
const financialReportingRoutes = require('./routes/financialReporting.routes');
const cashFlowPredictionRoutes = require('./routes/cashFlowPrediction.routes');

// Create Express app
const app = express();

// Apply middleware
app.use(helmet()); // Security headers
app.use(cors(serverConfig.cors)); // CORS configuration
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies
app.use(morgan(serverConfig.logging.format)); // Request logging

// Apply rate limiting
const limiter = rateLimit(serverConfig.rateLimit);
app.use(limiter);

// Trust proxy if configured
if (serverConfig.trustProxy) {
  app.set('trust proxy', 1);
}

// API routes
const apiPath = `${serverConfig.apiPrefix}/${serverConfig.apiVersion}`;
app.use(`${apiPath}/rent-tracking`, rentTrackingRoutes);
app.use(`${apiPath}/late-fees`, lateFeeRoutes);
app.use(`${apiPath}/trust-accounts`, trustAccountRoutes);
app.use(`${apiPath}/expenses`, expenseManagementRoutes);
app.use(`${apiPath}/financial-reports`, financialReportingRoutes);
app.use(`${apiPath}/cash-flow`, cashFlowPredictionRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Property Management System API',
    version: serverConfig.apiVersion,
    documentation: '/api-docs'
  });
});

// API documentation route
app.get('/api-docs', (req, res) => {
  res.json({
    message: 'API Documentation',
    endpoints: [
      { path: `${apiPath}/rent-tracking`, description: 'Rent tracking and payment management' },
      { path: `${apiPath}/late-fees`, description: 'Late fee configuration and management' },
      { path: `${apiPath}/trust-accounts`, description: 'Trust account management' },
      { path: `${apiPath}/expenses`, description: 'Expense tracking and management' },
      { path: `${apiPath}/financial-reports`, description: 'Financial reporting and analytics' },
      { path: `${apiPath}/cash-flow`, description: 'Cash flow prediction and analysis' }
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message
  });
});

// Start server
const PORT = serverConfig.port;
const HOST = serverConfig.host;

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`API available at http://${HOST}:${PORT}${apiPath}`);
});

// Handle graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  
  // Close database connection
  db.end()
    .then(() => {
      console.log('Database connections closed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error closing database connections:', err);
      process.exit(1);
    });
}

module.exports = app;
