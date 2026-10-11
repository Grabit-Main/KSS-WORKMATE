import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

export default function DeveloperWorkDrawer({
  isOpen,
  onClose,
  developer,
  role = 'TM',
  projectContext = null,
  tasks: propTasks = null,
  projects: propProjects = null,
  users: propUsers = null,
  onRefresh
}) {
  const isTL = role === 'TL';
  const isReadOnly = ['PM', 'CTO', 'CEO'].includes(role);

  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'tasks', 'progress', 'pulse', 'blockers', 'help', 'focus'
  const [developerTasks, setDeveloperTasks] = useState([]);
  const [allTasksList, setAllTasksList] = useState([]);
  const [allUsersList, setAllUsersList] = useState([]);
  const [dailyPulse, setDailyPulse] = useState(null);
  const [blockersList, setBlockersList] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [focusHistory, setFocusHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editProgressTask, setEditProgressTask] = useState(null);
  const [newProgressVal, setNewProgressVal] = useState(50);

  const prevDevIdRef = useRef(null);

  // Instant state reset when switching developers to avoid stale data
  useEffect(() => {
    const curDevId = developer?.id || developer?.user_id || developer?._id;
    if (curDevId && curDevId !== prevDevIdRef.current) {
      prevDevIdRef.current = curDevId;
      setDeveloperTasks([]);
      setDailyPulse(null);
      setBlockersList([]);
      setHelpRequests([]);
      setFocusHistory([]);
    }
  }, [developer]);

  // Load Developer Data strictly scoped to this developer
  const loadDevData = useCallback(async () => {
    if (!developer) return;
    setLoading(true);
    try {
      const rawTargetId = developer?.id || developer?.user_id || developer?._id;
      let activeUuid = isUUID(rawTargetId) ? rawTargetId : null;
      let fetchedUsers = Array.isArray(propUsers) && propUsers.length > 0 ? propUsers : [];

      if (!activeUuid || fetchedUsers.length === 0) {
        try {
          fetchedUsers = await getUsers();
        } catch (e) {
          console.warn('Failed to fetch users:', e);
        }
      }
      setAllUsersList(Array.isArray(fetchedUsers) ? fetchedUsers : []);

      if (!activeUuid && Array.isArray(fetchedUsers)) {
        const devEmail = developer?.email?.toLowerCase();
        const devFullName = `${developer?.first_name || ''} ${developer?.last_name || ''}`.trim().toLowerCase();
        const found = fetchedUsers.find(
          (u) => (devEmail && u.email?.toLowerCase() === devEmail) ||
                 (`${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase() === devFullName)
        );
        if (found) activeUuid = found.id;
      }

      const queryUuid = activeUuid || rawTargetId;

      // Concurrently fetch this developer's specific data using canonical queryUuid
      const [allTasksRes, pulseRes, blockersRes, helpRes, focusRes] = await Promise.all([
        (Array.isArray(propTasks) && propTasks.length > 0) ? Promise.resolve(propTasks) : getTasks().catch(() => []),
        getDailyPulses(queryUuid).catch(() => []),
        getBlockers(queryUuid).catch(() => []),
        getHelpRequests(queryUuid).catch(() => []),
        getFocusSessions(queryUuid).catch(() => [])
      ]);

      const allTasks = Array.isArray(allTasksRes) ? allTasksRes : [];
      setAllTasksList(allTasks);

      // Tasks strictly assigned to this developer
      let filtered = [];
      const devIdStr = String(queryUuid || '').toLowerCase();
      const devEmailStr = String(developer?.email || '').toLowerCase();
      const devNameStr = `${developer?.first_name || ''} ${developer?.last_name || ''}`.trim().toLowerCase();

      filtered = allTasks.filter((t) => {
        const assignedTo = String(t.assigned_to || '').toLowerCase();
        const assigneeId = String(t.assignee?.id || '').toLowerCase();
        const assigneeEmail = String(t.assignee?.email || '').toLowerCase();
        const assigneeName = `${t.assignee?.first_name || ''} ${t.assignee?.last_name || ''}`.trim().toLowerCase();

        return (
          (devIdStr && (assignedTo === devIdStr || assigneeId === devIdStr)) ||
          (devEmailStr && (assignedTo === devEmailStr || assigneeEmail === devEmailStr)) ||
          (devNameStr && (assignedTo === devNameStr || assigneeName === devNameStr))
        );
      });
      setDeveloperTasks(filtered);

      // 1. Daily Pulse (backend or local fallback scoped strictly to this developer)
      if (Array.isArray(pulseRes) && pulseRes.length > 0) {
        setDailyPulse(pulseRes[0]);
      } else {
        try {
          const savedPulse = localStorage.getItem(`mywork_pulse_${queryUuid}`);
          setDailyPulse(savedPulse ? JSON.parse(savedPulse) : null);
        } catch {
          setDailyPulse(null);
        }
      }

      // 2. Blockers (backend query strictly filtered by queryUuid, merged only with developer's own localStorage)
      let localBlockers = [];
      try {
        const savedBlockers = localStorage.getItem(`mywork_blockers_${queryUuid}`);
        if (savedBlockers) {
          const parsed = JSON.parse(savedBlockers);
          if (Array.isArray(parsed)) localBlockers = parsed;
        }
      } catch (e) {}

      const rawBlockers = [
        ...(Array.isArray(blockersRes) ? blockersRes : []),
        ...localBlockers
      ];

      const mergedBlockers = [];
      const seenBlockerKeys = new Set();
      for (const item of rawBlockers) {
        if (!item) continue;
        const key = item.id || item.description;
        if (!seenBlockerKeys.has(key)) {
          seenBlockerKeys.add(key);
          mergedBlockers.push(item);
        }
      }
      setBlockersList(mergedBlockers);

      // 3. Help Requests (backend query strictly filtered by queryUuid, merged only with developer's own localStorage)
      let localHelp = [];
      try {
        const savedHelp = localStorage.getItem(`mywork_help_requests_${queryUuid}`);
        if (savedHelp) {
          const parsed = JSON.parse(savedHelp);
          if (Array.isArray(parsed)) localHelp = parsed;
        }
      } catch (e) {}

      const rawHelp = [
        ...(Array.isArray(helpRes) ? helpRes : []),
        ...localHelp
      ];

      const mergedHelp = [];
      const seenHelpKeys = new Set();
      for (const item of rawHelp) {
        if (!item) continue;
        const key = item.id || item.details || item.topic;
        if (!seenHelpKeys.has(key)) {
          seenHelpKeys.add(key);
          mergedHelp.push(item);
        }
      }
      setHelpRequests(mergedHelp);

      // 4. Focus Sessions (backend query strictly filtered by queryUuid, merged only with developer's own localStorage)
      let localFocus = [];
      try {
        const savedFocus = localStorage.getItem(`mywork_focus_history_${queryUuid}`);
        if (savedFocus) {
          const parsed = JSON.parse(savedFocus);
          if (Array.isArray(parsed)) localFocus = parsed;
        }
      } catch (e) {}

      const rawFocus = [
        ...(Array.isArray(focusRes) ? focusRes : []),
        ...localFocus
      ];

      const mergedFocus = [];
      const seenFocusKeys = new Set();
      for (const item of rawFocus) {
        if (!item) continue;
        const key = item.id || item.session_id || `${item.created_at}_${item.duration_mins}`;
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
  }, [developer, propTasks, propUsers]);

  useEffect(() => {
    if (isOpen && developer) {
      loadDevData();
    }
  }, [isOpen, developer, loadDevData]);

  const tasksMap = useMemo(() => {
    const map = {};
    for (const t of allTasksList) {
      if (t?.id) map[String(t.id)] = t;
    }
    return map;
  }, [allTasksList]);

  const usersMap = useMemo(() => {
    const map = {};
    for (const u of allUsersList) {
      if (u?.id) map[String(u.id)] = u;
    }
    return map;
  }, [allUsersList]);

  if (!isOpen || !developer) return null;

  const devName = `${developer.first_name || ''} ${developer.last_name || ''}`.trim() || developer.email || 'Developer';
  const devRole = developer.role || 'Developer';

  // Summary counts
  const totalTasks = developerTasks.length;
  const inProgressTasks = developerTasks.filter((t) => t.status === 'in_progress').length;
  const completedTasks = developerTasks.filter((t) => t.status === 'completed').length;
  const blockedTasks = developerTasks.filter((t) => t.status === 'blocked').length;

  const getSessionDurationMins = (f) => {
    if (f.duration_mins != null && f.duration_mins > 0) return f.duration_mins;
    if (f.durationMins != null && f.durationMins > 0) return f.durationMins;
    const secs = f.active_duration_secs || f.activeDurationSecs || 0;
    if (secs > 0) return Math.max(1, Math.round(secs / 60));
    return 25;
  };

  const focusMins = focusHistory.reduce((acc, f) => acc + getSessionDurationMins(f), 0);

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
            <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
              {developer.avatar_url ? (
                <img
                  src={developer.avatar_url}
                  alt={devName}
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                    border: '2px solid rgba(255,255,255,0.25)'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) {
                      e.currentTarget.nextSibling.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div style={{
                display: developer.avatar_url ? 'none' : 'flex',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
                color: '#FFFFFF',
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
              {loading ? (
                <div style={{ color: '#64748B', fontSize: '13px', padding: '36px', textAlign: 'center' }}>
                  Loading developer blockers...
                </div>
              ) : blockersList.length === 0 ? (
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
                blockersList.map((b) => {
                  const rawDesc = b.description || '';
                  let type = b.blocker_type || b.type || 'Technical';
                  let cleanDesc = b.clean_description || rawDesc;
                  if (rawDesc.startsWith('[')) {
                    const parts = rawDesc.split(']');
                    type = parts[0].replace('[', '').trim();
                    cleanDesc = parts.slice(1).join(']').trim();
                  }
                  const sevText = (b.severity || 'high').toUpperCase();
                  const badgeText = `${type.toUpperCase()} BLOCKER (${sevText})`;
                  const matchedTask = tasksMap[b.task_id || b.taskId];
                  const taskTitle = b.task_title || b.taskTitle || b.task?.title || matchedTask?.title || (b.task_id ? 'Assigned Task' : 'General Work Item');
                  const projName = b.project_name || b.project || matchedTask?.project?.name || '';
                  
                  let formattedDate = 'Today';
                  if (b.created_at) {
                    const d = new Date(b.created_at);
                    if (!isNaN(d.getTime())) {
                      formattedDate = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    }
                  } else if (b.blockingSince) {
                    formattedDate = b.blockingSince;
                  } else if (b.reportedTime) {
                    formattedDate = b.reportedTime;
                  }

                  const helperName = b.helper || (cleanDesc.includes('Waiting for:') ? cleanDesc.split('Waiting for:')[1].replace(')', '').trim() : '');
                  const status = (b.status || 'open').toUpperCase();
                  const isResolved = status === 'RESOLVED';

                  return (
                    <div key={b.id || b.description} style={{
                      padding: '18px',
                      borderRadius: '14px',
                      borderLeft: `4px solid ${isResolved ? '#10B981' : '#EF4444'}`,
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '3px 9px',
                            borderRadius: '4px',
                            background: isResolved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isResolved ? '#059669' : '#EF4444'
                          }}>
                            {badgeText}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: isResolved ? '#ECFDF5' : '#FEF2F2',
                            color: isResolved ? '#059669' : '#DC2626',
                            border: isResolved ? '1px solid #A7F3D0' : '1px solid #FECACA'
                          }}>
                            {status}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>{formattedDate}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{taskTitle}</h4>
                        {projName && (
                          <span style={{ fontSize: '12px', color: '#6366F1', fontWeight: 600 }}>• {projName}</span>
                        )}
                      </div>

                      <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 8px 0', lineHeight: 1.5 }}>{cleanDesc}</p>
                      {helperName && <div style={{ fontSize: '12px', color: '#4F46E5', fontWeight: 600 }}>Waiting for: {helperName}</div>}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 6: HELP REQUESTS */}
          {activeTab === 'help' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {loading ? (
                <div style={{ color: '#64748B', fontSize: '13px', padding: '36px', textAlign: 'center' }}>
                  Loading help requests...
                </div>
              ) : helpRequests.length === 0 ? (
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
                helpRequests.map((hr) => {
                  const desc = hr.details || hr.description || '';
                  const topic = hr.topic || hr.helpType || 'Technical Guidance';
                  const matchedTask = tasksMap[hr.task_id || hr.taskId];
                  const taskTitle = hr.task_title || hr.taskTitle || hr.task?.title || matchedTask?.title || (hr.task_id ? 'Assigned Task' : 'General Work Item');
                  const projName = hr.project_name || hr.projectName || matchedTask?.project?.name || '';
                  const helperUser = usersMap[hr.helperId];
                  const helper = hr.helperName || hr.helper || (helperUser ? `${helperUser.first_name} ${helperUser.last_name}` : null);
                  const priority = hr.priority || 'Normal';
                  const status = (hr.status || 'open').toUpperCase();
                  
                  let formattedDate = 'Recent';
                  const rawDate = hr.created_at || hr.createdAt;
                  if (rawDate) {
                    const d = new Date(rawDate);
                    if (!isNaN(d.getTime())) {
                      formattedDate = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    }
                  } else if (hr.createdTime) {
                    formattedDate = hr.createdTime;
                  }

                  const prioLower = priority.toLowerCase();
                  const prioColor = prioLower === 'urgent' ? '#DC2626' : (prioLower === 'high' ? '#EA580C' : '#6366F1');
                  const prioBg = prioLower === 'urgent' ? '#FEF2F2' : (prioLower === 'high' ? '#FFF7ED' : '#EEF2FF');

                  return (
                    <div key={hr.id || desc} style={{
                      padding: '18px',
                      borderRadius: '14px',
                      borderLeft: '4px solid #8B5CF6',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#8B5CF6' }}>
                            Topic: {topic}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: prioBg,
                            color: prioColor
                          }}>
                            {priority} Priority
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: '#F3E8FF',
                            color: '#7C3AED'
                          }}>
                            {status}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>{formattedDate}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          {taskTitle}
                        </h4>
                        {projName && (
                          <span style={{ fontSize: '12px', color: '#6366F1', fontWeight: 600 }}>• {projName}</span>
                        )}
                      </div>

                      <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 8px 0', lineHeight: 1.5 }}>{desc}</p>
                      {helper && (
                        <div style={{ fontSize: '12px', color: '#4F46E5', fontWeight: 600 }}>
                          Requested Helper: {helper}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 7: FOCUS SESSIONS */}
          {activeTab === 'focus' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {loading ? (
                <div style={{ color: '#64748B', fontSize: '13px', padding: '36px', textAlign: 'center' }}>
                  Loading focus sessions...
                </div>
              ) : focusHistory.length === 0 ? (
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
                focusHistory.map((f, i) => {
                  const durationMins = getSessionDurationMins(f);
                  const matchedTask = tasksMap[f.task_id || f.taskId];
                  const taskTitle = f.task_title || f.taskTitle || f.task?.title || matchedTask?.title || (f.task_id ? 'Assigned Task' : 'General Focus Session');
                  const projName = f.project_name || f.projectName || matchedTask?.project?.name || '';
                  const summary = f.accomplishment || f.accomplishment_summary;
                  const status = (f.status || 'completed').toUpperCase();
                  const isCompleted = status === 'COMPLETED';

                  let formattedDate = 'Recent';
                  const rawDate = f.started_at || f.created_at || f.endedAt || f.date;
                  if (rawDate) {
                    const d = new Date(rawDate);
                    if (!isNaN(d.getTime())) {
                      formattedDate = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    } else {
                      formattedDate = String(rawDate);
                    }
                  }

                  return (
                    <div key={f.id || i} style={{
                      padding: '18px',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Flame size={16} color="#6366F1" /> Focus Session
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: isCompleted ? '#ECFDF5' : '#FEF3C7',
                            color: isCompleted ? '#059669' : '#D97706',
                            border: isCompleted ? '1px solid #A7F3D0' : '1px solid #FDE68A'
                          }}>
                            {status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#6366F1' }}>
                            {durationMins} mins
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>
                            • {formattedDate}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: 0 }}>
                          {taskTitle}
                        </h4>
                        {projName && (
                          <span style={{ fontSize: '12px', color: '#6366F1', fontWeight: 600 }}>• {projName}</span>
                        )}
                      </div>

                      {summary ? (
                        <div style={{ fontSize: '13px', color: '#334155', background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>Accomplished: </span>
                          {summary}
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', paddingLeft: '4px' }}>
                          No accomplishment summary entered.
                        </div>
                      )}

                      {f.remaining_work && (
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px', paddingLeft: '4px' }}>
                          <span style={{ fontWeight: 600 }}>Remaining: </span>
                          {f.remaining_work}
                        </div>
                      )}
                    </div>
                  );
                })
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
