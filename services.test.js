/**
 * services.test.js
 * 
 * Unit tests for the Advanced Accounting Module services
 */

const { expect } = require('chai');
const sinon = require('sinon');
const AccountingModule = require('../src/services');
const RentTrackingService = require('../src/services/RentTrackingService');
const LateFeeService = require('../src/services/LateFeeService');
const TrustAccountService = require('../src/services/TrustAccountService');
const ExpenseManagementService = require('../src/services/ExpenseManagementService');

describe('Advanced Accounting Module - Unit Tests', () => {
  let accountingModule;
  
  beforeEach(() => {
    accountingModule = new AccountingModule();
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('AccountingModule', () => {
    it('should initialize successfully', async () => {
      const result = await accountingModule.initialize();
      expect(result).to.be.true;
    });
    
    it('should provide access to all services', () => {
      expect(accountingModule.getRentTrackingService()).to.be.an.instanceOf(RentTrackingService);
      expect(accountingModule.getLateFeeService()).to.be.an.instanceOf(LateFeeService);
      expect(accountingModule.getTrustAccountService()).to.be.an.instanceOf(TrustAccountService);
      expect(accountingModule.getExpenseManagementService()).to.be.an.instanceOf(ExpenseManagementService);
    });
    
    it('should process recurring transactions', async () => {
      // Stub service methods
      const rentStub = sinon.stub(accountingModule.rentTrackingService, 'processRecurringPayments').resolves({ processed: 5 });
      const expenseStub = sinon.stub(accountingModule.expenseManagementService, 'processRecurringExpenses').resolves({ processed: 3 });
      const interestStub = sinon.stub(accountingModule.trustAccountService, 'calculateAndApplyInterest').resolves({ processed: 2 });
      
      const result = await accountingModule.processRecurringTransactions(new Date(), 1);
      
      expect(result.success).to.be.true;
      expect(result.rentResults).to.deep.equal({ processed: 5 });
      expect(result.expenseResults).to.deep.equal({ processed: 3 });
      expect(result.interestResults).to.deep.equal({ processed: 2 });
      
      expect(rentStub.calledOnce).to.be.true;
      expect(expenseStub.calledOnce).to.be.true;
      expect(interestStub.calledOnce).to.be.true;
    });
    
    it('should generate financial reports', async () => {
      // Stub service methods
      const rentRollStub = sinon.stub(accountingModule.rentTrackingService, 'generateRentRollReport').resolves({ data: 'rent roll data' });
      const expenseReportStub = sinon.stub(accountingModule.expenseManagementService, 'generateExpenseReport').resolves({ data: 'expense data' });
      const getTrustAccountsStub = sinon.stub(accountingModule.trustAccountService, 'getTrustAccounts').resolves([{ id: 1, name: 'Test Account' }]);
      const statementStub = sinon.stub(accountingModule.trustAccountService, 'generateStatement').resolves({ data: 'statement data' });
      const auditReportStub = sinon.stub(accountingModule.trustAccountService, 'generateAuditReport').resolves({ data: 'audit data' });
      
      const result = await accountingModule.generateFinancialReports(1);
      
      expect(result.rentRollReport).to.deep.equal({ data: 'rent roll data' });
      expect(result.expenseReport).to.deep.equal({ data: 'expense data' });
      expect(result.trustAccountReports).to.be.an('array').with.lengthOf(1);
      expect(result.trustAuditReport).to.deep.equal({ data: 'audit data' });
      
      expect(rentRollStub.calledOnce).to.be.true;
      expect(expenseReportStub.calledOnce).to.be.true;
      expect(getTrustAccountsStub.calledOnce).to.be.true;
      expect(statementStub.calledOnce).to.be.true;
      expect(auditReportStub.calledOnce).to.be.true;
    });
  });
  
  describe('RentTrackingService', () => {
    let rentTrackingService;
    
    beforeEach(() => {
      rentTrackingService = accountingModule.getRentTrackingService();
    });
    
    it('should get due payments', async () => {
      // Stub database query
      const queryStub = sinon.stub(rentTrackingService, 'query').resolves({
        rows: [
          { id: 1, tenant_name: 'John Doe', amount: 1000, due_date: '2025-04-01', status: 'pending' },
          { id: 2, tenant_name: 'Jane Smith', amount: 1200, due_date: '2025-04-01', status: 'paid' }
        ]
      });
      
      const result = await rentTrackingService.getDuePayments(1, {
        startDate: '2025-03-01',
        endDate: '2025-04-30'
      });
      
      expect(result.payments).to.be.an('array').with.lengthOf(2);
      expect(result.payments[0].id).to.equal(1);
      expect(result.payments[0].tenant_name).to.equal('John Doe');
      expect(queryStub.calledOnce).to.be.true;
    });
    
    it('should record a payment', async () => {
      // Stub database queries
      const beginStub = sinon.stub(rentTrackingService, 'beginTransaction').resolves();
      const queryStub = sinon.stub(rentTrackingService, 'query').resolves({
        rows: [{ id: 1, tenant_name: 'John Doe', amount: 1000, status: 'paid' }]
      });
      const commitStub = sinon.stub(rentTrackingService, 'commitTransaction').resolves();
      
      const result = await rentTrackingService.recordPayment({
        paymentId: 1,
        amount: 1000,
        paymentDate: '2025-04-01',
        paymentMethod: 'check',
        referenceNumber: '12345',
        notes: 'Test payment',
        userId: 1
      });
      
      expect(result.id).to.equal(1);
      expect(result.status).to.equal('paid');
      expect(beginStub.calledOnce).to.be.true;
      expect(queryStub.calledOnce).to.be.true;
      expect(commitStub.calledOnce).to.be.true;
    });
    
    it('should generate a rent roll report', async () => {
      // Stub database query
      const queryStub = sinon.stub(rentTrackingService, 'query').resolves({
        rows: [
          { unit_number: '101', tenant_name: 'John Doe', amount: 1000, status: 'paid' },
          { unit_number: '102', tenant_name: 'Jane Smith', amount: 1200, status: 'pending' }
        ]
      });
      
      const result = await rentTrackingService.generateRentRollReport(1, {
        startDate: '2025-03-01',
        endDate: '2025-04-30',
        format: 'json'
      });
      
      expect(result.data).to.be.an('array').with.lengthOf(2);
      expect(result.summary.totalUnits).to.equal(2);
      expect(queryStub.calledOnce).to.be.true;
    });
  });
  
  describe('LateFeeService', () => {
    let lateFeeService;
    
    beforeEach(() => {
      lateFeeService = accountingModule.getLateFeeService();
    });
    
    it('should get late fee configurations', async () => {
      // Stub database query
      const queryStub = sinon.stub(lateFeeService, 'query').resolves({
        rows: [
          { id: 1, property_id: 1, grace_period: 5, fee_type: 'percentage', fee_amount: 5 },
          { id: 2, property_id: 1, grace_period: 3, fee_type: 'fixed', fee_amount: 50 }
        ]
      });
      
      const result = await lateFeeService.getLateFeeConfigurations(1);
      
      expect(result).to.be.an('array').with.lengthOf(2);
      expect(result[0].id).to.equal(1);
      expect(result[0].fee_type).to.equal('percentage');
      expect(queryStub.calledOnce).to.be.true;
    });
    
    it('should create a late fee configuration', async () => {
      // Stub database query
      const queryStub = sinon.stub(lateFeeService, 'query').resolves({
        rows: [{ id: 1, property_id: 1, grace_period: 5, fee_type: 'percentage', fee_amount: 5 }]
      });
      
      const result = await lateFeeService.createLateFeeConfiguration({
        propertyId: 1,
        gracePeriod: 5,
        feeType: 'percentage',
        feeAmount: 5,
        isCompounding: false,
        userId: 1
      });
      
      expect(result.id).to.equal(1);
      expect(result.property_id).to.equal(1);
      expect(queryStub.calledOnce).to.be.true;
    });
    
    it('should apply a late fee', async () => {
      // Stub database queries
      const beginStub = sinon.stub(lateFeeService, 'beginTransaction').resolves();
      const queryStub = sinon.stub(lateFeeService, 'query');
      
      // First query gets the payment
      queryStub.onFirstCall().resolves({
        rows: [{ id: 1, amount: 1000, tenant_id: 1, property_id: 1 }]
      });
      
      // Second query gets the late fee configuration
      queryStub.onSecondCall().resolves({
        rows: [{ id: 1, fee_type: 'percentage', fee_amount: 5 }]
      });
      
      // Third query inserts the late fee
      queryStub.onThirdCall().resolves({
        rows: [{ id: 1, payment_id: 1, amount: 50 }]
      });
      
      const commitStub = sinon.stub(lateFeeService, 'commitTransaction').resolves();
      
      const result = await lateFeeService.applyLateFee({
        paymentId: 1,
        percentage: 5,
        userId: 1
      });
      
      expect(result.id).to.equal(1);
      expect(result.payment_id).to.equal(1);
      expect(result.amount).to.equal(50);
      expect(beginStub.calledOnce).to.be.true;
      expect(queryStub.calledThrice).to.be.true;
      expect(commitStub.calledOnce).to.be.true;
    });
  });
  
  describe('TrustAccountService', () => {
    let trustAccountService;
    
    beforeEach(() => {
      trustAccountService = accountingModule.getTrustAccountService();
    });
    
    it('should get trust accounts', async () => {
      // Stub database query
      const queryStub = sinon.stub(trustAccountService, 'query').resolves({
        rows: [
          { id: 1, property_id: 1, account_name: 'Security Deposits', account_type: 'security_deposit', balance: '5000.00' },
          { id: 2, property_id: 1, account_name: 'Escrow Account', account_type: 'escrow', balance: '10000.00' }
        ]
      });
      
      const result = await trustAccountService.getTrustAccounts(1);
      
      expect(result).to.be.an('array').with.lengthOf(2);
      expect(result[0].id).to.equal(1);
      expect(result[0].account_name).to.equal('Security Deposits');
      expect(queryStub.calledOnce).to.be.true;
    });
    
    it('should create a trust account', async () => {
      // Stub database query
      const queryStub = sinon.stub(trustAccountService, 'query').resolves({
        rows: [{ id: 1, property_id: 1, account_name: 'Security Deposits', account_type: 'security_deposit', balance: '0.00' }]
      });
      
      const result = await trustAccountService.createTrustAccount({
        propertyId: 1,
        accountName: 'Security Deposits',
        accountType: 'security_deposit',
        isInterestBearing: true,
        interestRate: 0.5,
        userId: 1
      });
      
      expect(result.id).to.equal(1);
      expect(result.account_name).to.equal('Security Deposits');
      expect(queryStub.calledOnce).to.be.true;
    });
    
    it('should record a deposit', async () => {
      // Stub database queries
      const beginStub = sinon.stub(trustAccountService, 'beginTransaction').resolves();
      const queryStub = sinon.stub(trustAccountService, 'query');
      
      // First query gets the account
      queryStub.onFirstCall().resolves({
        rows: [{ id: 1, balance: '1000.00' }]
      });
      
      // Second query inserts the transaction
      queryStub.onSecondCall().resolves({
        rows: [{ id: 1, trust_account_id: 1, amount: '500.00', transaction_type: 'deposit' }]
      });
      
      // Third query updates the account balance
      queryStub.onThirdCall().resolves({
        rows: [{ id: 1, balance: '1500.00' }]
      });
      
      const commitStub = sinon.stub(trustAccountService, 'commitTransaction').resolves();
      
      const result = await trustAccountService.recordDeposit({
        trustAccountId: 1,
        amount: 500,
        description: 'Security deposit',
        userId: 1
      });
      
      expect(result.id).to.equal(1);
      expect(result.trust_account_id).to.equal(1);
      expect(result.amount).to.equal('500.00');
      expect(beginStub.calledOnce).to.be.true;
      expect(queryStub.calledThrice).to.be.true;
      expect(commitStub.calledOnce).to.be.true;
    });
  });
  
  describe('ExpenseManagementService', () => {
    let expenseManagementService;
    
    beforeEach(() => {
      expenseManagementService = accountingModule.getExpenseManagementService();
    });
    
    it('should get expense categories', async () => {
      // Stub database query
      const queryStub = sinon.stub(expenseManagementService, 'query').resolves({
        rows: [
          { id: 1, name: 'Repairs', is_tax_deductible: true },
          { id: 2, name: 'Utilities', is_tax_deductible: true }
        ]
      });
      
      const result = await expenseManagementService.getExpenseCategories();
      
      expect(result).to.be.an('array').with.lengthOf(2);
      expect(result[0].id).to.equal(1);
      expect(result[0].name).to.equal('Repairs');
      expect(queryStub.calledOnce).to.be.true;
    });
    
    it('should record an expense', async () => {
      // Stub database queries
      const beginStub = sinon.stub(expenseManagementService, 'beginTransaction').resolves();
      const queryStub = sinon.stub(expenseManagementService, 'query').resolves({
        rows: [{ id: 1, property_id: 1, expense_category_id: 1, amount: '100.00', description: 'Test expense' }]
      });
      const commitStub = sinon.stub(expenseManagementService, 'commitTransaction').resolves();
      
      const result = await expenseManagementService.recordExpense({
        propertyId: 1,
        expenseCategoryId: 1,
        amount: 100,
        description: 'Test expense',
        userId: 1
      });
      
      expect(result.id).to.equal(1);
      expect(result.amount).to.equal('100.00');
      expect(beginStub.calledOnce).to.be.true;
      expect(queryStub.calledOnce).to.be.true;
      expect(commitStub.calledOnce).to.be.true;
    });
    
    it('should generate an expense report', async () => {
      // Stub database query
      const queryStub = sinon.stub(expenseManagementService, 'query').resolves({
        rows: [
          { category_name: 'Repairs', total_amount: '500.00' },
          { category_name: 'Utilities', total_amount: '300.00' }
        ]
      });
      
      const result = await expenseManagementService.generateExpenseReport({
        propertyId: 1,
        startDate: '2025-03-01',
        endDate: '2025-04-30',
        groupBy: 'category',
        reportType: 'summary',
        format: 'json'
      });
      
      expect(result.data).to.be.an('array').with.lengthOf(2);
      expect(result.summary.totalAmount).to.equal(800);
      expect(queryStub.calledOnce).to.be.true;
    });
  });
});
