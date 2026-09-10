import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const MainLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Close mobile drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const getTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/projects')) return 'Projects';
    if (path.startsWith('/tasks')) return 'Tasks';
    if (path.startsWith('/kpi')) return 'KPI Tracker';
    if (path.startsWith('/teams')) return 'Teams';
    if (path.startsWith('/users')) return 'Users';
    if (path.startsWith('/feedback') || path.startsWith('/reviews')) return 'Feedback';
    if (path.startsWith('/history')) return 'History';
    if (path.startsWith('/profile')) return 'My Profile';
    return 'Workmate';
  };

  return (
    <div style={{
      display: 'flex',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
      overscrollBehavior: 'none'
    }}>
      {/* Mobile Drawer Backdrop */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar (Desktop Side-by-side & Mobile Slide Drawer) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        minWidth: 0,
        overflow: 'hidden',
        overscrollBehavior: 'none'
      }}>
        <Header title={getTitle()} onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
        <main className="app-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
