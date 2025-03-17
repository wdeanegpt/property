/**
 * LateFeeService.js
 * 
 * This service handles late fee configuration, calculation, and management.
 * It provides methods for configuring late fee rules, calculating late fees
 * for overdue payments, applying late fees, and managing late fee waivers.
 * 
 * Part of the Advanced Accounting Module (Step 023) for the
 * Comprehensive Property Management System.
 */

const { Pool } = require('pg');
const moment = require('moment');
const config = require('../config/database');
const NotificationService = require('./NotificationService');

class LateFeeService {
  constructor() {
    this.pool = new Pool(config.postgres);
    this.notificationService = new NotificationService();
  }

  /**
   * Get late fee configuration for a property
   * 
   * @param {number} propertyId - The ID of the property
   * @returns {Promise<Object>} - Late fee configuration object
   */
  async getLateFeeConfiguration(propertyId) {
    try {
      const query = `
        SELECT * FROM late_fee_configurations
        WHERE property_id = $1 AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const { rows } = await this.pool.query(query, [propertyId]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error getting late fee configuration:', error);
      throw new Error('Failed to get late fee configuration');
    }
  }

  /**
   * Create or update late fee configuration for a property
   * 
   * @param {Object} configData - Late fee configuration data
   * @param {number} configData.propertyId - The ID of the property
   * @param {string} configData.feeType - Type of late fee ('percentage' or 'fixed')
   * @param {number} configData.feeAmount - Amount of late fee (percentage or fixed amount)
   * @param {number} configData.gracePeriodDays - Number of days after due date before late fee is applied
   * @param {number} configData.maximumFee - Maximum late fee amount when using percentage (null for no maximum)
   * @param {boolean} configData.isCompounding - Whether late fees compound (can be applied multiple times)
   * @param {number} configData.userId - The ID of the user creating/updating the configuration
   * @returns {Promise<Object>} - Created/updated late fee configuration
   */
  async createOrUpdateLateFeeConfiguration(configData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if configuration already exists
      const checkQuery = `
        SELECT id FROM late_fee_configurations
        WHERE property_id = $1 AND is_active = true
      `;
      
      const checkResult = await client.query(checkQuery, [configData.propertyId]);
      
      let lateFeeConfig;
      
      if (checkResult.rows.length > 0) {
        // Update existing configuration
        const updateQuery = `
          UPDATE late_fee_configurations
          SET 
            fee_type = $1,
            fee_amount = $2,
            grace_period_days = $3,
            maximum_fee = $4,
            is_compounding = $5,
            updated_at = NOW()
          WHERE id = $6
          RETURNING *
        `;
        
        const updateResult = await client.query(updateQuery, [
          configData.feeType,
          configData.feeAmount,
          configData.gracePeriodDays,
          configData.maximumFee,
          configData.isCompounding,
          checkResult.rows[0].id
        ]);
        
        lateFeeConfig = updateResult.rows[0];
      } else {
        // Create new configuration
        const insertQuery = `
          INSERT INTO late_fee_configurations (
            property_id,
            fee_type,
            fee_amount,
            grace_period_days,
            maximum_fee,
            is_compounding,
            is_active,
            created_by,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW(), NOW())
          RETURNING *
        `;
        
        const insertResult = await client.query(insertQuery, [
          configData.propertyId,
          configData.feeType,
          configData.feeAmount,
          configData.gracePeriodDays,
          configData.maximumFee,
          configData.isCompounding,
          configData.userId
        ]);
        
        lateFeeConfig = insertResult.rows[0];
      }
      
      await client.query('COMMIT');
      
      return lateFeeConfig;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating/updating late fee configuration:', error);
      throw new Error('Failed to create/update late fee configuration');
    } finally {
      client.release();
    }
  }

  /**
   * Deactivate late fee configuration for a property
   * 
   * @param {number} propertyId - The ID of the property
   * @param {number} userId - The ID of the user deactivating the configuration
   * @returns {Promise<boolean>} - Whether the deactivation was successful
   */
  async deactivateLateFeeConfiguration(propertyId, userId) {
    try {
      const query = `
        UPDATE late_fee_configurations
        SET is_active = false, updated_at = NOW()
        WHERE property_id = $1 AND is_active = true
      `;
      
      const result = await this.pool.query(query, [propertyId]);
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deactivating late fee configuration:', error);
      throw new Error('Failed to deactivate late fee configuration');
    }
  }

  /**
   * Calculate late fee for an overdue payment
   * 
   * @param {Object} paymentData - Payment data
   * @param {number} paymentData.propertyId - The ID of the property
   * @param {number} paymentData.amount - The full payment amount
   * @param {number} paymentData.amountPaid - The amount already paid
   * @param {Date} paymentData.dueDate - The payment due date
   * @param {Date} paymentData.asOfDate - The date to calculate late fee as of (default: current date)
   * @returns {Promise<Object>} - Calculated late fee object
   */
  async calculateLateFee(paymentData) {
    try {
      const { 
        propertyId, 
        amount, 
        amountPaid = 0, 
        dueDate, 
        asOfDate = new Date() 
      } = paymentData;
      
      // Get late fee configuration
      const lateFeeConfig = await this.getLateFeeConfiguration(propertyId);
      
      if (!lateFeeConfig) {
        return {
          lateFeeAmount: 0,
          daysLate: 0,
          gracePeriod: 0,
          feeType: null,
          feeRate: null,
          isWithinGracePeriod: true
        };
      }
      
      // Calculate days late
      const dueDateObj = moment(dueDate);
      const asOfDateObj = moment(asOfDate);
      const daysLate = Math.max(0, asOfDateObj.diff(dueDateObj, 'days'));
      
      // Check if within grace period
      if (daysLate <= lateFeeConfig.grace_period_days) {
        return {
          lateFeeAmount: 0,
          daysLate,
          gracePeriod: lateFeeConfig.grace_period_days,
          feeType: lateFeeConfig.fee_type,
          feeRate: lateFeeConfig.fee_amount,
          isWithinGracePeriod: true
        };
      }
      
      // Calculate outstanding amount
      const outstandingAmount = amount - amountPaid;
      
      if (outstandingAmount <= 0) {
        return {
          lateFeeAmount: 0,
          daysLate,
          gracePeriod: lateFeeConfig.grace_period_days,
          feeType: lateFeeConfig.fee_type,
          feeRate: lateFeeConfig.fee_amount,
          isWithinGracePeriod: false,
          isPaid: true
        };
      }
      
      // Calculate late fee
      let lateFeeAmount = 0;
      
      if (lateFeeConfig.fee_type === 'percentage') {
        lateFeeAmount = outstandingAmount * (lateFeeConfig.fee_amount / 100);
        
        // Apply maximum fee if configured
        if (lateFeeConfig.maximum_fee && lateFeeAmount > lateFeeConfig.maximum_fee) {
          lateFeeAmount = lateFeeConfig.maximum_fee;
        }
      } else if (lateFeeConfig.fee_type === 'fixed') {
        lateFeeAmount = lateFeeConfig.fee_amount;
      }
      
      return {
        lateFeeAmount,
        daysLate,
        gracePeriod: lateFeeConfig.grace_period_days,
        feeType: lateFeeConfig.fee_type,
        feeRate: lateFeeConfig.fee_amount,
        maximumFee: lateFeeConfig.maximum_fee,
        isWithinGracePeriod: false,
        isPaid: false,
        outstandingAmount
      };
    } catch (error) {
      console.error('Error calculating late fee:', error);
      throw new Error('Failed to calculate late fee');
    }
  }

  /**
   * Calculate and apply late fee for an overdue payment
   * 
   * @param {Object} client - Database client for transaction
   * @param {number} propertyId - The ID of the property
   * @param {number} leaseId - The ID of the lease
   * @param {number} recurringPaymentId - The ID of the recurring payment
   * @param {number} fullAmount - The full payment amount
   * @param {number} amountPaid - The amount already paid
   * @param {Date} dueDate - The payment due date
   * @param {Date} asOfDate - The date to calculate late fee as of
   * @param {number} userId - The ID of the user applying the late fee
   * @returns {Promise<Object>} - Applied late fee object
   */
  async calculateAndApplyLateFee(
    client,
    propertyId,
    leaseId,
    recurringPaymentId,
    fullAmount,
    amountPaid,
    dueDate,
    asOfDate,
    userId
  ) {
    try {
      // Calculate late fee
      const lateFeeData = await this.calculateLateFee({
        propertyId,
        amount: fullAmount,
        amountPaid,
        dueDate,
        asOfDate
      });
      
      // Skip if no late fee or within grace period
      if (lateFeeData.lateFeeAmount <= 0 || lateFeeData.isWithinGracePeriod || lateFeeData.isPaid) {
        return null;
      }
      
      // Get late fee configuration
      const lateFeeConfig = await this.getLateFeeConfiguration(propertyId);
      
      if (!lateFeeConfig) {
        return null;
      }
      
      // Check if late fee has already been applied for this period
      const existingLateFeeQuery = `
        SELECT COUNT(*) AS count
        FROM late_fees
        WHERE lease_id = $1
        AND recurring_payment_id = $2
        AND due_date = $3
        AND status != 'cancelled'
      `;
      
      const existingLateFeeResult = await client.query(existingLateFeeQuery, [
        leaseId,
        recurringPaymentId,
        dueDate
      ]);
      
      const existingLateFeeCount = parseInt(existingLateFeeResult.rows[0].count);
      
      // Skip if late fee already applied and not compounding
      if (existingLateFeeCount > 0 && !lateFeeConfig.is_compounding) {
        return null;
      }
      
      // Get lease details
      const leaseQuery = `
        SELECT 
          l.tenant_id,
          l.unit_id,
          u.property_id
        FROM leases l
        JOIN units u ON l.unit_id = u.id
        WHERE l.id = $1
      `;
      
      const leaseResult = await client.query(leaseQuery, [leaseId]);
      
      if (leaseResult.rows.length === 0) {
        throw new Error('Lease not found');
      }
      
      const lease = leaseResult.rows[0];
      
      // Apply late fee
      const insertLateFeeQuery = `
        INSERT INTO late_fees (
          lease_id,
          tenant_id,
          unit_id,
          property_id,
          late_fee_config_id,
          recurring_payment_id,
          amount,
          due_date,
          days_late,
          status,
          created_by,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, NOW(), NOW())
        RETURNING *
      `;
      
      const insertLateFeeValues = [
        leaseId,
        lease.tenant_id,
        lease.unit_id,
        lease.property_id,
        lateFeeConfig.id,
        recurringPaymentId,
        lateFeeData.lateFeeAmount,
        dueDate,
        lateFeeData.daysLate,
        userId
      ];
      
      const insertLateFeeResult = await client.query(insertLateFeeQuery, insertLateFeeValues);
      const lateFee = insertLateFeeResult.rows[0];
      
      return lateFee;
    } catch (error) {
      console.error('Error calculating and applying late fee:', error);
      throw new Error('Failed to calculate and apply late fee');
    }
  }

  /**
   * Get late fees for a lease
   * 
   * @param {number} leaseId - The ID of the lease
   * @param {Object} options - Optional parameters
   * @param {string} options.status - Filter by status ('pending', 'paid', 'waived', 'cancelled', 'all')
   * @param {Date} options.startDate - Start date for filtering
   * @param {Date} options.endDate - End date for filtering
   * @returns {Promise<Array>} - Array of late fee objects
   */
  async getLateFees(leaseId, options = {}) {
    try {
      const {
        status = 'all',
        startDate = null,
        endDate = null
      } = options;
      
      let query = `
        SELECT 
          lf.*,
          lfc.fee_type,
          lfc.fee_amount,
          lfc.grace_period_days,
          lfc.maximum_fee,
          lfc.is_compounding,
          CONCAT(t.first_name, ' ', t.last_name) AS tenant_name,
          u.unit_number,
          p.name AS property_name,
          CONCAT(wu.first_name, ' ', wu.last_name) AS waived_by_name,
          CONCAT(cu.first_name, ' ', cu.last_name) AS created_by_name
        FROM late_fees lf
        JOIN late_fee_configurations lfc ON lf.late_fee_config_id = lfc.id
        JOIN tenants t ON lf.tenant_id = t.id
        JOIN units u ON lf.unit_id = u.id
        JOIN properties p ON lf.property_id = p.id
        LEFT JOIN users wu ON lf.waived_by = wu.id
        LEFT JOIN users cu ON lf.created_by = cu.id
        WHERE lf.lease_id = $1
      `;
      
      const params = [leaseId];
      let paramIndex = 2;
      
      if (status !== 'all') {
        query += ` AND lf.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (startDate) {
        query += ` AND lf.due_date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        query += ` AND lf.due_date <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }
      
      query += ` ORDER BY lf.due_date DESC, lf.created_at DESC`;
      
      const { rows } = await this.pool.query(query, params);
      
      return rows;
    } catch (error) {
      console.error('Error getting late fees:', error);
      throw new Error('Failed to get late fees');
    }
  }

