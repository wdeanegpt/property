/**
 * Late Fee Service
 * 
 * This service handles late fee configurations and calculations.
 * It provides methods for managing late fee rules, calculating fees,
 * and processing late fee payments.
 */

const database = require('../utils/database');

class LateFeeService {
  /**
   * Get late fee configuration for a property
   * @param {number} propertyId - The ID of the property
   * @returns {Promise<Object>} - Late fee configuration
   */
  async getLateFeeConfiguration(propertyId) {
    if (!propertyId) {
      throw new Error('Property ID is required');
    }

    const query = `
      SELECT *
      FROM late_fee_configurations
      WHERE property_id = $1 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result = await database.query(query, [propertyId]);
      
      if (result.rows.length === 0) {
        // Return default configuration if none exists
        return {
          property_id: propertyId,
          fee_type: 'percentage',
          fee_amount: 5, // 5% default
          grace_period_days: 5,
          maximum_fee: 100,
          is_compounding: false,
          is_active: true
        };
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting late fee configuration:', error);
      throw new Error('Failed to retrieve late fee configuration');
    }
  }

  /**
   * Create or update late fee configuration for a property
   * @param {Object} configData - The configuration data
   * @param {number} configData.propertyId - The ID of the property
   * @param {string} configData.feeType - The fee type ('percentage' or 'fixed')
   * @param {number} configData.feeAmount - The fee amount (percentage or fixed amount)
   * @param {number} configData.gracePeriodDays - The grace period in days
   * @param {number} configData.maximumFee - The maximum fee amount (for percentage type)
   * @param {boolean} configData.isCompounding - Whether the fee compounds
   * @returns {Promise<Object>} - The created or updated configuration
   */
  async saveLateFeeConfiguration(configData) {
    const {
      propertyId,
      feeType,
      feeAmount,
      gracePeriodDays = 0,
      maximumFee = null,
      isCompounding = false
    } = configData;

    // Validate required fields
    if (!propertyId || !feeType || !feeAmount) {
      throw new Error('Property ID, fee type, and fee amount are required');
    }

    // Validate fee type
    if (feeType !== 'percentage' && feeType !== 'fixed') {
      throw new Error('Fee type must be either "percentage" or "fixed"');
    }

    // Begin transaction
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Deactivate existing configurations
      const deactivateQuery = `
        UPDATE late_fee_configurations
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE property_id = $1 AND is_active = true
      `;
      
      await client.query(deactivateQuery, [propertyId]);
      
      // Insert new configuration
      const insertQuery = `
        INSERT INTO late_fee_configurations (
          property_id,
          fee_type,
          fee_amount,
          grace_period_days,
          maximum_fee,
          is_compounding,
          is_active,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const insertParams = [
        propertyId,
        feeType,
        feeAmount,
        gracePeriodDays,
        maximumFee,
        isCompounding
      ];
      
      const result = await client.query(insertQuery, insertParams);
      const configuration = result.rows[0];
      
      // Commit transaction
      await client.query('COMMIT');
      
      return configuration;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving late fee configuration:', error);
      throw new Error('Failed to save late fee configuration');
    } finally {
      client.release();
    }
  }

  /**
   * Calculate late fee for a payment
   * @param {Object} paymentData - The payment data
   * @param {number} paymentData.amount - The payment amount
   * @param {number} paymentData.daysLate - The number of days late
   * @param {Object} configuration - The late fee configuration
   * @returns {number} - The calculated late fee amount
   */
  calculateLateFee(paymentData, configuration) {
    const { amount, daysLate } = paymentData;
    
    // No late fee if not past grace period
    if (daysLate <= configuration.grace_period_days) {
      return 0;
    }
    
    let lateFee = 0;
    
    if (configuration.fee_type === 'percentage') {
      lateFee = amount * (configuration.fee_amount / 100);
      
      // Apply maximum fee if set
      if (configuration.maximum_fee && lateFee > configuration.maximum_fee) {
        lateFee = configuration.maximum_fee;
      }
    } else { // fixed amount
      lateFee = configuration.fee_amount;
    }
    
    // Apply compounding if configured
    if (configuration.is_compounding) {
      const effectiveDaysLate = daysLate - configuration.grace_period_days;
      lateFee = lateFee * effectiveDaysLate;
      
      // Apply maximum fee if set
      if (configuration.maximum_fee && lateFee > configuration.maximum_fee) {
        lateFee = configuration.maximum_fee;
      }
    }
    
    return lateFee;
  }

