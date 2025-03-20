'use client';

import { useState, useEffect } from 'react';

export default function ProgressBar({ percentage = 0, label = '', color = 'blue' }) {
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    // Animate the progress bar on load
    setTimeout(() => {
      setWidth(percentage);
    }, 100);
  }, [percentage]);
  
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600',
  };
  
  const bgColorClass = colorClasses[color] || colorClasses.blue;
  
  return (
    <div className="mb-4">
      {label && <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-medium">{percentage}%</span>
      </div>}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${bgColorClass}`}
          style={{ width: `${width}%` }}
        ></div>
      </div>
    </div>
  );
}
