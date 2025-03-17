import React from 'react';
import { Link } from 'react-router-dom';
import { 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Collapse,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Home as HomeIcon,
  People as PeopleIcon,
  Description as DescriptionIcon,
  AttachMoney as MoneyIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore
} from '@mui/icons-material';
import { useState } from 'react';

/**
 * Navigation component for the main sidebar
 * Includes links to all major sections of the application
 * with special emphasis on the Advanced Accounting Module
 */
const Navigation = () => {
  // State for managing menu collapse
  const [openAccounting, setOpenAccounting] = useState(true);
  const [openSettings, setOpenSettings] = useState(false);
  
  // Toggle handlers
  const handleAccountingClick = () => {
    setOpenAccounting(!openAccounting);
  };
  
  const handleSettingsClick = () => {
    setOpenSettings(!openSettings);
  };
  
  return (
    <List component="nav">
      {/* Dashboard */}
      <ListItem button component={Link} to="/app/dashboard">
        <ListItemIcon>
          <DashboardIcon />
        </ListItemIcon>
        <ListItemText primary="Dashboard" />
      </ListItem>
      
      {/* Properties */}
      <ListItem button component={Link} to="/app/properties">
        <ListItemIcon>
          <HomeIcon />
        </ListItemIcon>
        <ListItemText primary="Properties" />
      </ListItem>
      
      {/* Tenants */}
      <ListItem button component={Link} to="/app/tenants">
        <ListItemIcon>
          <PeopleIcon />
        </ListItemIcon>
        <ListItemText primary="Tenants" />
      </ListItem>
      
      {/* Leases */}
      <ListItem button component={Link} to="/app/leases">
        <ListItemIcon>
          <DescriptionIcon />
        </ListItemIcon>
        <ListItemText primary="Leases" />
      </ListItem>
      
      <Divider />
      
      {/* Advanced Accounting Module */}
      <ListItem button onClick={handleAccountingClick}>
        <ListItemIcon>
          <MoneyIcon />
        </ListItemIcon>
        <ListItemText primary="Accounting" />
        {openAccounting ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      
      <Collapse in={openAccounting} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {/* Rent Tracking */}
          <ListItem button component={Link} to="/app/accounting/rent-tracking" sx={{ pl: 4 }}>
            <ListItemIcon>
              <MoneyIcon />
            </ListItemIcon>
            <ListItemText primary="Rent Tracking" />
          </ListItem>
          
          {/* Trust Accounts */}
          <ListItem button component={Link} to="/app/accounting/trust-accounts" sx={{ pl: 4 }}>
            <ListItemIcon>
              <AccountBalanceIcon />
            </ListItemIcon>
            <ListItemText primary="Trust Accounts" />
          </ListItem>
          
          {/* Expense Management */}
          <ListItem button component={Link} to="/app/accounting/expenses" sx={{ pl: 4 }}>
            <ListItemIcon>
              <ReceiptIcon />
            </ListItemIcon>
            <ListItemText primary="Expenses" />
          </ListItem>
          
          {/* Financial Reporting */}
          <ListItem button component={Link} to="/app/accounting/reports" sx={{ pl: 4 }}>
            <ListItemIcon>
              <AssessmentIcon />
            </ListItemIcon>
            <ListItemText primary="Reports" />
          </ListItem>
          
          {/* Late Fee Configuration */}
          <ListItem button component={Link} to="/app/accounting/late-fees" sx={{ pl: 4 }}>
            <ListItemIcon>
              <WarningIcon />
            </ListItemIcon>
            <ListItemText primary="Late Fees" />
          </ListItem>
        </List>
      </Collapse>
      
      <Divider />
      
      {/* Settings */}
      <ListItem button onClick={handleSettingsClick}>
        <ListItemIcon>
          <SettingsIcon />
        </ListItemIcon>
        <ListItemText primary="Settings" />
        {openSettings ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      
      <Collapse in={openSettings} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          <ListItem button component={Link} to="/app/settings/profile" sx={{ pl: 4 }}>
            <ListItemText primary="User Profile" />
          </ListItem>
          
          <ListItem button component={Link} to="/app/settings/company" sx={{ pl: 4 }}>
            <ListItemText primary="Company Settings" />
          </ListItem>
          
          <ListItem button component={Link} to="/app/settings/system" sx={{ pl: 4 }}>
            <ListItemText primary="System Settings" />
          </ListItem>
        </List>
      </Collapse>
    </List>
  );
};

export default Navigation;
