/**
 * index.js - Service Integration Module
 * 
 * This file integrates all the services for the Advanced Accounting Module
 * and exports them as a unified module for use throughout the application.
 * 
 * Part of the Advanced Accounting Module (Step 023) for the
 * Comprehensive Property Management System.
 */

// Import all services
const RentTrackingService = require('./RentTrackingService');
const LateFeeService = require('./LateFeeService');
const TrustAccountService = require('./TrustAccountService');
const ExpenseManagementService = require('./ExpenseManagementService');
const NotificationService = require('./NotificationService');

/**
 * AccountingModule class that integrates all accounting services
 * and provides a unified interface for the Advanced Accounting Module.
 */
class AccountingModule {
  constructor() {
    this.rentTrackingService = new RentTrackingService();
    this.lateFeeService = new LateFeeService();
    this.trustAccountService = new TrustAccountService();
    this.expenseManagementService = new ExpenseManagementService();
    this.notificationService = new NotificationService();
  }

  /**
   * Initialize the Accounting Module
   * 
   * @param {Object} options - Initialization options
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initialize(options = {}) {
    try {
      console.log('Initializing Advanced Accounting Module...');
      
      // Initialize services if they have initialization methods
      // This is a placeholder for any future initialization needs
      
      console.log('Advanced Accounting Module initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Advanced Accounting Module:', error);
      throw new Error(`Failed to initialize Advanced Accounting Module: ${error.message}`);
    }
  }

  /**
   * Get the Rent Tracking Service
   * 
   * @returns {RentTrackingService} - The Rent Tracking Service instance
   */
  getRentTrackingService() {
    return this.rentTrackingService;
  }

  /**
   * Get the Late Fee Service
   * 
   * @returns {LateFeeService} - The Late Fee Service instance
   */
  getLateFeeService() {
    return this.lateFeeService;
  }

  /**
   * Get the Trust Account Service
   * 
   * @returns {TrustAccountService} - The Trust Account Service instance
   */
  getTrustAccountService() {
    return this.trustAccountService;
  }

  /**
   * Get the Expense Management Service
   * 
   * @returns {ExpenseManagementService} - The Expense Management Service instance
   */
  getExpenseManagementService() {
    return this.expenseManagementService;
  }

  /**
   * Get the Notification Service
   * 
   * @returns {NotificationService} - The Notification Service instance
   */
  getNotificationService() {
    return this.notificationService;
  }

