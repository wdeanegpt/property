# Property Management Interface Design Document

## Overview

The Property Management Interface is a critical component of the Comprehensive Property Management System, providing property managers and landlords with tools to efficiently manage properties, units, tenants, and operations. This document outlines the architecture, features, and implementation details for the Property Management Interface component.

## Architecture

The Property Management Interface follows a modular architecture with the following layers:

1. **Presentation Layer**: React components for the user interface
2. **State Management Layer**: Context API and Redux for complex state management
3. **Service Layer**: API services for data fetching and manipulation
4. **Authentication Layer**: Role-based access control for property managers and landlords

### Component Hierarchy

```
PropertyManagementPortal
├── DashboardView
│   ├── PropertyOverviewWidget
│   ├── OccupancyRateWidget
│   ├── MaintenanceStatusWidget
│   ├── FinancialSummaryWidget
│   └── RecentActivityFeed
├── PropertiesView
│   ├── PropertyList
│   ├── PropertyDetails
│   ├── UnitManager
│   ├── PropertyDocuments
│   └── PropertyAnalytics
├── TenantsView
│   ├── TenantDirectory
│   ├── TenantDetails
│   ├── LeaseManager
│   ├── ApplicantTracker
│   └── TenantCommunication
├── MaintenanceView
│   ├── MaintenanceRequestList
│   ├── WorkOrderManager
│   ├── VendorDirectory
│   ├── PreventiveMaintenanceScheduler
│   └── MaintenanceReporting
├── FinancialView
│   ├── RentCollectionDashboard
│   ├── ExpenseTracker
│   ├── BudgetPlanner
│   ├── FinancialReporting
│   └── TaxDocuments
└── SettingsView
    ├── UserProfile
    ├── StaffManagement
    ├── NotificationSettings
    ├── SystemConfiguration
    └── IntegrationSettings
```

## Core Features

### 1. Property Dashboard

The dashboard provides an overview of all properties under management, including:

- Property occupancy rates and vacancy status
- Rent collection status and financial health
- Maintenance request summary
- Recent activity across all properties
- Key performance indicators

#### Implementation Details

```jsx
// PropertyDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchPropertyManagerDashboard } from '../services/propertyService';
import PropertyOverviewWidget from './PropertyOverviewWidget';
import OccupancyRateWidget from './OccupancyRateWidget';
import MaintenanceStatusWidget from './MaintenanceStatusWidget';
import FinancialSummaryWidget from './FinancialSummaryWidget';
import RecentActivityFeed from './RecentActivityFeed';
import './PropertyDashboard.css';

const PropertyDashboard = () => {
  const { currentUser } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('month'); // 'week', 'month', 'quarter', 'year'

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const data = await fetchPropertyManagerDashboard(currentUser.id, dateRange);
        setDashboardData(data);
      } catch (err) {
        setError('Failed to load dashboard information');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [currentUser.id, dateRange]);

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  if (loading) return <div className="loading-spinner">Loading dashboard...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="property-dashboard">
      <div className="dashboard-header">
        <h1>Property Management Dashboard</h1>
        <div className="date-range-selector">
          <button 
            className={dateRange === 'week' ? 'active' : ''} 
            onClick={() => handleDateRangeChange('week')}
          >
            Week
          </button>
          <button 
            className={dateRange === 'month' ? 'active' : ''} 
            onClick={() => handleDateRangeChange('month')}
          >
            Month
          </button>
          <button 
            className={dateRange === 'quarter' ? 'active' : ''} 
            onClick={() => handleDateRangeChange('quarter')}
          >
            Quarter
          </button>
          <button 
            className={dateRange === 'year' ? 'active' : ''} 
            onClick={() => handleDateRangeChange('year')}
          >
            Year
          </button>
        </div>
      </div>
      
      <div className="dashboard-summary">
        <div className="summary-card">
          <h3>Total Properties</h3>
          <div className="summary-value">{dashboardData.propertyCount}</div>
        </div>
        <div className="summary-card">
          <h3>Total Units</h3>
          <div className="summary-value">{dashboardData.unitCount}</div>
        </div>
        <div className="summary-card">
          <h3>Occupancy Rate</h3>
          <div className="summary-value">{dashboardData.occupancyRate}%</div>
        </div>
        <div className="summary-card">
          <h3>Rent Collection</h3>
          <div className="summary-value">${dashboardData.rentCollected.toLocaleString()}</div>
        </div>
      </div>
      
      <div className="dashboard-grid">
        <PropertyOverviewWidget properties={dashboardData.properties} />
        <OccupancyRateWidget occupancyData={dashboardData.occupancyData} />
        <MaintenanceStatusWidget maintenanceData={dashboardData.maintenanceData} />
        <FinancialSummaryWidget financialData={dashboardData.financialData} />
      </div>
      
      <div className="dashboard-activity">
        <h2>Recent Activity</h2>
        <RecentActivityFeed activities={dashboardData.recentActivities} />
      </div>
    </div>
  );
};

export default PropertyDashboard;
```

### 2. Property and Unit Management

The property management system allows property managers to:

- Add, edit, and archive properties
- Manage units within properties
- Track amenities and features
- Monitor compliance with housing regulations
- Manage property documents and images

#### Implementation Details

