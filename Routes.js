import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';

// Layout components
import Navigation from './Navigation';

// Dashboard components
import AccountingDashboard from './components/AccountingDashboard';
import RentTrackingDashboard from './components/RentTrackingDashboard';
import TrustAccountDashboard from './components/TrustAccountDashboard';
import ExpenseManagementDashboard from './components/ExpenseManagementDashboard';
import FinancialReportingDashboard from './components/FinancialReportingDashboard';
import CashFlowPredictionDashboard from './components/CashFlowPredictionDashboard';
import LateFeeManagementWidget from './components/LateFeeManagementWidget';

// Auth components - these would be implemented in a real application
const Login = () => <div>Login Page</div>;
const Register = () => <div>Register Page</div>;
const ForgotPassword = () => <div>Forgot Password Page</div>;

// Error pages
const NotFound = () => <div>404 - Page Not Found</div>;

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  // In a real app, this would check for authentication
  const isAuthenticated = true;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const AppRoutes = () => {
  return (
    <Router>
      <CssBaseline />
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Main application routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Box sx={{ display: 'flex' }}>
              <Navigation />
              <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                <AccountingDashboard />
              </Box>
            </Box>
          </ProtectedRoute>
        } />
        
        <Route path="/accounting" element={
          <ProtectedRoute>
            <Box sx={{ display: 'flex' }}>
              <Navigation />
              <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                <AccountingDashboard />
              </Box>
            </Box>
          </ProtectedRoute>
        } />
        
        <Route path="/rent-tracking" element={
          <ProtectedRoute>
            <Box sx={{ display: 'flex' }}>
              <Navigation />
              <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                <RentTrackingDashboard />
              </Box>
            </Box>
          </ProtectedRoute>
        } />
        
        <Route path="/trust-accounts" element={
          <ProtectedRoute>
            <Box sx={{ display: 'flex' }}>
              <Navigation />
              <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                <TrustAccountDashboard />
              </Box>
            </Box>
          </ProtectedRoute>
        } />
        
        <Route path="/expenses" element={
          <ProtectedRoute>
            <Box sx={{ display: 'flex' }}>
              <Navigation />
              <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                <ExpenseManagementDashboard />
              </Box>
            </Box>
          </ProtectedRoute>
        } />
        
        <Route path="/financial-reports" element={
          <ProtectedRoute>
            <Box sx={{ display: 'flex' }}>
              <Navigation />
              <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                <FinancialReportingDashboard />
              </Box>
            </Box>
          </ProtectedRoute>
        } />
        
        <Route path="/cash-flow" element={
          <ProtectedRoute>
            <Box sx={{ display: 'flex' }}>
              <Navigation />
              <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                <CashFlowPredictionDashboard />
              </Box>
            </Box>
          </ProtectedRoute>
        } />
        
        <Route path="/late-fees" element={
          <ProtectedRoute>
            <Box sx={{ display: 'flex' }}>
              <Navigation />
              <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                <LateFeeManagementWidget />
              </Box>
            </Box>
          </ProtectedRoute>
        } />
        
        {/* Catch-all route for 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
