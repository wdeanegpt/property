/**
 * migrationRunner.js
 * 
 * This script runs database migrations for the Advanced Accounting Module
 * in the correct order. It tracks applied migrations and only applies
 * new migrations that haven't been run yet.
 * 
 * Usage: node migrationRunner.js [--dry-run] [--force]
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config/database');

// Command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

// Migration directory
const MIGRATION_DIR = path.join(__dirname, '../../database/migrations');

// Main function
async function runMigrations() {
  console.log('Database Migration Runner');
  console.log('========================');
  
  if (isDryRun) {
    console.log('Running in dry-run mode. No changes will be applied.');
  }
  
  if (isForce) {
    console.log('Running in force mode. All migrations will be re-applied.');
  }
  
  const pool = new Pool(config.postgres);
  const client = await pool.connect();
  
  try {
    // Ensure migrations table exists
    await ensureMigrationsTable(client);
    
    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations(client);
    console.log(`Found ${appliedMigrations.length} previously applied migrations.`);
    
    // Get migration files
    const migrationFiles = getMigrationFiles();
    console.log(`Found ${migrationFiles.length} migration files.`);
    
    // Determine which migrations to apply
    const migrationsToApply = isForce 
      ? migrationFiles 
      : migrationFiles.filter(file => !appliedMigrations.includes(file));
    
    console.log(`Applying ${migrationsToApply.length} migrations...`);
    
    // Apply migrations
    for (const migrationFile of migrationsToApply) {
      await applyMigration(client, migrationFile);
    }
    
    console.log('Migration complete!');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * Ensure the migrations table exists
 * 
 * @param {Object} client - Database client
 */
async function ensureMigrationsTable(client) {
  console.log('Ensuring migrations table exists...');
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  
  if (!isDryRun) {
    await client.query(createTableQuery);
  }
  
  console.log('Migrations table ready.');
}

/**
 * Get list of applied migrations
 * 
 * @param {Object} client - Database client
 * @returns {Array} - List of applied migration filenames
 */
async function getAppliedMigrations(client) {
  const query = 'SELECT name FROM migrations ORDER BY id';
  const result = await client.query(query);
  return result.rows.map(row => row.name);
}

/**
 * Get list of migration files
 * 
 * @returns {Array} - List of migration filenames sorted by name
 */
function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATION_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort to ensure correct order
  
  return files;
}

/**
 * Apply a single migration
 * 
 * @param {Object} client - Database client
 * @param {string} migrationFile - Migration filename
 */
async function applyMigration(client, migrationFile) {
  console.log(`Applying migration: ${migrationFile}`);
  
  const migrationPath = path.join(MIGRATION_DIR, migrationFile);
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  
  if (isDryRun) {
    console.log('Dry run - not executing SQL:');
    console.log(migrationSql);
    return;
  }
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Run the migration
    await client.query(migrationSql);
    
    // Record the migration
    const insertQuery = 'INSERT INTO migrations (name) VALUES ($1)';
    await client.query(insertQuery, [migrationFile]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`Successfully applied migration: ${migrationFile}`);
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error(`Error applying migration ${migrationFile}:`, error);
    throw error;
  }
}

// Run the migrations
runMigrations().catch(console.error);
