import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Badge,
  InputAdornment,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Notifications as NotificationsIcon,
  InsertPhoto as PhotoIcon,
  PictureAsPdf as PdfIcon,
  Description as DocumentIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { 
  fetchMessageThreads, 
  fetchThreadMessages, 
  sendMessage, 
  createMessageThread 
} from '../../../services/tenant/tenantService';

const Communication = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [newThreadDialog, setNewThreadDialog] = useState(false);
  const [newThreadData, setNewThreadData] = useState({
    subject: '',
    recipients: [],
    message: ''
  });
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // In a real implementation, this would come from authentication context
  const tenantId = 'current-tenant-id';

  useEffect(() => {
    const loadThreads = async () => {
      try {
        setLoading(true);
        const data = await fetchMessageThreads(tenantId);
        setThreads(data);
        
        // Select the first thread by default if available
        if (data.length > 0 && !selectedThread) {
          setSelectedThread(data[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to load message threads:', err);
        setError('Failed to load messages. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadThreads();
  }, [tenantId]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedThread) return;
      
      try {
        setMessagesLoading(true);
        const data = await fetchThreadMessages(tenantId, selectedThread.id);
        setMessages(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load thread messages:', err);
        setError('Failed to load conversation. Please try again later.');
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [tenantId, selectedThread]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleThreadSelect = (thread) => {
    setSelectedThread(thread);
  };

  const handleNewMessageChange = (event) => {
    setNewMessage(event.target.value);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return;
    
    try {
      setSendingMessage(true);
      
      const messageData = {
        content: newMessage,
        timestamp: new Date().toISOString()
      };
      
      const sentMessage = await sendMessage(tenantId, selectedThread.id, messageData);
      
      // Add the new message to the messages list
      setMessages(prev => [...prev, sentMessage]);
      
      // Clear the input field
      setNewMessage('');
      
      setError(null);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again later.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleNewThreadDialogOpen = () => {
    setNewThreadDialog(true);
  };

  const handleNewThreadDialogClose = () => {
    setNewThreadDialog(false);
  };

  const handleNewThreadDataChange = (e) => {
    const { name, value } = e.target;
    setNewThreadData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateThread = async () => {
    try {
      setLoading(true);
      
      const threadData = {
        subject: newThreadData.subject,
        recipients: ['property-manager'], // In a real app, this would be actual recipient IDs
        initialMessage: newThreadData.message
      };
      
      const newThread = await createMessageThread(tenantId, threadData);
      
      // Add the new thread to the threads list
      setThreads(prev => [newThread, ...prev]);
      
      // Select the new thread
      setSelectedThread(newThread);
      
      // Close the dialog
      setNewThreadDialog(false);
      
      // Reset the form
      setNewThreadData({
        subject: '',
        recipients: [],
        message: ''
      });
      
      setError(null);
    } catch (err) {
      console.error('Failed to create message thread:', err);
      setError('Failed to create new conversation. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Mock data for development - would be replaced by actual data in production
  const mockThreads = [
    {
      id: 1,
      subject: 'Lease Renewal',
      participants: [
        { id: 'property-manager', name: 'Property Manager', role: 'manager' },
        { id: 'current-tenant-id', name: 'John Doe', role: 'tenant' }
      ],
      lastMessage: {
        content: 'Please let me know if you have any questions about the lease renewal options.',
        sender: 'property-manager',
        timestamp: '2023-03-20T14:30:00Z',
        isRead: true
      },
      unreadCount: 0
    },
    {
      id: 2,
      subject: 'Maintenance Request #1234',
      participants: [
        { id: 'maintenance', name: 'Maintenance Team', role: 'maintenance' },
        { id: 'current-tenant-id', name: 'John Doe', role: 'tenant' }
      ],
      lastMessage: {
        content: 'We have scheduled a technician to visit on Friday between 9am and 12pm.',
        sender: 'maintenance',
        timestamp: '2023-03-19T10:15:00Z',
        isRead: false
      },
      unreadCount: 1
    },
    {
      id: 3,
      subject: 'Parking Permit',
      participants: [
        { id: 'property-manager', name: 'Property Manager', role: 'manager' },
        { id: 'current-tenant-id', name: 'John Doe', role: 'tenant' }
      ],
      lastMessage: {
        content: 'Your new parking permit is ready for pickup at the leasing office.',
        sender: 'property-manager',
        timestamp: '2023-03-15T16:45:00Z',
        isRead: true
      },
      unreadCount: 0
    }
  ];

  const mockMessages = {
    1: [
      {
        id: 101,
        threadId: 1,
        sender: 'property-manager',
        senderName: 'Property Manager',
        content: 'Hello John, I wanted to inform you that your lease is coming up for renewal in 60 days.',
        timestamp: '2023-03-18T09:00:00Z',
        isRead: true
      },
      {
        id: 102,
        threadId: 1,
        sender: 'current-tenant-id',
        senderName: 'John Doe',
        content: 'Thanks for letting me know. What are my options for renewal?',
        timestamp: '2023-03-18T10:30:00Z',
        isRead: true
      },
      {
        id: 103,
        threadId: 1,
        sender: 'property-manager',
        senderName: 'Property Manager',
        content: 'You have several options: 1) Renew for 12 months with a 3% increase, 2) Renew for 6 months with a 5% increase, or 3) Switch to month-to-month with a 10% increase.',
        timestamp: '2023-03-19T11:15:00Z',
        isRead: true
      },
      {
        id: 104,
        threadId: 1,
        sender: 'current-tenant-id',
        senderName: 'John Doe',
        content: 'I think I would prefer the 12-month option. How do I proceed with that?',
        timestamp: '2023-03-19T14:20:00Z',
        isRead: true
      },
      {
        id: 105,
        threadId: 1,
        sender: 'property-manager',
        senderName: 'Property Manager',
        content: 'Great choice! I will prepare the renewal documents and send them to you via the portal. You will be able to review and sign them electronically.',
        timestamp: '2023-03-20T09:45:00Z',
        isRead: true
      },
      {
        id: 106,
        threadId: 1,
        sender: 'property-manager',
        senderName: 'Property Manager',
        content: 'Please let me know if you have any questions about the lease renewal options.',
        timestamp: '2023-03-20T14:30:00Z',
        isRead: true,
        attachments: [
          { id: 1, name: 'Lease_Renewal_Options.pdf', type: 'pdf', size: '1.2 MB' }
        ]
      }
    ],
    2: [
      {
        id: 201,
        threadId: 2,
        sender: 'current-tenant-id',
        senderName: 'John Doe',
        content: 'Hello, I would like to report a leaky faucet in my kitchen. It has been dripping constantly for the past two days.',
        timestamp: '2023-03-17T08:30:00Z',
        isRead: true,
        attachments: [
          { id: 2, name: 'leaky_faucet.jpg', type: 'image', size: '2.4 MB' }
        ]
      },
      {
        id: 202,
        threadId: 2,
        sender: 'maintenance',
        senderName: 'Maintenance Team',
        content: 'Thank you for reporting this issue. We have created maintenance request #1234 for this issue.',
        timestamp: '2023-03-17T09:15:00Z',
        isRead: true
      },
      {
        id: 203,
        threadId: 2,
        sender: 'current-tenant-id',
        senderName: 'John Doe',
        content: 'Thank you. When can I expect someone to come and fix it?',
        timestamp: '2023-03-17T10:00:00Z',
        isRead: true
      },
      {
        id: 204,
        threadId: 2,
        sender: 'maintenance',
        senderName: 'Maintenance Team',
        content: 'We are currently scheduling this repair. We will let you know as soon as we have a confirmed time slot.',
        timestamp: '2023-03-18T11:30:00Z',
        isRead: true
      },
      {
        id: 205,
        threadId: 2,
        sender: 'maintenance',
        senderName: 'Maintenance Team',
        content: 'We have scheduled a technician to visit on Friday between 9am and 12pm.',
        timestamp: '2023-03-19T10:15:00Z',
        isRead: false
      }
    ],
    3: [
      {
        id: 301,
        threadId: 3,
        sender: 'current-tenant-id',
        senderName: 'John Doe',
        content: 'Hello, I recently purchased a new car and need to update my parking permit. How do I go about doing this?',
        timestamp: '2023-03-14T13:20:00Z',
        isRead: true
      },
      {
        id: 302,
        threadId: 3,
        sender: 'property-manager',
        senderName: 'Property Manager',
        content: 'Hi John, you will need to fill out a new parking permit form and provide your new vehicle information. You can do this at the leasing office or I can send you the form to fill out online.',
        timestamp: '2023-03-14T14:45:00Z',
        isRead: true
      },
      {
        id: 303,
        threadId: 3,
        sender: 'current-tenant-id',
        senderName: 'John Doe',
        content: 'Please send me the form online if possible. That would be more convenient for me.',
        timestamp: '2023-03-14T15:30:00Z',
        isRead: true
      },
      {
        id: 304,
        threadId: 3,
        sender: 'property-manager',
        senderName: 'Property Manager',
        content: 'I have attached the parking permit form. Please fill it out and submit it through the portal or email it back to me.',
        timestamp: '2023-03-14T16:15:00Z',
        isRead: true,
        attachments: [
          { id: 3, name: 'Parking_Permit_Form.pdf', type: 'pdf', size: '0.8 MB' }
        ]
      },
      {
        id: 305,
        threadId: 3,
        sender: 'current-tenant-id',
        senderName: 'John Doe',
        content: 'Thank you. I have completed the form and attached it to this message.',
        timestamp: '2023-03-15T09:30:00Z',
        isRead: true,
        attachments: [
          { id: 4, name: 'Completed_Parking_Permit.pdf', type: 'pdf', size: '1.0 MB' }
        ]
      },
      {
        id: 306,
        threadId: 3,
        sender: 'property-manager',
        senderName: 'Property Manager',
        content: 'Your new parking permit is ready for pickup at the leasing office.',
        timestamp: '2023-03-15T16:45:00Z',
        isRead: true
      }
    ]
  };

  // Use mock data for now, would use API data in production
  const displayThreads = threads.length > 0 ? threads : mockThreads;
  const displayMessages = messages.length > 0 ? messages : (selectedThread ? mockMessages[selectedThread.id] : []);

  // Filter threads based on search term
  const filteredThreads = displayThreads.filter(thread => 
    searchTerm === '' || 
    thread.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    thread.participants.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading && !threads.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading messages...</Typography>
      </Box>
    );
  }

  const getParticipantIcon = (role) => {
    switch (role) {
      case 'manager':
        return <PersonIcon />;
      case 'maintenance':
        return <PersonIcon />;
      case 'tenant':
        return <PersonIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const getAttachmentIcon = (type) => {
    switch (type) {
      case 'pdf':
        return <PdfIcon color="error" />;
      case 'image':
        return <PhotoIcon color="primary" />;
      default:
        return <DocumentIcon color="action" />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Messages
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="All Messages" />
          <Tab label="Unread" />
          <Tab label="Important" />
        </Tabs>
      </Paper>
      
      <Grid container spacing={2}>
        {/* Message Threads List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Conversations
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  size="small"
                  onClick={handleNewThreadDialogOpen}
                >
                  New Message
                </Button>
              </Box>
              <TextField
                fullWidth
                placeholder="Search messages..."
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                }}
                variant="outlined"
                size="small"
              />
            </Box>
            
            <Box sx={{<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with `grep -n` in order to find the line numbers of what you are looking for.</NOTE>