# Comprehensive Property Management System

A full-featured property management platform with AI-enhanced capabilities, serving tenants, landlords, property managers, and housing authorities across all 50 U.S. states.

## Project Overview

The Comprehensive Property Management System evolved from an affordable housing application focused on HUD programs into a comprehensive platform with AI-enhanced features. The system provides a robust set of features organized into eight core modules:

1. **Tenant Management**: Handles tenant applications, screening, lease management, communication, and tenant portal access.
2. **Property Management**: Manages property listings, unit details, amenities, and compliance with housing regulations.
3. **Financial Management**: Tracks rent collection, expenses, accounting, and financial reporting.
4. **Maintenance Management**: Coordinates maintenance requests, work orders, vendor management, and preventive maintenance.
5. **Communication Hub**: Facilitates communication between tenants, landlords, property managers, and housing authorities.
6. **Reporting and Analytics**: Provides insights into property performance, tenant behavior, and financial health.
7. **Pricing and Accessibility**: Implements tiered subscription plans with feature-based access control.
8. **Integration and API**: Connects with external services and provides API access for custom integrations.

## Key Features

- **AI-Enhanced Capabilities**: Form filling automation, pricing recommendations, cash flow prediction, tenant turnover prediction, and predictive maintenance.
- **HUD Integration**: Direct connection with HUD systems across all 50 states, automating form submissions and ensuring compliance.
- **Tiered Pricing Model**: Free tier (up to 5 units), Standard tier ($2/unit/month), and Enterprise tier (custom pricing).
- **Multi-Platform Support**: Web application, mobile application (iOS/Android), and progressive web app.
- **Comprehensive Reporting**: Financial reports, property performance metrics, and compliance documentation.

## Current Status

- **Web Application**: Deployed at https://xgfxgabn.manus.space/
- **Current Step**: 022 - Preparing handoff for next implementation steps
- **Next Step**: 023 - Implementing advanced accounting module
- **Previous Milestone**: Successfully implemented pricing and accessibility module with tiered subscription plans

## Repository Structure

```
property-management-system/
├── client/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── contexts/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   └── public/
│   └── mobile/
│       ├── src/
│       │   ├── components/
│       │   ├── contexts/
│       │   ├── hooks/
│       │   ├── screens/
│       │   ├── services/
│       │   └── utils/
│       └── assets/
├── server/
│   ├── src/
│   │   ├── api/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── tests/
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── schema/
├── ai-service/
│   ├── src/
│   │   ├── models/
│   │   ├── training/
│   │   ├── prediction/
│   │   └── api/
│   └── data/
├── docs/
│   ├── api/
│   ├── architecture/
│   ├── database/
│   └── user-guides/
└── scripts/
    ├── deployment/
    ├── testing/
    └── utilities/
```

## Technology Stack

- **Frontend**: React.js (web) + React Native (mobile)
- **Backend**: Node.js with Express.js for RESTful API
- **Database**: 
  - PostgreSQL (structured data)
  - MongoDB (unstructured data)
  - Redis (caching)
- **AI/ML**: Python with TensorFlow and Flask microservice
- **Cloud**: AWS for hosting and infrastructure
- **Authentication**: JWT for secure sessions
- **Integrations**: Stripe, Plaid, Google Maps, Zapier

## Development Environment Setup

### Prerequisites

- Node.js 20.18.0
- Python 3.10.12
- PostgreSQL 14
- MongoDB 6.0
- Redis 7.0

### Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/yourusername/property-management-system.git
cd property-management-system
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client/web
npm install
cd ../mobile
npm install
```

4. Install AI service dependencies:
```bash
cd ../../ai-service
pip install -r requirements.txt
```

5. Set up environment variables:
```bash
cp server/.env.example server/.env
cp client/web/.env.example client/web/.env
cp ai-service/.env.example ai-service/.env
```

6. Set up the database:
```bash
cd ../server
npm run db:setup
```

7. Start the development servers:
```bash
# Start the backend server
npm run dev

# In a new terminal, start the web client
cd ../client/web
npm start

# In a new terminal, start the AI service
cd ../../ai-service
python app.py
```

## Next Implementation Steps

The next phase of development (Step 023) focuses on implementing the Advanced Accounting Module with the following features:

- Rent tracking with automated late fees
- Trust accounting with separate ledgers
- Expense management with receipt scanning
- Financial reporting and tax preparation
- AI-powered cash flow prediction and error detection

For a detailed implementation plan and timeline, please refer to the [handoff document](./docs/handoff_document.md).

## Documentation

For comprehensive documentation on the project, please refer to the following resources:

- [Handoff Document](./docs/handoff_document.md): Complete overview of the project, its current status, and next steps
- [System Architecture](./docs/architecture/system_architecture.md): Detailed description of the system architecture
- [Database Schema](./database/schema/database_schema_design.md): Documentation of the database schema
- [API Documentation](./docs/api/api_documentation.md): Documentation of the API endpoints

## License

This project is proprietary and confidential. All rights reserved.

## Contact

For any questions or inquiries, please contact the project team.
