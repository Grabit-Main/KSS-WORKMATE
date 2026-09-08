import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, CheckSquare, Users, MessageSquare, Folders, Star, Settings, History } from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  if (!user) return null;

  const links = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/projects', icon: <Folders size={20} />, label: 'Projects', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/tasks', icon: <CheckSquare size={20} />, label: 'Tasks', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/feedback', icon: <Star size={20} />, label: 'Feedback', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/history', icon: <History size={20} />, label: 'History', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
  ];

  if (['CEO', 'CTO'].includes(user.role)) {
    links.push({ to: '/users', icon: <Users size={20} />, label: 'Users', roles: ['CEO', 'CTO'] });
  }

  return (
    <aside style={{
      width: '260px',
      background: 'var(--surface-glass)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 20,
      transition: 'all var(--transition-smooth)'
    }}>
      <div style={{ padding: '20px 20px 16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logo.webp" alt="Logo" style={{ width: '100%', maxHeight: '54px', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.04))' }} />
      </div>
      
      <nav style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 16px',
              borderRadius: 'var(--radius-md)',
              color: isActive ? 'var(--brand-600)' : 'var(--text-secondary)',
              background: isActive ? 'var(--brand-50)' : 'transparent',
              fontWeight: isActive ? 600 : 500,
              fontSize: '14px',
              letterSpacing: '-0.01em',
              transition: 'all var(--transition-fast)',
              boxShadow: isActive ? '0 1px 3px rgba(99, 102, 241, 0.1), inset 0 0 0 1px rgba(99, 102, 241, 0.15)' : 'none',
              transform: isActive ? 'translateX(2px)' : 'none',
            })}
            className="nav-link-apple"
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--subtle)',
          transition: 'all var(--transition-fast)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--brand-gradient)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
            flexShrink: 0
          }}>
            {user.first_name?.[0]}{user.last_name?.[0]}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div className="font-semibold text-sm" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--text-primary)' }}>
              {user.first_name} {user.last_name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--brand-100)',
                color: 'var(--brand-700)',
                letterSpacing: '0.02em',
                textTransform: 'uppercase'
              }}>
                {user.role}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
