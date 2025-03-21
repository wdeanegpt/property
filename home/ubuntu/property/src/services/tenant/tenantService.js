/**
 * Tenant Service
 * 
 * This service handles all API interactions related to tenant functionality
 * including dashboard data, payments, maintenance requests, documents,
 * profile management, and communication.
 */

import axios from 'axios';

// Base API URL - would be configured based on environment in a real implementation
const API_BASE_URL = '/api';

/**
 * Fetch tenant dashboard data including lease information, payments, maintenance requests,
 * notifications, and documents
 * 
 * @param {string} tenantId - The ID of the tenant
 * @returns {Promise<Object>} - Dashboard data for the tenant
 */
export const fetchTenantDashboardData = async (tenantId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tenants/${tenantId}/dashboard`);
    return response.data;
  } catch (error) {
    console.error('Error fetching tenant dashboard data:', error);
    throw new Error('Failed to load tenant dashboard data');
  }
};

/**
 * Fetch tenant profile information
 * 
 * @param {string} tenantId - The ID of the tenant
 * @returns {Promise<Object>} - Tenant profile data
 */
export const fetchTenantProfile = async (tenantId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tenants/${tenantId}/profile`);
    return response.data;
  } catch (error) {
    console.error('Error fetching tenant profile:', error);
    throw new Error('Failed to load tenant profile');
  }
};

/**
 * Update tenant profile information
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {Object} profileData - Updated profile data
 * @returns {Promise<Object>} - Updated tenant profile
 */
export const updateTenantProfile = async (tenantId, profileData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/tenants/${tenantId}/profile`, profileData);
    return response.data;
  } catch (error) {
    console.error('Error updating tenant profile:', error);
    throw new Error('Failed to update tenant profile');
  }
};

/**
 * Fetch tenant lease information
 * 
 * @param {string} tenantId - The ID of the tenant
 * @returns {Promise<Object>} - Lease data
 */
export const fetchTenantLease = async (tenantId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tenants/${tenantId}/lease`);
    return response.data;
  } catch (error) {
    console.error('Error fetching tenant lease:', error);
    throw new Error('Failed to load tenant lease information');
  }
};

/**
 * Fetch tenant payment history
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {Object} options - Optional parameters for filtering
 * @returns {Promise<Array>} - Array of payment records
 */
export const fetchPaymentHistory = async (tenantId, options = {}) => {
  try {
    const { startDate, endDate, status, limit } = options;
    let url = `${API_BASE_URL}/tenants/${tenantId}/payments`;
    
    // Add query parameters if provided
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw new Error('Failed to load payment history');
  }
};

/**
 * Make a rent payment
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>} - Payment confirmation
 */
export const makePayment = async (tenantId, paymentData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/tenants/${tenantId}/payments`, paymentData);
    return response.data;
  } catch (error) {
    console.error('Error making payment:', error);
    throw new Error('Failed to process payment');
  }
};

/**
 * Set up automatic payments
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {Object} autopayData - Autopay configuration
 * @returns {Promise<Object>} - Autopay confirmation
 */
export const setupAutopay = async (tenantId, autopayData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/tenants/${tenantId}/autopay`, autopayData);
    return response.data;
  } catch (error) {
    console.error('Error setting up autopay:', error);
    throw new Error('Failed to set up automatic payments');
  }
};

/**
 * Fetch tenant maintenance requests
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {Object} options - Optional parameters for filtering
 * @returns {Promise<Array>} - Array of maintenance requests
 */
export const fetchMaintenanceRequests = async (tenantId, options = {}) => {
  try {
    const { status, limit } = options;
    let url = `${API_BASE_URL}/tenants/${tenantId}/maintenance`;
    
    // Add query parameters if provided
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    throw new Error('Failed to load maintenance requests');
  }
};

/**
 * Create a new maintenance request
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {Object} requestData - Maintenance request details
 * @returns {Promise<Object>} - Created maintenance request
 */
export const createMaintenanceRequest = async (tenantId, requestData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/tenants/${tenantId}/maintenance`, requestData);
    return response.data;
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    throw new Error('Failed to create maintenance request');
  }
};

/**
 * Upload images for a maintenance request
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {string} requestId - The ID of the maintenance request
 * @param {FormData} formData - Form data containing images
 * @returns {Promise<Object>} - Upload confirmation
 */
export const uploadMaintenanceImages = async (tenantId, requestId, formData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/tenants/${tenantId}/maintenance/${requestId}/images`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error uploading maintenance images:', error);
    throw new Error('Failed to upload images');
  }
};

