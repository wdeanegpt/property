# Property Management System API Documentation

This document provides comprehensive documentation for the Property Management System API, focusing on the accounting module endpoints.

## Base URL

All API endpoints are relative to the base URL:

```
https://api.example.com/api/v1
```

## Authentication

Authentication is required for all API endpoints. The API uses JSON Web Tokens (JWT) for authentication.

### Authentication Headers

Include the JWT token in the Authorization header of all requests:

```
Authorization: Bearer <your_jwt_token>
```

### Obtaining a Token

To obtain a JWT token, send a POST request to the `/auth/login` endpoint with your credentials:

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

Response:

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "manager"
  }
}
```

## Error Handling

The API returns standard HTTP status codes to indicate the success or failure of a request.

### Error Response Format

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Error message describing what went wrong"
}
```

### Common Status Codes

- `200 OK`: The request was successful
- `201 Created`: The resource was successfully created
- `400 Bad Request`: The request was malformed or invalid
- `401 Unauthorized`: Authentication is required or failed
- `403 Forbidden`: The authenticated user doesn't have permission
- `404 Not Found`: The requested resource was not found
- `500 Internal Server Error`: An unexpected error occurred on the server

## Rate Limiting

The API implements rate limiting to prevent abuse. The following headers are included in all responses:

- `X-RateLimit-Limit`: The maximum number of requests allowed per window
- `X-RateLimit-Remaining`: The number of requests remaining in the current window
- `X-RateLimit-Reset`: The time when the current window resets, in UTC epoch seconds

## Endpoints

### Rent Tracking

#### Get Recurring Payments

Retrieves all recurring payments for a property.

```http
GET /rent-tracking/recurring-payments?property_id=123
```

Query Parameters:
- `property_id` (required): ID of the property
- `is_active` (optional): Filter by active status (true/false)
- `tenant_id` (optional): Filter by tenant ID

Response:

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "property_id": 123,
      "tenant_id": 456,
      "amount": 1200.00,
      "frequency": "monthly",
      "due_date": "2025-04-01",
      "payment_type": "income",
      "description": "Monthly rent",
      "is_active": true,
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    },
    // ...more recurring payments
  ]
}
```

#### Create Recurring Payment

Creates a new recurring payment.

```http
POST /rent-tracking/recurring-payments
Content-Type: application/json

{
  "property_id": 123,
  "tenant_id": 456,
  "amount": 1200.00,
  "frequency": "monthly",
  "due_date": "2025-04-01",
  "payment_type": "income",
  "description": "Monthly rent",
  "is_active": true
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "property_id": 123,
    "tenant_id": 456,
    "amount": 1200.00,
    "frequency": "monthly",
    "due_date": "2025-04-01",
    "payment_type": "income",
    "description": "Monthly rent",
    "is_active": true,
    "created_at": "2025-03-15T14:30:00Z",
    "updated_at": "2025-03-15T14:30:00Z"
  }
}
```

#### Update Recurring Payment

Updates an existing recurring payment.

```http
PUT /rent-tracking/recurring-payments/:id
Content-Type: application/json