  /**
   * Get all late fees for a lease
   * @param {number} leaseId - The ID of the lease
   * @param {Object} options - Optional parameters
   * @param {boolean} options.includePaid - Whether to include paid late fees (defaults to false)
   * @returns {Promise<Array>} - Array of late fees
   */
  async getLateFees(leaseId, options = {}) {
    const { includePaid = false } = options;

    if (!leaseId) {
      throw new Error('Lease ID is required');
    }

    let query = `
      SELECT 
        lf.*,
        rp.payment_type,
        rp.due_day,
        p.id as payment_id,
        p.payment_date,
        p.payment_method,
        p.reference_number
      FROM 
        late_fees lf
      LEFT JOIN 
        recurring_payments rp ON lf.recurring_payment_id = rp.id
      LEFT JOIN 
        payments p ON lf.payment_id = p.id
      WHERE 
        lf.lease_id = $1
    `;
    
    if (!includePaid) {
      query += ' AND lf.is_paid = false';
    }
    
    query += ' ORDER BY lf.created_at DESC';

    try {
      const result = await database.query(query, [leaseId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting late fees:', error);
      throw new Error('Failed to retrieve late fees');
    }
  }

  /**
   * Record payment for a late fee
   * @param {number} lateFeeId - The ID of the late fee
   * @param {number} paymentId - The ID of the payment
   * @param {Date} paymentDate - The payment date
   * @returns {Promise<Object>} - The updated late fee
   */
  async recordLateFeePayment(lateFeeId, paymentId, paymentDate = new Date()) {
    if (!lateFeeId || !paymentId) {
      throw new Error('Late fee ID and payment ID are required');
    }

    const query = `
      UPDATE late_fees
      SET 
        is_paid = true,
        paid_date = $1,
        payment_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    try {
      const result = await database.query(query, [paymentDate, paymentId, lateFeeId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Late fee with ID ${lateFeeId} not found`);
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error recording late fee payment:', error);
      throw new Error('Failed to record late fee payment');
    }
  }

