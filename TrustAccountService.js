/**
 * TrustAccountService.js
 * Service for managing trust accounts with separate ledgers
 */

const db = require('../config/database');

class TrustAccountService {
  /**
   * Get all trust accounts for a property
   * @param {number} propertyId - The ID of the property
   * @returns {Promise<Array>} - Array of trust accounts
   */
  async getTrustAccounts(propertyId) {
    try {
      const query = `
        SELECT * FROM trust_accounts
        WHERE property_id = $1
        ORDER BY created_at DESC
      `;
      const result = await db.query(query, [propertyId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching trust accounts:', error);
      throw new Error('Failed to fetch trust accounts');
    }
  }

  /**
   * Get a specific trust account by ID
   * @param {number} accountId - The ID of the trust account
   * @returns {Promise<Object>} - The trust account
   */
  async getTrustAccountById(accountId) {
    try {
      const query = `
        SELECT * FROM trust_accounts
        WHERE id = $1
      `;
      const result = await db.query(query, [accountId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching trust account:', error);
      throw new Error('Failed to fetch trust account');
    }
  }

  /**
   * Create a new trust account
   * @param {Object} accountData - The trust account data
   * @returns {Promise<Object>} - The created trust account
   */
  async createTrustAccount(accountData) {
    try {
      const {
        property_id,
        name,
        description,
        initial_balance,
        account_type
      } = accountData;

      const query = `
        INSERT INTO trust_accounts (
          property_id, name, description, balance, account_type
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const values = [
        property_id,
        name,
        description,
        initial_balance || 0,
        account_type
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating trust account:', error);
      throw new Error('Failed to create trust account');
    }
  }

  /**
   * Update an existing trust account
   * @param {number} accountId - The ID of the trust account
   * @param {Object} accountData - The updated trust account data
   * @returns {Promise<Object>} - The updated trust account
   */
  async updateTrustAccount(accountId, accountData) {
    try {
      const {
        name,
        description,
        account_type
      } = accountData;

      const query = `
        UPDATE trust_accounts
        SET 
          name = $1,
          description = $2,
          account_type = $3,
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;

      const values = [
        name,
        description,
        account_type,
        accountId
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating trust account:', error);
      throw new Error('Failed to update trust account');
    }
  }

  /**
   * Get all transactions for a trust account
   * @param {number} accountId - The ID of the trust account
   * @param {Object} options - Query options (limit, offset, date range)
   * @returns {Promise<Object>} - Transactions with pagination info
   */
  async getTransactions(accountId, options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        startDate,
        endDate,
        transactionType
      } = options;

      let filters = ['trust_account_id = $1'];
      const queryParams = [accountId];
      let paramIndex = 2;

      if (startDate && endDate) {
        filters.push(`transaction_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        queryParams.push(startDate, endDate);
        paramIndex += 2;
      } else if (startDate) {
        filters.push(`transaction_date >= $${paramIndex}`);
        queryParams.push(startDate);
        paramIndex += 1;
      } else if (endDate) {
        filters.push(`transaction_date <= $${paramIndex}`);
        queryParams.push(endDate);
        paramIndex += 1;
      }

      if (transactionType) {
        filters.push(`transaction_type = $${paramIndex}`);
        queryParams.push(transactionType);
        paramIndex += 1;
      }

      const whereClause = filters.join(' AND ');

      // Query for transactions
      const query = `
        SELECT * FROM trust_account_transactions
        WHERE ${whereClause}
        ORDER BY transaction_date DESC, created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      
      const result = await db.query(query, queryParams);
      
      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) FROM trust_account_transactions
        WHERE ${whereClause}
      `;
      
      const countResult = await db.query(countQuery, queryParams.slice(0, paramIndex - 1));
      const totalCount = parseInt(countResult.rows[0].count);
      
      return {
        transactions: result.rows,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      };
    } catch (error) {
      console.error('Error fetching trust account transactions:', error);
      throw new Error('Failed to fetch trust account transactions');
    }
  }

  /**
   * Create a new transaction in the trust account
   * @param {Object} transactionData - The transaction data
   * @returns {Promise<Object>} - The created transaction and updated account balance
   */
  async createTransaction(transactionData) {
    // Start a database transaction to ensure atomicity
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const {
        trust_account_id,
        amount,
        transaction_type,
        category,
        description,
        reference_id,
        transaction_date
      } = transactionData;
      
      // Verify the trust account exists
      const accountQuery = `
        SELECT * FROM trust_accounts
        WHERE id = $1
        FOR UPDATE
      `;
      
      const accountResult = await client.query(accountQuery, [trust_account_id]);
      const account = accountResult.rows[0];
      
      if (!account) {
        throw new Error('Trust account not found');
      }
      
      // Calculate new balance based on transaction type
      let newBalance = parseFloat(account.balance);
      
      if (transaction_type === 'deposit') {
        newBalance += parseFloat(amount);
      } else if (transaction_type === 'withdrawal') {
        newBalance -= parseFloat(amount);
      } else {
        throw new Error('Invalid transaction type');
      }
      
      // Create the transaction
      const transactionQuery = `
        INSERT INTO trust_account_transactions (
          trust_account_id,
          amount,
          transaction_type,
          category,
          description,
          reference_id,
          transaction_date,
          balance_after
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const transactionValues = [
        trust_account_id,
        amount,
        transaction_type,
        category,
        description,
        reference_id,
        transaction_date || new Date(),
        newBalance
      ];
      
      const transactionResult = await client.query(transactionQuery, transactionValues);
      
      // Update the account balance
      const updateQuery = `
        UPDATE trust_accounts
        SET balance = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, [newBalance, trust_account_id]);
      
      await client.query('COMMIT');
      
      return {
        transaction: transactionResult.rows[0],
        account: updateResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating trust account transaction:', error);
      throw new Error(`Failed to create trust account transaction: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get account balance and summary for a trust account
   * @param {number} accountId - The ID of the trust account
   * @returns {Promise<Object>} - Account balance and summary
   */
  async getAccountSummary(accountId) {
    try {
      // Get account details
      const accountQuery = `
        SELECT * FROM trust_accounts
        WHERE id = $1
      `;
      
      const accountResult = await db.query(accountQuery, [accountId]);
      const account = accountResult.rows[0];
      
      if (!account) {
        throw new Error('Trust account not found');
      }
      
      // Get transaction summary
      const summaryQuery = `
        SELECT 
          transaction_type,
          SUM(amount) as total_amount,
          COUNT(*) as transaction_count
        FROM trust_account_transactions
        WHERE trust_account_id = $1
        GROUP BY transaction_type
      `;
      
      const summaryResult = await db.query(summaryQuery, [accountId]);
      
      // Get recent transactions
      const recentQuery = `
        SELECT * FROM trust_account_transactions
        WHERE trust_account_id = $1
        ORDER BY transaction_date DESC, created_at DESC
        LIMIT 5
      `;
      
      const recentResult = await db.query(recentQuery, [accountId]);
      
      // Calculate monthly totals
      const monthlyQuery = `
        SELECT 
          DATE_TRUNC('month', transaction_date) as month,
          transaction_type,
          SUM(amount) as total_amount
        FROM trust_account_transactions
        WHERE trust_account_id = $1
        AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
        GROUP BY DATE_TRUNC('month', transaction_date), transaction_type
        ORDER BY month DESC
      `;
      
      const monthlyResult = await db.query(monthlyQuery, [accountId]);
      
      // Process monthly data into a more usable format
      const monthlyTotals = {};
      
      monthlyResult.rows.forEach(row => {
        const monthKey = row.month.toISOString().substring(0, 7); // YYYY-MM format
        
        if (!monthlyTotals[monthKey]) {
          monthlyTotals[monthKey] = {
            month: monthKey,
            deposits: 0,
            withdrawals: 0
          };
        }
        
        if (row.transaction_type === 'deposit') {
          monthlyTotals[monthKey].deposits = parseFloat(row.total_amount);
        } else if (row.transaction_type === 'withdrawal') {
          monthlyTotals[monthKey].withdrawals = parseFloat(row.total_amount);
        }
      });
      
      return {
        account,
        summary: summaryResult.rows,
        recentTransactions: recentResult.rows,
        monthlyTotals: Object.values(monthlyTotals)
      };
    } catch (error) {
      console.error('Error getting trust account summary:', error);
      throw new Error('Failed to get trust account summary');
    }
  }

  /**
   * Transfer funds between trust accounts
   * @param {Object} transferData - The transfer data
   * @returns {Promise<Object>} - The created transactions and updated accounts
   */
  async transferBetweenAccounts(transferData) {
    // Start a database transaction to ensure atomicity
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      const {
        from_account_id,
        to_account_id,
        amount,
        description,
        reference_id,
        transaction_date
      } = transferData;
      
      if (from_account_id === to_account_id) {
        throw new Error('Cannot transfer to the same account');
      }
      
      // Verify both accounts exist
      const accountsQuery = `
        SELECT id, balance FROM trust_accounts
        WHERE id IN ($1, $2)
        FOR UPDATE
      `;
      
      const accountsResult = await client.query(accountsQuery, [from_account_id, to_account_id]);
      
      if (accountsResult.rows.length !== 2) {
        throw new Error('One or both trust accounts not found');
      }
      
      const accounts = {};
      accountsResult.rows.forEach(row => {
        accounts[row.id] = row;
      });
      
      const fromAccount = accounts[from_account_id];
      const toAccount = accounts[to_account_id];
      
      // Check sufficient balance
      if (parseFloat(fromAccount.balance) < parseFloat(amount)) {
        throw new Error('Insufficient funds for transfer');
      }
      
      // Create withdrawal transaction
      const withdrawalQuery = `
        INSERT INTO trust_account_transactions (
          trust_account_id,
          amount,
          transaction_type,
          category,
          description,
          reference_id,
          transaction_date,
          related_account_id,
          balance_after
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const newFromBalance = parseFloat(fromAccount.balance) - parseFloat(amount);
      
      const withdrawalValues = [
        from_account_id,
        amount,
        'withdrawal',
        'transfer',
        description || 'Transfer to another trust account',
        reference_id,
        transaction_date || new Date(),
        to_account_id,
        newFromBalance
      ];
      
      const withdrawalResult = await client.query(withdrawalQuery, withdrawalValues);
      
      // Create deposit transaction
      const depositQuery = `
        INSERT INTO trust_account_transactions (
          trust_account_id,
          amount,
          transaction_type,
          category,
          description,
          reference_id,
          transaction_date,
          related_account_id,
          balance_after
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const newToBalance = parseFloat(toAccount.balance) + parseFloat(amount);
      
      const depositValues = [
        to_account_id,
        amount,
        'deposit',
        'transfer',
        description || 'Transfer from another trust account',
        reference_id,
        transaction_date || new Date(),
        from_account_id,
        newToBalance
      ];
      
      const depositResult = await client.query(depositQuery, depositValues);
      
      // Update account balances
      const updateFromQuery = `
        UPDATE trust_accounts
        SET balance = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      
      const updateToQuery = `
        UPDATE trust_accounts
        SET balance = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      
      const updateFromResult = await client.query(updateFromQuery, [newFromBalance, from_account_id]);
      const updateToResult = await client.query(updateToQuery, [newToBalance, to_account_id]);
      
      await client.query('COMMIT');
      
      return {
        withdrawal: withdrawalResult.rows[0],
        deposit: depositResult.rows[0],
        fromAccount: updateFromResult.rows[0],
        toAccount: updateToResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error transferring between trust accounts:', error);
      throw new Error(`Failed to transfer between trust accounts: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

module.exports = TrustAccountService;
