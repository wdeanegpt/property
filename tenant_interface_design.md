# Tenant Interface Design Document

## Overview

The Tenant Interface is a critical component of the Comprehensive Property Management System, providing tenants with a user-friendly portal to manage their rental experience. This document outlines the architecture, features, and implementation details for the Tenant Interface component.

## Architecture

The Tenant Interface follows a modular architecture with the following layers:

1. **Presentation Layer**: React components for the user interface
2. **State Management Layer**: Context API and hooks for state management
3. **Service Layer**: API services for data fetching and manipulation
4. **Authentication Layer**: JWT-based authentication and authorization

### Component Hierarchy

```
TenantPortal
├── DashboardView
│   ├── LeaseInformationWidget
│   ├── PaymentHistoryWidget
│   ├── MaintenanceRequestsWidget
│   └── NotificationsWidget
├── PaymentView
│   ├── RentPaymentForm
│   ├── PaymentMethodsManager
│   ├── PaymentHistoryTable
│   └── AutoPaySetup
├── MaintenanceView
│   ├── RequestForm
│   ├── RequestStatusTracker
│   ├── RequestHistoryList
│   └── EmergencyContactInfo
├── DocumentsView
│   ├── DocumentsList
│   ├── DocumentViewer
│   ├── DocumentUploader
│   └── SignatureRequests
└── CommunicationView
    ├── MessageCenter
    ├── AnnouncementBoard
    ├── ContactDirectory
    └── NotificationPreferences
```

## Core Features

### 1. Tenant Dashboard

The dashboard provides an overview of the tenant's rental status, including:

- Lease information (start/end dates, rent amount, renewal status)
- Payment history and upcoming payments
- Maintenance request status
- Important notifications and announcements

#### Implementation Details

```jsx
// TenantDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchTenantData } from '../services/tenantService';
import LeaseInformationWidget from './LeaseInformationWidget';
import PaymentHistoryWidget from './PaymentHistoryWidget';
import MaintenanceRequestsWidget from './MaintenanceRequestsWidget';
import NotificationsWidget from './NotificationsWidget';
import './TenantDashboard.css';

const TenantDashboard = () => {
  const { currentUser } = useAuth();
  const [tenantData, setTenantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTenantData = async () => {
      try {
        setLoading(true);
        const data = await fetchTenantData(currentUser.id);
        setTenantData(data);
      } catch (err) {
        setError('Failed to load tenant information');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadTenantData();
  }, [currentUser.id]);

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="tenant-dashboard">
      <h1>Welcome, {tenantData.firstName}!</h1>
      <div className="dashboard-grid">
        <LeaseInformationWidget leaseData={tenantData.lease} />
        <PaymentHistoryWidget payments={tenantData.payments} />
        <MaintenanceRequestsWidget requests={tenantData.maintenanceRequests} />
        <NotificationsWidget notifications={tenantData.notifications} />
      </div>
    </div>
  );
};

export default TenantDashboard;
```

### 2. Online Rent Payment System

The payment system allows tenants to:

- View current balance and payment history
- Make one-time payments using various payment methods
- Set up automatic recurring payments
- Download payment receipts and statements

#### Implementation Details

```jsx
// RentPaymentForm.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { processPayment } from '../services/paymentService';
import PaymentMethodSelector from './PaymentMethodSelector';
import './RentPaymentForm.css';

const RentPaymentForm = ({ currentBalance, dueDate }) => {
  const { currentUser } = useAuth();
  const [amount, setAmount] = useState(currentBalance);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }
    
    try {
      setProcessing(true);
      setError(null);
      
      const paymentResult = await processPayment({
        tenantId: currentUser.id,
        amount,
        paymentMethodId: paymentMethod.id,
        description: `Rent payment for ${new Date().toLocaleDateString()}`
      });
      
      setSuccess(true);
    } catch (err) {
      setError('Payment processing failed. Please try again.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="payment-success">
        <h2>Payment Successful!</h2>
        <p>Your payment of ${amount} has been processed.</p>
        <p>A receipt has been sent to your email.</p>
        <button onClick={() => setSuccess(false)}>Make Another Payment</button>
      </div>
    );
  }

  return (
    <div className="rent-payment-form">
      <h2>Make a Payment</h2>
      <div className="payment-info">
        <div className="info-item">
          <span>Current Balance:</span>
          <span className="amount">${currentBalance}</span>
        </div>
        <div className="info-item">
          <span>Due Date:</span>
          <span>{new Date(dueDate).toLocaleDateString()}</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="amount">Payment Amount</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="0.01"
            required
          />
        </div>
        
        <PaymentMethodSelector 
          onSelect={setPaymentMethod} 
          selectedMethod={paymentMethod} 
        />
        
        {error && <div className="error-message">{error}</div>}
        
        <button 
          type="submit" 
          className="submit-button" 
          disabled={processing}
        >
          {processing ? 'Processing...' : 'Make Payment'}
        </button>
      </form>
    </div>
  );
};

export default RentPaymentForm;
```