  /**
   * Waive a late fee
   * @param {number} lateFeeId - The ID of the late fee
   * @param {string} reason - The reason for waiving the fee
   * @param {number} userId - The ID of the user waiving the fee
   * @returns {Promise<Object>} - The waived late fee
   */
  async waiveLateFee(lateFeeId, reason, userId) {
    if (!lateFeeId || !reason || !userId) {
      throw new Error('Late fee ID, reason, and user ID are required');
    }

    // Begin transaction
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Update late fee
      const updateQuery = `
        UPDATE late_fees
        SET 
          is_waived = true,
          waive_reason = $1,
          waived_by = $2,
          waived_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, [reason, userId, lateFeeId]);
      
      if (updateResult.rows.length === 0) {
        throw new Error(`Late fee with ID ${lateFeeId} not found`);
      }
      
      const lateFee = updateResult.rows[0];
      
      // Log waiver action
      const logQuery = `
        INSERT INTO activity_logs (
          entity_type,
          entity_id,
          action,
          details,
          user_id,
          created_at
        )
        VALUES (
          'late_fee',
          $1,
          'waive',
          $2,
          $3,
          CURRENT_TIMESTAMP
        )
      `;
      
      const logParams = [
        lateFeeId,
        JSON.stringify({
          amount: lateFee.amount,
          reason: reason
        }),
        userId
      ];
      
      await client.query(logQuery, logParams);
      
      // Commit transaction
      await client.query('COMMIT');
      
      return lateFee;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error waiving late fee:', error);
      throw new Error('Failed to waive late fee');
    } finally {
      client.release();
    }
  }

  /**
   * Get late fee statistics for a property
   * @param {number} propertyId - The ID of the property
   * @param {Object} options - Optional parameters
   * @param {Date} options.startDate - The start date for statistics
   * @param {Date} options.endDate - The end date for statistics
   * @returns {Promise<Object>} - Late fee statistics
   */
  async getLateFeeStatistics(propertyId, options = {}) {
    const {
      startDate = new Date(new Date().getFullYear(), 0, 1), // Default to start of current year
      endDate = new Date()
    } = options;

    if (!propertyId) {
      throw new Error('Property ID is required');
    }

    try {
      // Get total late fees assessed
      const assessedQuery = `
        SELECT 
          COUNT(*) as total_count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM 
          late_fees lf
        JOIN 
          leases l ON lf.lease_id = l.id
        WHERE 
          l.property_id = $1
          AND lf.created_at BETWEEN $2 AND $3
      `;
      
      const assessedResult = await database.query(assessedQuery, [
        propertyId,
        startDate,
        endDate
      ]);
      
      const assessed = assessedResult.rows[0];
      
      // Get total late fees collected
      const collectedQuery = `
        SELECT 
          COUNT(*) as total_count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM 
          late_fees lf
        JOIN 
          leases l ON lf.lease_id = l.id
        WHERE 
          l.property_id = $1
          AND lf.is_paid = true
          AND lf.paid_date BETWEEN $2 AND $3
      `;
      
      const collectedResult = await database.query(collectedQuery, [
        propertyId,
        startDate,
        endDate
      ]);
      
      const collected = collectedResult.rows[0];
      
      // Get total late fees waived
      const waivedQuery = `
        SELECT 
          COUNT(*) as total_count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM 
          late_fees lf
        JOIN 
          leases l ON lf.lease_id = l.id
        WHERE 
          l.property_id = $1
          AND lf.is_waived = true
          AND lf.waived_at BETWEEN $2 AND $3
      `;
      
      const waivedResult = await database.query(waivedQuery, [
        propertyId,
        startDate,
        endDate
      ]);
      
      const waived = waivedResult.rows[0];
      
      // Get outstanding late fees
      const outstandingQuery = `
        SELECT 
          COUNT(*) as total_count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM 
          late_fees lf
        JOIN 
          leases l ON lf.lease_id = l.id
        WHERE 
          l.property_id = $1
          AND lf.is_paid = false
          AND lf.is_waived = false
          AND lf.created_at BETWEEN $2 AND $3
      `;
      
      const outstandingResult = await database.query(outstandingQuery, [
        propertyId,
        startDate,
        endDate
      ]);
      
      const outstanding = outstandingResult.rows[0];
      
      // Get monthly breakdown
      const monthlyQuery = `
        SELECT 
          DATE_TRUNC('month', lf.created_at) as month,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(CASE WHEN lf.is_paid THEN 1 END) as paid_count,
          COALESCE(SUM(CASE WHEN lf.is_paid THEN amount ELSE 0 END), 0) as paid_amount,
          COUNT(CASE WHEN lf.is_waived THEN 1 END) as waived_count,
          COALESCE(SUM(CASE WHEN lf.is_waived THEN amount ELSE 0 END), 0) as waived_amount
        FROM 
          late_fees lf
        JOIN 
          leases l ON lf.lease_id = l.id
        WHERE 
          l.property_id = $1
          AND lf.created_at BETWEEN $2 AND $3
        GROUP BY 
          DATE_TRUNC('month', lf.created_at)
        ORDER BY 
          month
      `;
      
      const monthlyResult = await database.query(monthlyQuery, [
        propertyId,
        startDate,
        endDate
      ]);
      
      const monthly = monthlyResult.rows;
      
      // Get tenant breakdown
      const tenantQuery = `
        SELECT 
          l.tenant_id,
          CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
          COUNT(*) as count,
          COALESCE(SUM(lf.amount), 0) as total_amount,
          COUNT(CASE WHEN lf.is_paid THEN 1 END) as paid_count,
          COALESCE(SUM(CASE WHEN lf.is_paid THEN lf.amount ELSE 0 END), 0) as paid_amount,
          COUNT(CASE WHEN lf.is_waived THEN 1 END) as waived_count,
          COALESCE(SUM(CASE WHEN lf.is_waived THEN lf.amount ELSE 0 END), 0) as waived_amount,
          COUNT(CASE WHEN NOT lf.is_paid AND NOT lf.is_waived THEN 1 END) as outstanding_count,
          COALESCE(SUM(CASE WHEN NOT lf.is_paid AND NOT lf.is_waived THEN lf.amount ELSE 0 END), 0) as outstanding_amount
        FROM 
          late_fees lf
        JOIN 
          leases l ON lf.lease_id = l.id
        JOIN 
          tenants t ON l.tenant_id = t.id
        WHERE 
          l.property_id = $1
          AND lf.created_at BETWEEN $2 AND $3
        GROUP BY 
          l.tenant_id, tenant_name
        ORDER BY 
          total_amount DESC
      `;
      
      const tenantResult = await database.query(tenantQuery, [
        propertyId,
        startDate,
        endDate
      ]);
      
      const tenants = tenantResult.rows;
      
      return {
        period: {
          start_date: startDate,
          end_date: endDate
        },
        summary: {
          assessed: {
            count: parseInt(assessed.total_count),
            amount: parseFloat(assessed.total_amount)
          },
          collected: {
            count: parseInt(collected.total_count),
            amount: parseFloat(collected.total_amount)
          },
          waived: {
            count: parseInt(waived.total_count),
            amount: parseFloat(waived.total_amount)
          },
          outstanding: {
            count: parseInt(outstanding.total_count),
            amount: parseFloat(outstanding.total_amount)
          },
          collection_rate: assessed.total_amount > 0 
           <response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>