import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const MainLayout = () => {
  const location = useLocation();
  
  const getTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/projects')) return 'Projects';
    if (path.startsWith('/tasks')) return 'Tasks';
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
      <Sidebar />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        minWidth: 0,
        overflow: 'hidden',
        overscrollBehavior: 'none'
      }}>
        <Header title={getTitle()} />
        <main style={{
          padding: '32px',
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'none',
          WebkitOverscrollBehavior: 'none',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch'
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
