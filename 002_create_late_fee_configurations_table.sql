-- Migration: 002_create_late_fee_configurations_table.sql
-- Part of the Advanced Accounting Module implementation
-- Creates the late_fee_configurations table for configuring late fee rules

CREATE TABLE late_fee_configurations (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id),
  fee_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed'
  fee_amount DECIMAL(10,2) NOT NULL, -- percentage or fixed amount
  grace_period_days INTEGER DEFAULT 0,
  maximum_fee DECIMAL(10,2), -- maximum fee amount (for percentage)
  is_compounding BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure fee_amount is positive
  CONSTRAINT positive_fee_amount CHECK (fee_amount > 0),
  
  -- Ensure grace_period_days is non-negative
  CONSTRAINT non_negative_grace_period CHECK (grace_period_days >= 0),
  
  -- Ensure maximum_fee is positive if provided
  CONSTRAINT positive_maximum_fee CHECK (maximum_fee IS NULL OR maximum_fee > 0)
);

-- Create indexes for performance
CREATE INDEX idx_late_fee_configurations_property_id ON late_fee_configurations(property_id);
CREATE INDEX idx_late_fee_configurations_active ON late_fee_configurations(is_active);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_late_fee_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_late_fee_configurations_updated_at
BEFORE UPDATE ON late_fee_configurations
FOR EACH ROW
EXECUTE FUNCTION update_late_fee_configurations_updated_at();

-- Add comments for documentation
COMMENT ON TABLE late_fee_configurations IS 'Stores late fee configuration rules for properties';
COMMENT ON COLUMN late_fee_configurations.fee_type IS 'Type of late fee: percentage or fixed amount';
COMMENT ON COLUMN late_fee_configurations.fee_amount IS 'Amount of late fee (percentage or fixed amount)';
COMMENT ON COLUMN late_fee_configurations.grace_period_days IS 'Number of days after due date before late fee is applied';
COMMENT ON COLUMN late_fee_configurations.maximum_fee IS 'Maximum late fee amount when using percentage (NULL for no maximum)';
COMMENT ON COLUMN late_fee_configurations.is_compounding IS 'Whether late fees compound (can be applied multiple times)';
COMMENT ON COLUMN late_fee_configurations.is_active IS 'Whether this late fee configuration is currently active';
