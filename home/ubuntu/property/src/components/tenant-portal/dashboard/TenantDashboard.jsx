import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Button, 
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert
} from '@mui/material';
import { 
  Home as HomeIcon,
  AttachMoney as PaymentIcon,
  Build as MaintenanceIcon,
  Notifications as NotificationIcon,
  Description as DocumentIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fetchTenantDashboardData } from '../../../services/tenant/tenantService';

const TenantDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        // In a real implementation, this would use the actual tenant ID from authentication
        const tenantId = 'current-tenant-id';
        const data = await fetchTenantDashboardData(tenantId);
        setDashboardData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load tenant dashboard data:', err);
        setError('Failed to load tenant information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  // Mock data for development - would be replaced by actual data in production
  const mockData = {
    tenant: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '(555) 123-4567'
    },
    lease: {
      propertyName: 'Sunset Apartments',
      unitNumber: '101',
      startDate: '2023-01-01',
      endDate: '2024-01-01',
      rentAmount: 1200,
      dueDate: 1, // 1st of each month
      leaseStatus: 'active'
    },
    payments: [
      { id: 1, date: '2023-03-01', amount: 1200, status: 'completed', type: 'Rent' },
      { id: 2, date: '2023-02-01', amount: 1200, status: 'completed', type: 'Rent' },
      { id: 3, date: '2023-01-01', amount: 1200, status: 'completed', type: 'Rent' }
    ],
    maintenanceRequests: [
      { id: 1, title: 'Leaky Faucet', status: 'in-progress', createdAt: '2023-03-15', priority: 'medium' },
      { id: 2, title: 'Broken Light Fixture', status: 'completed', createdAt: '2023-02-20', priority: 'low' }
    ],
    notifications: [
      { id: 1, title: 'Rent Due Soon', message: 'Your rent is due in 5 days', date: '2023-03-25', isRead: false },
      { id: 2, title: 'Maintenance Update', message: 'Your maintenance request has been scheduled', date: '2023-03-16', isRead: true }
    ],
    documents: [
      { id: 1, title: 'Lease Agreement', type: 'PDF', uploadDate: '2023-01-01' },
      { id: 2, title: 'Move-in Inspection', type: 'PDF', uploadDate: '2023-01-02' }
    ]
  };

  // Use mock data for now, would use dashboardData in production
  const data = dashboardData || mockData;
  const { tenant, lease, payments, maintenanceRequests, notifications, documents } = data;

  // Calculate days until rent is due
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const nextDueDate = new Date(currentYear, currentMonth, lease.dueDate);
  
  // If today is past the due date for this month, calculate for next month
  if (today > nextDueDate) {
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
  }
  
  const daysUntilRentDue = Math.ceil((nextDueDate - today) / (1000 * 60 * 60 * 24));

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Welcome, {tenant.firstName}!
      </Typography>
      
      <Grid container spacing={3}>
        {/* Property Information */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 200,
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Your Residence
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <HomeIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="body1">
                {lease.propertyName}, Unit {lease.unitNumber}
              </Typography>
            </Box>
            <Typography variant="body2" gutterBottom>
              Lease Period: {format(new Date(lease.startDate), 'MMM d, yyyy')} - {format(new Date(lease.endDate), 'MMM d, yyyy')}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Monthly Rent: ${lease.rentAmount}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Due Date: {lease.dueDate}st of each month
            </Typography>
            <Box sx={{ mt: 'auto' }}>
              <Button variant="outlined" size="small">View Lease Details</Button>
            </Box>
          </Paper>
        </Grid>

        {/* Rent Payment Status */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 200,
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Rent Payment Status
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PaymentIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="body1">
                {daysUntilRentDue > 0 
                  ? `Your rent is due in ${daysUntilRentDue} days` 
                  : daysUntilRentDue === 0 
                    ? 'Your rent is due today!' 
                    : 'Your rent is past due!'}
              </Typography>
            </Box>
            <Typography variant="body2" gutterBottom>
              Next Payment: ${lease.rentAmount} due on {format(nextDueDate, 'MMM d, yyyy')}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Last Payment: ${payments[0].amount} on {format(new Date(payments[0].date), 'MMM d, yyyy')}
            </Typography>
            <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
              <Button variant="contained" color="primary" size="small">Pay Rent</Button>
              <Button variant="outlined" size="small">Payment History</Button>
            </Box>
          </Paper>
        </Grid>

        {/* Maintenance Requests */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 240,
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Maintenance Requests
            </Typography>
            {maintenanceRequests.length > 0 ? (
              <List dense>
                {maintenanceRequests.slice(0, 3).map((request) => (
                  <ListItem key={request.id}>
                    <ListItemIcon>
                      <MaintenanceIcon color={request.status === 'completed' ? 'success' : 'primary'} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={request.title} 
                      secondary={`Status: ${request.status} | Created: ${format(new Date(request.createdAt), 'MMM d, yyyy')}`} 
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2">No maintenance requests found.</Typography>
            )}
            <Box sx={{ mt: 'auto' }}>
              <Button variant="contained" color="primary" size="small">New Request</Button>
              <Button variant="outlined" size="small" sx={{ ml: 1 }}>View All</Button>
            </Box>
          </Paper>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 240,
            }}
          >
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Notifications
            </Typography>
            {notifications.length > 0 ? (
              <List dense>
                {notifications.slice(0, 3).map((notification) => (
                  <ListItem key={notification.id}>
                    <ListItemIcon>
                      <NotificationIcon color={notification.isRead ? 'disabled' : 'error'} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={notification.title} 
                      secondary={`${notification.message} | ${format(new Date(notification.date), 'MMM d, yyyy')}`} 
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2">No notifications found.</Typography>
            )}
            <Box sx={{ mt: 'auto' }}>
              <Button variant="outlined" size="small">View All</Button>
            </Box>
          </Paper>
        </Grid>

        {/* Documents */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Important Documents
            </Typography>
            <Grid container spacing={2}>
              {documents.map((doc) => (
                <Grid item xs={12} sm={6} md={4} key={doc.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <DocumentIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="body1">{doc.title}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Type: {doc.type}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Uploaded: {format(new Date(doc.uploadDate), 'MMM d, yyyy')}
                      </Typography>
                      <Button size="small" sx={{ mt: 1 }}>View</Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" size="small">View All Documents</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TenantDashboard;