/**
 * Fetch tenant documents
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {Object} options - Optional parameters for filtering
 * @returns {Promise<Array>} - Array of documents
 */
export const fetchTenantDocuments = async (tenantId, options = {}) => {
  try {
    const { category, limit } = options;
    let url = `${API_BASE_URL}/tenants/${tenantId}/documents`;
    
    // Add query parameters if provided
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (limit) params.append('limit', limit);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching tenant documents:', error);
    throw new Error('Failed to load documents');
  }
};

/**
 * Download a document
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {string} documentId - The ID of the document
 * @returns {Promise<Blob>} - Document blob
 */
export const downloadDocument = async (tenantId, documentId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/tenants/${tenantId}/documents/${documentId}/download`,
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    console.error('Error downloading document:', error);
    throw new Error('Failed to download document');
  }
};

/**
 * Upload a document
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {FormData} formData - Form data containing document and metadata
 * @returns {Promise<Object>} - Upload confirmation
 */
export const uploadDocument = async (tenantId, formData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/tenants/${tenantId}/documents`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw new Error('Failed to upload document');
  }
};

/**
 * Fetch tenant notifications
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {Object} options - Optional parameters for filtering
 * @returns {Promise<Array>} - Array of notifications
 */
export const fetchNotifications = async (tenantId, options = {}) => {
  try {
    const { isRead, limit } = options;
    let url = `${API_BASE_URL}/tenants/${tenantId}/notifications`;
    
    // Add query parameters if provided
    const params = new URLSearchParams();
    if (isRead !== undefined) params.append('isRead', isRead);
    if (limit) params.append('limit', limit);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw new Error('Failed to load notifications');
  }
};

/**
 * Mark notification as read
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {string} notificationId - The ID of the notification
 * @returns {Promise<Object>} - Updated notification
 */
export const markNotificationAsRead = async (tenantId, notificationId) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/tenants/${tenantId}/notifications/${notificationId}/read`
    );
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to update notification');
  }
};

/**
 * Fetch tenant messages
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {Object} options - Optional parameters for filtering
 * @returns {Promise<Array>} - Array of message threads
 */
export const fetchMessageThreads = async (tenantId, options = {}) => {
  try {
    const { limit } = options;
    let url = `${API_BASE_URL}/tenants/${tenantId}/messages`;
    
    // Add query parameters if provided
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching message threads:', error);
    throw new Error('Failed to load messages');
  }
};

/**
 * Fetch messages in a thread
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {string} threadId - The ID of the message thread
 * @returns {Promise<Array>} - Array of messages
 */
export const fetchThreadMessages = async (tenantId, threadId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/tenants/${tenantId}/messages/${threadId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching thread messages:', error);
    throw new Error('Failed to load message thread');
  }
};

/**
 * Send a message
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {string} threadId - The ID of the message thread
 * @param {Object} messageData - Message content
 * @returns {Promise<Object>} - Sent message
 */
export const sendMessage = async (tenantId, threadId, messageData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/tenants/${tenantId}/messages/${threadId}`,
      messageData
    );
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message');
  }
};

/**
 * Create a new message thread
 * 
 * @param {string} tenantId - The ID of the tenant
 * @param {Object} threadData - Thread data including recipients and initial message
 * @returns {Promise<Object>} - Created thread
 */
export const createMessageThread = async (tenantId, threadData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/tenants/${tenantId}/messages`,
      threadData
    );
    return response.data;
  } catch (error) {
    console.error('Error creating message thread:', error);
    throw new Error('Failed to create message thread');
  }
};

export default {
  fetchTenantDashboardData,
  fetchTenantProfile,
  updateTenantProfile,
  fetchTenantLease,
  fetchPaymentHistory,
  makePayment,
  setupAutopay,
  fetchMaintenanceRequests,
  createMaintenanceRequest,
  uploadMaintenanceImages,
  fetchTenantDocuments,
  downloadDocument,
  uploadDocument,
  fetchNotifications,
  markNotificationAsRead,
  fetchMessageThreads,
  fetchThreadMessages,
  sendMessage,
  createMessageThread
};
