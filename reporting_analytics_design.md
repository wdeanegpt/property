# Reporting and Analytics Design Document

## Overview

The Reporting and Analytics component is a critical part of the Comprehensive Property Management System, providing stakeholders with valuable insights into property performance, tenant behavior, financial metrics, and operational efficiency. This document outlines the architecture, features, and implementation details for the Reporting and Analytics component.

## Architecture

The Reporting and Analytics component follows a modular architecture with the following layers:

1. **Data Collection Layer**: Services for gathering and processing data from various system components
2. **Data Storage Layer**: Optimized database structures for analytics and reporting
3. **Processing Layer**: Data transformation, aggregation, and analysis services
4. **Visualization Layer**: React components for displaying reports, charts, and dashboards
5. **Export Layer**: Services for exporting reports in various formats

### Component Hierarchy

```
ReportingAndAnalytics
├── DashboardCenter
│   ├── ExecutiveDashboard
│   ├── PropertyDashboard
│   ├── FinancialDashboard
│   ├── MaintenanceDashboard
│   ├── OccupancyDashboard
│   └── CustomDashboard
├── ReportBuilder
│   ├── ReportDesigner
│   ├── QueryBuilder
│   ├── ColumnSelector
│   ├── FilterBuilder
│   ├── SortingOptions
│   └── VisualizationPicker
├── StandardReports
│   ├── FinancialReports
│   ├── OccupancyReports
│   ├── MaintenanceReports
│   ├── TenantReports
│   └── ComplianceReports
├── AnalyticsEngine
│   ├── TrendAnalysis
│   ├── PredictiveAnalytics
│   ├── PerformanceMetrics
│   ├── BenchmarkComparisons
│   └── AnomalyDetection
└── ExportManager
    ├── PDFExporter
    ├── ExcelExporter
    ├── CSVExporter
    ├── ScheduledReports
    └── EmailDistribution
```

## Core Features

### 1. Dashboard Center

The Dashboard Center provides at-a-glance views of key performance indicators (KPIs) and metrics through interactive dashboards tailored to different user roles and needs.

#### Implementation Details

```jsx
// DashboardCenter.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchDashboardData } from '../services/dashboardService';
import ExecutiveDashboard from './ExecutiveDashboard';
import PropertyDashboard from './PropertyDashboard';
import FinancialDashboard from './FinancialDashboard';
import MaintenanceDashboard from './MaintenanceDashboard';
import OccupancyDashboard from './OccupancyDashboard';
import CustomDashboard from './CustomDashboard';
import DashboardSelector from './DashboardSelector';
import DateRangePicker from './DateRangePicker';
import './DashboardCenter.css';

const DashboardCenter = () => {
  const { currentUser } = useAuth();
  const [activeDashboard, setActiveDashboard] = useState('executive');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date()
  });
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const data = await fetchDashboardData({
          dashboardType: activeDashboard,
          userId: currentUser.id,
          role: currentUser.role,
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          propertyIds: currentUser.role === 'tenant' ? [currentUser.propertyId] : null
        });
        setDashboardData(data);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();

    // Set up auto-refresh if enabled
    if (refreshInterval) {
      const intervalId = setInterval(loadDashboardData, refreshInterval * 1000);
      return () => clearInterval(intervalId);
    }
  }, [activeDashboard, dateRange, currentUser, refreshInterval]);

  const handleDashboardChange = (dashboardType) => {
    setActiveDashboard(dashboardType);
  };

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  const handleRefreshIntervalChange = (seconds) => {
    setRefreshInterval(seconds);
  };

  const renderDashboard = () => {
    if (loading) return <div className="loading-spinner">Loading dashboard data...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!dashboardData) return <div className="no-data-message">No dashboard data available</div>;

    switch (activeDashboard) {
      case 'executive':
        return <ExecutiveDashboard data={dashboardData} />;
      case 'property':
        return <PropertyDashboard data={dashboardData} />;
      case 'financial':
        return <FinancialDashboard data={dashboardData} />;
      case 'maintenance':
        return <MaintenanceDashboard data={dashboardData} />;
      case 'occupancy':
        return <OccupancyDashboard data={dashboardData} />;
      case 'custom':
        return <CustomDashboard data={dashboardData} userId={currentUser.id} />;
      default:
        return <div className="error-message">Invalid dashboard type</div>;
    }
  };

  return (
    <div className="dashboard-center">
      <div className="dashboard-header">
        <h1>Dashboard Center</h1>
        <div className="dashboard-controls">
          <DashboardSelector 
            activeDashboard={activeDashboard} 
            onDashboardChange={handleDashboardChange}
            userRole={currentUser.role}
          />
          <DateRangePicker 
            dateRange={dateRange} 
            onDateRangeChange={handleDateRangeChange} 
          />
          <div className="refresh-control">
            <label htmlFor="refresh-interval">Auto-refresh:</label>
            <select 
              id="refresh-interval" 
              value={refreshInterval || ''} 
              onChange={(e) => handleRefreshIntervalChange(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Off</option>
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
              <option value="600">10 minutes</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="dashboard-content">
        {renderDashboard()}
      </div>
    </div>
  );
};

export default DashboardCenter;
```

```jsx
// ExecutiveDashboard.jsx
import React from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell 
} from 'recharts';
import MetricCard from './MetricCard';
import './ExecutiveDashboard.css';

const ExecutiveDashboard = ({ data }) => {
  const { 
    financialMetrics, 
    occupancyMetrics, 
    maintenanceMetrics, 
    tenantMetrics,
    revenueData,
    expenseData,
    occupancyTrend,
    leaseEndingsSoon
  } = data;

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="executive-dashboard">
      <div className="metrics-row">
        <MetricCard 
          title="Total Revenue" 
          value={financialMetrics.totalRevenue} 
          prefix="$"
          change={financialMetrics.revenueChange}
          changeType={financialMetrics.revenueChange >= 0 ? 'positive' : 'negative'}
          icon="dollar"
        />
        <MetricCard 
          title="Occupancy Rate" 
          value={occupancyMetrics.occupancyRate} 
          suffix="%"
          change={occupancyMetrics.occupancyChange}
          changeType={occupancyMetrics.occupancyChange >= 0 ? 'positive' : 'negative'}
          icon="building"
        />
        <MetricCard 
          title="Avg. Maintenance Cost" 
          value={maintenanceMetrics.averageCost} 
          prefix="$"
          change={maintenanceMetrics.costChange}
          changeType={maintenanceMetrics.costChange <= 0 ? 'positive' : 'negative'}
          icon="tools"
        />
        <MetricCard 
          title="Tenant Satisfaction" 
          value={tenantMetrics.satisfactionScore} 
          suffix="/10"
          change={tenantMetrics.satisfactionChange}
          changeType={tenantMetrics.satisfactionChange >= 0 ? 'positive' : 'negative'}
          icon="smile"
        />
      </div>
      
      <div className="charts-row">
        <div className="chart-container">
          <h3>Revenue vs Expenses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={revenueData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#0088FE" />
              <Bar dataKey="expenses" name="Expenses" fill="#FF8042" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-container">
          <h3>Occupancy Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={occupancyTrend}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="occupancyRate" 
                name="Occupancy Rate" 
                stroke="#00C49F" 
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="charts-row">
        <div className="chart-container">
          <h3>Expense Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expenseData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                nameKey="category"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {expenseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-container">
          <h3>Leases Ending Soon</h3>
          <div className="leases-ending-container">
            <table className="leases-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Unit</th>
                  <th>Tenant</th>
                  <th>End Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaseEndingsSoon.map((lease, index) => (
                  <tr key={index}>
                    <td>{lease.propertyName}</td>
                    <td>{lease.unitNumber}</td>
                    <td>{lease.tenantName}</td>
                    <td>{new Date(lease.endDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge status-${lease.status.toLowerCase()}`}>
                        {lease.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
```

### 2. Report Builder

The Report Builder allows users to create custom reports by selecting data sources, columns, filters, and visualization options, providing flexibility to meet diverse reporting needs.

#### Implementation Details

```jsx
// ReportBuilder.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  fetchReportSources, 
  fetchReportColumns, 
  generateReport,
  saveReportTemplate
} from '../services/reportService';
import QueryBuilder from './QueryBuilder';
import ColumnSelector from './ColumnSelector';
import FilterBuilder from './FilterBuilder';
import SortingOptions from './SortingOptions';
import VisualizationPicker from './VisualizationPicker';
import ReportPreview from './ReportPreview';
import './ReportBuilder.css';

