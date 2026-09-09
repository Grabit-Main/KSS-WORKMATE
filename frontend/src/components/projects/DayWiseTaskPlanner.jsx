import React, { useState, useEffect } from 'react';
import { getTasks, createTask, startTask } from '../../api/tasks';
import { getUsers } from '../../api/users';
import { getTeams } from '../../api/teams';
import { useWebSocket } from '../../context/WebSocketContext';
import { useRealtime } from '../../realtime/useRealtime';
import { TaskDetailsModal } from '../tasks/TaskDetailsModal';
import { AttachmentCard } from '../common/AttachmentCard';
import {
  Calendar, Plus, Clock, User, CheckCircle2,
  FolderKanban, Play, Sparkles, X, ChevronRight, MessageSquare,
  AlertCircle, AlertTriangle
} from 'lucide-react';

// Format a Date object to DD-MM-YYYY (e.g. "08-09-2026")
export const formatDateDDMMYYYY = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Format deadline with time (e.g. "08-09-2026 at 06:00 PM")
export const formatDeadlineWithTime = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const datePart = `${day}-${month}-${year}`;
  const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${datePart} at ${timePart}`;
};

// Normalize any date representation into DD-MM-YYYY strictly without timezone drift
export const normalizeToDDMMYYYY = (val) => {
  if (!val) return '';
  if (typeof val !== 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? '' : formatDateDDMMYYYY(d);
  }
  const clean = val.trim();
  // Match DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = clean.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[1]}-${ddmmyyyy[2]}-${ddmmyyyy[3]}`;
  }
  // Match YYYY-MM-DD or YYYY/MM/DD (even if followed by T or space and time, e.g. 2026-09-08T14:30:00Z)
  const yyyymmdd = clean.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (yyyymmdd) {
    return `${yyyymmdd[3]}-${yyyymmdd[2]}-${yyyymmdd[1]}`;
  }
  const d = new Date(clean);
  return isNaN(d.getTime()) ? clean : formatDateDDMMYYYY(d);
};

