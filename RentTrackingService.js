/**
 * Rent Tracking Service
 * 
 * This service handles rent tracking functionality with automated late fees.
 * It provides methods for tracking due payments, recording rent payments,
 * calculating late fees, and generating rent roll reports.
 */

const database = require('../../../utils/database');
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
      
      if (lateFeeResult.rows.length > 0) {
        let remainingAmount = parseFloat(amount);
        
        // Apply payment to late fees first
        for (const lateFee of lateFeeResult.rows) {
          if (remainingAmount <= 0) break;
          
          const lateFeeAmount = parseFloat(lateFee.amount);
          const amountToApply = Math.min(lateFeeAmount, remainingAmount);
          
          if (amountToApply >= lateFeeAmount) {
            // Mark late fee as paid
            await client.query(
              'UPDATE late_fees SET is_paid = true, paid_date = $1, payment_id = $2 WHERE id = $3',
              [paymentDate, payment.id, lateFee.id]
            );
          } else {
            // Partially pay late fee
            await client.query(
              'UPDATE late_fees SET amount = amount - $1 WHERE id = $2',
              [amountToApply, lateFee.id]
            );
          }
          
          remainingAmount -= amountToApply;
        }
      }
      
      await client.query('COMMIT');
      return payment;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recording rent payment:', error);
      throw new Error('Failed to record rent payment');
    } finally {
      client.release();
    }
  }

  /**
   * Generate rent roll report
   * @param {number} propertyId - The ID of the property
   * @param {Object} options - Optional parameters
   * @param {Date} options.asOfDate - The date to generate the report for (defaults to current date)
   * @returns {Promise<Object>} - Rent roll report data
   */
  async generateRentRoll(propertyId, options = {}) {
    const { asOfDate = new Date() } = options;
    
    const query = `
      SELECT 
        p.id as property_id,
        p.name as property_name,
        p.address,
        p.city,
        p.state,
        p.zip_code,
        json_agg(json_build_object(
          'unit_id', u.id,
          'unit_number', u.unit_number,
          'unit_type', u.unit_type,
          'square_feet', u.square_feet,
          'bedrooms', u.bedrooms,
          'bathrooms', u.bathrooms,
          'lease_id', l.id,
          'lease_start', l.start_date,
          'lease_end', l.end_date,
          'rent_amount', l.rent_amount,
          'security_deposit', l.security_deposit,
          'tenant_id', t.id,
          'tenant_name', CONCAT(t.first_name, ' ', t.last_name),
          'tenant_email', t.email,
          'tenant_phone', t.phone,
          'move_in_date', l.start_date,
          'recurring_payments', (
            SELECT json_agg(json_build_object(
              'id', rp.id,
              'payment_type', rp.payment_type,
              'amount', rp.amount,
              'frequency', rp.frequency,
              'due_day', rp.due_day
            ))
            FROM recurring_payments rp
            WHERE rp.lease_id = l.id AND rp.is_active = true
          ),
          'balance', (
            SELECT COALESCE(
              (
                SELECT SUM(amount)
                FROM recurring_payments
                WHERE lease_id = l.id
                  AND is_active = true
                  AND frequency = 'monthly'
              ) - (
                SELECT COALESCE(SUM(amount), 0)
                FROM payments
                WHERE lease_id = l.id
                  AND payment_date >= date_trunc('month', $2::date)
                  AND payment_date < date_trunc('month', $2::date) + interval '1 month'
              ),
              0
            )
          )
        )) as units
      FROM 
        properties p
      LEFT JOIN 
        units u ON p.id = u.property_id
      LEFT JOIN 
        leases l ON u.id = l.unit_id AND $2 BETWEEN l.start_date AND COALESCE(l.end_date, $2 + interval '100 years')
      LEFT JOIN 
        tenants t ON l.tenant_id = t.id
      WHERE 
        p.id = $1
      GROUP BY 
        p.id, p.name, p.address, p.city, p.state, p.zip_code
    `;
    
    try {
      const result = await database.query(query, [propertyId, asOfDate]);
      
      if (result.rows.length === 0) {
        throw new Error(`Property with ID ${propertyId} not found`);
      }
      
      const rentRoll = result.rows[0];
      
      // Calculate summary statistics
      const units = rentRoll.units.filter(unit => unit.unit_id !== null);
      const occupiedUnits = units.filter(unit => unit.lease_id !== null);
      const vacantUnits = units.filter(unit => unit.lease_id === null);
      
      const totalUnits = units.length;
      const occupancyRate = totalUnits > 0 ? (occupiedUnits.length / totalUnits) * 100 : 0;
      
      const potentialRent = units.reduce((sum, unit) => {
        // Use market rent for vacant units and actual rent for occupied units
        const rentAmount = unit.lease_id ? parseFloat(unit.rent_amount) : parseFloat(unit.market_rent || 0);
        return sum + rentAmount;
      }, 0);
      
      const actualRent = occupiedUnits.reduce((sum, unit) => {
        return sum + parseFloat(unit.rent_amount || 0);
      }, 0);
      
      const totalBalance = occupiedUnits.reduce((sum, unit) => {
        return sum + parseFloat(unit.balance || 0);
      }, 0);
      
      return {
        ...rentRoll,
        summary: {
          total_units: totalUnits,
          occupied_units: occupiedUnits.length,
          vacant_units: vacantUnits.length,
          occupancy_rate: occupancyRate.toFixed(2) + '%',
          potential_rent: potentialRent,
          actual_rent: actualRent,
          rent_loss: potentialRent - actualRent,
          total_balance: totalBalance
        }
      };
    } catch (error) {
      console.error('Error generating rent roll:', error);
      throw new Error('Failed to generate rent roll report');
    }
  }

  /**
   * Check for late payments and apply late fees
   * @param {number} propertyId - The ID of the property (optional, if not provided will check all properties)
   * @param {Date} asOfDate - The date to check late payments as of (defaults to current date)
   * @returns {Promise<Array>} - Array of applied late fees
   */
  async processLateFees(propertyId = null, asOfDate = new Date()) {
    // Begin transaction
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get all active leases with recurring payments
      let leasesQuery = `
        SELECT 
          l.id as lease_id,
          l.property_id,
          l.unit_id,
          l.tenant_id,
          l.rent_amount,
          rp.id as recurring_payment_id,
          rp.payment_type,
          rp.amount,
          rp.frequency,
          r<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>