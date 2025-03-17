/**
 * TrustAccountService.js
 * 
 * This service handles trust accounting functionality with separate ledgers
 * for security deposits, escrow funds, and other trust accounts. It provides
 * methods for managing trust accounts, recording transactions, generating
 * statements, and ensuring compliance with trust accounting regulations.
 * 
 * Part of the Advanced Accounting Module (Step 023) for the
 * Comprehensive Property Management System.
 */

const { Pool } = require('pg');
const moment = require('moment');
const config = require('../config/database');
const NotificationService = require('./NotificationService');

class TrustAccountService {
  constructor() {
    this.pool = new Pool(config.postgres);
    this.notificationService = new NotificationService();
  }

  /**
   * Create a new trust account
   * 
   * @param {Object} accountData - Trust account data
   * @param {number} accountData.propertyId - The ID of the property
   * @param {string} accountData.accountName - The name of the trust account
   * @param {string} accountData.accountNumber - The account number (optional)
   * @param {string} accountData.bankName - The bank name (optional)
   * @param {string} accountData.routingNumber - The routing number (optional)
   * @param {string} accountData.accountType - The account type ('security_deposit', 'escrow', 'reserve')
   * @param {boolean} accountData.isInterestBearing - Whether the account is interest-bearing
   * @param {number} accountData.interestRate - The annual interest rate (required if isInterestBearing is true)
   * @param {number} accountData.userId - The ID of the user creating the account
   * @returns {Promise<Object>} - The created trust account
   */
  async createTrustAccount(accountData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        propertyId,
        accountName,
        accountNumber = null,
        bankName = null,
        routingNumber = null,
        accountType,
        isInterestBearing = false,
        interestRate = null,
        userId
      } = accountData;
      
      // Validate account type
      if (!['security_deposit', 'escrow', 'reserve'].includes(accountType)) {
        throw new Error('Invalid account type. Must be one of: security_deposit, escrow, reserve');
      }
      
      // Validate interest rate if account is interest-bearing
      if (isInterestBearing && (interestRate === null || interestRate <= 0)) {
        throw new Error('Interest rate must be provided and greater than zero for interest-bearing accounts');
      }
      
      // Check if a trust account of the same type already exists for the property
      const checkQuery = `
        SELECT COUNT(*) AS count
        FROM trust_accounts
        WHERE property_id = $1 AND account_type = $2 AND is_active = true
      `;
      
      const checkResult = await client.query(checkQuery, [propertyId, accountType]);
      
      if (parseInt(checkResult.rows[0].count) > 0) {
        throw new Error(`An active trust account of type ${accountType} already exists for this property`);
      }
      
      // Create the trust account
      const insertQuery = `
        INSERT INTO trust_accounts (
          property_id,
          account_name,
          account_number,
          bank_name,
          routing_number,
          account_type,
          is_interest_bearing,
          interest_rate,
          balance,
          is_active,
          created_by,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0.00, true, $9, NOW(), NOW())
        RETURNING *
      `;
      
      const insertValues = [
        propertyId,
        accountName,
        accountNumber,
        bankName,
        routingNumber,
        accountType,
        isInterestBearing,
        interestRate,
        userId
      ];
      
      const insertResult = await client.query(insertQuery, insertValues);
      const trustAccount = insertResult.rows[0];
      
      await client.query('COMMIT');
      
