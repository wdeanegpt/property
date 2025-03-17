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
  Tabs,
  Tab,
  IconButton,
  Divider
} from '@mui/material';
import { 
  AccountBalance, 
  Add, 
  ArrowUpward, 
  ArrowDownward, 
  Sync,
  AttachMoney,
  Description,
  FilterList,
  GetApp
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock service - would be replaced with actual API calls
const trustAccountService = {
  getTrustAccounts: async (propertyId) => {
    // Simulate API call
    return [
      { 
        id: 1, 
        property_id: propertyId, 
        name: 'Security Deposits',
        description: 'Tenant security deposits',
        balance: 5250,
        account_type: 'escrow',
        created_at: '2024-01-15'
      },
      { 
        id: 2, 
        property_id: propertyId, 
        name: 'Maintenance Reserve',
        description: 'Funds reserved for property maintenance',
        balance: 3750,
        account_type: 'reserve',
        created_at: '2024-01-15'
      },
      { 
        id: 3, 
        property_id: propertyId, 
        name: 'Property Tax Escrow',
        description: 'Funds reserved for property taxes',
        balance: 8200,
        account_type: 'escrow',
        created_at: '2024-01-15'
      }
    ];
  },
  getTransactions: async (accountId) => {
    // Simulate API call
    return {
      transactions: [
        {
          id: 1,
          trust_account_id: accountId,
          amount: 1500,
          transaction_type: 'deposit',
          category: 'security_deposit',
          description: 'Security deposit from tenant #101',
          reference_id: 'T101-SD',
          transaction_date: '2025-02-15',
          balance_after: 1500
        },
        {
          id: 2,
          trust_account_id: accountId,
          amount: 1750,
          transaction_type: 'deposit',
          category: 'security_deposit',
          description: 'Security deposit from tenant #102',
          reference_id: 'T102-SD',
          transaction_date: '2025-02-20',
          balance_after: 3250
        },
        {
          id: 3,
          trust_account_id: accountId,
          amount: 2000,
          transaction_type: 'deposit',
          category: 'security_deposit',
          description: 'Security deposit from tenant #103',
          reference_id: 'T103-SD',
          transaction_date: '2025-03-01',
          balance_after: 5250
        },
        {
          id: 4,
          trust_account_id: accountId,
          amount: 1200,
          transaction_type: 'deposit',
          category: 'maintenance',
          description: 'Monthly maintenance allocation',
          reference_id: 'MAINT-MAR',
          transaction_date: '2025-03-05',
          balance_after: 1200
        },
        {
          id: 5,
          trust_account_id: accountId,
          amount: 450,
          transaction_type: 'withdrawal',
          category: 'maintenance',
          description: 'Plumbing repair - Unit 201',
          reference_id: 'REP-201-P',
          transaction_date: '2025-03-10',
          balance_after: 750
        }
      ],
      pagination: {
        total: 12,
        limit: 10,
        offset: 0,
        hasMore: true
      }
    };
  },
  getAccountSummary: async (accountId) => {
    // Simulate API call
    return {
      account: {
        id: accountId,
        name: 'Security Deposits',
        description: 'Tenant security deposits',
        balance: 5250,
        account_type: 'escrow',
        created_at: '2024-01-15'
      },
      summary: [
        { transaction_type: 'deposit', total_amount: 5250, transaction_count: 3 },
        { transaction_type: 'withdrawal', total_amount: 0, transaction_count: 0 }
      ],
      recentTransactions: [
        {
          id: 3,
          trust_account_id: accountId,
          amount: 2000,
          transaction_type: 'deposit',
          category: 'security_deposit',
          description: 'Security deposit from tenant #103',
          reference_id: 'T103-SD',
          transaction_date: '2025-03-01',
          balance_after: 5250
        },
        {
          id: 2,
          trust_account_id: accountId,
          amount: 1750,
          transaction_type: 'deposit',
          category: 'security_deposit',
          description: 'Security deposit from tenant #102',
          reference_id: 'T102-SD',
          transaction_date: '2025-02-20',
          balance_after: 3250
        },
        {
          id: 1,
          trust_account_id: accountId,
          amount: 1500,
          transaction_type: 'deposit',
          category: 'security_deposit',
          description: 'Security deposit from tenant #101',
          reference_id: 'T101-SD',
          transaction_date: '2025-02-15',
          balance_after: 1500
        }
      ],
      monthlyTotals: [
        { month: '2025-01', deposits: 0, withdrawals: 0 },
        { month: '2025-02', deposits: 3250, withdrawals: 0 },
        { month: '2025-03', deposits: 2000, withdrawals: 0 }
      ]
    };
  }
};

const TrustAccountDashboard = ({ propertyId = 1 }) => {
  const [loading, setLoading] = useState(true);
  const [trustAccounts, setTrustAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountSummary, setAccountSummary] = useState(null);
  const [transactions, setTransactions] = useState({ transactions: [], pagination: {} });
  const [tabValue, setTabValue] = useState(0);
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  const [transactionType, setTransactionType] = useState('deposit');
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    category: '',
    description: '',
    reference_id: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      try {
        const accounts = await trustAccountService.getTrustAccounts(propertyId);
        setTrustAccounts(accounts);
        
        if (accounts.length > 0) {
          setSelectedAccount(accounts[0].id);
        }
      } catch (error) {
        console.error('Error fetching trust accounts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAccounts();
  }, [propertyId]);

  useEffect(() => {
    if (selectedAccount) {
      const fetchAccountData = async () => {
        setLoading(true);
        try {
          const [summary, transactionsData] = await Promise.all([
            trustAccountService.getAccountSummary(selectedAccount),
            trustAccountService.getTransactions(selectedAccount)
          ]);
          
          setAccountSummary(summary);
          setTransactions(transactionsData);
        } catch (error) {
          console.error('Error fetching account data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchAccountData();
    }
  }, [selectedAccount]);

  const handleAccountChange = (event) => {
    setSelectedAccount(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTransactionDialogOpen = (type) => {
    setTransactionType(type);
    setOpenTransactionDialog(true);
  };

  const handleTransactionDialogClose = () => {
    setOpenTransactionDialog(false);
  };

  const handleNewTransactionChange = (e) => {
    const { name, value } = e.target;
    setNewTransaction(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTransaction = () => {
    // In a real app, this would call an API to add the transaction
    console.log('Adding transaction:', {
      ...newTransaction,
      transaction_type: transactionType,
      trust_account_id: selectedAccount
    });
    handleTransactionDialogClose();
    // Reset form
    setNewTransaction({
      amount: '',
      category: '',
      description: '',
      reference_id: '',
      transaction_date: new Date().toISOString().split('T')[0]
    });
  };

  if (loading && !selectedAccount) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const getTransactionTypeColor = (type) => {
    return type === 'deposit' ? 'success' : 'error';
  };

  const getTransactionTypeIcon = (type) => {
    return type === 'deposit' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />;
  };

  // Transform monthly data for chart
  const chartData = accountSummary?.monthlyTotals.map(item => ({
    name: item.month.substring(5), // Just show MM format
    deposits: item.deposits,
    withdrawals: item.withdrawals,
    balance: item.deposits - item.withdrawals
  })) || [];

  const selectedAccountData = trustAccounts.find(account => account.id === selectedAccount);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Account Selection */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Trust Account</InputLabel>
                    <Select
                      value={selectedAccount || ''}
                      onChange={handleAccountChange}
                      label="Trust Account"
                    >
                      {trustAccounts.map(account => (
                        <MenuItem key={account.id} value={account.id}>
                          {account.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={5}>
                  {selectedAccountData && (
                    <Typography variant="body2" color="textSecondary">
                      {selectedAccountData.description} • {selectedAccountData.account_type.charAt(0).toUpperCase() + selectedAccountData.account_type.slice(1)} Account
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
                    sx={{ mr: 1 }}
                    onClick={() => handleTransactionDialogOpen('deposit')}
                  >
                    Deposit
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<ArrowDownward />}
                    onClick={() => handleTransactionDialogOpen('withdrawal')}
                  >
                    Withdraw
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Balance */}
        {selectedAccountData && (
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography color="textSecondary" gutterBottom>
                  Current Balance
                </Typography>
                <Typography variant="h3" component="div" sx={{ mb: 2 }}>
                  ${selectedAccountData.balance.toLocaleString()}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Account Summary
                </Typography>
                
                <Box sx={{ mt: 1 }}>
                  <Grid container>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Total Deposits:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                        ${accountSummary?.summary.find(s => s.transaction_type === 'deposit')?.total_amount.toLocaleString() || '0'}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Grid container sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Total Withdrawals:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>
                        ${accountSummary?.summary.find(s => s.transaction_type === 'withdrawal')?.total_amount.toLocaleString() || '0'}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Grid container sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Transactions:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        {accountSummary?.summary.reduce((sum, item) => sum + item.transaction_count, 0) || 0}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
                
                <Box sx={{ flexGrow: 1 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Button 
                    size="small" 
                    startIcon={<Description />}
                  >
                    Statement
                  </Button>
                  <Button 
                    size="small" 
                    startIcon={<GetApp />}
                  >
                    Export
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Account Activity Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardHeader 
              title="Account Activity" 
              subheader="Monthly balance changes"
            />
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => ['$' + value.toLocaleString()]} />
                  <Legend />
                  <Line type="monotone" dataKey="deposits" name="Deposits" stroke="#4caf50" activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="withdrawals" name="Withdrawals" stroke="#f44336" />
                  <Line type="monotone" dataKey="balance" name="Balance" stroke="#2196f3" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

   <response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>