# Deployment Instructions for Advanced Accounting Module

This document provides step-by-step instructions for deploying the Advanced Accounting Module to your environment.

## Prerequisites

Before deploying, ensure you have the following:

1. Node.js (v16 or later) and npm installed
2. PostgreSQL (v13 or later) database server
3. Access to your web server (for manual deployment)
4. Git access (for automated deployment via GitHub Actions)

## Deployment Options

You can deploy the Advanced Accounting Module using one of two methods:

1. **Automated Deployment** using GitHub Actions (recommended)
2. **Manual Deployment** to your own server

## Automated Deployment with GitHub Actions

### Setup

1. Fork the repository to your GitHub account
2. Configure the following secrets in your GitHub repository:
   - For Staging:
     - `STAGING_HOST`: Hostname of your staging server
     - `STAGING_USERNAME`: SSH username for staging server
     - `STAGING_SSH_KEY`: SSH private key for staging server
   - For Production:
     - `PRODUCTION_HOST`: Hostname of your production server
     - `PRODUCTION_USERNAME`: SSH username for production server
     - `PRODUCTION_SSH_KEY`: SSH private key for production server

3. Ensure your servers have the following directory structure:
   - Staging: `/var/www/staging.propertymanagement.com/`
   - Production: `/var/www/propertymanagement.com/`

### Deployment Process

1. For staging deployment:
   - Push your changes to the `develop` branch
   - GitHub Actions will automatically:
     - Run tests
     - Build the application
     - Deploy to your staging server
     - Run database migrations
     - Restart the application

2. For production deployment:
   - Push your changes to the `main` branch
   - GitHub Actions will automatically:
     - Run tests
     - Build the application
     - Deploy to your production server
     - Run database migrations
     - Restart the application

## Manual Deployment

### Server Setup

1. Set up your server with Node.js and PostgreSQL
2. Install PM2 for process management:
   ```
   npm install -g pm2
   ```

### Database Setup

1. Create a PostgreSQL database for the application:
   ```sql
   CREATE DATABASE property_management;
   CREATE USER property_user WITH ENCRYPTED PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE property_management TO property_user;
   ```

### Application Deployment

1. Clone the repository:
   ```
   git clone https://github.com/your-org/property-management.git
   cd property-management
   ```

2. Install server dependencies:
   ```
   cd server
   npm install
   ```

3. Create environment configuration:
   - Copy the appropriate `.env` file for your environment
   - Update database credentials and other settings

4. Run database migrations:
   ```
   node src/utils/migrationRunner.js
   ```

5. Build the server:
   ```
   npm run build
   ```

6. Install client dependencies:
   ```
   cd ../client
   npm install
   ```

7. Build the client:
   ```
   npm run build
   ```

8. Start the server with PM2:
   ```
   cd ../server
   pm2 start dist/index.js --name property-management-api
   ```

9. Configure your web server (Nginx/Apache) to serve the client build files and proxy API requests to the Node.js server.

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name propertymanagement.com;

    root /var/www/propertymanagement.com/client-dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Post-Deployment Verification

After deploying, verify the following:

1. Access the application in a web browser
2. Log in with your credentials
3. Navigate to the Accounting Module
4. Verify that all features are working:
   - Rent Tracking
   - Trust Accounts
   - Expense Management
   - Late Fee Configuration
   - Financial Reporting

## Troubleshooting

### Database Migration Issues

If you encounter database migration errors:

1. Check the database connection settings
2. Verify database user permissions
3. Run migrations manually with verbose logging:
   ```
   node src/utils/migrationRunner.js --verbose
   ```

### API Connection Issues

If the frontend cannot connect to the API:

1. Check the API URL configuration in the client build
2. Verify that the API server is running
3. Check web server proxy configuration
4. Verify network/firewall settings

### Application Errors

For application errors:

1. Check the server logs:
   ```
   pm2 logs property-management-api
   ```
2. Verify environment configuration
3. Ensure all dependencies are installed correctly

## Rollback Procedure

If you need to rollback to a previous version:

1. For GitHub Actions deployment:
   - Revert to the previous commit and push
   - The pipeline will automatically deploy the previous version

2. For manual deployment:
   - Stop the current server: `pm2 stop property-management-api`
   - Checkout the previous version: `git checkout <previous-tag>`
   - Rebuild and restart the application

## Support

If you encounter issues during deployment, contact our support team:

- Email: support@propertymanagement.com
- Phone: (555) 123-4567
