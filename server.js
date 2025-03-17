/**
 * server.js
 * Server configuration settings
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
const environment = process.env.NODE_ENV || 'development';
let config = {};

try {
  const configPath = path.resolve(__dirname, `../../../config/.env.${environment}`);
  
  if (fs.existsSync(configPath)) {
    // Parse config file
    const configFile = fs.readFileSync(configPath, 'utf8');
    
    configFile.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        config[key.trim()] = value.trim();
      }
    });
  } else {
    console.warn(`Config file not found: ${configPath}`);
  }
} catch (error) {
  console.error('Error loading config file:', error);
}

// Server configuration
module.exports = {
  // Server settings
  port: process.env.PORT || config.PORT || 3000,
  host: process.env.HOST || config.HOST || '0.0.0.0',
  
  // API settings
  apiPrefix: process.env.API_PREFIX || config.API_PREFIX || '/api',
  apiVersion: process.env.API_VERSION || config.API_VERSION || 'v1',
  
  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN || config.CORS_ORIGIN || '*',
    methods: process.env.CORS_METHODS || config.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || config.RATE_LIMIT_WINDOW || '15') * 60 * 1000, // default: 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || config.RATE_LIMIT_MAX || '100'), // default: 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || config.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || config.JWT_EXPIRES_IN || '1d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || config.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || config.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || config.LOG_FORMAT || 'combined'
  },
  
  // File upload settings
  fileUpload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || config.MAX_FILE_SIZE || '5') * 1024 * 1024, // default: 5MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || config.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf').split(',')
  },
  
  // Trust proxy settings (for secure cookies behind a proxy)
  trustProxy: process.env.TRUST_PROXY === 'true' || config.TRUST_PROXY === 'true' || false
};
