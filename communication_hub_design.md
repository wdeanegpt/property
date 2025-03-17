# Communication Hub Design Document

## Overview

The Communication Hub is a central component of the Comprehensive Property Management System, facilitating seamless communication between tenants, landlords, property managers, and housing authorities. This document outlines the architecture, features, and implementation details for the Communication Hub component.

## Architecture

The Communication Hub follows a modular architecture with the following layers:

1. **Presentation Layer**: React components for the user interface
2. **State Management Layer**: Context API and Redux for real-time communication state
3. **Service Layer**: API services for data fetching and manipulation
4. **Real-time Layer**: WebSocket integration for instant messaging
5. **Notification Layer**: Push notification system for alerts and updates

### Component Hierarchy

```
CommunicationHub
├── MessagingCenter
│   ├── ConversationList
│   ├── MessageThread
│   ├── MessageComposer
│   ├── MessageAttachments
│   └── MessageSearch
├── NotificationSystem
│   ├── NotificationCenter
│   ├── NotificationSettings
│   ├── NotificationHistory
│   └── CustomNotifications
├── AnnouncementBoard
│   ├── AnnouncementCreator
│   ├── AnnouncementList
│   ├── AnnouncementDetail
│   └── AnnouncementTargeting
├── DocumentSharing
│   ├── DocumentUploader
│   ├── DocumentLibrary
│   ├── DocumentViewer
│   └── DocumentPermissions
└── CommunicationSettings
    ├── PreferenceManager
    ├── ContactDirectory
    ├── AutomationRules
    └── TemplateManager
```

## Core Features

### 1. Messaging Center

The Messaging Center enables direct communication between all system users, including:

- Tenant-to-property manager messaging
- Property manager-to-tenant messaging
- Group conversations for building or property announcements
- Message history and search
- File and image sharing

#### Implementation Details

```jsx
// MessagingCenter.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { fetchConversations, fetchMessages, sendMessage } from '../services/messagingService';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import MessageComposer from './MessageComposer';
import './MessagingCenter.css';

const MessagingCenter = () => {
  const { currentUser } = useAuth();
  const { socket } = useWebSocket();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        const data = await fetchConversations(currentUser.id);
        setConversations(data);
        
        // Set the first conversation as active if available
        if (data.length > 0 && !activeConversation) {
          setActiveConversation(data[0]);
        }
      } catch (err) {
        setError('Failed to load conversations');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [currentUser.id]);

  useEffect(() => {
    if (activeConversation) {
      const loadMessages = async () => {
        try {
          setLoading(true);
          const data = await fetchMessages(activeConversation.id);
          setMessages(data);
        } catch (err) {
          setError('Failed to load messages');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

      loadMessages();
    }
  }, [activeConversation]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (socket) {
      // Listen for new messages
      socket.on('new_message', (message) => {
        if (message.conversationId === activeConversation?.id) {
          setMessages((prevMessages) => [...prevMessages, message]);
        }
        
        // Update the conversation list to show the latest message
        setConversations((prevConversations) => {
          return prevConversations.map((conv) => {
            if (conv.id === message.conversationId) {
              return {
                ...conv,
                lastMessage: message.content,
                lastMessageTime: message.timestamp,
                unreadCount: conv.id === activeConversation?.id ? 0 : conv.unreadCount + 1
              };
            }
            return conv;
          });
        });
      });
      
      // Listen for read receipts
      socket.on('message_read', ({ conversationId, userId }) => {
        if (userId !== currentUser.id && conversationId === activeConversation?.id) {
          setMessages((prevMessages) => {
            return prevMessages.map((msg) => {
              if (!msg.readBy.includes(userId)) {
                return {
                  ...msg,
                  readBy: [...msg.readBy, userId]
                };
              }
              return msg;
            });
          });
        }
      });
      
      // Clean up listeners on unmount
      return () => {
        socket.off('new_message');
        socket.off('message_read');
      };
    }
  }, [socket, activeConversation, currentUser.id]);

  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
    
    // Mark conversation as read
    if (conversation.unreadCount > 0) {
      socket.emit('mark_conversation_read', {
        conversationId: conversation.id,
        userId: currentUser.id
      });
      
      // Update local state
      setConversations((prevConversations) => {
        return prevConversations.map((conv) => {
          if (conv.id === conversation.id) {
            return {
              ...conv,
              unreadCount: 0
            };
          }
          return conv;
        });
      });
    }
  };

  const handleSendMessage = async (content, attachments = []) => {
    if (!activeConversation) return;
    
    try {
      const newMessage = {
        conversationId: activeConversation.id,
        senderId: currentUser.id,
        content,
        attachments,
        timestamp: new Date().toISOString(),
        readBy: [currentUser.id]
      };
      
      // Optimistically add message to UI
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      
      // Send message to server
      await sendMessage(newMessage);
      
      // Socket will handle the broadcast to other users
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
      
      // Remove the optimistically added message on error
      setMessages((prevMessages) => 
        prevMessages.filter((msg) => msg.timestamp !== newMessage.timestamp)
      );
    }
  };

  const handleCreateNewConversation = async (recipients) => {
    try {
      const newConversation = await createConversation({
        creatorId: currentUser.id,
        participants: [currentUser.id, ...recipients],
        type: recipients.length > 1 ? 'group' : 'direct'
      });
      
      setConversations((prevConversations) => [newConversation, ...prevConversations]);
      setActiveConversation(newConversation);
    } catch (err) {
      setError('Failed to create conversation');
      console.error(err);
    }
  };

  if (loading && conversations.length === 0) {
    return <div className="loading-spinner">Loading conversations...</div>;
  }

  return (
    <div className="messaging-center">
      <div className="messaging-sidebar">
        <div className="sidebar-header">
          <h2>Messages</h2>
          <button 
            className="new-conversation-button"
            onClick={() => {/* Open new conversation modal */}}
          >
            New Message
          </button>
        </div>
        
        <ConversationList 
          conversations={conversations}
          activeConversationId={activeConversation?.id}
          onSelectConversation={handleSelectConversation}
          currentUserId={currentUser.id}
        />
      </div>
      
      <div className="messaging-main">
        {activeConversation ? (
          <>
            <div className="conversation-header">
              <h2>
                {activeConversation.type === 'direct' 
                  ? activeConversation.participants.find(p => p.id !== currentUser.id)?.name
                  : activeConversation.name}
              </h2>
              <div className="conversation-actions">
                {/* Additional actions like call, video, etc. */}
              </div>
            </div>
            
            <div className="message-thread-container">
              <MessageThread 
                messages={messages}
                currentUserId={currentUser.id}
                participants={activeConversation.participants}
              />
              <div ref={messagesEndRef} />
            </div>
            
            <MessageComposer 
              onSendMessage={handleSendMessage}
              conversationId={activeConversation.id}
            />
          </>
        ) : (
          <div className="no-conversation-selected">
            <p>Select a conversation or start a new one.</p>
          </div>
        )}
      </div>
      
      {error && <div className="error-toast">{error}</div>}
    </div>
  );
};

export default MessagingCenter;
```