```jsx
// PropertyList.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchProperties, archiveProperty } from '../services/propertyService';
import PropertyCard from './PropertyCard';
import PropertyFilter from './PropertyFilter';
import AddPropertyModal from './AddPropertyModal';
import './PropertyList.css';

const PropertyList = () => {
  const { currentUser } = useAuth();
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filters, setFilters] = useState({
    searchTerm: '',
    propertyType: 'all',
    status: 'active'
  });

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);
        const data = await fetchProperties(currentUser.id);
        setProperties(data);
        setFilteredProperties(data);
      } catch (err) {
        setError('Failed to load properties');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, [currentUser.id]);

  useEffect(() => {
    // Apply filters
    let result = [...properties];
    
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(property => 
        property.name.toLowerCase().includes(term) || 
        property.address.toLowerCase().includes(term)
      );
    }
    
    if (filters.propertyType !== 'all') {
      result = result.filter(property => property.type === filters.propertyType);
    }
    
    if (filters.status !== 'all') {
      result = result.filter(property => property.status === filters.status);
    }
    
    setFilteredProperties(result);
  }, [filters, properties]);

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };

  const handleAddProperty = (newProperty) => {
    setProperties([...properties, newProperty]);
    setShowAddModal(false);
  };

  const handleArchiveProperty = async (propertyId) => {
    try {
      await archiveProperty(propertyId);
      
      // Update local state
      const updatedProperties = properties.map(property => 
        property.id === propertyId 
          ? { ...property, status: 'archived' } 
          : property
      );
      
      setProperties(updatedProperties);
    } catch (err) {
      setError('Failed to archive property');
      console.error(err);
    }
  };

  if (loading) return <div className="loading-spinner">Loading properties...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="property-list-container">
      <div className="property-list-header">
        <h1>Properties</h1>
        <button 
          className="add-property-button"
          onClick={() => setShowAddModal(true)}
        >
          Add Property
        </button>
      </div>
      
      <PropertyFilter 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />
      
      {filteredProperties.length === 0 ? (
        <div className="no-properties">
          <p>No properties found matching your criteria.</p>
        </div>
      ) : (
        <div className="property-grid">
          {filteredProperties.map(property => (
            <PropertyCard 
              key={property.id} 
              property={property} 
              onArchive={handleArchiveProperty}
            />
          ))}
        </div>
      )}
      
      {showAddModal && (
        <AddPropertyModal 
          onAdd={handleAddProperty} 
          onClose={() => setShowAddModal(false)} 
        />
      )}
    </div>
  );
};

export default PropertyList;
```

```jsx
// UnitManager.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPropertyUnits, addUnit, updateUnit } from '../services/unitService';
import UnitList from './UnitList';
import UnitForm from './UnitForm';
import './UnitManager.css';

const UnitManager = () => {
  const { propertyId } = useParams();
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUnits = async () => {
      try {
        setLoading(true);
        const data = await fetchPropertyUnits(propertyId);
        setUnits(data);
      } catch (err) {
        setError('Failed to load units');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadUnits();
  }, [propertyId]);

  const handleAddUnit = async (unitData) => {
    try {
      const newUnit = await addUnit({
        ...unitData,
        propertyId
      });
      
      setUnits([...units, newUnit]);
      setIsAddingUnit(false);
    } catch (err) {
      setError('Failed to add unit');
      console.error(err);
    }
  };

  const handleUpdateUnit = async (unitData) => {
    try {
      const updatedUnit = await updateUnit(unitData.id, unitData);
      
      // Update local state
      const updatedUnits = units.map(unit => 
        unit.id === updatedUnit.id ? updatedUnit : unit
      );
      
      setUnits(updatedUnits);
      setSelectedUnit(null);
    } catch (err) {
      setError('Failed to update unit');
      console.error(err);
    }
  };

  const handleSelectUnit = (unit) => {
    setSelectedUnit(unit);
    setIsAddingUnit(false);
  };

  const handleCancelForm = () => {
    setSelectedUnit(null);
    setIsAddingUnit(false);
  };

  if (loading) return <div className="loading-spinner">Loading units...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="unit-manager">
      <div className="unit-manager-header">
        <h1>Unit Management</h1>
        <button 
          className="add-unit-button"
          onClick={() => {
            setIsAddingUnit(true);
            setSelectedUnit(null);
          }}
        >
          Add Unit
        </button>
      </div>
      
      <div className="unit-manager-content">
        <div className="unit-list-container">
          <UnitList 
            units={units} 
            onSelectUnit={handleSelectUnit}
            selectedUnitId={selectedUnit?.id}
          />
        </div>
        
        <div className="unit-form-container">
          {isAddingUnit ? (
            <>
              <h2>Add New Unit</h2>
              <UnitForm 
                onSubmit={handleAddUnit}
                onCancel={handleCancelForm}
              />
            </>
          ) : selectedUnit ? (
            <>
              <h2>Edit Unit</h2>
              <UnitForm 
                unit={selectedUnit}
                onSubmit={handleUpdateUnit}
                onCancel={handleCancelForm}
              />
            </>
          ) : (
            <div className="no-unit-selected">
              <p>Select a unit to edit or add a new unit.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnitManager;
```

### 3. Tenant and Lease Management

The tenant management system enables property managers to:

- Track tenant information and history
- Manage lease agreements and renewals
- Process tenant applications and screening
- Handle move-in and move-out procedures
- Communicate with tenants

#### Implementation Details

