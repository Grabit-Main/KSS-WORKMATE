import React, { useEffect, useState, useCallback } from 'react';
import { getHistorySummary, getProjectsHistory, getTasksHistory, getActivityHistory } from '../api/history';
import { useRealtime } from '../realtime/useRealtime';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime, formatDateTime, formatRelativeTime } from '../utils/dateUtils';
import {
  History,
  CheckSquare,
  Folders,
  Activity,
  Search,
  Filter,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  X
} from 'lucide-react';

const HistoryPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('activity'); // 'activity', 'projects', 'tasks'
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const isExecutive = ['CEO', 'CTO'].includes(user?.role);

  // Grouped Activity State & Dialog Modal
  const [selectedActivityGroup, setSelectedActivityGroup] = useState(null);
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activityFeedFilter, setActivityFeedFilter] = useState('all'); // 'all', 'projects', 'tasks'

  // Escape key handler to close pop up dialog box
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedActivityGroup(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filters for Tasks History
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  const loadData = async () => {
    try {
      const [sumRes, projRes, taskRes, actRes] = await Promise.all([
        getHistorySummary().catch(() => null),
        getProjectsHistory().catch(() => []),
        getTasksHistory({ status: taskStatusFilter, search: taskSearchQuery }).catch(() => []),
        getActivityHistory().catch(() => [])
      ]);
      if (sumRes) setSummary(sumRes);
      setProjects(projRes);
      setTasks(taskRes);
      setActivity(actRes);
    } catch (err) {
      console.error('Failed loading history data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [taskStatusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleUpdate = useCallback(() => {
    loadData();
  }, [taskStatusFilter, taskSearchQuery]);

  useRealtime('task.created', handleUpdate);
  useRealtime('task.status_changed', handleUpdate);
  useRealtime('task.reassigned', handleUpdate);
  useRealtime('project.created', handleUpdate);
  useRealtime('project.updated', handleUpdate);

  const toggleTaskExpand = (taskId) => {
    setExpandedTaskId(prev => (prev === taskId ? null : taskId));
  };

  const getStatusTheme = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed') {
      return { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0', dot: '#10B981', label: 'COMPLETED' };
    }
    if (s === 'in_progress' || s === 'active') {
      return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6', label: 'ACTIVE' };
    }
    if (s === 'in_review') {
      return { bg: '#F3E8FF', color: '#6D28D9', border: '#DDD6FE', dot: '#7C3AED', label: 'IN REVIEW' };
    }
    if (s === 'blocked') {
      return { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', dot: '#EF4444', label: 'BLOCKED' };
    }
    return { bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5', dot: '#EF4444', label: 'NOT STARTED' };
  };

  const getStatusBadgeStyle = (status) => {
    const theme = getStatusTheme(status);
    return { bg: theme.bg, color: theme.color, border: theme.border };
  };

  // Separate activities into Project Tasks and Normally Assigned Tasks
  const { projectActivities, normalTaskActivities } = React.useMemo(() => {
    const projectMap = new Map();
    const normalTaskMap = new Map();

    activity.forEach(evt => {
      // Determine whether this activity is linked to a project or is a normally assigned task
      const isProjectLinked = Boolean(
        evt.project_id ||
        evt.is_project_task === true ||
        evt.category === 'project_task' ||
        evt.type === 'project' ||
        (evt.project_name && !evt.project_name.startsWith('Team:') && evt.project_name !== 'General Tasks')
      );

      if (isProjectLinked) {
        // Group by Project
        const key = evt.project_id ? `proj-${evt.project_id}` : (evt.project_name ? `proj-name-${evt.project_name}` : `proj-title-${evt.title}`);
        const title = evt.project_name || evt.title || 'Project Activity';

        if (!projectMap.has(key)) {
          projectMap.set(key, {
            key,
            title,
            type: 'project',
            category: 'project_task',
            project_id: evt.project_id,
            project_name: evt.project_name || evt.title,
            aim: evt.project_aim,
            deadline: evt.project_deadline,
            team_name: evt.team_name,
            latest_status: evt.status,
            latest_created_at: evt.created_at,
            latest_timestamp: evt.timestamp || 0,
            latest_action: evt.action,
            latest_actor: evt.actor,
            events: []
          });
        }

        const grp = projectMap.get(key);
        if ((evt.timestamp || 0) > grp.latest_timestamp) {
          grp.latest_timestamp = evt.timestamp || 0;
          grp.latest_created_at = evt.created_at;
          grp.latest_status = evt.status;
          grp.latest_action = evt.action;
          grp.latest_actor = evt.actor;
        }
        if (evt.project_aim && !grp.aim) grp.aim = evt.project_aim;
        if (evt.project_deadline && !grp.deadline) grp.deadline = evt.project_deadline;
        if (evt.team_name && !grp.team_name) grp.team_name = evt.team_name;
        grp.events.push(evt);
      } else {
        // Normally Assigned Task (standalone / operational / non-project tasks)
        const key = evt.task_id ? `task-${evt.task_id}` : `task-title-${evt.task_title || evt.title || evt.action}`;
        const title = evt.task_title || evt.title || 'Normally Assigned Task';

        if (!normalTaskMap.has(key)) {
          normalTaskMap.set(key, {
            key,
            title,
            type: 'normal_task',
            category: 'normal_task',
            task_id: evt.task_id,
            task_title: evt.task_title || evt.title,
            deadline: evt.task_deadline,
            priority: evt.task_priority,
            assignee: evt.assignee,
            team_name: evt.team_name,
            latest_status: evt.status,
            latest_created_at: evt.created_at,
            latest_timestamp: evt.timestamp || 0,
            latest_action: evt.action,
            latest_actor: evt.actor,
            events: []
          });
        }

        const grp = normalTaskMap.get(key);
        if ((evt.timestamp || 0) > grp.latest_timestamp) {
          grp.latest_timestamp = evt.timestamp || 0;
          grp.latest_created_at = evt.created_at;
          grp.latest_status = evt.status;
          grp.latest_action = evt.action;
          grp.latest_actor = evt.actor;
        }
        if (evt.team_name && !grp.team_name) grp.team_name = evt.team_name;
        if (evt.task_deadline && !grp.deadline) grp.deadline = evt.task_deadline;
        if (evt.task_priority && !grp.priority) grp.priority = evt.task_priority;
        if (evt.assignee && !grp.assignee) grp.assignee = evt.assignee;
        grp.events.push(evt);
      }
    });

    const projectGroups = Array.from(projectMap.values());
    projectGroups.forEach(g => g.events.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    projectGroups.sort((a, b) => b.latest_timestamp - a.latest_timestamp);

    const normalTaskGroups = Array.from(normalTaskMap.values());
    normalTaskGroups.forEach(g => g.events.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    normalTaskGroups.sort((a, b) => b.latest_timestamp - a.latest_timestamp);

    return { projectActivities: projectGroups, normalTaskActivities: normalTaskGroups };
  }, [activity]);

  const filteredProjectActivities = React.useMemo(() => {
    if (!activitySearchQuery.trim()) return projectActivities;
    const q = activitySearchQuery.toLowerCase();
    return projectActivities.filter(g =>
      g.title.toLowerCase().includes(q) ||
      (g.team_name && g.team_name.toLowerCase().includes(q)) ||
      (g.aim && g.aim.toLowerCase().includes(q)) ||
      g.events.some(e => e.action?.toLowerCase().includes(q) || (e.notes && e.notes.toLowerCase().includes(q)))
    );
  }, [projectActivities, activitySearchQuery]);

  const filteredNormalTaskActivities = React.useMemo(() => {
    if (!activitySearchQuery.trim()) return normalTaskActivities;
    const q = activitySearchQuery.toLowerCase();
    return normalTaskActivities.filter(g =>
      g.title.toLowerCase().includes(q) ||
      (g.team_name && g.team_name.toLowerCase().includes(q)) ||
      (g.assignee && `${g.assignee.first_name || ''} ${g.assignee.last_name || ''}`.toLowerCase().includes(q)) ||
      g.events.some(e => e.action?.toLowerCase().includes(q) || (e.notes && e.notes.toLowerCase().includes(q)))
    );
  }, [normalTaskActivities, activitySearchQuery]);

  if (loading && !summary && projects.length === 0) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="skeleton skeleton-text" style={{ width: '280px', height: '32px', marginBottom: '24px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="card skeleton" style={{ height: '110px' }} />)}
        </div>
        <div className="card skeleton" style={{ height: '340px' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#1E293B', fontFamily: 'serif, Georgia, Inter, sans-serif', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={26} color="#5551FF" />
            History & Audit Logs
          </h2>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            {isExecutive
              ? 'Complete company-wide historical trail and audit lifecycle of all projects, tasks, and updates'
              : (user?.role === 'PM'
                  ? 'Historical trail of projects, squads, and tasks managed by you'
                  : (user?.role === 'TL'
                      ? 'Historical trail of your squads, assigned deliverables, and status updates'
                      : 'Your personal activity trail, allocated tasks, and work lifecycle history'))}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Tab Selection */}
          <div style={{
            display: 'flex',
            background: '#F1F5F9',
            padding: '4px',
            borderRadius: '9999px',
            border: '1px solid #E2E8F0',
            gap: '3px'
          }}>
            {[
              { id: 'activity', label: 'All Activity' },
              { id: 'projects', label: 'Projects History' },
              { id: 'tasks', label: 'Tasks History' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '7px 16px',
                  fontSize: '12px',
                  fontWeight: activeTab === t.id ? 700 : 500,
                  border: 'none',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  background: activeTab === t.id ? '#5551FF' : 'transparent',
                  color: activeTab === t.id ? '#FFFFFF' : '#475569',
                  boxShadow: activeTab === t.id ? '0 2px 6px rgba(85, 81, 255, 0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Summary Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* All Projects */}
        <div style={{
          background: '#EEF2FF',
          border: '1px solid rgba(85, 81, 255, 0.2)',
          borderRadius: '16px',
          padding: '18px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                All Projects
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A', marginTop: '4px', marginBottom: 0 }}>
                {summary?.total_projects || projects.length}
              </div>
            </div>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#FFFFFF',
              color: '#5551FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              <Folders size={17} strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500, marginTop: '8px' }}>
            {summary?.completed_projects || 0} completed · {summary?.active_projects || 0} active
          </div>
        </div>

        <div className="card" style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, var(--surface) 0%, rgba(209, 250, 229, 0.35) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="text-xs font-semibold text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Completed Tasks
              </div>
              <div className="text-3xl font-bold mt-2 mb-1" style={{ color: 'var(--status-completed)', letterSpacing: '-0.03em' }}>
                {summary?.completed_tasks || 0}
              </div>
            </div>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--status-completed-bg)',
              color: 'var(--status-completed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={19} strokeWidth={2} />
            </div>
          </div>
          <div className="text-xs text-secondary mt-2">Closed deliverables archive</div>
        </div>

        <div className="card" style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, var(--surface) 0%, rgba(254, 243, 199, 0.35) 100%)',
          border: '1px solid rgba(217, 119, 6, 0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="text-xs font-semibold text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Tasks
              </div>
              <div className="text-3xl font-bold mt-2 mb-1" style={{ color: 'var(--status-in-progress)', letterSpacing: '-0.03em' }}>
                {summary?.in_progress_tasks || 0}
              </div>
            </div>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--status-in-progress-bg)',
              color: 'var(--status-in-progress)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={19} strokeWidth={2} />
            </div>
          </div>
          <div className="text-xs text-secondary mt-2">Currently in progress</div>
        </div>

        <div className="card" style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, var(--surface) 0%, rgba(243, 232, 255, 0.45) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="text-xs font-semibold text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Completion Rate
              </div>
              <div className="text-3xl font-bold mt-2 mb-1" style={{ color: '#7E22CE', letterSpacing: '-0.03em' }}>
                {summary?.completion_rate ?? 0}%
              </div>
            </div>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#7E22CE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={19} strokeWidth={2} />
            </div>
          </div>
          <div className="text-xs text-secondary mt-2">Cumulative efficiency index</div>
        </div>
      </div>

      {/* TAB 1: ALL ACTIVITY TIMELINE (SEPARATED INTO PROJECT TASKS & NORMALLY ASSIGNED TASKS) */}
      {activeTab === 'activity' && (
        <div>
          {/* Header Bar with Search & Category Segmented Control */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            marginBottom: '24px'
          }}>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                <Activity size={20} color="var(--brand-600)" />
                Unified Audit Activity Feed
              </h3>
              <p className="text-xs text-secondary mt-0.5">
                Separated audit activity streams for project tasks and normally assigned operational tasks
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Category Segmented Control */}
              <div style={{
                display: 'inline-flex',
                background: 'var(--subtle)',
                padding: '3px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}>
                <button
                  type="button"
                  onClick={() => setActivityFeedFilter('all')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: activityFeedFilter === 'all' ? 'var(--surface)' : 'transparent',
                    color: activityFeedFilter === 'all' ? 'var(--brand-600)' : 'var(--text-secondary)',
                    boxShadow: activityFeedFilter === 'all' ? 'var(--shadow-subtle)' : 'none',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  All ({filteredProjectActivities.length + filteredNormalTaskActivities.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActivityFeedFilter('projects')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: activityFeedFilter === 'projects' ? 'var(--surface)' : 'transparent',
                    color: activityFeedFilter === 'projects' ? 'var(--brand-600)' : 'var(--text-secondary)',
                    boxShadow: activityFeedFilter === 'projects' ? 'var(--shadow-subtle)' : 'none',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <Folders size={13} />
                  Project Tasks ({filteredProjectActivities.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActivityFeedFilter('tasks')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: activityFeedFilter === 'tasks' ? 'var(--surface)' : 'transparent',
                    color: activityFeedFilter === 'tasks' ? 'var(--brand-600)' : 'var(--text-secondary)',
                    boxShadow: activityFeedFilter === 'tasks' ? 'var(--shadow-subtle)' : 'none',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <CheckSquare size={13} />
                  Normally Assigned Tasks ({filteredNormalTaskActivities.length})
                </button>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', width: '230px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  type="text"
                  placeholder="Filter activity feed..."
                  value={activitySearchQuery}
                  onChange={(e) => setActivitySearchQuery(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '32px', fontSize: '12px', height: '34px' }}
                />
              </div>
            </div>
          </div>

          {/* Cards Content */}
          {filteredProjectActivities.length === 0 && filteredNormalTaskActivities.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
              <History size={36} strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-tertiary)' }} />
              <h4 className="font-bold text-base mb-1">No Activity Records Found</h4>
              <p className="text-secondary text-sm">Historical events will appear here as projects and tasks advance.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* SECTION 1: PROJECT TASKS */}
              {(activityFeedFilter === 'all' || activityFeedFilter === 'projects') && (
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid var(--border)'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Folders size={18} color="var(--brand-600)" />
                        <h4 className="font-bold text-base" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                          Project Tasks & Deliverables
                        </h4>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          background: 'var(--brand-100)',
                          color: 'var(--brand-700)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)'
                        }}>
                          {filteredProjectActivities.length}
                        </span>
                      </div>
                      <p className="text-xs text-secondary mt-0.5">
                        Audit trails for project milestones, sprints, and deliverables tied to projects
                      </p>
                    </div>
                  </div>

                  {filteredProjectActivities.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)', background: 'var(--subtle)' }}>
                      <p className="text-sm">No project task activities found matching your criteria.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '20px' }}>
                      {filteredProjectActivities.map(group => {
                        const statusTheme = getStatusTheme(group.latest_status);
                        return (
                          <div
                            key={group.key}
                            onClick={() => setSelectedActivityGroup(group)}
                            style={{
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              padding: '22px',
                              borderRadius: '16px',
                              background: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#A5B4FC';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 12px 24px -6px rgba(0,0,0,0.06)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#E2E8F0';
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                            }}
                          >
                            <div>
                              {/* Header Row */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    background: 'rgba(85, 81, 255, 0.08)',
                                    color: '#5551FF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    <Folders size={20} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.05em',
                                      color: '#5551FF',
                                      display: 'block',
                                      marginBottom: '2px'
                                    }}>
                                      Project Deliverables Feed
                                    </span>
                                    <h4 style={{
                                      fontSize: '16px',
                                      fontWeight: 700,
                                      color: '#0F172A',
                                      letterSpacing: '-0.015em',
                                      lineHeight: '1.3',
                                      margin: 0,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }} title={group.title}>
                                      {group.title}
                                    </h4>
                                  </div>
                                </div>

                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 12px',
                                  borderRadius: '9999px',
                                  background: statusTheme.bg,
                                  color: statusTheme.color,
                                  border: `1px solid ${statusTheme.border}`,
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  letterSpacing: '0.02em',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                  alignSelf: 'flex-start'
                                }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusTheme.dot }} />
                                  <span>{statusTheme.label}</span>
                                </div>
                              </div>

                              {group.aim && (
                                <p style={{
                                  fontSize: '13px',
                                  color: '#475569',
                                  lineHeight: '1.5',
                                  marginBottom: '14px',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}>
                                  {group.aim}
                                </p>
                              )}

                              {group.team_name && (
                                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 600, color: '#94A3B8' }}>Squad:</span>
                                  <span style={{ fontWeight: 600, color: '#1E293B', background: '#F1F5F9', padding: '2px 8px', borderRadius: '6px' }}>{group.team_name}</span>
                                </div>
                              )}

                              {/* Recent Activity Highlight Box */}
                              <div style={{
                                background: '#F8FAFC',
                                borderRadius: '12px',
                                padding: '12px 14px',
                                border: '1px solid #E2E8F0',
                                marginBottom: '16px'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Recent Activity
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                    <Clock size={12} />
                                    {group.latest_created_at ? formatDateTime(group.latest_created_at) : 'Recent'}
                                  </span>
                                </div>
                                <p style={{ fontSize: '13px', color: '#0F172A', fontWeight: 600, margin: '0 0 4px 0', lineHeight: '1.4' }}>
                                  {group.latest_action}
                                </p>
                                {group.latest_actor && (
                                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>
                                    Actor: <strong style={{ color: '#334155' }}>{group.latest_actor.first_name} {group.latest_actor.last_name} ({group.latest_actor.role})</strong>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Footer */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingTop: '14px',
                              borderTop: '1px solid #F1F5F9',
                              fontSize: '12px'
                            }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 600,
                                color: '#4F46E5',
                                background: '#EEF2FF',
                                padding: '4px 12px',
                                borderRadius: '9999px'
                              }}>
                                <Activity size={13} />
                                {group.events.length} event{group.events.length === 1 ? '' : 's'} recorded
                              </span>

                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: '#5551FF',
                                fontWeight: 700
                              }}>
                                <span>View Audit Dialogue</span>
                                <ArrowRight size={14} strokeWidth={2.2} />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2: NORMALLY ASSIGNED TASKS */}
              {(activityFeedFilter === 'all' || activityFeedFilter === 'tasks') && (
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid var(--border)'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckSquare size={18} color="#059669" />
                        <h4 className="font-bold text-base" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                          Normally Assigned Tasks
                        </h4>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#059669',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)'
                        }}>
                          {filteredNormalTaskActivities.length}
                        </span>
                      </div>
                      <p className="text-xs text-secondary mt-0.5">
                        Audit trails for direct, operational, and standalone tasks assigned across teams
                      </p>
                    </div>
                  </div>

                  {filteredNormalTaskActivities.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)', background: 'var(--subtle)' }}>
                      <p className="text-sm">No normally assigned task activities found matching your criteria.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '20px' }}>
                      {filteredNormalTaskActivities.map(group => {
                        const statusTheme = getStatusTheme(group.latest_status);
                        return (
                          <div
                            key={group.key}
                            onClick={() => setSelectedActivityGroup(group)}
                            style={{
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              padding: '22px',
                              borderRadius: '16px',
                              background: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#A7F3D0';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 12px 24px -6px rgba(0,0,0,0.06)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#E2E8F0';
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
                            }}
                          >
                            <div>
                              {/* Header Row */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    color: '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    <CheckSquare size={20} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.05em',
                                      color: '#059669',
                                      display: 'block',
                                      marginBottom: '2px'
                                    }}>
                                      Normally Assigned Task
                                    </span>
                                    <h4 style={{
                                      fontSize: '16px',
                                      fontWeight: 700,
                                      color: '#0F172A',
                                      letterSpacing: '-0.015em',
                                      lineHeight: '1.3',
                                      margin: 0,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }} title={group.title}>
                                      {group.title}
                                    </h4>
                                  </div>
                                </div>

                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 12px',
                                  borderRadius: '9999px',
                                  background: statusTheme.bg,
                                  color: statusTheme.color,
                                  border: `1px solid ${statusTheme.border}`,
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  letterSpacing: '0.02em',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                  alignSelf: 'flex-start'
                                }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusTheme.dot }} />
                                  <span>{statusTheme.label}</span>
                                </div>
                              </div>

                              {/* Task Metadata Row */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                flexWrap: 'wrap',
                                marginBottom: '14px',
                                fontSize: '11px',
                                color: '#475569'
                              }}>
                                {group.assignee && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontWeight: 600, color: '#94A3B8' }}>Assignee:</span>
                                    <span style={{ fontWeight: 600, color: '#0F172A', background: '#F1F5F9', padding: '2px 8px', borderRadius: '6px' }}>
                                      {group.assignee.first_name} {group.assignee.last_name}
                                    </span>
                                  </div>
                                )}
                                {group.priority && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontWeight: 600, color: '#94A3B8' }}>Priority:</span>
                                    <span style={{
                                      fontWeight: 700,
                                      textTransform: 'capitalize',
                                      color: group.priority === 'urgent' ? '#EF4444' :
                                             group.priority === 'high' ? '#F97316' : '#64748B'
                                    }}>
                                      {group.priority}
                                    </span>
                                  </div>
                                )}
                                {group.team_name && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontWeight: 600, color: '#94A3B8' }}>Squad:</span>
                                    <span style={{ fontWeight: 600, color: '#475569', background: '#F1F5F9', padding: '2px 8px', borderRadius: '6px' }}>{group.team_name}</span>
                                  </div>
                                )}
                              </div>

                              {/* Recent Activity Highlight Box */}
                              <div style={{
                                background: '#F8FAFC',
                                borderRadius: '12px',
                                padding: '12px 14px',
                                border: '1px solid #E2E8F0',
                                marginBottom: '16px'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Recent Activity
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                    <Clock size={12} />
                                    {group.latest_created_at ? formatDateTime(group.latest_created_at) : 'Recent'}
                                  </span>
                                </div>
                                <p style={{ fontSize: '13px', color: '#0F172A', fontWeight: 600, margin: '0 0 4px 0', lineHeight: '1.4' }}>
                                  {group.latest_action}
                                </p>
                                {group.latest_actor && (
                                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>
                                    Actor: <strong style={{ color: '#334155' }}>{group.latest_actor.first_name} {group.latest_actor.last_name} ({group.latest_actor.role})</strong>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Footer */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingTop: '14px',
                              borderTop: '1px solid #F1F5F9',
                              fontSize: '12px'
                            }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 600,
                                color: '#059669',
                                background: '#ECFDF5',
                                padding: '4px 12px',
                                borderRadius: '9999px'
                              }}>
                                <Activity size={13} />
                                {group.events.length} event{group.events.length === 1 ? '' : 's'} recorded
                              </span>

                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: '#059669',
                                fontWeight: 700
                              }}>
                                <span>View Audit Dialogue</span>
                                <ArrowRight size={14} strokeWidth={2.2} />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Activity Details Popup Dialog Box Modal */}
      {selectedActivityGroup && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedActivityGroup(null); }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div className="card modal-animate" style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-float)'
          }}>
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: selectedActivityGroup.type === 'project' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  color: selectedActivityGroup.type === 'project' ? 'var(--brand-600)' : '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {selectedActivityGroup.type === 'project' ? <Folders size={22} /> : <CheckSquare size={22} />}
                </div>
                <div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: selectedActivityGroup.type === 'project' ? 'var(--brand-600)' : '#059669',
                    letterSpacing: '0.04em'
                  }}>
                    {selectedActivityGroup.type === 'project' ? 'Project Audit Activity Trail' : 'Normally Assigned Task Audit Trail'}
                  </span>
                  <h3 className="font-bold text-xl" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em', marginTop: '1px' }}>
                    {selectedActivityGroup.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedActivityGroup(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Entity Summary Bar */}
            <div style={{
              background: 'var(--subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              marginBottom: '22px'
            }}>
              <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: getStatusBadgeStyle(selectedActivityGroup.latest_status).bg,
                    color: getStatusBadgeStyle(selectedActivityGroup.latest_status).color,
                    border: `1px solid ${getStatusBadgeStyle(selectedActivityGroup.latest_status).border}`,
                    textTransform: 'uppercase'
                  }}>
                    Status: {selectedActivityGroup.latest_status?.replace('_', ' ') || 'ACTIVE'}
                  </span>

                  {selectedActivityGroup.deadline && (
                    <span className="text-xs text-secondary font-medium flex items-center gap-1">
                      <Calendar size={12} />
                      Deadline: {formatDate(selectedActivityGroup.deadline)}
                    </span>
                  )}

                  {selectedActivityGroup.assignee && (
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      Assignee: {selectedActivityGroup.assignee.first_name} {selectedActivityGroup.assignee.last_name}
                    </span>
                  )}

                  {selectedActivityGroup.priority && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: selectedActivityGroup.priority === 'urgent' ? 'var(--priority-urgent)' :
                             selectedActivityGroup.priority === 'high' ? 'var(--priority-high)' : 'var(--text-secondary)'
                    }}>
                      Priority: {selectedActivityGroup.priority}
                    </span>
                  )}

                  {selectedActivityGroup.team_name && (
                    <span className="text-xs text-secondary font-medium">
                      Squad: {selectedActivityGroup.team_name}
                    </span>
                  )}
                </div>

                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {selectedActivityGroup.events.length} Historical Event{selectedActivityGroup.events.length === 1 ? '' : 's'}
                </span>
              </div>

              {selectedActivityGroup.aim && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginTop: '6px' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Scope / Aim: </strong>
                  {selectedActivityGroup.aim}
                </div>
              )}
            </div>

            {/* Complete Activity Timeline */}
            <div>
              <h4 className="text-xs font-semibold text-secondary uppercase mb-3" style={{ letterSpacing: '0.05em' }}>
                Event Log & Audit History
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', paddingLeft: '8px' }}>
                {/* Connecting Line */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  bottom: '12px',
                  left: '17px',
                  width: '2px',
                  background: 'var(--border)',
                  zIndex: 1
                }} />

                {selectedActivityGroup.events.map((evt, idx) => {
                  const evtBadge = getStatusBadgeStyle(evt.status);
                  return (
                    <div
                      key={evt.id || idx}
                      style={{
                        display: 'flex',
                        gap: '14px',
                        alignItems: 'flex-start',
                        position: 'relative',
                        zIndex: 2
                      }}
                    >
                      {/* Node Bullet */}
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--surface)',
                        border: '2px solid var(--brand-500)',
                        boxShadow: '0 0 0 3px var(--surface)',
                        marginTop: '3px',
                        flexShrink: 0
                      }} />

                      {/* Event Detail Box */}
                      <div style={{
                        flex: 1,
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 14px',
                        boxShadow: 'var(--shadow-subtle)'
                      }}>
                        <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {evt.action}
                          </span>
                          <span className="text-xs text-secondary flex items-center gap-1 font-medium">
                            <Clock size={11} />
                            {evt.created_at ? formatDateTime(evt.created_at) : 'Recent'}
                          </span>
                        </div>

                        {evt.notes && (
                          <div style={{
                            fontSize: '12px',
                            background: 'var(--subtle)',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            borderLeft: '3px solid var(--brand-500)',
                            color: 'var(--text-secondary)',
                            margin: '6px 0',
                            fontStyle: 'italic'
                          }}>
                            "{evt.notes}"
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          <span>
                            Actor: <strong style={{ color: 'var(--text-primary)' }}>{evt.actor ? `${evt.actor.first_name} ${evt.actor.last_name} (${evt.actor.role})` : 'System'}</strong>
                          </span>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: evtBadge.bg,
                            color: evtBadge.color,
                            border: `1px solid ${evtBadge.border}`,
                            textTransform: 'uppercase'
                          }}>
                            {evt.status?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => setSelectedActivityGroup(null)}
                className="btn btn-secondary"
                style={{ fontSize: '13px', padding: '7px 18px' }}
              >
                Close Dialog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROJECTS HISTORY */}
      {activeTab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {projects.map(proj => {
            const badge = getStatusBadgeStyle(proj.status);
            return (
              <div key={proj.id} className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h3 className="font-bold text-lg" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                        {proj.name}
                      </h3>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`
                      }}>
                        {proj.status?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-secondary" style={{ maxWidth: '800px', lineHeight: 1.5 }}>
                      {proj.aim}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div className="text-xs text-secondary flex items-center gap-1 justify-end">
                      <Calendar size={13} />
                      Created: {formatDate(proj.created_at)}
                    </div>
                    {proj.deadline && (
                      <div className="text-xs font-medium" style={{ color: 'var(--brand-700)' }}>
                        Deadline: {formatDateTime(proj.deadline)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Meta details & Creator PM Info */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  background: 'var(--subtle)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px'
                }}>
                  <div>
                    <span className="text-xs text-secondary block">Assigned / Created By</span>
                    <strong className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {proj.creator ? `${proj.creator.first_name} ${proj.creator.last_name} (${proj.creator.role})` : 'Project Manager'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-secondary block">Active Teams</span>
                    <strong className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {proj.teams?.length || 0} Team(s)
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-secondary block">Task Completion Rate</span>
                    <strong className="text-sm" style={{ color: 'var(--brand-600)' }}>
                      {proj.completed_tasks} / {proj.total_tasks} ({proj.completion_rate}%)
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-secondary block">Active Status Logs</span>
                    <strong className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {proj.status_logs?.length || 0} Record(s)
                    </strong>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'var(--subtle)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: `${proj.completion_rate}%`,
                    height: '100%',
                    background: 'var(--brand-gradient)',
                    transition: 'width 0.4s ease'
                  }} />
                </div>

                {/* Associated Teams summary */}
                {proj.teams && proj.teams.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <span className="text-xs font-bold text-secondary mb-2 block uppercase tracking-wider">Assigned Teams & Team Leads</span>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {proj.teams.map(t => (
                        <div key={t.id} style={{
                          padding: '6px 12px',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px'
                        }}>
                          <strong>{t.name}</strong> · {t.member_count} members {t.lead ? `(Lead: ${t.lead.first_name} ${t.lead.last_name})` : '(No Lead assigned)'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status history audit log */}
                {proj.status_logs && proj.status_logs.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-secondary mb-2 block uppercase tracking-wider">Project Lifecycle Audit Logs</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {proj.status_logs.map(log => (
                        <div key={log.id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'var(--subtle)',
                          borderRadius: 'var(--radius-xs)',
                          fontSize: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {log.from_status} → {log.to_status}
                            </span>
                            {log.notes && <span style={{ color: 'var(--text-secondary)' }}>({log.notes})</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-tertiary)' }}>
                            <span>By: {log.changer ? `${log.changer.first_name} (${log.changer.role})` : 'System'}</span>
                            <span>{formatDate(log.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {projects.length === 0 && (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <Folders size={36} strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-tertiary)' }} />
              <h4 className="font-bold text-base mb-1">No Projects Found</h4>
              <p className="text-secondary text-sm">There are no project historical logs recorded in this workspace.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TASKS HISTORY */}
      {activeTab === 'tasks' && (
        <div>
          {/* Filter / Search Bar */}
          <div className="card mb-6" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '240px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    type="text"
                    placeholder="Search tasks by title..."
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
                  />
                </div>
                <button type="submit" className="btn btn-secondary" style={{ padding: '0 16px', height: '38px' }}>
                  Search
                </button>
              </form>

              {/* Status Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['all', 'completed', 'in_progress', 'in_review', 'blocked', 'not_started'].map(st => (
                  <button
                    key={st}
                    onClick={() => setTaskStatusFilter(st)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '12px',
                      fontWeight: taskStatusFilter === st ? 600 : 500,
                      border: '1px solid',
                      cursor: 'pointer',
                      borderColor: taskStatusFilter === st ? 'var(--brand-600)' : 'var(--border)',
                      background: taskStatusFilter === st ? 'var(--brand-50)' : 'transparent',
                      color: taskStatusFilter === st ? 'var(--brand-700)' : 'var(--text-secondary)',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {st.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tasks List with Audit Logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(() => {
              const userVisibleHistoryTasks = tasks.filter(t => {
                const isAssignee = String(t.assignee?.id || t.assigned_to) === String(user?.id);
                const isAssigner = String(t.assigner?.id || t.assigned_by) === String(user?.id);
                return isAssignee || isAssigner;
              });

              if (userVisibleHistoryTasks.length === 0) {
                return (
                  <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <CheckSquare size={36} strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-tertiary)' }} />
                    <h4 className="font-bold text-base mb-1">No Tasks Found</h4>
                    <p className="text-secondary text-sm">No tasks matching your current filter criteria were found.</p>
                  </div>
                );
              }

              return userVisibleHistoryTasks.map(t => {
                const badge = getStatusBadgeStyle(t.status);
                const isExpanded = expandedTaskId === t.id;
              return (
                <div key={t.id} className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          letterSpacing: '0.02em'
                        }}>
                          {t.status?.replace('_', ' ').toUpperCase()}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--brand-600)',
                          background: 'var(--brand-50)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-xs)'
                        }}>
                          {t.project_name} · {t.team_name}
                        </span>
                        {t.priority && (
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                            Priority: {t.priority}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                        {t.title}
                      </h4>
                      <p className="text-sm text-secondary" style={{ lineHeight: 1.4, maxWidth: '750px' }}>
                        {t.description}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <div className="text-xs text-secondary flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(t.created_at)}
                      </div>

                      <button
                        onClick={() => toggleTaskExpand(t.id)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', height: '32px', gap: '6px' }}
                      >
                        Audit Logs ({t.status_logs?.length || 0})
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Assignee and Assigner footer info */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border)',
                    fontSize: '12px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span>
                        Assignee: <strong style={{ color: 'var(--text-primary)' }}>{t.assignee ? `${t.assignee.first_name} ${t.assignee.last_name} (${t.assignee.role})` : 'Unassigned'}</strong>
                      </span>
                      <span>
                        Assigned by: <strong style={{ color: 'var(--text-primary)' }}>{t.assigner ? `${t.assigner.first_name} ${t.assigner.last_name} (${t.assigner.role})` : 'Leadership'}</strong>
                      </span>
                    </div>

                    {t.deadline && (
                      <span className="text-xs text-secondary">
                        Due: {formatDateTime(t.deadline)}
                      </span>
                    )}
                  </div>

                  {/* Expandable Audit Log */}
                  {isExpanded && (
                    <div style={{
                      marginTop: '16px',
                      padding: '16px',
                      background: 'var(--subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)'
                    }}>
                      <div className="text-xs font-bold text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <ShieldCheck size={14} color="var(--brand-600)" />
                        Complete Status Progression Audit Trail
                      </div>

                      {(!t.status_logs || t.status_logs.length === 0) ? (
                        <div className="text-xs text-secondary">No status log transitions recorded yet.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {t.status_logs.map(log => (
                            <div key={log.id} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              background: 'var(--surface)',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border)',
                              fontSize: '12px'
                            }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{
                                    fontWeight: 700,
                                    color: 'var(--brand-600)'
                                  }}>
                                    {log.from_status} → {log.to_status}
                                  </span>
                                </div>
                                {log.reason && (
                                  <div style={{ color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                                    Reason: "{log.reason}"
                                  </div>
                                )}
                              </div>
                              <div style={{ textAlign: 'right', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                                <div>Changed by: <strong style={{ color: 'var(--text-primary)' }}>{log.changer ? `${log.changer.first_name} (${log.changer.role})` : 'System'}</strong></div>
                                <div>{log.created_at ? new Date(log.created_at).toLocaleString() : ''}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            });
          })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