// Parse a date string to timestamp for sorting and comparisons
export const parseDateStringToTimestamp = (str) => {
  if (!str) return 0;
  const norm = normalizeToDDMMYYYY(str);
  if (norm) {
    const parts = norm.split('-');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      return new Date(y, m, d).getTime();
    }
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

// Parse a DD-MM-YYYY string to Date object
export const parseDateString = (str) => {
  if (!str) return new Date();
  const norm = normalizeToDDMMYYYY(str);
  if (norm) {
    const parts = norm.split('-');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// Generate 5 consecutive dates starting from today in DD-MM-YYYY format
const generateInitialDates = () => {
  const result = [];
  const base = new Date();
  for (let i = 0; i < 5; i++) {
    const next = new Date(base);
    next.setDate(base.getDate() + i);
    result.push(formatDateDDMMYYYY(next));
  }
  return result;
};

export const DayWiseTaskPlanner = ({ project, currentUser, onClose }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState(generateInitialDates);
  const [activeDate, setActiveDate] = useState(() => formatDateDDMMYYYY(new Date()));
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamId, setTeamId] = useState(null);

  // Role authorization: PMs, Team Leads, CEO, and CTO can allocate day-wise tasks
  const { dispatch } = useWebSocket() || {};
  const isSquadLead = teamId && teamMembers.some(m => String(m.id) === String(currentUser?.id) && m.is_lead);
  const canAllocate = ['PM', 'TL', 'CEO', 'CTO'].includes(currentUser?.role) || isSquadLead;

  // Modal State for New Task
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('normal');
  const [newTaskScheduledDate, setNewTaskScheduledDate] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Helper to open the allocation modal with pre-configured scheduled date and deadline time
  const handleOpenAddModal = (targetDate = activeDate) => {
    setFormError('');
    const sDate = targetDate || activeDate;
    setNewTaskScheduledDate(sDate);
    // Build default deadline datetime-local (e.g. target date at 18:00 / 6:00 PM)
    const norm = normalizeToDDMMYYYY(sDate);
    if (norm) {
      const [d, m, y] = norm.split('-');
      setNewTaskDeadline(`${y}-${m}-${d}T18:00`);
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      setNewTaskDeadline(`${y}-${m}-${d}T18:00`);
    }
    setShowAddModal(true);
  };

  const handleScheduledDateChange = (newDate) => {
    setNewTaskScheduledDate(newDate);
    const norm = normalizeToDDMMYYYY(newDate);
    if (norm) {
      const [d, m, y] = norm.split('-');
      const currentTime = (newTaskDeadline && newTaskDeadline.includes('T'))
        ? newTaskDeadline.split('T')[1]
        : '18:00';
      setNewTaskDeadline(`${y}-${m}-${d}T${currentTime}`);
    }
  };

  // Task Details & Chat Modal
  const [selectedTask, setSelectedTask] = useState(null);

  const loadData = async () => {
    try {
      const [tasksData, teamsData, usersData] = await Promise.all([
        getTasks({ project_id: project.id }),
        getTeams(),
        getUsers()
      ]);

      setTasks(tasksData);

      // Identify the squad(s) allocated to this project
      const allocatedTeams = teamsData.filter(t => String(t.project_id) === String(project.id));
      if (currentUser?.role === 'PM') {
        // PM can assign tasks to anyone across the organization without team/squad restriction
        const eligibleUsers = usersData.filter(u => u.role !== 'CEO' && u.role !== 'CTO');
        setTeamMembers(eligibleUsers.length > 0 ? eligibleUsers : usersData);
        setTeamId(allocatedTeams.length > 0 ? allocatedTeams[0].id : null);
      } else if (allocatedTeams.length > 0) {
        const myTeam = allocatedTeams.find(t => t.memberships?.some(m => String(m.user_id) === String(currentUser?.id) && (m.is_lead || currentUser?.role === 'TL')));
        setTeamId(myTeam ? myTeam.id : allocatedTeams[0].id);
        const memberIds = new Set(allocatedTeams.flatMap(t => (t.memberships || []).map(m => String(m.user_id || m.user?.id))));
        const filteredMembers = usersData.filter(u => memberIds.has(String(u.id)));
        setTeamMembers(filteredMembers.length > 0 ? filteredMembers : usersData);
      } else {
        setTeamMembers(usersData);
      }

      // Check if existing tasks have custom dates and include them in dates list
      const existingDates = tasksData
        .map(t => normalizeToDDMMYYYY(t.scheduled_date))
        .filter(Boolean);

      if (existingDates.length > 0) {
        setDates(prev => {
          const merged = Array.from(new Set([...prev, ...existingDates]));
          return merged.sort((a, b) => parseDateStringToTimestamp(a) - parseDateStringToTimestamp(b));
        });
        setActiveDate(curr => curr || existingDates[0]);
      }
    } catch (err) {
      console.error('Failed loading planner data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (project?.id) {
      loadData();
    }
  }, [project?.id]);

  const handleAddNextDate = () => {
    if (dates.length === 0) {
      const todayStr = formatDateDDMMYYYY(new Date());
      setDates([todayStr]);
      setActiveDate(todayStr);
      return;
    }
    const latestStr = dates[dates.length - 1];
    const latestObj = parseDateString(latestStr);
    const nextDateObj = new Date(latestObj);
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const nextStr = formatDateDDMMYYYY(nextDateObj);
    if (!dates.includes(nextStr)) {
      const updated = [...dates, nextStr].sort((a, b) => parseDateStringToTimestamp(a) - parseDateStringToTimestamp(b));
      setDates(updated);
    }
    setActiveDate(nextStr);
  };

  const handlePickCustomDate = (e) => {
    const val = e.target.value;
    if (!val) return;
    const formatted = normalizeToDDMMYYYY(val);
    if (!dates.includes(formatted)) {
      const updated = [...dates, formatted].sort((a, b) => parseDateStringToTimestamp(a) - parseDateStringToTimestamp(b));
      setDates(updated);
    }
    setActiveDate(formatted);
    e.target.value = '';
  };

  const handlePreFillTasks = async () => {
    if (!canAllocate) {
      alert('You do not have permission to allocate tasks.');
      return;
    }
    if (!teamMembers || teamMembers.length === 0) {
      alert('Please ensure squad members are available to allocate tasks.');
      return;
    }
    const targetDates = dates.slice(0, 5);
    const confirmPreFill = window.confirm(
      `Pre-fill recommended structured deliverables across dates (${targetDates[0]} to ${targetDates[targetDates.length - 1]})?`
    );
    if (!confirmPreFill) return;

    try {
      const defaultBlueprints = [
        { title: 'Deliverable Blueprint & Architecture Review', priority: 'high' },
        { title: 'Core Feature Modules Implementation', priority: 'high' },
        { title: 'Component Integration & Visual Verification', priority: 'normal' },
        { title: 'Quality Assurance, Bug Fixes & Edge Cases', priority: 'normal' },
        { title: 'Deployment Readiness & Final Milestone Signoff', priority: 'urgent' }
      ];

      for (let i = 0; i < defaultBlueprints.length; i++) {
        const bp = defaultBlueprints[i];
        const assignedMember = teamMembers[i % teamMembers.length];
        const taskDate = targetDates[i] || targetDates[0];
        const [d, m, y] = taskDate.split('-');
        const deadlineIso = `${y}-${m}-${d}T18:00:00.000Z`;

        const created = await createTask({
          project_id: project.id,
          team_id: teamId,
          title: bp.title,
          description: `Deliverable milestone for ${taskDate}. Coordinated squad execution.`,
          assigned_to: assignedMember.id,
          priority: bp.priority,
          deadline: deadlineIso,
          scheduled_date: taskDate
        });
        if (dispatch) dispatch('task.created', created);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to pre-fill tasks:', err);
      alert(err.response?.data?.detail || 'Failed to pre-fill deliverables.');
    }
  };

  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    if (!canAllocate) {
      setFormError('You do not have permission to allocate tasks.');
      return;
    }
    if (!newTaskTitle.trim()) {
      setFormError('Please enter a task title.');
      return;
    }
    if (!newTaskAssignee) {
      setFormError('Please select an assignee.');
      return;
    }
    const finalScheduledDate = normalizeToDDMMYYYY(newTaskScheduledDate || activeDate);
    if (!finalScheduledDate) {
      setFormError('Please select a valid scheduled date.');
      return;
    }
    if (!newTaskDeadline) {
      setFormError('Please select the deadline date and time.');
      return;
    }
    setCreating(true);
    setFormError('');
    try {
      const created = await createTask({
        project_id: project.id,
        team_id: teamId,
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || 'No description provided.',
        assigned_to: newTaskAssignee,
        priority: newTaskPriority,
        deadline: new Date(newTaskDeadline).toISOString(),
        scheduled_date: finalScheduledDate
      });

      // 0 ms Optimistic update
      setTasks(prev => {
        if (prev.some(t => t.id === created.id)) return prev;
        return [...prev, created];
      });
      if (dispatch) dispatch('task.created', created);

      // Ensure the scheduled date exists in the date tabs and activate it so the newly created task displays immediately
      if (!dates.includes(finalScheduledDate)) {
        setDates(prev => Array.from(new Set([...prev, finalScheduledDate])).sort((a, b) => parseDateStringToTimestamp(a) - parseDateStringToTimestamp(b)));
      }
      setActiveDate(finalScheduledDate);

      setShowAddModal(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskAssignee('');
      setNewTaskPriority('normal');
      setNewTaskDeadline('');
      setNewTaskScheduledDate('');
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create task.');
    } finally {
      setCreating(false);
    }
  };

  const handleStartTaskDirect = async (e, task) => {
    e.stopPropagation();
    // 0 ms Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'in_progress' } : t));
    if (dispatch) dispatch('task.status_changed', { id: task.id, status: 'in_progress' });
    try {
      const updated = await startTask(task.id);
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to start task.');
      loadData();
    }
  };

  const activeDateTasks = tasks.filter(t => normalizeToDDMMYYYY(t.scheduled_date) === activeDate);

  const getStatusBadge = (status) => {
    const map = {
      not_started: { label: 'Not Started', bg: 'var(--subtle)', color: 'var(--text-secondary)' },
      in_progress: { label: 'In Progress', bg: 'rgba(217, 119, 6, 0.12)', color: '#D97706' },
      in_review: { label: 'In Review', bg: 'rgba(99, 102, 241, 0.12)', color: '#4F46E5' },
      completed: { label: 'Completed', bg: 'rgba(16, 185, 129, 0.12)', color: '#059669' },
      blocked: { label: 'Blocked', bg: 'rgba(239, 68, 68, 0.12)', color: '#DC2626' }
    };
    const s = map[status] || map.not_started;
    return (
      <span style={{
        fontSize: '10px',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        background: s.bg,
        color: s.color,
        letterSpacing: '0.02em',
        textTransform: 'uppercase'
      }}>
        {s.label}
      </span>
    );
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '24px'
      }}
    >
      <div className="card modal-animate" style={{
        width: '100%',
        maxWidth: '1100px',
        height: '88vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-float)',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--surface)'
      }}>
        {/* Planner Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--subtle-glass)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--brand-100)',
                color: 'var(--brand-700)',
                textTransform: 'uppercase'
              }}>
                Date-Wise Allocation
              </span>
              <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {project.name}
              </h3>
            </div>
            <p className="text-xs text-secondary mt-1">
              Plan and allocate daily task deliverables by date for squad members. Click any task to inspect details and chat.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Pre-fill Tasks Button (Team Leads only) */}
            {canAllocate && (
              <button
                onClick={handlePreFillTasks}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 14px' }}
                title="Pre-fill sprint deliverables across scheduled dates"
              >
                <Sparkles size={14} color="var(--brand-600)" />
                <span>Pre-fill Tasks</span>
              </button>
            )}

            {/* Add Task for Date Button (Team Leads only) */}
            {canAllocate && (
              <button
                onClick={() => handleOpenAddModal(activeDate)}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 14px' }}
              >
                <Plus size={14} />
                <span>Add Task on {activeDate}</span>
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                padding: '4px',
                borderRadius: 'var(--radius-full)'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>



        {/* Dates Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 28px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
          flexShrink: 0
        }}>
          {dates.map(d => {
            const countForDate = tasks.filter(t => normalizeToDDMMYYYY(t.scheduled_date) === d).length;
            const isSelected = activeDate === d;
            return (
              <button
                key={d}
                onClick={() => setActiveDate(d)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected ? '1px solid var(--brand-500)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--brand-50)' : 'var(--subtle)',
                  color: isSelected ? 'var(--brand-700)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all var(--transition-fast)',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{d}</span>
                <span style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: isSelected ? 'var(--brand-600)' : 'var(--border)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 700
                }}>
                  {countForDate}
                </span>
              </button>
            );
          })}

          {canAllocate && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handleAddNextDate}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px dashed var(--border)',
                  background: 'transparent',
                  color: 'var(--brand-600)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap'
                }}
                title="Add next consecutive date"
              >
                <Plus size={13} />
                <span>Add Date</span>
              </button>

              <label
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px dashed var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  position: 'relative'
                }}
                title="Pick a specific date from calendar"
              >
                <Calendar size={12} />
                <span>Pick Date</span>
                <input
                  type="date"
                  onChange={handlePickCustomDate}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    left: 0,
                    top: 0,
                    cursor: 'pointer'
                  }}
                />
              </label>
            </div>
          )}
        </div>

        {/* Day Tasks Content */}
        <div style={{
          flex: 1,
          padding: '24px 28px',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}>
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Allocated Deliverables for {activeDate} ({activeDateTasks.length})
            </h4>
            <span className="text-xs text-secondary">
              Click any card to open full details & team chat
            </span>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {[1, 2, 3].map(i => <div key={i} className="card skeleton" style={{ height: '140px' }} />)}
            </div>
          ) : activeDateTasks.length === 0 ? (
            <div className="card" style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: 'var(--subtle-glass)',
              border: '1px dashed var(--border)'
            }}>
              <Calendar size={36} strokeWidth={1.5} style={{ margin: '0 auto 10px', color: 'var(--text-tertiary)' }} />
              <h5 className="font-bold text-sm mb-1">No Deliverables Scheduled for {activeDate}</h5>
              {canAllocate ? (
                <>
                  <p className="text-xs text-secondary mb-4">
                    Assign tasks to squad members on this date or click "Pre-fill Tasks" to build a standard roadmap.
                  </p>
                  <button
                    onClick={() => handleOpenAddModal(activeDate)}
                    className="btn btn-primary"
                    style={{ fontSize: '12px', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={14} />
                    <span>Add Task on {activeDate}</span>
                  </button>
                </>
              ) : (
                <p className="text-xs text-secondary mb-1">
                  {isPM
                    ? 'No deliverables scheduled for this date. As a Project Manager, you can monitor deliverables once allocated by Team Leads.'
                    : 'No deliverables scheduled for this date.'}
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {activeDateTasks.map(t => {
                const isOverdue = t.deadline && new Date(t.deadline).getTime() < Date.now() && t.status !== 'completed';
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="card"
                    style={{
                      padding: '18px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all var(--transition-smooth)',
                      border: isOverdue ? '1.5px solid rgba(239, 68, 68, 0.45)' : '1px solid var(--border)',
                      background: isOverdue ? 'rgba(239, 68, 68, 0.02)' : 'var(--surface)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = isOverdue ? '#EF4444' : 'var(--brand-300)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isOverdue ? 'rgba(239, 68, 68, 0.45)' : 'var(--border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2.5">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {getStatusBadge(t.status)}
                          {isOverdue && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 'var(--radius-full)',
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#EF4444',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <AlertTriangle size={10} /> Exceeded
                            </span>
                          )}
                        </div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          color: t.priority === 'urgent' ? 'var(--priority-urgent)' :
                                 t.priority === 'high' ? 'var(--priority-high)' : 'var(--text-tertiary)'
                        }}>
                          {t.priority}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {t.title}
                      </h4>
                      <p className="text-xs text-secondary text-truncate-2" style={{ lineHeight: 1.5, marginBottom: '10px' }}>
                        {t.description || 'No description provided.'}
                      </p>

                      {/* Explicit Deadline with Date & Time display */}
                      {t.deadline && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 9px',
                          borderRadius: 'var(--radius-sm)',
                          background: isOverdue ? 'rgba(239, 68, 68, 0.08)' : 'var(--subtle)',
                          border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.25)' : 'var(--border)'}`,
                          fontSize: '11px',
                          fontWeight: 600,
                          color: isOverdue ? '#DC2626' : 'var(--text-secondary)',
                          marginBottom: '12px'
                        }}>
                          <Clock size={12} style={{ color: isOverdue ? '#DC2626' : 'var(--brand-500)', flexShrink: 0 }} />
                          <span>Deadline: {formatDeadlineWithTime(t.deadline)}</span>
                        </div>
                      )}

                      {t.attachments && t.attachments.length > 0 && (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: '6px',
                            marginBottom: '12px'
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          {t.attachments.map(att => (
                            <AttachmentCard key={att.id || att.file_url} attachment={att} />
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border)',
                      fontSize: '11px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {t.assignee?.avatar_url ? (
                          <img
                            src={t.assignee.avatar_url}
                            alt=""
                            style={{ width: '22px', height: '22px', borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--brand-gradient)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '9px',
                            fontWeight: 700
                          }}>
                            {t.assignee?.first_name?.[0]}{t.assignee?.last_name?.[0]}
                          </div>
                        )}
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {t.assignee?.first_name} {t.assignee?.last_name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Start Action directly from card if not started */}
                        {t.status === 'not_started' && (
                          <button
                            type="button"
                            onClick={(e) => handleStartTaskDirect(e, t)}
                            style={{
                              background: 'var(--brand-50)',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              color: 'var(--brand-700)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Start Task"
                          >
                            <Play size={10} fill="currentColor" /> Start
                          </button>
                        )}

                        <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MessageSquare size={13} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
        >
          <div className="card modal-animate" style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-float)'
          }}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold text-lg" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  Allocate Task on {activeDate}
                </h3>
                <p className="text-xs text-secondary mt-0.5">Assign deliverable to a squad member</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--status-blocked-bg)',
                color: 'var(--status-blocked)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTaskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Implement user dashboard widgets"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Assign To Member *</label>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">-- Select Member * --</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {currentUser?.role === 'PM'
                        ? `${m.first_name} ${m.last_name} (${m.role}${m.department ? ' · ' + m.department : ''})`
                        : `${m.first_name} ${m.last_name} (${m.role} - ${m.department || 'Squad'})`}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">
                    Scheduled Date *
                  </label>
                  <select
                    value={newTaskScheduledDate || activeDate}
                    onChange={(e) => handleScheduledDateChange(e.target.value)}
                    className="input"
                    required
                  >
                    {dates.map(d => (
                      <option key={d} value={d}>
                        {d} {d === formatDateDDMMYYYY(new Date()) ? '(Today)' : ''}
                      </option>
                    ))}
                    {!dates.includes(newTaskScheduledDate) && newTaskScheduledDate && (
                      <option value={newTaskScheduledDate}>{newTaskScheduledDate}</option>
                    )}
                  </select>
                  <span className="text-xs text-tertiary mt-1 block" style={{ fontSize: '10px' }}>
                    Task displays strictly on this date tab
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">
                  Target Deadline & Time *
                </label>
                <input
                  type="datetime-local"
                  value={newTaskDeadline}
                  onChange={(e) => setNewTaskDeadline(e.target.value)}
                  className="input"
                  required
                />
                <span className="text-xs text-tertiary mt-1 block" style={{ fontSize: '11px' }}>
                  Specify both completion date and cutoff time (e.g., 06:00 PM)
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Description & Specs</label>
                <textarea
                  rows={3}
                  placeholder="Details, requirements, and acceptance criteria..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Allocating...' : `Allocate Task for ${newTaskScheduledDate || activeDate}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details & Chat Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          currentUser={currentUser}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={(updated) => {
            setSelectedTask(updated);
            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
          }}
        />
      )}
    </div>
  );
};

export default DayWiseTaskPlanner;
