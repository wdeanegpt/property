/**
 * accountingRoutes.js
 * 
 * This file defines the API endpoints for the Advanced Accounting Module.
 * It exposes the functionality of all accounting services through a RESTful API.
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const AccountingModule = require('../services');
const authMiddleware = require('../middleware/auth');

// Initialize accounting module
const accountingModule = new AccountingModule();

/**
 * Middleware to validate request
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
};

/**
 * @route   GET /api/accounting/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', module: 'Advanced Accounting Module' });
});

/*
 * Rent Tracking Endpoints
 */

/**
 * @route   GET /api/accounting/payments/due
 * @desc    Get due payments for a property
 * @access  Private
 */
router.get('/payments/due', [
  authMiddleware,
  query('propertyId').isInt().withMessage('Property ID must be an integer'),
  query('startDate').optional().isDate().withMessage('Start date must be a valid date'),
  query('endDate').optional().isDate().withMessage('End date must be a valid date'),
  query('status').optional().isIn(['all', 'pending', 'partial', 'paid', 'waived']).withMessage('Invalid status'),
  validate
], async (req, res, next) => {
  try {
    const { propertyId, startDate, endDate, status } = req.query;
    
    const rentTrackingService = accountingModule.getRentTrackingService();
    const payments = await rentTrackingService.getDuePayments(propertyId, {
      startDate,
      endDate,
      status
    });
    
    res.json(payments);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/accounting/payments/record
 * @desc    Record a payment
 * @access  Private
 */
router.post('/payments/record', [
  authMiddleware,
  body('paymentId').isInt().withMessage('Payment ID must be an integer'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('paymentDate').isDate().withMessage('Payment date must be a valid date'),
  body('paymentMethod').isString().withMessage('Payment method is required'),
  body('referenceNumber').optional().isString(),
  body('notes').optional().isString(),
  validate
], async (req, res, next) => {
  try {
    const { paymentId, amount, paymentDate, paymentMethod, referenceNumber, notes } = req.body;
    
    const rentTrackingService = accountingModule.getRentTrackingService();
    const result = await rentTrackingService.recordPayment({
      paymentId,
      amount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      notes,
      userId: req.user.id
    });
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/accounting/payments/status/:leaseId
 * @desc    Get payment status for a lease
 * @access  Private
 */
router.get('/payments/status/:leaseId', [
  authMiddleware,
  param('leaseId').isInt().withMessage('Lease ID must be an integer'),
  validate
], async (req, res, next) => {
  try {
    const { leaseId } = req.params;
    
    const rentTrackingService = accountingModule.getRentTrackingService();
    const status = await rentTrackingService.getPaymentStatus(leaseId);
    
    res.json(status);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/accounting/reports/rent-roll
 * @desc    Generate rent roll report
 * @access  Private
 */
router.get('/reports/rent-roll', [
  authMiddleware,
  query('propertyId').isInt().withMessage('Property ID must be an integer'),
  query('startDate').optional().isDate().withMessage('Start date must be a valid date'),
  query('endDate').optional().isDate().withMessage('End date must be a valid date'),
  query('format').optional().isIn(['json', 'csv', 'pdf']).withMessage('Invalid format'),
  validate
], async (req, res, next) => {
  try {
    const { propertyId, startDate, endDate, format = 'json' } = req.query;
    
    const rentTrackingService = accountingModule.getRentTrackingService();
    const report = await rentTrackingService.generateRentRollReport(propertyId, {
      startDate,
      endDate,
      format
    });
    
    if (format === 'json') {
      res.json(report);
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${report.filename}`);
      res.send(report.content);
    } else if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${report.filename}`);
      res.send(report.content);
    }
  } catch (err) {
    next(err);
  }
});

/*
 * Late Fee Endpoints
 */

/**
 * @route   GET /api/accounting/late-fees/configurations
 * @desc    Get late fee configurations for a property
 * @access  Private
 */
router.get('/late-fees/configurations', [
  authMiddleware,
  query('propertyId').isInt().withMessage('Property ID must be an integer'),
  validate
], async (req, res, next) => {
  try {
    const { propertyId } = req.query;
    
    const lateFeeService = accountingModule.getLateFeeService();
    const configurations = await lateFeeService.getLateFeeConfigurations(propertyId);
    
    res.json(configurations);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/accounting/late-fees/configurations
 * @desc    Create a late fee configuration
 * @access  Private
 */
router.post('/late-fees/configurations', [
  authMiddleware,
  body('propertyId').isInt().withMessage('Property ID must be an integer'),
  body('gracePeriod').isInt({ min: 0 }).withMessage('Grace period must be a non-negative integer'),
  body('feeType').isIn(['percentage', 'fixed']).withMessage('Fee type must be percentage or fixed'),
  body('feeAmount').isFloat({ min: 0 }).withMessage('Fee amount must be a non-negative number'),
  body('maxFeeAmount').optional().isFloat({ min: 0 }).withMessage('Max fee amount must be a non-negative number'),
  body('isCompounding').isBoolean().withMessage('isCompounding must be a boolean'),
  body('isActive').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const {
      propertyId,
      gracePeriod,
      feeType,
      feeAmount,
      maxFeeAmount,
      isCompounding,
      isActive = true
    } = req.body;
    
    const lateFeeService = accountingModule.getLateFeeService();
    const configuration = await lateFeeService.createLateFeeConfiguration({
      propertyId,
      gracePeriod,
      feeType,
      feeAmount,
      maxFeeAmount,
      isCompounding,
      isActive,
      userId: req.user.id
    });
    
    res.status(201).json(configuration);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/accounting/late-fees/apply
 * @desc    Apply a late fee to a payment
 * @access  Private
 */
router.post('/late-fees/apply', [
  authMiddleware,
  body('paymentId').isInt().withMessage('Payment ID must be an integer'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a non-negative number'),
  body('percentage').optional().isFloat({ min: 0 }).withMessage('Percentage must be a non-negative number'),
  body('notes').optional().isString(),
  validate
], async (req, res, next) => {
  try {
    const { paymentId, amount, percentage, notes } = req.body;
    
    const lateFeeService = accountingModule.getLateFeeService();
    const result = await lateFeeService.applyLateFee({
      paymentId,
      amount,
      percentage,
      notes,
      userId: req.user.id
    });
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/accounting/late-fees/waive
 * @desc    Waive a late fee
 * @access  Private
 */
router.post('/late-fees/waive', [
  authMiddleware,
  body('lateFeeId').isInt().withMessage('Late fee ID must be an integer'),
  body('reason').isString().withMessage('Reason is required'),
  validate
], async (req, res, next) => {
  try {
    const { lateFeeId, reason } = req.body;
    
    const lateFeeService = accountingModule.getLateFeeService();
    const result = await lateFeeService.waiveLateFee(lateFeeId, reason, req.user.id);
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/*
 * Trust Account Endpoints
 */

/**
 * @route   GET /api/accounting/trust-accounts
 * @desc    Get trust accounts for a property
 * @access  Private
 */
router.get('/trust-accounts', [
  authMiddleware,
  query('propertyId').isInt().withMessage('Property ID must be an integer'),
  query('includeInactive').optional().isBoolean().toBoolean(),
  query('accountType').optional().isIn(['security_deposit', 'escrow', 'reserve']).withMessage('Invalid account type'),
  validate
], async (req, res, next) => {
  try {
    const { propertyId, includeInactive, accountType } = req.query;
    
    const trustAccountService = accountingModule.getTrustAccountService();
    const accounts = await trustAccountService.getTrustAccounts(propertyId, {
      includeInactive,
      accountType
    });
    
    res.json(accounts);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/accounting/trust-accounts
 * @desc    Create a trust account
 * @access  Private
 */
router.post('/trust-accounts', [
  authMiddleware,
  body('propertyId').isInt().withMessage('Property ID must be an integer'),
  body('accountName').isString().withMessage('Account name is required'),
  body('accountNumber').optional().isString(),
  body('bankName').optional().isString(),
  body('routingNumber').optional().isString(),
  body('accountType').isIn(['security_deposit', 'escrow', 'reserve']).withMessage('Invalid account type'),
  body('isInterestBearing').isBoolean().withMessage('isInterestBearing must be a boolean'),
  body('interestRate').optional().isFloat({ min: 0 }).withMessage('Interest rate must be a non-negative number'),
  validate
], async (req, res, next) => {
  try {
    const {
      propertyId,
      accountName,
      accountNumber,
      bankName,
      routingNumber,
      accountType,
      isInterestBearing,
      interestRate
    } = req.body;
    
    const trustAccountService = accountingModule.getTrustAccountService();
    const account = await trustAccountService.createTrustAccount({
      propertyId,
      accountName,
      accountNumber,
      bankName,
      routingNumber,
      accountType,
      isInterestBearing,
      interestRate,
      userId: req.user.id
    });
    
    res.status(201).json(account);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/accounting/trust-accounts/:accountId/transactions
 * @desc    Get transactions for a trust account
 * @access  Private
 */
router.get('/trust-accounts/:accountId/transactions', [
  authMiddleware,
  param('accountId').isInt().withMessage('Account ID must be an integer'),
  query('startDate').optional().isDate().withMessage('Start date must be a valid date'),
  query('endDate').optional().isDate().withMessage('End date must be a valid date'),
  query('transactionType').optional().isIn(['deposit', 'withdrawal', 'interest', 'fee']).withMessage('Invalid transaction type'),
  query('includeReconciled').optional().isBoolean().toBoolean(),
  validate
], async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate, transactionType, includeReconciled } = req.query;
    
    const trustAccountService = accountingModule.getTrustAccountService();
    const transactions = await trustAccountService.getTransactions(accountId, {
      startDate,
      endDate,
      transactionType,
      includeReconciled
    });
    
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/accounting/trust-accounts/:accountId/deposit
 * @desc    Record a deposit to a trust account
 * @access  Private
 */
router.post('/trust-accounts/:accountId/deposit', [
  authMiddleware,
  param('accountId').isInt().withMessage('Account ID must be an integer'),
  body('leaseId').optional().isInt(),
  body('tenantId').optional().isInt(),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('transactionDate').optional().isDate().withMessage('Transaction date must be a valid date'),
  body('description').isString().withMessage('Description is required'),
  body('referenceNumber').optional().isString(),
  body('paymentMethod').optional().isString(),
  validate
], async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const {
      leaseId,
      tenantId,
      amount,
      transactionDate,
      description,
      referenceNumber,
      paymentMethod
    } = req.body;
    
    const trustAccountService = accountingModule.getTrustAccountService();
    const transaction = await trustAccountService.recordDeposit({
      trustAccountId: accountId,
      leaseId,
      tenantId,
      amount,
      transactionDate,
      description,
      referenceNumber,
      paymentMethod,
      userId: req.user.id
    });
    
    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/accounting/trust-accounts/:accountId/withdrawal
 * @desc    Record a withdrawal from a trust account
 * @access  Private
 */
router.post('/trust-accounts/:accountId/withdrawal', [
  authMiddleware,
  param('accountId').isInt().withMessage('Account ID must be an integer'),
  body('leaseId').optional().isInt(),
  body('tenantId').optional().isInt(),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('transactionDate').optional().isDate().withMessage('Transaction date must be a valid date'),
  body('description').isString().withMessage('Description is required'),
  body('referenceNumber').optional().isString(),
  body('paymentMethod').optional().isString(),
  validate
], async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const {
      leaseId,
      tenantId,
      amount,
      transactionDate,
      description,
      referenceNumber,
      paymentMethod
    } = req.body;
    
    const trustAccountService = accountingModule.getTrustAccountService();
    const transaction = await trustAccountService.recordWithdrawal({
      trustAccountId: accountId,
      leaseId,
      tenantId,
      amount,
      transactionDate,
      description,
      referenceNumber,
      paymentMethod,
      userId: req.user.id
    });
    
    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/accounting/trust-accounts/:accountId/statement
 * @desc    Generate trust account statement
 * @access  Private
 */
router.get('/trust-accounts/:accountId/statement', [
  authMiddleware,
  param('accountId').isInt().withMessage('Account ID must be an integer'),
  query('startDate').optional().isDate().withMessage('Start date must be a valid date'),
  query('endDate').optional().isDate().withMessage('End date must be a valid date'),
  query('format').optional().isIn(['json', 'csv', 'pdf']).withMessage('Invalid format'),
  validate
], async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate, format = 'json' } = req.query;
    
    const trustAccountService = accountingModule.getTrustAccountService();
    const statement = await trustAccountService.generateStatement(accountId, {
      startDate,
      endDate,
      format
    });
    
    if (format === 'json') {
      res.json(statement);
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>