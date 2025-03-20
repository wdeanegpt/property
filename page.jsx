'use client';

import React from 'react';
import Navbar from '../components/Navbar';

export default function Home() {
  return (
    <div>
      <Navbar />
      <div className="py-8">
        <h1 className="text-4xl font-bold mb-6">Comprehensive Property Management System</h1>
        <p className="text-lg mb-8">
          A full-featured property management platform with AI-enhanced capabilities, serving tenants, landlords, property managers, and housing authorities across all 50 U.S. states.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="card">
            <h2 className="text-2xl font-bold mb-4 text-blue-600">Project Overview</h2>
            <p className="mb-4">
              The Comprehensive Property Management System evolved from an affordable housing application focused on HUD programs into a comprehensive platform with AI-enhanced features. The system provides a robust set of features organized into eight core modules.
            </p>
            <a href="/modules" className="btn btn-primary inline-block">Explore Modules</a>
          </div>
          
          <div className="card">
            <h2 className="text-2xl font-bold mb-4 text-blue-600">Current Status</h2>
            <p className="mb-4">
              The project is currently at Step 022 (preparing handoff) with Step 023 (implementing advanced accounting module) as the next step. The Advanced Accounting Module is fully implemented and ready for deployment.
            </p>
            <a href="/status" className="btn btn-primary inline-block">View Status</a>
          </div>
        </div>
        
        <div className="card">
          <h2 className="text-2xl font-bold mb-4 text-blue-600">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">AI-Enhanced Capabilities</h3>
              <p>Form filling automation, pricing recommendations, cash flow prediction, tenant turnover prediction, and predictive maintenance.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">HUD Integration</h3>
              <p>Direct connection with HUD systems across all 50 states, automating form submissions and ensuring compliance.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Tiered Pricing Model</h3>
              <p>Free tier (up to 5 units), Standard tier ($2/unit/month), and Enterprise tier (custom pricing).</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Multi-Platform Support</h3>
              <p>Web application, mobile application (iOS/Android), and progressive web app.</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Continue Development?</h2>
          <p className="mb-4">Explore our recommended next steps for continuing the project.</p>
          <a href="/next-steps" className="btn btn-primary inline-block">View Next Steps</a>
        </div>
      </div>
    </div>
  );
}
