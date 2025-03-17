# Advanced Accounting Module - API Documentation

## Overview

This document provides comprehensive documentation for the Advanced Accounting Module API endpoints. The API follows RESTful principles and uses JSON for data exchange.

## Base URL

- Development: `http://localhost:5000/api/accounting`
- Staging: `https://staging-api.propertymanagement.com/api/accounting`
- Production: `https://api.propertymanagement.com/api/accounting`

## Authentication

All API endpoints (except the health check) require authentication. Include a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Error Handling

The API returns standard HTTP status codes:

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses include a JSON object with error details:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Endpoints

### Health Check

```
GET /health
```

Returns the health status of the Accounting Module.

**Response:**

```json
{
  "status": "ok",
  "module": "Advanced Accounting Module"
}
```

### Rent Tracking Endpoints

#### Get Due Payments

```
GET /payments/due
```

Returns a list of due payments for a property.

**Query Parameters:**

- `propertyId` (required) - ID of the property
- `startDate` (optional) - Start date for filtering payments (YYYY-MM-DD)
- `endDate` (optional) - End date for filtering payments (YYYY-MM-DD)
- `status` (optional) - Filter by payment status ('all', 'pending', 'partial', 'paid', 'waived')

**Response:**

```json
{
  "payments": [
    {
      "id": 1,
      "tenant_name": "John Doe",
      "unit_number": "101",
      "amount": 1000,
      "due_date": "2025-04-01",
      "status": "pending",
      "is_overdue": false,
      "payment_type": "rent",
      "late_fee_amount": null
    }
  ],
  "total": 1
}
```

#### Record Payment

```
POST /payments/record
```

Records a payment for a due payment.

**Request Body:**

```json
{
  "paymentId": 1,
  "amount": 1000,
  "paymentDate": "2025-04-01",
  "paymentMethod": "check",
  "referenceNumber": "12345",
  "notes": "Monthly rent payment"
}
```

**Response:**

```json
{
  "id": 1,
  "tenant_name": "John Doe",
  "amount": 1000,
  "status": "paid",
  "payment_date": "2025-04-01",
  "payment_method": "check",
  "reference_number": "12345"
}
```

#### Get Payment Status

```
GET /payments/status/:leaseId
```

Returns the payment status for a specific lease.

**Path Parameters:**

- `leaseId` (required) - ID of the lease

**Response:**

```json
{
  "lease_id": 1,
  "tenant_name": "John Doe",
  "unit_number": "101",
  "current_balance": 0,
  "past_due_amount": 0,
  "next_payment_date": "2025-05-01",
  "next_payment_amount": 1000,
  "payment_history": [
    {
      "id": 1,
      "amount": 1000,
      "due_date": "2025-04-01",
      "status": "paid",
      "payment_date": "2025-04-01"
    }
  ]
}
```

#### Generate Rent Roll Report

```
GET /reports/rent-roll
```

Generates a rent roll report for a property.

**Query Parameters:**

- `propertyId` (required) - ID of the property
- `startDate` (optional) - Start date for the report (YYYY-MM-DD)
- `endDate` (optional) - End date for the report (YYYY-MM-DD)
- `format` (optional) - Report format ('json', 'csv', 'pdf')

**Response (JSON format):**

```json
{
  "data": [
    {
      "unit_number": "101",
      "tenant_name": "John Doe",
      "lease_start": "2025-01-01",
      "lease_end": "2025-12-31",
      "monthly_rent": 1000,
      "status": "paid"
    }
  ],
  "summary": {
    "totalUnits": 1,
    "totalAmount": 1000,
    "totalPaid": 1000,
    "totalPending": 0,
    "occupancyRate": 100
  }
}
```

### Late Fee Endpoints

#### Get Late Fee Configurations

```
GET /late-fees/configurations
```

Returns late fee configurations for a property.

**Query Parameters:**

- `propertyId` (required) - ID of the property

**Response:**

```json
[
  {
    "id": 1,
    "property_id": 1,
    "grace_period": 5,
    "fee_type": "percentage",
    "fee_amount": 5,
    "max_fee_amount": 100,
    "is_compounding": false,
    "is_active": true
  }
]
```

#### Create Late Fee Configuration

```
POST /late-fees/configurations
```

