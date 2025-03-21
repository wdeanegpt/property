import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Grid, 
  FormControl, 
  FormControlLabel,
  RadioGroup,
  Radio,
  Checkbox,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { 
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { makePayment, setupAutopay, fetchTenantLease } from '../../../services/tenant/tenantService';

const MakePayment = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [leaseInfo, setLeaseInfo] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('creditCard');
  const [setupAutopayOption, setSetupAutopayOption] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    cardNumber: '',
    cardExpiry: '',
    cardCVV: '',
    nameOnCard: '',
    accountNumber: '',
    routingNumber: '',
    accountType: 'checking',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: ''
  });
  const [confirmationDetails, setConfirmationDetails] = useState(null);

  // In a real implementation, this would come from authentication context
  const tenantId = 'current-tenant-id';

  useEffect(() => {
    const loadLeaseInfo = async () => {
      try {
        setLoading(true);
        const data = await fetchTenantLease(tenantId);
        setLeaseInfo(data);
        
        // Pre-fill amount with rent amount from lease
        if (data && data.rentAmount) {
          setPaymentData(prev => ({
            ...prev,
            amount: data.rentAmount.toString()
          }));
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to load lease information:', err);
        setError('Failed to load lease information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadLeaseInfo();
  }, [tenantId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
  };

  const handleAutopayChange = (e) => {
    setSetupAutopayOption(e.target.checked);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Prepare payment data based on selected method
      const paymentDetails = {
        amount: parseFloat(paymentData.amount),
        paymentMethod,
        paymentDetails: paymentMethod === 'creditCard' 
          ? {
              cardNumber: paymentData.cardNumber,
              cardExpiry: paymentData.cardExpiry,
              cardCVV: paymentData.cardCVV,
              nameOnCard: paymentData.nameOnCard
            }
          : {
              accountNumber: paymentData.accountNumber,
              routingNumber: paymentData.routingNumber,
              accountType: paymentData.accountType
            },
        billingAddress: {
          address: paymentData.billingAddress,
          city: paymentData.billingCity,
          state: paymentData.billingState,
          zip: paymentData.billingZip
        }
      };
      
      // Make payment
      const result = await makePayment(tenantId, paymentDetails);
      
      // Setup autopay if selected
      if (setupAutopayOption) {
        const autopayDetails = {
          paymentMethod,
          paymentDetails: paymentMethod === 'creditCard' 
            ? {
                cardNumber: paymentData.cardNumber,
                cardExpiry: paymentData.cardExpiry,
                nameOnCard: paymentData.nameOnCard
              }
            : {
                accountNumber: paymentData.accountNumber,
                routingNumber: paymentData.routingNumber,
                accountType: paymentData.accountType
              },
          frequency: 'monthly',
          startDate: new Date().toISOString(),
          amount: parseFloat(paymentData.amount)
        };
        
        await setupAutopay(tenantId, autopayDetails);
      }
      
      // Set confirmation details
      setConfirmationDetails({
        transactionId: result.transactionId || 'TX-' + Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        amount: parseFloat(paymentData.amount),
        method: paymentMethod === 'creditCard' ? 'Credit Card' : 'Bank Account',
        autopayEnabled: setupAutopayOption
      });
      
      setSuccess(true);
      handleNext();
    } catch (err) {
      console.error('Payment failed:', err);
      setError('Payment processing failed. Please check your information and try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Payment Details', 'Review & Confirm', 'Confirmation'];

  // Mock data for development - would be replaced by actual data in production
  const mockLeaseInfo = {
    propertyName: 'Sunset Apartments',
    unitNumber: '101',
    rentAmount: 1200,
    dueDate: 1, // 1st of each month
    leaseStatus: 'active'
  };

  // Use mock data for now, would use leaseInfo from API in production
  const lease = leaseInfo || mockLeaseInfo;

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Payment Amount
            </Typography>
            <TextField
              label="Amount"
              name="amount"
              value={paymentData.amount}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Payment Method
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup
                aria-label="payment-method"
                name="payment-method"
                value={paymentMethod}
                onChange={handlePaymentMethodChange}
              >
                <FormControlLabel 
                  value="creditCard" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CreditCardIcon sx={{ mr: 1 }} />
                      <Typography>Credit/Debit Card</Typography>
                    </Box>
                  } 
                />
                <FormControlLabel 
                  value="bankAccount" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <BankIcon sx={{ mr: 1 }} />
                      <Typography>Bank Account (ACH)</Typography>
                    </Box>
                  } 
                />
              </RadioGroup>
            </FormControl>
            
            {paymentMethod === 'creditCard' ? (
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12}>
                  <TextField
                    label="Card Number"
                    name="cardNumber"
                    value={paymentData.cardNumber}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    placeholder="1234 5678 9012 3456"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Expiration Date"
                    name="cardExpiry"
                    value={paymentData.cardExpiry}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    placeholder="MM/YY"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="CVV"
                    name="cardCVV"
                    value={paymentData.cardCVV}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    placeholder="123"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Name on Card"
                    name="nameOnCard"
                    value={paymentData.nameOnCard}
                    onChange={handleInputChange}
                    fullWidth
                    required
                  />
                </Grid>
              </Grid>
            ) : (
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12}>
                  <TextField
                    label="Account Number"
                    name="accountNumber"
                    value={paymentData.accountNumber}
                    onChange={handleInputChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Routing Number"
                    name="routingNumber"
                    value={paymentData.routingNumber}
                    onChange={handleInputChange}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <RadioGroup
                      aria-label="account-type"
                      name="accountType"
                      value={paymentData.accountType}
                      onChange={handleInputChange}
                      row
                    >
                      <FormControlLabel value="checking" control={<Radio />} label="Checking" />
                      <FormControlLabel value="savings" control={<Radio />} label="Savings" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              </Grid>
            )}
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Billing Address
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Street Address"
                  name="billingAddress"
                  value={paymentData.billingAddress}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="City"
                  name="billingCity"
                  value={paymentData.billingCity}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="State"
                  name="billingState"
                  value={paymentData.billingState}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="ZIP Code"
                  name="billingZip"
                  value={paymentData.billingZip}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={setupAutopayOption}
                    onChange={handleAutopayChange}
                    name="setupAutopay"
                    color="primary"
                  />
                }
                label="Set up automatic payments for future rent"
              />
            </Box>
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Payment Details
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Payment Amount
                </Typography>
                <Typography variant="h5" color="primary" gutterBottom>
                  ${parseFloat(paymentData.amount).toFixed(2)}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  Payment Method
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {paymentMethod === 'creditCard' ? (
                    <>
                      <CreditCardIcon sx={{ mr: 1 }} />
                      <Typography>
                        Credit Card ending in {paymentData.cardNumber.slice(-4)}
                      </Typography>
                    </>
                  ) : (
                    <>
                      <BankIcon sx={{ mr: 1 }} />
                      <Typography>
                        {paymentData.accountType.charAt(0).toUpperCase() + paymentData.accountType.slice(1)} Account ending in {paymentData.accountNumber.slice(-4)}
                      </Typography>
                    </>
                  )}
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  Billing Address
                </Typography>
                <Typography>
                  {paymentData.billingAddress}<br />
                  {paymentData.billingCity}, {paymentData.billingState} {paymentData.billingZip}
                </Typography>
                
                {setupAutopayOption && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" gutterBottom>
                      Automatic Payments
                    </Typography>
                    <Typography>
                      You have chosen to set up automatic payments for future rent.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Your account will be charged ${parseFloat(paymentData.amount).toFixed(2)} on the 1st of each month.
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              By clicking "Make Payment", you authorize a charge of ${parseFloat(paymentData.amount).toFixed(2)} to your {paymentMethod === 'creditCard' ? 'credit card' : 'bank account'}.
              {setupAutopayOption && ' You also authorize future monthly payments on the 1st of each month.'}
            </Alert>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Payment Successful!
   <response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>