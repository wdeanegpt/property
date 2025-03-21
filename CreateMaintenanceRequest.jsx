import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Card,
  CardMedia,
  CardContent,
  Divider
} from '@mui/material';
import { 
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { createMaintenanceRequest, uploadMaintenanceImages } from '../../../services/tenant/tenantService';

const CreateMaintenanceRequest = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    priority: 'medium',
    preferredDate: '',
    preferredTime: '',
    allowEntry: true,
    additionalNotes: ''
  });
  const [images, setImages] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [createdRequestId, setCreatedRequestId] = useState(null);

  // In a real implementation, this would come from authentication context
  const tenantId = 'current-tenant-id';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Create preview URLs for the images
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setImages(prev => [...prev, ...newImages]);
  };

  const handleRemoveImage = (index) => {
    setImages(prev => {
      const newImages = [...prev];
      // Revoke the object URL to avoid memory leaks
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!formData.category) {
      errors.category = 'Category is required';
    }
    
    if (!formData.location) {
      errors.location = 'Location is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (activeStep === 0) {
      const isValid = validateForm();
      if (!isValid) return;
    }
    
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create the maintenance request
      const requestData = {
        ...formData,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      const result = await createMaintenanceRequest(tenantId, requestData);
      
      // Upload images if any
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach(image => {
          formData.append('images', image.file);
        });
        
        await uploadMaintenanceImages(tenantId, result.id, formData);
      }
      
      setCreatedRequestId(result.id);
      setSuccess(true);
      handleNext();
    } catch (err) {
      console.error('Failed to create maintenance request:', err);
      setError('Failed to create maintenance request. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Request Details', 'Add Photos', 'Review & Submit', 'Confirmation'];

  const categories = [
    'Plumbing',
    'Electrical',
    'HVAC',
    'Appliance',
    'Structural',
    'Pest Control',
    'Locks/Keys',
    'Common Areas',
    'Other'
  ];

  const locations = [
    'Kitchen',
    'Bathroom',
    'Living Room',
    'Bedroom',
    'Hallway',
    'Balcony/Patio',
    'Entire Unit',
    'Common Area',
    'Other'
  ];

  const priorities = [
    { value: 'low', label: 'Low - Not urgent, can be scheduled' },
    { value: 'medium', label: 'Medium - Needs attention soon' },
    { value: 'high', label: 'High - Urgent issue requiring immediate attention' }
  ];

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Request Details
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  error={!!formErrors.title}
                  helperText={formErrors.title}
                  placeholder="Brief description of the issue (e.g., Leaking Bathroom Sink)"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Detailed Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  multiline
                  rows={4}
                  error={!!formErrors.description}
                  helperText={formErrors.description}
                  placeholder="Please provide details about the issue, including when it started and any troubleshooting you've tried"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required error={!!formErrors.category}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    label="Category"
                  >
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.category && (
                    <FormHelperText>{formErrors.category}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required error={!!formErrors.location}>
                  <InputLabel>Location</InputLabel>
                  <Select
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    label="Location"
                  >
                    {locations.map((location) => (
                      <MenuItem key={location} value={location}>
                        {location}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.location && (
                    <FormHelperText>{formErrors.location}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    label="Priority"
                  >
                    {priorities.map((priority) => (
                      <MenuItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Preferred Date (Optional)"
                  name="preferredDate"
                  type="date"
                  value={formData.preferredDate}
                  onChange={handleInputChange}
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Preferred Time (Optional)</InputLabel>
                  <Select
                    name="preferredTime"
                    value={formData.preferredTime}
                    onChange={handleInputChange}
                    label="Preferred Time (Optional)"
                  >
                    <MenuItem value="">No Preference</MenuItem>
                    <MenuItem value="morning">Morning (8AM - 12PM)</MenuItem>
                    <MenuItem value="afternoon">Afternoon (12PM - 5PM)</MenuItem>
                    <MenuItem value="evening">Evening (5PM - 8PM)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Permission to Enter</InputLabel>
                  <Select
                    name="allowEntry"
                    value={formData.allowEntry}
                    onChange={handleInputChange}
                    label="Permission to Enter"
                  >
                    <MenuItem value={true}>Yes, maintenance can enter if I'm not home</MenuItem>
                    <MenuItem value={false}>No, I need to be present</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Additional Notes (Optional)"
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Any additional information that might help maintenance staff"
                />
              </Grid>
            </Grid>
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Add Photos (Optional)
            </Typography>
            
            <Typography variant="body2" color="textSecondary" paragraph>
              Adding photos helps maintenance staff better understand and prepare for the issue.
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="image-upload"
                multiple
                type="file"
                onChange={handleImageUpload}
              />
              <label htmlFor="image-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<PhotoCameraIcon />}
                >
                  Upload Photos
                </Button>
              </label>
            </Box>
            
            {images.length > 0 && (
              <Grid container spacing={2}>
                {images.map((image, index) => (
                  <Grid item xs={6} sm={4} md={3} key={index}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="140"
                        image={image.preview}
                        alt={`Uploaded image ${index + 1}`}
                      />
                      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="textSecondary">
                            Image {index + 1}
                          </Typography>
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleRemoveImage(index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
            
            {images.length === 0 && (
              <Alert severity="info">
                No photos added. You can continue without adding photos, but they are recommended.
              </Alert>
            )}
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Request
            </Typography>
            
            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                {formData.title}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Category
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formData.category}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Location
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formData.location}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Priority
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ textTransform: 'capitalize' }}>
                    {formData.priority}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Permission to Enter
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formData.allowEntry ? 'Yes' : 'No, tenant must be present'}
                  </Typography>
                </Grid>
                
                {(formData.preferredDate || formData.preferredTime) && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">
                      Preferred Schedule
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {formData.preferredDate && new Date(formData.preferredDate).toLocaleDateString()}
                      {formData.preferredDate && formData.preferredTime && ', '}
                      {formData.preferredTime === 'morning' && 'Morning (8AM - 12PM)'}
                      {formData.preferredTime === 'afternoon' && 'Afternoon (12PM - 5PM<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>