Creates a new late fee configuration for a property.

**Request Body:**

```json
{
  "propertyId": 1,
  "gracePeriod": 5,
  "feeType": "percentage",
  "feeAmount": 5,
  "maxFeeAmount": 100,
  "isCompounding": false,
  "isActive": true
}
```

**Response:**

```json
{
  "id": 1,
  "property_id": 1,
  "grace_period": 5,
  "fee_type": "percentage",
  "fee_amount": 5,
  "max_fee_amount": 100,
  "is_compounding": false,
  "is_active": true
}
```

#### Apply Late Fee

```
POST /late-fees/apply
```

Applies a late fee to a payment.

**Request Body:**

```json
{
  "paymentId": 1,
  "percentage": 5,
  "amount": null,
  "notes": "Late fee for April rent"
}
```

**Response:**

```json
{
  "id": 1,
  "payment_id": 1,
  "amount": 50,
  "status": "pending",
  "applied_date": "2025-04-06"
}
```

#### Waive Late Fee

```
POST /late-fees/waive
```

Waives a late fee.

**Request Body:**

```json
{
  "lateFeeId": 1,
  "reason": "First-time late payment, waiving as courtesy"
}
```

**Response:**

```json
{
  "id": 1,
  "payment_id": 1,
  "amount": 50,
  "status": "waived",
  "waived_date": "2025-04-06",
  "waived_reason": "First-time late payment, waiving as courtesy"
}
```

### Trust Account Endpoints

#### Get Trust Accounts

```
GET /trust-accounts
```

Returns trust accounts for a property.

**Query Parameters:**

- `propertyId` (required) - ID of the property
- `includeInactive` (optional) - Whether to include inactive accounts
- `accountType` (optional) - Filter by account type ('security_deposit', 'escrow', 'reserve')

**Response:**

```json
[
  {
    "id": 1,
    "property_id": 1,
    "account_name": "Security Deposits",
    "account_number": "123456789",
    "bank_name": "First Bank",
    "account_type": "security_deposit",
    "is_interest_bearing": true,
    "interest_rate": 0.5,
    "balance": "5000.00"
  }
]
```

#### Create Trust Account

```
POST /trust-accounts
```

Creates a new trust account.

**Request Body:**

```json
{
  "propertyId": 1,
  "accountName": "Security Deposits",
  "accountNumber": "123456789",
  "bankName": "First Bank",
  "routingNumber": "987654321",
  "accountType": "security_deposit",
  "isInterestBearing": true,
  "interestRate": 0.5
}
```

**Response:**

```json
{
  "id": 1,
  "property_id": 1,
  "account_name": "Security Deposits",
  "account_number": "123456789",
  "bank_name": "First Bank",
  "routing_number": "987654321",
  "account_type": "security_deposit",
  "is_interest_bearing": true,
  "interest_rate": 0.5,
  "balance": "0.00"
}
```

#### Get Trust Account Transactions

```
GET /trust-accounts/:accountId/transactions
```

Returns transactions for a trust account.

**Path Parameters:**

- `accountId` (required) - ID of the trust account

**Query Parameters:**

- `startDate` (optional) - Start date for filtering transactions (YYYY-MM-DD)
- `endDate` (optional) - End date for filtering transactions (YYYY-MM-DD)
- `transactionType` (optional) - Filter by transaction type ('deposit', 'withdrawal', 'interest', 'fee')
- `includeReconciled` (optional) - Whether to include reconciled transactions

**Response:**

```json
[
  {
    "id": 1,
    "trust_account_id": 1,
    "lease_id": 1,
    "tenant_id": 1,
    "amount": "1000.00",
    "transaction_type": "deposit",
    "transaction_date": "2025-04-01",
    "description": "Security deposit",
    "reference_number": "12345",
    "is_reconciled": false
  }
]
```

#### Record Deposit

```
POST /trust-accounts/:accountId/deposit
```

Records a deposit to a trust account.

**Path Parameters:**

- `accountId` (required) - ID of the trust account

**Request Body:**

```json
{
  "leaseId": 1,
  "tenantId": 1,
  "amount": 1000,
  "transactionDate": "2025-04-01",
  "description": "Security deposit",
  "referenceNumber": "12345",
  "paymentMethod": "check"
}
```

**Response:**