### 3. Maintenance Request System

The maintenance system enables tenants to:

- Submit new maintenance requests with details and photos
- Track the status of existing requests
- Communicate with maintenance staff
- Rate and review completed maintenance work

#### Implementation Details

```jsx
// MaintenanceRequestForm.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { submitMaintenanceRequest } from '../services/maintenanceService';
import ImageUploader from './ImageUploader';
import './MaintenanceRequestForm.css';

const MaintenanceRequestForm = () => {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [images, setImages] = useState([]);
  const [entryPermission, setEntryPermission] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      
      const requestData = {
        tenantId: currentUser.id,
        propertyId: currentUser.propertyId,
        unitId: currentUser.unitId,
        title,
        description,
        priority,
        images,
        entryPermission,
        status: 'submitted',
        submittedAt: new Date().toISOString()
      };
      
      await submitMaintenanceRequest(requestData);
      setSuccess(true);
      
      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setImages([]);
      setEntryPermission(false);
    } catch (err) {
      setError('Failed to submit maintenance request. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="request-success">
        <h2>Maintenance Request Submitted!</h2>
        <p>Your request has been received and will be processed shortly.</p>
        <p>You can track the status of your request in the Maintenance section.</p>
        <button onClick={() => setSuccess(false)}>Submit Another Request</button>
      </div>
    );
  }

  return (
    <div className="maintenance-request-form">
      <h2>Submit Maintenance Request</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Issue Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Leaking Faucet in Kitchen"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please provide details about the issue..."
            rows={4}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">Low - Not Urgent</option>
            <option value="medium">Medium - Needs Attention</option>
            <option value="high">High - Urgent Issue</option>
            <option value="emergency">Emergency - Immediate Attention Required</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Upload Images (Optional)</label>
          <ImageUploader images={images} setImages={setImages} />
          <p className="help-text">Images help maintenance staff understand the issue better.</p>
        </div>
        
        <div className="form-group checkbox">
          <input
            type="checkbox"
            id="entryPermission"
            checked={entryPermission}
            onChange={(e) => setEntryPermission(e.target.checked)}
          />
          <label htmlFor="entryPermission">
            I give permission for maintenance staff to enter my unit if I am not present
          </label>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button 
          type="submit" 
          className="submit-button" 
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
};

export default MaintenanceRequestForm;
```

### 4. Document Repository

The document repository allows tenants to:

- Access lease agreements and addendums
- View notices and communications
- Upload and store important documents
- Sign documents electronically

#### Implementation Details

```jsx
// DocumentsList.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchTenantDocuments } from '../services/documentService';
import DocumentItem from './DocumentItem';
import './DocumentsList.css';

const DocumentsList = () => {
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true);
        const docs = await fetchTenantDocuments(currentUser.id);
        setDocuments(docs);
      } catch (err) {
        setError('Failed to load documents');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [currentUser.id]);

  const filteredDocuments = filter === 'all' 
    ? documents 
    : documents.filter(doc => doc.category === filter);

  const documentCategories = [
    { id: 'all', label: 'All Documents' },
    { id: 'lease', label: 'Lease Agreements' },
    { id: 'notices', label: 'Notices' },
    { id: 'receipts', label: 'Payment Receipts' },
    { id: 'maintenance', label: 'Maintenance Records' },
    { id: 'personal', label: 'Personal Documents' }
  ];

  if (loading) return <div className="loading-spinner">Loading documents...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="documents-list">
      <h2>My Documents</h2>
      
      <div className="filter-tabs">
        {documentCategories.map(category => (
          <button
            key={category.id}
            className={`filter-tab ${filter === category.id ? 'active' : ''}`}
            onClick={() => setFilter(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>
      
      {filteredDocuments.length === 0 ? (
        <div className="no-documents">
          <p>No documents found in this category.</p>
        </div>
      ) : (
        <div className="documents-grid">
          {filteredDocuments.map(document => (
            <DocumentItem key={document.id} document={document} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentsList;
```

### 5. Communication Tools

The communication tools enable tenants to:

- Send and receive messages to/from property managers
- View announcements and community updates
- Set notification preferences
- Schedule appointments with property management

