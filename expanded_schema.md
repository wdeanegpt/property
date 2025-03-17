# Property Management System - Expanded Database Schema

This document outlines the expanded database schema for the Property Management System, including the accounting module tables and related tables from other modules.

## Core Accounting Module Tables

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

### 4. trust_accounts

This table stores trust account information (security deposits, escrow, etc.).

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier for the trust account |
| property_id | INTEGER | NOT NULL, REFERENCES properties(id) | The property this trust account is associated with |
| name | VARCHAR(100) | NOT NULL | Name of the trust account |
| description | TEXT | | Description of the trust account |
| balance | DECIMAL(10,2) | NOT NULL DEFAULT 0 | Current balance of the trust account |
| account_type | VARCHAR(50) | NOT NULL | Type of trust account (escrow, reserve, etc.) |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | When this record was created |
| updated_at | TIMESTAMP | | When this record was last updated |

### 5. trust_account_transactions

This table stores transactions for trust accounts.

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

### 6. expenses

This table stores expense information.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier for the expense |
| property_id | INTEGER | NOT NULL, REFERENCES properties(id) | The property this expense is associated with |
| amount | DECIMAL(10,2) | NOT NULL | Expense amount |
| category | VARCHAR(50) | NOT NULL | Category of the expense |
| vendor | VARCHAR(100) | | Vendor or payee |
| description | TEXT | | Description of the expense |
| transaction_date | DATE | NOT NULL | Date of the expense |
| payment_method | VARCHAR(50) | | Method of payment |
| reference_number | VARCHAR(100) | | Reference number (check number, etc.) |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | When this record was created |
| updated_at | TIMESTAMP | | When this record was last updated |

### 7. receipt_images

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

### 8. payments

This table stores payment records.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier for the payment |
| property_id | INTEGER | NOT NULL, REFERENCES properties(id) | The property this payment is associated with |
| tenant_id | INTEGER | NOT NULL, REFERENCES tenants(id) | The tenant making this payment |
| recurring_payment_id | INTEGER | REFERENCES recurring_payments(id) | Associated recurring payment if applicable |
| amount | DECIMAL(10,2) | NOT NULL | Payment amount |
| payment_date | DATE | NOT NULL | Date of the payment |
| payment_method | VARCHAR(50) | NOT NULL | Method of payment |
| status | VARCHAR(20) | NOT NULL DEFAULT 'completed' | Status of the payment |
| notes | TEXT | | Additional notes |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | When this record was created |
| updated_at | TIMESTAMP | | When this record was last updated |

## Related Module Tables

### 9. properties

This table stores property information.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier for the property |
| name | VARCHAR(100) | NOT NULL | Property name |
| address | VARCHAR(255) | NOT NULL | Property address |
| city | VARCHAR(100) | NOT NULL | City |
| state | VARCHAR(50) | NOT NULL | State or province |
| zip_code | VARCHAR(20) | NOT NULL | ZIP or postal code |
| property_type | VARCHAR(50) | NOT NULL | Type of property |
| units | INTEGER | NOT NULL DEFAULT 1 | Number of units |
| owner_id | INTEGER | REFERENCES users(id) | Property owner |
| manager_id | INTEGER | REFERENCES users(id) | Property manager |
| status | VARCHAR(20) | NOT NULL DEFAULT 'active' | Property status |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | When this record was created |
| updated_at | TIMESTAMP | | When this record was last updated |

### 10. tenants

This table stores tenant information.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier for the tenant |
| user_id | INTEGER | REFERENCES users(id) | Associated user account |
| first_name | VARCHAR(50) | NOT NULL | First name |
| last_name | VARCHAR(50) | NOT NULL | Last name |
| email | VARCHAR(100) | NOT NULL | Email address |
| phone | VARCHAR(20) | | Phone number |
| status | VARCHAR(20) | NOT NULL DEFAULT 'active' | Tenant status |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | When this record was created |
| updated_at | TIMESTAMP | | When this record was last updated |

### 11. leases

This table stores lease information.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier for the lease |
| property_id | INTEGER | NOT NULL, REFERENCES properties(id) | The property this lease is for |
| unit_id | INTEGER | REFERENCES units(id) | The specific unit if applicable |
| tenant_id | INTEGER | NOT NULL, REFERENCES tenants(id) | The tenant on the lease |
| start_date | DATE | NOT NULL | Lease start date |
| end_date | DATE | NOT NULL | Lease end date |
| rent_amount | DECIMAL(10,2) | NOT NULL | Monthly rent amount |
| security_deposit | DECIMAL(10,2) | NOT NULL | Security deposit amount |
| status | VARCHAR(20) | NOT NULL DEFAULT 'active' | Lease status |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | When this record was created |
| updated_at | TIMESTAMP | | When this record was last updated |

### 12. users

This table stores user account information.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Unique identifier for the user |
| username | VARCHAR(50) | NOT NULL UNIQUE | Username |
| email | VARCHAR(100) | NOT NULL UNIQUE | Email address |
| password_hash | VARCHAR(255) | NOT NULL | Hashed password |
| role | VARCHAR(20) | NOT NULL | User role (admin, manager, tenant, owner) |
| status | VARCHAR(20) | NOT NULL DEFAULT 'active' | Account status |
| last_login | TIMESTAMP | | Last login timestamp |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | When this record was created |
| updated_at | TIMESTAMP | | When this record was last updated |

## Relationships

The following diagram illustrates the key relationships between tables:

```
properties ─┬─ recurring_payments ─── late_fees
            │
            ├─ trust_accounts ─── trust_account_transactions
            │
            ├─ expenses ─── receipt_images
            │
            ├─ leases
            │
            └─ units

tenants ────┬─ recurring_payments
            │
            ├─ payments
            │
            ├─ late_fees
            │
            └─ leases

users ─────┬─ tenants
           │
           └─ properties (as owner or manager)
```

## Indexes

In addition to the indexes mentioned in the current schema, the following indexes are recommended for the expanded schema:

```sql
-- For trust_accounts
CREATE INDEX idx_trust_accounts_property_id ON trust_accounts(property_id);

-- For expenses
CREATE INDEX idx_expenses_property_id ON expenses(property_id);
CREATE INDEX idx_expenses_transaction_date ON expenses(transaction_date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- For payments
CREATE INDEX idx_payments_property_id ON payments(property_id);
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_recurring_payment_id ON payments(recurring_payment_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- For properties
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE INDEX idx_properties_manager_id ON properties(manager_id);

-- For tenants
CREATE INDEX idx_tenants_user_id ON tenants(user_id);

-- For leases
CREATE INDEX idx_leases_property_id ON leases(property_id);
CREATE INDEX idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX idx_leases_start_date ON leases(start_date);
CREATE INDEX idx_leases_end_date ON leases(end_date);
```

## Future Expansion

The schema is designed to be extensible for future features:

1. **Maintenance Management**: Add tables for maintenance requests, work orders, and vendor management.
2. **Document Storage**: Expand receipt_images concept to store lease documents, inspection reports, etc.
3. **Reporting**: Add views or materialized views for common reports.
4. **AI Integration**: Add tables for storing prediction data, training data, and model parameters.
5. **Communication**: Add tables for messages, notifications, and communication logs.

## Notes

1. All monetary values are stored as DECIMAL(10,2) to ensure precision in financial calculations.
2. Timestamps are used to track record creation and updates.
3. Foreign key constraints maintain referential integrity.
4. Status fields use enumerated types for consistency.
5. Soft deletion is implemented through status fields rather than actual deletion.
