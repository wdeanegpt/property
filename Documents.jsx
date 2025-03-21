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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { 
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fetchTenantDocuments, downloadDocument } from '../../../services/tenant/tenantService';

const Documents = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [tabValue, setTabValue] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // In a real implementation, this would come from authentication context
  const tenantId = 'current-tenant-id';

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true);
        
        // Filter by category if not 'all'
        const options = {};
        if (tabValue !== 'all') {
          options.category = tabValue;
        }
        
        const data = await fetchTenantDocuments(tenantId, options);
        setDocuments(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load documents:', err);
        setError('Failed to load documents. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [tenantId, tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleOpenPreview = (document) => {
    setSelectedDocument(document);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
  };

  const handleDownload = async (document) => {
    try {
      setDownloadLoading(true);
      const blob = await downloadDocument(tenantId, document.id);
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = document.title;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download document:', err);
      setError('Failed to download document. Please try again later.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const getDocumentIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <PdfIcon color="error" />;
      case 'image':
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <ImageIcon color="primary" />;
      default:
        return <FileIcon color="action" />;
    }
  };

  // Mock data for development - would be replaced by actual data in production
  const mockDocuments = [
    { 
      id: 1, 
      title: 'Lease Agreement', 
      type: 'PDF', 
      category: 'lease', 
      uploadDate: '2023-01-01',
      size: '2.4 MB',
      description: 'Residential lease agreement for the current term'
    },
    { 
      id: 2, 
      title: 'Move-in Inspection', 
      type: 'PDF', 
      category: 'inspection', 
      uploadDate: '2023-01-02',
      size: '1.8 MB',
      description: 'Property condition report from initial move-in'
    },
    { 
      id: 3, 
      title: 'Rent Payment Receipt - January 2023', 
      type: 'PDF', 
      category: 'payment', 
      uploadDate: '2023-01-05',
      size: '0.5 MB',
      description: 'Receipt for January 2023 rent payment'
    },
    { 
      id: 4, 
      title: 'Rent Payment Receipt - February 2023', 
      type: 'PDF', 
      category: 'payment', 
      uploadDate: '2023-02-03',
      size: '0.5 MB',
      description: 'Receipt for February 2023 rent payment'
    },
    { 
      id: 5, 
      title: 'Rent Payment Receipt - March 2023', 
      type: 'PDF', 
      category: 'payment', 
      uploadDate: '2023-03-02',
      size: '0.5 MB',
      description: 'Receipt for March 2023 rent payment'
    },
    { 
      id: 6, 
      title: 'Community Rules and Regulations', 
      type: 'PDF', 
      category: 'rules', 
      uploadDate: '2023-01-01',
      size: '1.2 MB',
      description: 'Property rules and regulations document'
    },
    { 
      id: 7, 
      title: 'Maintenance Request - Leaky Faucet', 
      type: 'PDF', 
      category: 'maintenance', 
      uploadDate: '2023-03-16',
      size: '0.8 MB',
      description: 'Documentation for maintenance request #1'
    },
    { 
      id: 8, 
      title: 'Property Photo - Living Room', 
      type: 'Image', 
      category: 'property', 
      uploadDate: '2023-01-02',
      size: '3.5 MB',
      description: 'Photo of living room from move-in inspection'
    }
  ];

  // Use mock data for now, would use documents from API in production
  const displayDocuments = documents.length > 0 ? documents : mockDocuments;

  // Filter documents based on selected tab and search term
  const filteredDocuments = displayDocuments
    .filter(doc => tabValue === 'all' || doc.category === tabValue)
    .filter(doc => 
      searchTerm === '' || 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading documents...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Documents
      </Typography>
      
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
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All Documents" value="all" />
          <Tab label="Lease" value="lease" />
          <Tab label="Payments" value="payment" />
          <Tab label="Inspections" value="inspection" />
          <Tab label="Maintenance" value="maintenance" />
          <Tab label="Rules" value="rules" />
          <Tab label="Property" value="property" />
        </Tabs>
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={8}>
            <TextField
              fullWidth
              placeholder="Search documents..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Button 
              startIcon={<FilterListIcon />}
              sx={{ mr: 1 }}
            >
              Filter
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<DescriptionIcon />}
            >
              Upload Document
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {filteredDocuments.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            No documents found
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {searchTerm 
              ? 'No documents match your search criteria.' 
              : tabValue === 'all' 
                ? 'There are no documents available in your account.' 
                : `There are no ${tabValue} documents available.`}
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Document</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow hover key={doc.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getDocumentIcon(doc.type)}
                        <Box sx={{ ml: 2 }}>
                          <Typography variant="body1">
                            {doc.title}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {doc.description}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={doc.category} 
                        size="small" 
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(doc.uploadDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {doc.size}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenPreview(doc)}
                        title="Preview"
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDownload(doc)}
                        title="Download"
                        disabled={downloadLoading}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      
      {/* Document Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
      >
        {selectedDocument && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">
                  {selectedDocument.title}
                </Typography>
                <Chip 
                  label={selectedDocument.type} 
                  size="small" 
                  color={selectedDocument.type.toLowerCase() === 'pdf' ? 'error' : 'primary'}
                />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
                {selectedDocument.type.toLowerCase() === 'pdf' ? (
                  <Box sx={{ textAlign: 'center' }}>
                    <PdfIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
                    <Typography variant="body1" gutterBottom>
                      PDF Preview Not Available
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Please download the document to view its contents.
                    </Typography>
                  </Box>
                ) : selectedDocument.type.toLowerCase() === 'image' ? (
                  <Box sx={{ textAlign: 'center' }}>
                    <ImageIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                    <Typography variant="body1" gutterBottom>
                      Image Preview
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      In a real implementation, the image would be displayed here.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center' }}>
                    <FileIcon sx={{ fontSize: 80, color: 'action.main', mb: 2 }} />
                    <Typography variant="body1" gutterBottom>
                      File Preview Not Available
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Please download the document to view its contents.
                    </Typography>
                  </Box>
                )}
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      Category
                    </Typography>
                    <Typography variant="body1" gutterBottom sx={{ textTransform: 'capitalize' }}>
                      {selectedDocument.category}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      Upload Date
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {format(new Date(selectedDocument.uploadDate), 'MMMM d, yyyy')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      File Size
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedDocument.size}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      File Type
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedDocument.type}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">
                      Description
                    </Typography>
                    <Typography variant="body1">
                      {selectedDocument.description}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClosePreview}>
                Close
              </Button>
              <Button 
 <response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>