import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { 
  AttachMoney, 
  CalendarToday, 
  Warning, 
  CheckCircle, 
  ArrowUpward, 
  ArrowDownward,
  Add
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock service - would be replaced with actual API calls
const rentTrackingService = {
  getRecurringPayments: async (propertyId) => {
    // Simulate API call
    return [
      { 
        id: 1, 
        property_id: propertyId, 
        tenant_id: 101, 
        tenant_name: 'John Smith',
        amount: 1200, 
        frequency: 'monthly', 
        due_date: '2025-04-01', 
        payment_type: 'income',
        description: 'Monthly rent', 
        is_active: true,
        status: 'upcoming'
      },
      { 
        id: 2, 
        property_id: propertyId, 
        tenant_id: 102, 
        tenant_name: 'Jane Doe',
        amount: 1500, 
        frequency: 'monthly', 
        due_date: '2025-03-15', 
        payment_type: 'income',
        description: 'Monthly rent', 
        is_active: true,
        status: 'overdue'
      },
      { 
        id: 3, 
        property_id: propertyId, 
        tenant_id: 103, 
        tenant_name: 'Robert Johnson',
        amount: 950, 
        frequency: 'monthly', 
        due_date: '2025-03-31', 
        payment_type: 'income',
        description: 'Monthly rent', 
        is_active: true,
        status: 'paid'
      }
    ];
  },
  getPaymentHistory: async (propertyId) => {
    // Simulate API call
    return {
      payments: [
        {
          id: 101,
          property_id: propertyId,
          tenant_id: 101,
          tenant_name: 'John Smith',
          amount: 1200,
          payment_date: '2025-02-28',
          payment_method: 'bank_transfer',
          status: 'completed',
          notes: 'On-time payment'
        },
        {
          id: 102,
          property_id: propertyId,
          tenant_id: 102,
          tenant_name: 'Jane Doe',
          amount: 1500,
          payment_date: '2025-02-16',
          payment_method: 'credit_card',
          status: 'completed',
          notes: 'Late payment'
        },
        {
          id: 103,
          property_id: propertyId,
          tenant_id: 103,
          tenant_name: 'Robert Johnson',
          amount: 950,
          payment_date: '2025-02-28',
          payment_method: 'check',
          status: 'completed',
          notes: 'On-time payment'
        },
        {
          id: 104,
          property_id: propertyId,
          tenant_id: 101,
          tenant_name: 'John Smith',
          amount: 1200,
          payment_date: '2025-01-31',
          payment_method: 'bank_transfer',
          status: 'completed',
          notes: 'On-time payment'
        },
        {
          id: 105,
          property_id: propertyId,
          tenant_id: 102,
          tenant_name: 'Jane Doe',
          amount: 1500,
          payment_date: '2025-01-17',
          payment_method: 'credit_card',
          status: 'completed',
          notes: 'Late payment + $50 late fee'
        }
      ],
      pagination: {
        total: 24,
        limit: 20,
        offset: 0,
        hasMore: true
      }
    };
  },
  getLateFees: async (propertyId) => {
    // Simulate API call
    return [
      {
        id: 1,
        property_id: propertyId,
        tenant_id: 102,
        tenant_name: 'Jane Doe',
        recurring_payment_id: 2,
        amount: 75,
        created_at: '2025-03-16',
        description: 'Late fee for March rent',
        status: 'pending'
      }
    ];
  },
  getPaymentSummary: async (propertyId) => {
    // Simulate API call
    return {
      currentMonth: {
        totalDue: 3650,
        totalPaid: 950,
        totalOverdue: 1500,
        totalUpcoming: 1200
      },
      paymentTrends: [
        { month: 'Oct', onTime: 3650, late: 0 },
        { month: 'Nov', onTime: 3650, late: 0 },
        { month: 'Dec', onTime: 2150, late: 1500 },
        { month: 'Jan', onTime: 2150, late: 1500 },
        { month: 'Feb', onTime: 2150, late: 1500 },
        { month: 'Mar', onTime: 950, late: 1500 }
      ]
    };
  }
};

const RentTrackingDashboard = ({ propertyId = 1 }) => {
  const [loading, setLoading] = useState(true);
  const [recurringPayments, setRecurringPayments] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState({ payments: [], pagination: {} });
  const [lateFees, setLateFees] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [openAddPaymentDialog, setOpenAddPaymentDialog] = useState(false);
  const [newPayment, setNewPayment] = useState({
    tenant_id: '',
    amount: '',
    payment_method: '',
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [payments, history, fees, summary] = await Promise.all([
          rentTrackingService.getRecurringPayments(propertyId),
          rentTrackingService.getPaymentHistory(propertyId),
          rentTrackingService.getLateFees(propertyId),
          rentTrackingService.getPaymentSummary(propertyId)
        ]);
        
        setRecurringPayments(payments);
        setPaymentHistory(history);
        setLateFees(fees);
        setPaymentSummary(summary);
      } catch (error) {
        console.error('Error fetching rent tracking data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [propertyId]);

  const handleAddPaymentDialogOpen = () => {
    setOpenAddPaymentDialog(true);
  };

  const handleAddPaymentDialogClose = () => {
    setOpenAddPaymentDialog(false);
  };

  const handleNewPaymentChange = (e) => {
    const { name, value } = e.target;
    setNewPayment(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddPayment = () => {
    // In a real app, this would call an API to add the payment
    console.log('Adding payment:', newPayment);
    handleAddPaymentDialogClose();
    // Reset form
    setNewPayment({
      tenant_id: '',
      amount: '',
      payment_method: '',
      notes: ''
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'overdue':
        return 'error';
      case 'upcoming':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle fontSize="small" />;
      case 'overdue':
        return <Warning fontSize="small" />;
      case 'upcoming':
        return <CalendarToday fontSize="small" />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Due (This Month)
              </Typography>
              <Typography variant="h4" component="div">
                ${paymentSummary?.currentMonth.totalDue.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Paid
              </Typography>
              <Typography variant="h4" component="div" sx={{ color: 'success.main' }}>
                ${paymentSummary?.currentMonth.totalPaid.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {Math.round((paymentSummary?.currentMonth.totalPaid / paymentSummary?.currentMonth.totalDue) * 100)}% of total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Overdue
              </Typography>
              <Typography variant="h4" component="div" sx={{ color: 'error.main' }}>
                ${paymentSummary?.currentMonth.totalOverdue.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="error">
                {Math.round((paymentSummary?.currentMonth.totalOverdue / paymentSummary?.currentMonth.totalDue) * 100)}% of total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Upcoming
              </Typography>
              <Typography variant="h4" component="div" sx={{ color: 'primary.main' }}>
                ${paymentSummary?.currentMonth.totalUpcoming.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {Math.round((paymentSummary?.currentMonth.totalUpcoming / paymentSummary?.currentMonth.totalDue) * 100)}% of total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Trends Chart */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="Payment Trends" 
              subheader="Last 6 months"
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={paymentSummary?.paymentTrends}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => ['$' + value.toLocaleString()]} />
                  <Legend />
                  <Bar dataKey="onTime" name="On-Time Payments" fill="#4caf50" />
                  <Bar dataKey="late" name="Late Payments" fill="#f44336" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recurring Payments */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="Recurring Payments" 
              action={
                <Button 
                  variant="contained" 
                  startIcon={<Add />}
                  onClick={handleAddPaymentDialogOpen}
                >
                  Record Payment
                </Button>
              }
            />
            <CardContent>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tenant</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Frequency</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recurringPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.tenant_name}</TableCell>
                        <TableCell>${payment.amount.toLocaleString()}</TableCell>
                        <TableCell>{new Date(payment.due_date).toLocaleDateString()}</TableCell>
                        <TableCell>{payment.frequency.charAt(0).toUpperCase() + payment.frequency.slice(1)}</TableCell>
                        <TableCell>{payment.description}</TableCell>
                        <TableCell>
                          <Chip 
                            icon={getStatusIcon(payment.status)} 
                            label={payment.status.charAt(0).toUpperCase() + payment.status.slice(1)} 
                            color={getStatusColor(payment.status)} 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="small" 
                            variant="outlined"
                            disabled={payment.status === 'paid'}
                          >
                            Record Payment
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Late Fees */}
        {lateFees.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Late Fees" />
              <CardContent>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tenant</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lateFees.map((fee) => (
                        <TableRow key={fee.id}>
                          <TableCell>{fee.tenant_name}</TableCell>
                          <TableCell>${fee.amount.toLocaleString()}</TableCell>
                          <TableCell>{new Date(fee.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{fee.description}</TableCell>
                          <TableCell>
                            <Chip 
                              label={fee.status.charAt(0).toUpperCase() + fee.status.slice(1)} 
                              color={fee.status === 'paid' ? 'success' : 'warning'} 
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recent Payment History */}
        <Grid item xs={12} md={lateFees.length > 0 ? 6 : 12}>
          <Card>
            <CardHeader title="Recent Payment History" />
            <CardContent>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tenant</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paymentHistory.payments.slice(0, 5).map((payment) => (<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>