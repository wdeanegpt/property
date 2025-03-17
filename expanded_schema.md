# Expanded Database Schema for Comprehensive Property Management System

This schema expands the original HUD-focused application into a comprehensive property management system supporting all 8 core modules.

## PostgreSQL Schema (Structured Data)

### Users (Modified)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  user_type VARCHAR(20) NOT NULL, -- 'tenant', 'landlord', 'admin', 'housing_authority', 'vendor', 'property_manager'
  profile_image_url VARCHAR(255),
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Subscription Plans (New)
```sql
CREATE TABLE subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL, -- 'Free', 'Standard', 'Enterprise'
  description TEXT,
  monthly_base_price DECIMAL(10,2) NOT NULL,
  annual_base_price DECIMAL(10,2),
  unit_price DECIMAL(10,2), -- Price per unit
  min_monthly_price DECIMAL(10,2), -- Minimum monthly charge
  max_units INTEGER, -- Maximum number of units (NULL for unlimited)
  features JSONB, -- JSON array of included features
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Subscriptions (New)
```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  landlord_id INTEGER REFERENCES landlords(id),
  plan_id INTEGER REFERENCES subscription_plans(id),
  start_date DATE NOT NULL,
  end_date DATE,
  billing_cycle VARCHAR(20) NOT NULL, -- 'monthly', 'annual'
  status VARCHAR(20) NOT NULL, -- 'active', 'canceled', 'past_due', 'trial'
  trial_end_date DATE,
  current_units INTEGER NOT NULL DEFAULT 0,
  current_price DECIMAL(10,2) NOT NULL,
  auto_renew BOOLEAN DEFAULT TRUE,
  payment_method_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Billing (New)
```sql
CREATE TABLE billing (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES subscriptions(id),
  landlord_id INTEGER REFERENCES landlords(id),
  amount DECIMAL(10,2) NOT NULL,
  billing_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'pending', 'paid', 'past_due', 'canceled'
  payment_date DATE,
  payment_method VARCHAR(50),
  invoice_number VARCHAR(50) UNIQUE,
  invoice_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Payment Methods (New)
```sql
CREATE TABLE payment_methods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  payment_type VARCHAR(20) NOT NULL, -- 'credit_card', 'bank_account', 'paypal'
  provider VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', etc.
  account_number VARCHAR(255), -- Encrypted or last 4 digits
  expiration_date DATE,
  is_default BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Landlords (Modified)
```sql
CREATE TABLE landlords (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  company_name VARCHAR(255),
  tax_id VARCHAR(20),
  accepts_section8 BOOLEAN DEFAULT FALSE,
  business_address_line1 VARCHAR(255),
  business_address_line2 VARCHAR(255),
  business_city VARCHAR(100),
  business_state VARCHAR(2),
  business_zip VARCHAR(10),
  business_phone VARCHAR(20),
  business_email VARCHAR(255),
  website VARCHAR(255),
  logo_url VARCHAR(255),
  subscription_id INTEGER REFERENCES subscriptions(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Properties (Modified)
```sql
CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  landlord_id INTEGER REFERENCES landlords(id),
  property_name VARCHAR(255),
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip VARCHAR(10) NOT NULL,
  property_type VARCHAR(50) NOT NULL, -- 'apartment', 'house', 'duplex', etc.
  year_built INTEGER,
  total_units INTEGER DEFAULT 1,
  total_floors INTEGER,
  total_square_feet INTEGER,
  amenities JSONB, -- JSON array of amenities
  parking_spaces INTEGER,
  has_pool BOOLEAN DEFAULT FALSE,
  has_gym BOOLEAN DEFAULT FALSE,
  has_laundry BOOLEAN DEFAULT FALSE,
  has_security BOOLEAN DEFAULT FALSE,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'under_maintenance'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Units (Modified)