  /**
   * Get late fees for a property
   * 
   * @param {number} propertyId - The ID of the property
   * @param {Object} options - Optional parameters
   * @param {string} options.status - Filter by status ('pending', 'paid', 'waived', 'cancelled', 'all')
   * @param {Date} options.startDate - Start date for filtering
   * @param {Date} options.endDate - End date for filtering
   * @returns {Promise<Array>} - Array of late fee objects
   */
  async getLateFeesByProperty(propertyId, options = {}) {
    try {
      const {
        status = 'all',
        startDate = null,
        endDate = null
      } = options;
      
      let query = `
        SELECT 
          lf.*,
          lfc.fee_type,
          lfc.fee_amount,
          lfc.grace_period_days,
          lfc.maximum_fee,
          lfc.is_compounding,
          CONCAT(t.first_name, ' ', t.last_name) AS tenant_name,
          u.unit_number,
          p.name AS property_name,
          CONCAT(wu.first_name, ' ', wu.last_name) AS waived_by_name,
          CONCAT(cu.first_name, ' ', cu.last_name) AS created_by_name
        FROM late_fees lf
        JOIN late_fee_configurations lfc ON lf.late_fee_config_id = lfc.id
        JOIN tenants t ON lf.tenant_id = t.id
        JOIN units u ON lf.unit_id = u.id
        JOIN properties p ON lf.property_id = p.id
        LEFT JOIN users wu ON lf.waived_by = wu.id
        LEFT JOIN users cu ON lf.created_by = cu.id
        WHERE lf.property_id = $1
      `;
      
      const params = [propertyId];
      let paramIndex = 2;
      
      if (status !== 'all') {
        query += ` AND lf.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (startDate) {
        query += ` AND lf.due_date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        query += ` AND lf.due_date <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }
      
      query += ` ORDER BY lf.due_date DESC, lf.created_at DESC`;
      
      const { rows } = await this.pool.query(query, params);
      
      return rows;
    } catch (error) {
      console.error('Error getting late fees by property:', error);
      throw new Error('Failed to get late fees by property');
    }
  }

  /**
   * Mark late fee as paid
   * 
   * @param {number} lateFeeId - The ID of the late fee
   * @param {number} userId - The ID of the user marking the late fee as paid
   * @returns {Promise<Object>} - Updated late fee object
   */
  async markLateFeeAsPaid(lateFeeId, userId) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update late fee status
      const updateQuery = `
        UPDATE late_fees
        SET status = 'paid', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, [lateFeeId]);
      
      if (updateResult.rows.length === 0) {
        throw new Error('Late fee not found');
      }
      
      const lateFee = updateResult.rows[0];
      
      // Send notification
      await this.notificationService.sendLateFeePaymentConfirmation(
        lateFee.tenant_id,
        lateFee.amount,
        lateFee.due_date
      );
      
      await client.query('COMMIT');
      
      return lateFee;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error marking late fee as paid:', error);
      throw new Error('Failed to mark late fee as paid');
    } finally {
      client.release();
    }
  }

