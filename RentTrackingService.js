/**
 * Rent Tracking Service
 * 
 * This service handles rent tracking functionality with automated late fees.
 * It provides methods for tracking due payments, recording rent payments,
 * calculating late fees, and generating rent roll reports.
 */

const database = require('../utils/database');
const LateFeeService = require('./LateFeeService');

class RentTrackingService {
  constructor() {
    this.lateFeeService = new LateFeeService();
  }

  /**
   * Get all due payments for a property
   * @param {number} propertyId - The ID of the property
   * @param {Object} options - Optional parameters
   * @param {Date} options.asOfDate - The date to check payments as of (defaults to current date)
   * @param {boolean} options.includeOverdue - Whether to include overdue payments (defaults to true)
   * @param {boolean} options.includeUpcoming - Whether to include upcoming payments (defaults to true)
   * @param {number} options.upcomingDays - Number of days in the future to include (defaults to 30)
   * @returns {Promise<Array>} - Array of due payments
   */
  async getDuePayments(propertyId, options = {}) {
    const {
      asOfDate = new Date(),
      includeOverdue = true,
      includeUpcoming = true,
      upcomingDays = 30
    } = options;

    // Calculate date range
    const today = new Date(asOfDate);
    const futureDate = new Date(asOfDate);
    futureDate.setDate(futureDate.getDate() + upcomingDays);

    // Build query conditions
    let conditions = ['recurring_payments.is_active = true'];
    
    if (propertyId) {
      conditions.push('leases.property_id = $1');
    }

    if (includeOverdue) {
      conditions.push(`(
        recurring_payments.due_day <= $2 
        AND recurring_payments.start_date <= $3
        AND (recurring_payments.end_date IS NULL OR recurring_payments.end_date >= $3)
      )`);
    }

    if (includeUpcoming) {
      conditions.push(`(
        recurring_payments.due_day > $2 
        AND recurring_payments.due_day <= $4
        AND recurring_payments.start_date <= $5
        AND (recurring_payments.end_date IS NULL OR recurring_payments.end_date >= $5)
      )`);
    }

    const query = `
      SELECT 
        recurring_payments.*,
        leases.property_id,
        leases.unit_id,
        leases.tenant_id,
        properties.name as property_name,
        units.unit_number,
        CONCAT(tenants.first_name, ' ', tenants.last_name) as tenant_name,
        CASE 
          WHEN recurring_payments.due_day <= $2 THEN 'overdue'
          ELSE 'upcoming'
        END as status
      FROM 
        recurring_payments
      JOIN 
        leases ON recurring_payments.lease_id = leases.id
      JOIN 
        properties ON leases.property_id = properties.id
      JOIN 
        units ON leases.unit_id = units.id
      JOIN 
        tenants ON leases.tenant_id = tenants.id
      WHERE 
        ${conditions.join(' AND ')}
      ORDER BY 
        status DESC, recurring_payments.due_day ASC
    `;

    const currentDay = today.getDate();
    const params = [
      propertyId,
      currentDay,
      today.toISOString().split('T')[0],
      futureDate.getDate(),
      futureDate.toISOString().split('T')[0]
    ];

    try {
      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting due payments:', error);
      throw new Error('Failed to retrieve due payments');
    }
  }

