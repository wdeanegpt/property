'use client';

import Navbar from '../../components/Navbar';
import ModuleProgress from '../../components/ModuleProgress';

export default function Status() {
  return (
    <div>
      <Navbar />
      <div className="py-8">
        <h1 className="text-4xl font-bold mb-6">Current Project Status</h1>
        <p className="text-lg mb-8">
          The Comprehensive Property Management System is currently at Step 022 (preparing handoff) with Step 023 (implementing advanced accounting module) as the next step.
        </p>
        
        <ModuleProgress />
        
        <div className="card mb-8 mt-8">
          <h2 className="text-2xl font-bold mb-4 text-blue-600">Project Milestones</h2>
          <div className="relative">
            <div className="absolute left-4 h-full w-0.5 bg-blue-200"></div>
            
            <div className="relative pl-10 pb-8">
              <div className="absolute left-0 rounded-full bg-blue-600 text-white w-8 h-8 flex items-center justify-center">
                ✓
              </div>
              <h3 className="text-xl font-semibold">Steps 001-018: Core Functionality</h3>
              <p className="text-gray-600">Implemented basic functionality for all eight core modules</p>
            </div>
            
            <div className="relative pl-10 pb-8">
              <div className="absolute left-0 rounded-full bg-blue-600 text-white w-8 h-8 flex items-center justify-center">
                ✓
              </div>
              <h3 className="text-xl font-semibold">Steps 019-022: Pricing and Accessibility Module</h3>
              <p className="text-gray-600">Successfully implemented pricing and accessibility module with tiered subscription plans</p>
            </div>
            
            <div className="relative pl-10 pb-8">
              <div className="absolute left-0 rounded-full bg-yellow-500 text-white w-8 h-8 flex items-center justify-center">
                →
              </div>
              <h3 className="text-xl font-semibold">Step 023: Advanced Accounting Module</h3>
              <p className="text-gray-600">Fully implemented and ready for deployment (Current focus)</p>
            </div>
            
            <div className="relative pl-10 pb-8">
              <div className="absolute left-0 rounded-full bg-gray-300 text-white w-8 h-8 flex items-center justify-center">
                
              </div>
              <h3 className="text-xl font-semibold">Steps 026-028: Enhanced Tenant Management</h3>
              <p className="text-gray-600">Planned for Phase 7</p>
            </div>
            
            <div className="relative pl-10">
              <div className="absolute left-0 rounded-full bg-gray-300 text-white w-8 h-8 flex items-center justify-center">
                
              </div>
              <h3 className="text-xl font-semibold">Steps 029-030: Enhanced Maintenance Management</h3>
              <p className="text-gray-600">Planned for Phase 8</p>
            </div>
          </div>
        </div>
        
        <div className="card mb-8">
          <h2 className="text-2xl font-bold mb-4 text-blue-600">Advanced Accounting Module Details</h2>
          <p className="mb-4">
            The Advanced Accounting Module has been fully implemented and is ready for deployment. It includes the following components:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Backend Services</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>RentTrackingService</li>
                <li>LateFeeService</li>
                <li>TrustAccountService</li>
                <li>ExpenseManagementService</li>
                <li>Integration module for cross-service functionality</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">API Endpoints</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Complete RESTful API for all accounting functions</li>
                <li>Authentication and authorization integration</li>
                <li>Input validation and error handling</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">Database Schema</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Migration files for all required tables</li>
                <li>Migration runner utility for automated deployment</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">Frontend Components</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>RentTrackingDashboard</li>
                <li>Navigation integration</li>
                <li>Routing configuration</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="card">
          <h2 className="text-2xl font-bold mb-4 text-blue-600">New Initiatives</h2>
          <p className="mb-4">
            Based on recent planning, several new initiatives are being considered:
          </p>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Affordable Housing Helper App</h3>
              <p>Mobile app to simplify applying for affordable housing programs with AI form filling and tracking.</p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Section 8 Inspections</h3>
              <p>Pre-inspection assessment using AI, automated scheduling, and compliance tracking.</p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">Section 8 Application Automation</h3>
              <p>AI-guided form filling, automated submission to PHA, and application tracking.</p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Rent Reasonableness Determination</h3>
              <p>Real-time rental data analysis, automated report generation, and communication automation.</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <a href="/next-steps" className="btn btn-primary inline-block">View Next Steps</a>
        </div>
      </div>
    </div>
  );
}