  /**
   * Waive late fee
   * 
   * @param {number} lateFeeId - The ID of the late fee
   * @param {string} reason - Reason for waiving the late fee
   * @param {number} userId - The ID of the user waiving the late fee
   * @returns {Promise<Object>} - Updated late fee object
   */
  async waiveLateFee(lateFeeId, reason, userId) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update late fee status
      const updateQuery = `
        UPDATE late_fees
        SET 
          status = 'waived', 
          waived_reason = $1, 
          waived_by = $2, 
          waived_at = NOW(), 
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, [reason, userId, lateFeeId]);
      
      if (updateResult.rows.length === 0) {
        throw new Error('Late fee not found');
      }
      
      const lateFee = updateResult.rows[0];
      
      // Send notification
      await this.notificationService.sendLateFeeWaivedNotification(
        lateFee.tenant_id,
        lateFee.amount,
        lateFee.due_date,
        reason
      );
      
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
   * Cancel late fee
   * 
   * @param {number} lateFeeId - The ID of the late fee
   * @param {number} userId - The ID of the user cancelling the late fee
   * @returns {Promise<Object>} - Updated late fee object
   */
  async cancelLateFee(lateFeeId, userId) {
    try {
      // Update late fee status
      const updateQuery = `
        UPDATE late_fees
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const updateResult = await this.pool.query(updateQuery, [lateFeeId]);
      