```jsx
// MessageThread.jsx
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import './MessageThread.css';

const MessageThread = ({ messages, currentUserId, participants }) => {
  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.timestamp).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  // Get participant info by ID
  const getParticipant = (id) => {
    return participants.find(p => p.id === id) || { name: 'Unknown User' };
  };

  return (
    <div className="message-thread">
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date} className="message-date-group">
          <div className="date-divider">
            <span>{date}</span>
          </div>
          
          {dateMessages.map((message, index) => {
            const isCurrentUser = message.senderId === currentUserId;
            const sender = getParticipant(message.senderId);
            const showSender = 
              index === 0 || 
              dateMessages[index - 1].senderId !== message.senderId;
            
            return (
              <div 
                key={message.id || message.timestamp} 
                className={`message-container ${isCurrentUser ? 'sent' : 'received'}`}
              >
                {!isCurrentUser && showSender && (
                  <div className="message-sender">{sender.name}</div>
                )}
                
                <div className={`message-bubble ${isCurrentUser ? 'sent' : 'received'}`}>
                  <div className="message-content">{message.content}</div>
                  
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="message-attachments">
                      {message.attachments.map((attachment, i) => (
                        <div key={i} className="attachment">
                          {attachment.type.startsWith('image/') ? (
                            <img 
                              src={attachment.url} 
                              alt={attachment.name} 
                              className="attachment-image"
                            />
                          ) : (
                            <div className="attachment-file">
                              <i className="file-icon"></i>
                              <span className="file-name">{attachment.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="message-meta">
                    <span className="message-time">
                      {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </span>
                    
                    {isCurrentUser && (
                      <span className="message-status">
                        {message.readBy.length > 1 ? 'Read' : 'Delivered'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      
      {messages.length === 0 && (
        <div className="no-messages">
          <p>No messages yet. Start the conversation!</p>
        </div>
      )}
    </div>
  );
};

export default MessageThread;
```

### 2. Notification System

The Notification System keeps users informed about important events, including:

- Rent payment reminders and confirmations
- Maintenance request updates
- Lease renewal notifications
- Community announcements
- Custom notification preferences

#### Implementation Details

```jsx
// NotificationCenter.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { fetchNotifications, markNotificationRead } from '../services/notificationService';
import NotificationItem from './NotificationItem';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const { currentUser } = useAuth();
  const { socket } = useWebSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(true);
        const data = await fetchNotifications(currentUser.id);
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
      } catch (err) {
        setError('Failed to load notifications');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [currentUser.id]);

  useEffect(() => {
    if (socket) {
      // Listen for new notifications
      socket.on('new_notification', (notification) => {
        if (notification.userId === currentUser.id) {
          setNotifications((prevNotifications) => [notification, ...prevNotifications]);
          setUnreadCount((prevCount) => prevCount + 1);
        }
      });
      
      // Clean up listener on unmount
      return () => {
        socket.off('new_notification');
      };
    }
  }, [socket, currentUser.id]);

  const handleToggleNotifications = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId);
      
      // Update local state
      setNotifications((prevNotifications) => {
        return prevNotifications.map((notification) => {
          if (notification.id === notificationId && !notification.isRead) {
            setUnreadCount((prevCount) => prevCount - 1);
            return { ...notification, isRead: true };
          }
          return notification;
        });
      });
    } catch (err) {
      setError('Failed to mark notification as read');
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await Promise.all(
        notifications
          .filter(n => !n.isRead)
          .map(n => markNotificationRead(n.id))
      );
      
      // Update local state
      setNotifications((prevNotifications) => {
        return prevNotifications.map((notification) => {
          return { ...notification, isRead: true };
        });
      });
      
      setUnreadCount(0);
    } catch (err) {
      setError('Failed to mark all notifications as read');
      console.error(err);
    }
  };

  return (
    <div className="notification-center">
      <div className="notification-icon" onClick={handleToggleNotifications}>
        <i className="bell-icon"></i>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </div>
      
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-button"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="notification-list">
            {loading ? (
              <div className="loading-spinner">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No notifications yet.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem 
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))
            )}
          </div>
          
          <div className="notification-footer">
            <a href="/notifications/settings" className="settings-link">
              Notification Settings
            </a>
            <a href="/notifications/all" className="view-all-link">
              View All
            </a>
          </div>
        </div>
      )}
      
      {error && <div className="error-toast">{error}</div>}
    </div>
  );
};

export default NotificationCenter;
```

```jsx
// NotificationSettings.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchNotificationSettings, updateNotificationSettings } from '../services/notificationService';
import './NotificationSettings.css';

const NotificationSettings = () => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await fetchNotificationSettings(currentUser.id);
        setSettings(data);
      } catch (err) {
        setError('Failed to load notification settings');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [currentUser.id]);

  const handleToggleSetting = (category, channel) => {
    setSettings((prevSettings) => {
      const updatedSettings = { ...prevSettings };
      updatedSettings[category][channel] = !updatedSettings[category][channel];
      return updatedSettings;
    });
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await updateNotificationSettings(currentUser.id, settings);
      setSuccess('Notification settings saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save notification settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-spinner">Loading notification settings...</div>;
  if (!settings) return <div className="error-message">{error || 'Failed to load settings'}</div>;

  const notificationCategories = [
    {
      id: 'payments',
      label: 'Payments',
      description: 'Notifications related to rent payments, invoices, and receipts'
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      description: 'Updates on maintenance requests and scheduled repairs'
    },
    {
      id: 'lease',
      label: 'Lease',
      description: 'Lease renewals, updates, and important dates'
    },
    {
      id: 'announcements',
      label: 'Announcements',
      description: 'Property and community announcements'
    },
    {
      id: 'messages',
      label: 'Messages',
      description: 'New messages and replies'
    }
  ];

  const notificationChannels = [
    {
      id: 'email',
      label: 'Email'
    },
    {
      id: 'push',
      label: 'Push Notifications'
    },
    {
      id: 'sms',
      label: 'SMS'
    },
    {
      id: 'inApp',
      label: 'In-App'
    }
  ];

  return (
    <div className="notification-settings">
      <h1>Notification Settings</h1>
      <p className="settings-description">
        Customize how and when you receive notifications from the system.
      </p>
      
      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}
      
      <div className="settings-table">
        <div className="table-header">
          <div className="category-header">Notification Type</div>
          {notificationChannels.map((channel) => (
            <div key={channel.id} className="channel-header">
              {channel.label}
            </div>
          ))}
        </div>
        
        {notificationCategories.map((category) => (
          <div key={category.id} className="category-row">
            <div className="category-info">
              <h3>{category.label}</h3>
              <p>{category.description}</p>
            </div>
            
            {notificationChannels.map((channel) => (
              <div key={channel.id} className="channel-toggle">
                <label className="toggle-switch">
                  <input 
                    type="checkbox"
                    checked={settings[category.id][channel.id]}
                    onChange={() => handleToggleSetting(category.id, channel.id)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="settings-actions">
        <button 
          className="save-button"
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;
```

