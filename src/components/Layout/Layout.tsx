import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/80 via-white to-slate-100/60">
      <Navigation />
      
      {/* Main Content */}
      <main className="md:ml-72 pb-20 md:pb-8 relative z-0">
        <div className="p-6 md:p-8">
          <Outlet />
        </div>
      </main>
      
      {/* Premium floating background elements for sophisticated depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40 -z-10">
        {/* Primary ambient orb */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-200/30 via-purple-200/20 to-pink-200/30 rounded-full blur-3xl float-animation"></div>
        
        {/* Secondary ambient orb */}
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-to-br from-blue-200/25 via-indigo-200/20 to-purple-200/25 rounded-full blur-3xl float-animation-slow" style={{animationDelay: '3s'}}></div>
        
        {/* Tertiary ambient orb */}
        <div className="absolute top-1/2 left-3/4 w-64 h-64 bg-gradient-to-br from-pink-200/20 via-rose-200/15 to-orange-200/20 rounded-full blur-3xl float-animation" style={{animationDelay: '6s'}}></div>
        
        {/* Additional subtle elements for depth */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-indigo-300/20 to-blue-300/15 rounded-full blur-2xl float-animation" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-gradient-to-br from-purple-300/15 to-pink-300/20 rounded-full blur-2xl float-animation-slow" style={{animationDelay: '4s'}}></div>
      </div>
    </div>
  );
};

export default Layout;