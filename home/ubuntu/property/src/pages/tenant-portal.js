import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import TenantPortal from '../components/tenant-portal/TenantPortal';

const TenantPortalPage = () => {
  return (
    <Router>
      <TenantPortal />
    </Router>
  );
};

export default TenantPortalPage;
