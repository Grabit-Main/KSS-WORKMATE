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
      background: 'var(--surface-glass)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 15,
      transition: 'all var(--transition-smooth)'
    }}>
      <h1 className="font-bold text-xl" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
        {title || 'Dashboard'}
      </h1>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            style={{ 
              background: showMenu ? 'var(--brand-50)' : 'transparent',
              border: 'none',
              color: showMenu ? 'var(--brand-600)' : 'var(--text-secondary)',
              position: 'relative',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              if (!showMenu) {
                e.currentTarget.style.background = 'var(--subtle)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showMenu) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            aria-label="Notifications"
          >
            <Bell size={20} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                background: 'var(--brand-500)',
                borderRadius: 'var(--radius-full)',
                boxShadow: '0 0 0 2px var(--surface)'
              }} />
            )}
          </button>

          {showMenu && (
            <div className="card modal-animate" style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              width: '340px',
              padding: 0,
              overflow: 'hidden',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-float)',
              border: '1px solid var(--border)',
              zIndex: 100,
              background: 'var(--surface)'
            }}>
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--subtle-glass)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 className="font-bold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <span style={{
                      fontSize: '11px',
                      background: 'var(--brand-100)',
                      color: 'var(--brand-700)',
                      padding: '1px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 600
                    }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold text-brand-600"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-600)' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    <Bell size={24} strokeWidth={1.5} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--text-tertiary)' }} />
                    No notifications yet
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ 
                      padding: '14px 18px',
                      borderBottom: '1px solid var(--border)',
                      background: n.is_read ? 'transparent' : 'var(--brand-50)',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      transition: 'background var(--transition-fast)'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{n.title}</div>
                        <div className="text-xs text-secondary" style={{ lineHeight: 1.4 }}>{n.content}</div>
                      </div>
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--brand-600)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: 'var(--radius-xs)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-subtle)'
                          }}
                          title="Mark as read"
                        >
                          <Check size={13} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 10px 4px 4px',
              borderRadius: 'var(--radius-full)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--brand-gradient)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '12px',
                boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)'
              }}>
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="font-semibold text-xs" style={{ lineHeight: '1.2', color: 'var(--text-primary)' }}>
                  {user.first_name} {user.last_name}
                </span>
                <span className="text-xs text-secondary" style={{ lineHeight: '1.2', fontSize: '10px' }}>
                  {user.role}
                </span>
              </div>
            </div>
          )}

          <button 
            onClick={logout}
            title="Sign out"
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
              borderRadius: 'var(--radius-full)',
              transition: 'all var(--transition-fast)'
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
            <LogOut size={19} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
};
