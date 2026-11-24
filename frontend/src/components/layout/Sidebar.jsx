import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../realtime/useRealtime';
import api from '../../api/axios';
import { getTeams } from '../../api/teams';
import { getUnreadCounts } from '../../api/chat';
import {
  LayoutDashboard, CheckSquare, Users, Folders, UserCheck,
  Star, History, UserCog, TrendingUp, X, MessageSquare, Target, Calendar as CalendarIcon
} from 'lucide-react';

export const Sidebar = ({ isOpen = false, onClose }) => {
  const { user } = useAuth();
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Helper to fetch and calculate the REAL unread count strictly for Collaboration chats (excluding tasks/projects)
  const syncCollaborationUnread = async (mountedRef) => {
    try {
      const [resUnread, resUsers, resTeams, resNotifs] = await Promise.all([
        getUnreadCounts().catch(() => ({ counts: {} })),
        api.get('/users').catch(() => ({ data: [] })),
        getTeams().catch(() => []),
        api.get('/notifications').catch(() => ({ data: [] }))
      ]);

      if (mountedRef && !mountedRef.current) return;

      const counts = resUnread?.counts || {};
      const usersList = resUsers?.data || [];
      const notifsList = Array.isArray(resNotifs?.data) ? resNotifs.data : (Array.isArray(resNotifs) ? resNotifs : []);
      const validTeamIds = new Set((resTeams || []).map(t => String(t.id)));

      let collabTotal = 0;
      // 1. Direct messages from team members
      usersList.forEach(u => {
        if (String(u.id) === String(user?.id)) return;
        const uIdStr = String(u.id);
        const notifUnread = notifsList.filter(n => !n.is_read && n.event_type === 'chat.direct' && String(n.ref_id) === uIdStr).length;
        collabTotal += Math.max(Number(counts[uIdStr]) || 0, notifUnread);
      });
      // 2. Standard collaboration channels
      ['general', 'engineering', 'sprint', 'announcements'].forEach(ch => {
        if (counts[ch]) collabTotal += Number(counts[ch]) || 0;
      });
      // 3. Team channels
      validTeamIds.forEach(tid => {
        if (counts[tid]) collabTotal += Number(counts[tid]) || 0;
      });

      setUnreadChatCount(collabTotal);
    } catch {
      // Fallback
    }
  };

  // Sync initial real unread count and listen for local updates from CollaborationPage
  useEffect(() => {
    const mountedRef = { current: true };
    syncCollaborationUnread(mountedRef);

    const handleCustomSync = (e) => {
      if (e.detail && typeof e.detail.total === 'number') {
        setUnreadChatCount(e.detail.total);
      }
    };
    window.addEventListener('workmate_unread_updated', handleCustomSync);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('workmate_unread_updated', handleCustomSync);
    };
  }, [user?.id]);

  // Realtime new message listener to increment badge strictly for collaboration messages
  useRealtime('chat.new_message', (eventData) => {
    if (!eventData) return;
    if (String(eventData.sender_id) !== String(user?.id)) {
      const isDirect = eventData.chat_type === 'direct';
      const isChannel = eventData.chat_type?.startsWith('channel:') || Boolean(eventData.channel_name);
      if (!isDirect && !isChannel) return; // Ignore tasks and projects

      const activeChat = window.__workmate_active_chat;
      const isLookingAtThisChat = activeChat && !document.hidden && (
        (isDirect && String(activeChat.realUserId || activeChat.id) === String(eventData.sender_id)) ||
        (isChannel && (activeChat.id === eventData.channel_name || activeChat.name === eventData.channel_name))
      );

      if (!isLookingAtThisChat) {
        setUnreadChatCount(prev => prev + 1);
      }
    }
  });

  // Realtime read listener to refresh badge count
  useRealtime('chat.messages_read', (eventData) => {
    if (!eventData) return;
    if (String(eventData.reader_id) === String(user?.id)) {
      syncCollaborationUnread({ current: true });
    }
  });

  // Realtime notification listener for direct chat notifications
  useRealtime('notification.new', (eventData) => {
    if (eventData?.event_type === 'chat.direct') {
      const activeChat = window.__workmate_active_chat;
      const isLookingAtThisChat = activeChat && !document.hidden && activeChat.type === 'dm' &&
        (String(activeChat.realUserId || activeChat.id) === String(eventData.ref_id));
      if (!isLookingAtThisChat) {
        setUnreadChatCount(prev => prev + 1);
      }
    }
  });

  if (!user) return null;

  const isManagementRole = ['CEO', 'CTO', 'PM', 'TL', 'CO'].includes(user?.role);
  const isDeveloper = ['TM', 'Developer', 'DEV'].includes(user?.role) || (!isManagementRole && user?.role !== 'HR');
  const workLabel = isManagementRole ? 'All Work' : 'My Work';
  const performanceLabel = isManagementRole ? 'All Performance' : 'My Performance';

  const links = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/my-work', icon: <CheckSquare size={20} />, label: workLabel, roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/projects', icon: <Folders size={20} />, label: 'Projects', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/teams', icon: <Users size={20} />, label: 'Team', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/tasks', icon: <CheckSquare size={20} />, label: 'Tasks', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/kpi', icon: <TrendingUp size={20} />, label: performanceLabel, roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/collaboration', icon: <MessageSquare size={20} />, label: 'Collaboration', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/team-directory', icon: <UserCheck size={20} />, label: 'Team Directory', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    ...(isDeveloper ? [{ to: '/goals', icon: <Target size={20} />, label: 'Goals & Growth', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] }] : []),
    { to: '/calendar', icon: <CalendarIcon size={20} />, label: 'Calendar', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/feedback', icon: <Star size={20} />, label: 'Feedback', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
    { to: '/history', icon: <History size={20} />, label: 'Activity History', roles: ['CEO', 'CTO', 'PM', 'TL', 'TM', 'HR'] },
  ];

  if (['CEO', 'CTO'].includes(user.role)) {
    links.push({ to: '/users', icon: <UserCog size={20} />, label: 'Users', roles: ['CEO', 'CTO'] });
  }

  return (
    <aside
      className={`sidebar-responsive ${isOpen ? 'sidebar-open' : ''}`}
      style={{
        width: '260px',
        flexShrink: 0,
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'relative',
        zIndex: 20,
        userSelect: 'none',
        overscrollBehavior: 'none'
      }}
    >
      <div style={{
        padding: '28px 20px 16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="/logo.webp"
            alt="Logo"
            style={{ width: '100%', maxHeight: '35px', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.04))' }}
          />
        </div>

        {/* Mobile Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mobile-nav-toggle"
            style={{
              padding: '6px',
              marginLeft: '8px',
              color: 'var(--text-secondary)'
            }}
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav style={{
        flex: 1,
        padding: '0 14px 24px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        overflowY: 'auto',
        overscrollBehavior: 'contain'
      }}>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => {
              if (onClose) onClose();
            }}
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
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.label}</span>
            {link.to === '/collaboration' && unreadChatCount > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  background: '#5551FF',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '12px',
                  padding: '2px 7px',
                  minWidth: '20px',
                  height: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  boxShadow: '0 2px 5px rgba(85, 81, 255, 0.35)',
                  flexShrink: 0
                }}
                title={`${unreadChatCount} unread message${unreadChatCount === 1 ? '' : 's'}`}
              >
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
