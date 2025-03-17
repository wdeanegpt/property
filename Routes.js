import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';

// Layout Components
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Authentication Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';

// Dashboard Components
import Dashboard from './components/dashboard/Dashboard';

// Property Management Components
import PropertyList from './components/properties/PropertyList';
import PropertyDetails from './components/properties/PropertyDetails';
import PropertyForm from './components/properties/PropertyForm';

// Tenant Management Components
import TenantList from './components/tenants/TenantList';
import TenantDetails from './components/tenants/TenantDetails';
import TenantForm from './components/tenants/TenantForm';

// Lease Management Components
import LeaseList from './components/leases/LeaseList';
import LeaseDetails from './components/leases/LeaseDetails';
import LeaseForm from './components/leases/LeaseForm';

// Accounting Module Components
import RentTrackingDashboard from './components/accounting/RentTrackingDashboard';
import TrustAccountDashboard from './components/accounting/TrustAccountDashboard';
import ExpenseManagementDashboard from './components/accounting/ExpenseManagementDashboard';
import FinancialReportingDashboard from './components/accounting/FinancialReportingDashboard';
import LateFeeConfiguration from './components/accounting/LateFeeConfiguration';

// Settings Components
import UserProfile from './components/settings/UserProfile';
import CompanySettings from './components/settings/CompanySettings';
import SystemSettings from './components/settings/SystemSettings';

// Error Pages
import NotFound from './components/errors/NotFound';
import Unauthorized from './components/errors/Unauthorized';

// Auth Guard Component
import AuthGuard from './components/auth/AuthGuard';

const Routes = () => {
  return (
    <Router>
      <Switch>
        {/* Auth Routes */}
        <Route exact path="/login">
          <AuthLayout>
            <Login />
          </AuthLayout>
        </Route>
        <Route exact path="/register">
          <AuthLayout>
            <Register />
          </AuthLayout>
        </Route>
        <Route exact path="/forgot-password">
          <AuthLayout>
            <ForgotPassword />
          </AuthLayout>
        </Route>
        <Route exact path="/reset-password/:token">
          <AuthLayout>
            <ResetPassword />
          </AuthLayout>
        </Route>

        {/* Main Application Routes */}
        <Route path="/app">
          <AuthGuard>
            <MainLayout>
              <Switch>
                {/* Dashboard */}
                <Route exact path="/app/dashboard" component={Dashboard} />

                {/* Property Management */}
                <Route exact path="/app/properties" component={PropertyList} />
                <Route exact path="/app/properties/new" component={PropertyForm} />
                <Route exact path="/app/properties/:id" component={PropertyDetails} />
                <Route exact path="/app/properties/:id/edit" component={PropertyForm} />

                {/* Tenant Management */}
                <Route exact path="/app/tenants" component={TenantList} />
                <Route exact path="/app/tenants/new" component={TenantForm} />
                <Route exact path="/app/tenants/:id" component={TenantDetails} />
                <Route exact path="/app/tenants/:id/edit" component={TenantForm} />

                {/* Lease Management */}
                <Route exact path="/app/leases" component={LeaseList} />
                <Route exact path="/app/leases/new" component={LeaseForm} />
                <Route exact path="/app/leases/:id" component={LeaseDetails} />
                <Route exact path="/app/leases/:id/edit" component={LeaseForm} />

                {/* Accounting Module Routes */}
                <Route exact path="/app/accounting/rent-tracking" component={RentTrackingDashboard} />
                <Route exact path="/app/accounting/trust-accounts" component={TrustAccountDashboard} />
                <Route exact path="/app/accounting/expenses" component={ExpenseManagementDashboard} />
                <Route exact path="/app/accounting/reports" component={FinancialReportingDashboard} />
                <Route exact path="/app/accounting/late-fees" component={LateFeeConfiguration} />

                {/* Settings */}
                <Route exact path="/app/settings/profile" component={UserProfile} />
                <Route exact path="/app/settings/company" component={CompanySettings} />
                <Route exact path="/app/settings/system" component={SystemSettings} />

                {/* Error Pages */}
                <Route exact path="/app/unauthorized" component={Unauthorized} />
                <Route component={NotFound} />
              </Switch>
            </MainLayout>
          </AuthGuard>
        </Route>

        {/* Redirect root to dashboard if authenticated, otherwise to login */}
        <Route exact path="/">
          <Redirect to="/app/dashboard" />
        </Route>

        {/* 404 Page */}
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
};

export default Routes;
