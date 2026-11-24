import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import api from '../api/axios';
import { getNotifications } from '../api/notifications';
import { getTeams } from '../api/teams';
import { getChannelChat, getUnreadCounts, markChatRead, sendChannelMessage, deleteChatMessage } from '../api/chat';
import {
  MessageSquare, Users,
  CheckCircle2, Megaphone,
  AlertCircle, X,
  Maximize2, Minimize2, Search, Loader2, Lock,
  Edit3, Trash2, Pencil
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

  const [showDocHub] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Admin TL & Management Permission Check for Announcements
  const canManageAnnouncements = user?.role === 'TL' || ['CEO', 'CTO', 'PM'].includes(user?.role);

  // Real Data Lists
  const [teamUsers, setTeamUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [teamsList, setTeamsList] = useState([]);
  const [channelMeta, setChannelMeta] = useState(() => {
    try {
      const saved = localStorage.getItem(`workmate_chat_meta_${user?.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [unreadCountsMap, setUnreadCountsMap] = useState({});
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  // Active Selections
  const [activeChatTarget, setActiveChatTarget] = useState(null);
  const [conversationFilter, setConversationFilter] = useState('all'); // 'all' | 'teams' | 'unread' | 'announcements'
  const [conversationSearch, setConversationSearch] = useState('');
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState('company_announcements');

  // Announcements State (Synchronized across all roles and team members)
  const [announcements, setAnnouncements] = useState(() => {
    try {
      const globalSaved = localStorage.getItem('workmate_global_announcements');
      if (globalSaved) return JSON.parse(globalSaved);
      const userSaved = localStorage.getItem(`workos_announcements_${user?.id}`);
      return userSaved ? JSON.parse(userSaved) : [];
    } catch { return []; }
  });

  const [showNewAnnouncementModal, setShowNewAnnouncementModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  // Edit Announcement State (Only for TL admin & management)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [editAnnTitle, setEditAnnTitle] = useState('');
  const [editAnnContent, setEditAnnContent] = useState('');
  const [showEditAnnouncementModal, setShowEditAnnouncementModal] = useState(false);

  // Fetch Core Data (Users, Projects, Tasks, Notifications, Teams, Channel metadata, Unread counts, Announcements)
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

      if (Array.isArray(resUsers.data)) {
        setTeamUsers(resUsers.data);
      }
      if (Array.isArray(resNotifs)) {
        setNotifications(resNotifs);
      }
      if (Array.isArray(resTeams)) {
        setTeamsList(resTeams);
      }
      if (resUnread && resUnread.counts) {
        setUnreadCountsMap(resUnread.counts);
      }

      // Populate channelMeta with direct chat notifications and channel previews
      const meta = {};
      try {
        const storedMeta = localStorage.getItem(`workmate_chat_meta_${user?.id}`);
        if (storedMeta) {
          Object.assign(meta, JSON.parse(storedMeta));
        }
      } catch {}

      if (Array.isArray(resNotifs)) {
        resNotifs.forEach(n => {
          if (n.event_type === 'chat.direct' && n.ref_id) {
            const nTime = new Date(n.created_at).getTime();
            if (!meta[n.ref_id] || (meta[n.ref_id].timestamp || 0) < nTime) {
              meta[n.ref_id] = {
                lastMessage: n.message,
                time: formatConversationTime(n.created_at),
                timestamp: nTime
              };
            }
          }
        });
      }

      // Fetch real latest messages for standard channels & announcements channel
      try {
        const [genMsgs, engMsgs, sprintMsgs, annMsgs] = await Promise.all([
          getChannelChat('general').catch(() => []),
          getChannelChat('engineering').catch(() => []),
          getChannelChat('sprint').catch(() => []),
          getChannelChat('announcements').catch(() => [])
        ]);

        if (genMsgs?.length) {
          const last = genMsgs[genMsgs.length - 1];
          meta['general'] = {
            lastMessage: `${last.sender?.first_name || last.sender_name || 'Member'}: ${last.message || 'Shared attachment'}`,
            time: formatConversationTime(last.created_at),
            timestamp: new Date(last.created_at).getTime()
          };
        }
        if (engMsgs?.length) {
          const last = engMsgs[engMsgs.length - 1];
          meta['engineering'] = {
            lastMessage: `${last.sender?.first_name || last.sender_name || 'Member'}: ${last.message || 'Shared attachment'}`,
            time: formatConversationTime(last.created_at),
            timestamp: new Date(last.created_at).getTime()
          };
        }
        if (sprintMsgs?.length) {
          const last = sprintMsgs[sprintMsgs.length - 1];
          meta['sprint'] = {
            lastMessage: `${last.sender?.first_name || last.sender_name || 'Member'}: ${last.message || 'Shared attachment'}`,
            time: formatConversationTime(last.created_at),
            timestamp: new Date(last.created_at).getTime()
          };
        }
        setChannelMeta(meta);
        try {
          localStorage.setItem(`workmate_chat_meta_${user?.id}`, JSON.stringify(meta));
        } catch {}

        // Parse global announcements from database channel messages with persistent user acknowledgements
        const loadedAnnouncements = [];
        const seenIds = new Set();

        const userAcks = new Set();
        try {
          const savedUserAcks = localStorage.getItem(`workmate_user_acks_${user?.id}`);
          if (savedUserAcks) {
            JSON.parse(savedUserAcks).forEach(id => userAcks.add(String(id)));
          }
        } catch {}

        let persistentAckMap = {};
        try {
          const savedMap = localStorage.getItem('workmate_announcement_acks_map');
          if (savedMap) persistentAckMap = JSON.parse(savedMap);
        } catch {}

        if (Array.isArray(annMsgs)) {
          for (const msg of annMsgs) {
            try {
              const parsed = typeof msg.message === 'string' && msg.message.startsWith('{') ? JSON.parse(msg.message) : null;
              if (parsed && (parsed.isAnnouncement || parsed.title)) {
                if (parsed.isEdit && parsed.announcementId) {
                  const ex = loadedAnnouncements.find(x => x.id === parsed.announcementId);
                  if (ex) {
                    ex.title = parsed.title;
                    ex.content = parsed.content;
                    ex.updatedAt = parsed.updatedAt;
                    continue;
                  }
                }
                const aId = parsed.id || msg.id;
                const aIdStr = String(aId);
                const isUserAcked = userAcks.has(aIdStr) || Boolean(msg.is_read);

                // Build merged set of acknowledged user IDs
                const ackSet = new Set(parsed.acknowledgedBy || []);
                if (persistentAckMap[aIdStr] && Array.isArray(persistentAckMap[aIdStr])) {
                  persistentAckMap[aIdStr].forEach(uid => ackSet.add(uid));
                }
                if (isUserAcked && user?.id) {
                  ackSet.add(user.id);
                  userAcks.add(aIdStr);
                }

                if (!seenIds.has(aId)) {
                  seenIds.add(aId);
                  loadedAnnouncements.push({
                    id: aId,
                    chatMessageId: msg.id,
                    title: parsed.title,
                    content: parsed.content,
                    author: parsed.author || `${msg.sender?.first_name || ''} ${msg.sender?.last_name || ''}`.trim() || 'TL / Management',
                    authorRole: parsed.authorRole || msg.sender?.role || 'TL',
                    date: parsed.date || formatConversationTime(msg.created_at),
                    createdAt: parsed.createdAt || msg.created_at,
                    acknowledgedBy: Array.from(ackSet),
                    is_read: isUserAcked
                  });
                }
              }
            } catch {}
          }
        }

        // Save back persistent user acks
        try {
          localStorage.setItem(`workmate_user_acks_${user?.id}`, JSON.stringify(Array.from(userAcks)));
        } catch {}

        // Also merge with cached global announcements
        try {
          const cachedGlobal = localStorage.getItem('workmate_global_announcements');
          if (cachedGlobal) {
            const parsed = JSON.parse(cachedGlobal);
            if (Array.isArray(parsed)) {
              parsed.forEach(p => {
                if (!seenIds.has(p.id)) {
                  seenIds.add(p.id);
                  loadedAnnouncements.push(p);
                }
              });
            }
          }
        } catch {}

        // Sort descending by date/createdAt: latest announcements ALWAYS at top!
        loadedAnnouncements.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
        if (loadedAnnouncements.length > 0) {
          setAnnouncements(loadedAnnouncements);
          try {
            localStorage.setItem('workmate_global_announcements', JSON.stringify(loadedAnnouncements));
          } catch {}
        }
      } catch (e) {
        console.error('Failed to load channel chat previews or announcements:', e);
      }
    } catch (err) {
      console.error('Failed to load collaboration data:', err);
      setDataError('Failed to load collaboration data. Please try again.');
    } finally {
      setLoadingData(false);
    }
  };

  const location = useLocation();

  // Lock page-level scrolling to available viewport height on Collaboration Page
  useEffect(() => {
    const mainEl = document.querySelector('.app-main-content');
    if (mainEl) {
      mainEl.classList.add('collaboration-mode');
    }
    return () => {
      if (mainEl) {
        mainEl.classList.remove('collaboration-mode');
      }
    };
  }, []);

  // Ensure the page content starts at the top when navigating from any page or switching tabs
  useEffect(() => {
    const mainEl = document.querySelector('.app-main-content');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [location.pathname, conversationFilter]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle direct conversation selection from navigation or desktop notification click
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetUserId = location.state?.selectedUserId || params.get('userId') || params.get('user');
    const targetChannel = params.get('channel');

    if (targetUserId && teamUsers.length > 0) {
      const u = teamUsers.find(user => String(user.id) === String(targetUserId));
      if (u) {
        setConversationFilter('all');
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
    } else if (targetChannel) {
      setConversationFilter('teams');
      setActiveChatTarget({
        id: targetChannel,
        type: 'team',
        name: targetChannel.charAt(0).toUpperCase() + targetChannel.slice(1),
        subtitle: `${targetChannel} Channel`,
        iconType: 'users'
      });
    }
  }, [location.state, location.search, teamUsers]);

  // Mark a conversation as read in backend and update local unread counts
  const markConversationAsRead = async (target) => {
    if (!target?.id) return;
    const chatType = target.type === 'team' ? 'channel' : target.type === 'dm' ? 'direct' : target.type;
    const targetId = String(target.realUserId || target.id);

    // 1. Optimistically clear the unread count in state immediately
    setUnreadCountsMap(prev => {
      const copy = { ...prev };
      delete copy[targetId];
      delete copy[String(target.id)];
      if (target.name) delete copy[target.name];
      return copy;
    });

    // 2. Optimistically clear direct chat notifications in state so card badge & unread button update in 0ms
    setNotifications(prev => prev.map(n => {
      if ((n.event_type === 'chat.direct' || n.event_type?.startsWith('chat.')) &&
          (String(n.ref_id) === targetId || String(n.ref_id) === String(target.id) || (target.name && n.ref_id === target.name))) {
        return { ...n, is_read: true };
      }
      return n;
    }));

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
      window.__workmate_active_chat = {
        id: activeChatTarget.id,
        type: activeChatTarget.type,
        realUserId: activeChatTarget.realUserId,
        name: activeChatTarget.name
      };
      markConversationAsRead(activeChatTarget);
    } else {
      window.__workmate_active_chat = null;
    }
    return () => {
      window.__workmate_active_chat = null;
    };
  }, [activeChatTarget?.id, activeChatTarget?.type, activeChatTarget?.realUserId, activeChatTarget?.name]);

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

  // Sync total REAL unread count with Sidebar in real-time (strictly direct & channel collaboration chats)
  useEffect(() => {
    if (teamUsers.length === 0) return; // Prevent 0-wipeout before users finish loading

    const validTeamIds = new Set(teamsList.map(t => String(t.id)));
    let realTotal = 0;

    // 1. Direct messages from team members (taking maximum of raw counts and notifications)
    teamUsers.forEach(u => {
      if (String(u.id) === String(user?.id)) return;
      const uIdStr = String(u.id);
      const notifUnread = notifications.filter(n => !n.is_read && n.event_type === 'chat.direct' && String(n.ref_id) === uIdStr).length;
      realTotal += Math.max(Number(unreadCountsMap[uIdStr]) || 0, notifUnread);
    });

    // 2. Standard & team channels
    ['general', 'engineering', 'sprint', 'announcements'].forEach(ch => {
      if (unreadCountsMap[ch]) realTotal += Number(unreadCountsMap[ch]) || 0;
    });
    validTeamIds.forEach(tid => {
      if (unreadCountsMap[tid]) realTotal += Number(unreadCountsMap[tid]) || 0;
    });

    window.dispatchEvent(new CustomEvent('workmate_unread_updated', { detail: { total: realTotal, counts: unreadCountsMap } }));
  }, [unreadCountsMap, notifications, teamUsers, teamsList, user?.id]);

  // Realtime chat message sync to update conversation previews, times, unread counts & announcements
  useRealtime('chat.new_message', (eventData) => {
    if (eventData) {
      const cId = eventData.channel_name || (eventData.chat_type?.startsWith('channel:') ? eventData.chat_type.replace('channel:', '') : null);
      const isSenderMe = String(eventData.sender_id) === String(user?.id);
      const msgTime = new Date(eventData.created_at || Date.now()).getTime();

      if (cId) {
        setChannelMeta(prev => {
          const next = {
            ...prev,
            [cId]: {
              lastMessage: `${eventData.sender?.first_name || eventData.sender_name || 'Member'}: ${eventData.message || 'Shared attachment'}`,
              time: formatConversationTime(eventData.created_at || new Date().toISOString()),
              timestamp: msgTime
            }
          };
          try {
            localStorage.setItem(`workmate_chat_meta_${user?.id}`, JSON.stringify(next));
          } catch {}
          return next;
        });

        // Realtime announcement synchronization across all user sessions
        if (cId === 'announcements') {
          try {
            const parsed = typeof eventData.message === 'string' && eventData.message.startsWith('{') ? JSON.parse(eventData.message) : null;
            if (parsed && (parsed.isAnnouncement || parsed.title)) {
              if (parsed.isEdit && parsed.announcementId) {
                setAnnouncements(prev => {
                  const updated = prev.map(a => a.id === parsed.announcementId ? { ...a, title: parsed.title, content: parsed.content, updatedAt: parsed.updatedAt } : a);
                  try {
                    localStorage.setItem('workmate_global_announcements', JSON.stringify(updated));
                  } catch {}
                  return updated;
                });
              } else {
                const newAnn = {
                  id: parsed.id || eventData.id,
                  chatMessageId: eventData.id,
                  title: parsed.title,
                  content: parsed.content,
                  author: parsed.author || eventData.sender_name || 'TL / Management',
                  authorRole: parsed.authorRole || eventData.sender?.role || 'TL',
                  date: parsed.date || formatConversationTime(eventData.created_at),
                  createdAt: parsed.createdAt || eventData.created_at,
                  acknowledgedBy: []
                };
                setAnnouncements(prev => {
                  const updated = [newAnn, ...prev.filter(a => a.id !== newAnn.id && a.chatMessageId !== newAnn.chatMessageId)];
                  try {
                    localStorage.setItem('workmate_global_announcements', JSON.stringify(updated));
                  } catch {}
                  return updated;
                });
              }
            }
          } catch (e) {
            console.error('Failed to parse incoming announcement event:', e);
          }
        }

        if (!isSenderMe && cId !== 'announcements') {
          const isCurrentOpen = conversationFilter !== 'announcements' && activeChatTarget?.type === 'team' && (String(activeChatTarget?.id) === String(cId) || activeChatTarget?.name === cId) && !document.hidden;
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
        setChannelMeta(prev => {
          const next = {
            ...prev,
            [partnerId]: {
              lastMessage: eventData.message || 'Shared attachment',
              time: formatConversationTime(eventData.created_at || new Date().toISOString()),
              timestamp: msgTime
            }
          };
          try {
            localStorage.setItem(`workmate_chat_meta_${user?.id}`, JSON.stringify(next));
          } catch {}
          return next;
        });

        if (!isSenderMe) {
          const isCurrentOpen = conversationFilter !== 'announcements' && activeChatTarget?.type === 'dm' && (String(activeChatTarget?.id) === partnerId || String(activeChatTarget?.realUserId) === partnerId) && !document.hidden;
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

  // Realtime message deletion listener (removes deleted announcement in real-time)
  useRealtime('chat.message_deleted', (eventData) => {
    if (!eventData?.id) return;
    setAnnouncements(prev => {
      const updated = prev.filter(a => String(a.chatMessageId) !== String(eventData.id) && String(a.id) !== String(eventData.id));
      try {
        localStorage.setItem('workmate_global_announcements', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  });

  // Publish Announcement (Posts to backend channel so all roles see it, and updates local state)
  const handlePublishAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    const newAnn = {
      isAnnouncement: true,
      id: `ann_${Date.now()}`,
      title: annTitle.trim(),
      author: `${user?.first_name || 'Management'} ${user?.last_name || ''}`.trim() || user?.email,
      authorRole: role,
      date: new Date().toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }),
      createdAt: new Date().toISOString(),
      content: annContent.trim(),
      acknowledgedBy: []
    };

    try {
      const res = await sendChannelMessage('announcements', {
        message: JSON.stringify(newAnn)
      });
      if (res?.id) {
        newAnn.chatMessageId = res.id;
      }
    } catch (err) {
      console.error('Failed to broadcast announcement to server channel:', err);
    }

    const updated = [newAnn, ...announcements.filter(a => a.id !== newAnn.id)];
    setAnnouncements(updated);
    try {
      localStorage.setItem('workmate_global_announcements', JSON.stringify(updated));
    } catch {}

    setAnnTitle('');
    setAnnContent('');
    setShowNewAnnouncementModal(false);
  };

  // Start Editing Announcement (Only for TL admin & management)
  const handleStartEditAnnouncement = (ann) => {
    setEditingAnnouncement(ann);
    setEditAnnTitle(ann.title || '');
    setEditAnnContent(ann.content || '');
    setShowEditAnnouncementModal(true);
  };

  // Save Edited Announcement (Broadcasts edit to all roles)
  const handleSaveEditAnnouncement = async (e) => {
    e.preventDefault();
    if (!editingAnnouncement || !editAnnTitle.trim() || !editAnnContent.trim()) return;

    const updatedTitle = editAnnTitle.trim();
    const updatedContent = editAnnContent.trim();
    const updatedAt = new Date().toISOString();

    const updatedList = announcements.map(a => {
      if (a.id === editingAnnouncement.id || (a.chatMessageId && a.chatMessageId === editingAnnouncement.chatMessageId)) {
        return {
          ...a,
          title: updatedTitle,
          content: updatedContent,
          updatedAt
        };
      }
      return a;
    });

    setAnnouncements(updatedList);
    try {
      localStorage.setItem('workmate_global_announcements', JSON.stringify(updatedList));
    } catch {}

    try {
      await sendChannelMessage('announcements', {
        message: JSON.stringify({
          isAnnouncement: true,
          isEdit: true,
          announcementId: editingAnnouncement.id,
          title: updatedTitle,
          content: updatedContent,
          author: editingAnnouncement.author,
          authorRole: editingAnnouncement.authorRole,
          updatedAt
        })
      });
    } catch (err) {
      console.error('Failed to broadcast edited announcement:', err);
    }

    setShowEditAnnouncementModal(false);
    setEditingAnnouncement(null);
  };

  // Delete Announcement (Deletes from backend & shared state)
  const handleDeleteAnnouncement = async (ann) => {
    if (!window.confirm(`Are you sure you want to delete the announcement "${ann.title}"?`)) return;

    const updatedList = announcements.filter(a => a.id !== ann.id && a.chatMessageId !== ann.chatMessageId);
    setAnnouncements(updatedList);
    try {
      localStorage.setItem('workmate_global_announcements', JSON.stringify(updatedList));
    } catch {}

    if (ann.chatMessageId) {
      try {
        await deleteChatMessage(ann.chatMessageId);
      } catch (err) {
        console.error('Failed to delete announcement message from server:', err);
      }
    }
  };

  // Acknowledge Announcement (Persists across browser refreshes and user sessions)
  const handleAcknowledgeAnnouncement = async (ann) => {
    if (!ann || !user?.id) return;
    const annIdStr = String(ann.id || ann);

    // 1. Persist in user-specific localStorage so it NEVER resets on refresh
    try {
      const key = `workmate_user_acks_${user?.id}`;
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      if (!saved.includes(annIdStr)) {
        saved.push(annIdStr);
        localStorage.setItem(key, JSON.stringify(saved));
      }
    } catch {}

    // 2. Persist in global announcement acks map
    try {
      const mapKey = 'workmate_announcement_acks_map';
      const map = JSON.parse(localStorage.getItem(mapKey) || '{}');
      const existingList = map[annIdStr] || [];
      if (!existingList.includes(user.id)) {
        map[annIdStr] = [...existingList, user.id];
        localStorage.setItem(mapKey, JSON.stringify(map));
      }
    } catch {}

    // 3. Mark read in backend database
    if (ann.chatMessageId) {
      try {
        await markChatRead({
          chat_type: 'channel',
          target_id: 'announcements',
          message_ids: [ann.chatMessageId]
        });
      } catch (err) {
        console.error('Failed to mark announcement as read in backend:', err);
      }
    }

    // 4. Update announcements state immediately
    setAnnouncements(prev => {
      const updated = prev.map(item => {
        if (String(item.id) === annIdStr || (item.chatMessageId && item.chatMessageId === ann.chatMessageId)) {
          const currentAck = item.acknowledgedBy || [];
          const nextAck = currentAck.includes(user.id) ? currentAck : [...currentAck, user.id];
          return {
            ...item,
            acknowledgedBy: nextAck,
            is_read: true
          };
        }
        return item;
      });
      try {
        localStorage.setItem('workmate_global_announcements', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };




  const renderFullscreenButton = () => (
    <button
      type="button"
      onClick={() => setIsFullScreen(!isFullScreen)}
      style={{
        background: 'transparent',
        border: 'none',
        color: '#94A3B8',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        borderRadius: '6px',
        transition: 'color 0.15s ease'
      }}
      onMouseEnter={(e) => e.currentTarget.style.color = '#1E293B'}
      onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
      title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
    >
      {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
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
      width: '100%',
      height: '100%',
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>


      {/* MAIN COLLABORATION SPLIT VIEW */}
      {(() => {
        // Sort announcements newest first so they always appear at the top in the left profile box
        const sortedAnnouncements = [...announcements].sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));

        // 1. Announcements (Notice board, General Announcements channel, and published notices)
        const announcementChannels = [
          {
            id: 'company_announcements',
            type: 'announcement',
            name: 'Company Announcements & Notices',
            subtitle: `${sortedAnnouncements.length} official ${sortedAnnouncements.length === 1 ? 'notice' : 'notices'} · Management updates`,
            iconType: 'megaphone',
            memberCount: `${teamUsers.length || 1} members`,
            lastMessage: sortedAnnouncements.length > 0 ? `${sortedAnnouncements[0].title}: ${sortedAnnouncements[0].content}` : 'Official company notices and updates',
            time: sortedAnnouncements.length > 0 ? (sortedAnnouncements[0].date || formatConversationTime(sortedAnnouncements[0].createdAt)) : '',
            unreadCount: sortedAnnouncements.filter(a => !a.acknowledgedBy?.includes(user?.id)).length
          },
          {
            id: 'general',
            type: 'announcement',
            name: 'General Announcements',
            subtitle: 'Team-wide updates and important information',
            iconType: 'megaphone',
            memberCount: `${teamUsers.length || 1} ${teamUsers.length === 1 ? 'member' : 'members'}`,
            lastMessage: channelMeta['general']?.lastMessage || 'Team-wide updates and announcements',
            time: channelMeta['general']?.time || '',
            unreadCount: unreadCountsMap['general'] ?? unreadCountsMap['General Announcements'] ?? 0
          },
          ...sortedAnnouncements.map(a => {
            const isAck = a.acknowledgedBy?.includes(user?.id);
            return {
              id: `notice_${a.id}`,
              noticeId: a.id,
              type: 'announcement',
              name: a.title || 'Official Announcement',
              subtitle: `By ${a.author || 'Management'}${a.authorRole ? ` (${a.authorRole})` : ''}`,
              iconType: 'megaphone',
              memberCount: `${a.acknowledgedBy?.length || 0} acknowledged`,
              lastMessage: a.content || 'Company notice',
              time: a.date || formatConversationTime(a.createdAt),
              unreadCount: isAck ? 0 : 1,
              isNotice: true,
              rawNotice: a
            };
          })
        ];

        // 2. Team Channels (Strictly teams: Engineering, Sprint, and DB teams)
        const teamChannels = [
          {
            id: 'engineering',
            type: 'team',
            name: 'Engineering & Tech',
            subtitle: 'Engineering discussions, architecture & releases',
            iconType: 'users',
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
          },
          ...teamsList.map(t => {
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
          })
        ];

        // 3. Direct Messages (Team Members) — WhatsApp Style: latest message profile always at the top!
        const directMessages = teamUsers
          .filter(u => String(u.id) !== String(user?.id))
          .map(u => {
            const uIdStr = String(u.id);
            const notifUnread = notifications.filter(n => !n.is_read && n.event_type === 'chat.direct' && String(n.ref_id) === uIdStr).length;
            const unreadCount = Math.max(unreadCountsMap[uIdStr] || 0, notifUnread);
            const latestNotif = notifications.find(n => n.event_type === 'chat.direct' && String(n.ref_id) === uIdStr);
            const metaObj = channelMeta[uIdStr];

            let lastMsg = `Start direct message with ${u.first_name || 'member'}`;
            let timeVal = '';
            let timestamp = 0;

            if (metaObj && (metaObj.timestamp || metaObj.lastMessage)) {
              timestamp = metaObj.timestamp || 0;
              lastMsg = metaObj.lastMessage || lastMsg;
              timeVal = metaObj.time || (metaObj.timestamp ? formatConversationTime(new Date(metaObj.timestamp).toISOString()) : '');
            } else if (latestNotif?.created_at) {
              timestamp = new Date(latestNotif.created_at).getTime();
              lastMsg = latestNotif.message || lastMsg;
              timeVal = formatConversationTime(latestNotif.created_at);
            }

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
              timestamp,
              unreadCount,
              realUser: u
            };
          });

        // WhatsApp-Style: Conversations with the most recent messages are ALWAYS at the top!
        directMessages.sort((a, b) => {
          if ((b.timestamp || 0) !== (a.timestamp || 0)) {
            return (b.timestamp || 0) - (a.timestamp || 0);
          }
          if ((b.unreadCount || 0) !== (a.unreadCount || 0)) {
            return (b.unreadCount || 0) - (a.unreadCount || 0);
          }
          return a.name.localeCompare(b.name);
        });

        const conversationList = [...announcementChannels, ...teamChannels, ...directMessages];

        // Filter based on active tab and search query
        const filteredList = conversationList.filter(item => {
          if (conversationFilter === 'all' && item.type !== 'dm') return false;
          if (conversationFilter === 'teams' && item.type !== 'team') return false;
          if (conversationFilter === 'announcements' && item.type !== 'announcement') return false;
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
            display: 'flex',
            overflow: 'hidden'
          } : {
            flex: 1,
            display: 'flex',
            gap: 0,
            overflow: 'hidden',
            height: '100%',
            minHeight: 0,
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            {/* Conversations Left Card */}
            <div style={{
              width: '350px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              background: '#FFFFFF',
              borderRight: '1px solid #E2E8F0',
              height: '100%',
              minHeight: 0,
              overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{ padding: '18px 20px 12px 20px', flexShrink: 0 }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
                  Conversations
                </h2>
              </div>

              {/* Search Bar */}
              <div style={{ padding: '0 18px 12px 18px', flexShrink: 0 }}>
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
              <div
                className="filter-tabs-scroll"
                style={{
                  padding: '0 18px 14px 18px',
                  display: 'flex',
                  gap: '8px',
                  flexShrink: 0,
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  whiteSpace: 'nowrap',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                {[
                  { key: 'all', label: 'All' },
                  { key: 'unread', label: 'Unread' },
                  { key: 'announcements', label: 'Announcements' },
                  { key: 'teams', label: 'Teams' }
                ].map(tab => {
                  const isActive = conversationFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setConversationFilter(tab.key);
                        if (tab.key === 'announcements') {
                          setSelectedAnnouncementId('company_announcements');
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: 'none',
                        background: isActive ? '#5551FF' : '#F1F5F9',
                        color: isActive ? '#FFFFFF' : '#64748B',
                        fontSize: '12.5px',
                        fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        flexShrink: 0,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span>{tab.label}</span>
                      {tab.key === 'unread' && conversationList.filter(item => item.unreadCount > 0).length > 0 && (
                        <span style={{
                          background: isActive ? '#FFFFFF' : '#5551FF',
                          color: isActive ? '#5551FF' : '#FFFFFF',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '10px',
                          lineHeight: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {conversationList.filter(item => item.unreadCount > 0).length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Conversation Cards List */}
              <div style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '0 0 16px 0',
                display: 'flex',
                flexDirection: 'column'
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
                      {conversationFilter === 'unread' ? 'No unread conversations' :
                       conversationFilter === 'announcements' ? 'No announcements found' :
                       conversationFilter === 'teams' ? 'No teams found' :
                       conversationSearch ? 'No matching conversations' : 'No conversations found'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
                      {conversationFilter === 'unread' ? 'You are all caught up!' :
                       conversationFilter === 'announcements' ? 'Official notices and company updates will appear here' :
                       conversationFilter === 'teams' ? 'Team channels will appear here' :
                       conversationSearch ? 'Try a different search keyword' : 'Start a direct chat with your team'}
                    </p>
                  </div>
                ) : (
                  filteredList.map(item => {
                    const isSelected = conversationFilter === 'announcements'
                      ? (selectedAnnouncementId === item.id)
                      : Boolean(activeChatTarget && (activeChatTarget.id === item.id || (activeChatTarget.realUserId && activeChatTarget.realUserId === item.realUserId)));
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (conversationFilter === 'announcements') {
                            setSelectedAnnouncementId(item.id);
                            if (item.noticeId) {
                              const el = document.getElementById(`announcement_card_${item.noticeId}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                            return;
                          }
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
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 18px',
                          cursor: 'pointer',
                          background: isSelected ? '#FFFFFF' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {/* Blue indicator bar on left edge when selected */}
                        {isSelected && (
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: '6px',
                            bottom: '6px',
                            width: '3.5px',
                            background: '#5551FF',
                            borderRadius: '0 4px 4px 0'
                          }} />
                        )}

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
                            <span style={{
                              fontSize: '11.5px',
                              color: item.unreadCount > 0 ? '#5551FF' : '#94A3B8',
                              fontWeight: item.unreadCount > 0 ? 600 : 400,
                              flexShrink: 0,
                              marginLeft: '6px'
                            }}>
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
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                background: '#5551FF',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
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

            {/* Right Card — Chat Window or Announcements */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minWidth: 0,
              minHeight: 0,
              background: '#FFFFFF',
              overflow: 'hidden'
            }}>
              {conversationFilter === 'announcements' ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, minHeight: 0, background: '#FFFFFF', overflow: 'hidden' }}>
                  {/* Announcements Header */}
                  <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: '#EEF2FF',
                        color: '#5551FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Megaphone size={20} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          Company Announcements & Notices
                        </h2>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                          Official management notices and company updates
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {(isExecutive || isTL) && (
                        <button
                          type="button"
                          onClick={() => setShowNewAnnouncementModal(true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            background: '#5551FF',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Megaphone size={15} /> Publish Announcement
                        </button>
                      )}
                      {renderFullscreenButton()}
                    </div>
                  </div>

                  {/* Announcements Feed */}
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    {sortedAnnouncements.length === 0 ? (
                      <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94A3B8', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                        <Megaphone size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4, color: '#5551FF' }} />
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', margin: '0 0 4px 0' }}>No announcements published yet</p>
                        <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>Official company notices and management announcements will appear here.</p>
                      </div>
                    ) : (() => {
                      const userAcksSet = (() => {
                        try {
                          return new Set(JSON.parse(localStorage.getItem(`workmate_user_acks_${user?.id}`) || '[]'));
                        } catch { return new Set(); }
                      })();

                      return sortedAnnouncements.map(a => {
                        const isAck = a.acknowledgedBy?.includes(user?.id) || Boolean(a.is_read) || userAcksSet.has(String(a.id));
                        const isCardSelected = selectedAnnouncementId === `notice_${a.id}`;
                        return (
                          <div
                            key={a.id}
                            id={`announcement_card_${a.id}`}
                            style={{
                              padding: '20px 24px',
                              borderRadius: '14px',
                              border: isCardSelected ? '1.5px solid #5551FF' : '1px solid #E2E8F0',
                              borderLeft: '4px solid #5551FF',
                              background: '#FFFFFF',
                              boxShadow: isCardSelected ? '0 4px 14px rgba(85, 81, 255, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#5551FF',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                background: '#EEF2FF',
                                padding: '3px 8px',
                                borderRadius: '6px'
                              }}>
                                Official Notice
                              </span>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '12px', color: '#94A3B8' }}>{a.date} • by {a.author}</span>

                                {/* Edit & Delete buttons strictly for admin TL & management */}
                                {canManageAnnouncements && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditAnnouncement(a)}
                                      title="Edit announcement"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 9px',
                                        borderRadius: '6px',
                                        border: '1px solid #CBD5E1',
                                        background: '#F8FAFC',
                                        color: '#334155',
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5551FF'; e.currentTarget.style.color = '#5551FF'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#334155'; }}
                                    >
                                      <Pencil size={12} /> Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAnnouncement(a)}
                                      title="Delete announcement"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 9px',
                                        borderRadius: '6px',
                                        border: '1px solid #FECACA',
                                        background: '#FEF2F2',
                                        color: '#EF4444',
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE2E2'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.background = '#FEF2F2'; }}
                                    >
                                      <Trash2 size={12} /> Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>{a.title}</h3>
                            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.55, margin: '0 0 16px 0', whiteSpace: 'pre-wrap' }}>{a.content}</p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                              <span style={{ fontSize: '12px', color: '#64748B' }}>
                                {a.acknowledgedBy?.length || 0} employees acknowledged
                              </span>

                              <button
                                onClick={() => handleAcknowledgeAnnouncement(a)}
                                disabled={isAck}
                                style={{
                                  padding: '6px 14px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  borderRadius: '8px',
                                  border: isAck ? '1px solid #10B981' : 'none',
                                  background: isAck ? 'rgba(16, 185, 129, 0.12)' : '#5551FF',
                                  color: isAck ? '#10B981' : '#FFFFFF',
                                  cursor: isAck ? 'default' : 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <CheckCircle2 size={14} /> {isAck ? 'Acknowledged' : 'Acknowledge Notice'}
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ) : activeChatTarget ? (() => {
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
                    allChannels={[...announcementChannels, ...teamChannels]}
                    layoutVariant="collaboration_hub"
                    headerExtra={renderFullscreenButton()}
                    onMarkAsRead={() => markConversationAsRead(activeChatTarget)}
                  />
                );
              })() : (
                /* WhatsApp Web-Style Default Welcome View */
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  background: '#F8FAFC',
                  padding: '40px 24px',
                  position: 'relative',
                  textAlign: 'center',
                  userSelect: 'none'
                }}>
                  <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                    {renderFullscreenButton()}
                  </div>

                  {/* Icon illustration */}
                  <div style={{
                    width: '92px',
                    height: '92px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(85, 81, 255, 0.12)',
                    marginBottom: '20px'
                  }}>
                    <MessageSquare size={44} color="#5551FF" />
                  </div>

                  {/* Title & subtitle */}
                  <h2 style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#0F172A',
                    margin: '0 0 10px 0',
                    letterSpacing: '-0.02em'
                  }}>
                    Workmate Collaboration
                  </h2>

                  <p style={{
                    fontSize: '13.5px',
                    color: '#64748B',
                    lineHeight: 1.6,
                    maxWidth: '440px',
                    margin: '0 0 24px 0'
                  }}>
                    Send and receive direct messages with colleagues, coordinate with project teams, and stay updated with official company notices in real time.
                  </p>

                  {/* Instruction Pill */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 20px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '24px',
                    fontSize: '13px',
                    color: '#475569',
                    fontWeight: 500,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}>
                    <span style={{ fontSize: '15px' }}>👈</span>
                    <span>Select a conversation from the left to start chatting</span>
                  </div>

                  {/* WhatsApp-style encryption / security note */}
                  <div style={{
                    position: 'absolute',
                    bottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    fontSize: '12px',
                    color: '#94A3B8'
                  }}>
                    <Lock size={13} color="#94A3B8" />
                    <span>End-to-end encrypted workspace communications</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

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

      {/* MODAL: EDIT ANNOUNCEMENT (TL ADMIN & MANAGEMENT ONLY) */}
      {showEditAnnouncementModal && editingAnnouncement && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleSaveEditAnnouncement} className="card" style={{ width: '500px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pencil size={20} color="var(--brand-600)" /> Edit Announcement
              </h3>
              <button
                type="button"
                onClick={() => { setShowEditAnnouncementModal(false); setEditingAnnouncement(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Headline</label>
              <input
                type="text"
                value={editAnnTitle}
                onChange={(e) => setEditAnnTitle(e.target.value)}
                placeholder="Announcement headline..."
                required
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Notice Details</label>
              <textarea
                value={editAnnContent}
                onChange={(e) => setEditAnnContent(e.target.value)}
                rows={4}
                placeholder="Full notice text for team..."
                required
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setShowEditAnnouncementModal(false); setEditingAnnouncement(null); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