```sql
CREATE TABLE units (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id),
  unit_number VARCHAR(20),
  floor_number INTEGER,
  bedrooms INTEGER NOT NULL,
  bathrooms DECIMAL(3,1) NOT NULL,
  square_feet INTEGER,
  monthly_rent DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2),
  is_furnished BOOLEAN DEFAULT FALSE,
  has_washer_dryer BOOLEAN DEFAULT FALSE,
  has_balcony BOOLEAN DEFAULT FALSE,
  has_dishwasher BOOLEAN DEFAULT FALSE,
  utilities_included JSONB, -- JSON array of included utilities
  status VARCHAR(20) NOT NULL DEFAULT 'available', -- 'available', 'occupied', 'maintenance', 'reserved'
  available_from DATE,
  listing_title VARCHAR(255),
  listing_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tenants (Modified)
```sql
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  household_size INTEGER,
  annual_income DECIMAL(12,2),
  has_section8_voucher BOOLEAN DEFAULT FALSE,
  voucher_amount DECIMAL(12,2),
  housing_authority_id INTEGER REFERENCES housing_authorities(id),
  employment_status VARCHAR(50),
  employer_name VARCHAR(255),
  employer_phone VARCHAR(20),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relationship VARCHAR(100),
  credit_score INTEGER,
  background_check_status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Leases (Modified)
