/**
 * database.js
 * Database configuration and connection management
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
const environment = process.env.NODE_ENV || 'development';
let config = {};

try {
  const configPath = path.resolve(__dirname, `../../config/.env.${environment}`);
  
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

// Database connection configuration
const dbConfig = {
  user: process.env.DB_USER || config.DB_USER || 'postgres',
  host: process.env.DB_HOST || config.DB_HOST || 'localhost',
  database: process.env.DB_NAME || config.DB_NAME || 'property_management',
  password: process.env.DB_PASSWORD || config.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || config.DB_PORT || '5432'),
  max: parseInt(process.env.DB_POOL_SIZE || config.DB_POOL_SIZE || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || config.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || config.DB_CONNECTION_TIMEOUT || '2000')
};

// Create a connection pool
const pool = new Pool(dbConfig);

// Log connection events
pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Export methods for database interaction
module.exports = {
  /**
   * Execute a query with parameters
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} - Query result
   */
  query: (text, params) => pool.query(text, params),
  
  /**
   * Get a client from the pool
   * @returns {Promise<Object>} - Database client
   */
  getClient: async () => {
    const client = await pool.connect();
    return client;
  },
  
  /**
   * End all pool connections
   * @returns {Promise<void>}
   */
  end: () => pool.end(),
  
  /**
   * Get the connection pool
   * @returns {Object} - Connection pool
   */
  pool: () => pool
};