      if (updateResult.rows.length === 0) {
        throw new Error('Late fee not found');
      }
      
      return updateResult.rows[0];
    } catch (error) {
      console.error('Error cancelling late fee:', error);
      throw new Error('Failed to cancel late fee');
    }
  }

  /**
   * Generate late fee report for a property
   * 
   * @param {number} propertyId - The ID of the property
   * @param {Object} options - Optional parameters
   * @param {Date} options.startDate - Start date for the report (default: first day of current month)
   * @param {Date} options.endDate - End date for the report (default: last day of current month)
   * @returns {Promise<Object>} - Late fee report object
   */
  async generateLateFeeReport(propertyId, options = {}) {
    try {
      // Set default options
      const defaultOptions = {
        startDate: moment().startOf('month').toDate(),
        endDate: moment().endOf('month').toDate()
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
      
      // Get late fee configuration
      const lateFeeConfig = await this.getLateFeeConfiguration(propertyId);
      
      // Get late fees for the period
      const lateFees = await this.getLateFeesByProperty(propertyId, {
        startDate: opts.startDate,
        endDate: opts.endDate
      });
      
      // Calculate summary statistics
      const totalLateFees = lateFees.length;
      const pendingLateFees = lateFees.filter(fee => fee.status === 'pending').length;
      const paidLateFees = lateFees.filter(fee => fee.status === 'paid').length;
      const waivedLateFees = lateFees.filter(fee => fee.status === 'waived').length;
      const cancelledLateFees = lateFees.filter(fee => fee.status === 'cancelled').length;
      
      const totalLateFeeAmount = lateFees.reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
      const pendingLateFeeAmount = lateFees
        .filter(fee => fee.status === 'pending')
        .reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
      const paidLateFeeAmount = lateFees
        .filter(fee => fee.status === 'paid')
        .reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
      const waivedLateFeeAmount = lateFees
        .filter(fee => fee.status === 'waived')
        .reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
      
      // Group late fees by unit
      const lateFeesByUnit = {};
      
      for (const fee of lateFees) {
        if (!lateFeesByUnit[fee.unit_id]) {
          lateFeesByUnit[fee.unit_id] = {
            unitId: fee.unit_id,
            unitNumber: fee.unit_number,
            tenantName: fee.tenant_name,
            lateFees: [],
            totalAmount: 0,
            pendingAmount: 0,
            paidAmount: 0,
            waivedAmount: 0
          };
        }
        
        lateFeesByUnit[fee.unit_id].lateFees.push(fee);
        lateFeesByUnit[fee.unit_id].totalAmount += parseFloat(fee.amount);
        
        if (fee.status === 'pending') {
          lateFeesByUnit[fee.unit_id].pendingAmount += parseFloat(fee.amount);
        } else if (fee.status === 'paid') {
          lateFeesByUnit[fee.unit_id].paidAmount += parseFloat(fee.amount);
        } else if (fee.status === 'waived') {
          lateFeesByUnit[fee.unit_id].waivedAmount += parseFloat(fee.amount);
        }
      }
      
      // Construct the report
      const report = {
        property,
        reportPeriod: {
          startDate: opts.startDate,
          endDate: opts.endDate
        },
        lateFeeConfiguration: lateFeeConfig,
        summary: {
          totalLateFees,
          pendingLateFees,
          paidLateFees,
          waivedLateFees,
          cancelledLateFees,
          totalLateFeeAmount,
          pendingLateFeeAmount,
          paidLateFeeAmount,
          waivedLateFeeAmount,
          collectionRate: totalLateFeeAmount > 0 ? (paidLateFeeAmount / totalLateFeeAmount) * 100 : 0
        },
        unitSummaries: Object.values(lateFeesByUnit).sort((a, b) => a.unitNumber.localeCompare(b.unitNumber)),
        lateFees: lateFees.sort((a, b) => {
          // Sort by unit number, then by due date (newest first)
          const unitCompare = a.unit_number.localeCompare(b.unit_number);
          if (unitCompare !== 0) return unitCompare;
          return new Date(b.due_date) - new Date(a.due_date);
        })
      };
      
      return report;
    } catch (error) {
      console.error('Error generating late fee report:', error);
      throw new Error('Failed to generate late fee report');
    }
  }

  /**
   * Send late fee notification
   * 
   * @param {number} tenantId - The ID of the tenant
   * @param {number} lateFeeId - The ID of the late fee
   * @param {number} amount - The late fee amount
   * @param {Date} dueDate - The original payment due date
   * @param {number} daysLate - The number of days the payment is late
   * @returns {Promise<Object>} - Notification result
   */
  async sendLateFeeNotification(tenantId, lateFeeId, amount, dueDate, daysLate) {
    try {
      // Get tenant details
      const tenantQuery = `
        SELECT 
          t.id,
          t.first_name,
          t.last_name,
          t.email,
          t.phone,
          u.unit_number,
          p.name AS property_name
        FROM tenants t
        JOIN lease_tenants lt ON t.id = lt.tenant_id
        JOIN leases l ON lt.lease_id = l.id
        JOIN units u ON l.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE t.id = $1
        AND l.status = 'active'
        LIMIT 1
      `;
      
      const tenantResult = await this.pool.query(tenantQuery, [tenantId]);
      
      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant not found');
      }
      
      const tenant = tenantResult.rows[0];
      
      // Send notification
      const notificationResult = await this.notificationService.sendLateFeeNotification(
        tenant.id,
        tenant.email,
        tenant.phone,
        lateFeeId,
        amount,
        dueDate,
        daysLate,
        tenant.unit_number,
        tenant.property_name
      );
      
      return notificationResult;
    } catch (error) {
      console.error('Error sending late fee notification:', error);
      throw new Error('Failed to send late fee notification');
    }
  }

  /**
   * Process late fees for all properties
   * 
   * @param {number} userId - The ID of the user processing late fees
   * @returns {Promise<Object>} - Processing results
   */
  async processLateFees(userId) {
    try {
      // Get all properties
      const propertiesQuery = `
        SELECT id, name
        FROM properties
        WHERE is_active = true
      `;
      
      const propertiesResult = await this.pool.query(propertiesQuery);
      const properties = propertiesResult.rows;
      
      const results = {
        totalProperties: properties.length,
        propertiesProcessed: 0,
        totalLateFees: 0,
        totalLateFeeAmount: 0,
        propertyResults: []
      };
      
      // Process each property
      for (const property of properties) {
        try {
          // Get all overdue payments for the property
          const overduePaymentsQuery = `
            SELECT 
              rp.id AS recurring_payment_id,
              rp.lease_id,
              rp.amount,
              DATE_TRUNC('month', CURRENT_DATE) + ((rp.due_day - 1) || ' days')::interval AS due_date,
              (SELECT COALESCE(SUM(amount), 0) FROM transactions 
               WHERE recurring_payment_id = rp.id 
               AND transaction_type = 'payment'
               AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
               AND transaction_date <= CURRENT_DATE) AS amount_paid
            FROM recurring_payments rp
            JOIN leases l ON rp.lease_id = l.id
            JOIN units u ON l.unit_id = u.id
            WHERE u.property_id = $1
            AND rp.is_active = true
            AND l.status = 'active'
            AND rp.payment_type = 'rent'
            AND DATE_TRUNC('month', CURRENT_DATE) + ((rp.due_day - 1) || ' days')::interval < CURRENT_DATE
            AND (SELECT COALESCE(SUM(amount), 0) FROM transactions 
                 WHERE recurring_payment_id = rp.id 
                 AND transaction_type = 'payment'
                 AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
                 AND transaction_date <= CURRENT_DATE) < rp.amount
          `;
          
          const overduePaymentsResult = await this.pool.query(overduePaymentsQuery, [property.id]);
          const overduePayments = overduePaymentsResult.rows;
          
          const propertyResult = {
            propertyId: property.id,
            propertyName: property.name,
            overduePayments: overduePayments.length,
            lateFees: 0,
            lateFeeAmount: 0,
            errors: []
          };
          
          // Process each overdue payment
          for (const payment of overduePayments) {
            try {
              const client = await this.pool.connect();
              
              try {
                await client.query('BEGIN');
                
                // Calculate and apply late fee
                const lateFee = await this.calculateAndApplyLateFee(
                  client,
                  property.id,
                  payment.lease_id,
                  payment.recurring_payment_id,
                  payment.amount,
                  payment.amount_paid,
                  payment.due_date,
                  new Date(),
                  userId
                );
                
                if (lateFee) {
                  propertyResult.lateFees++;
                  propertyResult.lateFeeAmount += parseFloat(lateFee.amount);
                  
                  // Send notification
                  await this.sendLateFeeNotification(
                    lateFee.tenant_id,
                    lateFee.id,
                    lateFee.amount,
                    lateFee.due_date,
                    lateFee.days_late
                  );
                }
                
                await client.query('COMMIT');
              } catch (error) {
                await client.query('ROLLBACK');
                throw error;
              } finally {
                client.release();
              }
            } catch (error) {
              console.error(`Error processing late fee for payment ${payment.recurring_payment_id}:`, error);
              propertyResult.errors.push({
                recurringPaymentId: payment.recurring_payment_id,
                leaseId: payment.lease_id,
                error: error.message
              });
            }
          }
          
          results.propertiesProcessed++;
          results.totalLateFees += propertyResult.lateFees;
          results.totalLateFeeAmount += propertyResult.lateFeeAmount;
          results.propertyResults.push(propertyResult);
        } catch (error) {
          console.error(`Error processing late fees for property ${property.id}:`, error);
          results.propertyResults.push({
            propertyId: property.id,
            propertyName: property.name,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error processing late fees:', error);
      throw new Error('Failed to process late fees');
    }
  }
}

module.exports = LateFeeService;
