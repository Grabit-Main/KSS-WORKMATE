import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import api from '../api/axios';
import { getTasks } from '../api/tasks';
import {
  MessageSquare, Send, Users, Sparkles, Search, Paperclip, Smile, AtSign,
  Pin, Bell, CheckCircle2, Filter, Folder, CheckSquare, Megaphone, HelpCircle,
  FileText, ArrowUpRight, MessageCircle, AlertCircle, X, ChevronRight, User, ThumbsUp, Heart
} from 'lucide-react';

export default function CollaborationPage() {
  const { user } = useAuth();
  const role = user?.role || 'TM';
  const isExecutive = ['CEO', 'CTO'].includes(role);
  const isPM = role === 'PM';
  const isTL = role === 'TL';

  // Navigation & View Tabs: 'chats', 'projects', 'tasks', 'mentions', 'announcements'
  const [activeTab, setActiveTab] = useState('chats');

  // Real Data Lists
  const [teamUsers, setTeamUsers] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Active Selections
  const [activeChatTarget, setActiveChatTarget] = useState({ type: 'team', id: 'general', name: 'General Announcements' });
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Messages & Form State
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mentionsFilter, setMentionsFilter] = useState('all');

  // Announcements State
  const [announcements, setAnnouncements] = useState(() => {
    try {
      const saved = localStorage.getItem(`workos_announcements_${user?.id}`);
      return saved ? JSON.parse(saved) : [
        {
          id: 1,
          title: 'Q3 Database Backup & Security Audit Completed',
          author: 'Satya Ranjan Das (CTO)',
          date: new Date().toLocaleDateString(),
          content: 'We have successfully restored and verified all production PostgreSQL backups up to 24-09-2026. All systems are operational.',
          acknowledgedBy: []
        },
        {
          id: 2,
          title: 'Weekly Sprint Standup & KPI Submissions',
          author: 'Kalpanaaa Management',
          date: new Date().toLocaleDateString(),
          content: 'Please ensure all daily task logs and progress status updates are recorded in My Work before 07:00 PM daily.',
          acknowledgedBy: []
        }
      ];
    } catch { return []; }
  });

  const [showNewAnnouncementModal, setShowNewAnnouncementModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  const chatEndRef = useRef(null);

  // Fetch Core Data (Users, Projects, Tasks)
  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      const [resUsers, resProj, resTasks] = await Promise.all([
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/projects').catch(() => ({ data: [] })),
        getTasks().catch(() => [])
      ]);

      if (Array.isArray(resUsers.data)) setTeamUsers(resUsers.data);
      if (Array.isArray(resProj.data)) {
        setProjectsList(resProj.data);
        if (resProj.data.length > 0 && !selectedProjectId) setSelectedProjectId(resProj.data[0].id);
      }
      if (Array.isArray(resTasks)) {
        setTasksList(resTasks);
        if (resTasks.length > 0 && !selectedTaskId) setSelectedTaskId(resTasks[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch Messages for Selected Target (Chat / Task / Project)
  const fetchMessages = useCallback(async () => {
    if (activeTab === 'tasks' && selectedTaskId) {
      try {
        const res = await api.get(`/tasks/${selectedTaskId}/chat`).catch(() => ({ data: [] }));
        if (Array.isArray(res.data)) {
          setMessages(res.data.map(m => ({
            id: m.id,
            user_name: m.sender ? `${m.sender.first_name} ${m.sender.last_name}` : 'Team Member',
            user_role: m.sender?.role || 'TM',
            content: m.message,
            attachment_url: m.attachment_url,
            created_at: m.created_at
          })));
          return;
        }
      } catch (err) {}
    }

    // Default Channel Messages
    try {
      const storageKey = `collab_msgs_${activeChatTarget.type}_${activeChatTarget.id}`;
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        setMessages(JSON.parse(cached));
      } else {
        const initial = [
          {
            id: 1,
            user_name: 'Satya Ranjan Das',
            user_role: 'TL',
            content: `Welcome to #${activeChatTarget.name}. Feel free to share project updates, technical questions, and task dependencies here.`,
            created_at: new Date(Date.now() - 3600000).toISOString()
          }
        ];
        setMessages(initial);
        localStorage.setItem(storageKey, JSON.stringify(initial));
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeTab, selectedTaskId, activeChatTarget]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime handlers
  useRealtime('chat.message_sent', fetchMessages);
  useRealtime('notification.new', fetchMessages);

  // Send Message Handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const newMsgObj = {
      id: Date.now(),
      user_name: `${user?.first_name || 'User'} ${user?.last_name || ''}`.trim(),
      user_role: role,
      content: inputMsg.trim(),
      created_at: new Date().toISOString()
    };

    if (activeTab === 'tasks' && selectedTaskId) {
      try {
        await api.post(`/tasks/${selectedTaskId}/chat`, { message: inputMsg.trim() });
        fetchMessages();
      } catch (err) {
        setMessages(prev => [...prev, newMsgObj]);
      }
    } else {
      setMessages(prev => {
        const next = [...prev, newMsgObj];
        const storageKey = `collab_msgs_${activeChatTarget.type}_${activeChatTarget.id}`;
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    }

    setInputMsg('');
  };

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

  // Summary Metrics
  const summaryCards = {
    unread: 3,
    mentions: messages.filter(m => m.content?.includes(`@${user?.first_name}`) || m.content?.includes('@all')).length,
    discussions: projectsList.length + tasksList.length,
    pendingReplies: tasksList.filter(t => t.status === 'in_review').length
  };

  const activeProjectObj = projectsList.find(p => p.id === selectedProjectId);
  const activeTaskObj = tasksList.find(t => t.id === selectedTaskId);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', height: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column', paddingBottom: '20px' }}>
      
      {/* HEADER & BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 28px',
        marginBottom: '20px',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'var(--brand-600)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MessageSquare size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Collaboration & Communication Hub
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '2px 0 0 0' }}>
              {isExecutive ? "Executive communication suite: Direct channels, high-level project discussions & announcements." :
               isPM ? "Project communication center: Project discussions, requirement alignment & team updates." :
               isTL ? "Team coordination hub: Team discussions, task reviews & direct member chats." :
               "Connected work discussions: Chat with teammates, project threads & task discussions."}
            </p>
          </div>
        </div>

        {/* Global Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages, tasks, people..."
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: '13px',
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* TOP SUMMARY METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{summaryCards.unread}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Unread Messages</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AtSign size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{summaryCards.mentions}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mentions</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{summaryCards.discussions}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active Threads</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{summaryCards.pendingReplies}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pending Reviews</div>
          </div>
        </div>
      </div>

      {/* INTERNAL TAB NAVIGATION BAR */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '16px', gap: '12px' }}>
        {[
          { key: 'chats', label: 'Chats', icon: MessageSquare },
          { key: 'projects', label: 'Project Discussions', icon: Folder },
          { key: 'tasks', label: 'Task Discussions', icon: CheckSquare },
          { key: 'mentions', label: 'Mentions', icon: AtSign },
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

      {/* TAB 1: CHATS (DIRECT, TEAM, PROJECT CHANNELS) */}
      {activeTab === 'chats' && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px', minHeight: 0 }}>
          {/* Channel / DM Switcher Sidebar */}
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            {/* Team Channels */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Team Channels
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { id: 'general', name: 'General Announcements', icon: '📢' },
                  { id: 'engineering', name: 'Engineering & Tech', icon: '💻' },
                  { id: 'sprint', name: 'Sprint & Daily Standups', icon: '⚡' }
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActiveChatTarget({ type: 'team', id: c.id, name: c.name })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: activeChatTarget.id === c.id ? '1px solid var(--brand-500)' : '1px solid transparent',
                      background: activeChatTarget.id === c.id ? 'var(--brand-50)' : 'transparent',
                      color: activeChatTarget.id === c.id ? 'var(--brand-600)' : 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: activeChatTarget.id === c.id ? 600 : 500,
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{c.icon}</span>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Messages */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Direct Messages
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {teamUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setActiveChatTarget({ type: 'dm', id: u.id, name: `${u.first_name} ${u.last_name}` })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: activeChatTarget.id === u.id ? '1px solid var(--brand-500)' : '1px solid transparent',
                      background: activeChatTarget.id === u.id ? 'var(--brand-50)' : 'transparent',
                      color: activeChatTarget.id === u.id ? 'var(--brand-600)' : 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: activeChatTarget.id === u.id ? 600 : 500,
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: u.is_active ? '#10B981' : 'var(--border)' }} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.first_name} {u.last_name}</span>
                    <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: 'var(--surface-glass)', color: 'var(--text-tertiary)' }}>{u.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Chat Box */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} color="var(--brand-600)" /> {activeChatTarget.name}
              </div>
            </div>

            {/* Messages Feed */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--brand-500)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0
                  }}>
                    {msg.user_name ? msg.user_name.charAt(0) : 'U'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{msg.user_name}</span>
                      <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: 'var(--brand-50)', color: 'var(--brand-600)', fontWeight: 600 }}>{msg.user_role}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                    <div style={{
                      background: 'var(--surface-glass)',
                      padding: '10px 14px',
                      borderRadius: '0 12px 12px 12px',
                      fontSize: '14px',
                      color: 'var(--text-primary)',
                      lineHeight: 1.4,
                      border: '1px solid var(--border)'
                    }}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input Box */}
            <form onSubmit={handleSendMessage} style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder={`Message #${activeChatTarget.name}...`}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Send size={16} /> Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: PROJECT DISCUSSIONS */}
      {activeTab === 'projects' && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px', minHeight: 0 }}>
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Select Project
            </div>
            {projectsList.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: selectedProjectId === p.id ? '1px solid var(--brand-500)' : '1px solid transparent',
                  background: selectedProjectId === p.id ? 'var(--brand-50)' : 'transparent',
                  color: selectedProjectId === p.id ? 'var(--brand-600)' : 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: selectedProjectId === p.id ? 600 : 500,
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <Folder size={16} />
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{activeProjectObj?.name || 'Project Discussions'}</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{activeProjectObj?.description || 'Project discussions, milestones, and architectural notes.'}</p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map(msg => (
                <div key={msg.id} style={{ background: 'var(--surface-glass)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{msg.user_name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>{msg.content}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="Post project discussion note..."
                style={{ flex: 1, padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
              />
              <button type="submit" className="btn btn-primary"><Send size={16} /> Post</button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: TASK DISCUSSIONS */}
      {activeTab === 'tasks' && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px', minHeight: 0 }}>
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Select Task
            </div>
            {tasksList.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTaskId(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: selectedTaskId === t.id ? '1px solid var(--brand-500)' : '1px solid transparent',
                  background: selectedTaskId === t.id ? 'var(--brand-50)' : 'transparent',
                  color: selectedTaskId === t.id ? 'var(--brand-600)' : 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: selectedTaskId === t.id ? 600 : 500,
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <CheckSquare size={16} />
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{activeTaskObj?.title || 'Task Discussion'}</h2>
                <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: 'var(--brand-50)', color: 'var(--brand-600)', fontWeight: 600 }}>{activeTaskObj?.status?.toUpperCase()}</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{activeTaskObj?.description}</p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px 0' }}>No comments on this task yet. Start the conversation!</div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} style={{ background: 'var(--surface-glass)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{msg.user_name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}</span>
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>{msg.content}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="Post task comment..."
                style={{ flex: 1, padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
              />
              <button type="submit" className="btn btn-primary"><Send size={16} /> Comment</button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: MENTIONS */}
      {activeTab === 'mentions' && (
        <div className="card" style={{ padding: '24px', flex: 1 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AtSign size={20} color="var(--brand-600)" /> Direct Mentions & Notifications
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.filter(m => m.content?.includes(`@${user?.first_name}`) || true).map(m => (
              <div key={m.id} style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--surface-glass)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-600)', marginBottom: '4px' }}>{m.user_name} mentioned you in discussion</div>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>{m.content}</p>
              </div>
            ))}
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
            {announcements.map(a => {
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
            })}
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