```jsx
// TenantDirectory.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTenants } from '../services/tenantService';
import TenantFilter from './TenantFilter';
import './TenantDirectory.css';

const TenantDirectory = () => {
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: '',
    propertyId: 'all',
    status: 'active'
  });

  useEffect(() => {
    const loadTenants = async () => {
      try {
        setLoading(true);
        const data = await fetchTenants();
        setTenants(data);
        setFilteredTenants(data);
      } catch (err) {
        setError('Failed to load tenants');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadTenants();
  }, []);

  useEffect(() => {
    // Apply filters
    let result = [...tenants];
    
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(tenant => 
        tenant.firstName.toLowerCase().includes(term) || 
        tenant.lastName.toLowerCase().includes(term) ||
        tenant.email.toLowerCase().includes(term)
      );
    }
    
    if (filters.propertyId !== 'all') {
      result = result.filter(tenant => tenant.propertyId === filters.propertyId);
    }
    
    if (filters.status !== 'all') {
      result = result.filter(tenant => tenant.status === filters.status);
    }
    
    setFilteredTenants(result);
  }, [filters, tenants]);

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };

  if (loading) return <div className="loading-spinner">Loading tenants...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="tenant-directory">
      <div className="tenant-directory-header">
        <h1>Tenant Directory</h1>
        <Link to="/tenants/applicants" className="view-applicants-button">
          View Applicants
        </Link>
      </div>
      
      <TenantFilter 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />
      
      {filteredTenants.length === 0 ? (
        <div className="no-tenants">
          <p>No tenants found matching your criteria.</p>
        </div>
      ) : (
        <div className="tenant-table-container">
          <table className="tenant-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Property</th>
                <th>Unit</th>
                <th>Lease End</th>
                <th>Rent</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map(tenant => (
                <tr key={tenant.id}>
                  <td>
                    <Link to={`/tenants/${tenant.id}`} className="tenant-name-link">
                      {tenant.firstName} {tenant.lastName}
                    </Link>
                  </td>
                  <td>{tenant.propertyName}</td>
                  <td>{tenant.unitNumber}</td>
                  <td>{new Date(tenant.leaseEndDate).toLocaleDateString()}</td>
                  <td>${tenant.rentAmount}</td>
                  <td>
                    <span className={`status-badge status-${tenant.status}`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <Link to={`/tenants/${tenant.id}`} className="view-button">
                        View
                      </Link>
                      <Link to={`/tenants/${tenant.id}/lease`} className="lease-button">
                        Lease
                      </Link>
                      <Link to={`/tenants/${tenant.id}/message`} className="message-button">
                        Message
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TenantDirectory;
```

```jsx
// LeaseManager.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTenantLease, updateLease, renewLease, terminateLease } from '../services/leaseService';
import LeaseForm from './LeaseForm';
import LeaseRenewalForm from './LeaseRenewalForm';
import LeaseTerminationForm from './LeaseTerminationForm';
import './LeaseManager.css';

const LeaseManager = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [lease, setLease] = useState(null);
  const [mode, setMode] = useState('view'); // 'view', 'edit', 'renew', 'terminate'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const loadLease = async () => {
      try {
        setLoading(true);
        const data = await fetchTenantLease(tenantId);
        setLease(data);
      } catch (err) {
        setError('Failed to load lease information');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadLease();
  }, [tenantId]);

  const handleUpdateLease = async (leaseData) => {
    try {
      const updatedLease = await updateLease(lease.id, leaseData);
      setLease(updatedLease);
      setMode('view');
      setSuccess('Lease updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update lease');
      console.error(err);
    }
  };

  const handleRenewLease = async (renewalData) => {
    try {
      const renewedLease = await renewLease(lease.id, renewalData);
      setLease(renewedLease);
      setMode('view');
      setSuccess('Lease renewed successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to renew lease');
      console.error(err);
    }
  };

  const handleTerminateLease = async (terminationData) => {
    try {
      await terminateLease(lease.id, terminationData);
      navigate('/tenants');
      // We navigate away, so no need to update local state
    } catch (err) {
      setError('Failed to terminate lease');
      console.error(err);
    }
  };

  if (loading) return <div className="loading-spinner">Loading lease information...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="lease-manager">
      <div className="lease-manager-header">
        <h1>Lease Management</h1>
        <div className="tenant-info">
          <h2>{lease.tenantName}</h2>
          <p>{lease.propertyName} - Unit {lease.unitNumber}</p>
        </div>
      </div>
      
      {success && <div className="success-message">{success}</div>}
      
      {mode === 'view' && (
        <>
          <div className="lease-details">
            <div className="lease-info-section">
              <h3>Lease Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Start Date:</span>
                  <span className="value">{new Date(lease.startDate).toLocaleDateString()}</span>
                </div>
                <div className="info-item">
                  <span className="label">End Date:</span>
                  <span className="value">{new Date(lease.endDate).toLocaleDateString()}</span>
                </div>
                <div className="info-item">
                  <span className="label">Rent Amount:</span>
                  <span className="value">${lease.rentAmount}</span>
                </div>
                <div className="info-item">
                  <span className="label">Security Deposit:</span>
                  <span className="value">${lease.securityDeposit}</span>
                </div>
                <div className="info-item">
                  <span className="label">Status:</span>
                  <span className={`value status-${lease.status}`}>{lease.status}</span>
                </div>
                <div className="info-item">
                  <span className="label">Payment Due Day:</span>
                  <span className="value">{lease.paymentDueDay}</span>
                </div>
                <div className="info-item">
                  <span className="label">Late Fee:</span>
                  <span className="value">${lease.lateFee}</span>
                </div>
                <div className="info-item">
                  <span className="label">Grace Period:</span>
                  <span className="value">{lease.gracePeriod} days</span>
                </div>
              </div>
            </div>
            
            <div className="lease-terms-section">
              <h3>Lease Terms</h3>
              <div className="terms-content">
                <p>{lease.terms}</p>
              </div>
            </div>
            
            <div className="lease-documents-section">
              <h3>Lease Documents</h3>
              <ul className="document-list">
                {lease.documents.map(doc => (
                  <li key={doc.id} className="document-item">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      {doc.name}
                    </a>
                    <span className="document-date">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="lease-actions">
            <button 
              className="edit-button"
              onClick={() => setMode('edit')}
            >
              Edit Lease
            </button>
            <button 
              className="renew-button"
              onClick={() => setMode('renew')}
            >
              Renew Lease
            </button>
            <button 
              className="terminate-button"
              onClick={() => setMode('terminate')}
            >
              Terminate Lease
            </button>
          </div>
        </>
      )}
      
      {mode === 'edit' && (
        <LeaseForm 
          lease={lease}
          onSubmit={handleUpdateLease}
          onCancel={() => setMode('view')}
        />
      )}
      
      {mode === 'renew' && (
        <LeaseRenewalForm 
          lease={lease}
          onSubmit={handleRenewLease}
          onCancel={() => setMode('view')}
        />
      )}
      
      {mode === 'terminate' && (
        <LeaseTerminationForm 
          lease={lease}
          onSubmit={handleTerminateLease}
          onCancel={() => setMode('view')}
        />
      )}
    </div>
  );
};

export default LeaseManager;
```

