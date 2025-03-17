# Development Environment Setup for Accounting Module

## Overview

This document outlines the development environment setup for implementing the Advanced Accounting Module (Phase 6) of the Comprehensive Property Management System. The setup includes examining the existing project structure, installing necessary dependencies, and understanding the current accounting-related components.

## Project Structure

The project is organized as follows:

```
/home/ubuntu/project/property-management-system/
├── accounting-module/
│   ├── AccountingDashboard.jsx
│   ├── AccountingIntegrationService.js
│   ├── AccountingSummary.jsx
│   ├── ErrorDetectionService.js
│   ├── ExpenseBreakdownWidget.jsx
│   ├── ExpenseManagementService.js
│   ├── PaymentPlanService.js
│   ├── PaymentService.js
│   └── TrustAccountService.js
├── database/
│   ├── current_schema.md
│   ├── database-integration-controller.js
│   ├── database-integration-service.js
│   ├── database-integration-utility.js
│   ├── database-schema-design.md
│   ├── database_schema_modifications.md
│   ├── expanded_schema.md
│   ├── mongodb_schema_implementation.js
│   ├── postgresql_schema_implementation.sql
│   └── test_database_schema.js
├── documentation/
├── pricing-module/
└── other files...
```

## Dependencies Installation

The following dependencies have been installed for the project:

```bash
npm install express mongoose react react-dom axios redux react-redux @material-ui/core chart.js jsonwebtoken bcrypt dotenv cors --legacy-peer-deps
```

Note: The `--legacy-peer-deps` flag was used to resolve dependency conflicts.

## Database Schema

### Current Schema

The current database schema includes:

1. **PostgreSQL Tables**:
   - Users and Authentication: users, user_roles, sessions
   - Properties and Units: properties, units, amenities
   - Tenants and Leases: tenants, leases, lease_tenants
   - Financial Management: payments, transactions
   - HUD Integration: hud_forms, housing_authorities

2. **MongoDB Collections**:
   - Documents Collection: Stores documents and files with metadata
   - Form Data Collection: Stores JSON representation of form data
   - Messages Collection: Manages communication between users
   - Activity Logs Collection: Tracks user actions

3. **Redis Caching**:
   - Session Data
   - Form Progress
   - Application Status
   - Notification Queue

### Expanded Schema

The expanded schema includes additional tables to support the comprehensive property management system:

1. **New PostgreSQL Tables**:
   - Subscription Plans
   - Subscriptions
   - Billing
   - Payment Methods

2. **Modified Tables**:
   - Enhanced Users table with additional fields
   - Enhanced Landlords table with business information
   - Enhanced Properties table with amenities
   - Enhanced Units table with more details
   - Enhanced Tenants table with employment information
   - Enhanced Leases table with renewal information
   - Enhanced Payments table with more payment types

## Existing Accounting Module Components

### TrustAccountService.js

This service handles trust accounting with separate ledgers. Key features include:

- Creating and managing trust accounts
- Handling security deposits, prepaid rent, and repair escrows
- Implementing state-specific compliance rules
- Managing interest-bearing accounts

### ExpenseManagementService.js

This service handles expense management functionality. Key features include:

- Creating and categorizing expenses
- Managing expense receipts with Google Cloud Storage integration
- Integrating with accounting software
- Tracking tax-deductible expenses

### AccountingDashboard.jsx

This React component serves as the main dashboard for the accounting module. Key features include:

- Displaying key financial metrics
- Showing recent transactions
- Providing widgets for common accounting tasks:
  - Accounting Summary
  - Rent Collection Widget
  - Expense Breakdown Widget
  - Cash Flow Prediction Widget
  - Accounting Errors Widget
  - Recent Transactions Widget
  - Upcoming Payments Widget

## Next Steps

With the development environment set up and a thorough understanding of the existing accounting-related components, we are ready to create a detailed implementation plan for the Advanced Accounting Module. This plan will outline the specific features to be implemented, including:

1. Rent tracking with automated late fees
2. Trust accounting with separate ledgers
3. Expense management with receipt scanning
4. Financial reporting and tax preparation
5. AI-powered cash flow prediction and error detection

The implementation will build upon the existing components while adding new functionality to create a comprehensive accounting solution for property management.