{
  "amount": 1250.00,
  "description": "Monthly rent (updated)",
  "is_active": true
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "property_id": 123,
    "tenant_id": 456,
    "amount": 1250.00,
    "frequency": "monthly",
    "due_date": "2025-04-01",
    "payment_type": "income",
    "description": "Monthly rent (updated)",
    "is_active": true,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-03-15T15:30:00Z"
  }
}
```

#### Delete Recurring Payment

Deletes a recurring payment.

```http
DELETE /rent-tracking/recurring-payments/:id
```

Response:

```json
{
  "status": "success",
  "message": "Recurring payment deleted successfully"
}
```

#### Get Payment History

Retrieves payment history for a property.

```http
GET /rent-tracking/payment-history?property_id=123&limit=20&offset=0
```

Query Parameters:
- `property_id` (required): ID of the property
- `limit` (optional): Number of records to return (default: 20)
- `offset` (optional): Number of records to skip (default: 0)
- `start_date` (optional): Filter by payment date (format: YYYY-MM-DD)
- `end_date` (optional): Filter by payment date (format: YYYY-MM-DD)

Response:

```json
{
  "status": "success",
  "data": {
    "payments": [
      {
        "id": 101,
        "property_id": 123,
        "tenant_id": 456,
        "recurring_payment_id": 1,
        "amount": 1200.00,
        "payment_date": "2025-03-01",
        "payment_method": "bank_transfer",
        "status": "completed",
        "notes": "On-time payment",
        "created_at": "2025-03-01T09:15:00Z",
        "updated_at": "2025-03-01T09:15:00Z"
      },
      // ...more payments
    ],
    "pagination": {
      "total": 24,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

#### Check and Apply Late Fees

Checks for overdue payments and applies late fees automatically.

```http
POST /rent-tracking/check-late-fees
```

Response:

```json
{
  "status": "success",
  "data": {
    "appliedFees": [
      {
        "payment": {
          "id": 2,
          "property_id": 123,
          "tenant_id": 457,
          "amount": 1500.00,
          "frequency": "monthly",
          "due_date": "2025-03-15",
          "payment_type": "income",
          "description": "Monthly rent",
          "is_active": true
        },
        "lateFee": {
          "id": 1,
          "recurring_payment_id": 2,
          "property_id": 123,
          "tenant_id": 457,
          "amount": 75.00,
          "description": "Automatic late fee for payment due on 2025-03-15",
          "status": "pending",
          "created_at": "2025-03-16T00:01:00Z",
          "updated_at": "2025-03-16T00:01:00Z"
        }
      }
    ]
  }
}
```

### Late Fee Management

#### Get Late Fee Configurations

Retrieves late fee configurations for a property.

```http
GET /late-fees/configurations?property_id=123
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "property_id": 123,
    "fee_type": "percentage",
    "fee_value": 5.00,
    "grace_period_days": 3,
    "minimum_fee": 50.00,
    "maximum_fee": 150.00,
    "is_active": true,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  }
}
```

#### Create Late Fee Configuration

Creates a new late fee configuration.

```http
POST /late-fees/configurations
Content-Type: application/json

{
  "property_id": 123,
  "fee_type": "percentage",
  "fee_value": 5.00,
  "grace_period_days": 3,
  "minimum_fee": 50.00,
  "maximum_fee": 150.00,
  "is_active": true
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "property_id": 123,
    "fee_type": "percentage",
    "fee_value": 5.00,
    "grace_period_days": 3,
    "minimum_fee": 50.00,
    "maximum_fee": 150.00,
    "is_active": true,
    "created_at": "2025-03-15T16:00:00Z",
    "updated_at": "2025-03-15T16:00:00Z"
  }
}
```

#### Get Late Fees

Retrieves late fees for a property.

```http
GET /late-fees?property_id=123
```

Query Parameters:
- `property_id` (required): ID of the property
- `tenant_id` (optional): Filter by tenant ID
- `status` (optional): Filter by status (pending, paid, waived)

Response:

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "recurring_payment_id": 2,
      "property_id": 123,
      "tenant_id": 457,
      "amount": 75.00,
      "description": "Automatic late fee for payment due on 2025-03-15",
      "status": "pending",
      "created_at": "2025-03-16T00:01:00Z",
      "updated_at": "2025-03-16T00:01:00Z"
    },
    // ...more late fees
  ]
}
```

### Trust Account Management

#### Get Trust Accounts

Retrieves all trust accounts for a property.

```http
GET /trust-accounts?property_id=123
```

Response:

```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "property_id": 123,
      "name": "Security Deposits",
      "description": "Tenant security deposits",
      "balance": 5250.00,
      "account_type": "escrow",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-03-01T09:00:00Z"
    },
    // ...more trust accounts
  ]
}
```

#### Create Trust Account

Creates a new trust account.

```http
POST /trust-accounts
Content-Type: application/json