```json
{
  "id": 1,
  "trust_account_id": 1,
  "lease_id": 1,
  "tenant_id": 1,
  "amount": "1000.00",
  "transaction_type": "deposit",
  "transaction_date": "2025-04-01",
  "description": "Security deposit",
  "reference_number": "12345",
  "payment_method": "check"
}
```

#### Record Withdrawal

```
POST /trust-accounts/:accountId/withdrawal
```

Records a withdrawal from a trust account.

**Path Parameters:**

- `accountId` (required) - ID of the trust account

**Request Body:**

```json
{
  "leaseId": 1,
  "tenantId": 1,
  "amount": 1000,
  "transactionDate": "2025-04-01",
  "description": "Security deposit refund",
  "referenceNumber": "12345",
  "paymentMethod": "check"
}
```

**Response:**

```json
{
  "id": 1,
  "trust_account_id": 1,
  "lease_id": 1,
  "tenant_id": 1,
  "amount": "1000.00",
  "transaction_type": "withdrawal",
  "transaction_date": "2025-04-01",
  "description": "Security deposit refund",
  "reference_number": "12345",
  "payment_method": "check"
}
```

#### Generate Trust Account Statement

```
GET /trust-accounts/:accountId/statement
```

Generates a statement for a trust account.

**Path Parameters:**

- `accountId` (required) - ID of the trust account

**Query Parameters:**

- `startDate` (optional) - Start date for the statement (YYYY-MM-DD)
- `endDate` (optional) - End date for the statement (YYYY-MM-DD)
- `format` (optional) - Statement format ('json', 'csv', 'pdf')

**Response (JSON format):**

```json
{
  "account": {
    "id": 1,
    "account_name": "Security Deposits",
    "account_number": "123456789",
    "bank_name": "First Bank",
    "account_type": "security_deposit"
  },
  "transactions": [
    {
      "id": 1,
      "transaction_date": "2025-04-01",
      "description": "Security deposit",
      "amount": "1000.00",
      "transaction_type": "deposit",
      "running_balance": "1000.00"
    }
  ],
  "summary": {
    "opening_balance": "0.00",
    "total_deposits": "1000.00",
    "total_withdrawals": "0.00",
    "total_interest": "0.00",
    "total_fees": "0.00",
    "closing_balance": "1000.00"
  }
}
```

### Expense Management Endpoints

#### Get Expense Categories

```
GET /expense-categories
```

Returns expense categories.

**Query Parameters:**

- `includeInactive` (optional) - Whether to include inactive categories
- `includeHierarchy` (optional) - Whether to include hierarchical structure

**Response:**

```json
[
  {
    "id": 1,
    "name": "Repairs",
    "description": "Property repair expenses",
    "is_tax_deductible": true,
    "parent_category_id": null,
    "is_active": true,
    "subcategories": [
      {
        "id": 2,
        "name": "Plumbing",
        "description": "Plumbing repair expenses",
        "is_tax_deductible": true,
        "parent_category_id": 1,
        "is_active": true
      }
    ]
  }
]
```

#### Create Expense Category

```
POST /expense-categories
```

Creates a new expense category.

**Request Body:**

```json
{
  "name": "Utilities",
  "description": "Utility expenses",
  "isTaxDeductible": true,
  "parentCategoryId": null
}
```

**Response:**

```json
{
  "id": 3,
  "name": "Utilities",
  "description": "Utility expenses",
  "is_tax_deductible": true,
  "parent_category_id": null,
  "is_active": true
}
```

#### Get Expenses

```
GET /expenses
```

Returns expenses based on filters.

**Query Parameters:**

- `propertyId` (optional) - Filter by property ID
- `unitId` (optional) - Filter by unit ID
- `categoryId` (optional) - Filter by category ID
- `vendorId` (optional) - Filter by vendor ID
- `startDate` (optional) - Start date for filtering expenses (YYYY-MM-DD)
- `endDate` (optional) - End date for filtering expenses (YYYY-MM-DD)
- `status` (optional) - Filter by status ('pending', 'paid', 'cancelled', 'disputed')
- `isRecurring` (optional) - Filter by recurring status
- `page` (optional) - Page number for pagination
- `pageSize` (optional) - Number of items per page
- `sortBy` (optional) - Field to sort by
- `sortOrder` (optional) - Sort order ('asc', 'desc')

