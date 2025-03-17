-- Migration: 003_create_late_fees_table.sql
-- Part of the Advanced Accounting Module implementation
-- Creates the late_fees table for tracking applied late fees

CREATE TABLE late_fees (
  id SERIAL PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES leases(id),
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  unit_id INTEGER NOT NULL REFERENCES units(id),
  property_id INTEGER NOT NULL REFERENCES properties(id),
  late_fee_config_id INTEGER NOT NULL REFERENCES late_fee_configurations(id),
  recurring_payment_id INTEGER NOT NULL REFERENCES recurring_payments(id),
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  days_late INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'waived', 'cancelled'
  waived_reason TEXT,
  waived_by INTEGER REFERENCES users(id),
  waived_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure amount is positive
  CONSTRAINT positive_late_fee_amount CHECK (amount > 0),
  
  -- Ensure days_late is positive
  CONSTRAINT positive_days_late CHECK (days_late > 0),
  
  -- Ensure status is valid
  CONSTRAINT valid_late_fee_status CHECK (status IN ('pending', 'paid', 'waived', 'cancelled')),
  
  -- Ensure waived_reason, waived_by, and waived_at are all set if status is 'waived'
  CONSTRAINT valid_waived_data CHECK (
    (status = 'waived' AND waived_reason IS NOT NULL AND waived_by IS NOT NULL AND waived_at IS NOT NULL) OR
    (status != 'waived')
  )
);

-- Create indexes for performance
CREATE INDEX idx_late_fees_lease_id ON late_fees(lease_id);
CREATE INDEX idx_late_fees_tenant_id ON late_fees(tenant_id);
CREATE INDEX idx_late_fees_property_id ON late_fees(property_id);
CREATE INDEX idx_late_fees_status ON late_fees(status);
CREATE INDEX idx_late_fees_due_date ON late_fees(due_date);
CREATE INDEX idx_late_fees_recurring_payment_id ON late_fees(recurring_payment_id);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_late_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_late_fees_updated_at
BEFORE UPDATE ON late_fees
FOR EACH ROW
EXECUTE FUNCTION update_late_fees_updated_at();

-- Add comments for documentation
COMMENT ON TABLE late_fees IS 'Stores late fees applied to overdue payments';
COMMENT ON COLUMN late_fees.status IS 'Status of the late fee: pending, paid, waived, cancelled';
COMMENT ON COLUMN late_fees.days_late IS 'Number of days the payment was late when the fee was applied';
COMMENT ON COLUMN late_fees.waived_reason IS 'Reason for waiving the late fee if status is waived';
COMMENT ON COLUMN late_fees.waived_by IS 'User ID who waived the late fee if status is waived';
COMMENT ON COLUMN late_fees.waived_at IS 'Timestamp when the late fee was waived if status is waived';
