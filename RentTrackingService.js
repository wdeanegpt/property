/**
 * RentTrackingService.js
 * Service for managing rent tracking functionality including automated late fees
 */

const db = require('../config/database');
const LateFeeService = require('./LateFeeService');

class RentTrackingService {
  /**
   * Get all recurring payments for a property
   * @param {number} propertyId - The ID of the property
   * @returns {Promise<Array>} - Array of recurring payments
   */
  async getRecurringPayments(propertyId) {
    try {
      const query = `
        SELECT * FROM recurring_payments
        WHERE property_id = $1
        ORDER BY due_date ASC
      `;
      const result = await db.query(query, [propertyId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching recurring payments:', error);
      throw new Error('Failed to fetch recurring payments');
    }
  }

  /**
   * Get all recurring payments for a tenant
   * @param {number} tenantId - The ID of the tenant
   * @returns {Promise<Array>} - Array of recurring payments
   */
  async getTenantRecurringPayments(tenantId) {
    try {
      const query = `
        SELECT * FROM recurring_payments
        WHERE tenant_id = $1
        ORDER BY due_date ASC
      `;
      const result = await db.query(query, [tenantId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching tenant recurring payments:', error);
      throw new Error('Failed to fetch tenant recurring payments');
    }
  }

  /**
   * Create a new recurring payment
   * @param {Object} paymentData - The recurring payment data
   * @returns {Promise<Object>} - The created recurring payment
   */
  async createRecurringPayment(paymentData) {
    try {
      const {
        property_id,
        tenant_id,
        amount,
        frequency,
        due_date,
        payment_type,
        description,
        is_active
      } = paymentData;

      const query = `
        INSERT INTO recurring_payments (
          property_id, tenant_id, amount, frequency, 
          due_date, payment_type, description, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        property_id,
        tenant_id,
        amount,
        frequency,
        due_date,
        payment_type,
        description,
        is_active || true
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating recurring payment:', error);
      throw new Error('Failed to create recurring payment');
    }
  }

  /**
   * Update an existing recurring payment
   * @param {number} paymentId - The ID of the recurring payment
   * @param {Object} paymentData - The updated recurring payment data
   * @returns {Promise<Object>} - The updated recurring payment
   */
  async updateRecurringPayment(paymentId, paymentData) {
    try {
      const {
        property_id,
        tenant_id,
        amount,
        frequency,
        due_date,
        payment_type,
        description,
        is_active
      } = paymentData;

      const query = `
        UPDATE recurring_payments
        SET 
          property_id = $1,
          tenant_id = $2,
          amount = $3,
          frequency = $4,
          due_date = $5,
          payment_type = $6,
          description = $7,
          is_active = $8,
          updated_at = NOW()
        WHERE id = $9
        RETURNING *
      `;

      const values = [
        property_id,
        tenant_id,
        amount,
        frequency,
        due_date,
        payment_type,
        description,
        is_active,
        paymentId
      ];

      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating recurring payment:', error);
      throw new Error('Failed to update recurring payment');
    }
  }

  /**
   * Delete a recurring payment
   * @param {number} paymentId - The ID of the recurring payment
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  async deleteRecurringPayment(paymentId) {
    try {
      const query = `
        DELETE FROM recurring_payments
        WHERE id = $1
        RETURNING id
      `;
      const result = await db.query(query, [paymentId]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting recurring payment:', error);
      throw new Error('Failed to delete recurring payment');
    }
  }

  /**
   * Check for overdue payments and apply late fees automatically
   * @returns {Promise<Array>} - Array of payments with late fees applied
   */
  async checkAndApplyLateFees() {
    try {
      // Get all active recurring payments that are overdue
      const query = `
        SELECT rp.* 
        FROM recurring_payments rp
        WHERE rp.is_active = true 
        AND rp.due_date < CURRENT_DATE
        AND NOT EXISTS (
          SELECT 1 FROM late_fees lf 
          WHERE lf.recurring_payment_id = rp.id 
          AND DATE_TRUNC('month', lf.created_at) = DATE_TRUNC('month', CURRENT_DATE)
        )
      `;
      
      const result = await db.query(query);
      const overduePayments = result.rows;
      
      // Apply late fees to each overdue payment
      const lateFeeService = new LateFeeService();
      const appliedFees = [];
      
      for (const payment of overduePayments) {
        // Get late fee configuration for the property
        const lateFeeConfig = await lateFeeService.getLateFeeConfiguration(payment.property_id);
        
        if (lateFeeConfig) {
          // Calculate late fee amount based on configuration
          let feeAmount;
          if (lateFeeConfig.fee_type === 'percentage') {
            feeAmount = (payment.amount * lateFeeConfig.fee_value) / 100;
          } else {
            feeAmount = lateFeeConfig.fee_value;
          }
          
          // Apply minimum/maximum constraints
          if (lateFeeConfig.minimum_fee && feeAmount < lateFeeConfig.minimum_fee) {
            feeAmount = lateFeeConfig.minimum_fee;
          }
          
          if (lateFeeConfig.maximum_fee && feeAmount > lateFeeConfig.maximum_fee) {
            feeAmount = lateFeeConfig.maximum_fee;
          }
          
          // Create late fee record
          const lateFee = await lateFeeService.createLateFee({
            recurring_payment_id: payment.id,
            property_id: payment.property_id,
            tenant_id: payment.tenant_id,
            amount: feeAmount,
            description: `Automatic late fee for payment due on ${payment.due_date}`
          });
          
          appliedFees.push({
            payment: payment,
            lateFee: lateFee
          });
        }
      }
      
      return appliedFees;
    } catch (error) {
      console.error('Error checking and applying late fees:', error);
      throw new Error('Failed to check and apply late fees');
    }
  }

  /**
   * Get payment history for a property
   * @param {number} propertyId - The ID of the property
   * @param {Object} options - Query options (limit, offset, date range)
   * @returns {Promise<Object>} - Payment history with pagination info
   */
  async getPaymentHistory(propertyId, options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        startDate,
        endDate
      } = options;

      let dateFilter = '';
      const queryParams = [propertyId];
      let paramIndex = 2;

      if (startDate && endDate) {
        dateFilter = `AND payment_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        queryParams.push(startDate, endDate);
        paramIndex += 2;
      } else if (startDate) {
        dateFilter = `AND payment_date >= $${paramIndex}`;
        queryParams.push(startDate);
        paramIndex += 1;
      } else if (endDate) {
        dateFilter = `AND payment_date <= $${paramIndex}`;
        queryParams.push(endDate);
        paramIndex += 1;
      }

      // Query for payments
      const query = `
        SELECT * FROM payments
        WHERE property_id = $1
        ${dateFilter}
        ORDER BY payment_date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      
      const result = await db.query(query, queryParams);
      
      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) FROM payments
        WHERE property_id = $1
        ${dateFilter}
      `;
      
      const countResult = await db.query(countQuery, queryParams.slice(0, paramIndex - 1));
      const totalCount = parseInt(countResult.rows[0].count);
      
      return {
        payments: result.rows,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      };
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw new Error('Failed to fetch payment history');
    }
  }
}

module.exports = RentTrackingService;
