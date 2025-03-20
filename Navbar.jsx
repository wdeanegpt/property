'use client';

import React from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <nav className="bg-blue-700 py-2">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="text-white font-bold text-xl">
              PMS
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-6">
            <Link href="/" className="text-white hover:text-blue-200">
              Overview
            </Link>
            <Link href="/modules" className="text-white hover:text-blue-200">
              Modules
            </Link>
            <Link href="/status" className="text-white hover:text-blue-200">
              Current Status
            </Link>
            <Link href="/next-steps" className="text-white hover:text-blue-200">
              Next Steps
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-2 py-2">
            <Link href="/" className="block text-white py-2">
              Overview
            </Link>
            <Link href="/modules" className="block text-white py-2">
              Modules
            </Link>
            <Link href="/status" className="block text-white py-2">
              Current Status
            </Link>
            <Link href="/next-steps" className="block text-white py-2">
              Next Steps
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
