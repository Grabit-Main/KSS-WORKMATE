import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../realtime/useRealtime';
import { formatRelativeTime } from '../../utils/dateUtils';
import { Bell, LogOut, Check, User, ChevronRight, X, Menu } from 'lucide-react';
import { getNotifications, markRead, markAllRead } from '../../api/notifications';

export const Header = ({ title, onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [liveToast, setLiveToast] = useState(null);
  const menuRef = useRef(null);
  const profileRef = useRef(null);
  const profileTimeoutRef = useRef(null);

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

  const handleLiveNotification = useCallback((payload) => {
    loadNotifications();
    if (payload && (payload.title || payload.message)) {
      const taskId = payload.ref_id || payload.task_id;
      setLiveToast({
        id: payload.id || Date.now(),
        title: payload.title || 'New Notification',
        message: payload.message || payload.content || 'You have a new update.',
        taskId: taskId,
      });
    }
  }, []);

  const handleTaskCreated = useCallback((payload) => {
    loadNotifications();
    if (payload) {
      const taskId = payload.id || payload.task_id;
      if (!user || String(payload.assigned_to) === String(user.id)) {
        setLiveToast({
          id: Date.now(),
          title: '🎯 Task Assigned to You',
          message: payload.title ? `"${payload.title}"` : 'A new task has been assigned to you.',
          taskId: taskId,
        });
      }
    }
  }, [user]);

  useRealtime('notification.new', handleLiveNotification);
  useRealtime('task.created', handleTaskCreated);
  useRealtime('task.status_changed', handleLiveNotification);
  useRealtime('review.submitted', handleLiveNotification);

  // Auto-dismiss live toast after 7 seconds
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => {
      setLiveToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [liveToast]);

  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      try {
        await markRead(n.id);
        loadNotifications();
      } catch (err) {}
    }
    setShowMenu(false);
    const taskId = n.ref_id || n.task_id;
    if (taskId) {
      navigate(`/tasks?taskId=${taskId}`);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      await markRead(id);
    } catch (err) {
      loadNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await markAllRead();
    } catch (err) {
      loadNotifications();
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header style={{
      height: '72px',
      flexShrink: 0,
      background: 'var(--surface-glass)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'relative',
      zIndex: 15,
      userSelect: 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        {onToggleSidebar && (
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={onToggleSidebar}
            aria-label="Toggle Navigation Menu"
          >
            <Menu size={22} />
          </button>
        )}
        <h1 className="font-bold text-xl" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title || 'Dashboard'}
        </h1>
      </div>
      
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
              width: 'min(340px, calc(100vw - 32px))',
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
                  notifications.map(n => {
                    const taskId = n.ref_id || n.task_id;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        style={{ 
                          padding: '14px 18px',
                          borderBottom: '1px solid var(--border)',
                          background: n.is_read ? 'transparent' : 'var(--brand-50)',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start',
                          transition: 'background var(--transition-fast)',
                          cursor: taskId ? 'pointer' : 'default'
                        }}
                        onMouseEnter={(e) => {
                          if (taskId) e.currentTarget.style.background = n.is_read ? 'var(--subtle)' : 'var(--brand-100)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = n.is_read ? 'transparent' : 'var(--brand-50)';
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{n.title}</span>
                            {taskId && <ChevronRight size={14} color="var(--text-tertiary)" />}
                          </div>
                          <div className="text-xs text-secondary" style={{ lineHeight: 1.4 }}>{n.message || n.content}</div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                            {taskId ? (
                              <span style={{ fontSize: '11px', color: 'var(--brand-600)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                Open task →
                              </span>
                            ) : <span />}
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                              {n.created_at ? formatRelativeTime(n.created_at) : 'Just now'}
                            </span>
                          </div>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRead(n.id);
                            }}
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
                              boxShadow: 'var(--shadow-subtle)',
                              flexShrink: 0
                            }}
                            title="Mark as read"
                          >
                            <Check size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Profile Circle Icon & Interactive Dropdown Menu */}
        {user && (
          <div
            ref={profileRef}
            style={{ position: 'relative' }}
            onMouseEnter={() => {
              if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
              setShowProfileMenu(true);
            }}
            onMouseLeave={() => {
              profileTimeoutRef.current = setTimeout(() => {
                setShowProfileMenu(false);
              }, 250);
            }}
          >
            {/* Circle Trigger Button */}
            <button
              onClick={() => setShowProfileMenu(prev => !prev)}
              aria-label="User Profile"
              title={`${user.first_name} ${user.last_name} (${user.role})`}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-full)',
                padding: 0,
                border: showProfileMenu ? '2px solid var(--brand-500)' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all var(--transition-fast)',
                boxShadow: showProfileMenu ? '0 0 0 3px rgba(99, 102, 241, 0.2)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!showProfileMenu) e.currentTarget.style.transform = 'scale(1.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={`${user.first_name} ${user.last_name}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 'var(--radius-full)',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--brand-gradient)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '13px',
                    letterSpacing: '0.02em',
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                  }}
                >
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </div>
              )}

              {/* Online status indicator badge */}
              <span
                style={{
                  position: 'absolute',
                  bottom: '1px',
                  right: '1px',
                  width: '10px',
                  height: '10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--status-completed)',
                  border: '2px solid var(--surface)',
                }}
              />
            </button>

            {/* Dropdown Menu Box */}
            {showProfileMenu && (
              <div
                className="card modal-animate"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  width: 'min(300px, calc(100vw - 32px))',
                  padding: '12px',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-float)',
                  border: '1px solid var(--border)',
                  zIndex: 100,
                  background: 'var(--surface)',
                }}
                onMouseEnter={() => {
                  if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
                }}
                onMouseLeave={() => {
                  profileTimeoutRef.current = setTimeout(() => {
                    setShowProfileMenu(false);
                  }, 250);
                }}
              >
                {/* Clickable Identity Section: (full name, role, designation) */}
                <div
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/profile');
                  }}
                  title="Click to edit profile, photo & change password"
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--subtle-glass)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--selected)';
                    e.currentTarget.style.borderColor = 'var(--brand-200)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--subtle-glass)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--brand-gradient)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '15px',
                      flexShrink: 0,
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                    }}
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        className="font-bold text-sm text-truncate"
                        style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
                      >
                        {user.first_name} {user.last_name}
                      </span>
                      <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 7px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--brand-100)',
                          color: 'var(--brand-700)',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {user.role}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginTop: '3px',
                      }}
                      className="text-truncate"
                    >
                      {user.department || 'Workmate Member'}
                    </div>
                  </div>
                </div>

                {/* Subtext info */}
                <div style={{ padding: '6px 4px 4px 4px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    Click above to edit profile & change password
                  </p>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '6px 0' }} />

                {/* Dropdown Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--status-blocked)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--status-blocked-bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Real-time Floating Notification Toast */}
      {liveToast && (
        <div
          onClick={() => {
            if (liveToast.taskId) {
              navigate(`/tasks?taskId=${liveToast.taskId}`);
            }
            setLiveToast(null);
          }}
          className="modal-animate"
          style={{
            position: 'fixed',
            top: '84px',
            right: '24px',
            zIndex: 99999,
            width: '360px',
            maxWidth: 'calc(100vw - 48px)',
            background: 'var(--surface)',
            border: '1.5px solid var(--brand-500)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.22)',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            cursor: liveToast.taskId ? 'pointer' : 'default',
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '9px',
                height: '9px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--brand-500)',
                boxShadow: '0 0 8px var(--brand-500)'
              }} />
              <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                {liveToast.title}
              </strong>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLiveToast(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                padding: '3px',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={15} />
            </button>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {liveToast.message}
          </div>
          {liveToast.taskId && (
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--brand-600)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '4px'
            }}>
              <span>Click to open task</span>
              <ChevronRight size={13} />
            </div>
          )}
        </div>
      )}
    </header>
  );
};
