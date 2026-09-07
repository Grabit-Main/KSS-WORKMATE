import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, CheckSquare, Users, MessageSquare, Folders, Star, Settings } from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  if (!user) return null;

  const links = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/projects', icon: <Folders size={20} />, label: 'Projects', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/tasks', icon: <CheckSquare size={20} />, label: 'Tasks', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/reviews', icon: <Star size={20} />, label: 'Reviews', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
  ];

  if (['CEO', 'CTO'].includes(user.role)) {
    links.push({ to: '/users', icon: <Users size={20} />, label: 'Users', roles: ['CEO', 'CTO'] });
  }

  return (
    <aside style={{
      width: '240px',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0
    }}>
      <div style={{ padding: '8px 16px 14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logo.webp" alt="Logo" style={{ width: '100%', maxHeight: '52px', objectFit: 'contain' }} />
      </div>
      
      <nav style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              color: isActive ? 'var(--brand-700)' : 'var(--text-secondary)',
              background: isActive ? 'var(--brand-50)' : 'transparent',
              fontWeight: isActive ? 600 : 500,
            })}
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>
      
      <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'var(--brand-100)', color: 'var(--brand-600)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
          }}>
            {user.first_name[0]}{user.last_name[0]}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div className="font-semibold text-sm" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user.first_name} {user.last_name}
            </div>
            <div className="text-xs text-secondary">{user.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
