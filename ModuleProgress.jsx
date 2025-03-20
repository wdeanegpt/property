'use client';

import React from 'react';
import ProgressBar from './ProgressBar';

const ModuleProgress = () => {
  const [showDetails, setShowDetails] = React.useState(false);
  
  const modules = [
    { name: 'Tenant Management', progress: 60, color: 'yellow' },
    { name: 'Property Management', progress: 70, color: 'yellow' },
    { name: 'Financial Management', progress: 100, color: 'green' },
    { name: 'Maintenance Management', progress: 50, color: 'yellow' },
    { name: 'Communication Hub', progress: 65, color: 'yellow' },
    { name: 'Reporting and Analytics', progress: 65, color: 'yellow' },
    { name: 'Pricing and Accessibility', progress: 100, color: 'green' },
    { name: 'Integration and API', progress: 60, color: 'yellow' }
  ];
  
  const overallProgress = Math.round(
    modules.reduce((sum, module) => sum + module.progress, 0) / modules.length
  );
  
  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4 text-blue-600">Implementation Progress</h2>
      
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Overall Progress</h3>
        <ProgressBar percentage={overallProgress} color="blue" />
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Module Progress</h3>
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
            <svg 
              className={`ml-1 w-4 h-4 transition-transform duration-300 ${showDetails ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className={`overflow-hidden transition-all duration-500 ${showDetails ? 'max-h-96' : 'max-h-0'}`}>
        {modules.map((module, index) => (
          <ProgressBar 
            key={index}
            label={module.name}
            percentage={module.progress}
            color={module.color}
          />
        ))}
      </div>
    </div>
  );
};

export default ModuleProgress;