### 4. Maintenance Management

The maintenance management system allows property managers to:

- Process and assign maintenance requests
- Create and track work orders
- Manage vendors and contractors
- Schedule preventive maintenance
- Track maintenance costs and history

#### Implementation Details

```jsx
// MaintenanceRequestList.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMaintenanceRequests, updateRequestStatus } from '../services/maintenanceService';
import MaintenanceRequestFilter from './MaintenanceRequestFilter';
import './MaintenanceRequestList.css';

const MaintenanceRequestList = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: '',
    propertyId: 'all',
    status: 'all',
    priority: 'all',
    dateRange: 'all'
  });

  useEffect(() => {
    const loadRequests = async () => {
      try {
        setLoading(true);
        const data = await fetchMaintenanceRequests();
        setRequests(data);
        setFilteredRequests(data);
      } catch (err) {
        setError('Failed to load maintenance requests');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, []);

  useEffect(() => {
    // Apply filters
    let result = [...requests];
    
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(request => 
        request.title.toLowerCase().includes(term) || 
        request.tenantName.toLowerCase().includes(term) ||
        request.description.toLowerCase().includes(term)
      );
    }
    
    if (filters.propertyId !== 'all') {
      result = result.filter(request => request.propertyId === filters.propertyId);
    }
    
    if (filters.status !== 'all') {
      result = result.filter(request => request.status === filters.status);
    }
    
    if (filters.priority !== 'all') {
      result = result.filter(request => request.priority === filters.priority);
    }
    
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        result = result.filter(request => new Date(request.submittedAt) >= startDate);
      }
    }
    
    setFilteredRequests(result);
  }, [filters, requests]);

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      await updateRequestStatus(requestId, newStatus);
      
      // Update local state
      const updatedRequests = requests.map(request => 
        request.id === requestId 
          ? { ...request, status: newStatus } 
          : request
      );
      
      setRequests(updatedRequests);
    } catch (err) {
      setError('Failed to update request status');
      console.error(err);
    }
  };

  if (loading) return <div className="loading-spinner">Loading maintenance requests...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="maintenance-request-list">
      <div className="maintenance-request-header">
        <h1>Maintenance Requests</h1>
        <Link to="/maintenance/work-orders" className="view-work-orders-button">
          View Work Orders
        </Link>
      </div>
      
      <MaintenanceRequestFilter 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />
      
      {filteredRequests.length === 0 ? (
        <div className="no-requests">
          <p>No maintenance requests found matching your criteria.</p>
        </div>
      ) : (
        <div className="request-table-container">
          <table className="request-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Property</th>
                <th>Tenant</th>
                <th>Priority</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(request => (
                <tr key={request.id}>
                  <td>#{request.id}</td>
                  <td>
                    <Link to={`/maintenance/requests/${request.id}`} className="request-title-link">
                      {request.title}
                    </Link>
                  </td>
                  <td>{request.propertyName} - Unit {request.unitNumber}</td>
                  <td>{request.tenantName}</td>
                  <td>
                    <span className={`priority-badge priority-${request.priority}`}>
                      {request.priority}
                    </span>
                  </td>
                  <td>{new Date(request.submittedAt).toLocaleDateString()}</td>
                  <td>
                    <select 
                      className={`status-select status-${request.status}`}
                      value={request.status}
                      onChange={(e) => handleStatusChange(request.id, e.target.value)}
                    >
                      <option value="submitted">Submitted</option>
                      <option value="in-progress">In Progress</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <Link to={`/maintenance/requests/${request.id}`} className="view-button">
                        View
                      </Link>
                      <Link to={`/maintenance/requests/${request.id}/work-order`} className="create-work-order-button">
                        Create Work Order
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MaintenanceRequestList;
```