#### Implementation Details

```jsx
// MessageCenter.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchMessages, sendMessage } from '../services/communicationService';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import './MessageCenter.css';

const MessageCenter = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        const messageData = await fetchMessages(currentUser.id);
        setMessages(messageData);
        
        // Select the most recent thread by default if available
        if (messageData.length > 0) {
          setSelectedThread(messageData[0]);
        }
      } catch (err) {
        setError('Failed to load messages');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [currentUser.id]);

  const handleSendMessage = async (content, recipientId) => {
    try {
      const newMessage = await sendMessage({
        senderId: currentUser.id,
        recipientId,
        content,
        timestamp: new Date().toISOString()
      });
      
      // Update the messages state with the new message
      if (selectedThread) {
        const updatedThread = {
          ...selectedThread,
          messages: [...selectedThread.messages, newMessage]
        };
        
        setSelectedThread(updatedThread);
        
        // Update the messages list
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          const threadIndex = updatedMessages.findIndex(t => t.id === selectedThread.id);
          
          if (threadIndex !== -1) {
            updatedMessages[threadIndex] = updatedThread;
          }
          
          return updatedMessages;
        });
      }
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    }
  };

  if (loading) return <div className="loading-spinner">Loading messages...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="message-center">
      <h2>Message Center</h2>
      
      <div className="message-center-layout">
        <div className="thread-list">
          <h3>Conversations</h3>
          {messages.length === 0 ? (
            <div className="no-messages">
              <p>No messages found.</p>
            </div>
          ) : (
            <ul>
              {messages.map(thread => (
                <li 
                  key={thread.id} 
                  className={`thread-item ${selectedThread?.id === thread.id ? 'active' : ''}`}
                  onClick={() => setSelectedThread(thread)}
                >
                  <div className="thread-participant">{thread.participantName}</div>
                  <div className="thread-preview">{thread.lastMessage.content.substring(0, 30)}...</div>
                  <div className="thread-time">{new Date(thread.lastMessage.timestamp).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="message-view">
          {selectedThread ? (
            <>
              <div className="thread-header">
                <h3>Conversation with {selectedThread.participantName}</h3>
              </div>
              
              <MessageList messages={selectedThread.messages} currentUserId={currentUser.id} />
              
              <MessageComposer 
                onSendMessage={(content) => handleSendMessage(content, selectedThread.participantId)} 
              />
            </>
          ) : (
            <div className="no-thread-selected">
              <p>Select a conversation to view messages.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageCenter;
```

## API Services

The Tenant Interface communicates with the backend through the following services:

### Tenant Service

```javascript
// tenantService.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/tenants`;

export const fetchTenantData = async (tenantId) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching tenant data:', error);
    throw error;
  }
};

