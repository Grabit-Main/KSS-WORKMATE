import React, { useState, useEffect, useCallback } from 'react';
import {
  X, User, CheckSquare, TrendingUp, FileText, AlertTriangle, HelpCircle,
  Flame, Activity, ShieldAlert, ShieldCheck, Lock, Eye, Edit3, Trash2, Calendar,
  Sparkles, CheckCircle2, Clock
} from 'lucide-react';
import { getTasks, updateTask, deleteTask } from '../../api/tasks';
import { getUsers } from '../../api/users';
import { getDailyPulses, getBlockers, getHelpRequests, getFocusSessions } from '../../api/mywork';
import TaskDetailsModal from '../tasks/TaskDetailsModal';

const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export default function DeveloperWorkDrawer({ isOpen, onClose, developer, role = 'TM', projectContext = null, onRefresh }) {
  const isTL = role === 'TL';
  const isReadOnly = ['PM', 'CTO', 'CEO'].includes(role);

  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'tasks', 'progress', 'pulse', 'blockers', 'help', 'focus'
  const [developerTasks, setDeveloperTasks] = useState([]);
  const [dailyPulse, setDailyPulse] = useState(null);
  const [blockersList, setBlockersList] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [focusHistory, setFocusHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editProgressTask, setEditProgressTask] = useState(null);
  const [newProgressVal, setNewProgressVal] = useState(50);

  const todayStr = new Date().toISOString().split('T')[0];
  const targetDevId = developer?.id || developer?.user_id || developer?._id;

  // Load Developer Data from Backend DB
  const loadDevData = useCallback(async () => {
    if (!developer) return;
    setLoading(true);
    try {
      let activeUuid = isUUID(targetDevId) ? targetDevId : null;
      let allUsers = [];

      if (!activeUuid) {
        try {
          allUsers = await getUsers();
          const devEmail = developer?.email?.toLowerCase();
          const devFullName = `${developer?.first_name || ''} ${developer?.last_name || ''}`.trim().toLowerCase();
          const found = allUsers.find(
            (u) => (devEmail && u.email?.toLowerCase() === devEmail) ||
                   (`${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase() === devFullName)
          );
          if (found) activeUuid = found.id;
        } catch (e) {
          console.warn('Failed to resolve developer UUID:', e);
        }
      }

      const queryUuid = activeUuid || targetDevId;

      const [allTasks, pulseRes, blockersRes, helpRes, focusRes, allBlockersRes] = await Promise.all([
        getTasks().catch(() => []),
        getDailyPulses(queryUuid).catch(() => []),
        getBlockers(queryUuid).catch(() => []),
        getHelpRequests(queryUuid).catch(() => []),
        getFocusSessions(queryUuid).catch(() => []),
        getBlockers().catch(() => [])
      ]);

      let filtered = [];
      if (Array.isArray(allTasks)) {
        const devIdStr = String(queryUuid || '').toLowerCase();
        const devEmailStr = String(developer?.email || '').toLowerCase();
        const devNameStr = `${developer?.first_name || ''} ${developer?.last_name || ''}`.trim().toLowerCase();

        filtered = allTasks.filter((t) => {
          const assignedTo = String(t.assigned_to || '').toLowerCase();
          const assignedBy = String(t.assigned_by || '').toLowerCase();
          const assigneeId = String(t.assignee?.id || '').toLowerCase();
          const assigneeEmail = String(t.assignee?.email || '').toLowerCase();

          return (
            (devIdStr && (assignedTo === devIdStr || assignedBy === devIdStr || assigneeId === devIdStr)) ||
            (devEmailStr && (assignedTo === devEmailStr || assigneeEmail === devEmailStr)) ||
            (devNameStr && (assignedTo === devNameStr))
          );
        });
        setDeveloperTasks(filtered);
      }

      // 1. Daily Pulse (backend or local fallback)
      if (Array.isArray(pulseRes) && pulseRes.length > 0) {
        setDailyPulse(pulseRes[0]);
      } else {
        try {
          const savedPulse = localStorage.getItem(`mywork_pulse_${queryUuid}`) || localStorage.getItem(`mywork_pulse_${developer?.id}`);
          setDailyPulse(savedPulse ? JSON.parse(savedPulse) : null);
        } catch {
          setDailyPulse(null);
        }
      }

      // 2. Blockers (combine user DB, general DB, all localStorage keys, and blocked tasks)
      const dbDevBlockers = (Array.isArray(allBlockersRes) ? allBlockersRes : []).filter((b) => {
        const bUserId = String(b.user_id || '').toLowerCase();
        const targetId = String(queryUuid || developer?.id || '').toLowerCase();
        return bUserId === targetId || bUserId === String(developer?.user_id || '').toLowerCase();
      });

      let localBlockers = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('mywork_blockers')) {
            const val = localStorage.getItem(k);
            if (val) {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) localBlockers.push(...parsed);
            }
          }
        }
      } catch (e) {}

      const taskBlockers = (filtered || [])
        .filter((t) => t.status === 'blocked')
        .map((t) => ({
          id: `task_blocked_${t.id}`,
          description: `[Task Blocker] ${t.title}${t.description ? `: ${t.description}` : ''}`,
          severity: t.priority === 'urgent' ? 'critical' : (t.priority === 'high' ? 'high' : 'medium'),
          status: 'open',
          taskTitle: t.title,
          created_at: t.updated_at || t.created_at
        }));

      const rawBlockers = [
        ...(Array.isArray(blockersRes) ? blockersRes : []),
        ...dbDevBlockers,
        ...localBlockers,
        ...taskBlockers
      ];

      const mergedBlockers = [];
      const seenBlockerKeys = new Set();
      for (const item of rawBlockers) {
        const key = item.id || item.description;
        if (!seenBlockerKeys.has(key)) {
          seenBlockerKeys.add(key);
          mergedBlockers.push(item);
        }
      }
      setBlockersList(mergedBlockers);

      // 3. Help Requests (backend or localStorage)
      let localHelp = [];
      try {
        const savedHelp = localStorage.getItem(`mywork_help_requests_${queryUuid}`) || localStorage.getItem(`mywork_help_requests_${developer?.id}`);
        if (savedHelp) localHelp = JSON.parse(savedHelp);
      } catch (e) {}

      const rawHelp = [
        ...(Array.isArray(helpRes) ? helpRes : []),
        ...localHelp
      ];
      const mergedHelp = [];
      const seenHelpKeys = new Set();
      for (const item of rawHelp) {
        const key = item.id || item.details || item.topic;
        if (!seenHelpKeys.has(key)) {
          seenHelpKeys.add(key);
          mergedHelp.push(item);
        }
      }
      setHelpRequests(mergedHelp);

      // 4. Focus Sessions (backend or localStorage)
      let localFocus = [];
      try {
        const savedFocus = localStorage.getItem(`mywork_focus_history_${queryUuid}`) || localStorage.getItem(`mywork_focus_history_${developer?.id}`);
        if (savedFocus) localFocus = JSON.parse(savedFocus);
      } catch (e) {}

      const rawFocus = [
        ...(Array.isArray(focusRes) ? focusRes : []),
        ...localFocus
      ];
      const mergedFocus = [];
      const seenFocusKeys = new Set();
      for (const item of rawFocus) {
        const key = item.id || `${item.created_at}_${item.duration_mins}`;
        if (!seenFocusKeys.has(key)) {
          seenFocusKeys.add(key);
          mergedFocus.push(item);
        }
      }
      setFocusHistory(mergedFocus);
    } catch (err) {
      console.error('Failed to load developer data:', err);
    } finally {
      setLoading(false);
    }
  }, [developer, targetDevId]);

  useEffect(() => {
    if (isOpen && developer) {
      loadDevData();
    }
  }, [isOpen, developer, loadDevData]);

  if (!isOpen || !developer) return null;

  const devName = `${developer.first_name || ''} ${developer.last_name || ''}`.trim() || developer.email || 'Developer';
  const devRole = developer.role || 'Developer';

  // Summary counts
  const totalTasks = developerTasks.length;
  const inProgressTasks = developerTasks.filter((t) => t.status === 'in_progress').length;
  const completedTasks = developerTasks.filter((t) => t.status === 'completed').length;
  const blockedTasks = developerTasks.filter((t) => t.status === 'blocked').length;

  const totalFocusSecs = focusHistory.reduce((acc, f) => acc + (f.active_duration_secs || f.activeDurationSecs || 0), 0);
  const focusMins = Math.round(totalFocusSecs / 60);

  // TL CRUD Handlers
  const handleTLDeleteTask = async (taskId) => {
    if (!isTL) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(taskId);
      loadDevData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete task.');
    }
  };

  const handleTLUpdateProgress = async (e) => {
    e.preventDefault();
    if (!editProgressTask || !isTL) return;
    try {
      await updateTask(editProgressTask.id, {
        progress: Number(newProgressVal),
        status: Number(newProgressVal) === 100 ? 'completed' : editProgressTask.status
      });
      setEditProgressTask(null);
      loadDevData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to update progress.');
    }
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'tasks', label: `Tasks (${totalTasks})`, icon: CheckSquare },
    { key: 'progress', label: 'Progress', icon: TrendingUp },
    { key: 'pulse', label: 'Daily Pulse', icon: FileText },
    { key: 'blockers', label: `Blockers (${blockersList.length})`, icon: AlertTriangle },
    { key: 'help', label: `Help (${helpRequests.length})`, icon: HelpCircle },
    { key: 'focus', label: `Focus (${focusHistory.length})`, icon: Flame },
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 99999
    }}>
      <div style={{
        width: '100%',
        maxWidth: '740px',
        height: '100%',
        background: '#FFFFFF',
        boxShadow: '-16px 0 60px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* ULTRA-PREMIUM DRAWER HEADER BANNER */}
        <div style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 45%, #312E81 100%)',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 800,
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                border: '2px solid rgba(255,255,255,0.25)'
              }}>
                {devName.charAt(0).toUpperCase()}
              </div>
              <span style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#10B981',
                border: '2px solid #0F172A',
                boxShadow: '0 0 8px #10B981'
              }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#F8FAFC', fontFamily: 'serif, Georgia, Inter, sans-serif', letterSpacing: '-0.01em' }}>
                  {devName}
                </h2>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: '20px',
                  background: 'rgba(99, 102, 241, 0.25)',
                  color: '#A5B4FC',
                  border: '1px solid rgba(165, 180, 252, 0.3)'
                }}>
                  {devRole}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#CBD5E1', marginTop: '3px', fontWeight: 500 }}>
                {developer.email || 'developer@workmate.com'} • {developer.department || 'Engineering'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Access Mode Badge */}
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '5px 12px',
              borderRadius: '20px',
              background: isReadOnly ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.18)',
              color: isReadOnly ? '#FBBF24' : '#34D399',
              border: isReadOnly ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {isReadOnly ? <Eye size={13} /> : <Edit3 size={13} />}
              {isReadOnly ? `${role} View Only` : 'TL Manager CRUD'}
            </span>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#F1F5F9',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* FLOATING PILL NAVIGATION TABS */}
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          background: '#0F172A',
          padding: '10px 18px',
          gap: '6px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '7px 15px',
                  background: isActive ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' : 'transparent',
                  border: 'none',
                  borderRadius: '20px',
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* DRAWER BODY CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#F8FAFC' }}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Total Tasks</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{totalTasks}</div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>In Progress</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>{inProgressTasks}</div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Completed</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>{completedTasks}</div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Total Focus Time</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#6366F1', marginTop: '4px' }}>{focusMins} mins</div>
                </div>
              </div>

              {/* Today's Daily Pulse Summary */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#F59E0B" /> Today's Daily Pulse Status
                </h4>
                {dailyPulse ? (
                  <div style={{ fontSize: '13px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div><strong style={{ color: '#0F172A' }}>Overall Mood/Status:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 700, color: '#6366F1' }}>{dailyPulse.mood || dailyPulse.overallStatus || 'GOOD'}</span></div>
                    {dailyPulse.summary && <div><strong style={{ color: '#0F172A' }}>Work Summary:</strong> {dailyPulse.summary}</div>}
                    {dailyPulse.blockers && <div style={{ color: '#DC2626' }}><strong style={{ color: '#DC2626' }}>Blocker/Concern:</strong> {dailyPulse.blockers}</div>}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#94A3B8', fontStyle: 'italic' }}>No daily pulse submitted yet for today.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TASKS */}
          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {loading ? (
                <div style={{ color: '#64748B', fontSize: '13px', padding: '20px', textAlign: 'center' }}>Loading developer tasks...</div>
              ) : developerTasks.length === 0 ? (
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '40px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <CheckSquare size={36} color="#94A3B8" />
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>No Tasks Assigned</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>This developer currently has no tasks assigned.</div>
                </div>
              ) : (
                developerTasks.map((t) => (
                  <div key={t.id} style={{
                    padding: '18px',
                    borderRadius: '14px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#6366F1', textTransform: 'uppercase' }}>
                          {t.project?.name || 'Project Deliverable'}
                        </span>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '2px 0 0 0' }}>{t.title}</h4>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: t.status === 'completed' ? '#ECFDF5' : t.status === 'blocked' ? '#FEF2F2' : '#EFF6FF',
                        color: t.status === 'completed' ? '#059669' : t.status === 'blocked' ? '#DC2626' : '#2563EB'
                      }}>
                        {t.status ? t.status.replace('_', ' ').toUpperCase() : 'PENDING'}
                      </span>
                    </div>

                    {t.description && <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>{t.description}</p>}

                    {/* TL CRUD Controls or Read-only Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                        Due: {t.deadline ? new Date(t.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedTask(t)}
                          style={{ padding: '5px 12px', fontSize: '12px', background: '#EEF2FF', color: '#4F46E5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          View Details
                        </button>
                        {isTL && (
                          <button
                            onClick={() => handleTLDeleteTask(t.id)}
                            style={{ padding: '5px 12px', fontSize: '12px', background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: PROGRESS */}
          {activeTab === 'progress' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {developerTasks.length === 0 ? (
                <div style={{ background: '#FFFFFF', padding: '36px', borderRadius: '14px', border: '1px solid #E2E8F0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                  No progress records recorded.
                </div>
              ) : (
                developerTasks.map((t) => {
                  const prog = t.progress ?? (t.status === 'completed' ? 100 : (t.status === 'in_progress' ? 50 : 0));
                  return (
                    <div key={t.id} style={{ padding: '18px', borderRadius: '14px', border: '1px solid #E2E8F0', background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{t.title}</span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: prog === 100 ? '#10B981' : '#3B82F6' }}>{prog}%</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${prog}%`, height: '100%', background: prog === 100 ? '#10B981' : '#3B82F6' }} />
                      </div>

                      {isTL && (
                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => {
                              setEditProgressTask(t);
                              setNewProgressVal(prog);
                            }}
                            style={{ padding: '5px 14px', fontSize: '12px', background: '#4F46E5', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Correct Progress
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 4: DAILY PULSE */}
          {activeTab === 'pulse' && (
            <div>
              {dailyPulse ? (
                <div style={{ padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                    Mood / Status: <span style={{ textTransform: 'uppercase', color: '#6366F1' }}>{dailyPulse.mood || dailyPulse.overallStatus || 'GOOD'}</span>
                  </div>
                  {dailyPulse.summary && <div><strong style={{ color: '#0F172A' }}>Summary:</strong> {dailyPulse.summary}</div>}
                  {dailyPulse.blockers && <div style={{ color: '#DC2626' }}><strong style={{ color: '#DC2626' }}>Blocker:</strong> {dailyPulse.blockers}</div>}
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>Date: {dailyPulse.date}</div>
                </div>
              ) : (
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '40px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <FileText size={36} color="#94A3B8" />
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>No Daily Pulse Submitted</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>This developer has not submitted a daily pulse for today.</div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: BLOCKERS */}
          {activeTab === 'blockers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {blockersList.length === 0 ? (
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '40px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertTriangle size={36} color="#10B981" />
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>No Active Blockers</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>All clear! This developer has reported 0 blockers.</div>
                </div>
              ) : (
                blockersList.map((b) => (
                  <div key={b.id} style={{ padding: '18px', borderRadius: '14px', borderLeft: '4px solid #EF4444', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase' }}>Severity: {b.severity}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: b.status === 'resolved' ? '#10B981' : '#EF4444' }}>{b.status.toUpperCase()}</span>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{b.description}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 6: HELP REQUESTS */}
          {activeTab === 'help' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {helpRequests.length === 0 ? (
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '40px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <HelpCircle size={36} color="#94A3B8" />
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>No Help Requests</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>No help requests filed by this developer.</div>
                </div>
              ) : (
                helpRequests.map((hr) => (
                  <div key={hr.id} style={{ padding: '18px', borderRadius: '14px', borderLeft: '4px solid #8B5CF6', background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#8B5CF6' }}>Topic: {hr.topic}</span>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>{hr.status.toUpperCase()}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#334155', margin: 0 }}>{hr.details}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 7: FOCUS SESSIONS */}
          {activeTab === 'focus' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {focusHistory.length === 0 ? (
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '40px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#EEF2FF',
                    color: '#6366F1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Flame size={24} />
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>No Focus Sessions Recorded</div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>This developer has not completed any focus sessions yet.</div>
                </div>
              ) : (
                focusHistory.map((f, i) => (
                  <div key={i} style={{ padding: '18px', borderRadius: '14px', border: '1px solid #E2E8F0', background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Focus Session</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#6366F1' }}>{f.duration_mins || 25} mins</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Status: {f.status}</div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            loadDevData();
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* TL Edit Progress Modal */}
      {editProgressTask && isTL && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <form onSubmit={handleTLUpdateProgress} className="card" style={{ width: '400px', padding: '24px', background: '#FFFFFF', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', color: '#0F172A' }}>Correct Developer Progress</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Progress (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={newProgressVal}
                onChange={(e) => setNewProgressVal(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setEditProgressTask(null)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#4F46E5' }}>Save Correction</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