```jsx
// WorkOrderManager.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWorkOrder, updateWorkOrder, assignWorkOrder } from '../services/workOrderService';
import { fetchVendors } from '../services/vendorService';
import WorkOrderForm from './WorkOrderForm';
import WorkOrderAssignmentForm from './WorkOrderAssignmentForm';
import './WorkOrderManager.css';

const WorkOrderManager = () => {
  const { workOrderId } = useParams();
  const navigate = useNavigate();
  const [workOrder, setWorkOrder] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [mode, setMode] = useState('view'); // 'view', 'edit', 'assign'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [workOrderData, vendorsData] = await Promise.all([
          fetchWorkOrder(workOrderId),
          fetchVendors()
        ]);
        setWorkOrder(workOrderData);
        setVendors(vendorsData);
      } catch (err) {
        setError('Failed to load work order information');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [workOrderId]);

  const handleUpdateWorkOrder = async (workOrderData) => {
    try {
      const updatedWorkOrder = await updateWorkOrder(workOrder.id, workOrderData);
      setWorkOrder(updatedWorkOrder);
      setMode('view');
      setSuccess('Work order updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update work order');
      console.error(err);
    }
  };

  const handleAssignWorkOrder = async (assignmentData) => {
    try {
      const assignedWorkOrder = await assignWorkOrder(workOrder.id, assignmentData);
      setWorkOrder(assignedWorkOrder);
      setMode('view');
      setSuccess('Work order assigned successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to assign work order');
      console.error(err);
    }
  };

  if (loading) return <div className="loading-spinner">Loading work order information...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="work-order-manager">
      <div className="work-order-manager-header">
        <h1>Work Order #{workOrder.id}</h1>
        <div className="property-info">
          <h2>{workOrder.propertyName} - Unit {workOrder.unitNumber}</h2>
          <p>Tenant: {workOrder.tenantName}</p>
        </div>
      </div>
      
      {success && <div className="success-message">{success}</div>}
      
      {mode === 'view' && (
        <>
          <div className="work-order-details">
            <div className="work-order-info-section">
              <h3>Work Order Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Title:</span>
                  <span className="value">{workOrder.title}</span>
                </div>
                <div className="info-item">
                  <span className="label">Priority:</span>
                  <span className={`value priority-${workOrder.priority}`}>{workOrder.priority}</span>
                </div>
                <div className="info-item">
                  <span className="label">Status:</span>
                  <span className={`value status-${workOrder.status}`}>{workOrder.status}</span>
                </div>
                <div className="info-item">
                  <span className="label">Created:</span>
                  <span className="value">{new Date(workOrder.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="info-item">
                  <span className="label">Scheduled:</span>
                  <span className="value">
                    {workOrder.scheduledDate 
                      ? new Date(workOrder.scheduledDate).toLocaleDateString() 
                      : 'Not scheduled'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Completed:</span>
                  <span className="value">
                    {workOrder.completedDate 
                      ? new Date(workOrder.completedDate).toLocaleDateString() 
                      : 'Not completed'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Assigned To:</span>
                  <span className="value">
                    {workOrder.assignedTo 
                      ? workOrder.assignedToName 
                      : 'Not assigned'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Estimated Cost:</span>
                  <span className="value">
                    {workOrder.estimatedCost 
                      ? `$${workOrder.estimatedCost}` 
                      : 'Not estimated'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="work-order-description-section">
              <h3>Description</h3>
              <div className="description-content">
                <p>{workOrder.description}</p>
              </div>
            </div>
            
            <div className="work-order-notes-section">
              <h3>Notes</h3>
              <div className="notes-content">
                <p>{workOrder.notes || 'No notes available.'}</p>
              </div>
            </div>
            
            <div className="work-order-images-section">
              <h3>Images</h3>
              <div className="images-grid">
                {workOrder.images && workOrder.images.length > 0 ? (
                  workOrder.images.map((image, index) => (
                    <div key={index} className="image-item">
                      <img src={image.url} alt={`Work order ${index + 1}`} />
                    </div>
                  ))
                ) : (
                  <p>No images available.</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="work-order-actions">
            <button 
              className="edit-button"
              onClick={() => setMode('edit')}
            >
              Edit Work Order
            </button>
            <button 
              className="assign-button"
              onClick={() => setMode('assign')}
              disabled={workOrder.status === 'completed' || workOrder.status === 'cancelled'}
            >
              Assign Work Order
            </button>
            <button 
              className="complete-button"
              onClick={() => handleUpdateWorkOrder({ ...workOrder, status: 'completed', completedDate: new Date().toISOString() })}
              disabled={workOrder.status === 'completed' || workOrder.status === 'cancelled' || !workOrder.assignedTo}
            >
              Mark as Completed
            </button>
          </div>
        </>
      )}
      
      {mode === 'edit' && (
        <WorkOrderForm 
          workOrder={workOrder}
          onSubmit={handleUpdateWorkOrder}
          onCancel={() => setMode('view')}
        />
      )}
      
      {mode === 'assign' && (
        <WorkOrderAssignmentForm 
          workOrder={workOrder}
          vendors={vendors}
          onSubmit={handleAssignWorkOrder}
          onCancel={() => setMode('view')}
        />
      )}
    </div>
  );
};

export default WorkOrderManager;
```

### 5. Financial Management

The financial management system enables property managers to:

- Track rent collection and payment status
- Manage property expenses and budgets
- Generate financial reports
- Process security deposits and refunds
- Manage late fees and payment plans

#### Implementation Details

```jsx
// RentCollectionDashboard.jsx
import React, { useEffect, useState } from 'react';
import { fetchRentCollectionData } from '../services/financialService';
import RentCollectionSummary from './RentCollectionSummary';
import RentCollectionChart from './RentCollectionChart';
import RentPaymentList from './RentPaymentList';
import './RentCollectionDashboard.css';

const RentCollectionDashboard = () => {
  const [collectionData, setCollectionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    propertyId: 'all',
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });

  useEffect(() => {
    const loadCollectionData = async () => {
      try {
        setLoading(true);
        const data = await fetchRentCollectionData(filters);
        setCollectionData(data);
      } catch (err) {
        setError('Failed to load rent collection data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadCollectionData();
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };

  if (loading) return <div className="loading-spinner">Loading rent collection data...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="rent-collection-dashboard">
      <div className="dashboard-header">
        <h1>Rent Collection Dashboard</h1>
        <div className="filter-controls">
          <div className="filter-group">
            <label htmlFor="property-filter">Property:</label>
            <select 
              id="property-filter"
              value={filters.propertyId}
              onChange={(e) => handleFilterChange({ propertyId: e.target.value })}
            >
              <option value="all">All Properties</option>
              {collectionData.properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="month-filter">Month:</label>
            <select 
              id="month-filter"
              value={filters.month}
              onChange={(e) => handleFilterChange({ month: parseInt(e.target.value) })}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="year-filter">Year:</label>
            <select 
              id="year-filter"
              value={filters.year}
              onChange={(e) => handleFilterChange({ year: parseInt(e.target.value) })}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>
      
      <RentCollectionSummary summary={collectionData.summary} />
      
      <div className="dashboard-content">
        <div className="chart-section">
          <h2>Collection Trends</h2>
          <RentCollectionChart chartData={collectionData.chartData} />
        </div>
        
        <div className="payments-section">
          <h2>Recent Payments</h2>
          <RentPaymentList payments={collectionData.recentPayments} />
        </div>
      </div>
      
      <div className="late-payments-section">
        <h2>Late Payments</h2>
        {collectionData.latePayments.length === 0 ? (
          <div className="no-late-payments">
            <p>No late payments for the selected period.</p>
          </div>
        ) : (
          <table className="late-payments-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Property</th>
                <th>Unit</th>
                <th>Amount Due</th>
                <th>Due Date</th>
                <th>Days Late</th>
                <th>Late Fee</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {collectionData.latePayments.map(payment => (
                <tr key={payment.id}>
                  <td>{payment.tenantName}</td>
                  <td>{payment.propertyName}</td>
                  <td>{payment.unitNumber}</td>
                  <td>${payment.amountDue}</td>
                  <td>{new Date(payment.dueDate).toLocaleDateString()}</td>
                  <td>{payment.daysLate}</td>
                  <td>${payment.lateFee}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="send-reminder-button">
                        Send Reminder
                      </button>
                      <button className="apply-late-fee-button">
                        Apply Late Fee
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default RentCollectionDashboard;
```

