import React from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  Tabs,
  Tab
} from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  Payment as PaymentIcon,
  Build as MaintenanceIcon,
  Description as DocumentIcon,
  Person as ProfileIcon,
  Message as MessageIcon
} from '@mui/icons-material';
import { Link, Routes, Route } from 'react-router-dom';

// Import tenant portal components
import TenantDashboard from './dashboard/TenantDashboard';
import PaymentHistory from './payments/PaymentHistory';
import MakePayment from './payments/MakePayment';
import MaintenanceRequests from './maintenance/MaintenanceRequests';
import CreateMaintenanceRequest from './maintenance/CreateMaintenanceRequest';
import Documents from './documents/Documents';
import Profile from './profile/Profile';
import Communication from './communication/Communication';

const TenantPortal = () => {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          borderRadius: 0
        }}
      >
        <Typography variant="h5" component="h1">
          Tenant Portal
        </Typography>
        <Box>
          <Button color="inherit">Help</Button>
          <Button color="inherit">Logout</Button>
        </Box>
      </Paper>

      {/* Navigation Tabs */}
      <Paper sx={{ borderRadius: 0 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="tenant portal navigation tabs"
        >
          <Tab icon={<DashboardIcon />} label="Dashboard" component={Link} to="/tenant" />
          <Tab icon={<PaymentIcon />} label="Payments" component={Link} to="/tenant/payments" />
          <Tab icon={<MaintenanceIcon />} label="Maintenance" component={Link} to="/tenant/maintenance" />
          <Tab icon={<DocumentIcon />} label="Documents" component={Link} to="/tenant/documents" />
          <Tab icon={<ProfileIcon />} label="Profile" component={Link} to="/tenant/profile" />
          <Tab icon={<MessageIcon />} label="Messages" component={Link} to="/tenant/messages" />
        </Tabs>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, bgcolor: 'background.default', py: 3 }}>
        <Routes>
          <Route path="/" element={<TenantDashboard />} />
          <Route path="/payments" element={<PaymentHistory />} />
          <Route path="/payments/make" element={<MakePayment />} />
          <Route path="/maintenance" element={<MaintenanceRequests />} />
          <Route path="/maintenance/new" element={<CreateMaintenanceRequest />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages" element={<Communication />} />
        </Routes>
      </Box>

      {/* Footer */}
      <Paper 
        sx={{ 
          p: 2, 
          mt: 'auto',
          borderRadius: 0,
          textAlign: 'center'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Property Management System. All rights reserved.
        </Typography>
      </Paper>
    </Box>
  );
};

export default TenantPortal;
