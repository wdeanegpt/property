# Property Management System - Current Database Schema

This document outlines the current database schema for the Property Management System, focusing on the accounting module tables.

## Database Tables

### 1. recurring_payments

This table stores information about recurring payments such as rent, maintenance fees, etc.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier for the recurring payment |
| property_id | INTEGER | NOT NULL, REFERENCES properties(id) | The property this payment is associated with |
| tenant_id | INTEGER | NOT NULL, REFERENCES tenants(id) | The tenant responsible for this payment |
| amount | DECIMAL(10,2) | NOT NULL | Payment amount |
| frequency | VARCHAR(20) | NOT NULL | Payment frequency (monthly, quarterly, annual, one-time) |
| due_date | DATE | NOT NULL | Date when payment is due |
| payment_type | VARCHAR(20) | NOT NULL | Type of payment (income, expense) |
| description | TEXT | | Description of the recurring payment |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | Whether this recurring payment is active |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | When this record was created |
| updated_at | TIMESTAMP | | When this record was last updated |

### 2. late_fee_configurations

This table stores configurations for late fee calculations.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier for the late fee configuration |
| property_id | INTEGER | NOT NULL, REFERENCES properties(id) | The property this configuration applies to |
| fee_type | VARCHAR(20) | NOT NULL | Type of fee (percentage, fixed) |
| fee_value | DECIMAL(10,2) | NOT NULL | Fee amount or percentage |
| grace_period_days | INTEGER | NOT NULL DEFAULT 0 | Number of days after due date before late fee applies |
| minimum_fee | DECIMAL(10,2) | | Minimum fee amount (for percentage-based fees) |
| maximum_fee | DECIMAL(10,2) | | Maximum fee amount (for percentage-based fees) |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | Whether this configuration is active |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | When this record was created |
| updated_at | TIMESTAMP | | When this record was last updated |

### 3. late_fees

This table stores instances of late fees applied to payments.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier for the late fee |
| recurring_payment_id | INTEGER | NOT NULL, REFERENCES recurring_payments(id) | The payment this late fee is associated with |
| property_id | INTEGER | NOT NULL, REFERENCES properties(id) | The property this late fee is associated with |
| tenant_id | INTEGER | NOT NULL, REFERENCES tenants(id) | The tenant this late fee is associated with |
| amount | DECIMAL(10,2) | NOT NULL | Late fee amount |
| description | TEXT | | Description of the late fee |
| status | VARCHAR(20) | NOT NULL DEFAULT 'pending' | Status of the late fee (pending, paid, waived) |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | When this record was created |
| updated_at | TIMESTAMP | | When this record was last updated |

### 4. trust_account_transactions

This table stores transactions for trust accounts (security deposits, escrow, etc.).

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier for the transaction |
| trust_account_id | INTEGER | NOT NULL, REFERENCES trust_accounts(id) | The trust account this transaction belongs to |
| amount | DECIMAL(10,2) | NOT NULL | Transaction amount |
| transaction_type | VARCHAR(20) | NOT NULL | Type of transaction (deposit, withdrawal) |
| category | VARCHAR(50) | | Category of the transaction |
| description | TEXT | | Description of the transaction |
| reference_id | VARCHAR(100) | | External reference ID |
| transaction_date | DATE | NOT NULL | Date of the transaction |
| related_account_id | INTEGER | REFERENCES trust_accounts(id) | Related trust account for transfers |
| balance_after | DECIMAL(10,2) | NOT NULL | Account balance after this transaction |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | When this record was created |
| updated_at | TIMESTAMP | | When this record was last updated |

### 5. receipt_images

This table stores receipt images for expense tracking.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier for the receipt image |
| expense_id | INTEGER | REFERENCES expenses(id) | The expense this receipt is associated with |
| file_path | VARCHAR(255) | NOT NULL | Path to the stored image file |
| file_name | VARCHAR(255) | NOT NULL | Original filename |
| file_type | VARCHAR(50) | NOT NULL | File MIME type |
| file_size | INTEGER | NOT NULL | File size in bytes |
| upload_date | TIMESTAMP | NOT NULL DEFAULT NOW() | When this file was uploaded |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | When this record was created |
| updated_at | TIMESTAMP | | When this record was last updated |

## Related Tables (Referenced but not fully defined)

These tables are referenced in the schema above but are part of other modules:

- **properties**: Stores property information
- **tenants**: Stores tenant information
- **trust_accounts**: Stores trust account information
- **expenses**: Stores expense information

## Indexes

The following indexes are recommended for performance optimization:

```sql
-- For recurring_payments
CREATE INDEX idx_recurring_payments_property_id ON recurring_payments(property_id);
CREATE INDEX idx_recurring_payments_tenant_id ON recurring_payments(tenant_id);
CREATE INDEX idx_recurring_payments_due_date ON recurring_payments(due_date);

-- For late_fees
CREATE INDEX idx_late_fees_recurring_payment_id ON late_fees(recurring_payment_id);
CREATE INDEX idx_late_fees_property_id ON late_fees(property_id);
CREATE INDEX idx_late_fees_tenant_id ON late_fees(tenant_id);

-- For trust_account_transactions
CREATE INDEX idx_trust_account_transactions_trust_account_id ON trust_account_transactions(trust_account_id);
CREATE INDEX idx_trust_account_transactions_transaction_date ON trust_account_transactions(transaction_date);

-- For receipt_images
CREATE INDEX idx_receipt_images_expense_id ON receipt_images(expense_id);
```

## Constraints

Foreign key constraints are defined to maintain referential integrity between tables. Cascade delete is not implemented to prevent accidental data loss; instead, applications should handle deletion of related records explicitly.

## Notes

1. All monetary values are stored as DECIMAL(10,2) to ensure precision in financial calculations.
2. Timestamps are used to track record creation and updates.
3. Soft deletion is not implemented at the database level; applications should set is_active = FALSE instead of deleting records.