### 3. Announcement Board

The Announcement Board allows property managers to communicate with multiple tenants at once, including:

- Property-wide announcements
- Building-specific notices
- Community events and updates
- Maintenance schedules
- Emergency notifications

#### Implementation Details

```jsx
// AnnouncementBoard.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchAnnouncements } from '../services/announcementService';
import AnnouncementItem from './AnnouncementItem';
import AnnouncementFilter from './AnnouncementFilter';
import './AnnouncementBoard.css';

const AnnouncementBoard = () => {
  const { currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: 'all',
    propertyId: currentUser.role === 'tenant' ? currentUser.propertyId : 'all',
    timeframe: 'all'
  });

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setLoading(true);
        const data = await fetchAnnouncements({
          userId: currentUser.id,
          role: currentUser.role,
          propertyId: currentUser.role === 'tenant' ? currentUser.propertyId : null
        });
        setAnnouncements(data);
        setFilteredAnnouncements(data);
      } catch (err) {
        setError('Failed to load announcements');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();
  }, [currentUser]);

  useEffect(() => {
    // Apply filters
    let result = [...announcements];
    
    if (filters.category !== 'all') {
      result = result.filter(announcement => announcement.category === filters.category);
    }
    
    if (filters.propertyId !== 'all') {
      result = result.filter(announcement => announcement.propertyId === filters.propertyId);
    }
    
    if (filters.timeframe !== 'all') {
      const now = new Date();
      let cutoffDate;
      
      switch (filters.timeframe) {
        case 'today':
          cutoffDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          cutoffDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          cutoffDate = null;
      }
      
      if (cutoffDate) {
        result = result.filter(announcement => new Date(announcement.publishedAt) >= cutoffDate);
      }
    }
    
    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    setFilteredAnnouncements(result);
  }, [filters, announcements]);

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };

  if (loading) return <div className="loading-spinner">Loading announcements...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="announcement-board">
      <div className="announcement-header">
        <h1>Announcements</h1>
        {currentUser.role !== 'tenant' && (
          <a href="/announcements/create" className="create-announcement-button">
            Create Announcement
          </a>
        )}
      </div>
      
      <AnnouncementFilter 
        filters={filters}
        onFilterChange={handleFilterChange}
        userRole={currentUser.role}
      />
      
      <div className="announcements-container">
        {filteredAnnouncements.length === 0 ? (
          <div className="no-announcements">
            <p>No announcements found matching your criteria.</p>
          </div>
        ) : (
          filteredAnnouncements.map(announcement => (
            <AnnouncementItem 
              key={announcement.id}
              announcement={announcement}
              userRole={currentUser.role}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AnnouncementBoard;
```

```jsx
// AnnouncementCreator.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createAnnouncement } from '../services/announcementService';
import { fetchProperties } from '../services/propertyService';
import RichTextEditor from './RichTextEditor';
import './AnnouncementCreator.css';

const AnnouncementCreator = () => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    targetAudience: 'all-tenants',
    propertyIds: [],
    isPinned: false,
    expiresAt: ''
  });
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setPropertiesLoading(true);
        const data = await fetchProperties();
        setProperties(data);
      } catch (err) {
        setError('Failed to load properties');
        console.error(err);
      } finally {
        setPropertiesLoading(false);
      }
    };

    loadProperties();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData({ ...formData, [name]: checked });
  };

  const handleContentChange = (content) => {
    setFormData({ ...formData, content });
  };

  const handlePropertySelection = (e) => {
    const options = e.target.options;
    const selectedValues = [];
    
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedValues.push(options[i].value);
      }
    }
    
    setFormData({ ...formData, propertyIds: selectedValues });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!formData.content.trim()) {
      setError('Content is required');
      return;
    }
    
    if (formData.targetAudience === 'specific-properties' && formData.propertyIds.length === 0) {
      setError('Please select at least one property');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const announcementData = {
        ...formData,
        authorId: currentUser.id,
        authorName: `${currentUser.firstName} ${currentUser.lastName}`,
        publishedAt: new Date().toISOString()
      };
      
      await createAnnouncement(announcementData);
      
      setSuccess('Announcement created successfully');
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        category: 'general',
        targetAudience: 'all-tenants',
        propertyIds: [],
        isPinned: false,
        expiresAt: ''
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to create announcement');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="announcement-creator">
      <h1>Create Announcement</h1>
      
      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter announcement title"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
          >
            <option value="general">General</option>
            <option value="maintenance">Maintenance</option>
            <option value="event">Community Event</option>
            <option value="emergency">Emergency</option>
            <option value="policy">Policy Update</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="targetAudience">Target Audience</label>
          <select
            id="targetAudience"
            name="targetAudience"
            value={formData.targetAudience}
            onChange={handleInputChange}
          >
            <option value="all-tenants">All Tenants</option>
            <option value="specific-properties">Specific Properties</option>
            <option value="staff-only">Staff Only</option>
          </select>
        </div>
        
        {formData.targetAudience === 'specific-properties' && (
          <div className="form-group">
            <label htmlFor="propertyIds">Select Properties</label>
            {propertiesLoading ? (
              <div className="loading-spinner">Loading properties...</div>
            ) : (
              <select
                id="propertyIds"
                name="propertyIds"
                multiple
                value={formData.propertyIds}
                onChange={handlePropertySelection}
                className="property-select"
              >
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            )}
            <p className="help-text">Hold Ctrl (or Cmd) to select multiple properties</p>
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="content">Announcement Content</label>
          <RichTextEditor
            initialValue={formData.content}
            onChange={handleContentChange}
            placeholder="Enter announcement content..."
          />
        </div>
        
        <div className="form-group checkbox">
          <input
            type="checkbox"
            id="isPinned"
            name="isPinned"
            checked={formData.isPinned}
            onChange={handleCheckboxChange}
          />
          <label htmlFor="isPinned">Pin this announcement to the top</label>
        </div>
        
        <div className="form-group">
          <label htmlFor="expiresAt">Expiration Date (Optional)</label>
          <input
            type="date"
            id="expiresAt"
            name="expiresAt"
            value={formData.expiresAt}
            onChange={handleInputChange}
            min={new Date().toISOString().split('T')[0]}
          />
          <p className="help-text">Leave blank if the announcement doesn't expire</p>
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Announcement'}
          </button>
          <a href="/announcements" className="cancel-link">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
};

export default AnnouncementCreator;
```

