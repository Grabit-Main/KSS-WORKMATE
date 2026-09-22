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
  AlertCircle, AlertTriangle, Lock
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
  let str = String(dateVal).trim();
  if (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str)) {
    str += 'Z';
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const datePart = `${day}-${month}-${year}`;
  const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${datePart} at ${timePart}`;
};

// Check if task deadline is overdue safely considering UTC timezone
export const isDeadlineOverdue = (dateVal, status) => {
  if (!dateVal || status === 'completed') return false;
  let str = String(dateVal).trim();
  if (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str)) {
    str += 'Z';
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
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

// Check if a date string represents an upcoming/future date (strictly after today)
export const isUpcomingDate = (dateStr) => {
  if (!dateStr) return false;
  const targetTs = parseDateStringToTimestamp(dateStr);
  if (!targetTs) return false;
  const now = new Date();
  const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return targetTs > todayTs;
};

// Check if a date string is today (current date)
export const isCurrentDate = (dateStr) => {
  if (!dateStr) return false;
  const targetTs = parseDateStringToTimestamp(dateStr);
  if (!targetTs) return false;
  const now = new Date();
  const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return targetTs === todayTs;
};

// Format Date object to YYYY-MM-DD for native HTML5 date input
export const formatDateYYYYMMDD = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const [isAddDateDialogOpen, setIsAddDateDialogOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState('');

  // Role authorization: Day-wise planner is strictly for Team Leads (TL) only
  const { dispatch, joinRoom, leaveRoom } = useWebSocket() || {};
  const isSquadLead = teamId && teamMembers.some(m => String(m.id) === String(currentUser?.id) && m.is_lead);
  const canAllocate = currentUser?.role === 'TL' || isSquadLead;

  // Join the project room for persistent real-time event streaming
  useEffect(() => {
    if (project?.id && joinRoom) {
      joinRoom(`project:${project.id}`);
      return () => {
        if (leaveRoom) leaveRoom(`project:${project.id}`);
      };
    }
  }, [project?.id, joinRoom, leaveRoom]);

  // Real-time synchronization for project day-wise deliverables
  useRealtime('task.status_changed', (eventData) => {
    const tId = eventData?.task_id || eventData?.id;
    if (!tId) return;
    setTasks(prev => prev.map(t => {
      if (String(t.id) === String(tId)) {
        return {
          ...t,
          ...eventData,
          status: eventData.status || t.status,
          is_locked: eventData.is_locked !== undefined ? eventData.is_locked : t.is_locked,
          deadline_exceeded: eventData.deadline_exceeded !== undefined ? eventData.deadline_exceeded : t.deadline_exceeded,
          ...(eventData.assignee ? { assignee: eventData.assignee } : {})
        };
      }
      return t;
    }));
    setSelectedTask(curr => {
      if (curr && String(curr.id) === String(tId)) {
        return {
          ...curr,
          ...eventData,
          status: eventData.status || curr.status,
          is_locked: eventData.is_locked !== undefined ? eventData.is_locked : curr.is_locked,
          deadline_exceeded: eventData.deadline_exceeded !== undefined ? eventData.deadline_exceeded : curr.deadline_exceeded,
          ...(eventData.assignee ? { assignee: eventData.assignee } : {})
        };
      }
      return curr;
    });
  });

  useRealtime('task.created', (eventData) => {
    const pId = eventData?.project_id;
    if (!pId || String(pId) === String(project?.id)) {
      if (eventData?.id && eventData?.title) {
        setTasks(prev => {
          if (prev.some(t => String(t.id) === String(eventData.id))) return prev;
          return [eventData, ...prev];
        });
        if (eventData.scheduled_date) {
          const norm = normalizeToDDMMYYYY(eventData.scheduled_date);
          if (norm) {
            setDates(prev => prev.includes(norm) ? prev : [...prev, norm].sort((a, b) => parseDateStringToTimestamp(a) - parseDateStringToTimestamp(b)));
          }
        }
      }
      loadData();
    }
  });

  useRealtime('task.updated', (eventData) => {
    const tId = eventData?.task_id || eventData?.id;
    if (!tId) return;
    setTasks(prev => prev.map(t => String(t.id) === String(tId) ? { ...t, ...eventData } : t));
    setSelectedTask(curr => (curr && String(curr.id) === String(tId)) ? { ...curr, ...eventData } : curr);
    loadData();
  });

  useRealtime('task.reassigned', (eventData) => {
    const tId = eventData?.task_id || eventData?.id;
    if (!tId) return;
    setTasks(prev => prev.map(t => {
      if (String(t.id) === String(tId)) {
        return {
          ...t,
          ...eventData,
          status: 'not_started',
          ...(eventData.assignee ? { assignee: eventData.assignee } : {})
        };
      }
      return t;
    }));
    setSelectedTask(curr => {
      if (curr && String(curr.id) === String(tId)) {
        return {
          ...curr,
          ...eventData,
          status: 'not_started',
          ...(eventData.assignee ? { assignee: eventData.assignee } : {})
        };
      }
      return curr;
    });
    loadData();
  });

  useRealtime('task.locked', (eventData) => {
    const tId = eventData?.task_id || eventData?.id;
    if (!tId) return;
    setTasks(prev => prev.map(t => String(t.id) === String(tId) ? { ...t, is_locked: true, status: 'completed' } : t));
    setSelectedTask(curr => (curr && String(curr.id) === String(tId)) ? { ...curr, is_locked: true, status: 'completed' } : curr);
  });

  useRealtime('task.deadline_exceeded', (eventData) => {
    const tId = eventData?.task_id || eventData?.id;
    if (!tId) return;
    setTasks(prev => prev.map(t => String(t.id) === String(tId) ? { ...t, deadline_exceeded: true } : t));
    setSelectedTask(curr => (curr && String(curr.id) === String(tId)) ? { ...curr, deadline_exceeded: true } : curr);
  });

  useRealtime('task.deleted', (eventData) => {
    const tId = eventData?.task_id || eventData?.id;
    if (!tId) return;
    setTasks(prev => prev.filter(t => String(t.id) !== String(tId)));
    setSelectedTask(curr => (curr && String(curr.id) === String(tId)) ? null : curr);
  });

  useRealtime('notification.new', (eventData) => {
    const tId = eventData?.task_id || eventData?.ref_id;
    if (tId) {
      loadData();
    }
  });

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
      if (allocatedTeams.length > 0) {
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
        if (currentUser?.role === 'TM') {
          setActiveDate(formatDateDDMMYYYY(new Date()));
        } else {
          setActiveDate(curr => curr || existingDates[0]);
        }
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

  const handleOpenAddDateDialog = () => {
    const now = new Date();
    let defaultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (dates.length > 0) {
      const latestStr = dates[dates.length - 1];
      const latestObj = parseDateString(latestStr);
      if (latestObj && !isNaN(latestObj.getTime())) {
        const nextD = new Date(latestObj);
        nextD.setDate(nextD.getDate() + 1);
        defaultDate = nextD;
      }
    }
    setPickerDate(formatDateYYYYMMDD(defaultDate));
    setIsAddDateDialogOpen(true);
  };

  const handleConfirmAddDate = () => {
    if (!pickerDate) return;
    const formatted = normalizeToDDMMYYYY(pickerDate);
    if (!formatted) return;
    if (!dates.includes(formatted)) {
      const updated = [...dates, formatted].sort((a, b) => parseDateStringToTimestamp(a) - parseDateStringToTimestamp(b));
      setDates(updated);
    }
    setActiveDate(formatted);
    setIsAddDateDialogOpen(false);
  };

  const handleSelectDate = (dateStr) => {
    if (currentUser?.role === 'TM' && isUpcomingDate(dateStr)) {
      return; // Members cannot access upcoming days tasks
    }
    setActiveDate(dateStr);
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
    if (dispatch) dispatch('task.status_changed', { id: task.id, task_id: task.id, status: 'in_progress', project_id: project.id });
    try {
      const updated = await startTask(task.id);
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to start task.');
      loadData();
    }
  };

  const isLeadership = ['CEO', 'CTO', 'PM'].includes(currentUser?.role);
  const userVisibleTasks = tasks.filter(t => {
    const isParty = String(t.assigned_to) === String(currentUser?.id) || String(t.assigned_by) === String(currentUser?.id);
    if (!isLeadership && !isParty) return false;
    // The members can see current date tasks only; they can't access next upcoming days tasks
    if (currentUser?.role === 'TM' && t.scheduled_date && isUpcomingDate(t.scheduled_date)) {
      return false;
    }
    return true;
  });
  const activeDateTasks = userVisibleTasks.filter(t => normalizeToDDMMYYYY(t.scheduled_date) === activeDate);

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

  // Remove role restriction so all portals can access/view Date-Wise Allocation
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px'
      }}
    >
      <div className="modal-animate" style={{
        width: '100%',
        maxWidth: '1080px',
        height: '88vh',
        maxHeight: '740px',
        display: 'flex',
        flexDirection: 'row',
        padding: 0,
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        borderRadius: '24px',
        background: '#FFFFFF'
      }}>
        {/* Left Sidebar Panel - Dark Navy Theme */}
        <div style={{
          width: '320px',
          flexShrink: 0,
          background: '#19173D',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          color: '#FFFFFF'
        }}>
          {/* Header Label & Project Info */}
          <div style={{ marginBottom: '28px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#818CF8',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '10px'
            }}>
              DATE-WISE ALLOCATION
            </span>
            <h2 style={{
              fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
              fontSize: '32px',
              fontWeight: 700,
              color: '#FFFFFF',
              margin: '0 0 10px 0',
              lineHeight: 1.1,
              letterSpacing: '-0.01em'
            }}>
              {project.name}
            </h2>
            <p style={{
              fontSize: '13px',
              color: '#94A3B8',
              lineHeight: 1.5,
              margin: 0,
              fontWeight: 400
            }}>
              Plan and allocate daily task deliverables by date for squad members.
            </p>
          </div>

          {/* Dates Navigation List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            paddingRight: '4px'
          }}>
            {dates.map(d => {
              const isUpcoming = isUpcomingDate(d);
              const isMemberLocked = currentUser?.role === 'TM' && isUpcoming;
              const countForDate = userVisibleTasks.filter(t => normalizeToDDMMYYYY(t.scheduled_date) === d).length;
              const isSelected = activeDate === d;

              if (isMemberLocked) {
                return (
                  <div
                    key={d}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: 0.55,
                      cursor: 'not-allowed',
                      userSelect: 'none'
                    }}
                    title="Upcoming deliverable date is locked for members"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94A3B8', fontSize: '13.5px', fontWeight: 500 }}>
                      <Lock size={14} style={{ color: '#64748B' }} />
                      <span>{d}</span>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: '#64748B',
                      textTransform: 'uppercase'
                    }}>
                      LOCKED
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={d}
                  onClick={() => handleSelectDate(d)}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    border: isSelected ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid transparent',
                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{
                    fontSize: '14px',
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? '#FFFFFF' : '#A5B4FC'
                  }}>
                    {d}
                  </span>
                  <div style={{
                    width: isSelected ? '24px' : '22px',
                    height: isSelected ? '24px' : '22px',
                    borderRadius: '50%',
                    background: isSelected ? '#93C5FD' : 'rgba(255, 255, 255, 0.15)',
                    color: isSelected ? '#19173D' : '#E0E7FF',
                    fontWeight: isSelected ? 800 : 700,
                    fontSize: isSelected ? '12px' : '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {countForDate}
                  </div>
                </div>
              );
            })}

            {canAllocate && (
              <button
                type="button"
                onClick={handleOpenAddDateDialog}
                style={{
                  marginTop: '8px',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: '1px dashed rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#E0E7FF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
              >
                <Plus size={15} />
                <span>Add Date</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Main Content Panel */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: '#FAFAFA',
          padding: '28px 36px',
          overflow: 'hidden'
        }}>
          {/* Top Breadcrumb & Action Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexShrink: 0
          }}>
            {/* Breadcrumbs */}
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#64748B' }}>{project.name}</span>
              <span style={{ color: '#CBD5E1', fontWeight: 400 }}>&gt;</span>
              <span style={{ color: '#0F172A', fontWeight: 700 }}>{activeDate}</span>
            </div>

            {/* Header Actions & Close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {canAllocate && (
                <button
                  onClick={handlePreFillTasks}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: '#EEF2FF',
                    color: '#4F46E5',
                    border: '1px solid #C7D2FE',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title="Pre-fill sprint deliverables across scheduled dates"
                >
                  <Sparkles size={14} />
                  <span>Pre-fill Tasks</span>
                </button>
              )}

              {canAllocate && (
                <button
                  onClick={() => handleOpenAddModal(activeDate)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: '#5B50E5',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(91, 80, 229, 0.25)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Plus size={14} />
                  <span>Add Task</span>
                </button>
              )}

              <button
                onClick={onClose}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: '#F3F4F6',
                  border: 'none',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#E5E7EB'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#F3F4F6'}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Main Heading */}
          <h3 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#0F172A',
            margin: '0 0 24px 0',
            letterSpacing: '-0.02em',
            flexShrink: 0
          }}>
            {activeDateTasks.length} deliverable{activeDateTasks.length === 1 ? '' : 's'} allocated
          </h3>

          {/* Deliverables List Container */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: '6px'
          }}>
            {currentUser?.role === 'TM' && isUpcomingDate(activeDate) ? (
              <div style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px dashed #CBD5E1',
                maxWidth: '520px',
                margin: '40px auto'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  color: '#64748B'
                }}>
                  <Lock size={22} />
                </div>
                <h5 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                  Upcoming Deliverables Locked
                </h5>
                <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px', lineHeight: 1.5 }}>
                  Team members can only view deliverables for current date ({formatDateDDMMYYYY(new Date())}). Upcoming days will unlock on their scheduled date.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveDate(formatDateDDMMYYYY(new Date()))}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    background: '#5B50E5',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  View Today's Deliverables
                </button>
              </div>
            ) : loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[1, 2].map(i => (
                  <div key={i} className="card skeleton" style={{ height: '220px', borderRadius: '16px' }} />
                ))}
              </div>
            ) : activeDateTasks.length === 0 ? (
              <div style={{
                padding: '60px 24px',
                textAlign: 'center',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px dashed #CBD5E1',
                margin: '20px 0'
              }}>
                <Calendar size={40} strokeWidth={1.5} style={{ margin: '0 auto 12px', color: '#94A3B8' }} />
                <h5 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                  No Deliverables Scheduled for {activeDate}
                </h5>
                {canAllocate ? (
                  <>
                    <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
                      Assign tasks to squad members on this date or click "Pre-fill Tasks" to build a standard roadmap.
                    </p>
                    <button
                      onClick={() => handleOpenAddModal(activeDate)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        background: '#5B50E5',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Plus size={15} />
                      <span>Add Task on {activeDate}</span>
                    </button>
                  </>
                ) : (
                  <p style={{ fontSize: '13px', color: '#64748B' }}>
                    No deliverables scheduled for this date.
                  </p>
                )}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px'
              }}>
                {activeDateTasks.map(t => {
                  const isOverdue = isDeadlineOverdue(t.deadline, t.status);

                  // Badge styles matching image design
                  const isCompleted = t.status === 'completed';
                  const isUrgent = t.priority === 'urgent' || t.priority === 'high';

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        border: isOverdue ? '1.5px solid rgba(239, 68, 68, 0.5)' : '1px solid #E2E8F0',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                        padding: '18px 20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '260px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = isOverdue ? '#EF4444' : '#818CF8';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isOverdue ? 'rgba(239, 68, 68, 0.5)' : '#E2E8F0';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.03)';
                      }}
                    >
                      <div>
                        {/* Top Badges Row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                          {/* Completed / Status Tag */}
                          {isCompleted ? (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              background: '#E6F4EA',
                              color: '#107C41',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              Completed
                            </span>
                          ) : (
                            getStatusBadge(t.status)
                          )}

                          {/* Priority / Urgent Tag */}
                          {isUrgent && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#EF4444',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              🔥 Urgent
                            </span>
                          )}

                          {isOverdue && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '9999px',
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

                        {/* Title in Serif Font */}
                        <h4 style={{
                          fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
                          fontSize: '20px',
                          fontWeight: 700,
                          color: '#0F172A',
                          margin: '0 0 6px 0',
                          lineHeight: 1.25,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {t.title}
                        </h4>

                        {/* Description */}
                        <p style={{
                          fontSize: '13px',
                          color: '#64748B',
                          lineHeight: 1.45,
                          margin: '0 0 14px 0',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {t.description || 'Complete everything regarding this project.'}
                        </p>

                        {/* Deadline Purple Highlight Box */}
                        {t.deadline && (
                          <div style={{
                            background: '#EEF2FF',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '14px'
                          }}>
                            {/* Clock Icon inside White Square Badge */}
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #E0E7FF',
                              color: '#4F46E5',
                              flexShrink: 0
                            }}>
                              <Clock size={16} />
                            </div>

                            {/* Deadline Text */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.06em',
                                color: '#6366F1',
                                textTransform: 'uppercase',
                                marginBottom: '1px'
                              }}>
                                DEADLINE
                              </span>
                              <span style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#1E1B4B'
                              }}>
                                {formatDeadlineWithTime(t.deadline)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        {/* Divider Line */}
                        <div style={{ borderTop: '1px solid #F1F5F9', marginBottom: '12px' }} />

                        {/* Card Footer: Assignee & Action */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}>
                          {/* Assignee Information */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            {t.assignee?.avatar_url ? (
                              <img
                                src={t.assignee.avatar_url}
                                alt=""
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                              />
                            ) : (
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#334155',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 700,
                                flexShrink: 0
                              }}>
                                {t.assignee?.first_name?.[0]}{t.assignee?.last_name?.[0]}
                              </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>
                                Assigned to
                              </span>
                              <span style={{
                                fontSize: '12.5px',
                                fontWeight: 700,
                                color: '#0F172A',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {t.assignee ? `${t.assignee.first_name} ${t.assignee.last_name}` : 'Unassigned'}
                              </span>
                            </div>
                          </div>

                          {/* Action Button: Message / Details */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {t.status === 'not_started' && String(t.assigned_to) === String(currentUser?.id) && (
                              <button
                                type="button"
                                onClick={(e) => handleStartTaskDirect(e, t)}
                                style={{
                                  background: '#E0E7FF',
                                  color: '#4338CA',
                                  padding: '7px 10px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Play size={11} fill="currentColor" /> Start
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(t);
                              }}
                              style={{
                                background: '#5B50E5',
                                color: '#FFFFFF',
                                padding: '8px 14px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 8px rgba(91, 80, 229, 0.25)',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#4338CA'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#5B50E5'}
                            >
                              <MessageSquare size={14} />
                              <span>Message</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                <p className="text-xs text-secondary mt-0.5">Assign deliverable to a team member</p>
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
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Assign To User *</label>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">-- Select Member * --</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} ({m.role}{m.department ? ` · ${m.department}` : ''})
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
            setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
            if (dispatch) {
              dispatch('task.status_changed', {
                id: updated.id,
                task_id: updated.id,
                status: updated.status,
                project_id: project.id,
                is_locked: updated.is_locked,
                deadline_exceeded: updated.deadline_exceeded,
                assignee: updated.assignee
              });
            }
            loadData();
          }}
        />
      )}

      {/* Add Deliverable Date Modal with Calendar Selection */}
      {isAddDateDialogOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddDateDialogOpen(false); }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '20px'
          }}
        >
          <div className="card modal-animate" style={{
            width: '100%',
            maxWidth: '440px',
            padding: '28px',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-float)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--brand-50)',
                  color: 'var(--brand-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    Add Deliverable Date
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    Pick a calendar date for day-wise scheduling
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDateDialogOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Calendar Selection Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Select Date from Calendar *
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface-hover)',
                transition: 'border-color var(--transition-fast)'
              }}>
                <Calendar size={18} color="var(--brand-600)" />
                <input
                  type="date"
                  value={pickerDate}
                  min={formatDateYYYYMMDD(new Date())}
                  onChange={(e) => setPickerDate(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    width: '100%',
                    cursor: 'pointer'
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Shortcuts */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Quick Shortcuts
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Today', offset: 0 },
                  { label: 'Tomorrow', offset: 1 },
                  { label: '+2 Days', offset: 2 },
                  { label: '+3 Days', offset: 3 },
                  { label: '+1 Week', offset: 7 }
                ].map(p => {
                  const targetD = new Date();
                  targetD.setDate(targetD.getDate() + p.offset);
                  const val = formatDateYYYYMMDD(targetD);
                  const isSelected = pickerDate === val;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setPickerDate(val)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '11px',
                        fontWeight: isSelected ? 700 : 500,
                        border: isSelected ? '1px solid var(--brand-500)' : '1px solid var(--border)',
                        background: isSelected ? 'var(--brand-50)' : 'var(--subtle)',
                        color: isSelected ? 'var(--brand-700)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Preview */}
            {pickerDate && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-50)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--brand-700)' }}>
                  Target Deliverable Date:
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-800)' }}>
                  {normalizeToDDMMYYYY(pickerDate)}
                </span>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsAddDateDialogOpen(false)}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!pickerDate}
                onClick={handleConfirmAddDate}
                style={{ padding: '8px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Add to Timeline</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayWiseTaskPlanner;