```jsx
// ExpenseTracker.jsx
import React, { useEffect, useState } from 'react';
import { fetchExpenses, addExpense, updateExpense, deleteExpense } from '../services/expenseService';
import ExpenseFilter from './ExpenseFilter';
import ExpenseForm from './ExpenseForm';
import ExpenseCategoryChart from './ExpenseCategoryChart';
import './ExpenseTracker.css';

const ExpenseTracker = () => {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filters, setFilters] = useState({
    propertyId: 'all',
    category: 'all',
    startDate: null,
    endDate: null,
    minAmount: '',
    maxAmount: ''
  });

  useEffect(() => {
    const loadExpenses = async () => {
      try {
        setLoading(true);
        const data = await fetchExpenses();
        setExpenses(data);
        setFilteredExpenses(data);
      } catch (err) {
        setError('Failed to load expenses');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadExpenses();
  }, []);

  useEffect(() => {
    // Apply filters
    let result = [...expenses];
    
    if (filters.propertyId !== 'all') {
      result = result.filter(expense => expense.propertyId === filters.propertyId);
    }
    
    if (filters.category !== 'all') {
      result = result.filter(expense => expense.category === filters.category);
    }
    
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      result = result.filter(expense => new Date(expense.date) >= startDate);
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      result = result.filter(expense => new Date(expense.date) <= endDate);
    }
    
    if (filters.minAmount) {
      result = result.filter(expense => expense.amount >= parseFloat(filters.minAmount));
    }
    
    if (filters.maxAmount) {
      result = result.filter(expense => expense.amount <= parseFloat(filters.maxAmount));
    }
    
    setFilteredExpenses(result);
  }, [filters, expenses]);

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };

  const handleAddExpense = async (expenseData) => {
    try {
      const newExpense = await addExpense(expenseData);
      setExpenses([...expenses, newExpense]);
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add expense');
      console.error(err);
    }
  };

  const handleUpdateExpense = async (expenseData) => {
    try {
      const updatedExpense = await updateExpense(expenseData.id, expenseData);
      
      // Update local state
      const updatedExpenses = expenses.map(expense => 
        expense.id === updatedExpense.id ? updatedExpense : expense
      );
      
      setExpenses(updatedExpenses);
      setEditingExpense(null);
    } catch (err) {
      setError('Failed to update expense');
      console.error(err);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      await deleteExpense(expenseId);
      
      // Update local state
      const updatedExpenses = expenses.filter(expense => expense.id !== expenseId);
      setExpenses(updatedExpenses);
    } catch (err) {
      setError('Failed to delete expense');
      console.error(err);
    }
  };

  // Calculate summary data
  const calculateSummary = () => {
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Group by category
    const categoryTotals = filteredExpenses.reduce((acc, expense) => {
      const category = expense.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += expense.amount;
      return acc;
    }, {});
    
    // Group by property
    const propertyTotals = filteredExpenses.reduce((acc, expense) => {
      const propertyId = expense.propertyId;
      const propertyName = expense.propertyName;
      if (!acc[propertyId]) {
        acc[propertyId] = { name: propertyName, total: 0 };
      }
      acc[propertyId].total += expense.amount;
      return acc;
    }, {});
    
    return {
      total,
      categoryTotals,
      propertyTotals
    };
  };

  const summary = calculateSummary();

  if (loading) return <div className="loading-spinner">Loading expenses...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="expense-tracker">
      <div className="expense-tracker-header">
        <h1>Expense Tracker</h1>
        <button 
          className="add-expense-button"
          onClick={() => {
            setShowAddForm(true);
            setEditingExpense(null);
          }}
        >
          Add Expense
        </button>
      </div>
      
      <ExpenseFilter 
        filters={filters} 
        onFilterChange={handleFilterChange} 
      />
      
      <div className="expense-summary">
        <div className="summary-card total">
          <h3>Total Expenses</h3>
          <div className="summary-value">${summary.total.toFixed(2)}</div>
        </div>
        
        <div className="summary-card">
          <h3>By Category</h3>
          <ExpenseCategoryChart categoryData={summary.categoryTotals} />
        </div>
        
        <div className="summary-card">
          <h3>By Property</h3>
          <ul className="property-totals-list">
            {Object.values(summary.propertyTotals).map((property, index) => (
              <li key={index}>
                <span className="property-name">{property.name}</span>
                <span className="property-total">${property.total.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {(showAddForm || editingExpense) && (
        <div className="expense-form-container">
          <h2>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
          <ExpenseForm 
            expense={editingExpense}
            onSubmit={editingExpense ? handleUpdateExpense : handleAddExpense}
            onCancel={() => {
              setShowAddForm(false);
              setEditingExpense(null);
            }}
          />
        </div>
      )}
      
      <div className="expense-list-container">
        <h2>Expense List</h2>
        
        {filteredExpenses.length === 0 ? (
          <div className="no-expenses">
            <p>No expenses found matching your criteria.</p>
          </div>
        ) : (
          <table className="expense-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Property</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(expense => (
                <tr key={expense.id}>
                  <td>{new Date(expense.date).toLocaleDateString()}</td>
                  <td>{expense.description}</td>
                  <td>{expense.category}</td>
                  <td>{expense.propertyName}</td>
                  <td>${expense.amount.toFixed(2)}</td>
                  <td>{expense.paymentMethod}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="edit-button"
                        onClick={() => {
                          setEditingExpense(expense);
                          setShowAddForm(false);
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-button"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ExpenseTracker;
```