### 4. Document Sharing

The Document Sharing system enables secure exchange of documents between all parties, including:

- Lease agreements and addendums
- Maintenance reports and invoices
- Property policies and guidelines
- Community newsletters
- Legal notices and disclosures

#### Implementation Details

```jsx
// DocumentLibrary.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchDocuments } from '../services/documentService';
import DocumentItem from './DocumentItem';
import DocumentFilter from './DocumentFilter';
import './DocumentLibrary.css';

const DocumentLibrary = () => {
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: 'all',
    propertyId: currentUser.role === 'tenant' ? currentUser.propertyId : 'all',
    searchTerm: ''
  });

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true);
        const data = await fetchDocuments({
          userId: currentUser.id,
          role: currentUser.role,
          propertyId: currentUser.role === 'tenant' ? currentUser.propertyId : null
        });
        setDocuments(data);
        setFilteredDocuments(data);
      } catch (err) {
        setError('Failed to load documents');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [currentUser]);

  useEffect(() => {
    // Apply filters
    let result = [...documents];
    
    if (filters.category !== 'all') {
      result = result.filter(document => document.category === filters.category);
    }
    
    if (filters.propertyId !== 'all') {
      result = result.filter(document => document.propertyId === filters.propertyId);
    }
    
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(document => 
        document.title.toLowerCase().includes(term) || 
        document.description.toLowerCase().includes(term)
      );
    }
    
    // Sort by date (newest first)
    result.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    
    setFilteredDocuments(result);
  }, [filters, documents]);

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };

  if (loading) return <div className="loading-spinner">Loading documents...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="document-library">
      <div className="document-header">
        <h1>Document Library</h1>
        {currentUser.role !== 'tenant' && (
          <a href="/documents/upload" className="upload-document-button">
            Upload Document
          </a>
        )}
      </div>
      
      <DocumentFilter 
        filters={filters}
        onFilterChange={handleFilterChange}
        userRole={currentUser.role}
      />
      
      <div className="documents-container">
        {filteredDocuments.length === 0 ? (
          <div className="no-documents">
            <p>No documents found matching your criteria.</p>
          </div>
        ) : (
          <div className="document-grid">
            {filteredDocuments.map(document => (
              <DocumentItem 
                key={document.id}
                document={document}
                userRole={currentUser.role}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentLibrary;
```

```jsx
// DocumentUploader.jsx
import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { uploadDocument } from '../services/documentService';
import { fetchProperties } from '../services/propertyService';
import { fetchTenants } from '../services/tenantService';
import './DocumentUploader.css';

const DocumentUploader = () => {
  const { currentUser } = useAuth();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'lease',
    visibility: 'all-tenants',
    propertyIds: [],
    tenantIds: [],
    requiresSignature: false,
    expiresAt: ''
  });
  const [file, setFile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setPropertiesLoading(true);
        const data = await fetchProperties();
        setProperties(data);
      } catch (err) {
        setError('Failed to load properties');
        console.error(err);
      } finally {
        setPropertiesLoading(false);
      }
    };

    loadProperties();
  }, []);

  useEffect(() => {
    if (formData.visibility === 'specific-tenants' && formData.propertyIds.length > 0) {
      const loadTenants = async () => {
        try {
          setTenantsLoading(true);
          const promises = formData.propertyIds.map(propertyId => 
            fetchTenants({ propertyId })
          );
          
          const results = await Promise.all(promises);
          const allTenants = results.flat();
          
          setTenants(allTenants);
        } catch (err) {
          setError('Failed to load tenants');
          console.error(err);
        } finally {
          setTenantsLoading(false);
        }
      };

      loadTenants();
    }
  }, [formData.visibility, formData.propertyIds]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData({ ...formData, [name]: checked });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handlePropertySelection = (e) => {
    const options = e.target.options;
    const selectedValues = [];
    
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedValues.push(options[i].value);
      }
    }
    
    setFormData({ 
      ...formData, 
      propertyIds: selectedValues,
      // Clear tenant selection when properties change
      tenantIds: []
    });
  };

  const handleTenantSelection = (e) => {
    const options = e.target.options;
    const selectedValues = [];
    
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedValues.push(options[i].value);
      }
    }
    
    setFormData({ ...formData, tenantIds: selectedValues });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    if (formData.visibility === 'specific-properties' && formData.propertyIds.length === 0) {
      setError('Please select at least one property');
      return;
    }
    
    if (formData.visibility === 'specific-tenants' && formData.tenantIds.length === 0) {
      setError('Please select at least one tenant');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('visibility', formData.visibility);
      formDataToSend.append('requiresSignature', formData.requiresSignature);
      formDataToSend.append('uploaderId', currentUser.id);
      
      if (formData.expiresAt) {
        formDataToSend.append('expiresAt', formData.expiresAt);
      }
      
      if (formData.propertyIds.length > 0) {
        formDataToSend.append('propertyIds', JSON.stringify(formData.propertyIds));
      }
      
      if (formData.tenantIds.length > 0) {
        formDataToSend.append('tenantIds', JSON.stringify(formData.tenantIds));
      }
      
      await uploadDocument(formDataToSend);
      
      setSuccess('Document uploaded successfully');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'lease',
        visibility: 'all-tenants',
        propertyIds: [],
        tenantIds: [],
        requiresSignature: false,
        expiresAt: ''
      });
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to upload document');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="document-uploader">
      <h1>Upload Document</h1>
      
      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Document Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter document title"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter document description"
            rows={3}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
          >
            <option value="lease">Lease Agreement</option>
            <option value="policy">Policy Document</option>
            <option value="notice">Notice</option>
            <option value="maintenance">Maintenance Document</option>
            <option value="financial">Financial Document</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="visibility">Visibility</label>
          <select
            id="visibility"
            name="visibility"
            value={formData.visibility}
            onChange={handleInputChange}
          >
            <option value="all-tenants">All Tenants</option>
            <option value="specific-properties">Specific Properties</option>
            <option value="specific-tenants">Specific Tenants</option>
            <option value="staff-only">Staff Only</option>
          </select>
        </div>
        
        {(formData.visibility === 'specific-properties' || formData.visibility === 'specific-tenants') && (
          <div className="form-group">
            <label htmlFor="propertyIds">Select Properties</label>
            {propertiesLoading ? (
              <div className="loading-spinner">Loading properties...</div>
            ) : (
              <select
                id="propertyIds"
                name="propertyIds"
                multiple
                value={formData.propertyIds}
                onChange={handlePropertySelection}
                className="property-select"
              >
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            )}
            <p className="help-text">Hold Ctrl (or Cmd) to select multiple properties</p>
          </div>
        )}
        
        {formData.visibility === 'specific-tenants' && formData.propertyIds.length > 0 && (
          <div className="form-group">
            <label htmlFor="tenantIds">Select Tenants</label>
            {tenantsLoading ? (
              <div className="loading-spinner">Loading tenants...</div>
            ) : (
              <select
                id="tenantIds"
                name="tenantIds"
                multiple
                value={formData.tenantIds}
                onChange={handleTenantSelection}
                className="tenant-select"
              >
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.firstName} {tenant.lastName} - {tenant.propertyName}, Unit {tenant.unitNumber}
                  </option>
                ))}
              </select>
            )}
            <p className="help-text">Hold Ctrl (or Cmd) to select multiple tenants</p>
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="file">Document File</label>
          <input
            type="file"
            id="file"
            name="file"
            onChange={handleFileChange}
            ref={fileInputRef}
            required
          />
          <p className="help-text">Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB)</p>
        </div>
        
        <div className="form-group checkbox">
          <input
            type="checkbox"
            id="requiresSignature"
            name="requiresSignature"
            checked={formData.requiresSignature}
            onChange={handleCheckboxChange}
          />
          <label htmlFor="requiresSignature">Requires signature</label>
        </div>
        
        <div className="form-group">
          <label htmlFor="expiresAt">Expiration Date (Optional)</label>
          <input
            type="date"
            id="expiresAt"
            name="expiresAt"
            value={formData.expiresAt}
            onChange={handleInputChange}
            min={new Date().toISOString().split('T')[0]}
          />
          <p className="help-text">Leave blank if the document doesn't expire</p>
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Uploading...' : 'Upload Document'}
          </button>
          <a href="/documents" className="cancel-link">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
};

export default DocumentUploader;
```