**Response:**

```json
{
  "expenses": [
    {
      "id": 1,
      "property_id": 1,
      "unit_id": 1,
      "expense_category_id": 1,
      "vendor_id": 1,
      "amount": "100.00",
      "tax_amount": "10.00",
      "transaction_date": "2025-04-01",
      "description": "Plumbing repair",
      "status": "paid"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

#### Record Expense

```
POST /expenses
```

Records a new expense.

**Request Body:**

```json
{
  "propertyId": 1,
  "unitId": 1,
  "expenseCategoryId": 1,
  "vendorId": 1,
  "amount": 100,
  "taxAmount": 10,
  "transactionDate": "2025-04-01",
  "dueDate": "2025-04-15",
  "description": "Plumbing repair",
  "notes": "Emergency repair",
  "status": "pending"
}
```

**Response:**

```json
{
  "id": 1,
  "property_id": 1,
  "unit_id": 1,
  "expense_category_id": 1,
  "vendor_id": 1,
  "amount": "100.00",
  "tax_amount": "10.00",
  "transaction_date": "2025-04-01",
  "due_date": "2025-04-15",
  "description": "Plumbing repair",
  "notes": "Emergency repair",
  "status": "pending"
}
```

#### Get Expense Details

```
GET /expenses/:expenseId
```

Returns details for a specific expense.

**Path Parameters:**

- `expenseId` (required) - ID of the expense

**Response:**

```json
{
  "id": 1,
  "property_id": 1,
  "property_name": "Property Name",
  "unit_id": 1,
  "unit_number": "101",
  "expense_category_id": 1,
  "category_name": "Repairs",
  "vendor_id": 1,
  "vendor_name": "Plumbing Company",
  "amount": "100.00",
  "tax_amount": "10.00",
  "transaction_date": "2025-04-01",
  "due_date": "2025-04-15",
  "payment_date": null,
  "description": "Plumbing repair",
  "notes": "Emergency repair",
  "status": "pending",
  "receipt_image": {
    "id": 1,
    "filename": "receipt.jpg",
    "url": "/api/accounting/expenses/1/receipt"
  }
}
```

#### Mark Expense as Paid

```
POST /expenses/:expenseId/mark-paid
```

Marks an expense as paid.

**Path Parameters:**

- `expenseId` (required) - ID of the expense

**Request Body:**

```json
{
  "paymentDate": "2025-04-10",
  "paymentMethod": "check",
  "referenceNumber": "12345",
  "notes": "Paid in full"
}
```

**Response:**

```json
{
  "id": 1,
  "status": "paid",
  "payment_date": "2025-04-10",
  "payment_method": "check",
  "reference_number": "12345",
  "notes": "Paid in full"
}
```

#### Generate Expense Report

```
GET /reports/expense
```

Generates an expense report.

**Query Parameters:**

- `propertyId` (optional) - Filter by property ID
- `propertyIds` (optional) - Filter by multiple property IDs
- `unitId` (optional) - Filter by unit ID
- `categoryId` (optional) - Filter by category ID
- `vendorId` (optional) - Filter by vendor ID
- `startDate` (required) - Start date for the report (YYYY-MM-DD)
- `endDate` (required) - End date for the report (YYYY-MM-DD)
- `groupBy` (optional) - Group by field ('property', 'unit', 'category', 'vendor', 'month')
- `reportType` (optional) - Report type ('summary', 'detailed')
- `format` (optional) - Report format ('json', 'csv', 'pdf')

**Response (JSON format):**

```json
{
  "data": [
    {
      "category_name": "Repairs",
      "total_amount": "500.00",
      "expense_count": 5
    },
    {
      "category_name": "Utilities",
      "total_amount": "300.00",
      "expense_count": 3
    }
  ],
  "summary": {
    "totalAmount": 800,
    "expenseCount": 8,
    "categoryCount": 2
  }
}
```

### Financial Dashboard Endpoints

#### Get Financial Dashboard Data

```
GET /dashboard
```

Returns financial dashboard data for a property.

**Query Parameters:**

- `propertyId` (required) - ID of the property
- `startDate` (optional) - Start date for the dashboard data (YYYY-MM-DD)
- `e<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>