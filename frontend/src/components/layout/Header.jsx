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
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            style={{ 
              background: showMenu ? 'var(--brand-50)' : 'var(--subtle)',
              border: '1px solid var(--border)',
              color: showMenu ? 'var(--brand-600)' : 'var(--text-secondary)',
              position: 'relative',
              cursor: 'pointer',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              if (!showMenu) e.currentTarget.style.background = 'var(--hover)';
            }}
            onMouseLeave={(e) => {
              if (!showMenu) e.currentTarget.style.background = 'var(--subtle)';
            }}
            aria-label="Notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                minWidth: '18px',
                height: '18px',
                background: 'var(--status-blocked)',
                borderRadius: 'var(--radius-full)',
                color: 'white',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                padding: '0 4px'
              }}>
                {unreadCount}
              </span>
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
                  <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    <div style={{ marginBottom: '8px', fontSize: '24px' }}>🔔</div>
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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 14px 6px 8px',
              background: 'var(--subtle)',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border)'
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
                fontSize: '13px',
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
              background: 'var(--subtle)', 
              border: '1px solid var(--border)', 
              color: 'var(--text-secondary)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '9px',
              borderRadius: 'var(--radius-sm)',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--status-blocked-bg)';
              e.currentTarget.style.color = 'var(--status-blocked)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--subtle)';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
