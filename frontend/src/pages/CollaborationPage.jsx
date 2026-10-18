import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import api from '../api/axios';
import { getNotifications } from '../api/notifications';
import { getTeams } from '../api/teams';
import { getChannelChat, getUnreadCounts, markChatRead } from '../api/chat';
import {
  MessageSquare, Users, AtSign,
  CheckCircle2, Megaphone,
  AlertCircle, X,
  Maximize2, Minimize2, Search, Loader2
} from 'lucide-react';
import { DocumentationHub } from '../components/documentation/DocumentationHub';
import { TaskChat } from '../components/chat/TaskChat';

const formatConversationTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  if (isYesterday) {
    return 'Yesterday';
  }
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

export default function CollaborationPage() {
  const { user } = useAuth();
  const role = user?.role || 'TM';
  const isExecutive = ['CEO', 'CTO'].includes(role);
  const isTL = role === 'TL';

  // Navigation & View Tabs: 'chats', 'mentions', 'announcements'
  const [activeTab, setActiveTab] = useState('chats');
  const [showDocHub, setShowDocHub] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Real Data Lists
  const [teamUsers, setTeamUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [teamsList, setTeamsList] = useState([]);
  const [channelMeta, setChannelMeta] = useState({});
  const [unreadCountsMap, setUnreadCountsMap] = useState({});
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  // Active Selections
  const [activeChatTarget, setActiveChatTarget] = useState({
    type: 'team',
    id: 'general',
    name: 'General Announcements',
    subtitle: 'Team-wide updates and important information',
    iconType: 'megaphone'
  });
  const [conversationFilter, setConversationFilter] = useState('all'); // 'all' | 'teams' | 'unread'
  const [conversationSearch, setConversationSearch] = useState('');

  // Announcements State
  const [announcements, setAnnouncements] = useState(() => {
    try {
      const saved = localStorage.getItem(`workos_announcements_${user?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [showNewAnnouncementModal, setShowNewAnnouncementModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  // Fetch Core Data (Users, Projects, Tasks, Notifications, Teams, Channel metadata, Unread counts)
  const loadInitialData = async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const [resUsers, resNotifs, resTeams, resUnread] = await Promise.all([
        api.get('/users').catch(() => ({ data: [] })),
        getNotifications().catch(() => []),
        getTeams().catch(() => []),
        getUnreadCounts().catch(() => ({ counts: {} }))
      ]);

      if (Array.isArray(resUsers.data)) setTeamUsers(resUsers.data);
      if (Array.isArray(resNotifs)) {
        setNotifications(resNotifs);
      }
      if (Array.isArray(resTeams)) {
        setTeamsList(resTeams);
      }
      if (resUnread && resUnread.counts) {
        setUnreadCountsMap(resUnread.counts);
      }

      // Fetch real latest messages for standard channels
      try {
        const [genMsgs, engMsgs, sprintMsgs] = await Promise.all([
          getChannelChat('general').catch(() => []),
          getChannelChat('engineering').catch(() => []),
          getChannelChat('sprint').catch(() => [])
        ]);
        const meta = {};
        if (genMsgs?.length) {
          const last = genMsgs[genMsgs.length - 1];
          meta['general'] = {
            lastMessage: `${last.sender?.first_name || last.sender_name || 'Member'}: ${last.message || 'Shared attachment'}`,
            time: formatConversationTime(last.created_at)
          };
        }
        if (engMsgs?.length) {
          const last = engMsgs[engMsgs.length - 1];
          meta['engineering'] = {
            lastMessage: `${last.sender?.first_name || last.sender_name || 'Member'}: ${last.message || 'Shared attachment'}`,
            time: formatConversationTime(last.created_at)
          };
        }
        if (sprintMsgs?.length) {
          const last = sprintMsgs[sprintMsgs.length - 1];
          meta['sprint'] = {
            lastMessage: `${last.sender?.first_name || last.sender_name || 'Member'}: ${last.message || 'Shared attachment'}`,
            time: formatConversationTime(last.created_at)
          };
        }
        setChannelMeta(meta);
      } catch (e) {
        console.error('Failed to load channel chat previews:', e);
      }
    } catch (err) {
      console.error('Failed to load collaboration data:', err);
      setDataError('Failed to load collaboration data. Please try again.');
    } finally {
      setLoadingData(false);
    }
  };

  const location = useLocation();

  // Ensure the page content starts at the top when navigating from any page or switching tabs
  useEffect(() => {
    const mainEl = document.querySelector('.app-main-content');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [location.pathname, activeTab]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle direct conversation selection from navigation (e.g. Employee Profile Overview "Message" action)
  useEffect(() => {
    const targetUserId = location.state?.selectedUserId || new URLSearchParams(location.search).get('userId');
    if (targetUserId && teamUsers.length > 0) {
      const u = teamUsers.find(user => String(user.id) === String(targetUserId));
      if (u) {
        setActiveTab('chats');
        setActiveChatTarget({
          id: u.id,
          realUserId: u.id,
          type: 'dm',
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
          subtitle: `${u.role || 'Member'}${u.department ? ` · ${u.department}` : ''}`,
          iconType: 'avatar',
          avatarUrl: u.avatar_url
        });
      }
    }
  }, [location.state, location.search, teamUsers]);

  // Mark a conversation as read in backend and update local unread counts
  const markConversationAsRead = async (target) => {
    if (!target?.id) return;
    const chatType = target.type === 'team' ? 'channel' : target.type === 'dm' ? 'direct' : target.type;
    const targetId = String(target.realUserId || target.id);

    // Optimistically clear the unread count in state immediately
    setUnreadCountsMap(prev => {
      const copy = { ...prev };
      delete copy[targetId];
      delete copy[String(target.id)];
      if (target.name) delete copy[target.name];
      return copy;
    });

    try {
      await markChatRead({
        chat_type: chatType,
        target_id: targetId
      });
    } catch (err) {
      console.error('Failed to mark conversation as read:', err);
    }
  };

  // Mark active conversation as read when active chat target changes
  useEffect(() => {
    if (activeChatTarget?.id) {
      markConversationAsRead(activeChatTarget);
    }
  }, [activeChatTarget.id, activeChatTarget.type, activeChatTarget.realUserId]);

  // Realtime notification sync
  useRealtime('notification.new', async () => {
    try {
      const notifs = await getNotifications();
      if (Array.isArray(notifs)) setNotifications(notifs);
    } catch (e) { }
  });

  // Realtime read sync across sessions/tabs
  useRealtime('chat.messages_read', (eventData) => {
    if (!eventData) return;
    if (String(eventData.reader_id) === String(user?.id)) {
      const tId = eventData.target_id;
      setUnreadCountsMap(prev => {
        const copy = { ...prev };
        delete copy[tId];
        if (eventData.original_target_id) delete copy[eventData.original_target_id];
        return copy;
      });
    }
  });

  // Realtime chat message sync to update conversation previews, times & unread counts
  useRealtime('chat.new_message', (eventData) => {
    if (eventData) {
      const cId = eventData.channel_name || (eventData.chat_type?.startsWith('channel:') ? eventData.chat_type.replace('channel:', '') : null);
      const isSenderMe = String(eventData.sender_id) === String(user?.id);

      if (cId) {
        setChannelMeta(prev => ({
          ...prev,
          [cId]: {
            lastMessage: `${eventData.sender?.first_name || eventData.sender_name || 'Member'}: ${eventData.message || 'Shared attachment'}`,
            time: formatConversationTime(eventData.created_at)
          }
        }));

        if (!isSenderMe) {
          const isCurrentOpen = activeTab === 'chats' && activeChatTarget?.type === 'team' && (String(activeChatTarget.id) === String(cId) || activeChatTarget.name === cId) && !document.hidden;
          if (isCurrentOpen) {
            markConversationAsRead(activeChatTarget);
          } else {
            setUnreadCountsMap(prev => ({
              ...prev,
              [cId]: (prev[cId] || 0) + 1
            }));
          }
        }
      } else if (eventData.chat_type === 'direct') {
        const partnerId = isSenderMe ? String(eventData.receiver_id) : String(eventData.sender_id);
        setChannelMeta(prev => ({
          ...prev,
          [partnerId]: {
            lastMessage: eventData.message || 'Shared attachment',
            time: formatConversationTime(eventData.created_at)
          }
        }));

        if (!isSenderMe) {
          const isCurrentOpen = activeTab === 'chats' && activeChatTarget?.type === 'dm' && (String(activeChatTarget.id) === partnerId || String(activeChatTarget.realUserId) === partnerId) && !document.hidden;
          if (isCurrentOpen) {
            markConversationAsRead(activeChatTarget);
          } else {
            setUnreadCountsMap(prev => ({
              ...prev,
              [partnerId]: (prev[partnerId] || 0) + 1
            }));
          }
        }
      }
    }
  });

  // Publish Announcement
  const handlePublishAnnouncement = (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    const newAnn = {
      id: Date.now(),
      title: annTitle.trim(),
      author: `${user?.first_name || 'Management'} ${user?.last_name || ''} (${role})`,
      date: new Date().toLocaleDateString(),
      content: annContent.trim(),
      acknowledgedBy: []
    };

    const updated = [newAnn, ...announcements];
    setAnnouncements(updated);
    localStorage.setItem(`workos_announcements_${user?.id}`, JSON.stringify(updated));

    setAnnTitle('');
    setAnnContent('');
    setShowNewAnnouncementModal(false);
  };

  // Acknowledge Announcement
  const handleAcknowledgeAnnouncement = (id) => {
    const updated = announcements.map(a => {
      if (a.id === id) {
        const alreadyAck = a.acknowledgedBy?.includes(user?.id);
        const nextAck = alreadyAck ? a.acknowledgedBy : [...(a.acknowledgedBy || []), user?.id];
        return { ...a, acknowledgedBy: nextAck };
      }
      return a;
    });
    setAnnouncements(updated);
    localStorage.setItem(`workos_announcements_${user?.id}`, JSON.stringify(updated));
  };




  const renderFullscreenButton = () => (
    <button
      type="button"
      onClick={() => setIsFullScreen(!isFullScreen)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 14px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        background: 'var(--surface-hover)',
        color: 'var(--brand-600)',
        fontSize: '12.5px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
    >
      {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      <span>{isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
    </button>
  );

  if (showDocHub) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', marginTop: 0, paddingTop: 0, paddingBottom: '20px', width: '100%' }}>
        <DocumentationHub onBackToCollaboration={() => setShowDocHub(false)} />
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      marginTop: 0,
      paddingTop: 0,
      paddingBottom: '20px',
      width: '100%',
      minHeight: 'calc(100vh - 148px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      alignContent: 'flex-start'
    }}>


      {/* INTERNAL TAB NAVIGATION BAR */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '16px', gap: '12px' }}>
        {[
          { key: 'chats', label: 'Chats', icon: MessageSquare },
          { key: 'announcements', label: 'Announcements', icon: Megaphone }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--brand-600)' : '3px solid transparent',
                color: isActive ? 'var(--brand-600)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT AREAS */}

      {/* TAB 1: CHATS (DIRECT & TEAM CHANNELS) */}
      {activeTab === 'chats' && (() => {
        // 1. Standard channels with dynamic members, notifications, and actual chat previews
        const standardChannels = [
          {
            id: 'general',
            type: 'team',
            name: 'General Announcements',
            subtitle: 'Team-wide updates and important information',
            iconType: 'megaphone',
            memberCount: `${teamUsers.length || 1} ${teamUsers.length === 1 ? 'member' : 'members'}`,
            lastMessage: channelMeta['general']?.lastMessage || 'Team-wide updates and announcements',
            time: channelMeta['general']?.time || '',
            unreadCount: unreadCountsMap['general'] ?? unreadCountsMap['General Announcements'] ?? 0
          },
          {
            id: 'engineering',
            type: 'team',
            name: 'Engineering & Tech',
            subtitle: 'Engineering discussions, architecture & releases',
            iconType: 'megaphone',
            memberCount: `${teamUsers.filter(u => ['TL', 'TM', 'CTO', 'DEV'].includes(u.role) || u.department?.toLowerCase().includes('eng')).length || teamUsers.length || 1} members`,
            lastMessage: channelMeta['engineering']?.lastMessage || 'Engineering discussions and releases',
            time: channelMeta['engineering']?.time || '',
            unreadCount: unreadCountsMap['engineering'] ?? unreadCountsMap['Engineering & Tech'] ?? 0
          },
          {
            id: 'sprint',
            type: 'team',
            name: 'Sprint & Daily Standups',
            subtitle: 'Daily blockers, sprint goals & standup notes',
            iconType: 'users',
            memberCount: `${teamUsers.length || 1} ${teamUsers.length === 1 ? 'member' : 'members'}`,
            lastMessage: channelMeta['sprint']?.lastMessage || 'Daily blockers, sprint goals & standup notes',
            time: channelMeta['sprint']?.time || '',
            unreadCount: unreadCountsMap['sprint'] ?? unreadCountsMap['Sprint & Daily Standups'] ?? 0
          }
        ];

        // 2. Real database teams from backend /api/teams
        const dbTeamChannels = teamsList.map(t => {
          const memberLen = t.memberships?.length || 0;
          return {
            id: t.id,
            type: 'team',
            name: t.name,
            subtitle: t.description || `${t.name} discussions and collaboration`,
            iconType: 'users',
            memberCount: `${memberLen} ${memberLen === 1 ? 'member' : 'members'}`,
            lastMessage: channelMeta[t.id]?.lastMessage || (t.description ? t.description : `Team channel for ${t.name}`),
            time: channelMeta[t.id]?.time || '',
            unreadCount: unreadCountsMap[String(t.id)] ?? unreadCountsMap[t.name] ?? 0
          };
        });

        // 3. Real direct messages for all team users from /api/users (excluding current user)
        const directMessages = teamUsers
          .filter(u => String(u.id) !== String(user?.id))
          .map(u => {
            const unreadCount = unreadCountsMap[String(u.id)] || 0;
            const latestNotif = notifications.find(n => n.event_type === 'chat.direct' && String(n.ref_id) === String(u.id));
            const lastMsg = channelMeta[String(u.id)]?.lastMessage || (latestNotif ? latestNotif.message : `Start direct message with ${u.first_name || 'member'}`);
            const timeVal = channelMeta[String(u.id)]?.time || (latestNotif ? formatConversationTime(latestNotif.created_at) : '');

            return {
              id: u.id,
              realUserId: u.id,
              type: 'dm',
              name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
              subtitle: `${u.role || 'Member'}${u.department ? ` · ${u.department}` : ''}`,
              iconType: 'avatar',
              avatarUrl: u.avatar_url,
              memberCount: '2 members',
              lastMessage: lastMsg,
              time: timeVal,
              unreadCount,
              realUser: u
            };
          });

        const conversationList = [...standardChannels, ...dbTeamChannels, ...directMessages];

        // Filter based on active tab and search query
        const filteredList = conversationList.filter(item => {
          if (conversationFilter === 'teams' && item.type !== 'team') return false;
          if (conversationFilter === 'unread' && (!item.unreadCount || item.unreadCount <= 0)) return false;

          if (conversationSearch.trim()) {
            const query = conversationSearch.toLowerCase().trim();
            const matchName = item.name?.toLowerCase().includes(query);
            const matchMsg = item.lastMessage?.toLowerCase().includes(query);
            const matchSub = item.subtitle?.toLowerCase().includes(query);
            return matchName || matchMsg || matchSub;
          }
          return true;
        });

        return (
          <div style={isFullScreen ? {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            background: '#FFFFFF',
            borderRadius: 0,
            border: 'none',
            display: 'flex',
            overflow: 'hidden'
          } : {
            flex: 1,
            display: 'flex',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            background: '#FFFFFF',
            overflow: 'hidden',
            height: 'calc(100vh - 285px)',
            minHeight: '560px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            {/* Conversations Left Panel */}
            <div style={{
              width: '350px',
              flexShrink: 0,
              borderRight: '1px solid #F1F5F9',
              display: 'flex',
              flexDirection: 'column',
              background: '#FFFFFF'
            }}>
              {/* Header */}
              <div style={{ padding: '18px 20px 12px 20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
                  Conversations
                </h2>
              </div>

              {/* Search Bar */}
              <div style={{ padding: '0 18px 12px 18px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={conversationSearch}
                    onChange={(e) => setConversationSearch(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '8px 12px 8px 36px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      background: '#F8FAFC',
                      fontSize: '13px',
                      color: '#1E293B',
                      outline: 'none',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.15s ease'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#5551FF'; e.target.style.background = '#FFFFFF'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; }}
                  />
                  {conversationSearch && (
                    <button
                      onClick={() => setConversationSearch('')}
                      style={{ position: 'absolute', right: '10px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '2px' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tabs */}
              <div style={{ padding: '0 18px 14px 18px', display: 'flex', gap: '8px' }}>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'teams', label: 'Teams' },
                  { key: 'unread', label: 'Unread' }
                ].map(tab => {
                  const isActive = conversationFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setConversationFilter(tab.key)}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '20px',
                        border: 'none',
                        background: isActive ? '#5551FF' : '#F1F5F9',
                        color: isActive ? '#FFFFFF' : '#475569',
                        fontSize: '12.5px',
                        fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Conversation Cards List */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0 10px 16px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}>
                {loadingData ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94A3B8', gap: '8px', fontSize: '13px', padding: '40px 0' }}>
                    <Loader2 size={18} className="spinner" />
                    <span>Loading conversations...</span>
                  </div>
                ) : dataError ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '32px 16px', textAlign: 'center' }}>
                    <AlertCircle size={28} color="#EF4444" style={{ marginBottom: '8px' }} />
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', marginBottom: '8px' }}>{dataError}</p>
                    <button
                      type="button"
                      onClick={loadInitialData}
                      style={{ padding: '6px 14px', borderRadius: '8px', background: '#5551FF', color: '#FFFFFF', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredList.length === 0 ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <MessageSquare size={32} style={{ marginBottom: '10px', opacity: 0.4 }} />
                    <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#475569', margin: '0 0 4px 0' }}>
                      {conversationFilter === 'unread' ? 'No unread conversations' : conversationSearch ? 'No matching conversations' : 'No conversations found'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
                      {conversationFilter === 'unread' ? 'You are all caught up!' : conversationSearch ? 'Try a different search keyword' : 'Start a direct chat with your team'}
                    </p>
                  </div>
                ) : (
                  filteredList.map(item => {
                    const isSelected = activeChatTarget.id === item.id || (activeChatTarget.realUserId && activeChatTarget.realUserId === item.realUserId);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setActiveChatTarget({
                            type: item.type,
                            id: item.id,
                            realUserId: item.realUserId,
                            name: item.name,
                            subtitle: item.subtitle,
                            memberCount: item.memberCount,
                            iconType: item.iconType,
                            user: item.realUser
                          });
                          markConversationAsRead(item);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '11px 12px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          background: isSelected ? '#F8F7FF' : 'transparent',
                          border: isSelected ? '1px solid #E0E7FF' : '1px solid transparent',
                          borderLeft: isSelected ? '3.5px solid #5551FF' : '3.5px solid transparent',
                          boxShadow: isSelected ? '0 1px 3px rgba(85, 81, 255, 0.08)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {/* Left Icon / Avatar */}
                        {item.type === 'team' ? (
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: '#EEF2FF',
                            color: '#5551FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {item.iconType === 'megaphone' ? <Megaphone size={19} /> : <Users size={19} />}
                          </div>
                        ) : item.avatarUrl ? (
                          <img
                            src={item.avatarUrl}
                            alt=""
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#6366F1',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '13px',
                            flexShrink: 0
                          }}>
                            {item.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{
                              fontSize: '13.5px',
                              fontWeight: 700,
                              color: '#0F172A',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {item.name}
                            </span>
                            <span style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 500, flexShrink: 0, marginLeft: '6px' }}>
                              {item.time}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{
                              fontSize: '12.5px',
                              color: '#64748B',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              flex: 1
                            }}>
                              {item.lastMessage}
                            </span>
                            {item.unreadCount > 0 && (
                              <span style={{
                                minWidth: '18px',
                                height: '18px',
                                borderRadius: '9px',
                                background: '#5551FF',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 5px',
                                marginLeft: '6px',
                                flexShrink: 0
                              }}>
                                {item.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Panel — Chat Window */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, background: '#FFFFFF' }}>
              {(() => {
                const currentTargetMeta = conversationList.find(c => c.type === activeChatTarget.type && String(c.id) === String(activeChatTarget.id));
                const resolvedMemberCount = activeChatTarget.type === 'team'
                  ? (currentTargetMeta?.memberCount || (activeChatTarget.id === 'general' ? `${teamUsers.length || 1} members` : (activeChatTarget.memberCount || '1 member')))
                  : null;

                return (
                  <TaskChat
                    key={`${activeChatTarget.type}_${activeChatTarget.id}`}
                    mode={activeChatTarget.type === 'team' ? 'channel' : 'direct'}
                    channelId={activeChatTarget.id}
                    channelName={activeChatTarget.name}
                    channelSubtitle={activeChatTarget.subtitle}
                    channelMemberCount={resolvedMemberCount}
                    channelIconType={activeChatTarget.iconType}
                    partnerUser={activeChatTarget.user || (activeChatTarget.realUserId ? teamUsers.find(u => String(u.id) === String(activeChatTarget.realUserId)) : teamUsers.find(u => String(u.id) === String(activeChatTarget.id)))}
                    currentUser={user}
                    unreadCount={currentTargetMeta?.unreadCount || unreadCountsMap[String(activeChatTarget.realUserId || activeChatTarget.id)] || 0}
                    allTeamUsers={teamUsers}
                    allChannels={[...standardChannels, ...dbTeamChannels]}
                    layoutVariant="collaboration_hub"
                    headerExtra={renderFullscreenButton()}
                    onMarkAsRead={() => markConversationAsRead(activeChatTarget)}
                  />
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* TAB 4: MENTIONS */}
      {activeTab === 'mentions' && (
        <div className="card" style={{ padding: '24px', flex: 1 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AtSign size={20} color="var(--brand-600)" /> Direct Mentions & Chat Notifications
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.filter(n => n.event_type?.includes('chat') || n.title?.toLowerCase().includes('chat')).length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                No direct mentions or chat notifications yet.
              </div>
            ) : (
              notifications.filter(n => n.event_type?.includes('chat') || n.title?.toLowerCase().includes('chat')).map(n => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (n.ref_id) {
                      const matchedUser = teamUsers.find(u => String(u.id) === String(n.ref_id));
                      if (matchedUser) {
                        setActiveChatTarget({
                          type: 'dm',
                          id: matchedUser.id,
                          realUserId: matchedUser.id,
                          name: `${matchedUser.first_name || ''} ${matchedUser.last_name || ''}`.trim() || matchedUser.email,
                          subtitle: `${matchedUser.role || 'Member'}${matchedUser.department ? ` · ${matchedUser.department}` : ''}`,
                          iconType: 'avatar',
                          avatarUrl: matchedUser.avatar_url,
                          user: matchedUser
                        });
                        setActiveTab('chats');
                      }
                    }
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: n.is_read ? 'var(--surface)' : 'rgba(99, 102, 241, 0.05)',
                    border: '1px solid var(--border)',
                    cursor: n.ref_id ? 'pointer' : 'default',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--brand-600)' }}>{n.title}</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', margin: 0 }}>{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Megaphone size={20} color="var(--brand-600)" /> Company Announcements & Notices
            </h2>

            {(isExecutive || isTL) && (
              <button onClick={() => setShowNewAnnouncementModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Megaphone size={16} /> Publish Announcement
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {announcements.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--surface)', borderRadius: 'var(--radius-lg, 12px)', border: '1px solid var(--border)' }}>
                <Megaphone size={32} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>No announcements published yet</p>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>Official company notices and management announcements will appear here.</p>
              </div>
            ) : (
              announcements.map(a => {
                const isAck = a.acknowledgedBy?.includes(user?.id);
                return (
                  <div key={a.id} className="card" style={{ padding: '24px', borderLeft: '4px solid var(--brand-600)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-600)', textTransform: 'uppercase' }}>Official Notice</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{a.date} • by {a.author}</span>
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>{a.title}</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px 0' }}>{a.content}</p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        {a.acknowledgedBy?.length || 0} employees acknowledged
                      </span>

                      <button
                        onClick={() => handleAcknowledgeAnnouncement(a.id)}
                        className={isAck ? "btn btn-secondary" : "btn btn-primary"}
                        style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: isAck ? 'rgba(16, 185, 129, 0.15)' : undefined, color: isAck ? '#10B981' : undefined }}
                      >
                        <CheckCircle2 size={14} /> {isAck ? 'Acknowledged' : 'Acknowledge Notice'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: PUBLISH ANNOUNCEMENT */}
      {showNewAnnouncementModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handlePublishAnnouncement} className="card" style={{ width: '500px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={20} color="var(--brand-600)" /> Publish Announcement
              </h3>
              <button type="button" onClick={() => setShowNewAnnouncementModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Headline</label>
              <input
                type="text"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Announcement headline..."
                required
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Notice Details</label>
              <textarea
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                rows={4}
                placeholder="Full notice text for team..."
                required
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowNewAnnouncementModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Publish Notice</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