      return trustAccount;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating trust account:', error);
      throw new Error(`Failed to create trust account: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing trust account
   * 
   * @param {number} accountId - The ID of the trust account to update
   * @param {Object} accountData - Updated trust account data
   * @param {string} accountData.accountName - The name of the trust account
   * @param {string} accountData.accountNumber - The account number (optional)
   * @param {string} accountData.bankName - The bank name (optional)
   * @param {string} accountData.routingNumber - The routing number (optional)
   * @param {boolean} accountData.isInterestBearing - Whether the account is interest-bearing
   * @param {number} accountData.interestRate - The annual interest rate (required if isInterestBearing is true)
   * @param {number} accountData.userId - The ID of the user updating the account
   * @returns {Promise<Object>} - The updated trust account
   */
  async updateTrustAccount(accountId, accountData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get the current trust account
      const getQuery = `
        SELECT * FROM trust_accounts WHERE id = $1
      `;
      
      const getResult = await client.query(getQuery, [accountId]);
      
      if (getResult.rows.length === 0) {
        throw new Error('Trust account not found');
      }
      
      const currentAccount = getResult.rows[0];
      
      const {
        accountName = currentAccount.account_name,
        accountNumber = currentAccount.account_number,
        bankName = currentAccount.bank_name,
        routingNumber = currentAccount.routing_number,
        isInterestBearing = currentAccount.is_interest_bearing,
        interestRate = currentAccount.interest_rate
      } = accountData;
      
      // Validate interest rate if account is interest-bearing
      if (isInterestBearing && (interestRate === null || interestRate <= 0)) {
        throw new Error('Interest rate must be provided and greater than zero for interest-bearing accounts');
      }
      
      // Update the trust account
      const updateQuery = `
        UPDATE trust_accounts
        SET 
          account_name = $1,
          account_number = $2,
          bank_name = $3,
          routing_number = $4,
          is_interest_bearing = $5,
          interest_rate = $6,
          updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `;
      
      const updateValues = [
        accountName,
        accountNumber,
        bankName,
        routingNumber,
        isInterestBearing,
        isInterestBearing ? interestRate : null,
        accountId
      ];
      
      const updateResult = await client.query(updateQuery, updateValues);
      const updatedAccount = updateResult.rows[0];
      
      await client.query('COMMIT');
      
      return updatedAccount;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating trust account:', error);
      throw new Error(`Failed to update trust account: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Deactivate a trust account
   * 
   * @param {number} accountId - The ID of the trust account to deactivate
   * @returns {Promise<boolean>} - Whether the deactivation was successful
   */
  async deactivateTrustAccount(accountId) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if the account has a non-zero balance
      const balanceQuery = `
        SELECT balance FROM trust_accounts WHERE id = $1
      `;
      
      const balanceResult = await client.query(balanceQuery, [accountId]);
      
      if (balanceResult.rows.length === 0) {
        throw new Error('Trust account not found');
      }
      
      const balance = parseFloat(balanceResult.rows[0].balance);
      
      if (balance > 0) {
        throw new Error('Cannot deactivate trust account with non-zero balance');
      }
      
      // Deactivate the trust account
      const updateQuery = `
        UPDATE trust_accounts
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `;
      
      await client.query(updateQuery, [accountId]);
      
      await client.query('COMMIT');
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deactivating trust account:', error);
      throw new Error(`Failed to deactivate trust account: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get trust accounts for a property
   * 
   * @param {number} propertyId - The ID of the property
   * @param {Object} options - Optional parameters
   * @param {boolean} options.includeInactive - Whether to include inactive accounts
   * @param {string} options.accountType - Filter by account type
   * @returns {Promise<Array>} - Array of trust accounts
   */
  async getTrustAccounts(propertyId, options = {}) {
    try {
      const {
        includeInactive = false,
        accountType = null
      } = options;
      
      let query = `
        SELECT 
          ta.*,
          p.name AS property_name,
          CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
        FROM trust_accounts ta
        JOIN properties p ON ta.property_id = p.id
        LEFT JOIN users u ON ta.created_by = u.id
        WHERE ta.property_id = $1
      `;
      
      const params = [propertyId];
      let paramIndex = 2;
      
      if (!includeInactive) {
        query += ` AND ta.is_active = true`;
      }
      
      if (accountType) {
        query += ` AND ta.account_type = $${paramIndex}`;
        params.push(accountType);
        paramIndex++;
      }
      
      query += ` ORDER BY ta.account_type, ta.created_at`;
      
      const { rows } = await this.pool.query(query, params);
      
      return rows;
    } catch (error) {
      console.error('Error getting trust accounts:', error);
      throw new Error('Failed to get trust accounts');
    }
  }

  /**
   * Get a specific trust account by ID
   * 
   * @param {number} accountId - The ID of the trust account
   * @returns {Promise<Object>} - The trust account
   */
  async getTrustAccountById(accountId) {
    try {
      const query = `
        SELECT 
          ta.*,
          p.name AS property_name,
          CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
        FROM trust_accounts ta
        JOIN properties p ON ta.property_id = p.id
        LEFT JOIN users u ON ta.created_by = u.id
        WHERE ta.id = $1
      `;
      
      const { rows } = await this.pool.query(query, [accountId]);
      
      if (rows.length === 0) {
        throw new Error('Trust account not found');
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error getting trust account by ID:', error);
      throw new Error('Failed to get trust account');
    }
  }

  /**
   * Record a deposit to a trust account
   * 
   * @param {Object} depositData - Deposit data
   * @param {number} depositData.trustAccountId - The ID of the trust account
   * @param {number} depositData.leaseId - The ID of the lease (optional)
   * @param {number} depositData.tenantId - The ID of the tenant (optional)
   * @param {number} depositData.amount - The deposit amount
   * @param {Date} depositData.transactionDate - The transaction date
   * @param {string} depositData.description - Description of the deposit
   * @param {string} depositData.referenceNumber - Reference number (optional)
   * @param {string} depositData.paymentMethod - Payment method (optional)
   * @param {number} depositData.userId - The ID of the user recording the deposit
   * @returns {Promise<Object>} - The recorded deposit transaction
   */
  async recordDeposit(depositData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        trustAccountId,
        leaseId = null,
        tenantId = null,
        amount,
        transactionDate = new Date(),
        description,
        referenceNumber = null,
        paymentMethod = null,
        userId
      } = depositData;
      
      // Validate amount
      if (amount <= 0) {
        throw new Error('Deposit amount must be greater than zero');
      }
      
      // Get trust account
      const accountQuery = `
        SELECT * FROM trust_accounts WHERE id = $1
      `;
      
      const accountResult = await client.query(accountQuery, [trustAccountId]);
      
      if (accountResult.rows.length === 0) {
        throw new Error('Trust account not found');
      }
      
      const account = accountResult.rows[0];
      
      // Validate tenant ID for security deposit accounts
      if (account.account_type === 'security_deposit' && !tenantId) {
        throw new Error('Tenant ID is required for security deposit accounts');
      }
      
      // Record the deposit
      const insertQuery = `
        INSERT INTO trust_account_transactions (
          trust_account_id,
          lease_id,
          tenant_id,
          transaction_type,
          amount,
          transaction_date,
          description,
          reference_number,
          payment_method,
          is_reconciled,
          created_by,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, 'deposit', $4, $5, $6, $7, $8, false, $9, NOW(), NOW())
        RETURNING *
      `;
      
      const insertValues = [
        trustAccountId,
        leaseId,
        tenantId,
        amount,
        transactionDate,
        description,
        referenceNumber,
        paymentMethod,
        userId
      ];
      
      const insertResult = await client.query(insertQuery, insertValues);
      const transaction = insertResult.rows[0];
      
      // Send notification if tenant ID is provided
      if (tenantId) {
        await this.notificationService.sendTrustAccountDepositNotification(
          tenantId,
          amount,
          account.account_type,
          transactionDate
        );
      }
      
      await client.query('COMMIT');
      
      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording deposit:', error);
      throw new Error(`Failed to record deposit: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Record a withdrawal from a trust account
   * 
   * @param {Object} withdrawalData - Withdrawal data
   * @param {number} withdrawalData.trustAccountId - The ID of the trust account
   * @param {number} withdrawalData.leaseId - The ID of the lease (optional)
   * @param {number} withdrawalData.tenantId - The ID of the tenant (optional)
   * @param {number} withdrawalData.amount - The withdrawal amount
   * @param {Date} withdrawalData.transactionDate - The transaction date
   * @param {string} withdrawalData.description - Description of the withdrawal
   * @param {string} withdrawalData.referenceNumber - Reference number (optional)
   * @param {string} withdrawalData.paymentMethod - Payment method (optional)
   * @param {number} withdrawalData.userId - The ID of the user recording the withdrawal
   * @returns {Promise<Object>} - The recorded withdrawal transaction
   */
  async recordWithdrawal(withdrawalData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        trustAccountId,
        leaseId = null,
        tenantId = null,
        amount,
        transactionDate = new Date(),
        description,
        referenceNumber = null,
        paymentMethod = null,
        userId
      } = withdrawalData;
      
      // Validate amount
      if (amount <= 0) {
        throw new Error('Withdrawal amount must be greater than zero');
      }
      
      // Get trust account
      const accountQuery = `
        SELECT * FROM trust_accounts WHERE id = $1
      `;
      
      const accountResult = await client.query(accountQuery, [trustAccountId]);
      
      if (accountResult.rows.length === 0) {
        throw new Error('Trust account not found');
      }
      
      const account = accountResult.rows[0];
      
      // Validate tenant ID for security deposit accounts
      if (account.account_type === 'security_deposit' && !tenantId) {
        throw new Error('Tenant ID is required for security deposit accounts');
      }
      
      // Check if sufficient funds are available
      if (parseFloat(account.balance) < amount) {
        throw new Error('Insufficient funds in trust account');
      }
      
      // Record the withdrawal
      const insertQuery = `
        INSERT INTO trust_account_transactions (
          trust_account_id,
          lease_id,
          tenant_id,
          transaction_type,
          amount,
          transaction_date,
          description,
          reference_number,
          payment_method,
          is_reconciled,
          created_by,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, 'withdrawal', $4, $5, $6, $7, $8, false, $9, NOW(), NOW())
        RETURNING *
      `;
      
      const insertValues = [
        trustAccountId,
        leaseId,
        tenantId,
        amount,
        transactionDate,
        description,
        referenceNumber,
        paymentMethod,
        userId
      ];
      
      const insertResult = await client.query(insertQuery, insertValues);
      const transaction = insertResult.rows[0];
      
      // Send notification if tenant ID is provided
      if (tenantId) {
        await this.notificationService.sendTrustAccountWithdrawalNotification(
          tenantId,
          amount,
          account.account_type,
          transactionDate
        );
      }
      
      await client.query('COMMIT');
      
      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording withdrawal:', error);
      throw new Error(`Failed to record withdrawal: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Record interest earned on a trust account
   * 
   * @param {Object} interestData - Interest data
   * @param {number} interestData.trustAccountId - The ID of the trust account
   * @param {number} interestData.amount - The interest amount
   * @param {Date} interestData.transactionDate - The transaction date
   * @param {string} interestData.description - Description of the interest
   * @param {number} interestData.userId - The ID of the user recording the interest
   * @returns {Promise<Object>} - The recorded interest transaction
   */
  async recordInterest(interestData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        trustAccountId,
        amount,
        transactionDate = new Date(),
        description = 'Interest earned',
        userId
      } = interestData;
      
      // Validate amount
      if (amount <= 0) {
        throw new Error('Interest amount must be greater than zero');
      }
      
      // Get trust account
      const accountQuery = `
        SELECT * FROM trust_accounts WHERE id = $1
      `;
      
      const accountResult = await client.query(accountQuery, [trustAccountId]);
      
      if (accountResult.rows.length === 0) {
        throw new Error('Trust account not found');
      }
      
      const account = accountResult.rows[0];
      
      // Validate that account is interest-bearing
      if (!account.is_interest_bearing) {
        throw new Error('Cannot record interest for non-interest-bearing account');
      }
      
      // Record the interest
      const insertQuery = `
        INSERT INTO trust_account_transactions (
          trust_account_id,
          transaction_type,
          amount,
          transaction_date,
          description,
          is_reconciled,
          created_by,
          created_at,
          updated_at
        )
        VALUES ($1, 'interest', $2, $3, $4, false, $5, NOW(), NOW())
        RETURNING *
      `;
      
      const insertValues = [
        trustAccountId,
        amount,
        transactionDate,
        description,
        userId
      ];
      
      const insertResult = await client.query(insertQuery, insertValues);
      const transaction = insertResult.rows[0];
      
      await client.query('COMMIT');
      
      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording interest:', error);
      throw new Error(`Failed to record interest: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Record a fee charged to a trust account
   * 
   * @param {Object} feeData - Fee data
   * @param {number} feeData.trustAccountId - The ID of the trust account
   * @param {number} feeData.amount - The fee amount
   * @param {Date} feeData.transactionDate - The transaction date
   * @param {string} feeData.description - Description of the fee
   * @param {number} feeData.userId - The ID of the user recording the fee
   * @returns {Promise<Object>} - The recorded fee transaction
   */
  async recordFee(feeData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        trustAccountId,
        amount,
        transactionDate = new Date(),
        description,
        userId
      } = feeData;
      
      // Validate amount
      if (amount <= 0) {
        throw new Error('Fee amount must be greater than zero');
      }
      
      // Get trust account
      const accountQuery = `
        SELECT * FROM trust_accounts WHERE id = $1
      `;
      
      const accountResult = await client.query(accountQuery, [trustAccountId]);
      
      if (accountResult.rows.length === 0) {
        throw new Error('Trust account not found');
      }
      
      const account = accountResult.rows[0];
      
      // Check if sufficient funds are available
      if (parseFloat(account.balance) < amount) {
        throw new Error('Insufficient funds in trust account');
      }
      
      // Record the fee
      const insertQuery = `
        INSERT INTO trust_account_transactions (
          trust_account_id,
          transaction_type,
          amount,
          transaction_date,
          description,
          is_reconciled,
          created_by,
          created_at,
          updated_at
        )
        VALUES ($1, 'fee', $2, $3, $4, false, $5, NOW(), NOW())
        RETURNING *
      `;
      
      const insertValues = [
        trustAccountId,
        amount,
        transactionDate,
        description,
        userId
      ];
      
      const insertResult = await client.query(insertQuery, insertValues);
      const transaction = insertResult.rows[0];
      
      await client.query('COMMIT');
      
      return transaction;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording fee:', error);
      throw new Error(`Failed to record fee: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get transactions for a trust account
   * 
   * @param {number} trustAccountId - The ID of the trust account
   * @param {Object} options - Optional parameters
   * @param {Date} options.startDate - Start date for filtering
   * @param {Date} options.endDate - End date for filtering
   * @param {string} options.transactionType - Filter by transaction type
   * @param {boolean} options.includeReconciled - Whether to include reconciled transactions
   * @returns {Promise<Array>} - Array of transactions
   */
  async getTransactions(trustAccountId, options = {}) {
    try {
      const {
        startDate = null,
        endDate = null,
        transactionType = null,
        includeReconciled = true
      } = options;
      
      let query = `
        SELECT 
          tat.*,
          ta.account_name,
          ta.account_type,
          CONCAT(t.first_name, ' ', t.last_name) AS tenant_name,
          CONCAT(cu.first_name, ' ', cu.last_name) AS created_by_name,
          CONCAT(ru.first_name, ' ', ru.last_name) AS reconciled_by_name
        FROM trust_account_transactions tat
        JOIN trust_accounts ta ON tat.trust_account_id = ta.id
        LEFT JOIN tenants t ON tat.tenant_id = t.id
        LEFT JOIN users cu ON tat.created_by = cu.id
        LEFT JOIN users ru ON tat.reconciled_by = ru.id
        WHERE tat.trust_account_id = $1
      `;
      
      const params = [trustAccountId];
      let paramIndex = 2;
      
      if (startDate) {
        query += ` AND tat.transaction_date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        query += ` AND tat.transaction_date <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }
      
      if (transactionType) {
        query += ` AND tat.transaction_type = $${paramIndex}`;
        params.push(transactionType);
        paramIndex++;
      }
      
      if (!includeReconciled) {
        query += ` AND tat.is_reconciled = false`;
      }
      
      query += ` ORDER BY tat.transaction_date DESC, tat.created_at DESC`;
      
      const { rows } = await this.pool.query(query, params);
      
      return rows;
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw new Error('Failed to get transactions');
    }
  }

  /**
   * Get security deposit balance for a tenant
   * 
   * @param {number} tenantId - The ID of the tenant
   * @returns {Promise<Object>} - Security deposit balance information
   */
  async getSecurityDepositBalance(tenantId) {
    try {
      // Get active lease for tenant
      const leaseQuery = `
        SELECT 
          l.id AS lease_id,
          l.property_id,
          l.unit_id,
          u.unit_number,
          p.name AS property_name
        FROM leases l
        JOIN lease_tenants lt ON l.id = lt.lease_id
        JOIN units u ON l.unit_id = u.id
        JOIN properties p ON l.property_id = p.id
        WHERE lt.tenant_id = $1
        AND l.status = 'active'
        LIMIT 1
      `;
      
      const leaseResult = await this.pool.query(leaseQuery, [tenantId]);
      
      if (leaseResult.rows.length === 0) {
        throw new Error('No active lease found for tenant');
      }
      
      const lease = leaseResult.rows[0];
      
      // Get security deposit trust account for property
      const accountQuery = `
        SELECT id
        FROM trust_accounts
        WHERE property_id = $1
        AND account_type = 'security_deposit'
        AND is_active = true
        LIMIT 1
      `;
      
      const accountResult = await this.pool.query(accountQuery, [lease.property_id]);
      
      if (accountResult.rows.length === 0) {
        throw new Error('No security deposit trust account found for property');
      }
      
      const trustAccountId = accountResult.rows[0].id;
      
      // Get security deposit transactions for tenant
      const transactionsQuery = `
        SELECT 
          transaction_type,
          amount,
          transaction_date,
          description
        FROM trust_account_transactions
        WHERE trust_account_id = $1
        AND tenant_id = $2
        ORDER BY transaction_date, created_at
      `;
      
      const transactionsResult = await this.pool.query(transactionsQuery, [trustAccountId, tenantId]);
      const transactions = transactionsResult.rows;
      
      // Calculate balance
      let balance = 0;
      
      for (const transaction of transactions) {
        if (transaction.transaction_type === 'deposit' || transaction.transaction_type === 'interest') {
          balance += parseFloat(transaction.amount);
        } else if (transaction.transaction_type === 'withdrawal' || transaction.transaction_type === 'fee') {
          balance -= parseFloat(transaction.amount);
        }
      }
      
      // Get tenant details
      const tenantQuery = `
        SELECT first_name, last_name, email, phone
        FROM tenants
        WHERE id = $1
      `;
      
      const tenantResult = await this.pool.query(tenantQuery, [tenantId]);
      
      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant not found');
      }
      
      const tenant = tenantResult.rows[0];
      
      return {
        tenantId,
        tenantName: `${tenant.first_name} ${tenant.last_name}`,
        tenantEmail: tenant.email,
        tenantPhone: tenant.phone,
        leaseId: lease.lease_id,
        propertyId: lease.property_id,
        propertyName: lease.property_name,
        unitId: lease.unit_id,
        unitNumber: lease.unit_number,
        trustAccountId,
        balance,
        transactions
      };
    } catch (error) {
      console.error('Error getting security deposit balance:', error);
      throw new Error(`Failed to get security deposit balance: ${error.message}`);
    }
  }

  /**
   * Reconcile trust account transactions
   * 
   * @param {number} trustAccountId - The ID of the trust account
   * @param {Array} transactionIds - Array of transaction IDs to reconcile
   * @param {Date} reconciliationDate - The reconciliation date
   * @param {number} userId - The ID of the user performing the reconciliation
   * @returns {Promise<Object>} - Reconciliation results
   */
  async reconcileTransactions(trustAccountId, transactionIds, reconciliationDate, userId) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get trust account
      const accountQuery = `
        SELECT * FROM trust_accounts WHERE id = $1
      `;
      
      const accountResult = await client.query(accountQuery, [trustAccountId]);
      
      if (accountResult.rows.length === 0) {
        throw new Error('Trust account not found');
      }
      
      // Update transactions
      const updateQuery = `
        UPDATE trust_account_transactions
        SET 
          is_reconciled = true,
          reconciled_date = $1,
          reconciled_by = $2,
          updated_at = NOW()
        WHERE id = ANY($3)
        AND trust_account_id = $4
        AND is_reconciled = false
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, [
        reconciliationDate,
        userId,
        transactionIds,
        trustAccountId
      ]);
      
      const reconciledTransactions = updateResult.rows;
      
      await client.query('COMMIT');
      
      return {
        trustAccountId,
        reconciledCount: reconciledTransactions.length,
        reconciliationDate,
        reconciledTransactions
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error reconciling transactions:', error);
      throw new Error(`Failed to reconcile transactions: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Generate trust account statement
   * 
   * @param {number} trustAccountId - The ID of the trust account
   * @param {Object} options - Optional parameters
   * @param {Date} options.startDate - Start date for the statement (default: first day of current month)
   * @param {Date} options.endDate - End date for the statement (default: last day of current month)
   * @param {string} options.format - The statement format ('json', 'csv', 'pdf')
   * @returns {Promise<Object>} - The generated statement
   */
  async generateStatement(trustAccountId, options = {}) {
    try {
      // Set default options
      const defaultOptions = {
        startDate: moment().startOf('month').toDate(),
        endDate: moment().endOf('month').toDate(),
        format: 'json'
      };
      
      const opts = { ...defaultOptions, ...options };
      
      // Get trust account
      const accountQuery = `
        SELECT 
          ta.*,
          p.name AS property_name,
          p.address AS property_address,
          p.city AS property_city,
          p.state AS property_state,
          p.zip_code AS property_zip
        FROM trust_accounts ta
        JOIN properties p ON ta.property_id = p.id
        WHERE ta.id = $1
      `;
      
      const accountResult = await this.pool.query(accountQuery, [trustAccountId]);
      
      if (accountResult.rows.length === 0) {
        throw new Error('Trust account not found');
      }
      
      const account = accountResult.rows[0];
      
      // Get opening balance (balance at start date - 1 day)
      const openingBalanceDate = moment(opts.startDate).subtract(1, 'day').format('YYYY-MM-DD');
      
      const openingBalanceQuery = `
        SELECT 
          COALESCE(
            SUM(
              CASE 
                WHEN transaction_type IN ('deposit', 'interest') THEN amount 
                WHEN transaction_type IN ('withdrawal', 'fee') THEN -amount
                ELSE 0
              END
            ),
            0
          ) AS opening_balance
        FROM trust_account_transactions
        WHERE trust_account_id = $1
        AND transaction_date <= $2
      `;
      
      const openingBalanceResult = await this.pool.query(openingBalanceQuery, [trustAccountId, openingBalanceDate]);
      const openingBalance = parseFloat(openingBalanceResult.rows[0].opening_balance);
      
      // Get transactions for the period
      const transactionsQuery = `
        SELECT 
          tat.*,
          CONCAT(t.first_name, ' ', t.last_name) AS tenant_name,
          CONCAT(cu.first_name, ' ', cu.last_name) AS created_by_name,
          CONCAT(ru.first_name, ' ', ru.last_name) AS reconciled_by_name
        FROM trust_account_transactions tat
        LEFT JOIN tenants t ON tat.tenant_id = t.id
        LEFT JOIN users cu ON tat.created_by = cu.id
        LEFT JOIN users ru ON tat.reconciled_by = ru.id
        WHERE tat.trust_account_id = $1
        AND tat.transaction_date >= $2
        AND tat.transaction_date <= $3
        ORDER BY tat.transaction_date, tat.created_at
      `;
      
      const transactionsResult = await this.pool.query(transactionsQuery, [
        trustAccountId,
        opts.startDate,
        opts.endDate
      ]);
      
      const transactions = transactionsResult.rows;
      
      // Calculate running balance
      let runningBalance = openingBalance;
      const transactionsWithBalance = transactions.map(transaction => {
        if (transaction.transaction_type === 'deposit' || transaction.transaction_type === 'interest') {
          runningBalance += parseFloat(transaction.amount);
        } else if (transaction.transaction_type === 'withdrawal' || transaction.transaction_type === 'fee') {
          runningBalance -= parseFloat(transaction.amount);
        }
        
        return {
          ...transaction,
          running_balance: runningBalance
        };
      });
      
      // Calculate summary statistics
      const totalDeposits = transactions
        .filter(t => t.transaction_type === 'deposit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const totalWithdrawals = transactions
        .filter(t => t.transaction_type === 'withdrawal')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const totalInterest = transactions
        .filter(t => t.transaction_type === 'interest')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const totalFees = transactions
        .filter(t => t.transaction_type === 'fee')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // Group by tenant if security deposit account
      let tenantSummaries = null;
      
      if (account.account_type === 'security_deposit') {
        const tenantTransactions = {};
        
        for (const transaction of transactions) {
          if (transaction.tenant_id) {
            if (!tenantTransactions[transaction.tenant_id]) {
              tenantTransactions[transaction.tenant_id] = {
                tenantId: transaction.tenant_id,
                tenantName: transaction.tenant_name,
                transactions: [],
                deposits: 0,
                withdrawals: 0,
                interest: 0,
                fees: 0,
                balance: 0
              };
            }
            
            tenantTransactions[transaction.tenant_id].transactions.push(transaction);
            
            if (transaction.transaction_type === 'deposit') {
              tenantTransactions[transaction.tenant_id].deposits += parseFloat(transaction.amount);
              tenantTransactions[transaction.tenant_id].balance += parseFloat(transaction.amount);
            } else if (transaction.transaction_type === 'withdrawal') {
              tenantTransactions[transaction.tenant_id].withdrawals += parseFloat(transaction.amount);
              tenantTransactions[transaction.tenant_id].balance -= parseFloat(transaction.amount);
            } else if (transaction.transaction_type === 'interest') {
              tenantTransactions[transaction.tenant_id].interest += parseFloat(transaction.amount);
              tenantTransactions[transaction.tenant_id].balance += parseFloat(transaction.amount);
            } else if (transaction.transaction_type === 'fee') {
              tenantTransactions[transaction.tenant_id].fees += parseFloat(transaction.amount);
              tenantTransactions[transaction.tenant_id].balance -= parseFloat(transaction.amount);
            }
          }
        }
        
        tenantSummaries = Object.values(tenantTransactions);
      }
      
      // Construct the statement
      const statement = {
        account: {
          id: account.id,
          name: account.account_name,
          type: account.account_type,
          accountNumber: account.account_number,
          bankName: account.bank_name,
          isInterestBearing: account.is_interest_bearing,
          interestRate: account.interest_rate
        },
        property: {
          id: account.property_id,
          name: account.property_name,
          address: account.property_address,
          city: account.property_city,
          state: account.property_state,
          zipCode: account.property_zip
        },
        statementPeriod: {
          startDate: opts.startDate,
          endDate: opts.endDate
        },
        summary: {
          openingBalance,
          closingBalance: runningBalance,
          totalDeposits,
          totalWithdrawals,
          totalInterest,
          totalFees,
          netChange: runningBalance - openingBalance
        },
        tenantSummaries,
        transactions: transactionsWithBalance
      };
      
      // Format the statement based on the requested format
      if (opts.format === 'json') {
        return statement;
      } else if (opts.format === 'csv') {
        // Generate CSV format
        const header = 'Date,Type,Description,Amount,Balance,Tenant,Reference,Reconciled\n';
        const rows = transactionsWithBalance.map(transaction => {
          return [
            moment(transaction.transaction_date).format('MM/DD/YYYY'),
            transaction.transaction_type,
            transaction.description,
            transaction.transaction_type === 'withdrawal' || transaction.transaction_type === 'fee' ? 
              `-${transaction.amount}` : transaction.amount,
            transaction.running_balance,
            transaction.tenant_name || '',
            transaction.reference_number || '',
            transaction.is_reconciled ? 'Yes' : 'No'
          ].join(',');
        }).join('\n');
        
        return {
          content: header + rows,
          filename: `trust_account_statement_${account.account_name.replace(/\s+/g, '_').toLowerCase()}_${moment(opts.startDate).format('YYYY-MM-DD')}_${moment(opts.endDate).format('YYYY-MM-DD')}.csv`,
          contentType: 'text/csv'
        };
      } else if (opts.format === 'pdf') {
        // For PDF generation, we would typically use a library like PDFKit
        // This is a placeholder for the actual implementation
        return {
          message: 'PDF generation would be implemented here',
          statement
        };
      } else {
        throw new Error('Unsupported statement format');
      }
    } catch (error) {
      console.error('Error generating trust account statement:', error);
      throw new Error(`Failed to generate trust account statement: ${error.message}`);
    }
  }

  /**
   * Calculate and apply interest to interest-bearing trust accounts
   * 
   * @param {Date} asOfDate - The date to calculate interest as of
   * @param {number} userId - The ID of the user applying the interest
   * @returns {Promise<Object>} - Interest application results
   */
  async calculateAndApplyInterest(asOfDate = new Date(), userId) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get all interest-bearing trust accounts
      const accountsQuery = `
        SELECT * FROM trust_accounts
        WHERE is_interest_bearing = true
        AND is_active = true
      `;
      
      const accountsResult = await client.query(accountsQuery);
      const accounts = accountsResult.rows;
      
      const results = {
        totalAccounts: accounts.length,
        totalInterestApplied: 0,
        accountResults: []
      };
      
      // Process each account
      for (const account of accounts) {
        try {
          // Check if interest has already been applied for the current month
          const currentMonth = moment(asOfDate).format('YYYY-MM');
          
          const existingInterestQuery = `
            SELECT COUNT(*) AS count
            FROM trust_account_transactions
            WHERE trust_account_id = $1
            AND transaction_type = 'interest'
            AND TO_CHAR(transaction_date, 'YYYY-MM') = $2
          `;
          
          const existingInterestResult = await client.query(existingInterestQuery, [
            account.id,
            currentMonth
          ]);
          
          if (parseInt(existingInterestResult.rows[0].count) > 0) {
            results.accountResults.push({
              accountId: account.id,
              accountName: account.account_name,
              interestApplied: 0,
              message: 'Interest already applied for this month'
            });
            continue;
          }
          
          // Calculate average daily balance for the month
          const startOfMonth = moment(asOfDate).startOf('month').format('YYYY-MM-DD');
          const endOfMonth = moment(asOfDate).endOf('month').format('YYYY-MM-DD');
          const daysInMonth = moment(asOfDate).daysInMonth();
          
          // Get all transactions for the month
          const transactionsQuery = `
            SELECT *
            FROM trust_account_transactions
            WHERE trust_account_id = $1
            AND transaction_date <= $2
            ORDER BY transaction_date, created_at
          `;
          
          const transactionsResult = await client.query(transactionsQuery, [account.id, endOfMonth]);
          const transactions = transactionsResult.rows;
          
          // Calculate balance at the start of the month
          let balance = 0;
          
          for (const transaction of transactions) {
            if (moment(transaction.transaction_date).isBefore(startOfMonth)) {
              if (transaction.transaction_type === 'deposit' || transaction.transaction_type === 'interest') {
                balance += parseFloat(transaction.amount);
              } else if (transaction.transaction_type === 'withdrawal' || transaction.transaction_type === 'fee') {
                balance -= parseFloat(transaction.amount);
              }
            }
          }
          
          // Calculate daily balances and sum for average
          const dailyBalances = {};
          let currentDate = moment(startOfMonth);
          let currentBalance = balance;
          
          while (currentDate.isSameOrBefore(moment(asOfDate))) {
            const dateStr = currentDate.format('YYYY-MM-DD');
            
            // Apply transactions for this date
            for (const transaction of transactions) {
              if (moment(transaction.transaction_date).format('YYYY-MM-DD') === dateStr) {
                if (transaction.transaction_type === 'deposit' || transaction.transaction_type === 'interest') {
                  currentBalance += parseFloat(transaction.amount);
                } else if (transaction.transaction_type === 'withdrawal' || transaction.transaction_type === 'fee') {
                  currentBalance -= parseFloat(transaction.amount);
                }
              }
            }
            
            dailyBalances[dateStr] = currentBalance;
            currentDate.add(1, 'day');
          }
          
          // Calculate average daily balance
          const totalDailyBalance = Object.values(dailyBalances).reduce((sum, balance) => sum + balance, 0);
          const daysElapsed = Object.keys(dailyBalances).length;
          const averageDailyBalance = totalDailyBalance / daysElapsed;
          
          // Calculate interest (annual rate / 12 months * average daily balance)
          const monthlyInterestRate = parseFloat(account.interest_rate) / 100 / 12;
          const interestAmount = averageDailyBalance * monthlyInterestRate;
          
          // Round to 2 decimal places
          const roundedInterestAmount = Math.round(interestAmount * 100) / 100;
          
          // Skip if interest amount is zero
          if (roundedInterestAmount <= 0) {
            results.accountResults.push({
              accountId: account.id,
              accountName: account.account_name,
              interestApplied: 0,
              message: 'Calculated interest amount is zero or negative'
            });
            continue;
          }
          
          // Record the interest
          const description = `Monthly interest at ${account.interest_rate}% APR for ${moment(asOfDate).format('MMMM YYYY')}`;
          
          const insertQuery = `
            INSERT INTO trust_account_transactions (
              trust_account_id,
              transaction_type,
              amount,
              transaction_date,
              description,
              is_reconciled,
              created_by,
              created_at,
              updated_at
            )
            VALUES ($1, 'interest', $2, $3, $4, false, $5, NOW(), NOW())
            RETURNING *
          `;
          
          const insertValues = [
            account.id,
            roundedInterestAmount,
            asOfDate,
            description,
            userId
          ];
          
          const insertResult = await client.query(insertQuery, insertValues);
          const interestTransaction = insertResult.rows[0];
          
          results.totalInterestApplied += roundedInterestAmount;
          results.accountResults.push({
            accountId: account.id,
            accountName: account.account_name,
            interestApplied: roundedInterestAmount,
            averageDailyBalance,
            monthlyInterestRate,
            transactionId: interestTransaction.id
          });
        } catch (error) {
          console.error(`Error applying interest to account ${account.id}:`, error);
          results.accountResults.push({
            accountId: account.id,
            accountName: account.account_name,
            error: error.message
          });
        }
      }
      
      await client.query('COMMIT');
      
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error calculating and applying interest:', error);
      throw new Error(`Failed to calculate and apply interest: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Transfer funds between trust accounts
   * 
   * @param {Object} transferData - Transfer data
   * @param {number} transferData.fromAccountId - The ID of the source trust account
   * @param {number} transferData.toAccountId - The ID of the destination trust account
   * @param {number} transferData.amount - The transfer amount
   * @param {Date} transferData.transactionDate - The transaction date
   * @param {string} transferData.description - Description of the transfer
   * @param {string} transferData.referenceNumber - Reference number (optional)
   * @param {number} transferData.userId - The ID of the user recording the transfer
   * @returns {Promise<Object>} - The transfer results
   */
  async transferFunds(transferData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        fromAccountId,
        toAccountId,
        amount,
        transactionDate = new Date(),
        description,
        referenceNumber = null,
        userId
      } = transferData;
      
      // Validate amount
      if (amount <= 0) {
        throw new Error('Transfer amount must be greater than zero');
      }
      
      // Validate accounts
      if (fromAccountId === toAccountId) {
        throw new Error('Source and destination accounts cannot be the same');
      }
      
      // Get source account
      const sourceAccountQuery = `
        SELECT * FROM trust_accounts WHERE id = $1
      `;
      
      const sourceAccountResult = await client.query(sourceAccountQuery, [fromAccountId]);
      
      if (sourceAccountResult.rows.length === 0) {
        throw new Error('Source trust account not found');
      }
      
      const sourceAccount = sourceAccountResult.rows[0];
      
      // Get destination account
      const destAccountQuery = `
        SELECT * FROM trust_accounts WHERE id = $1
      `;
      
      const destAccountResult = await client.query(destAccountQuery, [toAccountId]);
      
      if (destAccountResult.rows.length === 0) {
        throw new Error('Destination trust account not found');
      }
      
      const destAccount = destAccountResult.rows[0];
      
      // Check if sufficient funds are available
      if (parseFloat(sourceAccount.balance) < amount) {
        throw new Error('Insufficient funds in source trust account');
      }
      
      // Record withdrawal from source account
      const withdrawalQuery = `
        INSERT INTO trust_account_transactions (
          trust_account_id,
          transaction_type,
          amount,
          transaction_date,
          description,
          reference_number,
          is_reconciled,
          created_by,
          created_at,
          updated_at
        )
        VALUES ($1, 'withdrawal', $2, $3, $4, $5, false, $6, NOW(), NOW())
        RETURNING *
      `;
      
      const withdrawalDescription = `${description} (Transfer to ${destAccount.account_name})`;
      
      const withdrawalValues = [
        fromAccountId,
        amount,
        transactionDate,
        withdrawalDescription,
        referenceNumber,
        userId
      ];
      
      const withdrawalResult = await client.query(withdrawalQuery, withdrawalValues);
      const withdrawal = withdrawalResult.rows[0];
      
      // Record deposit to destination account
      const depositQuery = `
        INSERT INTO trust_account_transactions (
          trust_account_id,
          transaction_type,
          amount,
          transaction_date,
          description,
          reference_number,
          is_reconciled,
          created_by,
          created_at,
          updated_at
        )
        VALUES ($1, 'deposit', $2, $3, $4, $5, false, $6, NOW(), NOW())
        RETURNING *
      `;
      
      const depositDescription = `${description} (Transfer from ${sourceAccount.account_name})`;
      
      const depositValues = [
        toAccountId,
        amount,
        transactionDate,
        depositDescription,
        referenceNumber,
        userId
      ];
      
      const depositResult = await client.query(depositQuery, depositValues);
      const deposit = depositResult.rows[0];
      
      await client.query('COMMIT');
      
      return {
        fromAccount: {
          id: sourceAccount.id,
          name: sourceAccount.account_name,
          type: sourceAccount.account_type,
          previousBalance: parseFloat(sourceAccount.balance),
          newBalance: parseFloat(sourceAccount.balance) - amount
        },
        toAccount: {
          id: destAccount.id,
          name: destAccount.account_name,
          type: destAccount.account_type,
          previousBalance: parseFloat(destAccount.balance),
          newBalance: parseFloat(destAccount.balance) + amount
        },
        amount,
        transactionDate,
        description,
        referenceNumber,
        withdrawalTransaction: withdrawal,
        depositTransaction: deposit
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error transferring funds:', error);
      throw new Error(`Failed to transfer funds: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Generate trust account audit report
   * 
   * @param {number} propertyId - The ID of the property
   * @param {Object} options - Optional parameters
   * @param {Date} options.startDate - Start date for the report (default: first day of current year)
   * @param {Date} options.endDate - End date for the report (default: current date)
   * @returns {Promise<Object>} - The generated audit report
   */
  async generateAuditReport(propertyId, options = {}) {
    try {
      // Set default options
      const defaultOptions = {
        startDate: moment().startOf('year').toDate(),
        endDate: new Date()
      };
      
      const opts = { ...defaultOptions, ...options };
      
      // Get property details
      const propertyQuery = `
        SELECT id, name, address, city, state, zip_code
        FROM properties
        WHERE id = $1
      `;
      
      const propertyResult = await this.pool.query(propertyQuery, [propertyId]);
      
      if (propertyResult.rows.length === 0) {
        throw new Error('Property not found');
      }
      
      const property = propertyResult.rows[0];
      
      // Get all trust accounts for the property
      const accountsQuery = `
        SELECT * FROM trust_accounts
        WHERE property_id = $1
        ORDER BY account_type, created_at
      `;
      
      const accountsResult = await this.pool.query(accountsQuery, [propertyId]);
      const accounts = accountsResult.rows;
      
      if (accounts.length === 0) {
        throw new Error('No trust accounts found for property');
      }
      
      // Get all transactions for the period
      const transactionsQuery = `
        SELECT 
          tat.*,
          ta.account_name,
          ta.account_type,
          CONCAT(t.first_name, ' ', t.last_name) AS tenant_name,
          CONCAT(cu.first_name, ' ', cu.last_name) AS created_by_name,
          CONCAT(ru.first_name, ' ', ru.last_name) AS reconciled_by_name
        FROM trust_account_transactions tat
        JOIN trust_accounts ta ON tat.trust_account_id = ta.id
        LEFT JOIN tenants t ON tat.tenant_id = t.id
        LEFT JOIN users cu ON tat.created_by = cu.id
        LEFT JOIN users ru ON tat.reconciled_by = ru.id
        WHERE ta.property_id = $1
        AND tat.transaction_date >= $2
        AND tat.transaction_date <= $3
        ORDER BY tat.transaction_date, tat.created_at
      `;
      
      const transactionsResult = await this.pool.query(transactionsQuery, [
        propertyId,
        opts.startDate,
        opts.endDate
      ]);
      
      const transactions = transactionsResult.rows;
      
      // Group transactions by account
      const accountTransactions = {};
      
      for (const account of accounts) {
        accountTransactions[account.id] = {
          account,
          transactions: [],
          summary: {
            deposits: 0,
            withdrawals: 0,
            interest: 0,
            fees: 0,
            netChange: 0
          }
        };
      }
      
      for (const transaction of transactions) {
        if (accountTransactions[transaction.trust_account_id]) {
          accountTransactions[transaction.trust_account_id].transactions.push(transaction);
          
          if (transaction.transaction_type === 'deposit') {
            accountTransactions[transaction.trust_account_id].summary.deposits += parseFloat(transaction.amount);
            accountTransactions[transaction.trust_account_id].summary.netChange += parseFloat(transaction.amount);
          } else if (transaction.transaction_type === 'withdrawal') {
            accountTransactions[transaction.trust_account_id].summary.withdrawals += parseFloat(transaction.amount);
            accountTransactions[transaction.trust_account_id].summary.netChange -= parseFloat(transaction.amount);
          } else if (transaction.transaction_type === 'interest') {
            accountTransactions[transaction.trust_account_id].summary.interest += parseFloat(transaction.amount);
            accountTransactions[transaction.trust_account_id].summary.netChange += parseFloat(transaction.amount);
          } else if (transaction.transaction_type === 'fee') {
            accountTransactions[transaction.trust_account_id].summary.fees += parseFloat(transaction.amount);
            accountTransactions[transaction.trust_account_id].summary.netChange -= parseFloat(transaction.amount);
          }
        }
      }
      
      // Calculate overall summary
      const overallSummary = {
        totalAccounts: accounts.length,
        totalTransactions: transactions.length,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalInterest: 0,
        totalFees: 0,
        netChange: 0,
        currentBalance: 0
      };
      
      for (const accountId in accountTransactions) {
        const accountSummary = accountTransactions[accountId].summary;
        overallSummary.totalDeposits += accountSummary.deposits;
        overallSummary.totalWithdrawals += accountSummary.withdrawals;
        overallSummary.totalInterest += accountSummary.interest;
        overallSummary.totalFees += accountSummary.fees;
        overallSummary.netChange += accountSummary.netChange;
        overallSummary.currentBalance += parseFloat(accountTransactions[accountId].account.balance);
      }
      
      // Check for unreconciled transactions
      const unreconciledTransactions = transactions.filter(t => !t.is_reconciled);
      
      // Check for security deposit compliance
      let securityDepositCompliance = null;
      
      const securityDepositAccount = accounts.find(a => a.account_type === 'security_deposit');
      
      if (securityDepositAccount) {
        // Get all active leases with security deposits
        const leasesQuery = `
          SELECT 
            l.id,
            l.unit_id,
            l.security_deposit_amount,
            u.unit_number,
            CONCAT(t.first_name, ' ', t.last_name) AS tenant_name
          FROM leases l
          JOIN units u ON l.unit_id = u.id
          JOIN lease_tenants lt ON l.id = lt.lease_id
          JOIN tenants t ON lt.tenant_id = t.id
          WHERE l.property_id = $1
          AND l.status = 'active'
          AND l.security_deposit_amount > 0
          AND lt.is_primary = true
        `;
        
        const leasesResult = await this.pool.query(leasesQuery, [propertyId]);
        const leases = leasesResult.rows;
        
        // Calculate total security deposits required
        const totalSecurityDepositsRequired = leases.reduce(
          (sum, lease) => sum + parseFloat(lease.security_deposit_amount),
          0
        );
        
        // Check if security deposit account balance is sufficient
        const isCompliant = parseFloat(securityDepositAccount.balance) >= totalSecurityDepositsRequired;
        
        securityDepositCompliance = {
          isCompliant,
          totalSecurityDepositsRequired,
          accountBalance: parseFloat(securityDepositAccount.balance),
          difference: parseFloat(securityDepositAccount.balance) - totalSecurityDepositsRequired,
          leases
        };
      }
      
      // Construct the audit report
      const auditReport = {
        property,
        reportPeriod: {
          startDate: opts.startDate,
          endDate: opts.endDate
        },
        overallSummary,
        accounts: Object.values(accountTransactions),
        unreconciledTransactions: unreconciledTransactions.length > 0 ? unreconciledTransactions : null,
        securityDepositCompliance
      };
      
      return auditReport;
    } catch (error) {
      console.error('Error generating trust account audit report:', error);
      throw new Error(`Failed to generate trust account audit report: ${error.message}`);
    }
  }
}

module.exports = TrustAccountService;