  /**
   * Get payment status for a lease
   * @param {number} leaseId - The ID of the lease
   * @returns {Promise<Object>} - Payment status information
   */
  async getLeasePaymentStatus(leaseId) {
    const query = `
      SELECT 
        l.id as lease_id,
        l.start_date,
        l.end_date,
        l.rent_amount,
        l.security_deposit,
        p.name as property_name,
        u.unit_number,
        CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
        (
          SELECT json_agg(json_build_object(
            'id', rp.id,
            'payment_type', rp.payment_type,
            'amount', rp.amount,
            'frequency', rp.frequency,
            'due_day', rp.due_day,
            'is_active', rp.is_active
          ))
          FROM recurring_payments rp
          WHERE rp.lease_id = l.id AND rp.is_active = true
        ) as recurring_payments,
        (
          SELECT json_agg(json_build_object(
            'id', pm.id,
            'payment_date', pm.payment_date,
            'amount', pm.amount,
            'payment_method', pm.payment_method,
            'reference_number', pm.reference_number,
            'notes', pm.notes
          ))
          FROM payments pm
          WHERE pm.lease_id = l.id
          ORDER BY pm.payment_date DESC
          LIMIT 5
        ) as recent_payments,
        (
          SELECT COALESCE(SUM(lf.amount), 0)
          FROM late_fees lf
          WHERE lf.lease_id = l.id AND lf.is_paid = false
        ) as outstanding_late_fees
      FROM 
        leases l
      JOIN 
        properties p ON l.property_id = p.id
      JOIN 
        units u ON l.unit_id = u.id
      JOIN 
        tenants t ON l.tenant_id = t.id
      WHERE 
        l.id = $1
    `;

    try {
      const result = await database.query(query, [leaseId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Lease with ID ${leaseId} not found`);
      }
      
      const leaseStatus = result.rows[0];
      
      // Calculate payment status
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Check if rent has been paid for current month
      const currentMonthPayments = leaseStatus.recent_payments
        ? leaseStatus.recent_payments.filter(payment => {
            const paymentDate = new Date(payment.payment_date);
            return paymentDate.getMonth() === currentMonth && 
                   paymentDate.getFullYear() === currentYear;
          })
        : [];
      
      const totalPaidThisMonth = currentMonthPayments.reduce(
        (sum, payment) => sum + parseFloat(payment.amount), 0
      );
      
      // Get total due this month from recurring payments
      const totalDueThisMonth = leaseStatus.recurring_payments
        ? leaseStatus.recurring_payments
            .filter(rp => rp.frequency === 'monthly')
            .reduce((sum, rp) => sum + parseFloat(rp.amount), 0)
        : 0;
      
      // Calculate balance
      const balance = totalDueThisMonth - totalPaidThisMonth;
      
      // Determine payment status
      let paymentStatus = 'current';
      if (balance > 0) {
        const currentDay = today.getDate();
        const hasDuePaymentsPastDueDay = leaseStatus.recurring_payments
          ? leaseStatus.recurring_payments.some(rp => rp.due_day < currentDay)
          : false;
        
        paymentStatus = hasDuePaymentsPastDueDay ? 'overdue' : 'pending';
      } else if (balance < 0) {
        paymentStatus = 'overpaid';
      }
      
      return {
        ...leaseStatus,
        current_month_payments: currentMonthPayments,
        total_paid_this_month: totalPaidThisMonth,
        total_due_this_month: totalDueThisMonth,
        balance,
        payment_status: paymentStatus
      };
    } catch (error) {
      console.error('Error getting lease payment status:', error);
      throw new Error('Failed to retrieve lease payment status');
    }
  }

  /**
   * Record a rent payment
   * @param {Object} paymentData - The payment data
   * @param {number} paymentData.leaseId - The ID of the lease
   * @param {number} paymentData.amount - The payment amount
   * @param {Date} paymentData.paymentDate - The payment date
   * @param {string} paymentData.paymentMethod - The payment method
   * @param {string} paymentData.referenceNumber - The reference number
   * @param {string} paymentData.notes - Additional notes
   * @returns {Promise<Object>} - The recorded payment
   */
  async recordRentPayment(paymentData) {
    const {
      leaseId,
      amount,
      paymentDate = new Date(),
      paymentMethod,
      referenceNumber,
      notes
    } = paymentData;

    // Validate required fields
    if (!leaseId || !amount || !paymentMethod) {
      throw new Error('Lease ID, amount, and payment method are required');
    }

    // Begin transaction
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Insert payment record
      const insertQuery = `
        INSERT INTO payments (
          lease_id, 
          amount, 
          payment_date, 
          payment_method, 
          reference_number, 
          notes
        ) 
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const insertParams = [
        leaseId,
        amount,
        paymentDate,
        paymentMethod,
        referenceNumber || null,
        notes || null
      ];
      
      const paymentResult = await client.query(insertQuery, insertParams);
      const payment = paymentResult.rows[0];
      
      // Check for outstanding late fees and apply payment if needed
      const lateFeeQuery = `
        SELECT id, amount
        FROM late_fees
        WHERE lease_id = $1 AND is_paid = false
        ORDER BY created_at ASC
      `;
      
      const lateFeeResult = await client.query(lateFeeQuery, [leaseId]);
      const outstandingLateFees = lateFeeResult.rows;
      
      let remainingAmount = parseFloat(amount);
      const paidLateFees = [];
      
      // Apply payment to late fees first
      for (const lateFee of outstandingLateFees) {
        if (remainingAmount <= 0) break;
        
        const lateFeeAmount = parseFloat(lateFee.amount);
        
        if (remainingAmount >= lateFeeAmount) {
          // Pay off the entire late fee
          await client.query(
            'UPDATE late_fees SET is_paid = true, paid_date = $1, payment_id = $2 WHERE id = $3',
            [paymentDate, payment.id, lateFee.id]
          );
          
          remainingAmount -= lateFeeAmount;
          paidLateFees.push({
            id: lateFee.id,
            amount: lateFeeAmount,
            fully_paid: true
          });
        } else {
          // Partially pay the late fee
          const updatedAmount = lateFeeAmount - remainingAmount;
          await client.query(
            'UPDATE late_fees SET amount = $1 WHERE id = $2',
            [updatedAmount, lateFee.id]
          );
          
          paidLateFees.push({
            id: lateFee.id,
            amount: remainingAmount,
            fully_paid: false
          });
          
          remainingAmount = 0;
          break;
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      return {
        payment,
        paid_late_fees: paidLateFees,
        remaining_amount: remainingAmount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording rent payment:', error);
      throw new Error('Failed to record rent payment');
    } finally {
      client.release();
    }
  }

  /**
   * Calculate late fees for overdue payments
   * @param {number} propertyId - The ID of the property (optional, if not provided will check all properties)
   * @param {Date} asOfDate - The date to calculate late fees as of (defaults to current date)
   * @returns {Promise<Array>} - Array of calculated late fees
   */
  async calculateLateFees(propertyId, asOfDate = new Date()) {
    // Get all active leases with recurring payments
    let leaseQuery = `
      SELECT 
        l.id as lease_id,
        l.property_id,
        rp.id as recurring_payment_id,
        rp.amount as payment_amount,
        rp.due_day,
        lfc.id as late_fee_config_id,
        lfc.fee_type,
        lfc.fee_amount,
        lfc.grace_period_days,
        lfc.maximum_fee,
        lfc.is_compounding
      FROM 
        leases l
      JOIN 
        recurring_payments rp ON l.id = rp.lease_id
      JOIN 
        late_fee_configurations lfc ON l.property_id = lfc.property_id
      WHERE 
        l.status = 'active'
        AND rp.is_active = true
        AND rp.payment_type = 'rent'
        AND rp.frequency = 'monthly'
        AND lfc.is_active = true
    `;
    
    const params = [];
    
    if (propertyId) {
      leaseQuery += ' AND l.property_id = $1';
      params.push(propertyId);
    }
    
    try {
      const leaseResult = await database.query(leaseQuery, params);
      const leases = leaseResult.rows;
      
      const calculatedLateFees = [];
      const today = new Date(asOfDate);
      const currentDay = today.getDate();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Process each lease
      for (const lease of leases) {
        // Skip if not past due day + grace period
        const effectiveDueDay = lease.due_day + lease.grace_period_days;
        if (currentDay <= effectiveDueDay) {
          continue;
        }
        
        // Check if rent has been paid for current month
        const paymentQuery = `
          SELECT COALESCE(SUM(amount), 0) as total_paid
          FROM payments
          WHERE 
            lease_id = $1
            AND EXTRACT(MONTH FROM payment_date) = $2
            AND EXTRACT(YEAR FROM payment_date) = $3
        `;
        
        const paymentResult = await database.query(paymentQuery, [
          lease.lease_id,
          currentMonth + 1, // SQL months are 1-12
          currentYear
        ]);
        
        const totalPaid = parseFloat(paymentResult.rows[0].total_paid);
        const paymentAmount = parseFloat(lease.payment_amount);
        
        // Skip if fully paid
        if (totalPaid >= paymentAmount) {
          continue;
        }
        
        // Check if late fee already exists for this month
        const existingFeeQuery = `
          SELECT id
          FROM late_fees
          WHERE 
            lease_id = $1
            AND EXTRACT(MONTH FROM created_at) = $2
            AND EXTRACT(YEAR FROM created_at) = $3
        `;
        
        const existingFeeResult = await database.query(existingFeeQuery, [
          lease.lease_id,
          currentMonth + 1,
          currentYear
        ]);
        
        // Skip if late fee already exists
        if (existingFeeResult.rows.length > 0) {
          continue;
        }
        
        // Calculate late fee
        let lateFeeAmount;
        
        if (lease.fee_type === 'percentage') {
          lateFeeAmount = (paymentAmount - totalPaid) * (lease.fee_amount / 100);
          
          // Apply maximum fee if set
          if (lease.maximum_fee && lateFeeAmount > lease.maximum_fee) {
            lateFeeAmount = lease.maximum_fee;
          }
        } else { // fixed amount
          lateFeeAmount = lease.fee_amount;
        }
        
        // Create late fee record
        const insertQuery = `
          INSERT INTO late_fees (
            lease_id,
            recurring_payment_id,
            amount,
            fee_type,
            is_paid,
            created_at
          )
          VALUES ($1, $2, $3, $4, false, $5)
          RETURNING *
        `;
        
        const insertParams = [
          lease.lease_id,
          lease.recurring_payment_id,
          lateFeeAmount,
          lease.fee_type,
          today
        ];
        
        const insertResult = await database.query(insertQuery, insertParams);
        calculatedLateFees.push(insertResult.rows[0]);
      }
      
      return calculatedLateFees;
    } catch (error) {
      console.error('Error calculating late fees:', error);
      throw new Error('Failed to calculate late fees');
    }
  }

  /**
   * Generate rent roll report for a property
   * @param {number} propertyId - The ID of the property
   * @param {Object} options - Optional parameters
   * @param {Date} options.asOfDate - The date to generate report as of (defaults to current da<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>