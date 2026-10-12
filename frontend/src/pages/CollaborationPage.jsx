import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import api from '../api/axios';
import { getTasks } from '../api/tasks';
import { getNotifications } from '../api/notifications';
import {
  MessageSquare, Users, Sparkles, AtSign,
  Bell, CheckCircle2, Folder, CheckSquare, Megaphone,
  FileText, MessageCircle, AlertCircle, X, BookOpen,
  Maximize2, Minimize2
} from 'lucide-react';
import { DocumentationHub } from '../components/documentation/DocumentationHub';
import { TaskChat } from '../components/chat/TaskChat';

export default function CollaborationPage() {
  const { user } = useAuth();
  const role = user?.role || 'TM';
  const isExecutive = ['CEO', 'CTO'].includes(role);
  const isPM = role === 'PM';
  const isTL = role === 'TL';

  // Navigation & View Tabs: 'chats', 'projects', 'tasks', 'mentions', 'announcements'
  const [activeTab, setActiveTab] = useState('chats');
  const [showDocHub, setShowDocHub] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Real Data Lists
  const [teamUsers, setTeamUsers] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [tasksList, setTasksList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Active Selections
  const [activeChatTarget, setActiveChatTarget] = useState({ type: 'team', id: 'general', name: 'General Announcements' });
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

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

  // Fetch Core Data (Users, Projects, Tasks, Notifications)
  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      const [resUsers, resProj, resTasks, resNotifs] = await Promise.all([
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/projects').catch(() => ({ data: [] })),
        getTasks().catch(() => []),
        getNotifications().catch(() => [])
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
      if (Array.isArray(resNotifs)) {
        setNotifications(resNotifs);
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

  // Realtime notification sync
  useRealtime('notification.new', async () => {
    try {
      const notifs = await getNotifications();
      if (Array.isArray(notifs)) setNotifications(notifs);
    } catch (e) {}
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


  const activeProjectObj = projectsList.find(p => p.id === selectedProjectId);
  const activeTaskObj = tasksList.find(t => t.id === selectedTaskId);

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
      <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '20px' }}>
        <DocumentationHub onBackToCollaboration={() => setShowDocHub(false)} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', minHeight: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column', paddingBottom: '20px' }}>
      
      {/* HEADER & BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '16px 24px',
        marginBottom: '16px',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
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

        {/* Documentation Button */}
        <button
          onClick={() => setShowDocHub(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '280px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-600)',
            color: '#ffffff',
            border: 'none',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--brand-700, #4338CA)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--brand-600)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <BookOpen size={17} />
          Documentation
        </button>
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

      {/* TAB 1: CHATS (DIRECT & TEAM CHANNELS) */}
      {activeTab === 'chats' && (
        <div style={isFullScreen ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          background: 'var(--surface)',
          borderRadius: 0,
          border: 'none',
          display: 'flex',
          overflow: 'hidden'
        } : {
          flex: 1,
          display: 'flex',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg, 16px)',
          background: 'var(--surface)',
          overflow: 'hidden',
          height: 'calc(100vh - 210px)',
          minHeight: '700px',
          boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.04))'
        }}>
          {/* Channel / DM Switcher Sidebar */}
          <div style={{
            width: '260px',
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            overflowY: 'auto',
            background: 'var(--surface)'
          }}>
            {/* Team Channels */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginBottom: '10px' }}>
                Team Channels
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { id: 'general', name: 'General Announcements', icon: Megaphone },
                  { id: 'engineering', name: 'Engineering & Tech', icon: FileText },
                  { id: 'sprint', name: 'Sprint & Daily Standups', icon: Sparkles }
                ].map(c => {
                  const Icon = c.icon;
                  const isSelected = activeChatTarget.type === 'team' && activeChatTarget.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveChatTarget({ type: 'team', id: c.id, name: c.name })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: isSelected ? '1px solid #6366F1' : '1px solid transparent',
                        background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        color: isSelected ? '#5551FF' : 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: isSelected ? 600 : 500,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon size={16} color={isSelected ? '#5551FF' : 'var(--text-tertiary)'} />
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct Messages */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginBottom: '10px' }}>
                Direct Messages
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {teamUsers.filter(u => String(u.id) !== String(user?.id)).map(u => {
                  const isSelected = activeChatTarget.type === 'dm' && activeChatTarget.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setActiveChatTarget({ type: 'dm', id: u.id, name: `${u.first_name} ${u.last_name}`.trim(), user: u })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: isSelected ? '1px solid #6366F1' : '1px solid transparent',
                        background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        color: isSelected ? '#5551FF' : 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: isSelected ? 600 : 500,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: u.is_active !== false ? '#10B981' : 'var(--border)' }} />
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.first_name} {u.last_name}</span>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--surface-hover)', color: 'var(--text-tertiary)', fontWeight: 600 }}>{u.role}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Reused Working Chat Component */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, background: 'var(--surface)' }}>
            {activeChatTarget.type === 'team' ? (
              <TaskChat
                key={`channel_${activeChatTarget.id}`}
                mode="channel"
                channelId={activeChatTarget.id}
                channelName={activeChatTarget.name}
                currentUser={user}
                headerExtra={renderFullscreenButton()}
              />
            ) : (
              <TaskChat
                key={`dm_${activeChatTarget.id}`}
                mode="direct"
                partnerUser={teamUsers.find(u => u.id === activeChatTarget.id) || activeChatTarget.user || { id: activeChatTarget.id, first_name: activeChatTarget.name }}
                currentUser={user}
                headerExtra={renderFullscreenButton()}
              />
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PROJECT DISCUSSIONS */}
      {activeTab === 'projects' && (
        <div style={isFullScreen ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          background: 'var(--surface)',
          borderRadius: 0,
          border: 'none',
          display: 'flex',
          overflow: 'hidden'
        } : {
          flex: 1,
          display: 'flex',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg, 16px)',
          background: 'var(--surface)',
          overflow: 'hidden',
          height: 'calc(100vh - 210px)',
          minHeight: '700px',
          boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.04))'
        }}>
          <div style={{
            width: '260px',
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
            background: 'var(--surface)'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Select Project
            </div>
            {projectsList.map(p => {
              const isSelected = selectedProjectId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: isSelected ? '1px solid #6366F1' : '1px solid transparent',
                    background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    color: isSelected ? '#5551FF' : 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Folder size={16} color={isSelected ? '#5551FF' : 'var(--text-tertiary)'} />
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, background: 'var(--surface)' }}>
            {activeProjectObj ? (
              <TaskChat
                key={`project_${activeProjectObj.id}`}
                mode="project"
                project={activeProjectObj}
                currentUser={user}
                headerExtra={renderFullscreenButton()}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
                Select a project to start discussion
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TASK DISCUSSIONS */}
      {activeTab === 'tasks' && (
        <div style={isFullScreen ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          background: 'var(--surface)',
          borderRadius: 0,
          border: 'none',
          display: 'flex',
          overflow: 'hidden'
        } : {
          flex: 1,
          display: 'flex',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg, 16px)',
          background: 'var(--surface)',
          overflow: 'hidden',
          height: 'calc(100vh - 210px)',
          minHeight: '700px',
          boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.04))'
        }}>
          <div style={{
            width: '260px',
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
            background: 'var(--surface)'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Select Task
            </div>
            {tasksList.map(t => {
              const isSelected = selectedTaskId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTaskId(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: isSelected ? '1px solid #6366F1' : '1px solid transparent',
                    background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    color: isSelected ? '#5551FF' : 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <CheckSquare size={16} color={isSelected ? '#5551FF' : 'var(--text-tertiary)'} />
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, background: 'var(--surface)' }}>
            {activeTaskObj ? (
              <TaskChat
                key={`task_${activeTaskObj.id}`}
                mode="task"
                task={activeTaskObj}
                currentUser={user}
                headerExtra={renderFullscreenButton()}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
                Select a task to start discussion
              </div>
            )}
          </div>
        </div>
      )}

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
                      const matchedUser = teamUsers.find(u => u.id === n.ref_id);
                      if (matchedUser) {
                        setActiveChatTarget({ type: 'dm', id: matchedUser.id, name: `${matchedUser.first_name} ${matchedUser.last_name}`, user: matchedUser });
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
