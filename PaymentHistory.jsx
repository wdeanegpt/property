import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  Chip,
  Button,
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { fetchPaymentHistory } from '../../../services/tenant/tenantService';

const PaymentHistory = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    status: ''
  });

  // In a real implementation, this would come from authentication context
  const tenantId = 'current-tenant-id';

  useEffect(() => {
    const loadPaymentHistory = async () => {
      try {
        setLoading(true);
        
        // Convert dates to ISO strings if they exist
        const options = {
          ...filters,
          startDate: filters.startDate ? filters.startDate.toISOString() : undefined,
          endDate: filters.endDate ? filters.endDate.toISOString() : undefined,
        };
        
        const data = await fetchPaymentHistory(tenantId, options);
        setPayments(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load payment history:', err);
        setError('Failed to load payment history. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadPaymentHistory();
  }, [tenantId, filters]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(0);
  };

  const resetFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      status: ''
    });
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  // Mock data for development - would be replaced by actual data in production
  const mockPayments = [
    { id: 1, date: '2023-03-01', amount: 1200, status: 'completed', type: 'Rent', method: 'Credit Card', reference: 'REF123456' },
    { id: 2, date: '2023-02-01', amount: 1200, status: 'completed', type: 'Rent', method: 'ACH Transfer', reference: 'REF123457' },
    { id: 3, date: '2023-01-01', amount: 1200, status: 'completed', type: 'Rent', method: 'Credit Card', reference: 'REF123458' },
    { id: 4, date: '2022-12-01', amount: 1200, status: 'completed', type: 'Rent', method: 'ACH Transfer', reference: 'REF123459' },
    { id: 5, date: '2022-11-01', amount: 1200, status: 'completed', type: 'Rent', method: 'Credit Card', reference: 'REF123460' },
    { id: 6, date: '2022-10-01', amount: 1200, status: 'completed', type: 'Rent', method: 'ACH Transfer', reference: 'REF123461' },
    { id: 7, date: '2022-09-01', amount: 1200, status: 'completed', type: 'Rent', method: 'Credit Card', reference: 'REF123462' },
    { id: 8, date: '2022-08-01', amount: 1200, status: 'completed', type: 'Rent', method: 'ACH Transfer', reference: 'REF123463' },
    { id: 9, date: '2022-07-01', amount: 1200, status: 'completed', type: 'Rent', method: 'Credit Card', reference: 'REF123464' },
    { id: 10, date: '2022-06-01', amount: 1200, status: 'completed', type: 'Rent', method: 'ACH Transfer', reference: 'REF123465' },
    { id: 11, date: '2022-05-01', amount: 1200, status: 'completed', type: 'Rent', method: 'Credit Card', reference: 'REF123466' },
    { id: 12, date: '2022-04-01', amount: 1200, status: 'completed', type: 'Rent', method: 'ACH Transfer', reference: 'REF123467' }
  ];

  // Use mock data for now, would use payments from API in production
  const displayPayments = payments.length > 0 ? payments : mockPayments;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading payment history...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Payment History
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filter Payments
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="From Date"
                value={filters.startDate}
                onChange={(newValue) => handleFilterChange('startDate', newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="To Date"
                value={filters.endDate}
                onChange={(newValue) => handleFilterChange('endDate', newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              fullWidth
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button 
              variant="outlined" 
              onClick={resetFilters}
              fullWidth
            >
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Payment History Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="payment history table">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayPayments
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((payment) => (
                  <TableRow hover key={payment.id}>
                    <TableCell>{format(new Date(payment.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{payment.type}</TableCell>
                    <TableCell>${payment.amount.toFixed(2)}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell>{payment.reference}</TableCell>
                    <TableCell>
                      <Chip 
                        label={payment.status} 
                        color={getStatusColor(payment.status)} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="small">View Receipt</Button>
                    </TableCell>
                  </TableRow>
                ))}
              {displayPayments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No payment records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={displayPayments.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Container>
  );
};

export default PaymentHistory;