### 5. Communication Settings

The Communication Settings allow users to customize their communication preferences, including:

- Notification preferences
- Contact information management
- Message templates
- Automated communication rules
- Communication history

#### Implementation Details

```jsx
// CommunicationSettings.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchCommunicationSettings, updateCommunicationSettings } from '../services/communicationService';
import './CommunicationSettings.css';

const CommunicationSettings = () => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('preferences');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await fetchCommunicationSettings(currentUser.id);
        setSettings(data);
      } catch (err) {
        setError('Failed to load communication settings');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [currentUser.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [name]: value
    });
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setSettings({
      ...settings,
      [name]: checked
    });
  };

  const handleContactChange = (index, field, value) => {
    const updatedContacts = [...settings.emergencyContacts];
    updatedContacts[index] = {
      ...updatedContacts[index],
      [field]: value
    };
    
    setSettings({
      ...settings,
      emergencyContacts: updatedContacts
    });
  };

  const handleAddContact = () => {
    setSettings({
      ...settings,
      emergencyContacts: [
        ...settings.emergencyContacts,
        { name: '', relationship: '', phone: '', email: '' }
      ]
    });
  };

  const handleRemoveContact = (index) => {
    const updatedContacts = [...settings.emergencyContacts];
    updatedContacts.splice(index, 1);
    
    setSettings({
      ...settings,
      emergencyContacts: updatedContacts
    });
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await updateCommunicationSettings(currentUser.id, settings);
      setSuccess('Communication settings saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save communication settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-spinner">Loading communication settings...</div>;
  if (!settings) return <div className="error-message">{error || 'Failed to load settings'}</div>;

  return (
    <div className="communication-settings">
      <h1>Communication Settings</h1>
      
      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}
      
      <div className="settings-tabs">
        <button 
          className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </button>
        <button 
          className={`tab-button ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contacts')}
        >
          Emergency Contacts
        </button>
        <button 
          className={`tab-button ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Message Templates
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Communication History
        </button>
      </div>
      
      <div className="settings-content">
        {activeTab === 'preferences' && (
          <div className="preferences-tab">
            <h2>Communication Preferences</h2>
            
            <div className="form-group">
              <label htmlFor="preferredContactMethod">Preferred Contact Method</label>
              <select
                id="preferredContactMethod"
                name="preferredContactMethod"
                value={settings.preferredContactMethod}
                onChange={handleInputChange}
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="sms">SMS</option>
                <option value="app">In-App</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="emailAddress">Email Address</label>
              <input
                type="email"
                id="emailAddress"
                name="emailAddress"
                value={settings.emailAddress}
                onChange={handleInputChange}
                placeholder="Enter your email address"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={settings.phoneNumber}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
              />
            </div>
            
            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="receiveMarketingCommunications"
                name="receiveMarketingCommunications"
                checked={settings.receiveMarketingCommunications}
                onChange={handleCheckboxChange}
              />
              <label htmlFor="receiveMarketingCommunications">
                Receive marketing communications and newsletters
              </label>
            </div>
            
            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="receiveMaintenanceUpdates"
                name="receiveMaintenanceUpdates"
                checked={settings.receiveMaintenanceUpdates}
                onChange={handleCheckboxChange}
              />
              <label htmlFor="receiveMaintenanceUpdates">
                Receive maintenance updates and notifications
              </label>
            </div>
            
            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="receiveCommunityAnnouncements"
                name="receiveCommunityAnnouncements"
                checked={settings.receiveCommunityAnnouncements}
                onChange={handleCheckboxChange}
              />
              <label htmlFor="receiveCommunityAnnouncements">
                Receive community announcements and events
              </label>
            </div>
            
            <div className="form-group">
              <label htmlFor="quietHoursStart">Quiet Hours Start</label>
              <input
                type="time"
                id="quietHoursStart"
                name="quietHoursStart"
                value={settings.quietHoursStart}
                onChange={handleInputChange}
              />
              <p className="help-text">No notifications will be sent during quiet hours</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="quietHoursEnd">Quiet Hours End</label>
              <input
                type="time"
                id="quietHoursEnd"
                name="quietHoursEnd"
                value={settings.quietHoursEnd}
                onChange={handleInputChange}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'contacts' && (
          <div className="contacts-tab">
            <h2>Emergency Contacts</h2>
            <p className="tab-description">
              Add emergency contacts who should be notified in case of emergencies.
            </p>
            
            {settings.emergencyContacts.map((contact, index) => (
              <div key={index} className="contact-form">
                <h3>Contact #{index + 1}</h3>
                
                <div className="form-group">
                  <label htmlFor={`contact-name-${index}`}>Name</label>
                  <input
                    type="text"
                    id={`contact-name-${index}`}
                    value={contact.name}
                    onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                    placeholder="Contact name"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor={`contact-relationship-${index}`}>Relationship</label>
                  <input
                    type="text"
                    id={`contact-relationship-${index}`}
                    value={contact.relationship}
                    onChange={(e) => handleContactChange(index, 'relationship', e.target.value)}
                    placeholder="e.g., Spouse, Parent, Friend"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor={`contact-phone-${index}`}>Phone Number</label>
                  <input
                    type="tel"
                    id={`contact-phone-${index}`}
                    value={contact.phone}
                    onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                    placeholder="Contact phone number"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor={`contact-email-${index}`}>Email Address</label>
                  <input
                    type="email"
                    id={`contact-email-${index}`}
                    value={contact.email}
                    onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                    placeholder="Contact email address"
                  />
                </div>
                
                <button 
                  type="button" 
                  className="remove-contact-button"
                  onClick={() => handleRemoveContact(index)}
                >
                  Remove Contact
                </button>
              </div>
            ))}
            
            <button 
              type="button" 
              className="add-contact-button"
              onClick={handleAddContact}
            >
              Add Contact
            </button>
          </div>
        )}
        
        {activeTab === 'templates' && (
          <div className="templates-tab">
            <h2>Message Templates</h2>
            <p className="tab-description">
              Create and manage templates for frequently sent messages.
            </p>
            
            {settings.messageTemplates.map((template, index) => (
              <div key={index} className="template-form">
                <h3>{template.name}</h3>
                
                <div className="form-group">
                  <label htmlFor={`template-name-${index}`}>Template Name</label>
                  <input
                    type="text"
                    id={`template-name-${index}`}
                    value={template.name}
                    onChange={(e) => {
                      const updatedTemplates = [...settings.messageTemplates];
                      updatedTemplates[index] = {
                        ...updatedTemplates[index],
                        name: e.target.value
                      };
                      setSettings({
                        ...settings,
                        messageTemplates: updatedTemplates
                      });
                    }}
                    placeholder="Template name"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor={`template-content-${index}`}>Template Content</label>
                  <textarea
                    id={`template-content-${index}`}
                    value={template.content}
                    onChange={(e) => {
                      const updatedTemplates = [...settings.messageTemplates];
                      updatedTemplates[index] = {
                        ...updatedTemplates[index],
                        content: e.target.value
                      };
                      setSettings({
                        ...settings,
                        messageTemplates: updatedTemplates
                      });
                    }}
                    placeholder="Template content"
                    rows={4}
                  />
                </div>
                
                <button 
                  type="button" 
                  className="remove-template-button"
                  onClick={() => {
                    const updatedTemplates = [...settings.messageTemplates];
                    updatedTemplates.splice(index, 1);
                    setSettings({
                      ...settings,
                      messageTemplates: updatedTemplates
                    });
                  }}
                >
                  Remove Template
                </button>
              </div>
            ))}
            
            <button 
              type="button" 
              className="add-template-button"
              onClick={() => {
                setSettings({
                  ...settings,
                  messageTemplates: [
                    ...settings.messageTemplates,
                    { name: 'New Template', content: '' }
                  ]
                });
              }}
            >
              Add Template
            </button>
          </div>
        )}
        
        {activeTab === 'history' && (
          <div className="history-tab">
            <h2>Communication History</h2>
            <p className="tab-description">
              View your recent communication history.
            </p>
            
            <div className="history-filters">
              <div className="filter-group">
                <label htmlFor="history-type">Type:</label>
                <select id="history-type">
                  <option value="all">All</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="in-app">In-App</option>
                  <option value="notification">Notification</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label htmlFor="history-date">Date Range:</label>
                <select id="history-date">
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>
            </div>
            
            <div className="history-list">
              {settings.communicationHistory.length === 0 ? (
                <div className="no-history">
                  <p>No communication history found.</p>
                </div>
              ) : (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Subject</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.communicationHistory.map((item, index) => (
                      <tr key={index}>
                        <td>{new Date(item.date).toLocaleDateString()}</td>
                        <td>{item.type}</td>
                        <td>{item.subject}</td>
                        <td>
                          <span className={`status-badge status-${item.status.toLowerCase()}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="settings-actions">
        <button 
          className="save-button"
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default CommunicationSettings;
```

## API Services

The Communication Hub communicates with the backend through the following services:

### Messaging Service

```javascript
// messagingService.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/messaging`;

export const fetchConversations = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/conversations`, {
      params: { userId },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

export const fetchMessages = async (conversationId) => {
  try {
    const response = await axios.get(`${API_URL}/conversations/${conversationId}/messages`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

export const sendMessage = async (messageData) => {
  try {
    const response = await axios.post(`${API_URL}/messages`, messageData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const createConversation = async (conversationData) => {
  try {
    const response = await axios.post(`${API_URL}/conversations`, conversationData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

export const markConversationAsRead = async (conversationId, userId) => {
  try {
    const response = await axios.put(`${API_URL}/conversations/${conversationId}/read`, { userId }, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    throw error;
  }
};

export const fetchCommunicationSettings = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/settings/${userId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching communication settings:', error);
    throw error;
  }
};

export const updateCommunicationSettings = async (userId, settingsData) => {
  try {
    const response = await axios.put(`${API_URL}/settings/${userId}`, settingsData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating communication settings:', error);
    throw error;
  }
};
```

### Notification Service

```javascript
// notificationService.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/notifications`;

export const fetchNotifications = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}`, {
      params: { userId },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

export const markNotificationRead = async (notificationId) => {
  try {
    const response = await axios.put(`${API_URL}/${notificationId}/read`, {}, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const markAllNotificationsRead = async (userId) => {
  try {
    const response = await axios.put(`${API_URL}/read-all`, { userId }, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

export const fetchNotificationSettings = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/settings/${userId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    throw error;
  }
};

export const updateNotificationSettings = async (userId, settingsData) => {
  try {
    const response = await axios.put(`${API_URL}/settings/${userId}`, settingsData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
};

export const sendNotification = async (notificationData) => {
  try {
    const response = await axios.post(`${API_URL}/send`, notificationData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};
```