```sql
CREATE TABLE leases (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  unit_id INTEGER REFERENCES units(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent DECIMAL(10,2) NOT NULL,
  security_deposit DECIMAL(10,2) NOT NULL,
  lease_type VARCHAR(50) NOT NULL, -- 'fixed', 'month-to-month', 'week-to-week'
  status VARCHAR(20) NOT NULL, -- 'active', 'expired', 'terminated', 'renewal_offered'
  rent_due_day INTEGER NOT NULL DEFAULT 1,
  late_fee_amount DECIMAL(10,2),
  late_fee_days INTEGER, -- Days after due date when late fee applies
  is_cosigned BOOLEAN DEFAULT FALSE,
  cosigner_id INTEGER REFERENCES users(id),
  renewal_offered_date DATE,
  renewal_deadline_date DATE,
  move_out_date DATE,
  move_out_inspection_date DATE,
  special_terms TEXT,
  document_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Payments (Modified)
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  lease_id INTEGER REFERENCES leases(id),
  tenant_id INTEGER REFERENCES tenants(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_type VARCHAR(20) NOT NULL, -- 'rent', 'security_deposit', 'late_fee', 'utility', 'maintenance'
  payment_method VARCHAR(20) NOT NULL, -- 'check', 'cash', 'online', 'bank_transfer', 'credit_card'
  transaction_id VARCHAR(255),
  payment_status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
  reference_number VARCHAR(100),
  memo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Maintenance Requests (New)
```sql
CREATE TABLE maintenance_requests (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  unit_id INTEGER REFERENCES units(id),
  category VARCHAR(50) NOT NULL, -- 'plumbing', 'electrical', 'appliance', etc.
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL, -- 'emergency', 'urgent', 'normal', 'low'
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'assigned', 'in_progress', 'completed', 'canceled'
  permission_to_enter BOOLEAN DEFAULT FALSE,
  preferred_entry_date DATE,
  preferred_entry_time_range VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  tenant_satisfaction INTEGER -- 1-5 rating
);
```

### Work Orders (New)
```sql
CREATE TABLE work_orders (
  id SERIAL PRIMARY KEY,
  maintenance_request_id INTEGER REFERENCES maintenance_requests(id),
  vendor_id INTEGER REFERENCES vendors(id),
  assigned_by INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  scheduled_date DATE,
  scheduled_time_range VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed', 'canceled'
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
```

### Vendors (New)
```sql
CREATE TABLE vendors (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(10),
  service_category VARCHAR(50) NOT NULL, -- 'plumbing', 'electrical', 'cleaning', etc.
  hourly_rate DECIMAL(10,2),
  is_preferred BOOLEAN DEFAULT FALSE,
  insurance_info TEXT,
  license_number VARCHAR(100),
  tax_id VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Inventory (New)
```sql
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id),
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'appliance', 'tool', 'supply', etc.
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  purchase_date DATE,
  supplier VARCHAR(255),
  model_number VARCHAR(100),
  serial_number VARCHAR(100),
  warranty_expiration DATE,
  location VARCHAR(255), -- Where the item is stored
  status VARCHAR(20) DEFAULT 'available', -- 'available', 'in_use', 'maintenance', 'depleted'
  minimum_quantity INTEGER DEFAULT 1, -- For reorder alerts
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Inspections (New)
```sql
CREATE TABLE inspections (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER REFERENCES units(id),
  inspector_id INTEGER REFERENCES users(id),
  inspection_type VARCHAR(50) NOT NULL, -- 'move_in', 'move_out', 'routine', 'hqs'
  scheduled_date DATE NOT NULL,
  scheduled_time_range VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'completed', 'canceled', 'failed'
  notes TEXT,
  passed BOOLEAN,
  reinspection_needed BOOLEAN DEFAULT FALSE,
  reinspection_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
```

### Inspection Items (New)
```sql
CREATE TABLE inspection_items (
  id SERIAL PRIMARY KEY,
  inspection_id INTEGER REFERENCES inspections(id),
  category VARCHAR(50) NOT NULL, -- 'kitchen', 'bathroom', 'bedroom', etc.
  item_name VARCHAR(255) NOT NULL,
  condition VARCHAR(20) NOT NULL, -- 'excellent', 'good', 'fair', 'poor'
  notes TEXT,
  photo_urls JSONB, -- JSON array of photo URLs
  requires_attention BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Marketing Listings (New)
```sql
CREATE TABLE marketing_listings (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER REFERENCES units(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  monthly_rent DECIMAL(10,2) NOT NULL,
  security_deposit DECIMAL(10,2),
  lease_terms TEXT,
  available_from DATE,
  featured BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'pending', 'rented', 'inactive'
  external_listing_urls JSONB, -- JSON object with URLs to external listing sites
  virtual_tour_url VARCHAR(255),
  application_fee DECIMAL(10,2),
  pet_policy TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Listing Photos (New)
```sql
CREATE TABLE listing_photos (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER REFERENCES marketing_listings(id),
  photo_url VARCHAR(255) NOT NULL,
  caption VARCHAR(255),
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Leads (New)
```sql
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER REFERENCES marketing_listings(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  contact_preference VARCHAR(20) DEFAULT 'email', -- 'email', 'phone', 'text'
  status VARCHAR(20) NOT NULL DEFAULT 'new', -- 'new', 'contacted', 'showing_scheduled', 'application_sent', 'converted', 'lost'
  source VARCHAR(50), -- 'website', 'zillow', 'referral', etc.
  notes TEXT,
  desired_move_in_date DATE,
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  bedrooms_desired INTEGER,
  bathrooms_desired DECIMAL(3,1),
  pets BOOLEAN,
  pet_details TEXT,
  assigned_to INTEGER REFERENCES users(id),
  lead_score INTEGER, -- AI-calculated score 1-100
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_contacted_at TIMESTAMP
);
```

### Lead Activities (New)
```sql
CREATE TABLE lead_activities (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id),
  user_id INTEGER REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL, -- 'email', 'call', 'showing', 'application', 'note'
  description TEXT,
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP,
  outcome VARCHAR(50), -- 'successful', 'no_answer', 'rescheduled', etc.
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Financial Accounts (New)
```sql
CREATE TABLE financial_accounts (
  id SERIAL PRIMARY KEY,
  landlord_id INTEGER REFERENCES landlords(id),
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL, -- 'operating', 'security_deposit', 'reserve', 'tax'
  account_number VARCHAR(255),
  bank_name VARCHAR(255),
  routing_number VARCHAR(50),
  current_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Financial Transactions (New)
```sql
CREATE TABLE financial_transactions (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES financial_accounts(id),
  property_id INTEGER REFERENCES properties(id),
  unit_id INTEGER REFERENCES units(id),
  category VARCHAR(50) NOT NULL, -- 'rent', 'deposit', 'maintenance', 'utility', 'tax', 'insurance', etc.
  subcategory VARCHAR(50),
  amount DECIMAL(12,2) NOT NULL,
  transaction_type VARCHAR(10) NOT NULL, -- 'income', 'expense'
  transaction_date DATE NOT NULL,
  description TEXT,
  payment_method VARCHAR(50),
  reference_number VAR<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>