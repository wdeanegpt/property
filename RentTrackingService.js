/**
 * RentTrackingService.js
 * 
 * This service handles rent tracking functionality with automated late fees for the
 * Comprehensive Property Management System's Advanced Accounting Module.
 * 
 * Features:
 * - Track rent payments and due dates
 * - Calculate outstanding balances
 * - Generate rent roll reports
 * - Apply late fees based on configurable rules
 * - Send payment reminders and notifications
 * - Track payment history and trends
 */

const { Pool } = require('pg');
const moment = require('moment');
const config = require('../config/database');
const NotificationService = require('./NotificationService');
const LateFeeService = require('./LateFeeService');

class RentTrackingService {
  constructor() {
    this.pool = new Pool(config.postgres);
    this.notificationService = new NotificationService();
    this.lateFeeService = new LateFeeService();
  }

  /**
   * Get all due payments for a property
   * 
   * @param {number} propertyId - The ID of the property
   * @param {Object} options - Additional options for filtering
   * @param {Date} options.asOfDate - The date to check payments as of (defaults to current date)
   * @param {string} options.status - Filter by payment status ('due', 'paid', 'overdue', 'all')
   * @param {number} options.daysOverdue - Filter by days overdue
   * @returns {Promise<Array>} - Array of due payments
   */
  async getDuePayments(propertyId, options = {}) {
    const {
      asOfDate = new Date(),
      status = 'all',
      daysOverdue = null
    } = options;

    const formattedDate = moment(asOfDate).format('YYYY-MM-DD');
    
    let query = `
      SELECT 
        rp.id AS recurring_payment_id,
        rp.lease_id,
        l.property_id,
        rp.payment_type,
        rp.amount,
        rp.frequency,
        rp.due_day,
        t.id AS tenant_id,
        t.first_name,
        t.last_name,
        t.email,
        t.phone,
        u.unit_number,
        p.name AS property_name,
        CASE
          WHEN frequency = 'monthly' THEN 
            make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM $1::date)::int, rp.due_day)
          WHEN frequency = 'quarterly' THEN 
            make_date(EXTRACT(YEAR FROM $1::date)::int, (FLOOR((EXTRACT(MONTH FROM $1::date) - 1) / 3) * 3 + 1)::int, rp.due_day)
          WHEN frequency = 'annual' THEN 
            make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM rp.start_date)::int, rp.due_day)
        END AS due_date,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions 
         WHERE recurring_payment_id = rp.id 
         AND transaction_date <= $1::date
         AND transaction_type = 'payment') AS amount_paid,
        (rp.amount - (SELECT COALESCE(SUM(amount), 0) FROM transactions 
                      WHERE recurring_payment_id = rp.id 
                      AND transaction_date <= $1::date
                      AND transaction_type = 'payment')) AS balance_due,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions 
         WHERE recurring_payment_id = rp.id 
         AND transaction_type = 'late_fee'
         AND transaction_date <= $1::date) AS late_fees,
        CASE
          WHEN (SELECT COALESCE(SUM(amount), 0) FROM transactions 
                WHERE recurring_payment_id = rp.id 
                AND transaction_date <= $1::date
                AND transaction_type = 'payment') >= rp.amount THEN 'paid'
          WHEN CASE
                 WHEN frequency = 'monthly' THEN 
                   make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM $1::date)::int, rp.due_day)
                 WHEN frequency = 'quarterly' THEN 
                   make_date(EXTRACT(YEAR FROM $1::date)::int, (FLOOR((EXTRACT(MONTH FROM $1::date) - 1) / 3) * 3 + 1)::int, rp.due_day)
                 WHEN frequency = 'annual' THEN 
                   make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM rp.start_date)::int, rp.due_day)
               END > $1::date THEN 'upcoming'
          ELSE 'overdue'
        END AS payment_status,
        CASE
          WHEN CASE
                 WHEN frequency = 'monthly' THEN 
                   make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM $1::date)::int, rp.due_day)
                 WHEN frequency = 'quarterly' THEN 
                   make_date(EXTRACT(YEAR FROM $1::date)::int, (FLOOR((EXTRACT(MONTH FROM $1::date) - 1) / 3) * 3 + 1)::int, rp.due_day)
                 WHEN frequency = 'annual' THEN 
                   make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM rp.start_date)::int, rp.due_day)
               END <= $1::date THEN 
               $1::date - CASE
                            WHEN frequency = 'monthly' THEN 
                              make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM $1::date)::int, rp.due_day)
                            WHEN frequency = 'quarterly' THEN 
                              make_date(EXTRACT(YEAR FROM $1::date)::int, (FLOOR((EXTRACT(MONTH FROM $1::date) - 1) / 3) * 3 + 1)::int, rp.due_day)
                            WHEN frequency = 'annual' THEN 
                              make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM rp.start_date)::int, rp.due_day)
                          END
          ELSE 0
        END AS days_overdue
      FROM 
        recurring_payments rp
      JOIN 
        leases l ON rp.lease_id = l.id
      JOIN 
        lease_tenants lt ON l.id = lt.lease_id
      JOIN 
        tenants t ON lt.tenant_id = t.id
      JOIN 
        units u ON l.unit_id = u.id
      JOIN 
        properties p ON l.property_id = p.id
      WHERE 
        l.property_id = $2
        AND rp.is_active = true
        AND l.status = 'active'
        AND rp.start_date <= $1::date
        AND (rp.end_date IS NULL OR rp.end_date >= $1::date)
    `;

    // Add status filter if specified
    if (status !== 'all') {
      if (status === 'due') {
        query += `
          AND (SELECT COALESCE(SUM(amount), 0) FROM transactions 
               WHERE recurring_payment_id = rp.id 
               AND transaction_date <= $1::date
               AND transaction_type = 'payment') < rp.amount
          AND CASE
                WHEN frequency = 'monthly' THEN 
                  make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM $1::date)::int, rp.due_day)
                WHEN frequency = 'quarterly' THEN 
                  make_date(EXTRACT(YEAR FROM $1::date)::int, (FLOOR((EXTRACT(MONTH FROM $1::date) - 1) / 3) * 3 + 1)::int, rp.due_day)
                WHEN frequency = 'annual' THEN 
                  make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM rp.start_date)::int, rp.due_day)
              END <= $1::date
        `;
      } else if (status === 'paid') {
        query += `
          AND (SELECT COALESCE(SUM(amount), 0) FROM transactions 
               WHERE recurring_payment_id = rp.id 
               AND transaction_date <= $1::date
               AND transaction_type = 'payment') >= rp.amount
        `;
      } else if (status === 'overdue') {
        query += `
          AND (SELECT COALESCE(SUM(amount), 0) FROM transactions 
               WHERE recurring_payment_id = rp.id 
               AND transaction_date <= $1::date
               AND transaction_type = 'payment') < rp.amount
          AND CASE
                WHEN frequency = 'monthly' THEN 
                  make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM $1::date)::int, rp.due_day)
                WHEN frequency = 'quarterly' THEN 
                  make_date(EXTRACT(YEAR FROM $1::date)::int, (FLOOR((EXTRACT(MONTH FROM $1::date) - 1) / 3) * 3 + 1)::int, rp.due_day)
                WHEN frequency = 'annual' THEN 
                  make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM rp.start_date)::int, rp.due_day)
              END < $1::date
        `;
      }
    }

    // Add days overdue filter if specified
    if (daysOverdue !== null) {
      query += `
        AND CASE
              WHEN CASE
                     WHEN frequency = 'monthly' THEN 
                       make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM $1::date)::int, rp.due_day)
                     WHEN frequency = 'quarterly' THEN 
                       make_date(EXTRACT(YEAR FROM $1::date)::int, (FLOOR((EXTRACT(MONTH FROM $1::date) - 1) / 3) * 3 + 1)::int, rp.due_day)
                     WHEN frequency = 'annual' THEN 
                       make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM rp.start_date)::int, rp.due_day)
                   END <= $1::date THEN 
                   $1::date - CASE
                                WHEN frequency = 'monthly' THEN 
                                  make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM $1::date)::int, rp.due_day)
                                WHEN frequency = 'quarterly' THEN 
                                  make_date(EXTRACT(YEAR FROM $1::date)::int, (FLOOR((EXTRACT(MONTH FROM $1::date) - 1) / 3) * 3 + 1)::int, rp.due_day)
                                WHEN frequency = 'annual' THEN 
                                  make_date(EXTRACT(YEAR FROM $1::date)::int, EXTRACT(MONTH FROM rp.start_date)::int, rp.due_day)
                              END
              ELSE 0
            END >= $3
      `;
    }

    query += ` ORDER BY days_overdue DESC, due_date ASC`;

    const params = [formattedDate, propertyId];
    if (daysOverdue !== null) {
      params.push(daysOverdue);
    }

    try {
      const { rows } = await this.pool.query(query, params);
      return rows;
    } catch (error) {
      console.error('Error getting due payments:', error);
      throw new Error('Failed to get due payments');
    }
  }

