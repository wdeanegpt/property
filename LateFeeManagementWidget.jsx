import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Spinner, Alert, Form, Row, Col, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faExclamationTriangle, 
  faCheck, 
  faTimes, 
  faMoneyBillWave, 
  faCalendarAlt, 
  faInfoCircle 
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import moment from 'moment';
import './LateFeeManagementWidget.css';

/**
 * Late Fee Management Widget Component
 * 
 * This component displays and manages late fees, including viewing,
 * applying, and waiving late fees.
 */
const LateFeeManagementWidget = ({ propertyId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lateFees, setLateFees] = useState([]);
  const [lateFeeConfig, setLateFeeConfig] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    feeType: 'percentage',
    feeAmount: 5,
    gracePeriodDays: 5,
    maximumFee: 100,
    isCompounding: false
  });
  const [showWaiveModal, setShowWaiveModal] = useState(false);
  const [selectedLateFee, setSelectedLateFee] = useState(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending'); // 'all', 'pending', 'paid', 'waived'

  // Fetch late fees and configuration
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch late fee configuration
        const configResponse = await axios.get(`/api/late-fees/configuration/${propertyId}`);
        setLateFeeConfig(configResponse.data.data);
        
        if (configResponse.data.data) {
          setConfigForm({
            feeType: configResponse.data.data.fee_type,
            feeAmount: configResponse.data.data.fee_amount,
            gracePeriodDays: configResponse.data.data.grace_period_days,
            maximumFee: configResponse.data.data.maximum_fee,
            isCompounding: configResponse.data.data.is_compounding
          });
        }
        
        // Fetch late fees
        const feesResponse = await axios.get(`/api/late-fees/property/${propertyId}`, {
          params: { status: filterStatus !== 'all' ? filterStatus : undefined }
        });
        
        setLateFees(feesResponse.data.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching late fee data:', err);
        setError('Failed to load late fee data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [propertyId, filterStatus]);

  // Handle configuration form change
  const handleConfigFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfigForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value
    }));
  };

  // Handle configuration save
  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      
      await axios.post(`/api/late-fees/configuration/${propertyId}`, {
        propertyId,
        feeType: configForm.feeType,
        feeAmount: configForm.feeAmount,
        gracePeriodDays: configForm.gracePeriodDays,
        maximumFee: configForm.maximumFee,
        isCompounding: configForm.isCompounding
      });
      
      // Refresh data
      const configResponse = await axios.get(`/api/late-fees/configuration/${propertyId}`);
      setLateFeeConfig(configResponse.data.data);
      
      setShowConfigModal(false);
      setLoading(false);
    } catch (err) {
      console.error('Error saving late fee configuration:', err);
      setError('Failed to save configuration. Please try again later.');
      setLoading(false);
    }
  };

  // Handle waive late fee
  const handleWaiveLateFee = async () => {
    try {
      setLoading(true);
      
      await axios.post(`/api/late-fees/waive/${selectedLateFee.id}`, {
        reason: waiveReason,
        waivedBy: 1 // This would be the current user's ID in a real implementation
      });
      
      // Refresh data
      const feesResponse = await axios.get(`/api/late-fees/property/${propertyId}`, {
        params: { status: filterStatus !== 'all' ? filterStatus : undefined }
      });
      
      setLateFees(feesResponse.data.data);
      setShowWaiveModal(false);
      setWaiveReason('');
      setSelectedLateFee(null);
      setLoading(false);
    } catch (err) {
      console.error('Error waiving late fee:', err);
      setError('Failed to waive late fee. Please try again later.');
      setLoading(false);
    }
  };

  // Handle apply late fees
  const handleApplyLateFees = async () => {
    try {
      setLoading(true);
      
      await axios.post(`/api/late-fees/apply/${propertyId}`);
      
      // Refresh data
      const feesResponse = await axios.get(`/api/late-fees/property/${propertyId}`, {
        params: { status: filterStatus !== 'all' ? filterStatus : undefined }
      });
      
      setLateFees(feesResponse.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Error applying late fees:', err);
      setError('Failed to apply late fees. Please try again later.');
      setLoading(false);
    }
  };

  // Open waive modal
  const openWaiveModal = (lateFee) => {
    setSelectedLateFee(lateFee);
    setShowWaiveModal(true);
  };

  // Render loading state
  if (loading) {
    return (
      <Card className="late-fee-widget mb-4">
        <Card.Header>
          <h5 className="mb-0">Late Fee Management</h5>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading late fee data...</p>
        </Card.Body>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className="late-fee-widget mb-4">
        <Card.Header>
          <h5 className="mb-0">Late Fee Management</h5>
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
      <Card className="late-fee-widget mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Late Fee Management</h5>
          <div>
            <Button 
              variant="outline-primary" 
              size="sm" 
              className="me-2"
              onClick={() => setShowConfigModal(true)}
            >
              <FontAwesomeIcon icon={faInfoCircle} className="me-1" />
              Configure
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              onClick={handleApplyLateFees}
            >
              <FontAwesomeIcon icon={faMoneyBillWave} className="me-1" />
              Apply Late Fees
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {!lateFeeConfig ? (
            <Alert variant="warning">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              No late fee configuration found. Please configure late fees to enable this feature.
            </Alert>
          ) : (
            <>
              <div className="late-fee-config-summary mb-3">
                <Row>
                  <Col md={6}>
                    <Card className="h-100">
                      <Card.Body>
                        <h6 className="mb-3">Current Configuration</h6>
                        <p className="mb-1">
                          <strong>Fee Type:</strong> {lateFeeConfig.fee_type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                        </p>
                        <p className="mb-1">
                          <strong>Fee Amount:</strong> {lateFeeConfig.fee_type === 'percentage' ? `${lateFeeConfig.fee_amount}%` : `$${lateFeeConfig.fee_amount}`}
                        </p>
                        <p className="mb-1">
                          <strong>Grace Period:</strong> {lateFeeConfig.grace_period_days} days
                        </p>
                        {lateFeeConfig.fee_type === 'percentage' && lateFeeConfig.maximum_fee && (
                          <p className="mb-1">
                            <strong>Maximum Fee:</strong> ${lateFeeConfig.maximum_fee}
                          </p>
                        )}
                        <p className="mb-0">
                          <strong>Compounding:</strong> {lateFeeConfig.is_compounding ? 'Yes' : 'No'}
                        </p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="h-100">
                      <Card.Body>
                        <h6 className="mb-3">Filter Late Fees</h6>
                        <Form.Group>
                          <Form.Label>Status</Form.Label>
                          <Form.Select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                          >
                            <option value="all">All</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="waived">Waived</option>
                          </Form.Select>
                        </Form.Group>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </div>
              
              {lateFees.length === 0 ? (
                <Alert variant="info">
                  No late fees found with the selected filter.
                </Alert>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Unit</th>
                      <th>Amount</th>
                      <th>Fee Date</th>
                      <th>Due Date</th>
                      <th>Days Late</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lateFees.map((fee) => (
                      <tr key={fee.id}>
                        <td>{fee.Lease?.Tenant?.first_name} {fee.Lease?.Tenant?.last_name}</td>
                        <td>{fee.Lease?.Unit?.unit_number}</td>
                        <td>${parseFloat(fee.amount).toFixed(2)}</td>
                        <td>{moment(fee.fee_date).format('MMM D, YYYY')}</td>
                        <td>{moment(fee.due_date).format('MMM D, YYYY')}</td>
                        <td>{fee.days_late}</td>
                        <td>
                          {fee.status === 'pending' && (
                            <Badge bg="warning">Pending</Badge>
                          )}
                          {fee.status === 'paid' && (
                            <Badge bg="success">Paid</Badge>
                          )}
                          {fee.status === 'waived' && (
                            <Badge bg="secondary">Waived</Badge>
                          )}
                        </td>
                        <td>
                          {fee.status === 'pending' && (
                            <Button 
                              variant="outline-secondary" 
                              size="sm"
                              onClick={() => openWaiveModal(fee)}
                            >
                              <FontAwesomeIcon icon={faTimes} className="me-1" />
                              Waive
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </>
          )}
        </Card.Body>
      </Card>
      
      {/* Configuration Modal */}
      <Modal show={showConfigModal} onHide={() => setShowConfigModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Late Fee Configuration</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Fee Type</Form.Label>
              <Form.Select 
                name="feeType"
                value={configForm.feeType}
                onChange={handleConfigFormChange}
              >
                <option value="percentage">Percentage of Rent</option>
                <option value="fixed">Fixed Amount</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>
                {configForm.feeType === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
              </Form.Label>
              <Form.Control 
                type="number"
                name="feeAmount"
                value={configForm.feeAmount}
                onChange={handleConfigFormChange}
                min="0"
                step={configForm.feeType === 'percentage' ? "0.01" : "1"}
              />
            </Form.Group>
            
            {configForm.feeType === 'percentage' && (
              <Form.Group className="mb-3">
                <Form.Label>Maximum Fee Amount ($)</Form.Label>
                <Form.Control 
                  type="number"
                  name="maximumFee"
                  value={configForm.maximumFee}
                  onChange={handleConfigFormChange}
                  min="0"
                />
              </Form.Group>
            )}
            
            <Form.Group className="mb-3">
              <Form.Label>Grace Period (Days)</Form.Label>
              <Form.Control 
                type="number"
                name="gracePeriodDays"
                value={configForm.gracePeriodDays}
                onChange={handleConfigFormChange}
                min="0"
              />
              <Form.Text className="text-muted">
                Number of days after due date before late fee applies
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Check 
                type="checkbox"
                label="Compounding (Apply late fees to previous late fees)"
                name="isCompounding"
                checked={configForm.isCompounding}
                onChange={handleConfigFormChange}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfigModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveConfig}>
            Save Configuration
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Waive Late Fee Modal */}
      <Modal show={showWaiveModal} onHide={() => setShowWaiveModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Waive Late Fee</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLateFee && (
            <>
              <p>
                You are about to waive a late fee of <strong>${parseFloat(selectedLateFee.amount).toFixed(2)}</strong> for tenant <strong>{selectedLateFee.Lease?.Tenant?.first_name} {selectedLateFee.Lease?.Tenant?.last_name}</strong>.
              </p>
              <Form.Group className="mb-3">
                <Form.Label>Reason for Waiving</Form.Label>
            <response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>