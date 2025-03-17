import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Tabs, Tab, Button, Form, Spinner, Alert, Table, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartLine, 
  faFileInvoiceDollar, 
  faBalanceScale, 
  faMoneyBillWave,
  faBuilding,
  faCalendarAlt,
  faDownload,
  faPrint,
  faExclamationTriangle,
  faInfoCircle,
  faFilter,
  faSync
} from '@fortawesome/free-solid-svg-icons';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import moment from 'moment';
import './FinancialReportingDashboard.css';

/**
 * Financial Reporting Dashboard Component
 * 
 * This component displays financial reports and dashboards for property management,
 * including income statements, balance sheets, cash flow statements, and more.
 */
const FinancialReportingDashboard = ({ propertyId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateRange, setDateRange] = useState({
    startDate: moment().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD')
  });
  const [reportOptions, setReportOptions] = useState({
    includeUnpaidRent: true,
    includeSecurityDeposits: false,
    groupByCategory: true,
    groupByUnit: false,
    includeDetails: true
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [chartData, setChartData] = useState({
    income: null,
    expenses: null,
    cashFlow: null,
    occupancy: null
  });

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/financial-reporting/dashboard/${propertyId}`, {
          params: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          }
        });
        
        setDashboardData(response.data);
        
        // Prepare chart data
        prepareChartData(response.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load financial dashboard data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [propertyId, dateRange]);

  // Prepare chart data for dashboard
  const prepareChartData = (data) => {
    if (!data) return;
    
    // Income chart data
    const incomeData = {
      labels: data.cashFlowTrends.monthlyTrends.map(month => month.monthName),
      datasets: [
        {
          label: 'Income',
          data: data.cashFlowTrends.monthlyTrends.map(month => month.income),
          backgroundColor: 'rgba(78, 115, 223, 0.2)',
          borderColor: 'rgba(78, 115, 223, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(78, 115, 223, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(78, 115, 223, 1)',
          tension: 0.1
        }
      ]
    };
    
    // Expenses chart data
    const expensesData = {
      labels: data.cashFlowTrends.monthlyTrends.map(month => month.monthName),
      datasets: [
        {
          label: 'Expenses',
          data: data.cashFlowTrends.monthlyTrends.map(month => month.expenses),
          backgroundColor: 'rgba(231, 74, 59, 0.2)',
          borderColor: 'rgba(231, 74, 59, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(231, 74, 59, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(231, 74, 59, 1)',
          tension: 0.1
        }
      ]
    };
    
    // Cash flow chart data
    const cashFlowData = {
      labels: data.cashFlowTrends.monthlyTrends.map(month => month.monthName),
      datasets: [
        {
          label: 'Net Cash Flow',
          data: data.cashFlowTrends.monthlyTrends.map(month => month.netCashFlow),
          backgroundColor: 'rgba(54, 185, 204, 0.2)',
          borderColor: 'rgba(54, 185, 204, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(54, 185, 204, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(54, 185, 204, 1)',
          tension: 0.1
        },
        {
          label: 'Cumulative Cash Flow',
          data: data.cashFlowTrends.monthlyTrends.map(month => month.cumulativeCashFlow),
          backgroundColor: 'rgba(28, 200, 138, 0.2)',
          borderColor: 'rgba(28, 200, 138, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(28, 200, 138, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(28, 200, 138, 1)',
          tension: 0.1
        }
      ]
    };
    
    // Expense breakdown chart data
    const expenseCategories = data.expenseAnalysis.topExpenseCategories.map(category => category.groupName);
    const expenseAmounts = data.expenseAnalysis.topExpenseCategories.map(category => category.totalAmount);
    
    const expenseBreakdownData = {
      labels: expenseCategories,
      datasets: [
        {
          data: expenseAmounts,
          backgroundColor: [
            'rgba(78, 115, 223, 0.8)',
            'rgba(28, 200, 138, 0.8)',
            'rgba(54, 185, 204, 0.8)',
            'rgba(246, 194, 62, 0.8)',
            'rgba(231, 74, 59, 0.8)'
          ],
          borderColor: [
            'rgba(78, 115, 223, 1)',
            'rgba(28, 200, 138, 1)',
            'rgba(54, 185, 204, 1)',
            'rgba(246, 194, 62, 1)',
            'rgba(231, 74, 59, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
    
    // Accounts receivable aging chart data
    const agingData = {
      labels: ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'],
      datasets: [
        {
          data: [
            data.accountsReceivable.current,
            data.accountsReceivable.days1to30,
            data.accountsReceivable.days31to60,
            data.accountsReceivable.days61to90,
            data.accountsReceivable.days90Plus
          ],
          backgroundColor: [
            'rgba(28, 200, 138, 0.8)',
            'rgba(54, 185, 204, 0.8)',
            'rgba(246, 194, 62, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(231, 74, 59, 0.8)'
          ],
          borderColor: [
            'rgba(28, 200, 138, 1)',
            'rgba(54, 185, 204, 1)',
            'rgba(246, 194, 62, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(231, 74, 59, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
    
    // Occupancy chart data
    const occupancyData = {
      labels: ['Occupied', 'Vacant'],
      datasets: [
        {
          data: [
            data.rentRoll.occupiedUnits,
            data.rentRoll.vacantUnits
          ],
          backgroundColor: [
            'rgba(28, 200, 138, 0.8)',
            'rgba(231, 74, 59, 0.8)'
          ],
          borderColor: [
            'rgba(28, 200, 138, 1)',
            'rgba(231, 74, 59, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
    
    setChartData({
      income: incomeData,
      expenses: expensesData,
      cashFlow: cashFlowData,
      expenseBreakdown: expenseBreakdownData,
      aging: agingData,
      occupancy: occupancyData
    });
  };

  // Handle date range change
  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle report options change
  const handleReportOptionsChange = (e) => {
    const { name, checked, type, value } = e.target;
    setReportOptions(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedReport(null);
    setReportData(null);
  };

  // Handle report selection
  const handleReportSelection = (report) => {
    setSelectedReport(report);
    generateReport(report);
  };

  // Generate report
  const generateReport = async (report) => {
    try {
      setReportLoading(true);
      setError(null);
      
      let endpoint;
      let params = {
        ...reportOptions
      };
      
      switch (report) {
        case 'income_statement':
          endpoint = `/api/financial-reporting/income-statement/${propertyId}`;
          params.startDate = dateRange.startDate;
          params.endDate = dateRange.endDate;
          break;
        case 'balance_sheet':
          endpoint = `/api/financial-reporting/balance-sheet/${propertyId}`;
          params.asOfDate = dateRange.endDate;
          break;
        case 'cash_flow_statement':
          endpoint = `/api/financial-reporting/cash-flow/${propertyId}`;
          params.startDate = dateRange.startDate;
          params.endDate = dateRange.endDate;
          params.groupBy = 'month';
          break;
        case 'rent_roll':
          endpoint = `/api/financial-reporting/rent-roll/${propertyId}`;
          params.asOfDate = dateRange.endDate;
          params.includeVacantUnits = true;
          break;
        case 'accounts_receivable_aging':
          endpoint = `/api/financial-reporting/accounts-receivable/${propertyId}`;
          params.asOfDate = dateRange.endDate;
          break;
        case 'expense_analysis':
          endpoint = `/api/financial-reporting/expense-analysis/${propertyId}`;
          params.startDate = dateRange.startDate;
          params.endDate = dateRange.endDate;
          params.groupBy = 'category';
          break;
        default:
          throw new Error(`Unknown report type: ${report}`);
      }
      
      const response = await axios.get(endpoint, { params });
      
      setReportData(response.data);
      setReportLoading(false);
    } catch (err) {
      console.error('Error generating report:', err);
      setError(`Failed to generate ${report.replace('_', ' ')} report. Please try again later.`);
      setReportLoading(false);
    }
  };

  // Export report to PDF
  const exportReportToPDF = () => {
    // This would typically use a PDF generation library
    alert('Export to PDF functionality would be implemented here');
  };

  // Print report
  const printReport = () => {
    window.print();
  };

  // Render loading state
  if (loading && !dashboardData) {
    return (
      <Card className="financial-reporting-dashboard mb-4">
        <Card.Header>
          <h5 className="mb-0">Financial Reporting</h5>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading financial data...</p>
        </Card.Body>
      </Card>
    );
  }

  // Render error state
  if (error && !dashboardData) {
    return (
      <Card className="financial-reporting-dashboard mb-4">
        <Card.Header>
          <h5 className="mb-0">Financial Reporting</h5>
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
    <Card className="financial-reporting-dashboard mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Financial Reporting</h5>
          <div className="date-range-selector">
            <Form.Group className="d-flex align-items-center">
              <Form.Label className="me-2 mb-0">From:</Form.Label>
              <Form.Control
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateRangeChange}
                className="me-2"
                size="sm"
              />
              <Form.Label className="me-2 mb-0">To:</Form.Label>
              <Form.Control
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateRangeChange}
                className="me-2"
                size="sm"
              />
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => {
                  if (activeTab === 'dashboard') {
                    // Refresh dashboard
                  } else if (selectedReport) {
                    generateReport(selectedReport);
                  }
                }}
              >
                <FontAwesomeIcon icon={faSync} className="me-1" />
                Update
              </Button>
            </Form.Group>
          </div>
        </div>
      </Card.Header>
      <Card.Body>
        <Tabs
          activeKey={activeTab}
          onSelect={handleTabChange}
          className="mb-4"
        >
          <Tab eventKey="dashboard" title={<><FontAwesomeIcon icon={faChartLine} className="me-2" />Dashboard</>}>
            {dashboardData && (
              <div className="financial-dashboard">
                <Row className="mb-4">
                  <Col md={3}>
                    <div className="kpi-card">
                      <div className="kpi-title">Net Operating Income</div>
                      <div className="kpi-value">${dashboardData.kpis.netOperatingIncome.toFixed(2)}</div>
                      <div className="kpi-period">Last 30 days</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="kpi-card">
                      <div className="kpi-title">Occupancy Rate</div>
                      <div className="kpi-value">{dashboardData.kpis.occupancyRate.toFixed(1)}%</div>
                      <div className="kpi-period">Current</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="kpi-card">
                      <div className="kpi-title">Expense Ratio</div>
                      <div className="kpi-value">{dashboardData.kpis.expenseRatio.toFixed(1)}%</div>
                      <div className="kpi-period">Last 30 days</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="kpi-card">
                      <div className="kpi-title">Outstanding Receivables</div>
                      <div className="kpi-value">${dashboardData.kpis.outstandingReceivables.toFixed(2)}</div>
                      <div className="kpi-period">Current</div>
                    </div>
                  </Col>
                </Row>
                
                <Row className="mb-4">
                  <Col md={6}>
                    <Card className="chart-card">
                      <Card.Header>
                        <h6 className="mb-0">Income vs. Expenses</h6>
                      </Card.Header>
                      <Card.Body>
                        {chartData.income && chartData.expenses && (
                          <div className="chart-container">
                            <Bar
                              data={{
                                labels: chartData.income.labels,
                                datasets: [
                                  {
                                    label: 'Income',
                                    data: chartData.income.datasets[0].data,
                                    ba<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>