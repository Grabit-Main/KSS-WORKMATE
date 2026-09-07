import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut } from 'lucide-react';

export const Header = ({ title }) => {
  const { logout } = useAuth();
  
  return (
    <header style={{
      height: '72px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      <h1 className="font-bold text-xl">{title || 'Dashboard'}</h1>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <button style={{ 
          background: 'transparent', border: 'none', color: 'var(--text-secondary)',
          position: 'relative'
        }}>
          <Bell size={20} />
          {/* ponytail: a real notification dot would be data-driven. */}
          <span style={{
            position: 'absolute', top: 0, right: 0, width: '8px', height: '8px',
            background: 'var(--brand-500)', borderRadius: '50%'
          }}></span>
        </button>
        
        <button 
          onClick={logout}
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
          }}
        >
          <LogOut size={20} />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </header>
  );
};
