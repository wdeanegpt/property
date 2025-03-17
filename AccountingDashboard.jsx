/**
 * Accounting Dashboard Component
 * 
 * This component serves as the main dashboard for the accounting module.
 * It displays key financial metrics, recent transactions, and widgets for
 * quick access to common accounting tasks.
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMoneyBillWave, 
  faChartLine, 
  faExchangeAlt, 
  faReceipt, 
  faExclamationTriangle,
  faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useParams } from 'react-router-dom';

// Import custom components
import AccountingSummary from './widgets/AccountingSummary';
import RentCollectionWidget from './widgets/RentCollectionWidget';
import ExpenseBreakdownWidget from './widgets/ExpenseBreakdownWidget';
import CashFlowPredictionWidget from './widgets/CashFlowPredictionWidget';
import AccountingErrorsWidget from './widgets/AccountingErrorsWidget';
import RecentTransactionsWidget from './widgets/RecentTransactionsWidget';
import UpcomingPaymentsWidget from './widgets/UpcomingPaymentsWidget';

// Import styles
import './AccountingDashboard.css';

const AccountingDashboard = () => {
  const { propertyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [timeRange, setTimeRange] = useState('month'); // 'month', 'quarter', 'year'

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch accounting summary data
        const summaryResponse = await axios.get(`/api/accounting/summary/${propertyId}`, {
          params: { timeRange }
        });
        
        // Fetch rent collection data
        const rentCollectionResponse = await axios.get(`/api/payments/collection-status/${propertyId}`);
        
        // Fetch expense breakdown data
        const expenseResponse = await axios.get(`/api/expenses/breakdown/${propertyId}`, {
          params: { timeRange }
        });
        
        // Fetch recent transactions
        const transactionsResponse = await axios.get(`/api/transactions`, {
          params: { 
            propertyId,
            limit: 5,
            sort: 'transaction_date:desc'
          }
        });
        
        // Fetch upcoming payments
        const upcomingPaymentsResponse = await axios.get(`/api/payments/upcoming/${propertyId}`);
        
        // Fetch accounting errors
        const errorsResponse = await axios.get(`/api/errors/history/${propertyId}`, {
          params: { 
            status: 'new',
            limit: 5
          }
        });
        
        // Combine all data
        setDashboardData({
          summary: summaryResponse.data.data,
          rentCollection: rentCollectionResponse.data.data,
          expenseBreakdown: expenseResponse.data.data,
          recentTransactions: transactionsResponse.data.data.transactions,
          upcomingPayments: upcomingPaymentsResponse.data.data,
          errors: errorsResponse.data.data
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [propertyId, timeRange]);

  // Handle time range change
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };

  // Render loading state
  if (loading) {
    return (
      <Container className="accounting-dashboard mt-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading accounting dashboard...</p>
        </div>
      </Container>
    );
  }

  // Render error state
  if (error) {
    return (
      <Container className="accounting-dashboard mt-4">
        <Alert variant="danger">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="accounting-dashboard mt-4">
      <Row className="mb-4">
        <Col>
          <h1 className="dashboard-title">Accounting Dashboard</h1>
        </Col>
        <Col xs="auto" className="d-flex align-items-center">
          <div className="time-range-selector">
            <Button 
              variant={timeRange === 'month' ? 'primary' : 'outline-primary'} 
              onClick={() => handleTimeRangeChange('month')}
              className="me-2"
            >
              Month
            </Button>
            <Button 
              variant={timeRange === 'quarter' ? 'primary' : 'outline-primary'} 
              onClick={() => handleTimeRangeChange('quarter')}
              className="me-2"
            >
              Quarter
            </Button>
            <Button 
              variant={timeRange === 'year' ? 'primary' : 'outline-primary'} 
              onClick={() => handleTimeRangeChange('year')}
            >
              Year
            </Button>
          </div>
        </Col>
      </Row>

      {/* Accounting Summary */}
      <Row className="mb-4">
        <Col>
          <AccountingSummary 
            data={dashboardData.summary} 
            timeRange={timeRange} 
          />
        </Col>
      </Row>

      {/* Rent Collection and Expense Breakdown */}
      <Row className="mb-4">
        <Col md={6}>
          <RentCollectionWidget data={dashboardData.rentCollection} />
        </Col>
        <Col md={6}>
          <ExpenseBreakdownWidget 
            data={dashboardData.expenseBreakdown} 
            timeRange={timeRange} 
          />
        </Col>
      </Row>

      {/* Recent Transactions and Upcoming Payments */}
      <Row className="mb-4">
        <Col md={6}>
          <RecentTransactionsWidget transactions={dashboardData.recentTransactions} />
        </Col>
        <Col md={6}>
          <UpcomingPaymentsWidget payments={dashboardData.upcomingPayments} />
        </Col>
      </Row>

      {/* Cash Flow Prediction */}
      <Row className="mb-4">
        <Col>
          <CashFlowPredictionWidget propertyId={propertyId} />
        </Col>
      </Row>

      {/* Accounting Errors */}
      <Row className="mb-4">
        <Col>
          <AccountingErrorsWidget errors={dashboardData.errors} />
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row className="mb-4">
        <Col>
          <Card className="quick-actions-card">
            <Card.Header>
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col xs={6} md={3} className="text-center mb-3">
                  <Button variant="outline-primary" className="quick-action-button" href={`/accounting/payments/new/${propertyId}`}>
                    <FontAwesomeIcon icon={faMoneyBillWave} size="2x" />
                    <div className="mt-2">Record Payment</div>
                  </Button>
                </Col>
                <Col xs={6} md={3} className="text-center mb-3">
                  <Button variant="outline-primary" className="quick-action-button" href={`/accounting/expenses/new/${propertyId}`}>
                    <FontAwesomeIcon icon={faReceipt} size="2x" />
                    <div className="mt-2">Add Expense</div>
                  </Button>
                </Col>
                <Col xs={6} md={3} className="text-center mb-3">
                  <Button variant="outline-primary" className="quick-action-button" href={`/accounting/reports/${propertyId}`}>
                    <FontAwesomeIcon icon={faChartLine} size="2x" />
                    <div className="mt-2">Generate Report</div>
                  </Button>
                </Col>
                <Col xs={6} md={3} className="text-center mb-3">
                  <Button variant="outline-primary" className="quick-action-button" href={`/accounting/transactions/${propertyId}`}>
                    <FontAwesomeIcon icon={faExchangeAlt} size="2x" />
                    <div className="mt-2">View Transactions</div>
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AccountingDashboard;