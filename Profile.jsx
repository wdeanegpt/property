import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel
} from '@mui/material';
import { 
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fetchTenantProfile, updateTenantProfile } from '../../../services/tenant/tenantService';

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    emailRentReminders: true,
    emailMaintenanceUpdates: true,
    emailDocuments: true,
    emailAnnouncements: true,
    smsRentReminders: false,
    smsMaintenanceUpdates: true,
    smsDocuments: false,
    smsAnnouncements: false
  });

  // In a real implementation, this would come from authentication context
  const tenantId = 'current-tenant-id';

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await fetchTenantProfile(tenantId);
        setProfile(data);
        setEditedProfile(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Failed to load profile information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [tenantId]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEditToggle = () => {
    if (editMode) {
      // Cancel edit - reset to original profile
      setEditedProfile(profile);
    }
    setEditMode(!editMode);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNotificationChange = (setting) => (event) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: event.target.checked
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const updatedProfile = await updateTenantProfile(tenantId, editedProfile);
      setProfile(updatedProfile);
      setEditMode(false);
      setError(null);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile information. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordDialogOpen = () => {
    setPasswordDialog(true);
  };

  const handlePasswordDialogClose = () => {
    setPasswordDialog(false);
  };

  // Mock data for development - would be replaced by actual data in production
  const mockProfile = {
    id: 'tenant-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '(555) 123-4567',
    dateOfBirth: '1985-06-15',
    address: {
      street: '123 Sunset Blvd, Apt 101',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210'
    },
    emergencyContact: {
      name: 'Jane Doe',
      relationship: 'Spouse',
      phone: '(555) 987-6543'
    },
    moveInDate: '2023-01-01',
    leaseEndDate: '2024-01-01',
    profileImage: null,
    paymentMethods: [
      { id: 1, type: 'Credit Card', last4: '4242', expiryDate: '05/25', isDefault: true },
      { id: 2, type: 'Bank Account', last4: '9876', accountType: 'Checking', isDefault: false }
    ]
  };

  // Use mock data for now, would use profile from API in production
  const displayProfile = profile || mockProfile;
  const displayEditedProfile = editedProfile || mockProfile;

  if (loading && !profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading profile...</Typography>
      </Box>
    );
  }

  const renderPersonalInfo = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Personal Information
        </Typography>
        <Button 
          startIcon={editMode ? <CancelIcon /> : <EditIcon />}
          onClick={handleEditToggle}
          color={editMode ? 'error' : 'primary'}
        >
          {editMode ? 'Cancel' : 'Edit'}
        </Button>
      </Box>
      
      {editMode ? (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="First Name"
              name="firstName"
              value={displayEditedProfile.firstName}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Last Name"
              name="lastName"
              value={displayEditedProfile.lastName}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              name="email"
              value={displayEditedProfile.email}
              onChange={handleInputChange}
              fullWidth
              required
              type="email"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone"
              name="phone"
              value={displayEditedProfile.phone}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Date of Birth"
              name="dateOfBirth"
              value={displayEditedProfile.dateOfBirth}
              onChange={handleInputChange}
              fullWidth
              type="date"
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Current Address
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Street Address"
              name="address.street"
              value={displayEditedProfile.address.street}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="City"
              name="address.city"
              value={displayEditedProfile.address.city}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="State"
              name="address.state"
              value={displayEditedProfile.address.state}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="ZIP Code"
              name="address.zipCode"
              value={displayEditedProfile.address.zipCode}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Emergency Contact
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Name"
              name="emergencyContact.name"
              value={displayEditedProfile.emergencyContact.name}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Relationship"
              name="emergencyContact.relationship"
              value={displayEditedProfile.emergencyContact.relationship}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Phone"
              name="emergencyContact.phone"
              value={displayEditedProfile.emergencyContact.phone}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sx={{ mt: 2, textAlign: 'right' }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<SaveIcon />}
              onClick={handleSaveProfile}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Avatar 
                sx={{ width: 120, height: 120, mb: 2 }}
                src={displayProfile.profileImage}
              >
                {displayProfile.firstName.charAt(0)}{displayProfile.lastName.charAt(0)}
              </Avatar>
              <Button size="small" startIcon={<EditIcon />}>
                Change Photo
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={8}>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Name" 
                  secondary={`${displayProfile.firstName} ${displayProfile.lastName}`} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <EmailIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Email" 
                  secondary={displayProfile.email} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PhoneIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Phone" 
                  secondary={displayProfile.phone} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <HomeIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Address" 
                  secondary={`${displayProfile.address.street}, ${displayProfile.address.city}, ${displayProfile.address.state} ${displayProfile.address.zipCode}`} 
                />
              </ListItem>
            </List>
            
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
              Emergency Contact
            </Typography>
            <Typography variant="body2">
              {displayProfile.emergencyContact.name} ({displayProfile.emergencyContact.relationship})
            </Typography>
            <Typography variant="body2">
              {displayProfile.emergencyContact.phone}
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="outlined" 
                color="primary" 
                startIcon={<SecurityIcon />}
                onClick={handlePasswordDialogOpen}
                sx={{ mr: 1 }}
              >
                Change Password
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}
    </Paper>
  );

  const renderLeaseInfo = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Lease Information
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Current Lease
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Move-in Date
              </Typography>
              <Typography variant="body1" gutterBottom>
                {format(new Date(displayProfile.moveInDate), 'MMMM d, yyyy')}
              </Typography>
              
              <Typography variant="body2" color="textSecondary">
                Lease End Date
              </Typography>
              <Typography variant="body1" gutterBottom>
                {format(new Date(displayProfile.leaseEndDate), 'MMMM d, yyyy')}
              </Typography>
              
              <Typography variant="body2" color="textSecondary">
                Lease Status
              </Typography>
              <Typography variant="body1">
                Active
              </Typography>
              
              <Button 
                variant="outlined" 
                size="small" 
                sx={{ mt: 2 }}
              >
                View Lease Document
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Renewal Information
              </Typography>
              
              <Typography variant="body2">
                Your lease will expire in {Math.ceil((new Date(displayProfile.leaseEndDate) - new Date()) / (1000 * 60 * 60 * 24))} days.
              </Typography>
              
              <Typography variant="body2" sx={{ mt: 2 }}>
                Renewal options will be available 60 days before your lease end date.
              </Typography>
              
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ mt: 2 }}
                disabled={Math.ceil((new Date(displayProfile.leaseEndDate) - new Date()) / (1000 * 60 * 60 * 24)) > 60}
              >
                View Renewal Options
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );

  const renderPaymentMethods = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Payment Methods
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<PaymentIcon />}
        >
          Add Payment Method
        </Button>
      </Box>
      
      {displayProfile.paymentMethods.length === 0 ? (
        <Alert severity="info">
          You have no saved payment methods. Add a payment method to enable quick payments.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {displayProfile.paymentMethods.map((method) => (
            <Grid item xs={12} sm={6} key={method.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>