## API Services

The Property Management Interface communicates with the backend through the following services:

### Property Service

```javascript
// propertyService.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/properties`;

export const fetchProperties = async (managerId) => {
  try {
    const response = await axios.get(`${API_URL}`, {
      params: { managerId },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching properties:', error);
    throw error;
  }
};

export const fetchPropertyDetails = async (propertyId) => {
  try {
    const response = await axios.get(`${API_URL}/${propertyId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching property details:', error);
    throw error;
  }
};

export const addProperty = async (propertyData) => {
  try {
    const response = await axios.post(`${API_URL}`, propertyData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error adding property:', error);
    throw error;
  }
};

export const updateProperty = async (propertyId, propertyData) => {
  try {
    const response = await axios.put(`${API_URL}/${propertyId}`, propertyData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating property:', error);
    throw error;
  }
};

export const archiveProperty = async (propertyId) => {
  try {
    const response = await axios.put(`${API_URL}/${propertyId}/archive`, {}, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error archiving property:', error);
    throw error;
  }
};

export const fetchPropertyManagerDashboard = async (managerId, dateRange) => {
  try {
    const response = await axios.get(`${API_URL}/dashboard`, {
      params: { managerId, dateRange },
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
```

### Tenant Service

```javascript
// tenantService.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/tenants`;

export const fetchTenants = async (filters = {}) => {
  try {
    const response = await axios.get(`${API_URL}`, {
      params: filters,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching tenants:', error);
    throw error;
  }
};

export const fetchTenantDetails = async (tenantId) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching tenant details:', error);
    throw error;
  }
};

export const addTenant = async (tenantData) => {
  try {
    const response = await axios.post(`${API_URL}`, tenantData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error adding tenant:', error);
    throw error;
  }
};

export const updateTenant = async (tenantId, tenantData) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}`, tenantData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating tenant:', error);
    throw error;
  }
};

export const deactivateTenant = async (tenantId) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}/deactivate`, {}, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error deactivating tenant:', error);
    throw error;
  }
};

export const fetchTenantsByProperty = async (propertyId) => {
  try {
    const response = await axios.get(`${API_URL}/property/${propertyId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching tenants by property:', error);
    throw error;
  }
};

export const fetchApplicants = async (filters = {}) => {
  try {
    const response = await axios.get(`${API_URL}/applicants`, {
      params: filters,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching applicants:', error);
    throw error;
  }
};
```

### Maintenance Service

```javascript
// maintenanceService.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/maintenance`;

export const fetchMaintenanceRequests = async (filters = {}) => {
  try {
    const response = await axios.get(`${API_URL}/requests`, {
      params: filters,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    throw error;
  }
};

export const fetchMaintenanceRequestDetails = async (requestId) => {
  try {
    const response = await axios.get(`${API_URL}/requests/${requestId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching maintenance request details:', error);
    throw error;
  }
};

export const updateRequestStatus = async (requestId, status) => {
  try {
    const response = await axios.put(`${API_URL}/requests/${requestId}/status`, { status }, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating request status:', error);
    throw error;
  }
};

export const createWorkOrder = async (workOrderData) => {
  try {
    const response = await axios.post(`${API_URL}/work-orders`, workOrderData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating work order:', error);
    throw error;
  }
};

export const fetchWorkOrders = async (filters = {}) => {
  try {
    const response = await axios.get(`${API_URL}/work-orders`, {
      params: filters,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching work orders:', error);
    throw error;
  }
};

export const fetchMaintenanceStats = async (propertyId, dateRange) => {
  try {
    const response = await axios.get(`${API_URL}/stats`, {
      params: { propertyId, dateRange },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching maintenance stats:', error);
    throw error;
  }
};
```

### Financial Service

```javascript
// financialService.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/financial`;

export const fetchRentCollectionData = async (filters = {}) => {
  try {
    const response = await axios.get(`${API_URL}/rent-collection`, {
      params: filters,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching rent collection data:', error);
    throw error;
  }
};

export const fetchExpenses = async (filters = {}) => {
  try {
    const response = await axios.get(`${API_URL}/expenses`, {
      params: filters,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }
};

export const addExpense = async (expenseData) => {
  try {
    const response = await axios.post(`${API_URL}/expenses`, expenseData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
};

export const updateExpense = async (expenseId, expenseData) => {
  try {
    const response = await axios.put(`${API_URL}/expenses/${expenseId}`, expenseData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
};

export const deleteExpense = async (expenseId) => {
  try {
    const response = await axios.delete(`${API_URL}/expenses/${expenseId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};

export const generateFinancialReport = async (reportParams) => {
  try {
    const response = await axios.post(`${API_URL}/reports/generate`, reportParams, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error generating financial report:', error);
    throw error;
  }
};

export const fetchFinancialSummary = async (propertyId, period) => {
  try {
    const response = await axios.get(`${API_URL}/summary`, {
      params: { propertyId, period },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    throw error;
  }
};
```

## Database Schema Updates

To support the Property Management Interface, the following database tables need to be created or updated:

```sql
-- Properties Table
CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  zip_code VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL,
  year_built INTEGER,
  square_footage INTEGER,
  description TEXT,
  amenities TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  manager_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Units Table
CREATE TABLE units (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id),
  unit_number VARCHAR(50) NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms DECIMAL(3, 1) NOT NULL,
  square_footage INTEGER NOT NULL,
  rent_amount DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'vacant',
  features TEXT,
  floor_plan_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(property_id, unit_number)
);

-- Property Managers Table
CREATE TABLE property_managers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL DEFAULT 'manager',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Property Images Table
CREATE TABLE property_images (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id),
  image_url VARCHAR(255) NOT NULL,
  caption VARCHAR(200),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Work Orders Table
CREATE TABLE work_orders (
  id SERIAL PRIMARY KEY,
  maintenance_request_id INTEGER REFERENCES maintenance_requests(id),
  property_id INTEGER REFERENCES properties(id),
  unit_id INTEGER REFERENCES units(id),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  assigned_to INTEGER REFERENCES vendors(id),
  scheduled_date DATE,
  completed_date DATE,
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vendors Table
CREATE TABLE vendors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(255),
  service_type VARCHAR(100) NOT NULL,
  rate_type VARCHAR(50) NOT NULL,
  rate_amount DECIMAL(10, 2),
  is_preferred BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Expenses Table
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id),
  unit_id INTEGER REFERENCES units(id),
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  receipt_url VARCHAR(255),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rent Payments Table
CREATE TABLE rent_payments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  property_id INTEGER REFERENCES properties(id),
  unit_id INTEGER REFERENCES units(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Late Fees Table
CREATE TABLE late_fees (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  property_id INTEGER REFERENCES properties(id),
  unit_id INTEGER REFERENCES units(id),
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  applied_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Applicants Table
CREATE TABLE applicants (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  property_id INTEGER REFERENCES properties(id),
  unit_id INTEGER REFERENCES units(id),
  desired_move_in DATE,
  application_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  background_check_status VARCHAR(50),
  credit_check_status VARCHAR(50),
  income_verification_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Testing Strategy

The Property Management Interface will be tested using the following approach:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions and API service calls
3. **End-to-End Tests**: Test complete user flows
4. **Performance Tests**: Ensure the interface performs well with large datasets

### Example Unit Test

```javascript
// PropertyList.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PropertyList from './PropertyList';
import { fetchProperties, archiveProperty } from '../services/propertyService';

// Mock the API service
jest.mock('../services/propertyService');

// Mock the auth context
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'test-manager-id' }
  })
}));

describe('PropertyList Component', () => {
  const mockProperties = [
    {
      id: 1,
      name: 'Sunset Apartments',
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      type: 'apartment',
      status: 'active',
      unitCount: 24,
      occupancyRate: 85
    },
    {
      id: 2,
      name: 'Ocean View Condos',
      address: '456 Beach Rd',
      city: 'Coastville',
      state: 'FL',
      type: 'condo',
      status: 'active',
      unitCount: 12,
      occupancyRate: 92
    }
  ];

  beforeEach(() => {
    fetchProperties.mockResolvedValue(mockProperties);
    archiveProperty.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    render(
      <BrowserRouter>
        <PropertyList />
      </BrowserRouter>
    );
    expect(screen.getByText('Loading properties...')).toBeInTheDocument();
  });

  test('renders property list with data', async () => {
    render(
      <BrowserRouter>
        <PropertyList />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Sunset Apartments')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Ocean View Condos')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('456 Beach Rd')).toBeInTheDocument();
  });

  test('filters properties by search term', async () => {
    render(
      <BrowserRouter>
        <PropertyList />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Sunset Apartments')).toBeInTheDocument();
    });
    
    // Find the search input and type in it
    const searchInput = screen.getByPlaceholderText('Search properties...');
    fireEvent.change(searchInput, { target: { value: 'Ocean' } });
    
    // Only Ocean View Condos should be visible
    expect(screen.queryByText('Sunset Apartments')).not.toBeInTheDocument();
    expect(screen.getByText('Ocean View Condos')).toBeInTheDocument();
  });

  test('archives a property when archive button is clicked', async () => {
    render(
      <BrowserRouter>
        <PropertyList />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Sunset Apartments')).toBeInTheDocument();
    });
    
    // Find and click the archive button for the first property
    const archiveButtons = screen.getAllByText('Archive');
    fireEvent.click(archiveButtons[0]);
    
    // Confirm the API was called with the correct property ID
    expect(archiveProperty).toHaveBeenCalledWith(1);
    
    // Wait for the state update
    await waitFor(() => {
      // The component should update the property status locally
      expect(fetchProperties).toHaveBeenCalledTimes(1);
    });
  });
});
```

## Deployment Considerations

When deploying the Property Management Interface, consider the following:

1. **Role-Based Access Control**:
   - Implement proper authorization for different user roles
   - Restrict access to sensitive financial and tenant information
   - Ensure property managers only see properties they manage

2. **Data Security**:
   - Encrypt sensitive tenant and financial data
   - Implement secure API endpoints with proper authentication
   - Use HTTPS for all communications
   - Regularly backup database

3. **Performance Optimization**:
   - Implement pagination for large data sets
   - Use caching for frequently accessed data
   - Optimize database queries for property and tenant lookups
   - Implement lazy loading for images and non-critical content

4. **Scalability**:
   - Design the system to handle multiple properties and large tenant databases
   - Use cloud infrastructure that can scale with growing demand
   - Implement database sharding for large property management companies

5. **Compliance**:
   - Ensure compliance with housing regulations
   - Implement proper data retention policies
   - Support accessibility standards for users with disabilities

## Integration Points

The Property Management Interface integrates with the following components:

1. **Tenant Interface**: Shares property and unit data, maintenance requests, and communication
2. **Communication Hub**: Uses messaging and notification services for tenant and vendor communication
3. **Reporting and Analytics**: Provides property performance data for reports
4. **Integration Framework**: Connects with payment processors, background check services, and property listing platforms
5. **AI Enhancement Layer**: Utilizes AI for pricing recommendations, maintenance predictions, and tenant screening

## Next Steps

After implementing the Property Management Interface, the following steps should be taken:

1. Conduct user testing with property managers and landlords
2. Gather feedback and make improvements
3. Implement additional features based on user needs
4. Integrate with the Tenant Interface
5. Enhance with AI capabilities for better property management

## Handoff Document Updates

To add this component to the handoff document:

1. Copy this entire design document to the handoff document under a new section titled "Property Management Interface Component"
2. Update the implementation status in the handoff document
3. Add links to the relevant code files in the GitHub repository
4. Update the component dependencies diagram to show the Property Management Interface connections