const ReportBuilder = () => {
  const { currentUser } = useAuth();
  const [reportSources, setReportSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [reportConfig, setReportConfig] = useState({
    name: 'New Report',
    description: '',
    columns: [],
    filters: [],
    sortBy: [],
    groupBy: [],
    visualization: 'table',
    visualizationConfig: {}
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const loadReportSources = async () => {
      try {
        setSourceLoading(true);
        const sources = await fetchReportSources(currentUser.role);
        setReportSources(sources);
        if (sources.length > 0) {
          setSelectedSource(sources[0].id);
        }
      } catch (err) {
        setError('Failed to load report sources');
        console.error(err);
      } finally {
        setSourceLoading(false);
      }
    };

    loadReportSources();
  }, [currentUser.role]);

  useEffect(() => {
    const loadColumns = async () => {
      if (!selectedSource) return;
      
      try {
        setLoading(true);
        const columns = await fetchReportColumns(selectedSource);
        setAvailableColumns(columns);
        
        // Reset report configuration when source changes
        setReportConfig({
          ...reportConfig,
          columns: [],
          filters: [],
          sortBy: [],
          groupBy: [],
        });
        
        setReportData(null);
      } catch (err) {
        setError('Failed to load columns for selected source');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadColumns();
  }, [selectedSource]);

  const handleSourceChange = (e) => {
    setSelectedSource(e.target.value);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReportConfig({
      ...reportConfig,
      [name]: value
    });
  };

  const handleColumnsChange = (selectedColumns) => {
    setReportConfig({
      ...reportConfig,
      columns: selectedColumns
    });
  };

  const handleFiltersChange = (filters) => {
    setReportConfig({
      ...reportConfig,
      filters
    });
  };

  const handleSortingChange = (sortBy) => {
    setReportConfig({
      ...reportConfig,
      sortBy
    });
  };

  const handleGroupingChange = (groupBy) => {
    setReportConfig({
      ...reportConfig,
      groupBy
    });
  };

  const handleVisualizationChange = (visualization, visualizationConfig) => {
    setReportConfig({
      ...reportConfig,
      visualization,
      visualizationConfig
    });
  };

  const handleGenerateReport = async () => {
    if (reportConfig.columns.length === 0) {
      setError('Please select at least one column for your report');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await generateReport({
        sourceId: selectedSource,
        config: reportConfig,
        userId: currentUser.id
      });
      
      setReportData(data);
      setPreviewMode(true);
    } catch (err) {
      setError('Failed to generate report');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!reportConfig.name.trim()) {
      setError('Please provide a name for your report template');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await saveReportTemplate({
        sourceId: selectedSource,
        config: reportConfig,
        userId: currentUser.id
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save report template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEdit = () => {
    setPreviewMode(false);
  };

  if (sourceLoading) {
    return <div className="loading-spinner">Loading report sources...</div>;
  }

  return (
    <div className="report-builder">
      <div className="report-builder-header">
        <h1>{previewMode ? 'Report Preview' : 'Custom Report Builder'}</h1>
        {previewMode && (
          <button 
            className="back-to-edit-button"
            onClick={handleBackToEdit}
          >
            Back to Edit
          </button>
        )}
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {saveSuccess && <div className="success-message">Report template saved successfully!</div>}
      
      {!previewMode ? (
        <div className="report-builder-form">
          <div className="form-section">
            <h2>Report Details</h2>
            <div className="form-group">
              <label htmlFor="name">Report Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={reportConfig.name}
                onChange={handleInputChange}
                placeholder="Enter report name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description (Optional)</label>
              <textarea
                id="description"
                name="description"
                value={reportConfig.description}
                onChange={handleInputChange}
                placeholder="Enter report description"
                rows={2}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="source">Data Source</label>
              <select
                id="source"
                value={selectedSource || ''}
                onChange={handleSourceChange}
                disabled={loading}
              >
                {reportSources.map(source => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {selectedSource && (
            <>
              <div className="form-section">
                <h2>Select Columns</h2>
                <ColumnSelector 
                  availableColumns={availableColumns}
                  selectedColumns={reportConfig.columns}
                  onColumnsChange={handleColumnsChange}
                  loading={loading}
                />
              </div>
              
              <div className="form-section">
                <h2>Filters</h2>
                <FilterBuilder 
                  availableColumns={availableColumns}
                  filters={reportConfig.filters}
                  onFiltersChange={handleFiltersChange}
                />
              </div>
              
              <div className="form-section">
                <h2>Sorting & Grouping</h2>
                <SortingOptions 
                  availableColumns={availableColumns}
                  selectedColumns={reportConfig.columns}
                  sortBy={reportConfig.sortBy}
                  groupBy={reportConfig.groupBy}
                  onSortingChange={handleSortingChange}
                  onGroupingChange={handleGroupingChange}
                />
              </div>
              
              <div className="form-section">
                <h2>Visualization</h2>
                <VisualizationPicker 
                  selectedColumns={reportConfig.columns}
                  visualization={reportConfig.visualization}
                  visualizationConfig={reportConfig.visualizationConfig}
                  onVisualizationChange={handleVisualizationChange}
                />
              </div>
              
              <div className="form-actions">
                <button 
                  className="generate-button"
                  onClick={handleGenerateReport}
                  disabled={loading || reportConfig.columns.length === 0}
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </button>
                <button 
                  className="save-template-button"
                  onClick={handleSaveTemplate}
                  disabled={loading || reportConfig.columns.length === 0}
                >
                  {loading ? 'Saving...' : 'Save as Template'}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <ReportPreview 
          reportName={reportConfig.name}
          reportDescription={reportConfig.description}
          data={reportData}
          columns={reportConfig.columns}
          visualization={reportConfig.visualization}
          visualizationConfig={reportConfig.visualizationConfig}
        />
      )}
    </div>
  );
};

export default ReportBuilder;
```

```jsx
// ColumnSelector.jsx
import React, { useState } from 'react';
import './ColumnSelector.css';

const ColumnSelector = ({ availableColumns, selectedColumns, onColumnsChange, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredColumns = availableColumns.filter(column => 
    column.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    column.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleColumnToggle = (columnId) => {
    const isSelected = selectedColumns.includes(columnId);
    
    if (isSelected) {
      onColumnsChange(selectedColumns.filter(id => id !== columnId));
    } else {
      onColumnsChange([...selectedColumns, columnId]);
    }
  };
  
  const handleSelectAll = () => {
    onColumnsChange(filteredColumns.map(column => column.id));
  };
  
  const handleDeselectAll = () => {
    onColumnsChange([]);
  };

  return (
    <div className="column-selector">
      <div className="column-search">
        <input
          type="text"
          placeholder="Search columns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={loading}
        />
        <div className="select-actions">
          <button 
            type="button" 
            onClick={handleSelectAll}
            disabled={loading}
          >
            Select All
          </button>
          <button 
            type="button" 
            onClick={handleDeselectAll}
            disabled={loading}
          >
            Deselect All
          </button>
        </div>
      </div>
      
      <div className="columns-list">
        {loading ? (
          <div className="loading-spinner">Loading columns...</div>
        ) : filteredColumns.length === 0 ? (
          <div className="no-columns-message">
            No columns found matching your search criteria
          </div>
        ) : (
          filteredColumns.map(column => (
            <div 
              key={column.id} 
              className={`column-item ${selectedColumns.includes(column.id) ? 'selected' : ''}`}
              onClick={() => handleColumnToggle(column.id)}
            >
              <div className="column-checkbox">
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(column.id)}
                  onChange={() => {}}
                  id={`column-${column.id}`}
                />
                <label htmlFor={`column-${column.id}`}></label>
              </div>
              <div className="column-info">
                <div className="column-name">{column.label}</div>
                <div className="column-description">{column.description}</div>
              </div>
              <div className="column-type">{column.dataType}</div>
            </div>
          ))
        )}
      </div>
      
      <div className="selected-count">
        {selectedColumns.length} of {availableColumns.length} columns selected
      </div>
    </div>
  );
};

export default ColumnSelector;
```

### 3. Standard Reports

The Standard Reports module provides pre-configured reports for common reporting needs, including financial reports, occupancy reports, maintenance reports, tenant reports, and compliance reports.

#### Implementation Details

```jsx
// StandardReports.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchStandardReports, generateStandardReport } from '../services/reportService';
import ReportPreview from './ReportPreview';
import DateRangePicker from './DateRangePicker';
import './StandardReports.css';

const StandardReports = () => {
  const { currentUser } = useAuth();
  const [reportCategories, setReportCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date()
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [reportParameters, setReportParameters] = useState({});

  useEffect(() => {
    const loadReportCategories = async () => {
      try {
        setLoading(true);
        const data = await fetchStandardReports(currentUser.role);
        
        // Extract unique categories
        const categories = [...new Set(data.map(report => report.category))];
        setReportCategories(categories);
        
        // Set reports
        setReports(data);
        
        // Set initial category and report if available
        if (categories.length > 0) {
          setSelectedCategory(categories[0]);
          
          const categoryReports = data.filter(report => report.category === categories[0]);
          if (categoryReports.length > 0) {
            setSelectedReport(categoryReports[0].id);
          }
        }
      } catch (err) {
        setError('Failed to load standard reports');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadReportCategories();
  }, [currentUser.role]);

  useEffect(() => {
    // Reset selected report when category changes
    if (selectedCategory) {
      const categoryReports = reports.filter(report => report.category === selectedCategory);
      if (categoryReports.length > 0) {
        setSelectedReport(categoryReports[0].id);
      } else {
        setSelectedReport(null);
      }
    }
  }, [selectedCategory, reports]);

  useEffect(() => {
    // Reset report parameters when selected report changes
    if (selectedReport) {
      const report = reports.find(r => r.id === selectedReport);
      if (report && report.parameters) {
        const initialParams = {};
        report.parameters.forEach(param => {
          initialParams[param.id] = param.defaultValue || '';
        });
        setReportParameters(initialParams);
      } else {
        setReportParameters({});
      }
      
      // Clear previous report data
      setReportData(null);
    }
  }, [selectedReport, reports]);

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handleReportChange = (e) => {
    setSelectedReport(e.target.value);
  };

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  const handleParameterChange = (paramId, value) => {
    setReportParameters({
      ...reportParameters,
      [paramId]: value
    });
  };

  const handleGenerateReport = async () => {
    if (!selectedReport) return;
    
    try {
      setGenerating(true);
      setError(null);
      
      const data = await generateStandardReport({
        reportId: selectedReport,
        parameters: {
          ...reportParameters,
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString()
        },
        userId: currentUser.id
      });
      
      setReportData(data);
    } catch (err) {
      setError('Failed to generate report');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading standard reports...</div>;
  }

  const selectedReportDetails = reports.find(report => report.id === selectedReport);
  const filteredReports = selectedCategory 
    ? reports.filter(report => report.category === selectedCategory)
    : [];

  return (
    <div className="standard-reports">
      <h1>Standard Reports</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="report-selection">
        <div className="form-group">
          <label htmlFor="category">Report Category</label>
          <select
            id="category"
            value={selectedCategory || ''}
            onChange={handleCategoryChange}
          >
            {reportCategories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="report">Report</label>
          <select
            id="report"
            value={selectedReport || ''}
            onChange={handleReportChange}
            disabled={!selectedCategory}
          >
            {filteredReports.map(report => (
              <option key={report.id} value={report.id}>
                {report.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {selectedReportDetails && (
        <div className="report-configuration">
          <div className="report-info">
            <h2>{selectedReportDetails.name}</h2>
            <p className="report-description">{selectedReportDetails.description}</p>
          </div>
          
          <div className="report-parameters">
            <h3>Report Parameters</h3>
            
            <div className="parameter-group">
              <label>Date Range</label>
              <DateRangePicker 
                dateRange={dateRange} 
                onDateRangeChange={handleDateRangeChange} 
              />
            </div>
            
            {selectedReportDetails.parameters && selectedReportDetails.parameters.map(param => (
              <div key={param.id} className="parameter-group">
                <label htmlFor={`param-${param.id}`}>{param.label}</label>
                
                {param.type === 'select' ? (
                  <select
                    id={`param-${param.id}`}
                    value={reportParameters[param.id] || ''}
                    onChange={(e) => handleParameterChange(param.id, e.target.value)}
                  >
                    {param.options.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : param.type === 'boolean' ? (
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      id={`param-${param.id}`}
                      checked={reportParameters[param.id] === true}
                      onChange={(e) => handleParameterChange(param.id, e.target.checked)}
                    />
                    <label htmlFor={`param-${param.id}`}>{param.label}</label>
                  </div>
                ) : (
                  <input
                    type={param.type || 'text'}
                    id={`param-${param.id}`}
                    value={reportParameters[param.id] || ''}
                    onChange={(e) => handleParameterChange(param.id, e.target.value)}
                    placeholder={param.placeholder || ''}
                  />
                )}
                
                {param.description && (
                  <p className="parameter-description">{param.description}</p>
                )}
              </div>
            ))}
            
            <div className="report-actions">
              <button 
                className="generate-button"
                onClick={handleGenerateReport}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {reportData && (
        <div className="report-results">
          <ReportPreview 
            reportName={selectedReportDetails.name}
            reportDescription={selectedReportDetails.description}
            data={reportData.data}
            columns={reportData.columns}
            visualization={reportData.visualization || 'table'}
            visualizationConfig={reportData.visualizationConfig || {}}
          />
        </div>
      )}
    </div>
  );
};

export default StandardReports;
```

### 4. Analytics Engine

The Analytics Engine provides advanced data analysis capabilities, including trend analysis, predictive analytics, performance metrics, benchmark comparisons, and anomaly detection.

#### Implementation Details

```jsx
// TrendAnalysis.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  fetchTrendData, 
  fetchAvailableMetrics,
  fetchPredictions
} from '../services/analyticsService';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceArea, ReferenceLine
} from 'recharts';
import MetricSelector from './MetricSelector';
import DateRangePicker from './DateRangePicker';
import './TrendAnalysis.css';

const TrendAnalysis = () => {
  const { currentUser } = useAuth();
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
    endDate: new Date()
  });
  const [interval, setInterval] = useState('month');
  const [trendData, setTrendData] = useState(null);
  const [showPrediction, setShowPrediction] = useState(false);
  const [predictionData, setPredictionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [predictionMonths, setPredictionMonths] = useState(3);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        const metrics = await fetchAvailableMetrics(currentUser.role);
        setAvailableMetrics(metrics);
        
        if (metrics.length > 0) {
          setSelectedMetric(metrics[0].id);
        }
      } catch (err) {
        setError('Failed to load available metrics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [currentUser.role]);

  useEffect(() => {
    const loadTrendData = async () => {
      if (!selectedMetric) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchTrendData({
          metricId: selectedMetric,
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          interval,
          userId: currentUser.id
        });
        
        setTrendData(data);
        
        // Reset prediction data when trend data changes
        setPredictionData(null);
        setShowPrediction(false);
      } catch (err) {
        setError('Failed to load trend data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadTrendData();
  }, [selectedMetric, dateRange, interval, currentUser.id]);

  const handleMetricChange = (metricId) => {
    setSelectedMetric(metricId);
  };

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  const handleIntervalChange = (e) => {
    setInterval(e.target.value);
  };

  const handlePredictionMonthsChange = (e) => {
    setPredictionMonths(parseInt(e.target.value));
  };

  const handleGeneratePrediction = async () => {
    if (!selectedMetric || !trendData) return;
    
    try {
      setPredictionLoading(true);
      setError(null);
      
      const data = await fetchPredictions({
        metricId: selectedMetric,
        historicalData: trendData,
        months: predictionMonths,
        userId: currentUser.id
      });
      
      setPredictionData(data);
      setShowPrediction(true);
    } catch (err) {
      setError('Failed to generate prediction');
      console.error(err);
    } finally {
      setPredictionLoading(false);
    }
  };

  const togglePrediction = () => {
    if (showPrediction && !predictionData) {
      handleGeneratePrediction();
    } else {
      setShowPrediction(!showPrediction);
    }
  };

  if (loading && !trendData) {
    return <div className="loading-spinner">Loading trend analysis data...</div>;
  }

  const selectedMetricDetails = availableMetrics.find(metric => metric.id === selectedMetric);
  
  // Combine historical and prediction data for chart
  const combinedData = trendData ? [...trendData] : [];
  if (showPrediction && predictionData) {
    combinedData.push(...predictionData);
  }

  return (
    <div className="trend-analysis">
      <h1>Trend Analysis</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="trend-controls">
        <div className="control-section">
          <h3>Select Metric</h3>
          <MetricSelector 
            metrics={availableMetrics}
            selectedMetric={selectedMetric}
            onMetricChange={handleMetricChange}
          />
        </div>
        
        <div className="control-section">
          <h3>Date Range</h3>
          <DateRangePicker 
            dateRange={dateRange} 
            onDateRangeChange={handleDateRangeChange} 
          />
        </div>
        
        <div className="control-section">
          <h3>Interval</h3>
          <select
            value={interval}
            onChange={handleIntervalChange}
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
      </div>
      
      {selectedMetricDetails && trendData && (
        <div className="trend-visualization">
          <div className="metric-details">
            <h2>{selectedMetricDetails.name}</h2>
            <p className="metric-description">{selectedMetricDetails.description}</p>
          </div>
          
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={combinedData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis 
                  domain={selectedMetricDetails.isPercentage ? [0, 100] : ['auto', 'auto']}
                  tickFormatter={value => 
                    selectedMetricDetails.isPercentage 
                      ? `${value}%` 
                      : selectedMetricDetails.isCurrency 
                        ? `$${value}` 
                        : value
                  }
                />
                <Tooltip 
                  formatter={(value) => [
                    selectedMetricDetails.isPercentage 
                      ? `${value}%` 
                      : selectedMetricDetails.isCurrency 
                        ? `$${value.toLocaleString()}` 
                        : value.toLocaleString(),
                    selectedMetricDetails.name
                  ]}
                />
                <Legend />
                
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  name={selectedMetricDetails.name} 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.3}
                  activeDot={{ r: 8 }}
                  isAnimationActive={true}
                />
                
                {showPrediction && predictionData && (
                  <>
                    <Area 
                      type="monotone" 
                      dataKey="prediction" 
                      name="Prediction" 
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      fillOpacity={0.3}
                      strokeDasharray="5 5"
                      activeDot={{ r: 8 }}
                      isAnimationActive={true}
                    />
                    
                    <ReferenceLine 
                      x={predictionData[0].date} 
                      stroke="red" 
                      strokeDasharray="3 3" 
                      label={{ value: 'Prediction Start', position: 'insideTopRight' }} 
                    />
                  </>
                )}
                
                {selectedMetricDetails.benchmark && (
                  <ReferenceLine 
                    y={selectedMetricDetails.benchmark} 
                    label={{ value: 'Benchmark', position: 'right' }} 
                    stroke="green" 
                    strokeDasharray="3 3" 
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="trend-insights">
            <div className="insight-section">
              <h3>Trend Summary</h3>
              <div className="insight-cards">
                <div className="insight-card">
                  <div className="insight-title">Current Value</div>
                  <div className="insight-value">
                    {selectedMetricDetails.isPercentage 
                      ? `${trendData[trendData.length - 1].value}%` 
                      : selectedMetricDetails.isCurrency 
                        ? `$${trendData[trendData.length - 1].value.toLocaleString()}` 
                        : trendData[trendData.length - 1].value.toLocaleString()}
                  </div>
                </div>
                
                <div className="insight-card">
                  <div className="insight-title">Average</div>
                  <div className="insight-value">
                    {selectedMetricDetails.isPercentage 
                      ? `${(trendData.reduce((sum, item) => sum + item.value, 0) / trendData.length).toFixed(2)}%` 
                      : selectedMetricDetails.isCurrency 
                        ? `$${(trendData.reduce((sum, item) => sum + item.value, 0) / trendData.length).toFixed(2)}` 
                        : (trendData.reduce((sum, item) => sum + item.value, 0) / trendData.length).toFixed(2)}
                  </div>
                </div>
                
                <div className="insight-card">
                  <div className="insight-title">Change</div>
                  <div className={`insight-value ${trendData[trendData.length - 1].value > trendData[0].value ? 'positive' : 'negative'}`}>
                    {trendData[trendData.length - 1].value > trendData[0].value ? '+' : ''}
                    {((trendData[trendData.length - 1].value - trendData[0].value) / trendData[0].value * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
            
            <div className="prediction-section">
              <h3>Predictive Analysis</h3>
              <div className="prediction-controls">
                <div className="prediction-months">
                  <label htmlFor="prediction-months">Prediction Months:</label>
                  <select
                    id="prediction-months"
                    value={predictionMonths}
                    onChange={handlePredictionMonthsChange}
                    disabled={predictionLoading}
                  >
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                  </select>
                </div>
                
                <button 
                  className={`prediction-toggle ${showPrediction ? 'active' : ''}`}
                  onClick={togglePrediction}
                  disabled={predictionLoading}
                >
                  {predictionLoading 
                    ? 'Generating...' 
                    : showPrediction 
                      ? 'Hide Prediction' 
                      : 'Show Prediction'}
                </button>
              </div>
              
              {showPrediction && predictionData && (
                <div className="prediction-insights">
                  <div className="insight-card">
                    <div className="insight-title">Predicted Value ({predictionData[predictionData.length - 1].date})</div>
                    <div className="insight-value">
                      {selectedMetricDetails.isPercentage 
                        ? `${predictionData[predictionData.length - 1].prediction}%` 
                        : selectedMetricDetails.isCurrency 
                          ? `$${predictionData[predictionData.length - 1].prediction.toLocaleString()}` 
                          : predictionData[predictionData.length - 1].prediction.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="insight-card">
                    <div className="insight-title">Predicted Change</div>
                    <div className={`insight-value ${predictionData[predictionData.length - 1].prediction > trendData[trendData.length - 1].value ? 'positive' : 'negative'}`}>
                      {predictionData[predictionData.length - 1].prediction > trendData[trendData.length - 1].value ? '+' : ''}
                      {((predictionData[predictionData.length - 1].prediction - trendData[trendData.length - 1].value) / trendData[trendData.length - 1].value * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendAnalysis;
```

```jsx
// PerformanceMetrics.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchPerformanceMetrics } from '../services/analyticsService';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import MetricCard from './MetricCard';
import './PerformanceMetrics.css';

const PerformanceMetrics = () => {
  const { currentUser } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [timeframe, setTimeframe] = useState('month');

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        const data = await fetchPerformanceMetrics({
          userId: currentUser.id,
          role: currentUser.role,
          propertyId: selectedProperty === 'all' ? null : selectedProperty,
          timeframe
        });
        setMetrics(data);
      } catch (err) {
        setError('Failed to load performance metrics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [currentUser, selectedProperty, timeframe]);

  const handlePropertyChange = (e) => {
    setSelectedProperty(e.target.value);
  };

  const handleTimeframeChange = (e) => {
    setTimeframe(e.target.value);
  };

  if (loading) {
    return <div className="loading-spinner">Loading performance metrics...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!metrics) {
    return <div className="no-data-message">No performance metrics available</div>;
  }

  const { 
    kpis, 
    radarData, 
    properties, 
    benchmarks, 
    performanceScores 
  } = metrics;

  return (
    <div className="performance-metrics">
      <h1>Performance Metrics</h1>
      
      <div className="metrics-controls">
        <div className="control-group">
          <label htmlFor="property-select">Property:</label>
          <select
            id="property-select"
            value={selectedProperty}
            onChange={handlePropertyChange}
          >
            <option value="all">All Properties</option>
            {properties.map(property => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="control-group">
          <label htmlFor="timeframe-select">Timeframe:</label>
          <select
            id="timeframe-select"
            value={timeframe}
            onChange={handleTimeframeChange}
          >
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
            <option value="ytd">Year to Date</option>
          </select>
        </div>
      </div>
      
      <div className="kpi-cards">
        {kpis.map(kpi => (
          <MetricCard 
            key={kpi.id}
            title={kpi.name}
            value={kpi.value}
            prefix={kpi.isCurrency ? '$' : ''}
            suffix={kpi.isPercentage ? '%' : ''}
            change={kpi.change}
            changeType={kpi.changeType}
            icon={kpi.icon}
            benchmark={kpi.benchmark}
            benchmarkLabel="Benchmark"
          />
        ))}
      </div>
      
      <div className="performance-visualization">
        <div className="radar-chart-container">
          <h2>Performance Overview</h2>
          <ResponsiveContainer width="100%" height={500}>
            <RadarChart outerRadius={150} data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis domain={[0, 100]} />
              
              <Radar
                name="Current Performance"
                dataKey="value"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
              
              <Radar
                name="Benchmark"
                dataKey="benchmark"
                stroke="#82ca9d"
                fill="#82ca9d"
                fillOpacity={0.4}
              />
              
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="performance-scores">
          <h2>Performance Scores</h2>
          <div className="score-cards">
            {performanceScores.map(score => (
              <div key={score.category} className="score-card">
                <div className="score-header">
                  <h3>{score.category}</h3>
                  <div className={`score-value score-${getScoreLevel(score.score)}`}>
                    {score.score}/100
                  </div>
                </div>
                <div className="score-bar-container">
                  <div 
                    className={`score-bar score-${getScoreLevel(score.score)}`}
                    style={{ width: `${score.score}%` }}
                  ></div>
                  <div 
                    className="benchmark-marker"
                    style={{ left: `${score.benchmark}%` }}
                    title={`Benchmark: ${score.benchmark}`}
                  ></div>
                </div>
                <div className="score-details">
                  <div className="score-metrics">
                    {score.metrics.map(metric => (
                      <div key={metric.name} className="score-metric">
                        <span className="metric-name">{metric.name}:</span>
                        <span className="metric-value">
                          {metric.isPercentage 
                            ? `${metric.value}%` 
                            : metric.isCurrency 
                              ? `$${metric.value.toLocaleString()}` 
                              : metric.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="score-actions">
                    <a href={`/reports/performance/${score.category.toLowerCase()}`} className="view-details-link">
                      View Details
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="benchmarks-section">
        <h2>Industry Benchmarks</h2>
        <div className="benchmark-cards">
          {benchmarks.map(benchmark => (
            <div key={benchmark.id} className="benchmark-card">
              <div className="benchmark-header">
                <h3>{benchmark.name}</h3>
                <div className="benchmark-source">{benchmark.source}</div>
              </div>
              <div className="benchmark-value">
                {benchmark.isPercentage 
                  ? `${benchmark.value}%` 
                  : benchmark.isCurrency 
                    ? `$${benchmark.value.toLocaleString()}` 
                    : benchmark.value}
              </div>
              <div className="benchmark-description">
                {benchmark.description}
              </div>
              <div className="benchmark-comparison">
                <div className="comparison-label">Your Performance:</div>
                <div className={`comparison-value ${getComparisonClass(benchmark.yourValue, benchmark.value, benchmark.higherIsBetter)}`}>
                  {benchmark.isPercentage 
                    ? `${benchmark.yourValue}%` 
                    : benchmark.isCurrency 
                      ? `$${benchmark.yourValue.toLocaleString()}` 
                      : benchmark.yourValue}
                  {' '}
                  <span className="comparison-diff">
                    ({getComparisonText(benchmark.yourValue, benchmark.value, benchmark.higherIsBetter)})
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getScoreLevel = (score) => {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'average';
  if (score >= 20) return 'poor';
  return 'critical';
};

const getComparisonClass = (yourValue, benchmarkValue, higherIsBetter) => {
  if (yourValue === benchmarkValue) return 'neutral';
  
  const isHigher = yourValue > benchmarkValue;
  if (higherIsBetter) {
    return isHigher ? 'positive' : 'negative';
  } else {
    return isHigher ? 'negative' : 'positive';
  }
};

const getComparisonText = (yourValue, benchmarkValue, higherIsBetter) => {
  if (yourValue === benchmarkValue) return 'Equal to benchmark';
  
  const diff = Math.abs(((yourValue - benchmarkValue) / benchmarkValue) * 100).toFixed(1);
  const isHigher = yourValue > benchmarkValue;
  
  if (higherIsBetter) {
    return isHigher ? `${diff}% above benchmark` : `${diff}% below benchmark`;
  } else {
    return isHigher ? `${diff}% worse than benchmark` : `${diff}% better than benchmark`;
  }
};

export default PerformanceMetrics;
```

### 5. Export Manager

The Export Manager enables users to export reports in various formats, schedule recurring reports, and distribute reports via email.

#### Implementation Details

```jsx
// ExportManager.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  exportReportToPDF, 
  exportReportToExcel, 
  exportReportToCSV,
  scheduleReport
} from '../services/exportService';
import { fetchUserEmails } from '../services/userService';
import './ExportManager.css';

const ExportManager = ({ reportId, reportName, reportConfig, reportData }) => {
  const { currentUser } = useAuth();
  const [exportFormat, setExportFormat] = useState('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    frequency: 'weekly',
    dayOfWeek: 1, // Monday
    dayOfMonth: 1,
    time: '08:00',
    recipients: [],
    emailSubject: `${reportName} Report`,
    emailBody: `Please find attached the ${reportName} report.`,
    fileFormat: 'pdf'
  });
  const [availableRecipients, setAvailableRecipients] = useState([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  const handleExportFormatChange = (e) => {
    setExportFormat(e.target.value);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      
      let result;
      switch (exportFormat) {
        case 'pdf':
          result = await exportReportToPDF({
            reportId,
            reportName,
            reportConfig,
            reportData,
            userId: currentUser.id
          });
          break;
        case 'excel':
          result = await exportReportToExcel({
            reportId,
            reportName,
            reportConfig,
            reportData,
            userId: currentUser.id
          });
          break;
        case 'csv':
          result = await exportReportToCSV({
            reportId,
            reportName,
            reportConfig,
            reportData,
            userId: currentUser.id
          });
          break;
        default:
          throw new Error('Invalid export format');
      }
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([result]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportName}.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setExportError(`Failed to export report: ${err.message}`);
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleScheduleForm = async () => {
    const newState = !showScheduleForm;
    setShowScheduleForm(newState);
    
    if (newState && availableRecipients.length === 0) {
      try {
        setIsLoadingRecipients(true);
        const emails = await fetchUserEmails(currentUser.id);
        setAvailableRecipients(emails);
      } catch (err) {
        console.error('Failed to load recipients:', err);
      } finally {
        setIsLoadingRecipients(false);
      }
    }
  };

  const handleScheduleConfigChange = (e) => {
    const { name, value } = e.target;
    setScheduleConfig({
      ...scheduleConfig,
      [name]: value
    });
  };

  const handleRecipientChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setScheduleConfig({
      ...scheduleConfig,
      recipients: selectedOptions
    });
  };

  const handleScheduleReport = async () => {
    if (scheduleConfig.recipients.length === 0) {
      setExportError('Please select at least one recipient');
      return;
    }
    
    try {
      setIsScheduling(true);
      setExportError(null);
      
      await scheduleReport({
        reportId,
        reportName,
        reportConfig,
        scheduleConfig,
        userId: currentUser.id
      });
      
      setScheduleSuccess(true);
      setTimeout(() => {
        setScheduleSuccess(false);
        setShowScheduleForm(false);
      }, 3000);
    } catch (err) {
      setExportError(`Failed to schedule report: ${err.message}`);
      console.error(err);
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="export-manager">
      <div className="export-section">
        <h3>Export Report</h3>
        
        {exportError && <div className="error-message">{exportError}</div>}
        
        <div className="export-options">
          <div className="format-selector">
            <label htmlFor="export-format">Format:</label>
            <select
              id="export-format"
              value={exportFormat}
              onChange={handleExportFormatChange}
              disabled={isExporting}
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          
          <button 
            className="export-button"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
          </button>
        </div>
      </div>
      
      <div className="schedule-section">
        <div className="schedule-header">
          <h3>Schedule Report</h3>
          <button 
            className="toggle-schedule-button"
            onClick={toggleScheduleForm}
          >
            {showScheduleForm ? 'Cancel' : 'Schedule'}
          </button>
        </div>
        
        {showScheduleForm && (
          <div className="schedule-form">
            {scheduleSuccess && (
              <div className="success-message">Report scheduled successfully!</div>
            )}
            
            <div className="form-group">
              <label htmlFor="frequency">Frequency</label>
              <select
                id="frequency"
                name="frequency"
                value={scheduleConfig.frequency}
                onChange={handleScheduleConfigChange}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            
            {scheduleConfig.frequency === 'weekly' && (
              <div className="form-group">
                <label htmlFor="dayOfWeek">Day of Week</label>
                <select
                  id="dayOfWeek"
                  name="dayOfWeek"
                  value={scheduleConfig.dayOfWeek}
                  onChange={handleScheduleConfigChange}
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={0}>Sunday</option>
                </select>
              </div>
            )}
            
            {scheduleConfig.frequency === 'monthly' && (
              <div className="form-group">
                <label htmlFor="dayOfMonth">Day of Month</label>
                <select
                  id="dayOfMonth"
                  name="dayOfMonth"
                  value={scheduleConfig.dayOfMonth}
                  onChange={handleScheduleConfigChange}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="time">Time</label>
              <input
                type="time"
                id="time"
                name="time"
                value={scheduleConfig.time}
                onChange={handleScheduleConfigChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="fileFormat">File Format</label>
              <select
                id="fileFormat"
                name="fileFormat"
                value={scheduleConfig.fileFormat}
                onChange={handleScheduleConfigChange}
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="recipients">Recipients</label>
              {isLoadingRecipients ? (
                <div className="loading-spinner">Loading recipients...</div>
              ) : (
                <select
                  id="recipients"
                  name="recipients"
                  multiple
                  value={scheduleConfig.recipients}
                  onChange={handleRecipientChange}
                  className="recipients-select"
                >
                  {availableRecipients.map(recipient => (
                    <option key={recipient.id} value={recipient.email}>
                      {recipient.name} ({recipient.email})
                    </option>
                  ))}
                </select>
              )}
              <p className="help-text">Hold Ctrl (or Cmd) to select multiple recipients</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="emailSubject">Email Subject</label>
              <input
                type="text"
                id="emailSubject"
                name="emailSubject"
                value={scheduleConfig.emailSubject}
                onChange={handleScheduleConfigChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="emailBody">Email Body</label>
              <textarea
                id="emailBody"
                name="emailBody"
                value={scheduleConfig.emailBody}
                onChange={handleScheduleConfigChange}
                rows={3}
              />
            </div>
            
            <div className="form-actions">
              <button 
                className="schedule-button"
                onClick={handleScheduleReport}
                disabled={isScheduling}
              >
                {isScheduling ? 'Scheduling...' : 'Schedule Report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportManager;
```

## API Services

The Reporting and Analytics component communicates with the backend through the following services:

### Dashboard Service

```javascript
// dashboardService.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/dashboards`;

export const fetchDashboardData = async (params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/data`, {
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
};

export const fetchDashboardConfigurations = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/configurations`, {
      params: { userId },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard configurations:', error);
    throw error;
  }
};

export const saveDashboardConfiguration = async (configData) => {
  try {
    const response = await axios.post(`${API_URL}/configurations`, configData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error saving dashboard configuration:', error);
    throw error;
  }
};

export const updateDashboardConfiguration = async (configId, configData) => {
  try {
    const response = await axios.put(`${API_URL}/configurations/${configId}`, configData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating dashboard configuration:', error);
    throw error;
  }
};

export const deleteDashboardConfiguration = async (configId) => {
  try {
    const response = await axios.delete(`${API_URL}/configurations/${configId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting dashboard configuration:', error);
    throw error;
  }
};
```

### Report Service

```javascript
// reportService.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/reports`;

export const fetchReportSources = async (userRole) => {
  try {
    const response = await axios.get(`${API_URL}/sources`, {
      params: { userRole },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching report sources:', error);
    throw error;
  }
};

export const fetchReportColumns = async (sourceId) => {
  try {
    const response = await axios.get(`${API_URL}/sources/${sourceId}/columns`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching report columns:', error);
    throw error;
  }
};

export const generateReport = async (reportParams) => {
  try {
    const response = await axios.post(`${API_URL}/generate`, reportParams, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
};

export const saveReportTemplate = async (templateData) => {
  try {
    const response = await axios.post(`${API_URL}/templates`, templateData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error saving report template:', error);
    throw error;
  }
};

export const fetchReportTemplates = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/templates`, {
      params: { userId },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching report templates:', error);
    throw error;
  }
};

export const fetchStandardReports = async (userRole) => {
  try {
    const response = await axios.get(`${API_URL}/standard`, {
      params: { userRole },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching standard reports:', error);
    throw error;
  }
};

export const generateStandardReport = async (reportParams) => {
  try {
    const response = await axios.post(`${API_URL}/standard/generate`, reportParams, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error generating standard report:', error);
    throw error;
  }
};
```

### Analytics Service

```javascript
// analyticsService.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/analytics`;

export const fetchAvailableMetrics = async (userRole) => {
  try {
    const response = await axios.get(`${API_URL}/metrics`, {
      params: { userRole },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching available metrics:', error);
    throw error;
  }
};

export const fetchTrendData = async (params) => {
  try {
    const response = await axios.get(`${API_URL}/trends`, {
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching trend data:', error);
    throw error;
  }
};

export const fetchPredictions = async (params) => {
  try {
    const response = await axios.post(`${API_URL}/predictions`, params, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching predictions:', error);
    throw error;
  }
};

export const fetchPerformanceMetrics = async (params) => {
  try {
    const response = await axios.get(`${API_URL}/performance`, {
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    throw error;
  }
};

export const fetchBenchmarkData = async (params) => {
  try {
    const response = await axios.get(`${API_URL}/benchmarks`, {
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching benchmark data:', error);
    throw error;
  }
};

export const detectAnomalies = async (params) => {
  try {
    const response = await axios.post(`${API_URL}/anomalies`, params, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    throw error;
  }
};
```

### Export Service

```javascript
// exportService.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/exports`;

export const exportReportToPDF = async (exportParams) => {
  try {
    const response = await axios.post(`${API_URL}/pdf`, exportParams, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting report to PDF:', error);
    throw error;
  }
};

export const exportReportToExcel = async (exportParams) => {
  try {
    const response = await axios.post(`${API_URL}/excel`, exportParams, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting report to Excel:', error);
    throw error;
  }
};

export const exportReportToCSV = async (exportParams) => {
  try {
    const response = await axios.post(`${API_URL}/csv`, exportParams, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting report to CSV:', error);
    throw error;
  }
};

export const scheduleReport = async (scheduleParams) => {
  try {
    const response = await axios.post(`${API_URL}/schedule`, scheduleParams, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error scheduling report:', error);
    throw error;
  }
};

export const fetchScheduledReports = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/schedule`, {
      params: { userId },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    throw error;
  }
};

export const updateScheduledReport = async (scheduleId, scheduleParams) => {
  try {
    const response = await axios.put(`${API_URL}/schedule/${scheduleId}`, scheduleParams, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating scheduled report:', error);
    throw error;
  }
};

export const deleteScheduledReport = async (scheduleId) => {
  try {
    const response = await axios.delete(`${API_URL}/schedule/${scheduleId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting scheduled report:', error);
    throw error;
  }
};
```

## Database Schema Updates

To support the Reporting and Analytics component, the following database tables need to be created or updated:

```sql
-- Dashboard Configurations Table
CREATE TABLE dashboard_configurations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(200) NOT NULL,
  dashboard_type VARCHAR(50) NOT NULL,
  configuration JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Report Templates Table
CREATE TABLE report_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  source_id VARCHAR(50) NOT NULL,
  configuration JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled Reports Table
CREATE TABLE scheduled_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  report_template_id INTEGER REFERENCES report_templates(id),
  name VARCHAR(200) NOT NULL,
  frequency VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
  day_of_week INTEGER, -- 0-6, where 0 is Sunday
  day_of_month INTEGER, -- 1-31
  time TIME NOT NULL,
  file_format VARCHAR(10) NOT NULL, -- 'pdf', 'excel', 'csv'
  recipients JSONB NOT NULL,
  email_subject VARCHAR(200),
  email_body TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Report Execution History Table
CREATE TABLE report_execution_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  report_template_id INTEGER REFERENCES report_templates(id),
  scheduled_report_id INTEGER REFERENCES scheduled_reports(id),
  report_name VARCHAR(200) NOT NULL,
  execution_type VARCHAR(50) NOT NULL, -- 'manual', 'scheduled'
  status VARCHAR(50) NOT NULL, -- 'success', 'failed'
  error_message TEXT,
  execution_time INTEGER, -- in milliseconds
  row_count INTEGER,
  file_format VARCHAR(10),
  file_size INTEGER,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analytics Metrics Table
CREATE TABLE analytics_metrics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  is_percentage BOOLEAN DEFAULT FALSE,
  is_currency BOOLEAN DEFAULT FALSE,
  higher_is_better BOOLEAN DEFAULT TRUE,
  benchmark_value DECIMAL(12, 2),
  benchmark_source VARCHAR(200),
  available_for_roles JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analytics Data Table
CREATE TABLE analytics_data (
  id SERIAL PRIMARY KEY,
  metric_id INTEGER REFERENCES analytics_metrics(id),
  property_id INTEGER REFERENCES properties(id),
  date DATE NOT NULL,
  value DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_id, property_id, date)
);

-- Performance Scores Table
CREATE TABLE performance_scores (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id),
  category VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL, -- 0-100
  benchmark INTEGER,
  date DATE NOT NULL,
  metrics_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(property_id, category, date)
);

-- Anomaly Detection Table
CREATE TABLE anomaly_detections (
  id SERIAL PRIMARY KEY,
  metric_id INTEGER REFERENCES analytics_metrics(id),
  property_id INTEGER REFERENCES properties(id),
  date DATE NOT NULL,
  expected_value DECIMAL(12, 2) NOT NULL,
  actual_value DECIMAL(12, 2) NOT NULL,
  deviation_percentage DECIMAL(12, 2) NOT NULL,
  severity VARCHAR(50) NOT NULL, -- 'low', 'medium', 'high'
  is_reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Testing Strategy

The Reporting and Analytics component will be tested using the following approach:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions and API service calls
3. **Data Visualization Tests**: Test chart rendering and data presentation
4. **End-to-End Tests**: Test complete user flows

### Example Unit Test

```javascript
// ReportBuilder.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportBuilder from './ReportBuilder';
import { useAuth } from '../contexts/AuthContext';
import { 
  fetchReportSources, 
  fetchReportColumns, 
  generateReport,
  saveReportTemplate
} from '../services/reportService';

// Mock the hooks and services
jest.mock('../contexts/AuthContext');
jest.mock('../services/reportService');

describe('ReportBuilder Component', () => {
  const mockCurrentUser = { id: 'user-1', role: 'property_manager' };
  
  const mockReportSources = [
    { id: 'source-1', name: 'Properties' },
    { id: 'source-2', name: 'Tenants' },
    { id: 'source-3', name: 'Financials' }
  ];
  
  const mockColumns = [
    { 
      id: 'col-1', 
      label: 'Property Name', 
      description: 'Name of the property', 
      dataType: 'string' 
    },
    { 
      id: 'col-2', 
      label: 'Address', 
      description: 'Property address', 
      dataType: 'string' 
    },
    { 
      id: 'col-3', 
      label: 'Units', 
      description: 'Number of units', 
      dataType: 'number' 
    },
    { 
      id: 'col-4', 
      label: 'Occupancy Rate', 
      description: 'Current occupancy rate', 
      dataType: 'percentage' 
    }
  ];
  
  const mockReportData = {
    columns: [
      { id: 'col-1', label: 'Property Name' },
      { id: 'col-3', label: 'Units' },
      { id: 'col-4', label: 'Occupancy Rate' }
    ],
    data: [
      { 'col-1': 'Sunset Apartments', 'col-3': 24, 'col-4': 87.5 },
      { 'col-1': 'Riverfront Condos', 'col-3': 12, 'col-4': 100 },
      { 'col-1': 'Mountain View Homes', 'col-3': 8, 'col-4': 75 }
    ]
  };

  beforeEach(() => {
    useAuth.mockReturnValue({ currentUser: mockCurrentUser });
    fetchReportSources.mockResolvedValue(mockReportSources);
    fetchReportColumns.mockResolvedValue(mockColumns);
    generateReport.mockResolvedValue(mockReportData);
    saveReportTemplate.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    render(<ReportBuilder />);
    expect(screen.getByText('Loading report sources...')).toBeInTheDocument();
  });

  test('loads report sources and selects the first one by default', async () => {
    render(<ReportBuilder />);
    
    await waitFor(() => {
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Tenants')).toBeInTheDocument();
    expect(screen.getByText('Financials')).toBeInTheDocument();
    expect(fetchReportColumns).toHaveBeenCalledWith('source-1');
  });

  test('displays available columns for the selected source', async () => {
    render(<ReportBuilder />);
    
    await waitFor(() => {
      expect(screen.getByText('Property Name')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Units')).toBeInTheDocument();
    expect(screen.getByText('Occupancy Rate')).toBeInTheDocument();
  });

  test('allows selecting columns for the report', async () => {
    render(<ReportBuilder />);
    
    await waitFor(() => {
      expect(screen.getByText('Property Name')).toBeInTheDocument();
    });
    
    // Select some columns
    fireEvent.click(screen.getByText('Property Name'));
    fireEvent.click(screen.getByText('Units'));
    fireEvent.click(screen.getByText('Occupancy Rate'));
    
    expect(screen.getByText('3 of 4 columns selected')).toBeInTheDocument();
  });

  test('generates a report when the Generate button is clicked', async () => {
    render(<ReportBuilder />);
    
    await waitFor(() => {
      expect(screen.getByText('Property Name')).toBeInTheDocument();
    });
    
    // Select some columns
    fireEvent.click(screen.getByText('Property Name'));
    fireEvent.click(screen.getByText('Units'));
    fireEvent.click(screen.getByText('Occupancy Rate'));
    
    // Click the Generate button
    fireEvent.click(screen.getByText('Generate Report'));
    
    await waitFor(() => {
      expect(generateReport).toHaveBeenCalledWith(expect.objectContaining({
        sourceId: 'source-1',
        config: expect.objectContaining({
          columns: ['col-1', 'col-3', 'col-4']
        }),
        userId: 'user-1'
      }));
    });
    
    // Should switch to preview mode
    expect(screen.getByText('Report Preview')).toBeInTheDocument();
    expect(screen.getByText('Back to Edit')).toBeInTheDocument();
  });

  test('saves a report template when the Save as Template button is clicked', async () => {
    render(<ReportBuilder />);
    
    await waitFor(() => {
      expect(screen.getByText('Property Name')).toBeInTheDocument();
    });
    
    // Select some columns
    fireEvent.click(screen.getByText('Property Name'));
    fireEvent.click(screen.getByText('Units'));
    fireEvent.click(screen.getByText('Occupancy Rate'));
    
    // Click the Save as Template button
    fireEvent.click(screen.getByText('Save as Template'));
    
    await waitFor(() => {
      expect(saveReportTemplate).toHaveBeenCalledWith(expect.objectContaining({
        sourceId: 'source-1',
        config: expect.objectContaining({
          name: 'New Report',
          columns: ['col-1', 'col-3', 'col-4']
        }),
        userId: 'user-1'
      }));
    });
    
    // Should show success message
    expect(screen.getByText('Report template saved successfully!')).toBeInTheDocument();
  });

  test('allows changing the report source', async () => {
    render(<ReportBuilder />);
    
    await waitFor(() => {
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });
    
    // Change the source to Tenants
    fireEvent.change(screen.getByLabelText('Data Source'), { target: { value: 'source-2' } });
    
    expect(fetchReportColumns).toHaveBeenCalledWith('source-2');
  });

  test('returns to edit mode from preview mode', async () => {
    render(<ReportBuilder />);
    
    await waitFor(() => {
      expect(screen.getByText('Property Name')).toBeInTheDocument();
    });
    
    // Select some columns
    fireEvent.click(screen.getByText('Property Name'));
    fireEvent.click(screen.getByText('Units'));
    fireEvent.click(screen.getByText('Occupancy Rate'));
    
    // Click the Generate button
    fireEvent.click(screen.getByText('Generate Report'));
    
    await waitFor(() => {
      expect(screen.getByText('Report Preview')).toBeInTheDocument();
    });
    
    // Click the Back to Edit button
    fireEvent.click(screen.getByText('Back to Edit'));
    
    expect(screen.getByText('Custom Report Builder')).toBeInTheDocument();
  });
});
```

## Deployment Considerations

When deploying the Reporting and Analytics component, consider the following:

1. **Performance Optimization**:
   - Implement caching for frequently accessed reports and dashboards
   - Use pagination for large datasets
   - Optimize database queries with proper indexing
   - Consider using materialized views for complex reports

2. **Scalability**:
   - Design the system to handle a large number of concurrent report generations
   - Implement background processing for long-running reports
   - Consider using a job queue for scheduled reports

3. **Security Measures**:
   - Implement proper authorization for report access
   - Validate all user inputs to prevent SQL injection
   - Encrypt sensitive data in reports
   - Implement audit logging for report access and generation

4. **Data Integrity**:
   - Ensure consistent data across all reports
   - Implement data validation before report generation
   - Provide clear error messages for data issues

5. **Export Functionality**:
   - Use appropriate libraries for generating PDF, Excel, and CSV files
   - Implement proper formatting for different export formats
   - Handle large exports efficiently

## Integration Points

The Reporting and Analytics component integrates with the following components:

1. **Tenant Interface**: Provides tenant-specific reports and dashboards
2. **Property Management Interface**: Enables property managers to access comprehensive reports and analytics
3. **Financial Management**: Provides financial data for reports and dashboards
4. **Maintenance Management**: Supplies maintenance data for performance metrics
5. **Integration Framework**: Connects with external reporting tools and data sources
6. **AI Enhancement Layer**: Utilizes AI for predictive analytics and anomaly detection

## Next Steps

After implementing the Reporting and Analytics component, the following steps should be taken:

1. Conduct user testing with property managers, owners, and tenants
2. Gather feedback and make improvements to the reports and dashboards
3. Implement additional report templates based on user needs
4. Enhance the predictive analytics capabilities
5. Integrate with external business intelligence tools

## Handoff Document Updates

To add this component to the handoff document:

1. Copy this entire design document to the handoff document under a new section titled "Reporting and Analytics Component"
2. Update the implementation status in the handoff document
3. Add links to the relevant code files in the GitHub repository
4. Update the component dependencies diagram to show the Reporting and Analytics connections
