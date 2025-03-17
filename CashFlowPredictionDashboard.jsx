import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Tabs, Tab, Button, Form, Spinner, Alert, Table, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartLine, 
  faFileInvoiceDollar, 
  faMoneyBillWave,
  faCalendarAlt,
  faDownload,
  faPrint,
  faExclamationTriangle,
  faInfoCircle,
  faLightbulb,
  faRobot,
  faExchangeAlt,
  faQuestionCircle
} from '@fortawesome/free-solid-svg-icons';
import { Line, Bar, Pie } from 'react-chartjs-2';
import axios from 'axios';
import moment from 'moment';
import './CashFlowPredictionDashboard.css';

/**
 * Cash Flow Prediction Dashboard Component
 * 
 * This component displays AI-powered cash flow predictions, forecasts, and what-if analysis
 * for property management, including visualizations and recommendations.
 */
const CashFlowPredictionDashboard = ({ propertyId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [predictionData, setPredictionData] = useState(null);
  const [activeTab, setActiveTab] = useState('forecast');
  const [forecastMonths, setForecastMonths] = useState(6);
  const [whatIfScenario, setWhatIfScenario] = useState({
    name: 'Custom Scenario',
    description: 'Custom what-if analysis scenario',
    months: 6,
    rentIncrease: 0,
    expenseReduction: 0,
    occupancyChange: 0
  });
  const [whatIfResults, setWhatIfResults] = useState(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [chartData, setChartData] = useState({
    forecast: null,
    scenarios: null,
    comparison: null
  });

  // Fetch prediction data
  useEffect(() => {
    const fetchPredictionData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/cash-flow-prediction/forecast/${propertyId}`, {
          params: {
            months: forecastMonths
          }
        });
        
        setPredictionData(response.data);
        
        // Prepare chart data
        prepareChartData(response.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching prediction data:', err);
        setError('Failed to load cash flow prediction data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchPredictionData();
  }, [propertyId, forecastMonths]);

  // Prepare chart data for dashboard
  const prepareChartData = (data) => {
    if (!data) return;
    
    // Forecast chart data
    const forecastData = {
      labels: data.monthlyPredictions.map(month => moment(month.date).format('MMM YYYY')),
      datasets: [
        {
          label: 'Predicted Income',
          data: data.monthlyPredictions.map(month => month.income),
          backgroundColor: 'rgba(78, 115, 223, 0.2)',
          borderColor: 'rgba(78, 115, 223, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(78, 115, 223, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(78, 115, 223, 1)',
          tension: 0.1
        },
        {
          label: 'Predicted Expenses',
          data: data.monthlyPredictions.map(month => month.expenses),
          backgroundColor: 'rgba(231, 74, 59, 0.2)',
          borderColor: 'rgba(231, 74, 59, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(231, 74, 59, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(231, 74, 59, 1)',
          tension: 0.1
        },
        {
          label: 'Net Cash Flow',
          data: data.monthlyPredictions.map(month => month.netCashFlow),
          backgroundColor: 'rgba(54, 185, 204, 0.2)',
          borderColor: 'rgba(54, 185, 204, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(54, 185, 204, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(54, 185, 204, 1)',
          tension: 0.1,
          fill: false
        }
      ]
    };
    
    // Scenarios chart data
    const scenariosData = {
      labels: data.monthlyPredictions.map(month => moment(month.date).format('MMM YYYY')),
      datasets: [
        {
          label: 'Optimistic',
          data: data.scenarios.optimistic.map(month => month.netCashFlow),
          backgroundColor: 'rgba(28, 200, 138, 0.2)',
          borderColor: 'rgba(28, 200, 138, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(28, 200, 138, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(28, 200, 138, 1)',
          tension: 0.1
        },
        {
          label: 'Most Likely',
          data: data.scenarios.mostLikely.map(month => month.netCashFlow),
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
          label: 'Pessimistic',
          data: data.scenarios.pessimistic.map(month => month.netCashFlow),
          backgroundColor: 'rgba(246, 194, 62, 0.2)',
          borderColor: 'rgba(246, 194, 62, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(246, 194, 62, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(246, 194, 62, 1)',
          tension: 0.1
        }
      ]
    };
    
    // Confidence intervals chart data
    const confidenceData = {
      labels: data.monthlyPredictions.map(month => moment(month.date).format('MMM YYYY')),
      datasets: [
        {
          label: 'Net Cash Flow',
          data: data.monthlyPredictions.map(month => month.netCashFlow),
          backgroundColor: 'rgba(54, 185, 204, 0.2)',
          borderColor: 'rgba(54, 185, 204, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(54, 185, 204, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(54, 185, 204, 1)',
          tension: 0.1,
          fill: false
        },
        {
          label: 'Upper Bound',
          data: data.monthlyPredictions.map(month => month.confidence.netCashFlow.upper),
          backgroundColor: 'rgba(0, 0, 0, 0)',
          borderColor: 'rgba(54, 185, 204, 0.3)',
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: '+1'
        },
        {
          label: 'Lower Bound',
          data: data.monthlyPredictions.map(month => month.confidence.netCashFlow.lower),
          backgroundColor: 'rgba(54, 185, 204, 0.1)',
          borderColor: 'rgba(54, 185, 204, 0.3)',
          borderWidth: 1,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        }
      ]
    };
    
    setChartData({
      forecast: forecastData,
      scenarios: scenariosData,
      confidence: confidenceData
    });
  };

  // Handle forecast months change
  const handleForecastMonthsChange = (e) => {
    setForecastMonths(parseInt(e.target.value));
  };

  // Handle what-if scenario change
  const handleWhatIfChange = (e) => {
    const { name, value } = e.target;
    setWhatIfScenario(prev => ({
      ...prev,
      [name]: name === 'name' || name === 'description' ? value : parseFloat(value)
    }));
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Run what-if analysis
  const runWhatIfAnalysis = async () => {
    try {
      setWhatIfLoading(true);
      setError(null);
      
      const response = await axios.post(`/api/cash-flow-prediction/what-if/${propertyId}`, whatIfScenario);
      
      setWhatIfResults(response.data);
      
      // Prepare comparison chart data
      const comparisonData = {
        labels: response.data.comparison.monthlyComparison.map(month => moment(month.month, 'YYYY-MM').format('MMM YYYY')),
        datasets: [
          {
            label: 'Baseline Net Cash Flow',
            data: response.data.comparison.monthlyComparison.map(month => month.baselineNetCashFlow),
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
            label: 'Scenario Net Cash Flow',
            data: response.data.comparison.monthlyComparison.map(month => month.scenarioNetCashFlow),
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
      
      setChartData(prev => ({
        ...prev,
        comparison: comparisonData
      }));
      
      setWhatIfLoading(false);
    } catch (err) {
      console.error('Error running what-if analysis:', err);
      setError('Failed to run what-if analysis. Please try again later.');
      setWhatIfLoading(false);
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
  if (loading && !predictionData) {
    return (
      <Card className="cash-flow-prediction-dashboard mb-4">
        <Card.Header>
          <h5 className="mb-0">AI-Powered Cash Flow Prediction</h5>
        </Card.Header>
        <Card.Body className="text-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading prediction data...</p>
        </Card.Body>
      </Card>
    );
  }

  // Render error state
  if (error && !predictionData) {
    return (
      <Card className="cash-flow-prediction-dashboard mb-4">
        <Card.Header>
          <h5 className="mb-0">AI-Powered Cash Flow Prediction</h5>
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
    <Card className="cash-flow-prediction-dashboard mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FontAwesomeIcon icon={faRobot} className="me-2" />
            AI-Powered Cash Flow Prediction
          </h5>
          <div className="forecast-controls">
            <Form.Group className="d-flex align-items-center">
              <Form.Label className="me-2 mb-0">Forecast Months:</Form.Label>
              <Form.Select
                name="forecastMonths"
                value={forecastMonths}
                onChange={handleForecastMonthsChange}
                className="me-2"
                size="sm"
                style={{ width: '80px' }}
              >
                <option value="3">3</option>
                <option value="6">6</option>
                <option value="12">12</option>
                <option value="24">24</option>
              </Form.Select>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={exportReportToPDF}
                className="me-2"
              >
                <FontAwesomeIcon icon={faDownload} className="me-1" />
                Export
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={printReport}
              >
                <FontAwesomeIcon icon={faPrint} className="me-1" />
                Print
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
          <Tab eventKey="forecast" title={<><FontAwesomeIcon icon={faChartLine} className="me-2" />Cash Flow Forecast</>}>
            {predictionData && (
              <div className="cash-flow-forecast">
                <Row className="mb-4">
                  <Col md={3}>
                    <div className="kpi-card">
                      <div className="kpi-title">Total Predicted Income</div>
                      <div className="kpi-value">${predictionData.summary.totalPredictedIncome.toFixed(2)}</div>
                      <div className="kpi-period">Next {forecastMonths} months</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="kpi-card">
                      <div className="kpi-title">Total Predicted Expenses</div>
                      <div className="kpi-value">${predictionData.summary.totalPredictedExpenses.toFixed(2)}</div>
                      <div className="kpi-period">Next {forecastMonths} months</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="kpi-card">
                      <div className="kpi-title">Net Cash Flow</div>
                      <div className="kpi-value">${predictionData.summary.totalPredictedNetCashFlow.toFixed(2)}</div>
                      <div className="kpi-period">Next {forecastMonths} months</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="kpi-card">
                      <div className="kpi-title">Average Monthly Cash Flow</div>
                      <div className="kpi-value">${predictionData.summary.averageMonthlyNetCashFlow.toFixed(2)}</div>
                      <div className="kpi-period">Per month</div>
                    </div>
                  </Col>
                </Row>
                
                <Row className="mb-4">
                  <Col md={12}>
                    <Card className="chart-card">
                      <Card.Header>
                        <h6 className="mb-0">Cash Flow Forecast</h6>
                      </Card.Header>
                      <Card.Body>
                        {chartData.forecast && (
                          <div className="chart-container">
                            <Line
                              data={chartData.forecast}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                  y: {
                                    ticks: {
                                      callback: (value) => `$${value}`
                                    }
                                  }
                                },
                                plugins: {
                                  legend: {
                                    position: 'top'
                                  },
                                  tooltip: {
                                    callbacks: {
                                      label: function(context) {
                       <response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>