### Announcement Service

```javascript
// announcementService.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/announcements`;

export const fetchAnnouncements = async (params = {}) => {
  try {
    const response = await axios.get(`${API_URL}`, {
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching announcements:', error);
    throw error;
  }
};

export const fetchAnnouncementDetails = async (announcementId) => {
  try {
    const response = await axios.get(`${API_URL}/${announcementId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching announcement details:', error);
    throw error;
  }
};

export const createAnnouncement = async (announcementData) => {
  try {
    const response = await axios.post(`${API_URL}`, announcementData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }
};

export const updateAnnouncement = async (announcementId, announcementData) => {
  try {
    const response = await axios.put(`${API_URL}/${announcementId}`, announcementData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating announcement:', error);
    throw error;
  }
};

export const deleteAnnouncement = async (announcementId) => {
  try {
    const response = await axios.delete(`${API_URL}/${announcementId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting announcement:', error);
    throw error;
  }
};

export const markAnnouncementRead = async (announcementId, userId) => {
  try {
    const response = await axios.put(`${API_URL}/${announcementId}/read`, { userId }, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error marking announcement as read:', error);
    throw error;
  }
};
```

### Document Service

```javascript
// documentService.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/documents`;

export const fetchDocuments = async (params = {}) => {
  try {
    const response = await axios.get(`${API_URL}`, {
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

export const fetchDocumentDetails = async (documentId) => {
  try {
    const response = await axios.get(`${API_URL}/${documentId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching document details:', error);
    throw error;
  }
};

export const uploadDocument = async (formData) => {
  try {
    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

export const updateDocument = async (documentId, documentData) => {
  try {
    const response = await axios.put(`${API_URL}/${documentId}`, documentData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

export const deleteDocument = async (documentId) => {
  try {
    const response = await axios.delete(`${API_URL}/${documentId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

export const shareDocument = async (documentId, shareData) => {
  try {
    const response = await axios.post(`${API_URL}/${documentId}/share`, shareData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sharing document:', error);
    throw error;
  }
};

export const signDocument = async (documentId, signatureData) => {
  try {
    const response = await axios.post(`${API_URL}/${documentId}/sign`, signatureData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error signing document:', error);
    throw error;
  }
};
```

## WebSocket Context

To enable real-time communication, we'll implement a WebSocket context provider:

```jsx
// WebSocketContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { WEBSOCKET_URL } from '../config';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let socketInstance = null;

    if (isAuthenticated && currentUser) {
      // Initialize socket connection
      socketInstance = io(WEBSOCKET_URL, {
        auth: {
          token: localStorage.getItem('token')
        },
        query: {
          userId: currentUser.id
        }
      });

      // Set up event listeners
      socketInstance.on('connect', () => {
        console.log('WebSocket connected');
        setConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setConnected(false);
      });

      socketInstance.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Save socket instance to state
      setSocket(socketInstance);
    }

    // Clean up on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [isAuthenticated, currentUser]);

  return (
    <WebSocketContext.Provider value={{ socket, connected }}>
      {children}
    </WebSocketContext.Provider>
  );
};
```

## Database Schema Updates

To support the Communication Hub, the following database tables need to be created or updated:

```sql
-- Conversations Table
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  type VARCHAR(50) NOT NULL, -- 'direct' or 'group'
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Conversation Participants Table
CREATE TABLE conversation_participants (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),
  user_id INTEGER REFERENCES users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP WITH TIME ZONE,
  is_admin BOOLEAN DEFAULT FALSE,
  UNIQUE(conversation_id, user_id)
);

-- Messages Table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),
  sender_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_system_message BOOLEAN DEFAULT FALSE
);

-- Message Attachments Table
CREATE TABLE message_attachments (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id),
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Message Read Status Table
CREATE TABLE message_read_status (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id),
  user_id INTEGER REFERENCES users(id),
  read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id)
);

-- Notifications Table
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  source_id VARCHAR(50),
  action_url VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification Settings Table
CREATE TABLE notification_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  category VARCHAR(50) NOT NULL,
  channel VARCHAR(50) NOT NULL, -- 'email', 'push', 'sms', 'in_app'
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category, channel)
);

-- Announcements Table
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER REFERENCES users(id),
  category VARCHAR(50) NOT NULL,
  target_audience VARCHAR(50) NOT NULL, -- 'all-tenants', 'specific-properties', 'staff-only'
  is_pinned BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Announcement Properties Table (for targeting specific properties)
CREATE TABLE announcement_properties (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER REFERENCES announcements(id),
  property_id INTEGER REFERENCES properties(id),
  UNIQUE(announcement_id, property_id)
);

-- Announcement Read Status Table
CREATE TABLE announcement_read_status (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER REFERENCES announcements(id),
  user_id INTEGER REFERENCES users(id),
  read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(announcement_id, user_id)
);

-- Documents Table
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  uploader_id INTEGER REFERENCES users(id),
  visibility VARCHAR(50) NOT NULL, -- 'all-tenants', 'specific-properties', 'specific-tenants', 'staff-only'
  requires_signature BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Properties Table (for targeting specific properties)
CREATE TABLE document_properties (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id),
  property_id INTEGER REFERENCES properties(id),
  UNIQUE(document_id, property_id)
);

-- Document Users Table (for targeting specific users)
CREATE TABLE document_users (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id),
  user_id INTEGER REFERENCES users(id),
  UNIQUE(document_id, user_id)
);

-- Document Signatures Table
CREATE TABLE document_signatures (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id),
  user_id INTEGER REFERENCES users(id),
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(50),
  user_agent TEXT,
  UNIQUE(document_id, user_id)
);

-- Communication Settings Table
CREATE TABLE communication_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  preferred_contact_method VARCHAR(50) NOT NULL DEFAULT 'email',
  email_address VARCHAR(255),
  phone_number VARCHAR(20),
  receive_marketing_communications BOOLEAN DEFAULT TRUE,
  receive_maintenance_updates BOOLEAN DEFAULT TRUE,
  receive_community_announcements BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Emergency Contacts Table
CREATE TABLE emergency_contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(200) NOT NULL,
  relationship VARCHAR(100),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Message Templates Table
CREATE TABLE message_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Testing Strategy

The Communication Hub will be tested using the following approach:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions and API service calls
3. **WebSocket Tests**: Test real-time communication functionality
4. **End-to-End Tests**: Test complete user flows

### Example Unit Test

```javascript
// MessagingCenter.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MessagingCenter from './MessagingCenter';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { fetchConversations, fetchMessages, sendMessage } from '../services/messagingService';

// Mock the hooks and services
jest.mock('../contexts/AuthContext');
jest.mock('../contexts/WebSocketContext');
jest.mock('../services/messagingService');

describe('MessagingCenter Component', () => {
  const mockCurrentUser = { id: 'user-1', name: 'Test User' };
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  };
  
  const mockConversations = [
    {
      id: 'conv-1',
      name: null,
      type: 'direct',
      participants: [
        { id: 'user-1', name: 'Test User' },
        { id: 'user-2', name: 'John Doe' }
      ],
      lastMessage: 'Hello there',
      lastMessageTime: '2023-01-01T12:00:00Z',
      unreadCount: 0
    },
    {
      id: 'conv-2',
      name: 'Property Managers',
      type: 'group',
      participants: [
        { id: 'user-1', name: 'Test User' },
        { id: 'user-3', name: 'Jane Smith' },
        { id: 'user-4', name: 'Bob Johnson' }
      ],
      lastMessage: 'Meeting tomorrow',
      lastMessageTime: '2023-01-02T10:00:00Z',
      unreadCount: 2
    }
  ];
  
  const mockMessages = [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-2',
      content: 'Hello there',
      timestamp: '2023-01-01T12:00:00Z',
      readBy: ['user-1', 'user-2'],
      attachments: []
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'Hi! How are you?',
      timestamp: '2023-01-01T12:01:00Z',
      readBy: ['user-1'],
      attachments: []
    }
  ];

  beforeEach(() => {
    useAuth.mockReturnValue({ currentUser: mockCurrentUser });
    useWebSocket.mockReturnValue({ socket: mockSocket, connected: true });
    fetchConversations.mockResolvedValue(mockConversations);
    fetchMessages.mockResolvedValue(mockMessages);
    sendMessage.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    render(<MessagingCenter />);
    expect(screen.getByText('Loading conversations...')).toBeInTheDocument();
  });

  test('renders conversations and selects the first one by default', async () => {
    render(<MessagingCenter />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Property Managers')).toBeInTheDocument();
    expect(fetchMessages).toHaveBeenCalledWith('conv-1');
  });

  test('displays messages for the selected conversation', async () => {
    render(<MessagingCenter />);
    
    await waitFor(() => {
      expect(screen.getByText('Hello there')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Hi! How are you?')).toBeInTheDocument();
  });

  test('sends a new message when the form is submitted', async () => {
    render(<MessagingCenter />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });
    
    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByText('Send');
    
    fireEvent.change(input, { target: { value: 'New test message' } });
    fireEvent.click(sendButton);
    
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'New test message'
    }));
  });

  test('switches to a different conversation when clicked', async () => {
    render(<MessagingCenter />);
    
    await waitFor(() => {
      expect(screen.getByText('Property Managers')).toBeInTheDocument();
    });
    
    const groupConversation = screen.getByText('Property Managers');
    fireEvent.click(groupConversation);
    
    expect(fetchMessages).toHaveBeenCalledWith('conv-2');
    expect(mockSocket.emit).toHaveBeenCalledWith('mark_conversation_read', {
      conversationId: 'conv-2',
      userId: 'user-1'
    });
  });

  test('sets up WebSocket listeners for real-time updates', async () => {
    render(<MessagingCenter />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    expect(mockSocket.on).toHaveBeenCalledWith('new_message', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('message_read', expect.any(Function));
  });
});
```

## Deployment Considerations

When deploying the Communication Hub, consider the following:

1. **WebSocket Infrastructure**:
   - Use a scalable WebSocket server (e.g., Socket.IO with Redis adapter)
   - Implement proper connection pooling and load balancing
   - Set up heartbeat mechanisms to detect disconnections

2. **Real-time Performance**:
   - Optimize message delivery for low latency
   - Implement message queuing for offline users
   - Use efficient data structures for conversation and message storage

3. **Security Measures**:
   - Authenticate WebSocket connections with JWT tokens
   - Implement proper authorization for message access
   - Encrypt sensitive communication data
   - Validate all user inputs to prevent injection attacks

4. **Notification Delivery**:
   - Set up reliable push notification services (e.g., Firebase Cloud Messaging)
   - Implement email delivery with proper SPF and DKIM records
   - Use SMS gateways with retry mechanisms

5. **Scalability**:
   - Design the system to handle thousands of concurrent connections
   - Implement database sharding for large message volumes
   - Use caching for frequently accessed conversations and messages

## Integration Points

The Communication Hub integrates with the following components:

1. **Tenant Interface**: Provides messaging, notifications, and document access for tenants
2. **Property Management Interface**: Enables property managers to communicate with tenants and staff
3. **Reporting and Analytics**: Provides communication metrics and analytics
4. **Integration Framework**: Connects with email services, SMS gateways, and push notification providers
5. **AI Enhancement Layer**: Utilizes AI for message categorization, sentiment analysis, and automated responses

## Next Steps

After implementing the Communication Hub, the following steps should be taken:

1. Conduct user testing with tenants, property managers, and staff
2. Gather feedback and make improvements to the user interface and functionality
3. Implement additional features based on user needs
4. Optimize performance for large-scale deployments
5. Enhance with AI capabilities for automated communication and sentiment analysis

## Handoff Document Updates

To add this component to the handoff document:

1. Copy this entire design document to the handoff document under a new section titled "Communication Hub Component"
2. Update the implementation status in the handoff document
3. Add links to the relevant code files in the GitHub repository
4. Update the component dependencies diagram to show the Communication Hub connections
