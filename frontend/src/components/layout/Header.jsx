import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut, Check } from 'lucide-react';
import { getNotifications, markRead, markAllRead } from '../../api/notifications';

export const Header = ({ title }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markRead(id);
      loadNotifications();
    } catch (err) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      loadNotifications();
    } catch (err) {}
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

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
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            style={{ 
              background: 'transparent', border: 'none', color: 'var(--text-secondary)',
              position: 'relative', cursor: 'pointer', padding: '4px'
            }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 0, right: 0, width: '16px', height: '16px',
                background: 'var(--brand-500)', borderRadius: '50%', color: 'white',
                fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showMenu && (
            <div className="card" style={{
              position: 'absolute', top: '100%', right: 0, width: '320px', 
              marginTop: '12px', padding: 0, overflow: 'hidden',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="font-bold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs font-medium text-brand-600" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    Mark all as read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ 
                      padding: '16px', borderBottom: '1px solid var(--border)',
                      background: n.is_read ? 'transparent' : 'var(--brand-50)',
                      display: 'flex', gap: '12px', alignItems: 'flex-start'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div className="font-medium text-sm mb-1">{n.title}</div>
                        <div className="text-xs text-secondary">{n.content}</div>
                      </div>
                      {!n.is_read && (
                        <button onClick={() => handleMarkRead(n.id)} style={{ background: 'none', border: 'none', color: 'var(--brand-600)', cursor: 'pointer', padding: 4 }}>
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'var(--brand-100)', color: 'var(--brand-600)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                fontSize: '14px'
              }}>
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="font-semibold text-sm" style={{ lineHeight: '1.2' }}>{user.first_name} {user.last_name}</span>
                <span className="text-xs text-secondary" style={{ lineHeight: '1.2' }}>{user.role}</span>
              </div>
            </div>
          )}

          <button 
            onClick={logout}
            title="Logout"
            aria-label="Logout"
            style={{
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-secondary)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--status-blocked-bg)';
              e.currentTarget.style.color = 'var(--status-blocked)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
