import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  Button, 
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  MoreVert as MoreVertIcon,
  PhotoCamera as PhotoCameraIcon,
  Comment as CommentIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fetchMaintenanceRequests } from '../../../services/tenant/tenantService';

const MaintenanceRequests = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requests, setRequests] = useState([]);
  const [tabValue, setTabValue] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // In a real implementation, this would come from authentication context
  const tenantId = 'current-tenant-id';

  useEffect(() => {
    const loadMaintenanceRequests = async () => {
      try {
        setLoading(true);
        
        // Filter by status if not 'all'
        const options = {};
        if (tabValue !== 'all') {
          options.status = tabValue;
        }
        
        const data = await fetchMaintenanceRequests(tenantId, options);
        setRequests(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load maintenance requests:', err);
        setError('Failed to load maintenance requests. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadMaintenanceRequests();
  }, [tenantId, tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOpenDetails = (request) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'in-progress':
        return <ScheduleIcon color="primary" />;
      case 'pending':
        return <ScheduleIcon color="warning" />;
      case 'cancelled':
        return <ErrorIcon color="error" />;
      default:
        return <BuildIcon color="action" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'primary';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  // Mock data for development - would be replaced by actual data in production
  const mockRequests = [
    { 
      id: 1, 
      title: 'Leaky Faucet', 
      description: 'The kitchen faucet is leaking and causing water damage to the cabinet below.',
      status: 'in-progress', 
      createdAt: '2023-03-15', 
      updatedAt: '2023-03-16',
      priority: 'medium',
      category: 'Plumbing',
      location: 'Kitchen',
      assignedTo: 'John Smith',
      scheduledDate: '2023-03-20',
      scheduledTime: '10:00 AM - 12:00 PM',
      images: ['image1.jpg', 'image2.jpg'],
      comments: [
        { id: 1, author: 'Tenant', text: 'The leak is getting worse.', date: '2023-03-16' },
        { id: 2, author: 'Maintenance', text: 'We will send a plumber tomorrow.', date: '2023-03-16' }
      ]
    },
    { 
      id: 2, 
      title: 'Broken Light Fixture', 
      description: 'The ceiling light in the living room is not working. I have tried replacing the bulb but it still does not work.',
      status: 'completed', 
      createdAt: '2023-02-20', 
      updatedAt: '2023-02-22',
      priority: 'low',
      category: 'Electrical',
      location: 'Living Room',
      assignedTo: 'Jane Doe',
      completedDate: '2023-02-22',
      images: ['image3.jpg'],
      comments: [
        { id: 3, author: 'Tenant', text: 'The light is completely out.', date: '2023-02-20' },
        { id: 4, author: 'Maintenance', text: 'Fixed the wiring issue.', date: '2023-02-22' }
      ]
    },
    { 
      id: 3, 
      title: 'HVAC Not Cooling', 
      description: 'The air conditioning is not cooling the apartment. The system is running but only blowing warm air.',
      status: 'pending', 
      createdAt: '2023-03-18', 
      updatedAt: '2023-03-18',
      priority: 'high',
      category: 'HVAC',
      location: 'Entire Unit',
      images: [],
      comments: []
    },
    { 
      id: 4, 
      title: 'Dishwasher Not Draining', 
      description: 'The dishwasher is not draining properly and leaving standing water at the bottom after each cycle.',
      status: 'cancelled', 
      createdAt: '2023-01-10', 
      updatedAt: '2023-01-12',
      priority: 'medium',
      category: 'Appliance',
      location: 'Kitchen',
      cancellationReason: 'Tenant resolved the issue',
      images: ['image4.jpg'],
      comments: [
        { id: 5, author: 'Tenant', text: 'I found the clog and fixed it myself.', date: '2023-01-12' }
      ]
    }
  ];

  // Use mock data for now, would use requests from API in production
  const displayRequests = requests.length > 0 ? requests : mockRequests;

  // Filter requests based on selected tab
  const filteredRequests = tabValue === 'all' 
    ? displayRequests 
    : displayRequests.filter(request => request.status === tabValue);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading maintenance requests...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Maintenance Requests
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<BuildIcon />}
          href="/tenant/maintenance/new"
        >
          New Request
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="All Requests" value="all" />
          <Tab label="Pending" value="pending" />
          <Tab label="In Progress" value="in-progress" />
          <Tab label="Completed" value="completed" />
        </Tabs>
      </Paper>
      
      {filteredRequests.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            No maintenance requests found
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {tabValue === 'all' 
              ? 'You have not submitted any maintenance requests yet.' 
              : `You have no ${tabValue} maintenance requests.`}
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ mt: 2 }}
            startIcon={<BuildIcon />}
            href="/tenant/maintenance/new"
          >
            Submit a Request
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredRequests.map((request) => (
            <Grid item xs={12} md={6} key={request.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getStatusIcon(request.status)}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {request.title}
                      </Typography>
                    </Box>
                    <Box>
                      <Chip 
                        label={request.status.replace('-', ' ')} 
                        color={getStatusColor(request.status)} 
                        size="small" 
                        sx={{ textTransform: 'capitalize' }}
                      />
                      <IconButton size="small" sx={{ ml: 1 }}>
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    {request.description.length > 100 
                      ? `${request.description.substring(0, 100)}...` 
                      : request.description}
                  </Typography>
                  
                  <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip 
                      label={`Priority: ${request.priority}`} 
                      color={getPriorityColor(request.priority)} 
                      size="small" 
                      sx={{ textTransform: 'capitalize' }}
                    />
                    <Chip 
                      label={request.category} 
                      variant="outlined" 
                      size="small" 
                    />
                    <Chip 
                      label={request.location} 
                      variant="outlined" 
                      size="small" 
                    />
                  </Box>
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      Created: {format(new Date(request.createdAt), 'MMM d, yyyy')}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {request.images.length > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                          <PhotoCameraIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="textSecondary" sx={{ ml: 0.5 }}>
                            {request.images.length}
                          </Typography>
                        </Box>
                      )}
                      
                      {request.comments.length > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CommentIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="textSecondary" sx={{ ml: 0.5 }}>
                            {request.comments.length}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleOpenDetails(request)}>
                    View Details
                  </Button>
                  {request.status === 'pending' && (
                    <Button size="small" color="error">
                      Cancel Request
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Request Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        {selectedRequest && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {getStatusIcon(selectedRequest.status)}
                <Typography variant="h6" sx={{ ml: 1 }}>
                  {selectedRequest.title}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle1" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {selectedRequest.description}
                  </Typography>
                  
                  <Box sx={{ mt: 2, mb: 3 }}>
                    <Chip 
                      label={`Status: ${selectedRequest.status.replace('-', ' ')}`} 
                      color={getStatusColor(selectedRequest.status)} 
                      sx={{ mr: 1, mb: 1, textTransform: 'capitalize' }}
                    />
                    <Chip 
                      label={`Priority: ${selectedRequest.priority}`} 
                      color={getPriorityColor(selectedRequest.priority)} 
                      sx={{ mr: 1, mb: 1, textTransform: 'capitalize' }}
                    />
                    <Chip 
                      label={`Category: ${selectedRequest.category}`} 
                      variant="outlined" 
                      sx={{ mr: 1, mb: 1 }}
                    />
                    <Chip 
                      label={`Location: ${selectedRequest.location}`} 
                      variant="outlined" 
                      sx={{ mr: 1, mb: 1 }}
                    />
                  </Box>
                  
                  {selectedRequest.scheduledDate && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Scheduled Service
                      </Typography>
                      <Typography variant="body1">
                        {format(new Date(selectedRequest.scheduledDate), 'MMMM d, yyyy')} at {selectedRequest.scheduledTime}
                      </Typography>
                      {selectedRequest.assignedTo && (
                        <Typography variant="body2" color="textSecondary">
                          Assigned to: {selectedRequest.assignedTo}
                        </Typography>
                      )}
                    </Box>
                  )}
                  
                  {selectedRequest.completedDate && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Completion Details
                      </Typography>
                      <Typography variant="body1">
                        Completed on {format(new Date(selectedRequest.completedDate), 'MMMM d, yyyy')}
                      </Typography>
                    </Box>
                  )}
                  
                  {selectedRequest.cancellationReason && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Cancellation Reason
                      </Typography>
                      <Typography variant="body1">
                        {selectedRequest.cancellationReason}
                      </Typography>
                    </Box>
                  )}
                  
                  {selectedRequest.comments.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Comments
  <response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>