# Current Database Schema

## PostgreSQL Schema (Structured Data)

### Users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  user_type VARCHAR(20) NOT NULL, -- 'tenant', 'landlord', 'admin', 'housing_authority'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tenants
```sql
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  household_size INTEGER,
  annual_income DECIMAL(12,2),
  has_section8_voucher BOOLEAN DEFAULT FALSE,
  voucher_amount DECIMAL(12,2),
  housing_authority_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Landlords
```sql
CREATE TABLE landlords (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  company_name VARCHAR(255),
  tax_id VARCHAR(20),
  accepts_section8 BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Properties
```sql
CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  landlord_id INTEGER REFERENCES landlords(id),
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip VARCHAR(10) NOT NULL,
  property_type VARCHAR(50) NOT NULL, -- 'apartment', 'house', 'duplex', etc.
  year_built INTEGER,
  total_units INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Units
```sql
CREATE TABLE units (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id),
  unit_number VARCHAR(20),
  bedrooms INTEGER NOT NULL,
  bathrooms DECIMAL(3,1) NOT NULL,
  square_feet INTEGER,
  monthly_rent DECIMAL(10,2) NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Applications
```sql
CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  unit_id INTEGER REFERENCES units(id),
  status VARCHAR(20) NOT NULL, -- 'pending', 'approved', 'rejected'
  application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  decision_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Leases
```sql
CREATE TABLE leases (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  unit_id INTEGER REFERENCES units(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent DECIMAL(10,2) NOT NULL,
  security_deposit DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'active', 'expired', 'terminated'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Payments
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  lease_id INTEGER REFERENCES leases(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_type VARCHAR(20) NOT NULL, -- 'rent', 'security_deposit', 'late_fee'
  payment_method VARCHAR(20) NOT NULL, -- 'check', 'cash', 'online'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### HUD Forms
```sql
CREATE TABLE hud_forms (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  form_type VARCHAR(20) NOT NULL, -- 'HUD-50058', 'HUD-52517', etc.
  submission_date DATE,
  status VARCHAR(20) NOT NULL, -- 'draft', 'submitted', 'approved', 'rejected'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Housing Authorities
```sql
CREATE TABLE housing_authorities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip VARCHAR(10) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## MongoDB Schema (Unstructured Data)

### Documents Collection
```javascript
{
  _id: ObjectId,
  user_id: Number,
  document_type: String, // 'id', 'income_verification', 'lease', 'inspection'
  file_name: String,
  file_path: String,
  mime_type: String,
  size: Number,
  upload_date: Date,
  metadata: {
    // Varies based on document_type
  }
}
```

### Form Data Collection
```javascript
{
  _id: ObjectId,
  form_id: Number, // References hud_forms.id in PostgreSQL
  form_data: Object, // JSON representation of form data
  version: Number,
  created_at: Date,
  updated_at: Date
}
```

### Messages Collection
```javascript
{
  _id: ObjectId,
  sender_id: Number,
  recipient_id: Number,
  message_type: String, // 'chat', 'notification', 'system'
  content: String,
  read: Boolean,
  sent_at: Date
}
```

### Activity Logs Collection
```javascript
{
  _id: ObjectId,
  user_id: Number,
  action: String,
  entity_type: String, // 'application', 'lease', 'payment', etc.
  entity_id: Number,
  details: Object,
  ip_address: String,
  user_agent: String,
  created_at: Date
}
```

## Redis Caching Structure

### Session Data
```
Key: "session:{session_id}"
Value: {user_id, user_type, email, first_name, last_name, exp}
```

### Form Progress
```
Key: "form_progress:{user_id}:{form_type}"
Value: {current_step, data, last_updated}
```

### Application Status
```
Key: "application_status:{application_id}"
Value: {status, last_updated}
```

### Notification Queue
```
Key: "notifications:{user_id}"
Value: List of notification objects
```