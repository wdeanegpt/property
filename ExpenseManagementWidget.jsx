import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Spinner, Alert, Form, Row, Col, Modal, Tabs, Tab } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faReceipt, 
  faUpload, 
  faCamera, 
  faFileInvoice, 
  faExclamationTriangle,
  faCheckCircle,
  faInfoCircle,
  faSearch,
  faSync
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import moment from 'moment';
import './ExpenseManagementWidget.css';

/**
 * Expense Management Widget Component
 * 
 * This component displays and manages expenses with receipt scanning,
 * automatic categorization, and accounting software integration.
 */
const ExpenseManagementWidget = ({ propertyId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showScanReceiptModal, setShowScanReceiptModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showExpenseDetailModal, setShowExpenseDetailModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    propertyId: propertyId,
    unitId: '',
    categoryId: '',
    vendorId: '',
    description: '',
    amount: '',
    expenseDate: moment().format('YYYY-MM-DD'),
    paymentMethod: 'credit_card',
    reference: '',
    isTaxDeductible: false,
    notes: ''
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [exportForm, setExportForm] = useState({
    startDate: moment().startOf('month').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
    accountingSoftware: 'quickbooks',
    exportOptions: {}
  });
  const [filterForm, setFilterForm] = useState({
    categoryId: '',
    vendorId: '',
    startDate: moment().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
    taxDeductibleOnly: false,
    searchTerm: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    limit: 10
  });

  // Fetch expenses
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const offset = (pagination.currentPage - 1) * pagination.limit;
        
        const response = await axios.get(`/api/expenses/property/${propertyId}`, {
          params: {
            categoryId: filterForm.categoryId || undefined,
            vendorId: filterForm.vendorId || undefined,
            startDate: filterForm.startDate,
            endDate: filterForm.endDate,
            taxDeductibleOnly: filterForm.taxDeductibleOnly,
            limit: pagination.limit,
            offset
          }
        });
        
        setExpenses(response.data.expenses);
        setTotalExpenses(response.data.count);
        setPagination({
          ...pagination,
          totalPages: Math.ceil(response.data.count / pagination.limit)
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching expenses:', err);
        setError('Failed to load expense data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchExpenses();
  }, [propertyId, pagination.currentPage, pagination.limit, filterForm]);

  // Fetch categories and vendors
  useEffect(() => {
    const fetchCategoriesAndVendors = async () => {
      try {
        const [categoriesResponse, vendorsResponse] = await Promise.all([
          axios.get('/api/expenses/categories'),
          axios.get(`/api/vendors/property/${propertyId}`)
        ]);
        
        setCategories(categoriesResponse.data);
        setVendors(vendorsResponse.data);
      } catch (err) {
        console.error('Error fetching categories and vendors:', err);
        // Don't set error state here to avoid blocking the main functionality
      }
    };
    
    fetchCategoriesAndVendors();
  }, [propertyId]);

  // Handle expense form change
  const handleExpenseFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setExpenseForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle filter form change
  const handleFilterFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilterForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Reset to first page when filters change
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  };

  // Handle export form change
  const handleExportFormChange = (e) => {
    const { name, value } = e.target;
    setExportForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle receipt file change
  const handleReceiptFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setReceiptFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    // Reset scan result
    setScanResult(null);
  };

  // Handle scan receipt
  const handleScanReceipt = async () => {
    if (!receiptFile) return;
    
    try {
      setScanLoading(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('receipt', receiptFile);
      
      // Send to API
      const response = await axios.post('/api/expenses/scan-receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setScanResult(response.data);
      
      // Pre-fill expense form with scan results
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        
        // Try to find vendor
        let vendorId = '';
        if (data.vendor) {
          const matchedVendor = vendors.find(v => 
            v.name.toLowerCase().includes(data.vendor.toLowerCase()) ||
            data.vendor.toLowerCase().includes(v.name.toLowerCase())
          );
          if (matchedVendor) {
            vendorId = matchedVendor.id;
          }
        }
        
        setExpenseForm(prev => ({
          ...prev,
          description: data.items.length > 0 
            ? data.items.map(item => item.description).join(', ').substring(0, 255)
            : prev.description,
          amount: data.totalAmount || prev.amount,
          expenseDate: data.date ? moment(data.date).format('YYYY-MM-DD') : prev.expenseDate,
          vendorId: vendorId || prev.vendorId,
          reference: data.receiptNumber || prev.reference
        }));
      }
      
      setScanLoading(false);
    } catch (err) {
      console.error('Error scanning receipt:', err);
      setScanResult({
        success: false,
        message: 'Failed to scan receipt. Please try again or enter expense details manually.'
      });
      setScanLoading(false);
    }
  };

  // Handle create expense from receipt
  const handleCreateExpenseFromReceipt = async () => {
    if (!receiptFile) return;
    
    try {
      setLoading(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('receipt', receiptFile);
      formData.append('propertyId', propertyId);
      formData.append('unitId', expenseForm.unitId || '');
      formData.append('scanResult', JSON.stringify(scanResult));
      
      // Send to API
      const response = await axios.post('/api/expenses/create-from-receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        // Refresh expenses
        const expensesResponse = await axios.get(`/api/expenses/property/${propertyId}`, {
          params: {
            categoryId: filterForm.categoryId || undefined,
            vendorId: filterForm.vendorId || undefined,
            startDate: filterForm.startDate,
            endDate: filterForm.endDate,
            taxDeductibleOnly: filterForm.taxDeductibleOnly,
            limit: pagination.limit,
            offset: (pagination.currentPage - 1) * pagination.limit
          }
        });
        
        setExpenses(expensesResponse.data.expenses);
        setTotalExpenses(expensesResponse.data.count);
        
        // Reset form and close modal
        setReceiptFile(null);
        setReceiptPreview(null);
        setScanResult(null);
        setShowScanReceiptModal(false);
        
        // Reset expense form
        setExpenseForm({
          propertyId: propertyId,
          unitId: '',
          categoryId: '',
          vendorId: '',
          description: '',
          amount: '',
          expenseDate: moment().format('YYYY-MM-DD'),
          paymentMethod: 'credit_card',
          reference: '',
          isTaxDeductible: false,
          notes: ''
        });
      } else {
        setError(response.data.message);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error creating expense from receipt:', err);
      setError('Failed to create expense from receipt. Please try again later.');
      setLoading(false);
    }
  };

  // Handle add expense
  const handleAddExpense = async () => {
    try {
      setLoading(true);
      
      // Create expense
      const response = await axios.post('/api/expenses', {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount)
      });
      
      if (response.data.success) {
        // If receipt file exists, upload it
        if (receiptFile) {
          const formData = new FormData();
          formData.append('receipt', receiptFile);
          formData.append('expenseId', response.data.expense.id);
          formData.append('description', 'Receipt for expense');
          
          await axios.post('/api/expenses/upload-receipt', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        }
        
        // Refresh expenses
        const expensesResponse = await axios.get(`/api/expenses/property/${propertyId}`, {
          params: {
            categoryId: filterForm.categoryId || undefined,
            vendorId: filterForm.vendorId || undefined,
            startDate: filterForm.startDate,
            endDate: filterForm.endDate,
            taxDeductibleOnly: filterForm.taxDeductibleOnly,
            limit: pagination.limit,
            offset: (pagination.currentPage - 1) * pagination.limit
          }
        });
        
        setExpenses(expensesResponse.data.expenses);
        setTotalExpenses(expensesResponse.data.count);
        
        // Reset form and close modal
        setExpenseForm({
          propertyId: propertyId,
          unitId: '',
          categoryId: '',
          vendorId: '',
          description: '',
          amount: '',
          expenseDate: moment().format('YYYY-MM-DD'),
          paymentMethod: 'credit_card',
          reference: '',
          isTaxDeductible: false,
          notes: ''
        });
        setReceiptFile(null);
        setReceiptPreview(null);
        setShowAddExpenseModal(false);
      } else {
        setError(response.data.message);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error adding expense:', err);
      setError('Failed to add expense. Please try again later.');
      setLoading(false);
    }
  };

  // Handle export expenses
  const handleExportExpenses = async () => {
    try {
      setLoading(true);
      
      const response = await axios.post('/api/expenses/export', {
        propertyId,
        startDate: exportForm.startDate,
        endDate: exportForm.endDate,
        accountingSoftware: exportForm.accountingSoftware,
        exportOptions: exportForm.exportOptions
      });
      
      if (response.data.success) {
        // If CSV export, download the file
        if (exportForm.accountingSoftware === 'csv' && response.data.fileUrl) {
          window.open(response.data.fileUrl, '_blank');
        }
        
        // Close modal
        setShowExportModal(false);
      } else {
        setError(response.data.message);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error exporting expenses:', err);
      setError('Failed to export expenses. Please try again later.');
      setLoading(false);
    }
  };

  // Handle view expense details
  const handleViewExpenseDetails = (expense) => {
    setSelectedExpense(expense);
    setShowExpenseDetailModal(true);
  };

  // Handle page change
  const handlePageChange = (page) => {
    setPagination(prev => ({
      ...prev,
      currentPage: page
    }));
  };

  // Render loading state
  if (loading && expenses.length === 0) {
    return (
      <Card className="expense-management-widget mb-4">
        <Card.Header>
          <h5 className="mb-0">Expense Management</h5>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading expense data...</p>
        </Card.Body>
      </Card>
    );
  }

  // Render error state
  if (error && expenses.length === 0) {
    return (
      <Card className="expense-management-widget mb-4">
        <Card.Header>
          <h5 className="mb-0">Expense Management</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card className="expense-management-widget mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Expense Management</h5>
          <div>
            <Button 
              variant="outline-primary" 
              size="sm" 
              className="me-2"
              onClick={() => setShowScanReceiptModal(true)}
            >
              <FontAwesomeIcon icon={faCamera} className="me-1" />
              Scan Receipt
            </Button>
            <Button 
              variant="outline-primary" 
              size="sm" 
              className="me-2"
              onClick={() => setShowExportModal(true)}
            >
              <FontAwesomeIcon icon={faFileInvoice} className="me-1" />
              Export
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => setShowAddExpenseModal(true)}
            >
              <FontAwesomeIcon icon={faReceipt} className="me-1" />
              Add Expense
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="filter-section mb-4">
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Select 
                    name="categoryId"
                    value={filterForm.categoryId}
                    onChange={handleFilterFormChange}
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
     <response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>