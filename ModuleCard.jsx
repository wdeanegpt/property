'use client';

import React from 'react';
import Link from 'next/link';

const ModuleCard = ({ title, status, description, features }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  const isComplete = status.includes("Fully implemented");
  
  return (
    <div className="card hover:shadow-lg transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-blue-600">{title}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          isComplete 
            ? "bg-green-100 text-green-800" 
            : "bg-yellow-100 text-yellow-800"
        }`}>
          {isComplete ? "Complete" : "In Progress"}
        </span>
      </div>
      
      <p className="mb-4">{description}</p>
      
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Status</h4>
          <p className="italic">{status}</p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Key Features</h4>
          <ul className="list-disc pl-5 space-y-1">
            {features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </div>
      </div>
      
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-4 text-blue-600 hover:text-blue-800 font-medium flex items-center"
      >
        {isExpanded ? 'Show Less' : 'Show More'}
        <svg 
          className={`ml-1 w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
};

export default ModuleCard;