  /**
   * Get payment status for a specific lease
   * 
   * @param {number} leaseId - The ID of the lease
   * @returns {Promise<Object>} - Payment status information
   */
  async getLeasePaymentStatus(leaseId) {
    const query = `
      SELECT 
        l.id AS lease_id,
        l.property_id,
        l.unit_id,
        l.start_date,
        l.end_date,
        l.status,
        u.unit_number,
        p.name AS property_name,
        t.id AS tenant_id,
        t.first_name,
        t.last_name,
        t.email,
        t.phone,
        (SELECT COALESCE(SUM(amount), 0) FROM recurring_payments WHERE lease_id = l.id AND is_active = true) AS total_recurring_amount,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions 
         WHERE lease_id = l.id 
         AND transaction_type = 'payment'
         AND transaction_date >= date_trunc('month', CURRENT_DATE)) AS current_month_payments,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions 
         WHERE lease_id = l.id 
         AND transaction_type = 'late_fee'
         AND transaction_date >= date_trunc('month', CURRENT_DATE)) AS current_month_late_fees,
        (SELECT COALESCE(SUM(rp.amount), 0) FROM recurring_payments rp
         WHERE rp.lease_id = l.id 
         AND rp.is_active = true
         AND rp.frequency = 'monthly') - 
        (SELECT COALESCE(SUM(amount), 0) FROM transactions 
         WHERE lease_id = l.id 
         AND transaction_type = 'payment'
         AND transaction_date >= date_trunc('month', CURRENT_DATE)) AS current_month_balance,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions 
         WHERE lease_id = l.id 
         AND transaction_type = 'payment') AS total_payments,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions 
         WHERE lease_id = l.id 
         AND transaction_type = 'late_fee') AS total_late_fees,
        (SELECT COUNT(*) FROM transactions 
         WHERE lease_id = l.id 
         AND transaction_type = 'payment'
         AND transaction_date > due_date) AS late_payment_count,
        CASE
          WHEN (SELECT COALESCE(SUM(rp.amount), 0) FROM recurring_payments rp
                WHERE rp.lease_id = l.id 
                AND rp.is_active = true
                AND rp.frequency = 'monthly') <= 
               (SELECT COALESCE(SUM(amount), 0) FROM transactions 
                WHERE lease_id = l.id 
                AND transaction_type = 'payment'
                AND transaction_date >= date_trunc('month', CURRENT_DATE)) THEN 'paid'
          WHEN (SELECT MAX(CASE
                             WHEN rp.frequency = 'monthly' THEN 
                               make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, rp.due_day)
                             WHEN rp.frequency = 'quarterly' THEN 
                               make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, (FLOOR((EXTRACT(MONTH FROM CURRENT_DATE) - 1) / 3) * 3 + 1)::int, rp.due_day)
                             WHEN rp.frequency = 'annual' THEN 
                               make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM rp.start_date)::int, rp.due_day)
                           END)
                FROM recurring_payments rp
                WHERE rp.lease_id = l.id 
                AND rp.is_active = true) > CURRENT_DATE THEN 'upcoming'
          ELSE 'overdue'
        END AS payment_status
      FROM 
        leases l
      JOIN 
        units u ON l.unit_id = u.id
      JOIN 
        properties p ON l.property_id = p.id
      JOIN 
        lease_tenants lt ON l.id = lt.lease_id
      JOIN 
        tenants t ON lt.tenant_id = t.id
      WHERE 
        l.id = $1
        AND lt.is_primary = true
    `;

    try {
      const { rows } = await this.pool.query(query, [leaseId]);
      if (rows.length === 0) {
        throw new Error('Lease not found');
      }
      return rows[0];
    } catch (error) {
      console.error('Error getting lease payment status:', error);
      throw new Error('Failed to get lease payment status');
    }
  }

