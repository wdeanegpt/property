/**
 * migrationRunner.js
 * Utility for running database migrations
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const db = require('../config/database');

class MigrationRunner {
  /**
   * Constructor
   * @param {Object} options - Migration options
   */
  constructor(options = {}) {
    this.migrationsPath = options.migrationsPath || path.resolve(__dirname, '../../../database/migrations');
    this.tableName = options.tableName || 'migrations';
    this.pool = db.pool();
  }

  /**
   * Initialize migrations table if it doesn't exist
   * @returns {Promise<void>}
   */
  async initMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    try {
      await this.pool.query(query);
      console.log(`Migrations table '${this.tableName}' initialized`);
    } catch (error) {
      console.error('Error initializing migrations table:', error);
      throw error;
    }
  }

  /**
   * Get list of applied migrations
   * @returns {Promise<Array>} - List of applied migrations
   */
  async getAppliedMigrations() {
    const query = `SELECT name FROM ${this.tableName} ORDER BY id ASC;`;
    
    try {
      const result = await this.pool.query(query);
      return result.rows.map(row => row.name);
    } catch (error) {
      console.error('Error getting applied migrations:', error);
      throw error;
    }
  }

  /**
   * Get list of available migration files
   * @returns {Promise<Array>} - List of available migration files
   */
  async getAvailableMigrations() {
    try {
      const files = await fs.promises.readdir(this.migrationsPath);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort((a, b) => {
          // Extract numeric prefix for proper ordering
          const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0');
          const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0');
          return numA - numB;
        });
    } catch (error) {
      console.error('Error getting available migrations:', error);
      throw error;
    }
  }

  /**
   * Record a migration as applied
   * @param {string} migrationName - Name of the migration
   * @returns {Promise<void>}
   */
  async recordMigration(migrationName) {
    const query = `INSERT INTO ${this.tableName} (name) VALUES ($1);`;
    
    try {
      await this.pool.query(query, [migrationName]);
      console.log(`Recorded migration: ${migrationName}`);
    } catch (error) {
      console.error(`Error recording migration ${migrationName}:`, error);
      throw error;
    }
  }

  /**
   * Apply a single migration
   * @param {string} migrationName - Name of the migration
   * @returns {Promise<void>}
   */
  async applyMigration(migrationName) {
    const client = await this.pool.connect();
    
    try {
      const migrationPath = path.join(this.migrationsPath, migrationName);
      const migrationSql = await fs.promises.readFile(migrationPath, 'utf8');
      
      console.log(`Applying migration: ${migrationName}`);
      
      await client.query('BEGIN');
      await client.query(migrationSql);
      await this.recordMigration(migrationName);
      await client.query('COMMIT');
      
      console.log(`Successfully applied migration: ${migrationName}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error applying migration ${migrationName}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   * @returns {Promise<Array>} - List of applied migrations
   */
  async runMigrations() {
    try {
      await this.initMigrationsTable();
      
      const appliedMigrations = await this.getAppliedMigrations();
      const availableMigrations = await this.getAvailableMigrations();
      
      const pendingMigrations = availableMigrations.filter(
        migration => !appliedMigrations.includes(migration)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('No pending migrations to apply');
        return [];
      }
      
      console.log(`Found ${pendingMigrations.length} pending migrations`);
      
      const appliedList = [];
      for (const migration of pendingMigrations) {
        await this.applyMigration(migration);
        appliedList.push(migration);
      }
      
      console.log(`Successfully applied ${appliedList.length} migrations`);
      return appliedList;
    } catch (error) {
      console.error('Error running migrations:', error);
      throw error;
    }
  }

  /**
   * Rollback the last batch of migrations
   * @param {number} steps - Number of migrations to rollback
   * @returns {Promise<Array>} - List of rolled back migrations
   */
  async rollback(steps = 1) {
    const client = await this.pool.connect();
    
    try {
      // Get the last N migrations
      const query = `
        SELECT id, name FROM ${this.tableName}
        ORDER BY id DESC
        LIMIT $1;
      `;
      
      const result = await client.query(query, [steps]);
      const migrationsToRollback = result.rows.map(row => ({
        id: row.id,
        name: row.name
      })).reverse();
      
      if (migrationsToRollback.length === 0) {
        console.log('No migrations to rollback');
        return [];
      }
      
      console.log(`Rolling back ${migrationsToRollback.length} migrations`);
      
      const rolledBack = [];
      await client.query('BEGIN');
      
      for (const migration of migrationsToRollback) {
        const migrationPath = path.join(this.migrationsPath, migration.name);
        const migrationSql = await fs.promises.readFile(migrationPath, 'utf8');
        
        // Extract the down migration if it exists (assuming format with -- Down: ... section)
        const downMatch = migrationSql.match(/-- Down:([\s\S]*?)(?:-- (?!Down:)|$)/i);
        
        if (!downMatch) {
          throw new Error(`No down migration found in ${migration.name}`);
        }
        
        const downMigration = downMatch[1].trim();
        
        if (!downMigration) {
          throw new Error(`Empty down migration in ${migration.name}`);
        }
        
        console.log(`Rolling back migration: ${migration.name}`);
        await client.query(downMigration);
        
        // Remove from migrations table
        await client.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [migration.id]);
        
        rolledBack.push(migration.name);
        console.log(`Successfully rolled back migration: ${migration.name}`);
      }
      
      await client.query('COMMIT');
      console.log(`Successfully rolled back ${rolledBack.length} migrations`);
      
      return rolledBack;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error rolling back migrations:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = MigrationRunner;

// Command line interface
if (require.main === module) {
  const runner = new MigrationRunner();
  
  const command = process.argv[2];
  
  if (command === 'migrate') {
    runner.runMigrations()
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  } else if (command === 'rollback') {
    const steps = parseInt(process.argv[3] || '1');
    runner.rollback(steps)
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  } else {
    console.log('Usage: node migrationRunner.js [migrate|rollback [steps]]');
    process.exit(1);
  }
}
