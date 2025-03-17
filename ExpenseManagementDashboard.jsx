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
  Select,
  IconButton,
  Divider,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import { 
  Add, 
  Receipt, 
  FilterList, 
  CloudUpload, 
  AttachFile, 
  Delete,
  Edit,
  GetApp,
  PhotoCamera,
  Category,
  DateRange,
  Search
} from '@mui/icons-material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// Mock service - would be replaced with actual API calls
const expenseManagementService = {
  getExpenses: async (propertyId, options = {}) => {
    // Simulate API call
    return {
      expenses: [
        {
          id: 1,
          property_id: propertyId,
          amount: 450,
          category: 'repairs',
          vendor: 'ABC Plumbing',
          description: 'Plumbing repair - Unit 201',
          transaction_date: '2025-03-10',
          payment_method: 'check',
          reference_number: 'CHK-1001',
          receipt_image_id: 101,
          has_receipt: true
        },
        {
          id: 2,
          property_id: propertyId,
          amount: 275,
          category: 'utilities',
          vendor: 'City Power & Light',
          description: 'Electricity bill - March',
          transaction_date: '2025-03-15',
          payment_method: 'ach',
          reference_number: 'ACH-2025-03',
          receipt_image_id: 102,
          has_receipt: true
        },
        {
          id: 3,
          property_id: propertyId,
          amount: 850,
          category: 'landscaping',
          vendor: 'Green Thumb Landscaping',
          description: 'Monthly landscaping service',
          transaction_date: '2025-03-05',
          payment_method: 'credit_card',
          reference_number: 'CC-3456',
          receipt_image_id: null,
          has_receipt: false
        },
        {
          id: 4,
          property_id: propertyId,
          amount: 350,
          category: 'supplies',
          vendor: 'Home Supply Co.',
          description: 'Maintenance supplies',
          transaction_date: '2025-03-08',
          payment_method: 'credit_card',
          reference_number: 'CC-3457',
          receipt_image_id: 103,
          has_receipt: true
        },
        {
          id: 5,
          property_id: propertyId,
          amount: 1200,
          category: 'insurance',
          vendor: 'Reliable Insurance',
          description: 'Monthly insurance premium',
          transaction_date: '2025-03-01',
          payment_method: 'ach',
          reference_number: 'ACH-2025-03-INS',
          receipt_image_id: 104,
          has_receipt: true
        }
      ],
      pagination: {
        total: 15,
        limit: 10,
        offset: 0,
        hasMore: true
      }
    };
  },
  getExpenseSummary: async (propertyId) => {
    // Simulate API call
    return {
      totalExpenses: 3125,
      categorySummary: [
        { category: 'repairs', amount: 450, percentage: 14.4 },
        { category: 'utilities', amount: 275, percentage: 8.8 },
        { category: 'landscaping', amount: 850, percentage: 27.2 },
        { category: 'supplies', amount: 350, percentage: 11.2 },
        { category: 'insurance', amount: 1200, percentage: 38.4 }
      ],
      monthlyTrend: [
        { month: 'Oct', amount: 2850 },
        { month: 'Nov', amount: 2950 },
        { month: 'Dec', amount: 3200 },
        { month: 'Jan', amount: 2750 },
        { month: 'Feb', amount: 2900 },
        { month: 'Mar', amount: 3125 }
      ],
      receiptStatus: {
        withReceipts: 2275,
        withoutReceipts: 850
      }
    };
  },
  getReceiptImage: async (receiptId) => {
    // Simulate API call - in a real app, this would return an image URL
    return {
      id: receiptId,
      url: 'https://example.com/receipts/image.jpg',
      filename: 'receipt_image.jpg',
      upload_date: '2025-03-15',
      file_size: '156 KB'
    };
  }
};