export const updateTenantProfile = async (tenantId, profileData) => {
  try {
    const response = await axios.put(`${API_URL}/${tenantId}/profile`, profileData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating tenant profile:', error);
    throw error;
  }
};

export const fetchLeaseInformation = async (tenantId) => {
  try {
    const response = await axios.get(`${API_URL}/${tenantId}/lease`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching lease information:', error);
    throw error;
  }
};
```

### Payment Service

```javascript
// paymentService.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/payments`;

export const fetchPaymentHistory = async (tenantId) => {
  try {
    const response = await axios.get(`${API_URL}/history/${tenantId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }
};

export const processPayment = async (paymentData) => {
  try {
    const response = await axios.post(`${API_URL}/process`, paymentData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
};

export const fetchPaymentMethods = async (tenantId) => {
  try {
    const response = await axios.get(`${API_URL}/methods/${tenantId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    throw error;
  }
};

export const addPaymentMethod = async (tenantId, paymentMethodData) => {
  try {
    const response = await axios.post(`${API_URL}/methods/${tenantId}`, paymentMethodData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error adding payment method:', error);
    throw error;
  }
};

export const setupAutoPay = async (tenantId, autoPayData) => {
  try {
    const response = await axios.post(`${API_URL}/autopay/${tenantId}`, autoPayData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error setting up autopay:', error);
    throw error;
  }
};
```

## Database Schema Updates

To support the Tenant Interface, the following database tables need to be created or updated:

```sql
-- Tenants Table
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  property_id INTEGER REFERENCES properties(id),
  unit_id INTEGER REFERENCES units(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  lease_start_date DATE NOT NULL,
  lease_end_date DATE NOT NULL,
  rent_amount DECIMAL(10, 2) NOT NULL,
  security_deposit DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Requests Table
CREATE TABLE maintenance_requests (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  property_id INTEGER REFERENCES properties(id),
  unit_id INTEGER REFERENCES units(id),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  entry_permission BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  scheduled_date DATE,
  completed_date DATE,
  assigned_to INTEGER REFERENCES staff(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Request Images Table
CREATE TABLE maintenance_request_images (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES maintenance_requests(id),
  image_url VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method_id INTEGER REFERENCES payment_methods(id),
  transaction_id VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  description TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment Methods Table
CREATE TABLE payment_methods (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  type VARCHAR(50) NOT NULL,
  last_four VARCHAR(4),
  expiry_date VARCHAR(7),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Auto Pay Settings Table
CREATE TABLE autopay_settings (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  payment_method_id INTEGER REFERENCES payment_methods(id),
  amount DECIMAL(10, 2) NOT NULL,
  frequency VARCHAR(50) NOT NULL,
  next_payment_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents Table
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  property_id INTEGER REFERENCES properties(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  file_url VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  requires_signature BOOLEAN DEFAULT FALSE,
  is_signed BOOLEAN DEFAULT FALSE,
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Messages Table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id),
  recipient_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  thread_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Testing Strategy

The Tenant Interface will be tested using the following approach:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions and API service calls
3. **End-to-End Tests**: Test complete user flows
4. **Accessibility Tests**: Ensure the interface is accessible to all users

### Example Unit Test

```javascript
// TenantDashboard.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import TenantDashboard from './TenantDashboard';
import { fetchTenantData } from '../services/tenantService';

// Mock the API service
jest.mock('../services/tenantService');

// Mock the auth context
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'test-tenant-id' }
  }),
  AuthProvider: ({ children }) => <div>{children}</div>
}));

describe('TenantDashboard Component', () => {
  const mockTenantData = {
    id: 'test-tenant-id',
    firstName: 'John',
    lastName: 'Doe',
    lease: {
      startDate: '2023-01-01',
      endDate: '2024-01-01',
      rentAmount: 1200
    },
    payments: [
      { id: 1, amount: 1200, date: '2023-02-01', status: 'completed' }
    ],
    maintenanceRequests: [
      { id: 1, title: 'Leaky Faucet', status: 'in-progress' }
    ],
    notifications: [
      { id: 1, title: 'Rent Due', message: 'Your rent is due in 5 days' }
    ]
  };

  beforeEach(() => {
    fetchTenantData.mockResolvedValue(mockTenantData);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    render(<TenantDashboard />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders tenant dashboard with data', async () => {
    render(<TenantDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Welcome, John!')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Leaky Faucet')).toBeInTheDocument();
    expect(screen.getByText('$1200')).toBeInTheDocument();
    expect(screen.getByText('Rent Due')).toBeInTheDocument();
  });

  test('handles API error', async () => {
    fetchTenantData.mockRejectedValue(new Error('API Error'));
    
    render(<TenantDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load tenant information')).toBeInTheDocument();
    });
  });
});
```

## Deployment Considerations

When deploying the Tenant Interface, consider the following:

1. **Performance Optimization**:
   - Implement code splitting to reduce initial load time
   - Use lazy loading for components not immediately visible
   - Optimize images and assets

2. **Security Measures**:
   - Implement proper authentication and authorization
   - Secure API endpoints with rate limiting
   - Validate all user inputs
   - Use HTTPS for all communications

3. **Accessibility**:
   - Ensure proper contrast ratios
   - Add ARIA attributes where necessary
   - Support keyboard navigation
   - Test with screen readers

4. **Responsive Design**:
   - Ensure the interface works well on all device sizes
   - Implement mobile-first design principles
   - Test on various browsers and devices

## Integration Points

The Tenant Interface integrates with the following components:

1. **Property Management Interface**: Shares tenant data and communication
2. **Communication Hub**: Uses messaging and notification services
3. **Reporting and Analytics**: Provides tenant activity data for reports
4. **Integration Framework**: Connects with payment processors and document services
5. **AI Enhancement Layer**: Utilizes AI for form filling and recommendations

## Next Steps

After implementing the Tenant Interface, the following steps should be taken:

1. Conduct user testing with actual tenants
2. Gather feedback and make improvements
3. Implement additional features based on user needs
4. Integrate with the Property Management Interface
5. Enhance with AI capabilities for better user experience

## Handoff Document Updates

To add this component to the handoff document:

1. Copy this entire design document to the handoff document under a new section titled "Tenant Interface Component"
2. Update the implementation status in the handoff document
3. Add links to the relevant code files in the GitHub repository
4. Update the component dependencies diagram to show the Tenant Interface connections
