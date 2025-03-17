# Property Management System - Deployment Instructions

This document provides detailed instructions for deploying the Property Management System in various environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Environment Setup](#development-environment-setup)
3. [Staging Environment Deployment](#staging-environment-deployment)
4. [Production Environment Deployment](#production-environment-deployment)
5. [Database Migration](#database-migration)
6. [Environment Configuration](#environment-configuration)
7. [Continuous Integration/Continuous Deployment](#continuous-integrationcontinuous-deployment)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Rollback Procedures](#rollback-procedures)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### Hardware Requirements

- **Server**: 
  - CPU: 4+ cores
  - RAM: 8GB+ (16GB recommended for production)
  - Storage: 50GB+ SSD
  - Network: 100Mbps+ connection

### Software Requirements

- **Operating System**: Ubuntu 20.04 LTS or later
- **Web Server**: Nginx 1.18+
- **Database**: PostgreSQL 14+
- **Node.js**: 16.x or 18.x LTS
- **Python**: 3.10+ (for AI services)
- **Docker**: 20.10+ (optional, for containerized deployment)
- **SSL Certificate**: Valid SSL certificate for production domains

### Access Requirements

- SSH access to servers
- Database credentials
- Domain DNS management access
- Cloud provider account (AWS, Azure, GCP, etc.)

## Development Environment Setup

### Local Development Environment

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/property-management-system.git
   cd property-management-system
   ```

2. **Set up the server**:
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Edit .env file with local development settings
   ```

3. **Set up the database**:
   ```bash
   # Create PostgreSQL database
   createdb property_management
   
   # Run migrations
   npm run db:setup
   ```

4. **Set up the client**:
   ```bash
   cd ../client/web
   npm install
   cp .env.example .env
   # Edit .env file with local development settings
   ```

5. **Start the development servers**:
   ```bash
   # In server directory
   npm run dev
   
   # In client/web directory (in a new terminal)
   npm start
   ```

6. **Access the application**:
   - Backend API: http://localhost:3000
   - Frontend: http://localhost:3001

### Docker Development Environment (Optional)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/property-management-system.git
   cd property-management-system
   ```

2. **Build and start containers**:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Access the application**:
   - Backend API: http://localhost:3000
   - Frontend: http://localhost:3001

## Staging Environment Deployment

Staging environment should mirror the production environment as closely as possible.

### Server Provisioning

1. **Provision a server** with the recommended hardware specifications.

2. **Install required software**:
   ```bash
   sudo apt update
   sudo apt upgrade -y
   sudo apt install -y nginx postgresql postgresql-contrib redis-server
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install Python (for AI services)
   sudo apt install -y python3 python3-pip python3-venv
   ```

### Application Deployment

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/property-management-system.git
   cd property-management-system
   ```

2. **Set up the environment configuration**:
   ```bash
   cp config/.env.staging config/.env.production
   # Edit the configuration file with appropriate settings
   ```

3. **Set up the database**:
   ```bash
   sudo -u postgres createdb property_management_staging
   sudo -u postgres createuser property_user
   sudo -u postgres psql -c "ALTER USER property_user WITH ENCRYPTED PASSWORD 'your_password';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE property_management_staging TO property_user;"
   
   # Run migrations
   cd server
   npm install
   npm run migrate
   ```

4. **Build the client**:
   ```bash
   cd ../client/web
   npm install
   npm run build
   ```

5. **Configure Nginx**:
   ```bash
   sudo nano /etc/nginx/sites-available/property-management-staging
   ```
   
   Add the following configuration:
   ```nginx
   server {
       listen 80;
       server_name staging.example.com;
       
       # Redirect HTTP to HTTPS
       return 301 https://$host$request_uri;
   }
   
   server {
       listen 443 ssl;
       server_name staging.example.com;
       
       ssl_certificate /etc/letsencrypt/live/staging.example.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/staging.example.com/privkey.pem;
       
       # SSL configuration
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_prefer_server_ciphers on;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
       ssl_session_timeout 1d;
       ssl_session_cache shared:SSL:10m;
       ssl_session_tickets off;
       
       # Client app (React)
       location / {
           root /var/www/property-management/client;
           try_files $uri $uri/ /index.html;
           
           # Cache static assets
           location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
               expires 30d;
               add_header Cache-Control "public, no-transform";
           }
       }
       
       # API endpoints
       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

6. **Enable the Nginx configuration**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/property-management-staging /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

7. **Set up SSL with Let's Encrypt**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d staging.example.com
   ```

8. **Set up PM2 for process management**:
   ```bash
   sudo npm install -g pm2
   cd /path/to/property-management-system/server
   pm2 start src/index.js --name "property-management-api" --env staging
   pm2 save
   pm2 startup
   ```

9. **Deploy client files**:
   ```bash
   sudo mkdir -p /var/www/property-management/client
   sudo cp -r /path/to/property-management-system/client/web/build/* /var/www/property-management/client/
   sudo chown -R www-data:www-data /var/www/property-management
   ```

## Production Environment Deployment

The production deployment process is similar to staging but with production-specific configurations.

### Server Provisioning

Follow the same steps as for the staging environment, but with production-grade hardware.

### Application Deployment

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/property-management-system.git -b main
   cd property-management-system
   ```

2. **Set up the environment configuration**:
   ```bash
   cp config/.env.example config/.env.production
   # Edit the configuration file with appropriate production settings
   ```

3. **Set up the database**:
   ```bash
   sudo -u postgres createdb property_management_production
   sudo -u postgres createuser property_user_prod
   sudo -u postgres psql -c "ALTER USER property_user_prod WITH ENCRYPTED PASSWORD 'your_secure_password';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE property_management_production TO property_user_prod;"
   
   # Run migrations
   cd server
   npm ci --production
   NODE_ENV=production npm run migrate
   ```

4. **Build the client**:
   ```bash
   cd ../client/web
   npm ci --production
   npm run build
   ```

5. **Configure Nginx**:
   ```bash
   sudo nano /etc/nginx/sites-available/property-management-production
   ```
   
   Add a similar configuration as for staging, but with production domain and optimized settings.

6. **Enable the Nginx configuration**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/property-management-production /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

7. **Set up SSL with Let's Encrypt**:
   ```bash
   sudo certbot --nginx -d app.example.com
   ```

8. **Set up PM2 for process management**:
   ```bash
   cd /path/to/property-management-system/server
   pm2 start src/index.js --name "property-management-api-prod" --env production
   pm2 save
   pm2 startup
   ```

9. **Deploy client files**:
   ```bash
   sudo mkdir -p /var/www/property-management-production/client
   sudo cp -r /path/to/property-management-system/client/web/build/* /var/www/property-management-production/client/
   sudo chown -R www-data:www-data /var/www/property-management-production
   ```

### Load Balancing (For High-Traffic Production)

For high-traffic production environments, set up multiple application servers behind a load balancer:

1. **Set up multiple application servers** following the steps above.

2. **Configure Nginx as a load balancer**:
   ```bash
   sudo nano /etc/nginx/sites-available/property-management-lb
   ```
   
   Add the following configuration:
   ```nginx
   upstream app_servers {
       server app1.internal:3000;
       server app2.internal:3000;
       server app3.internal:3000;
   }
   
   server {
       listen 80;
       server_name app.example.com;
       return 301 https://$host$request_uri;
   }
   
   server {
       listen 443 ssl;
       server_name app.example.com;
       
       ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;
       
       # SSL configuration
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_prefer_server_ciphers on;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
       ssl_session_timeout 1d;
       ssl_session_cache shared:SSL:10m;
       ssl_session_tickets off;
       
       # Client app (React)
       location / {
           root /var/www/property-management-production/client;
           try_files $uri $uri/ /index.html;
           
           # Cache static assets
           location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
               expires 30d;
               add_header Cache-Control "public, no-transform";
           }
       }
       
       # API endpoints
       location /api {
           proxy_pass http://app_servers;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

## Database Migration

### Running Migrations

The system includes a migration utility to manage database schema changes:

```bash
cd server
# Run migrations
npm run migrate

# Rollback the last migration
npm run migrate:rollback

# Create a new migration
npm run migrate:create -- name_of_migration
```

### Backup and Restore

Regularly back up the database in production:

1. **Create a backup script**:
   ```bash
   #!/bin/bash
   TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
   BACKUP_DIR="/var/backups/property_management"
   DB_NAME="property_management_production"
   
   mkdir -p $BACKUP_DIR
   
   # Backup the database
   pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/$DB_NAME-$TIMESTAMP.sql.gz
   
   # Keep only the last 7 daily backups
   find $BACKUP_DIR -name "$DB_NAME-*.sql.gz" -type f -mtime +7 -delete
   ```

2. **Schedule the backup script with cron**:
   ```bash
   sudo crontab -e
   ```
   
   Add the following line to run daily backups at 2 AM:
   ```
   0 2 * * * /path/to/backup_script.sh
   ```

3. **Restore from backup**:
   ```bash
   gunzip -c /var/backups/property_management/property_management_production-20250315_020000.sql.gz | psql -U postgres property_management_production
   ```

## Environment Configuration

The application uses environment-specific configuration files located in the `config` directory:

- `.env.development`: Development environment configuration
- `.env.staging`: Staging environment configuration
- `.env.production`: Production environment configuration

### Configuration Variables

Each environment file should include the following variables:

```
# Server Configuration
PORT=3000
HOST=0.0.0.0
API_PREFIX=/api
API_VERSION=v1
NODE_ENV=production  # or staging, development

# Database Configuration
DB_USER=property_user_prod
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=property_management_production
DB_POOL_SIZE=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=https://app.example.com
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined

# File Upload
MAX_FILE_SIZE=5
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Trust Proxy
TRUST_PROXY=true

# External Services
STRIPE_API_KEY=your_stripe_api_key
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Sensitive Information Management

For production environments, consider using a secrets management solution:

1. **Using environment variables**:
   ```bash
   # Set environment variables in the server startup script
   export JWT_SECRET=your_jwt_secret_key
   export DB_PASSWORD=your_secure_password
   ```

2. **Using a secrets manager** (AWS Secrets Manager, HashiCorp Vault, etc.):
   - Store sensitive information in the secrets manager
   - Modify the application to retrieve secrets at runtime

## Continuous Integration/Continuous Deployment

### GitHub Actions Workflow

Create a GitHub Actions workflow for CI/CD:

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, staging ]
  pull_request:
    branches: [ main, staging ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: property_management_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        cd server
        npm ci
    
    - name: Run linting
      run: |
        cd server
        npm run lint
    
    - name: Run tests
      run: |
        cd server
        npm test
      env:
        DB_USER: postgres
        DB_PASSWORD: postgres
        DB_HOST: localhost
        DB_PORT: 5432
        DB_NAME: property_management_test
        NODE_ENV: test
    
    - name: Build client
      run: |
        cd client/web
        npm ci
        npm run build
  
  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
 <response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>