  /**
   * Record a rent payment
   * 
   * @param {Object} paymentData - Payment data
   * @param {number} paymentData.leaseId - The ID of the lease
   * @param {number} paymentData.recurringPaymentId - The ID of the recurring payment
   * @param {number} paymentData.amount - The payment amount
   * @param {string} paymentData.paymentMethod - The payment method
   * @param {string} paymentData.referenceNumber - The payment reference number
   * @param {Date} paymentData.transactionDate - The transaction date
   * @param {string} paymentData.notes - Additional notes
   * @param {number} paymentData.userId - The ID of the user recording the payment
   * @returns {Promise<Object>} - The recorded payment
   */
  async recordRentPayment(paymentData) {
    const {
      leaseId,
      recurringPaymentId,
      amount,
      paymentMethod,
      referenceNumber,
      transactionDate = new Date(),
      notes,
      userId
    } = paymentData;

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get the recurring payment details
      const recurringPaymentQuery = `
        SELECT * FROM recurring_payments WHERE id = $1
      `;
      const recurringPaymentResult = await client.query(recurringPaymentQuery, [recurringPaymentId]);
      
      if (recurringPaymentResult.rows.length === 0) {
        throw new Error('Recurring payment not found');
      }
      
      const recurringPayment = recurringPaymentResult.rows[0];
      
      // Calculate the due date
      let dueDate;
      const transactionDateObj = moment(transactionDate);
      
      if (recurringPayment.frequency === 'monthly') {
        dueDate = moment(transactionDateObj).date(recurringPayment.due_day);
        if (dueDate.isAfter(transactionDateObj)) {
          dueDate.subtract(1, 'month');
        }
      } else if (recurringPayment.frequency === 'quarterly') {
        const quarterStartMonth = Math.floor((transactionDateObj.month()) / 3) * 3;
        dueDate = moment(transactionDateObj).month(quarterStartMonth).date(recurringPayment.due_day);
        if (dueDate.isAfter(transactionDateObj)) {
          dueDate.subtract(3, 'month');
       <response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>