const ExpenseManagementDashboard = ({ propertyId = 1 }) => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState({ expenses: [], pagination: {} });
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [openAddExpenseDialog, setOpenAddExpenseDialog] = useState(false);
  const [openReceiptDialog, setOpenReceiptDialog] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: '',
    vendor: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    reference_number: '',
    receipt_image: null
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [expensesData, summary] = await Promise.all([
          expenseManagementService.getExpenses(propertyId),
          expenseManagementService.getExpenseSummary(propertyId)
        ]);
        
        setExpenses(expensesData);
        setExpenseSummary(summary);
      } catch (error) {
        console.error('Error fetching expense data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [propertyId]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAddExpenseDialogOpen = () => {
    setOpenAddExpenseDialog(true);
  };

  const handleAddExpenseDialogClose = () => {
    setOpenAddExpenseDialog(false);
  };

  const handleNewExpenseChange = (e) => {
    const { name, value } = e.target;
    setNewExpense(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewExpense(prev => ({
        ...prev,
        receipt_image: e.target.files[0]
      }));
    }
  };

  const handleAddExpense = () => {
    // In a real app, this would call an API to add the expense
    console.log('Adding expense:', newExpense);
    handleAddExpenseDialogClose();
    // Reset form
    setNewExpense({
      amount: '',
      category: '',
      vendor: '',
      description: '',
      transaction_date: new Date().toISOString().split('T')[0],
      payment_method: '',
      reference_number: '',
      receipt_image: null
    });
  };

  const handleViewReceipt = async (receiptId) => {
    try {
      const receipt = await expenseManagementService.getReceiptImage(receiptId);
      setSelectedReceipt(receipt);
      setOpenReceiptDialog(true);
    } catch (error) {
      console.error('Error fetching receipt:', error);
    }
  };

  const handleCloseReceiptDialog = () => {
    setOpenReceiptDialog(false);
    setSelectedReceipt(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Expenses (This Month)
              </Typography>
              <Typography variant="h4" component="div">
                ${expenseSummary?.totalExpenses.toLocaleString()}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="textSecondary">
                  With Receipts: ${expenseSummary?.receiptStatus.withReceipts.toLocaleString()} 
                  ({Math.round((expenseSummary?.receiptStatus.withReceipts / expenseSummary?.totalExpenses) * 100)}%)
                </Typography>
                <Typography variant="body2" color="error">
                  Missing: ${expenseSummary?.receiptStatus.withoutReceipts.toLocaleString()}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Expense by Category */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardHeader 
              title="Expenses by Category" 
              action={
                <Button 
                  variant="contained" 
                  startIcon={<Add />}
                  onClick={handleAddExpenseDialogOpen}
                >
                  Add Expense
                </Button>
              }
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={expenseSummary?.categorySummary}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                        nameKey="category"
                        label={({ category, percentage }) => `${category}: ${percentage}%`}
                      >
                        {expenseSummary?.categorySummary.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                </Grid>
                <Grid item xs={12} md={7}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Category</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell align="right">%</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {expenseSummary?.categorySummary.map((category) => (
                          <TableRow key={category.category}>
                            <TableCell>
                              {category.category.charAt(0).toUpperCase() + category.category.slice(1)}
                            </TableCell>
                            <TableCell align="right">${category.amount.toLocaleString()}</TableCell>
                            <TableCell align="right">{category.percentage}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Trend */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Monthly Expense Trend" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={expenseSummary?.monthlyTrend}
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
                  <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Amount']} />
                  <Bar dataKey="amount" name="Expenses" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Expense List */}
        <Grid item xs={12}>
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="expense tabs">
                <Tab label="All Expenses" />
                <Tab label="With Receipts" />
                <Tab label={
                  <Badge badgeContent={expenses.expenses.filter(e => !e.has_receipt).length} color="error">
                    Missing Receipts
                  </Badge>
                } />
              </Tabs>
            </Box>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <TextField
                  placeholder="Search expenses..."
                  size="small"
                  InputProps={{
                    startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  sx={{ width: 250 }}
                />
                <Box>
                  <Button
                    size="small"
                    startIcon={<FilterList />}
                    sx={{ mr: 1 }}
                  >
                    Filter
                  </Button>
                  <Button
                    size="small"
                    startIcon={<GetApp />}
                  >
                    Export
                  </Button>
                </Box>
              </Box>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Vendor</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Payment Method</TableCell>
                      <TableCell>Receipt</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expenses.expenses
                      .filter(expense => {
                        if (tabValue === 0) return true;
                        if (tabValue === 1) return expense.has_receipt;
                        if (tabValue === 2) return !expense.has_receipt;
                        return true;
                      })
                      .map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>{new Date(expense.transaction_date).toLocaleDateString()}</TableCell>
                          <TableCell>{expense.vendor}</TableCell>
                          <TableCell>
                            {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                          </TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>${expense.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            {expense.payment_method.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </TableCell>
                          <TableCell>
                            {expense.has_receipt ? (
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={() => handleViewReceipt(expense.receipt_image_id)}
                              >
                                <Receipt />
                              </I<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>