  /**
   * Process all recurring transactions
   * 
   * This method processes all recurring transactions across different services:
   * - Recurring rent payments
   * - Recurring expenses
   * - Trust account interest calculations
   * 
   * @param {Date} asOfDate - The date to process transactions as of
   * @param {number} userId - The ID of the user processing the transactions
   * @returns {Promise<Object>} - Processing results from all services
   */
  async processRecurringTransactions(asOfDate = new Date(), userId) {
    try {
      console.log('Processing recurring transactions...');
      
      // Process recurring rent payments
      const rentResults = await this.rentTrackingService.processRecurringPayments(asOfDate, userId);
      
      // Process recurring expenses
      const expenseResults = await this.expenseManagementService.processRecurringExpenses(asOfDate, userId);
      
      // Calculate and apply trust account interest
      const interestResults = await this.trustAccountService.calculateAndApplyInterest(asOfDate, userId);
      
      return {
        rentResults,
        expenseResults,
        interestResults,
        processedAt: new Date(),
        success: true
      };
    } catch (error) {
      console.error('Error processing recurring transactions:', error);
      throw new Error(`Failed to process recurring transactions: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive financial reports
   * 
   * This method generates reports from multiple services and combines them
   * into a comprehensive financial report package.
   * 
   * @param {number} propertyId - The ID of the property
   * @param {Object} options - Report options
   * @param {Date} options.startDate - Start date for the report period
   * @param {Date} options.endDate - End date for the report period
   * @param {string} options.format - Report format ('json', 'csv', 'pdf')
   * @returns {Promise<Object>} - The generated reports
   */
  async generateFinancialReports(propertyId, options = {}) {
    try {
      console.log('Generating financial reports...');
      
      const defaultOptions = {
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
        endDate: new Date(),
        format: 'json'
      };
      
      const reportOptions = { ...defaultOptions, ...options };
      
      // Generate rent roll report
      const rentRollReport = await this.rentTrackingService.generateRentRollReport(
        propertyId,
        reportOptions
      );
      
      // Generate expense report
      const expenseReport = await this.expenseManagementService.generateExpenseReport({
        propertyId,
        startDate: reportOptions.startDate,
        endDate: reportOptions.endDate,
        groupBy: 'category',
        reportType: 'detailed',
        format: reportOptions.format
      });
      
      // Generate trust account statement
      const trustAccounts = await this.trustAccountService.getTrustAccounts(propertyId);
      const trustAccountReports = [];
      
      for (const account of trustAccounts) {
        const statement = await this.trustAccountService.generateStatement(
          account.id,
          {
            startDate: reportOptions.startDate,
            endDate: reportOptions.endDate,
            format: reportOptions.format
          }
        );
        
        trustAccountReports.push(statement);
      }
      
      // Generate trust account audit report
      const trustAuditReport = await this.trustAccountService.generateAuditReport(
        propertyId,
        {
          startDate: reportOptions.startDate,
          endDate: reportOptions.endDate
        }
      );
      
      return {
        rentRollReport,
        expenseReport,
        trustAccountReports,
        trustAuditReport,
        generatedAt: new Date(),
        reportPeriod: {
          startDate: reportOptions.startDate,
          endDate: reportOptions.endDate
        }
      };
    } catch (error) {
      console.error('Error generating financial reports:', error);
      throw new Error(`Failed to generate financial reports: ${error.message}`);
    }
  }

  /**
   * Get financial dashboard data
   * 
   * This method aggregates data from multiple services to provide
   * a comprehensive financial dashboard overview.
   * 
   * @param {number} propertyId - The ID of the property
   * @param {Object} options - Dashboard options
   * @param {Date} options.startDate - Start date for the dashboard period
   * @param {Date} options.endDate - End date for the dashboard period
   * @returns {Promise<Object>} - The dashboard data
   */
  async getFinancialDashboardData(propertyId, options = {}) {
    try {
      console.log('Getting financial dashboard data...');
      
      const defaultOptions = {
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
        endDate: new Date()
      };
      
      const dashboardOptions = { ...defaultOptions, ...options };
      
      // Get rent payment statistics
      const rentStats = await this.rentTrackingService.getPaymentStatistics(
        propertyId,
        dashboardOptions
      );
      
      // Get expense statistics
      const expenseStats = await this.expenseManagementService.getExpenseStatistics({
        propertyId,
        startDate: dashboardOptions.startDate,
        endDate: dashboardOptions.endDate,
        period: 'month'
      });
      
      // Get trust account balances
      const trustAccounts = await this.trustAccountService.getTrustAccounts(propertyId);
      const trustBalances = trustAccounts.map(account => ({
        id: account.id,
        name: account.account_name,
        type: account.account_type,
        balance: parseFloat(account.balance)
      }));
      
      // Calculate cash flow
      const totalIncome = rentStats.summary.totalPaid;
      const totalExpenses = expenseStats.summary.totalAmount;
      const netCashFlow = totalIncome - totalExpenses;
      
      return {
        rentStats,
        expenseStats,
        trustBalances,
        cashFlow: {
          totalIncome,
          totalExpenses,
          netCashFlow,
          cashFlowRatio: totalIncome > 0 ? totalExpenses / totalIncome : 0
        },
        generatedAt: new Date(),
        period: {
          startDate: dashboardOptions.startDate,
          endDate: dashboardOptions.endDate
        }
      };
    } catch (error) {
      console.error('Error getting financial dashboard data:', error);
      throw new Error(`Failed to get financial dashboard data: ${error.message}`);
    }
  }
}

// Export the AccountingModule class
module.exports = AccountingModule;

// Also export individual services for direct access if needed
module.exports.RentTrackingService = RentTrackingService;
module.exports.LateFeeService = LateFeeService;
module.exports.TrustAccountService = TrustAccountService;
module.exports.ExpenseManagementService = ExpenseManagementService;
module.exports.NotificationService = NotificationService;
