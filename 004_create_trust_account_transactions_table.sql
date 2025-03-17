-- Migration: 004_create_trust_account_transactions_table.sql
-- Part of the Advanced Accounting Module implementation
-- Creates the trust_account_transactions table for tracking security deposits and trust funds

CREATE TABLE trust_accounts (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id),
  account_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50),
  bank_name VARCHAR(100),
  routing_number VARCHAR(20),
  account_type VARCHAR(20) NOT NULL, -- 'security_deposit', 'escrow', 'reserve'
  is_interest_bearing BOOLEAN DEFAULT FALSE,
  interest_rate DECIMAL(5,3),
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure balance is non-negative
  CONSTRAINT non_negative_balance CHECK (balance >= 0),
  
  -- Ensure interest_rate is positive if account is interest-bearing
  CONSTRAINT valid_interest_rate CHECK (
    (is_interest_bearing = FALSE) OR 
    (is_interest_bearing = TRUE AND interest_rate > 0)
  )
);

CREATE TABLE trust_account_transactions (
  id SERIAL PRIMARY KEY,
  trust_account_id INTEGER NOT NULL REFERENCES trust_accounts(id),
  lease_id INTEGER REFERENCES leases(id),
  tenant_id INTEGER REFERENCES tenants(id),
  transaction_type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal', 'interest', 'fee'
  amount DECIMAL(10,2) NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  reference_number VARCHAR(50),
  payment_method VARCHAR(20),
  is_reconciled BOOLEAN DEFAULT FALSE,
  reconciled_date DATE,
  reconciled_by INTEGER REFERENCES users(id),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure amount is non-zero
  CONSTRAINT non_zero_amount CHECK (amount <> 0),
  
  -- Ensure transaction_type is valid
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('deposit', 'withdrawal', 'interest', 'fee')),
  
  -- Ensure reconciled data is consistent
  CONSTRAINT valid_reconciled_data CHECK (
    (is_reconciled = FALSE AND reconciled_date IS NULL AND reconciled_by IS NULL) OR
    (is_reconciled = TRUE AND reconciled_date IS NOT NULL AND reconciled_by IS NOT NULL)
  ),
  
  -- Ensure tenant_id is provided for security deposit transactions
  CONSTRAINT valid_tenant_data CHECK (
    (transaction_type IN ('deposit', 'withdrawal') AND tenant_id IS NOT NULL) OR
    (transaction_type IN ('interest', 'fee'))
  )
);

-- Create indexes for performance
CREATE INDEX idx_trust_accounts_property_id ON trust_accounts(property_id);
CREATE INDEX idx_trust_accounts_active ON trust_accounts(is_active);
CREATE INDEX idx_trust_accounts_type ON trust_accounts(account_type);

CREATE INDEX idx_trust_account_transactions_account_id ON trust_account_transactions(trust_account_id);
CREATE INDEX idx_trust_account_transactions_lease_id ON trust_account_transactions(lease_id);
CREATE INDEX idx_trust_account_transactions_tenant_id ON trust_account_transactions(tenant_id);
CREATE INDEX idx_trust_account_transactions_type ON trust_account_transactions(transaction_type);
CREATE INDEX idx_trust_account_transactions_date ON trust_account_transactions(transaction_date);
CREATE INDEX idx_trust_account_transactions_reconciled ON trust_account_transactions(is_reconciled);

-- Add triggers to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_trust_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trust_accounts_updated_at
BEFORE UPDATE ON trust_accounts
FOR EACH ROW
EXECUTE FUNCTION update_trust_accounts_updated_at();

CREATE OR REPLACE FUNCTION update_trust_account_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trust_account_transactions_updated_at
BEFORE UPDATE ON trust_account_transactions
FOR EACH ROW
EXECUTE FUNCTION update_trust_account_transactions_updated_at();

-- Add trigger to update trust account balance on transaction
CREATE OR REPLACE FUNCTION update_trust_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type IN ('deposit', 'interest') THEN
      UPDATE trust_accounts SET balance = balance + NEW.amount WHERE id = NEW.trust_account_id;
    ELSIF NEW.transaction_type IN ('withdrawal', 'fee') THEN
      UPDATE trust_accounts SET balance = balance - NEW.amount WHERE id = NEW.trust_account_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.transaction_type IN ('deposit', 'interest') THEN
      UPDATE trust_accounts SET balance = balance - OLD.amount WHERE id = OLD.trust_account_id;
    ELSIF OLD.transaction_type IN ('withdrawal', 'fee') THEN
      UPDATE trust_accounts SET balance = balance + OLD.amount WHERE id = OLD.trust_account_id;
    END IF;
    
    IF NEW.transaction_type IN ('deposit', 'interest') THEN
      UPDATE trust_accounts SET balance = balance + NEW.amount WHERE id = NEW.trust_account_id;
    ELSIF NEW.transaction_type IN ('withdrawal', 'fee') THEN
      UPDATE trust_accounts SET balance = balance - NEW.amount WHERE id = NEW.trust_account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.transaction_type IN ('deposit', 'interest') THEN
      UPDATE trust_accounts SET balance = balance - OLD.amount WHERE id = OLD.trust_account_id;
    ELSIF OLD.transaction_type IN ('withdrawal', 'fee') THEN
      UPDATE trust_accounts SET balance = balance + OLD.amount WHERE id = OLD.trust_account_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trust_account_balance
AFTER INSERT OR UPDATE OR DELETE ON trust_account_transactions
FOR EACH ROW
EXECUTE FUNCTION update_trust_account_balance();

-- Add comments for documentation
COMMENT ON TABLE trust_accounts IS 'Stores trust accounts for properties (security deposits, escrow, reserves)';
COMMENT ON COLUMN trust_accounts.account_type IS 'Type of trust account: security_deposit, escrow, reserve';
COMMENT ON COLUMN trust_accounts.is_interest_bearing IS 'Whether the account earns interest';
COMMENT ON COLUMN trust_accounts.interest_rate IS 'Annual interest rate for interest-bearing accounts';
COMMENT ON COLUMN trust_accounts.balance IS 'Current balance of the trust account';

COMMENT ON TABLE trust_account_transactions IS 'Stores transactions for trust accounts';
COMMENT ON COLUMN trust_account_transactions.transaction_type IS 'Type of transaction: deposit, withdrawal, interest, fee';
COMMENT ON COLUMN trust_account_transactions.is_reconciled IS 'Whether the transaction has been reconciled with bank statements';
COMMENT ON COLUMN trust_account_transactions.reconciled_date IS 'Date when the transaction was reconciled';
COMMENT ON COLUMN trust_account_transactions.reconciled_by IS 'User ID who reconciled the transaction';
