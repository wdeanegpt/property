-- Migration: 005_create_receipt_images_table.sql
-- Part of the Advanced Accounting Module implementation
-- Creates the receipt_images table for expense receipt scanning and OCR

CREATE TABLE receipt_images (
  id SERIAL PRIMARY KEY,
  expense_id INTEGER REFERENCES expenses(id),
  file_path VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  ocr_processed BOOLEAN DEFAULT FALSE,
  ocr_text TEXT,
  ocr_data JSONB,
  ocr_confidence DECIMAL(5,2),
  ocr_processed_at TIMESTAMP,
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure file_size is positive
  CONSTRAINT positive_file_size CHECK (file_size > 0),
  
  -- Ensure OCR data is consistent
  CONSTRAINT valid_ocr_data CHECK (
    (ocr_processed = FALSE AND ocr_text IS NULL AND ocr_data IS NULL AND ocr_confidence IS NULL AND ocr_processed_at IS NULL) OR
    (ocr_processed = TRUE AND ocr_text IS NOT NULL AND ocr_processed_at IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX idx_receipt_images_expense_id ON receipt_images(expense_id);
CREATE INDEX idx_receipt_images_ocr_processed ON receipt_images(ocr_processed);
CREATE INDEX idx_receipt_images_uploaded_by ON receipt_images(uploaded_by);
CREATE INDEX idx_receipt_images_uploaded_at ON receipt_images(uploaded_at);

-- Add full-text search index for OCR text
CREATE INDEX idx_receipt_images_ocr_text ON receipt_images USING GIN (to_tsvector('english', ocr_text));

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_receipt_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_receipt_images_updated_at
BEFORE UPDATE ON receipt_images
FOR EACH ROW
EXECUTE FUNCTION update_receipt_images_updated_at();

-- Add comments for documentation
COMMENT ON TABLE receipt_images IS 'Stores receipt images for expense tracking with OCR data';
COMMENT ON COLUMN receipt_images.file_path IS 'Path to the stored receipt image file';
COMMENT ON COLUMN receipt_images.mime_type IS 'MIME type of the receipt image file';
COMMENT ON COLUMN receipt_images.ocr_processed IS 'Whether OCR processing has been completed';
COMMENT ON COLUMN receipt_images.ocr_text IS 'Full text extracted from the receipt via OCR';
COMMENT ON COLUMN receipt_images.ocr_data IS 'Structured data extracted from the receipt (JSON format)';
COMMENT ON COLUMN receipt_images.ocr_confidence IS 'Confidence score of the OCR processing (0-100)';
COMMENT ON COLUMN receipt_images.ocr_processed_at IS 'Timestamp when OCR processing was completed';

-- Create table for expense categories
CREATE TABLE expense_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_tax_deductible BOOLEAN DEFAULT TRUE,
  parent_category_id INTEGER REFERENCES expense_categories(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent circular references in parent categories
  CONSTRAINT no_circular_reference CHECK (parent_category_id != id)
);

-- Create indexes for performance
CREATE INDEX idx_expense_categories_parent ON expense_categories(parent_category_id);
CREATE INDEX idx_expense_categories_active ON expense_categories(is_active);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_expense_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_expense_categories_updated_at
BEFORE UPDATE ON expense_categories
FOR EACH ROW
EXECUTE FUNCTION update_expense_categories_updated_at();

-- Add comments for documentation
COMMENT ON TABLE expense_categories IS 'Stores expense categories for expense classification';
COMMENT ON COLUMN expense_categories.is_tax_deductible IS 'Whether expenses in this category are typically tax-deductible';
COMMENT ON COLUMN expense_categories.parent_category_id IS 'Parent category ID for hierarchical categorization';

-- Create table for expenses
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id),
  unit_id INTEGER REFERENCES units(id),
  expense_category_id INTEGER NOT NULL REFERENCES expense_categories(id),
  vendor_id INTEGER REFERENCES vendors(id),
  amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  transaction_date DATE NOT NULL,
  due_date DATE,
  payment_date DATE,
  payment_method VARCHAR(20),
  reference_number VARCHAR(50),
  description TEXT,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_payment_id INTEGER REFERENCES recurring_payments(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'cancelled', 'disputed'
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure amount is positive
  CONSTRAINT positive_expense_amount CHECK (amount > 0),
  
  -- Ensure tax_amount is non-negative
  CONSTRAINT non_negative_tax_amount CHECK (tax_amount >= 0),
  
  -- Ensure status is valid
  CONSTRAINT valid_expense_status CHECK (status IN ('pending', 'paid', 'cancelled', 'disputed')),
  
  -- Ensure payment_date is provided if status is 'paid'
  CONSTRAINT valid_payment_data CHECK (
    (status = 'paid' AND payment_date IS NOT NULL AND payment_method IS NOT NULL) OR
    (status != 'paid')
  ),
  
  -- Ensure recurring data is consistent
  CONSTRAINT valid_recurring_data CHECK (
    (is_recurring = TRUE AND recurring_payment_id IS NOT NULL) OR
    (is_recurring = FALSE)
  )
);

-- Create indexes for performance
CREATE INDEX idx_expenses_property_id ON expenses(property_id);
CREATE INDEX idx_expenses_unit_id ON expenses(unit_id);
CREATE INDEX idx_expenses_category_id ON expenses(expense_category_id);
CREATE INDEX idx_expenses_vendor_id ON expenses(vendor_id);
CREATE INDEX idx_expenses_transaction_date ON expenses(transaction_date);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_recurring ON expenses(is_recurring);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_expenses_updated_at();

-- Add comments for documentation
COMMENT ON TABLE expenses IS 'Stores expense transactions for properties and units';
COMMENT ON COLUMN expenses.tax_amount IS 'Tax amount included in the expense';
COMMENT ON COLUMN expenses.transaction_date IS 'Date when the expense was incurred';
COMMENT ON COLUMN expenses.due_date IS 'Date when the expense payment is due';
COMMENT ON COLUMN expenses.payment_date IS 'Date when the expense was paid';
COMMENT ON COLUMN expenses.is_recurring IS 'Whether this is a recurring expense';
COMMENT ON COLUMN expenses.recurring_payment_id IS 'ID of the associated recurring payment if recurring';
COMMENT ON COLUMN expenses.status IS 'Status of the expense: pending, paid, cancelled, disputed';
