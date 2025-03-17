# Comprehensive Property Management System - Handoff Document

## Introduction

This handoff document provides a comprehensive overview of the Comprehensive Property Management System, its current status, and next steps for implementation. It serves as the central reference for the project, ensuring continuity and knowledge transfer between development teams.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Current Status](#current-status)
3. [System Architecture](#system-architecture)
4. [Database Schema](#database-schema)
5. [Implementation Timeline](#implementation-timeline)
6. [Module Specifications](#module-specifications)
7. [Code Organization](#code-organization)
8. [Development Environment Setup](#development-environment-setup)
9. [Next Implementation Steps](#next-implementation-steps)
10. [Resources and References](#resources-and-references)

## Project Overview

The Comprehensive Property Management System is a full-featured application that evolved from an affordable housing application focused on HUD programs into a comprehensive platform with AI-enhanced features. The system serves tenants, landlords, property managers, and housing authorities across all 50 U.S. states with a robust set of features organized into eight core modules.

### Core Modules

1. **Tenant Management**: Handles tenant applications, screening, lease management, communication, and tenant portal access.
2. **Property Management**: Manages property listings, unit details, amenities, and compliance with housing regulations.
3. **Financial Management**: Tracks rent collection, expenses, accounting, and financial reporting.
4. **Maintenance Management**: Coordinates maintenance requests, work orders, vendor management, and preventive maintenance.
5. **Communication Hub**: Facilitates communication between tenants, landlords, property managers, and housing authorities.
6. **Reporting and Analytics**: Provides insights into property performance, tenant behavior, and financial health.
7. **Pricing and Accessibility**: Implements tiered subscription plans with feature-based access control.
8. **Integration and API**: Connects with external services and provides API access for custom integrations.

### Key Features

- **AI-Enhanced Capabilities**: Form filling automation, pricing recommendations, cash flow prediction, tenant turnover prediction, and predictive maintenance.
- **HUD Integration**: Direct connection with HUD systems across all 50 states, automating form submissions and ensuring compliance.
- **Tiered Pricing Model**: Free tier (up to 5 units), Standard tier ($2/unit/month), and Enterprise tier (custom pricing).
- **Multi-Platform Support**: Web application, mobile application (iOS/Android), and progressive web app.
- **Comprehensive Reporting**: Financial reports, property performance metrics, and compliance documentation.

## Current Status

- **Web Application**: Deployed at https://xgfxgabn.manus.space/
- **Current Step**: 022 - Preparing handoff for next implementation steps
- **Next Step**: 023 - Implementing advanced accounting module
- **Previous Milestone**: Successfully implemented pricing and accessibility module with tiered subscription plans

### Completed Work

#### Database Schema Expansion
- Expanded PostgreSQL schema to support all eight core modules
- Implemented MongoDB collections for unstructured data and AI functionality
- Set up Redis caching structures for performance optimization
- Created test scripts to validate all database components

#### Pricing and Accessibility Module
- Implemented Free Tier (up to 5 units)
- Implemented Standard Tier ($2/unit/month, min $10/month)
- Implemented Enterprise Tier (custom pricing, $500+/month base)
- Developed AI-driven pricing recommendations
- Integrated the pricing module with the expanded database
- Thoroughly tested all components

#### Bug Fixes
- Fixed city selection functionality on tenant onboarding location page
  - Issue: City dropdown wasn't being populated when a state was selected
  - Solution: Implemented JavaScript to populate cities based on selected state

## System Architecture

The Comprehensive Property Management System employs a modern, scalable architecture designed to support the needs of property managers, landlords, tenants, and housing authorities.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Applications                            │
│                                                                         │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────────────┐    │
│  │  Web App      │    │  Mobile App   │    │  Admin Dashboard      │    │
│  │  (React.js)   │    │  (React Native)│    │  (React.js)          │    │
│  └───────┬───────┘    └───────┬───────┘    └───────────┬───────────┘    │
└──────────┼─────────────────────┼───────────────────────┼────────────────┘
           │                     │                       │
           │                     │                       │
           ▼                     ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API Gateway                                 │
│                         (Node.js/Express.js)                            │
└─────────────┬─────────────────────┬────────────────────┬────────────────┘
              │                     │                    │
    ┌─────────┼─────────┐ ┌─────────┼─────────┐ ┌────────┼─────────────┐
    │         │         │ │         │         │ │        │             │
    ▼         ▼         ▼ ▼         ▼         ▼ ▼        ▼             ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Auth     │ │ Property │ │ Tenant   │ │ Financial│ │ Maint.   │ │ Pricing  │
│ Service  │ │ Service  │ │ Service  │ │ Service  │ │ Service  │ │ Service  │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │            │            │            │
     │            │            │            │            │            │
┌────┴────────────┴────────────┴────────────┴────────────┴────────────┴─────┐
│                          Message Queue (Redis)                            │
└────┬────────────┬────────────┬────────────┬────────────┬────────────┬─────┘
     │            │            │            │            │            │
     │            │            │            │            │            │
┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐
│ Database │ │ Document │ │ Search   │ │ Cache    │ │ AI/ML    │ │ External │
│ Layer    │ │ Storage  │ │ Engine   │ │ Layer    │ │ Services │ │ Services │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
     │            │            │            │            │            │
     ▼            ▼            ▼            ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│PostgreSQL│ │ MongoDB  │ │Elasticsearch│ Redis    │ │TensorFlow│ │ HUD API  │
│          │ │          │ │          │ │          │ │ Flask    │ │ Stripe   │
│          │ │          │ │          │ │          │ │          │ │ Plaid    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Key Components

- **Frontend**: React.js (web) + React Native (mobile)
- **Backend**: Node.js with Express.js for RESTful API
- **Database**: 
  - PostgreSQL (structured data)
  - MongoDB (unstructured data)
  - Redis (caching)
- **AI/ML**: Python with TensorFlow and Flask microservice
- **Cloud**: AWS for hosting and infrastructure
- **Authentication**: JWT for secure sessions
- **Integrations**: Stripe, Plaid, Google Maps, Zapier

## Database Schema

The Comprehensive Property Management System utilizes a multi-database approach to efficiently handle different types of data and optimize performance:

1. **PostgreSQL** for structured relational data
2. **MongoDB** for unstructured data and document storage
3. **Redis** for caching and performance optimization

### Key Database Components

#### PostgreSQL Tables

- **Users and Authentication**: users, user_roles, sessions
- **Properties and Units**: properties, units, amenities, property_amenities, unit_amenities
- **Tenants and Leases**: tenants, leases, lease_tenants, lease_documents
- **Financial Management**: transactions, recurring_transactions, late_fees
- **Maintenance Management**: maintenance_requests, maintenance_images, vendors, work_orders
- **Pricing and Accessibility**: subscription_plans, subscriptions, feature_access, plan_features, usage_tracking, ai_pricing_recommendations
- **HUD Integration**: housing_authorities, hud_programs, property_hud_programs, hud_applications, hud_forms

#### MongoDB Collections

- **documents**: Stores documents and files with metadata
- **notifications**: Manages user notifications
- **chat_messages**: Stores communication between users
- **usage_patterns**: Tracks user behavior for AI recommendations
- **ai_training_data**: Stores data for training AI models
- **ai_models**: Manages AI model metadata and versioning

#### Redis Caching

- **User Sessions and Authentication**: Session data and permissions
- **Feature Access and Subscription**: Subscription status and feature access
- **Application Data Caching**: Property details, unit availability, maintenance counts
- **Search and Lookup Caches**: City/state lookups, amenity lookups, search results
- **Real-time Notifications**: Notification counters, active workers, chat presence

### SQL Migration Scripts

#### 001_create_recurring_payments_table.sql
```sql
CREATE TABLE recurring_payments (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id),
  unit_id INTEGER NOT NULL REFERENCES units(id),
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  payment_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  frequency VARCHAR(20) NOT NULL,
  day_of_month INTEGER,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_frequency CHECK (frequency IN ('monthly', 'quarterly', 'annually')),
  CONSTRAINT valid_day_of_month CHECK (day_of_month BETWEEN 1 AND 31)
);

CREATE INDEX idx_recurring_payments_property_id ON recurring_payments(property_id);
CREATE INDEX idx_recurring_payments_unit_id ON recurring_payments(unit_id);
CREATE INDEX idx_recurring_payments_tenant_id ON recurring_payments(tenant_id);
```

#### 002_create_late_fee_configurations_table.sql
```sql
CREATE TABLE late_fee_configurations (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id),
  grace_period_days INTEGER NOT NULL DEFAULT 5,
  initial_fee_type VARCHAR(20) NOT NULL,
  initial_fee_amount DECIMAL(10, 2) NOT NULL,
  initial_fee_percentage DECIMAL(5, 2),
  recurring_fee_type VARCHAR(20),
  recurring_fee_amount DECIMAL(10, 2),
  recurring_fee_percentage DECIMAL(5, 2),
  recurring_fee_interval_days INTEGER,
  max_fee_type VARCHAR(20),
  max_fee_amount DECIMAL(10, 2),
  max_fee_percentage DECIMAL(5, 2),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_initial_fee_type CHECK (initial_fee_type IN ('fixed', 'percentage')),
  CONSTRAINT valid_recurring_fee_type CHECK (recurring_fee_type IN ('fixed', 'percentage', NULL)),
  CONSTRAINT valid_max_fee_type CHECK (max_fee_type IN ('fixed', 'percentage', NULL))
);

CREATE INDEX idx_late_fee_configurations_property_id ON late_fee_configurations(property_id);
```

#### 003_create_late_fees_table.sql
```sql
CREATE TABLE late_fees (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id),
  unit_id INTEGER NOT NULL REFERENCES units(id),
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  payment_id INTEGER NOT NULL REFERENCES payments(id),
  amount DECIMAL(10, 2) NOT NULL,
  fee_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'charged', 'waived', 'paid'))
);

CREATE INDEX idx_late_fees_property_id ON late_fees(property_id);
CREATE INDEX idx_late_fees_unit_id ON late_fees(unit_id);
CREATE INDEX idx_late_fees_tenant_id ON late_fees(tenant_id);
CREATE INDEX idx_late_fees_payment_id ON late_fees(payment_id);
```

## Implementation Timeline

The implementation timeline outlines the completed milestones, current status, and future development phases for the Comprehensive Property Management System.

### Completed Milestones (Steps 001-022)

- **Phase 1**: Research and Planning (Steps 001-005)
- **Phase 2**: Database Design and Implementation (Steps 006-010)
- **Phase 3**: Core System Development (Steps 011-015)
- **Phase 4**: HUD Integration (Steps 016-018)
- **Phase 5**: Pricing and Accessibility Module (Steps 019-022)

### Current Status (Step 022)

- **Current Step**: 022 - Preparing handoff for next implementation steps
- **Status**: In Progress
- **Completion Date**: March 14, 2025

### Upcoming Implementation (Steps 023-030)

#### Phase 6: Advanced Accounting Module (Steps 023-025)
- **Duration**: 3 weeks
- **Planned Start**: March 18, 2025
- **Planned Completion**: April 8, 2025
- **Key Deliverables**:
  - Rent tracking with automated late fees
  - Trust accounting with separate ledgers
  - Expense management with receipt scanning
  - Financial reporting and tax preparation
  - AI-powered cash flow prediction and error detection

#### Phase 7: Enhanced Tenant Management System (Steps 026-028)
- **Duration**: 3 weeks
- **Planned Start**: April 9, 2025
- **Planned Completion**: April 29, 2025

#### Phase 8: Maintenance Management Module (Steps 029-030)
- **Duration**: 3 weeks
- **Planned Start**: April 30, 2025
- **Planned Completion**: May 20, 2025

## Module Specifications

### 1. Pricing and Accessibility Module (Completed)

#### Objective
Ensure affordability and scalability for all users, from solo landlords to enterprises.

#### Features
- **Tiered Pricing Structure**:
  - **Free Tier**: Up to 5 units, includes rent collection (ACH only), basic tenant portal (payment + maintenance requests), and simple accounting (income/expense tracking, profit/loss report). No credit card required, 1 user.
  - **Standard Tier**: $2/unit/month (min $10/month), scales down to $1.50/unit for 50+ units. Full feature access: accounting, tenant management, maintenance, marketing, unlimited users, and integrations. 30-day free trial.
  - **Enterprise Tier**: Custom pricing ($500+/month base), unlimited units, dedicated account manager, API access, and white-labeling options.
- **Billing Flexibility**: Monthly or annual billing (10% discount for annual). No setup fees, no per-transaction tenant fees.
- **Multi-Currency/Language**: Supports USD, EUR, CAD, etc., and 10+ languages (English, Spanish, French, etc.).
- **Accessibility**: Web app, iOS/Android apps, offline mode for key tasks (e.g., receipt scanning).

#### AI Enhancements
- **Dynamic Pricing**: AI analyzes user portfolio size, local market rates, and feature usage to suggest optimal tiers.
- **Usage Predictions**: Forecasts unit growth to recommend tier upgrades.
- **Discount Engine**: Offers AI-driven promotions based on usage patterns.

#### Workflow
User signs up → AI assesses portfolio via quick survey → Suggests tier → User selects plan → Auto-bills via Stripe → AI monitors usage and nudges for upgrades.

#### Stakeholder Benefits
- **Landlords/Managers**: Cost-effective entry, scales with growth.
- **Tenants**: No payment fees enhance satisfaction.

#### Technical Considerations
- Payment gateway: Stripe API for subscriptions and payouts.
- Database: Store pricing tiers, user subscriptions, and discount rules in PostgreSQL.
- AI: Machine learning model for usage predictions, trained on anonymized user data.

### 2. Advanced Accounting Module (Next Implementation)

#### Objective
Provide a robust, compliant, and AI-optimized financial system.

#### Features
- **Rent Tracking**:
  - Real-time logging of payments (ACH, credit/debit, cash via partnered networks like PayNearMe).
  - Automated late fee calculation (e.g., 5% after 5 days, customizable).
  - Split payments (e.g., $1,000 = $800 rent + $100 utilities).
- **Trust Accounting**:
  - Separate ledgers for security deposits, prepaid rent, and operating funds.
  - Multi-entity support: per property, owner, or LLC, with consolidated views.
  - Compliance reports (e.g., NARPM standards, state-specific trust laws).
- **Expense Management**:
  - Receipt scanning via mobile app (OCR extracts date, amount, vendor).
  - Vendor payouts (direct bank transfer or check printing).
  - Categories: maintenance, taxes, insurance, utilities, etc.
- **Financial Reporting**:
  - Prebuilt: Profit/loss, balance sheet, cash flow, rent roll, vacancy report.
  - Custom: Drag-and-drop builder (e.g., "Show Q1 expenses for Property A by category").
  - Export: PDF, Excel, QuickBooks format.
- **Reconciliation**:
  - Auto-import bank transactions (Plaid API).
  - One-click matching with ledger entries, manual override option.
  - Audit trail: Logs all changes with timestamps/users.
- **Tax Preparation**:
  - Auto-generates Schedule E (U.S.), T776 (Canada), etc.
  - Flags deductions (e.g., repairs, depreciation).
  - Integrates with TurboTax, Xero.

#### AI Enhancements
- **Cash Flow Prediction**: Analyzes payment patterns, lease expirations, and expenses to forecast monthly cash flow.
- **Error Detection**: Scans for duplicates, missing entries, or anomalies.
- **Automation**: Auto-allocates payments, generates invoices, and suggests budget cuts.
- **Virtual CPA**: AI advisor for financial optimization.

## Code Organization

The project follows a modular structure organized by feature domains:

```
property-management-system/
├── client/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── contexts/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   └── public/
│   └── mobile/
│       ├── src/
│       │   ├── components/
│       │   ├── contexts/
│       │   ├── hooks/
│       │   ├── screens/
│       │   ├── services/
│       │   └── utils/
│       └── assets/
├── server/
│   ├── src/
│   │   ├── api/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── tests/
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── scripts/
├── ai-service/
│   ├── src/
│   │   ├── models/
│   │   ├── training/
│   │   ├── prediction/
│   │   └── api/
│   └── data/
├── docs/
│   ├── api/
│   ├── architecture/
│   ├── database/
│   └── user-guides/
└── scripts/
    ├── deployment/
    ├── testing/
    └── utilities/
```

### Key Service Implementations

#### RentTrackingService.js
```javascript
/**
 * Rent Tracking Service
 * 
 * This service handles rent tracking functionality with automated late fees.
 */
class RentTrackingService {
  // Get all due payments for a property
  async getDuePayments(propertyId, options = {}) {
    // Implementation details
  }
  
  // Get payment status for a lease
  async getLeasePaymentStatus(leaseId) {
    // Implementation details
  }
  
  // Record a rent payment
  async recordRentPayment(paymentData) {
    // Implementation details
  }
  
  // Calculate late fees for overdue payments
  async calculateLateFees(propertyId, asOfDate = new Date()) {
    // Implementation details
  }
  
  // Apply late fees to overdue payments
  async applyLateFees(propertyId, asOfDate = new Date()) {
    // Implementation details
  }
  
  // Generate rent roll report
  async generateRentRoll(propertyId, asOfDate = new Date()) {
    // Implementation details
  }
  
  // Send payment reminders
  async sendPaymentReminders(propertyId, daysInAdvance = 3) {
    // Implementation details
  }
}

module.exports = RentTrackingService;
```

#### TrustAccountService.js
```javascript
/**
 * Trust Account Service
 * 
 * This service handles trust accounting with separate ledgers.
 */
class TrustAccountService {
  // Get trust account balance for a property
  async getTrustAccountBalance(propertyId, accountType) {
    // Implementation details
  }
  
  // Record a deposit to a trust account
  async recordDeposit(depositData) {
    // Implementation details
  }
  
  // Record a withdrawal from a trust account
  async recordWithdrawal(withdrawalData) {
    // Implementation details
  }
  
  // Transfer funds between trust accounts
  async transferFunds(transferData) {
    // Implementation details
  }
  
  // Generate trust account statement
  async generateStatement(propertyId, accountType, startDate, endDate) {
    // Implementation details
  }
  
  // Reconcile trust account with bank statement
  async reconcileAccount(reconciliationData) {
    // Implementation details
  }
  
  // Check compliance with trust accounting regulations
  async checkCompliance(propertyId, stateCode) {
    // Implementation details
  }
}

module.exports = TrustAccountService;
```

#### ExpenseManagementService.js
```javascript
/**
 * Expense Management Service
 * 
 * This service handles expense management with receipt scanning.
 */
class ExpenseManagementService {
  // Get all expenses for a property
  async getExpenses(propertyId, options = {}) {
    // Implementation details
  }
  
  // Record an expense
  async recordExpense(expenseData) {
    // Implementation details
  }
  
  // Process receipt image
  async processReceiptImage(imageData) {
    // Implementation details
  }
  
  // Categorize expense
  async categorizeExpense(expenseData) {
    // Implementation details
  }
  
  // Generate expense report
  async generateExpenseReport(propertyId, startDate, endDate, groupBy) {
    // Implementation details
  }
  
  // Record vendor payment
  async recordVendorPayment(paymentData) {
    // Implementation details
  }
  
  // Get expense breakdown by category
  async getExpenseBreakdown(propertyId, year, month) {
    // Implementation details
  }
}

module.exports = ExpenseManagementService;
```

#### FinancialReportingService.js
```javascript
/**
 * Financial Reporting Service
 * 
 * This service handles financial reporting and tax preparation.
 */
class FinancialReportingService {
  // Generate profit and loss report
  async generateProfitLossReport(propertyId, startDate, endDate) {
    // Implementation details
  }
  
  // Generate balance sheet
  async generateBalanceSheet(propertyId, asOfDate = new Date()) {
    // Implementation details
  }
  
  // Generate cash flow report
  async generateCashFlowReport(propertyId, startDate, endDate) {
    // Implementation details
  }
  
  // Generate tax report
  async generateTaxReport(propertyId, taxYear) {
    // Implementation details
  }
  
  // Export report to various formats
  async exportReport(reportData, format) {
    // Implementation details
  }
  
  // Create custom report
  async createCustomReport(reportConfig) {
    // Implementation details
  }
  
  // Schedule recurring reports
  async scheduleRecurringReport(scheduleData) {
    // Implementation details
  }
}

module.exports = FinancialReportingService;
```

#### CashFlowPredictionService.js
```javascript
/**
 * Cash Flow Prediction Service
 * 
 * This service handles AI-powered cash flow prediction.
 */
class CashFlowPredictionService {
  // Predict cash flow for a property
  async predictCashFlow(propertyId, months = 12) {
    // Implementation details
  }
  
  // Analyze historical cash flow
  async analyzeHistoricalCashFlow(propertyId, months = 12) {
    // Implementation details
  }
  
  // Identify cash flow risks
  async identifyCashFlowRisks(propertyId) {
    // Implementation details
  }
  
  // Suggest cash flow improvements
  async suggestCashFlowImprovements(propertyId) {
    // Implementation details
  }
  
  // Generate cash flow scenarios
  async generateCashFlowScenarios(propertyId, scenarioParams) {
    // Implementation details
  }
  
  // Update prediction model with new data
  async updatePredictionModel(propertyId) {
    // Implementation details
  }
  
  // Get prediction accuracy metrics
  async getPredictionAccuracy(propertyId) {
    // Implementation details
  }
}

module.exports = CashFlowPredictionService;
```

#### LateFeeService.js
```javascript
/**
 * Late Fee Service
 * 
 * This service handles late fee calculation and management.
 */
class LateFeeService {
  // Get late fee configuration for a property
  async getLateFeeConfiguration(propertyId) {
    // Implementation details
  }
  
  // Update late fee configuration
  async updateLateFeeConfiguration(propertyId, configData) {
    // Implementation details
  }
  
  // Calculate late fee for a payment
  async calculateLateFee(paymentId, asOfDate = new Date()) {
    // Implementation details
  }
  
  // Apply late fee to a payment
  async applyLateFee(paymentId, lateFeeData) {
    // Implementation details
  }
  
  // Waive late fee
  async waiveLateFee(lateFeeId, reason) {
    // Implementation details
  }
  
  // Get late fees for a property
  async getLateFees(propertyId, options = {}) {
    // Implementation details
  }
  
  // Send late fee notification
  async sendLateFeeNotification(lateFeeId, notificationType) {
    // Implementation details
  }
}

module.exports = LateFeeService;
```

### React Components

#### RentTrackingDashboard.jsx
```jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button } from 'react-bootstrap';
import { RentTrackingService } from '../services';
import { RentTrackingWidget } from '../components';
import { formatCurrency, formatDate } from '../utils';
import './RentTrackingDashboard.css';

const RentTrackingDashboard = ({ propertyId }) => {
  const [duePayments, setDuePayments] = useState([]);
  const [latePayments, setLatePayments] = useState([]);
  const [rentRoll, setRentRoll] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const rentTrackingService = new RentTrackingService();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch due payments
        const duePaymentsData = await rentTrackingService.getDuePayments(propertyId, { status: 'due' });
        setDuePayments(duePaymentsData);
        
        // Fetch late payments
        const latePaymentsData = await rentTrackingService.getDuePayments(propertyId, { status: 'late' });
        setLatePayments(latePaymentsData);
        
        // Fetch rent roll
        const rentRollData = await rentTrackingService.generateRentRoll(propertyId);
        setRentRoll(rentRollData);
        
        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [propertyId]);
  
  const handleRecordPayment = async (paymentData) => {
    try {
      await rentTrackingService.recordRentPayment(paymentData);
      // Refresh data after recording payment
      const duePaymentsData = await rentTrackingService.getDuePayments(propertyId, { status: 'due' });
      setDuePayments(duePaymentsData);
      const latePaymentsData = await rentTrackingService.getDuePayments(propertyId, { status: 'late' });
      setLatePayments(latePaymentsData);
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleApplyLateFees = async () => {
    try {
      await rentTrackingService.applyLateFees(propertyId);
      // Refresh late payments after applying late fees
      const latePaymentsData = await rentTrackingService.getDuePayments(propertyId, { status: 'late' });
      setLatePayments(latePaymentsData);
    } catch (err) {
      setError(err.message);
    }
  };
  
  if (isLoading) return <div>Loading rent tracking data...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <Container className="rent-tracking-dashboard">
      <h1>Rent Tracking Dashboard</h1>
      
      <Row className="mb-4">
        <Col md={6}>
          <RentTrackingWidget 
            duePayments={duePayments} 
            latePayments={latePayments} 
            onRecordPayment={handleRecordPayment} 
          />
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>
              <Card.Title>Late Payments</Card.Title>
              <Button 
                variant="warning" 
                size="sm" 
                onClick={handleApplyLateFees}
                disabled={latePayments.length === 0}
              >
                Apply Late Fees
              </Button>
            </Card.Header>
            <Card.Body>
              {latePayments.length === 0 ? (
                <p>No late payments.</p>
              ) : (
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Tenant</th>
                      <th>Amount</th>
                      <th>Due Date</th>
                      <th>Days Late</th>
                      <th>Late Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latePayments.map(payment => (
                      <tr key={payment.id}>
                        <td>{payment.unit.unitNumber}</td>
                        <td>{payment.tenant.name}</td>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>{formatDate(payment.dueDate)}</td>
                        <td>
                          <Badge bg="danger">
                            {payment.daysLate} days
                          </Badge>
                        </td>
                        <td>{formatCurrency(payment.lateFee)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <Card.Title>Rent Roll</Card.Title>
            </Card.Header>
            <Card.Body>
              {!rentRoll ? (
                <p>No rent roll data available.</p>
              ) : (
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Tenant</th>
                      <th>Lease Start</th>
                      <th>Lease End</th>
                      <th>Monthly Rent</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentRoll.units.map(unit => (
                      <tr key={unit.id}>
                        <td>{unit.unitNumber}</td>
                        <td>{unit.tenant ? unit.tenant.name : 'Vacant'}</td>
                        <td>{unit.tenant ? formatDate(unit.leaseStart) : '-'}</td>
                        <td>{unit.tenant ? formatDate(unit.leaseEnd) : '-'}</td>
                        <td>{formatCurrency(unit.monthlyRent)}</td>
                        <td>
                          <Badge bg={unit.tenant ? 'success' : 'secondary'}>
                            {unit.tenant ? 'Occupied' : 'Vacant'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={4}>Total</th>
                      <th>{formatCurrency(rentRoll.totalMonthlyRent)}</th>
                      <th>
                        Occupancy: {rentRoll.occupancyRate}%
                      </th>
                    </tr>
                  </tfoot>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default RentTrackingDashboard;
```

## Development Environment Setup

### Prerequisites

- Node.js 20.18.0
- Python 3.10.12
- PostgreSQL 14
- MongoDB 6.0
- Redis 7.0

### Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/yourusername/property-management-system.git
cd property-management-system
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client/web
npm install
cd ../mobile
npm install
```

4. Install AI service dependencies:
```bash
cd ../../ai-service
pip install -r requirements.txt
```

5. Set up environment variables:
```bash
cp server/.env.example server/.env
cp client/web/.env.example client/web/.env
cp ai-service/.env.example ai-service/.env
```

6. Set up the database:
```bash
cd ../server
npm run db:setup
```

7. Start the development servers:
```bash
# Start the backend server
npm run dev

# In a new terminal, start the web client
cd ../client/web
npm start

# In a new terminal, start the AI service
cd ../../ai-service
python app.py
```

## Next Implementation Steps

### Step 023: Implement Advanced Accounting Module

#### Tasks
1. Analyze accounting module requirements
2. Design database schema for accounting module
3. Implement rent tracking functionality
4. Implement trust accounting functionality
5. Implement expense management functionality
6. Implement financial reporting functionality
7. Develop AI-powered cash flow prediction
8. Integrate accounting module with existing system
9. Test accounting module functionality
10. Document accounting module implementation

#### Implementation Plan
1. **Database Schema Updates**:
   - Create tables for recurring payments, late fees, trust accounts, expenses, and financial reports
   - Set up MongoDB collections for receipt images and OCR data
   - Implement Redis caching for financial calculations

2. **Service Implementation**:
   - Develop RentTrackingService for managing rent payments and late fees
   - Develop TrustAccountService for handling security deposits and trust accounting
   - Develop ExpenseManagementService for expense tracking and receipt scanning
   - Develop FinancialReportingService for generating financial reports
   - Develop CashFlowPredictionService for AI-powered cash flow prediction

3. **Frontend Implementation**:
   - Create RentTrackingDashboard for managing rent payments
   - Create TrustAccountDashboard for managing trust accounts
   - Create ExpenseManagementDashboard for managing expenses
   - Create FinancialReportingDashboard for viewing financial reports
   - Create CashFlowPredictionDashboard for viewing cash flow predictions

4. **AI Integration**:
   - Train machine learning models for cash flow prediction
   - Implement OCR for receipt scanning
   - Develop error detection algorithms for financial data

5. **Testing**:
   - Write unit tests for all services
   - Perform integration testing for the accounting module
   - Conduct user acceptance testing with stakeholders

## Resources and References

### Documentation
- [System Architecture Documentation](/home/ubuntu/project/handoff_package 3/system_architecture_documentation.md)
- [Database Schema Design](/home/ubuntu/project/handoff_package 3/database_schema_design.md)
- [Implementation Timeline](/home/ubuntu/project/handoff_package 3/implementation_timeline.md)
- [Accounting Module Implementation Plan](/home/ubuntu/project/handoff_package 3/accounting_module_implementation_plan.md)

### External APIs
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Plaid API Documentation](https://plaid.com/docs/api/)
- [Google Maps API Documentation](https://developers.google.com/maps/documentation)
- [HUD API Documentation](https://www.hud.gov/program_offices/public_indian_housing/reac/products/tars/tarssum)

### Deployment
- Web Application: https://xgfxgabn.manus.space/
- API Documentation: https://api.xgfxgabn.manus.space/docs
- Admin Dashboard: https://admin.xgfxgabn.manus.space/

### GitHub Repository
- Repository URL: https://github.com/yourusername/property-management-system
- Branch: main
- Latest Commit: [commit-hash]