{
  "property_id": 123,
  "name": "Maintenance Reserve",
  "description": "Funds reserved for property maintenance",
  "initial_balance": 1000.00,
  "account_type": "reserve"
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 2,
    "property_id": 123,
    "name": "Maintenance Reserve",
    "description": "Funds reserved for property maintenance",
    "balance": 1000.00,
    "account_type": "reserve",
    "created_at": "2025-03-15T16:30:00Z",
    "updated_at": "2025-03-15T16:30:00Z"
  }
}
```

#### Get Trust Account Transactions

Retrieves transactions for a trust account.

```http
GET /trust-accounts/:id/transactions?limit=20&offset=0
```

Query Parameters:
- `limit` (optional): Number of records to return (default: 20)
- `offset` (optional): Number of records to skip (default: 0)
- `start_date` (optional): Filter by transaction date (format: YYYY-MM-DD)
- `end_date` (optional): Filter by transaction date (format: YYYY-MM-DD)
- `transaction_type` (optional): Filter by transaction type (deposit, withdrawal)

Response:

```json
{
  "status": "success",
  "data": {
    "transactions": [
      {
        "id": 1,
        "trust_account_id": 1,
        "amount": 1500.00,
        "transaction_type": "deposit",
        "category": "security_deposit",
        "description": "Security deposit from tenant #101",
        "reference_id": "T101-SD",
        "transaction_date": "2025-02-15",
        "balance_after": 1500.00,
        "created_at": "2025-02-15T14:00:00Z",
        "updated_at": "2025-02-15T14:00:00Z"
      },
      // ...more transactions
    ],
    "pagination": {
      "total": 12,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

#### Create Transaction

Creates a new transaction in a trust account.

```http
POST /trust-accounts/:id/transactions
Content-Type: application/json

{
  "amount": 2000.00,
  "transaction_type": "deposit",
  "category": "security_deposit",
  "description": "Security deposit from tenant #103",
  "reference_id": "T103-SD",
  "transaction_date": "2025-03-01"
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "transaction": {
      "id": 3,
      "trust_account_id": 1,
      "amount": 2000.00,
      "transaction_type": "deposit",
      "category": "security_deposit",
      "description": "Security deposit from tenant #103",
      "reference_id": "T103-SD",
      "transaction_date": "2025-03-01",
      "balance_after": 5250.00,
      "created_at": "2025-03-15T17:00:00Z",
      "updated_at": "2025-03-15T17:00:00Z"
    },
    "account": {
      "id": 1,
      "property_id": 123,
      "name": "Security Deposits",
      "description": "Tenant security deposits",
      "balance": 5250.00,
      "account_type": "escrow",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-03-15T17:00:00Z"
    }
  }
}
```

#### Transfer Between Accounts

Transfers funds between trust accounts.

```http
POST /trust-accounts/transfer
Content-Type: application/json

{
  "from_account_id": 1,
  "to_account_id": 2,
  "amount": 500.00,
  "description": "Transfer to maintenance reserve",
  "reference_id": "TRF-001",
  "transaction_date": "2025-03-15"
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "withdrawal": {
      "id": 4,
      "trust_account_id": 1,
      "amount": 500.00,
      "transaction_type": "withdrawal",
      "category": "transfer",
      "description": "Transfer to maintenance reserve",
      "reference_id": "TRF-001",
      "transaction_date": "2025-03-15",
      "related_account_id": 2,
      "balance_after": 4750.00,
      "created_at": "2025-03-15T17:30:00Z",
      "updated_at": "2025-03-15T17:30:00Z"
    },
    "deposit": {
      "id": 5,
      "trust_account_id": 2,
      "amount": 500.00,
      "transaction_type": "deposit",
      "category": "transfer",
      "description": "Transfer from security deposits",
      "reference_id": "TRF-001",
      "transaction_date": "2025-03-15",
      "related_account_id": 1,
      "balance_after": 1500.00,
      "created_at": "2025-03-15T17:30:00Z",
      "updated_at": "2025-03-15T17:30:00Z"
    },
    "fromAccount": {
      "id": 1,
      "property_id": 123,
      "name": "Security Deposits",
      "description": "Tenant security deposits",
      "balance": 4750.00,
      "account_type": "escrow",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-03-15T17:30:00Z"
    },
    "toAccount": {
      "id": 2,
      "property_id": 123,
      "name": "Maintenance Reserve",
      "description": "Funds reserved for property maintenance",
      "balance": 1500.00,
      "account_type": "reserve",
      "created_at": "2025-03-15T16:30:00Z",
      "updated_at": "2025-03-15T17:30:00Z"
    }
  }
}
```

### Expense Management

#### Get Expenses

Retrieves expenses for a property.

```http
GET /expenses?property_id=123&limit=20&offset=0
```

Query Parameters:
- `property_id` (required): ID of the property
- `limit` (optional): Number of records to return (default: 20)
- `offset` (optional): Number of records to skip (default: 0)
- `start_date` (optional): Filter by transaction date (format: YYYY-MM-DD)
- `end_date` (optional): Filter by transaction date (format: YYYY-MM-DD)
- `category` (optional): Filter by category

Response:

```json
{
  "status": "success",
  "data": {
    "expenses": [
      {
        "id": 1,
        "property_id": 123,
        "amount": 450.00,
        "category": "repairs",
        "vendor": "ABC Plumbing",
        "description": "Plumbing repair - Unit 201",
        "transaction_date": "2025-03-10",
        "payment_method": "check",
        "reference_number": "CHK-1001",
        "receipt_image_id": 101,
        "has_receipt": true,
        "created_at": "2025-03-10T15:00:00Z",
        "updated_at": "2025-03-10T15:00:00Z"
      },
      // ...more expenses
    ],
    "pagination": {
      "total": 15,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

#### Create Expense

Creates a new expense.

```http
POST /expenses
Content-Type: multipart/form-data

{
  "property_id": 123,
  "amount": 350.00,
  "category": "supplies",
  "vendor": "Home Supply Co.",
  "description": "Maintenance supplies",
  "transaction_date": "2025-03-08",
  "payment_method": "credit_card",
  "reference_number": "CC-3457",
  "receipt_image": <file>
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "id": 4,
    "property_id": 123,
    "amount": 350.00,
    "category": "supplies",
    "vendor": "Home Supply Co.",
    "description": "Maintenance supplies",
    "transaction_date": "2025-03-08",
    "payment_method": "credit_card",
    "reference_number": "CC-3457",
    "receipt_image_id": 103,
    "has_receipt": true,
    "created_at": "2025-03-15T18:00:00Z",
    "updated_at": "2025-03-15T18:00:00Z"
  }
}
```

#### Get Receipt Image

Retrieves a receipt image.

```http
GET /expenses/receipts/:id
```

Response:
- Binary imag<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>