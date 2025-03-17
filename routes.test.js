/**
 * routes.test.js
 * 
 * Integration tests for the Advanced Accounting Module API endpoints
 */

const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const express = require('express');
const bodyParser = require('body-parser');
const AccountingModule = require('../src/services');
const accountingRoutes = require('../src/routes/accountingRoutes');

describe('Advanced Accounting Module - API Integration Tests', () => {
  let app;
  let accountingModule;
  
  // Mock authentication middleware
  const authMiddlewareMock = (req, res, next) => {
    req.user = { id: 1, name: 'Test User' };
    next();
  };
  
  before(() => {
    // Create Express app for testing
    app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    
    // Mock the auth middleware
    app.use((req, res, next) => {
      req.user = { id: 1, name: 'Test User' };
      next();
    });
    
    // Apply routes
    app.use('/api/accounting', accountingRoutes);
  });
  
  beforeEach(() => {
    // Create a new instance of AccountingModule for each test
    accountingModule = new AccountingModule();
    
    // Stub the AccountingModule constructor to return our instance
    sinon.stub(AccountingModule.prototype, 'constructor').returns(accountingModule);
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/accounting/health')
        .expect(200);
      
      expect(response.body.status).to.equal('ok');
      expect(response.body.module).to.equal('Advanced Accounting Module');
    });
  });
  
  describe('Rent Tracking Endpoints', () => {
    it('should get due payments', async () => {
      // Stub the service method
      const rentTrackingService = accountingModule.getRentTrackingService();
      const getDuePaymentsStub = sinon.stub(rentTrackingService, 'getDuePayments').resolves({
        payments: [
          { id: 1, tenant_name: 'John Doe', amount: 1000, due_date: '2025-04-01', status: 'pending' },
          { id: 2, tenant_name: 'Jane Smith', amount: 1200, due_date: '2025-04-01', status: 'paid' }
        ],
        total: 2
      });
      
      const response = await request(app)
        .get('/api/accounting/payments/due')
        .query({ propertyId: 1 })
        .expect(200);
      
      expect(response.body.payments).to.be.an('array').with.lengthOf(2);
      expect(response.body.payments[0].tenant_name).to.equal('John Doe');
      expect(getDuePaymentsStub.calledOnce).to.be.true;
    });
    
    it('should record a payment', async () => {
      // Stub the service method
      const rentTrackingService = accountingModule.getRentTrackingService();
      const recordPaymentStub = sinon.stub(rentTrackingService, 'recordPayment').resolves({
        id: 1,
        tenant_name: 'John Doe',
        amount: 1000,
        status: 'paid',
        payment_date: '2025-04-01'
      });
      
      const response = await request(app)
        .post('/api/accounting/payments/record')
        .send({
          paymentId: 1,
          amount: 1000,
          paymentDate: '2025-04-01',
          paymentMethod: 'check',
          referenceNumber: '12345',
          notes: 'Test payment'
        })
        .expect(200);
      
      expect(response.body.id).to.equal(1);
      expect(response.body.status).to.equal('paid');
      expect(recordPaymentStub.calledOnce).to.be.true;
    });
    
    it('should generate a rent roll report', async () => {
      // Stub the service method
      const rentTrackingService = accountingModule.getRentTrackingService();
      const generateRentRollReportStub = sinon.stub(rentTrackingService, 'generateRentRollReport').resolves({
        data: [
          { unit_number: '101', tenant_name: 'John Doe', amount: 1000, status: 'paid' },
          { unit_number: '102', tenant_name: 'Jane Smith', amount: 1200, status: 'pending' }
        ],
        summary: {
          totalUnits: 2,
          totalAmount: 2200,
          totalPaid: 1000,
          totalPending: 1200
        }
      });
      
      const response = await request(app)
        .get('/api/accounting/reports/rent-roll')
        .query({
          propertyId: 1,
          startDate: '2025-03-01',
          endDate: '2025-04-30',
          format: 'json'
        })
        .expect(200);
      
      expect(response.body.data).to.be.an('array').with.lengthOf(2);
      expect(response.body.summary.totalUnits).to.equal(2);
      expect(generateRentRollReportStub.calledOnce).to.be.true;
    });
  });
  
  describe('Late Fee Endpoints', () => {
    it('should get late fee configurations', async () => {
      // Stub the service method
      const lateFeeService = accountingModule.getLateFeeService();
      const getLateFeeConfigurationsStub = sinon.stub(lateFeeService, 'getLateFeeConfigurations').resolves([
        { id: 1, property_id: 1, grace_period: 5, fee_type: 'percentage', fee_amount: 5 },
        { id: 2, property_id: 1, grace_period: 3, fee_type: 'fixed', fee_amount: 50 }
      ]);
      
      const response = await request(app)
        .get('/api/accounting/late-fees/configurations')
        .query({ propertyId: 1 })
        .expect(200);
      
      expect(response.body).to.be.an('array').with.lengthOf(2);
      expect(response.body[0].fee_type).to.equal('percentage');
      expect(getLateFeeConfigurationsStub.calledOnce).to.be.true;
    });
    
    it('should create a late fee configuration', async () => {
      // Stub the service method
      const lateFeeService = accountingModule.getLateFeeService();
      const createLateFeeConfigurationStub = sinon.stub(lateFeeService, 'createLateFeeConfiguration').resolves({
        id: 1,
        property_id: 1,
        grace_period: 5,
        fee_type: 'percentage',
        fee_amount: 5,
        is_compounding: false
      });
      
      const response = await request(app)
        .post('/api/accounting/late-fees/configurations')
        .send({
          propertyId: 1,
          gracePeriod: 5,
          feeType: 'percentage',
          feeAmount: 5,
          isCompounding: false
        })
        .expect(201);
      
      expect(response.body.id).to.equal(1);
      expect(response.body.fee_type).to.equal('percentage');
      expect(createLateFeeConfigurationStub.calledOnce).to.be.true;
    });
    
    it('should apply a late fee', async () => {
      // Stub the service method
      const lateFeeService = accountingModule.getLateFeeService();
      const applyLateFeeStub = sinon.stub(lateFeeService, 'applyLateFee').resolves({
        id: 1,
        payment_id: 1,
        amount: 50,
        status: 'pending'
      });
      
      const response = await request(app)
        .post('/api/accounting/late-fees/apply')
        .send({
          paymentId: 1,
          percentage: 5,
          notes: 'Test late fee'
        })
        .expect(200);
      
      expect(response.body.id).to.equal(1);
      expect(response.body.payment_id).to.equal(1);
      expect(applyLateFeeStub.calledOnce).to.be.true;
    });
  });
  
  describe('Trust Account Endpoints', () => {
    it('should get trust accounts', async () => {
      // Stub the service method
      const trustAccountService = accountingModule.getTrustAccountService();
      const getTrustAccountsStub = sinon.stub(trustAccountService, 'getTrustAccounts').resolves([
        { id: 1, property_id: 1, account_name: 'Security Deposits', account_type: 'security_deposit', balance: '5000.00' },
        { id: 2, property_id: 1, account_name: 'Escrow Account', account_type: 'escrow', balance: '10000.00' }
      ]);
      
      const response = await request(app)
        .get('/api/accounting/trust-accounts')
        .query({ propertyId: 1 })
        .expect(200);
      
      expect(response.body).to.be.an('array').with.lengthOf(2);
      expect(response.body[0].account_name).to.equal('Security Deposits');
      expect(getTrustAccountsStub.calledOnce).to.be.true;
    });
    
    it('should create a trust account', async () => {
      // Stub the service method
      const trustAccountService = accountingModule.getTrustAccountService();
      const createTrustAccountStub = sinon.stub(trustAccountService, 'createTrustAccount').resolves({
        id: 1,
        property_id: 1,
        account_name: 'Security Deposits',
        account_type: 'security_deposit',
        is_interest_bearing: true,
        interest_rate: 0.5,
        balance: '0.00'
      });
      
      const response = await request(app)
        .post('/api/accounting/trust-accounts')
        .send({
          propertyId: 1,
          accountName: 'Security Deposits',
          accountType: 'security_deposit',
          isInterestBearing: true,
          interestRate: 0.5
        })
        .expect(201);
      
      expect(response.body.id).to.equal(1);
      expect(response.body.account_name).to.equal('Security Deposits');
      expect(createTrustAccountStub.calledOnce).to.be.true;
    });
    
    it('should record a deposit', async () => {
      // Stub the service method
      const trustAccountService = accountingModule.getTrustAccountService();
      const recordDepositStub = sinon.stub(trustAccountService, 'recordDeposit').resolves({
        id: 1,
        trust_account_id: 1,
        amount: '500.00',
        transaction_type: 'deposit',
        description: 'Security deposit'
      });
      
      const response = await request(app)
        .post('/api/accounting/trust-accounts/1/deposit')
        .send({
          amount: 500,
          transactionDate: '2025-04-01',
          description: 'Security deposit',
          paymentMethod: 'check'
        })
        .expect(201);
      
      expect(response.body.id).to.equal(1);
      expect(response.body.amount).to.equal('500.00');
      expect(recordDepositStub.calledOnce).to.be.true;
    });
  });
  
  describe('Expense Management Endpoints', () => {
    it('should get expense categories', async () => {
      // Stub the service method
      const expenseManagementService = accountingModule.getExpenseManagementService();
      const getExpenseCategoriesStub = sinon.stub(expenseManagementService, 'getExpenseCategories').resolves([
        { id: 1, name: 'Repairs', is_tax_deductible: true },
        { id: 2, name: 'Utilities', is_tax_deductible: true }
      ]);
      
      const response = await request(app)
        .get('/api/accounting/expense-categories')
        .expect(200);
      
      expect(response.body).to.be.an('array').with.lengthOf(2);
      expect(response.body[0].name).to.equal('Repairs');
      expect(getExpenseCategoriesStub.calledOnce).to.be.true;
    });
    
    it('should record an expense', async () => {
      // Stub the service method
      const expenseManagementService = accountingModule.getExpenseManagementService();
      const recordExpenseStub = sinon.stub(expenseManagementService, 'recordExpense').resolves({
        id: 1,
        property_id: 1,
        expense_category_id: 1,
        amount: '100.00',
        description: 'Test expense'
      });
      
      const response = await request(app)
        .post('/api/accounting/expenses')
        .send({
          propertyId: 1,
          expenseCategoryId: 1,
          amount: 100,
          description: 'Test expense'
        })
        .expect(201);
      
      expect(response.body.id).to.equal(1);
      expect(response.body.amount).to.equal('100.00');
      expect(recordExpenseStub.calledOnce).to.be.true;
    });
    
    it('should generate an expense report', async () => {
      // Stub the service method
      const expenseManagementService = accountingModule.getExpenseManagementService();
      const generateExpenseReportStub = sinon.stub(expenseManagementService, 'generateExpenseReport').resolves({
        data: [
          { category_name: 'Repairs', total_amount: '500.00' },
          { category_name: 'Utilities', total_amount: '300.00' }
        ],
        summary: {
          totalAmount: 800,
          categoryCount: 2
        }
      });
      
      const response = await request(app)
        .get('/api/accounting/reports/expense')
        .query({
          propertyId: 1,
          startDate: '2025-03-01',
          endDate: '2025-04-30',
          groupBy: 'category',
          reportType: 'summary',
          format: 'json'
        })
        .expect(200);
      
      expect(response.body.data).to.be.an('array').with.lengthOf(2);
      expect(response.body.summary.totalAmount).to.equal(800);
      expect(generateExpenseReportStub.calledOnce).to.be.true;
    });
  });
  
  describe('Financial Dashboard Endpoints', () => {
    it('should get financial dashboard data', async () => {
      // Stub the service method
      const getFinancialDashboardDataStub = sinon.stub(accountingModule, 'getFinancialDashboardData').resolves({
        rentStats: {
          summary: {
            totalDue: 2200,
            totalPaid: 1000,
            totalOverdue: 1200,
            paymentRate: 45.45
          }
        },
        expenseStats: {
          summary: {
            totalAmount: 800,
            categoryCount: 2
          }
        },
        trustBalances: [
          { id: 1, name: 'Security Deposits', type: 'security_deposit', balance: 5000 },
          { id: 2, name: 'Escrow Account', type: 'escrow', balance: 10000 }
        ],
        cashFlow: {
          totalIncome: 1000,
          totalExpenses: 800,
          netCashFlow: 200,
          cashFlowRatio: 0.8
        }
      });
      
      const response = await request(app)
        .get('/api/accounting/dashboard')
        .query({
          propertyId: 1,
          startDate: '2025-03-01',
          endDate: '2025-04-30'
        })
        .expect(200);
      
      expect(response.body.rentStats).to.exist;
      expect(response.body.expenseStats).to.exist;
      expect(response.body.trustBalances).to.be.an('array').with.lengthOf(2);
      expect(response.body.cashFlow.netCashFlow).to.equal(200);
      expect(getFinancialDashboardDataStub.calledOnce).to.be.true;
    });
    
    it('should generate comprehensive financial reports', async () => {
      // Stub the service method
      const generateFinancialReportsStub = sinon.stub(accountingModule, 'generateFinancialReports').resolves({
        rentRollReport: { data: 'rent roll data' },
        expenseReport: { data: 'expense data' },
        trustAccountReports: [{ data: 'trust account data' }],
        trustAuditReport: { data: 'audit data' },
        generatedAt: new Date(),
        reportPeriod: {
          startDate: '2025-03-01',
          endDate: '2025-04-30'
        }
      });
      
      const response = await request(app)
        .get('/api/accounting/reports/financial')
        .query({
          propertyId: 1,
          startDate: '2025-03-01',
          endDate: '2025-04-30',
          format: 'json'
        })
        .expect(200);
      
      expect(response.body.rentRollReport).to.exist;
      expect(response.body.expenseReport).to.exist;
      expect(response.body.trustAccountReports).to.be.an('array').with.lengthOf(1);
      expect(response.body.trustAuditReport).to.exist;
      expect(generateFinancialReportsStub.calledOnce).to.be.true;
    });
  });
});
