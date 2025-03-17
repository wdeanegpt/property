-- Migration: 001_create_recurring_payments_table.sql
-- Part of the Advanced Accounting Module implementation
-- Creates the recurring_payments table for tracking rent and other recurring payments

CREATE TABLE recurring_payments (
  id SERIAL PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES leases(id),
  payment_type VARCHAR(20) NOT NULL, -- 'rent', 'utility', 'maintenance_fee', etc.
  amount DECIMAL(10,2) NOT NULL,
  frequency VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'annual'
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure due_day is valid for the frequency
  CONSTRAINT valid_due_day CHECK (
    (frequency = 'monthly' AND due_day <= 31) OR
    (frequency = 'quarterly' AND due_day <= 31) OR
    (frequency = 'annual' AND due_day <= 31)
  ),
  
  -- Ensure end_date is after start_date if provided
  CONSTRAINT valid_date_range CHECK (
    end_date IS NULL OR end_date > start_date
  )
);

-- Create indexes for performance
CREATE INDEX idx_recurring_payments_lease_id ON recurring_payments(lease_id);
CREATE INDEX idx_recurring_payments_active ON recurring_payments(is_active);
CREATE INDEX idx_recurring_payments_type ON recurring_payments(payment_type);
CREATE INDEX idx_recurring_payments_dates ON recurring_payments(start_date, end_date);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recurring_payments_updated_at
BEFORE UPDATE ON recurring_payments
FOR EACH ROW
EXECUTE FUNCTION update_recurring_payments_updated_at();

-- Add comments for documentation
COMMENT ON TABLE recurring_payments IS 'Stores recurring payment schedules for leases, including rent and other periodic charges';
COMMENT ON COLUMN recurring_payments.payment_type IS 'Type of payment: rent, utility, maintenance_fee, etc.';
COMMENT ON COLUMN recurring_payments.frequency IS 'Payment frequency: monthly, quarterly, annual';
COMMENT ON COLUMN recurring_payments.due_day IS 'Day of the month/quarter/year when payment is due (1-31)';
COMMENT ON COLUMN recurring_payments.is_active IS 'Whether this recurring payment is currently active';
