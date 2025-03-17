import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Spinner, Alert, Form, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faCheck, faClock, faCalendarAlt, faDollarSign } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import moment from 'moment';
import './RentTrackingWidget.css';

/**
 * Rent Tracking Widget Component
 * 
 * This component displays rent tracking information including upcoming payments,
 * overdue payments, and payment history.
 */
const RentTrackingWidget = ({ propertyId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [duePayments, setDuePayments] = useState([]);
  const [viewMode, setViewMode] = useState('upcoming'); // 'upcoming', 'overdue', 'history'
  const [filterOptions, setFilterOptions] = useState({
    includeUpcoming: true,
    includePaid: false,
    includeOverdue: true,
    upcomingDays: 30
  });

  // Fetch due payments
  useEffect(() => {
    const fetchDuePayments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/rent-tracking/due-payments/${propertyId}`, {
          params: filterOptions
        });
        
        setDuePayments(response.data.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching due payments:', err);
        setError('Failed to load payment data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchDuePayments();
  }, [propertyId, filterOptions]);

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilterOptions(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    
    // Update filter options based on view mode
    if (mode === 'upcoming') {
      setFilterOptions({
        includeUpcoming: true,
        includePaid: false,
        includeOverdue: false,
        upcomingDays: 30
      });
    } else if (mode === 'overdue') {
      setFilterOptions({
        includeUpcoming: false,
        includePaid: false,
        includeOverdue: true,
        upcomingDays: 0
      });
    } else if (mode === 'history') {
      setFilterOptions({
        includeUpcoming: false,
        includePaid: true,
        includeOverdue: true,
        upcomingDays: 0
      });
    }
  };

  // Handle payment recording
  const handleRecordPayment = async (paymentId) => {
    // This would open a modal or redirect to payment recording page
    // For now, just log the action
    console.log('Record payment for:', paymentId);
  };

  // Render payment status badge
  const renderStatusBadge = (payment) => {
    if (payment.isPaid) {
      return <Badge bg="success"><FontAwesomeIcon icon={faCheck} /> Paid</Badge>;
    } else if (payment.isOverdue) {
      return <Badge bg="danger"><FontAwesomeIcon icon={faExclamationTriangle} /> Overdue</Badge>;
    } else {
      return <Badge bg="warning"><FontAwesomeIcon icon={faClock} /> Upcoming</Badge>;
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Card className="rent-tracking-widget mb-4">
        <Card.Header>
          <h5 className="mb-0">Rent Tracking</h5>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading payment data...</p>
        </Card.Body>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className="rent-tracking-widget mb-4">
        <Card.Header>
          <h5 className="mb-0">Rent Tracking</h5>
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
    <Card className="rent-tracking-widget mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Rent Tracking</h5>
        <div className="btn-group">
          <Button 
            variant={viewMode === 'upcoming' ? 'primary' : 'outline-primary'} 
            onClick={() => handleViewModeChange('upcoming')}
            size="sm"
          >
            Upcoming
          </Button>
          <Button 
            variant={viewMode === 'overdue' ? 'primary' : 'outline-primary'} 
            onClick={() => handleViewModeChange('overdue')}
            size="sm"
          >
            Overdue
          </Button>
          <Button 
            variant={viewMode === 'history' ? 'primary' : 'outline-primary'} 
            onClick={() => handleViewModeChange('history')}
            size="sm"
          >
            History
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        {viewMode === 'upcoming' && (
          <div className="filter-options mb-3">
            <Row>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Days in advance</Form.Label>
                  <Form.Control
                    type="number"
                    name="upcomingDays"
                    value={filterOptions.upcomingDays}
                    onChange={handleFilterChange}
                    min="1"
                    max="90"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        )}
        
        {duePayments.length === 0 ? (
          <Alert variant="info">
            No {viewMode === 'upcoming' ? 'upcoming' : viewMode === 'overdue' ? 'overdue' : 'recent'} payments found.
          </Alert>
        ) : (
          <Table responsive hover>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Unit</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {duePayments.map((payment) => (
                <tr key={`${payment.leaseId}-${payment.paymentType}-${payment.dueDate}`}>
                  <td>{payment.tenantName}</td>
                  <td>{payment.unitNumber}</td>
                  <td>{payment.paymentType === 'rent' ? 'Rent' : payment.paymentType}</td>
                  <td>${payment.amount.toFixed(2)}</td>
                  <td>
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                    {moment(payment.dueDate).format('MMM D, YYYY')}
                  </td>
                  <td>{renderStatusBadge(payment)}</td>
                  <td>
                    {!payment.isPaid && (
                      <Button 
                        variant="outline-success" 
                        size="sm"
                        onClick={() => handleRecordPayment(payment.recurringPaymentId)}
                      >
                        <FontAwesomeIcon icon={faDollarSign} className="me-1" />
                        Record Payment
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
      <Card.Footer className="text-end">
        <Button variant="primary" size="sm" href={`/accounting/rent-roll/${propertyId}`}>
          View Rent Roll
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default RentTrackingWidget;
