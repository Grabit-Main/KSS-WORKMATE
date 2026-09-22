import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTasks, getTask, createTask, startTask, acceptTask, completeTask, confirmTask, reassignTask, deleteTask } from '../api/tasks';
import { getTeams } from '../api/teams';
import { getUsers } from '../api/users';
import { uploadFile } from '../api/upload';
import { getStoredGoogleToken, requestGoogleAccessToken, isGoogleDriveConnected } from '../services/googleDriveAuth';
import { useRealtime } from '../realtime/useRealtime';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import TaskDetailsModal from '../components/tasks/TaskDetailsModal';
import { AttachmentCard } from '../components/common/AttachmentCard';
import { formatDeadlineWithTime, isUpcomingDate, isDeadlineOverdue } from '../components/projects/DayWiseTaskPlanner';
import {
  Plus, Clock, ArrowRight, CheckSquare, X, Check, Calendar, Flag, Sparkles,
  Paperclip, Image as ImageIcon, Film, FileText, AlertTriangle, UserCheck, CheckCircle2, Trash2, Shield
} from 'lucide-react';

const normalizeToYYYYMMDD = (val) => {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  // Match DD-MM-YYYY or DD/MM/YYYY (e.g. 15-09-2026 or 15/09/2026)
  const ddmmyyyy = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month}-${day}`;
  }

  // Match YYYY-MM-DD or YYYY/MM/DD (e.g. 2026-09-15)
  const yyyymmdd = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    return `${year}-${month}-${day}`;
  }

  // Fallback: JS Date parsing
  let cleanStr = str;
  if (cleanStr.includes('T') && !cleanStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(cleanStr)) {
    cleanStr += 'Z';
  }
  const d = new Date(cleanStr);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
};

const getTodayYYYYMMDD = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatYYYYMMDDtoDDMMYYYY = (val) => {
  if (!val || val === 'all') return '';
  const str = String(val).trim();
  const yyyymmdd = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (yyyymmdd) {
    return `${yyyymmdd[3]}-${yyyymmdd[2]}-${yyyymmdd[1]}`;
  }
  const ddmmyyyy = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[1]}-${ddmmyyyy[2]}-${ddmmyyyy[3]}`;
  }
  return str;
};

const TasksPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const targetTaskId = searchParams.get('taskId');
  const { user } = useAuth();
  const cacheKey = user ? `cache_tasks_${user.id}` : null;
  const [tasks, setTasks] = useState(() => {
    if (!cacheKey) return [];
    const cached = localStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(() => {
    if (!cacheKey) return true;
    return !localStorage.getItem(cacheKey);
  });
  const [filterTab, setFilterTab] = useState('today'); // 'today', 'projects', 'standalone', 'all', 'review'
  const [selectedDateFilter, setSelectedDateFilter] = useState(() => getTodayYYYYMMDD());
  const dateInputRef = useRef(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [gdriveConnected, setGdriveConnected] = useState(isGoogleDriveConnected());
  const { joinRoom, dispatch } = useWebSocket();

  // Sync tasks state to localStorage whenever it changes
  useEffect(() => {
    if (cacheKey && tasks && tasks.length >= 0) {
      localStorage.setItem(cacheKey, JSON.stringify(tasks));
    }
  }, [tasks, cacheKey]);

  // Reassign Task State
  const [reassigningTask, setReassigningTask] = useState(null);
  const [reassignCandidate, setReassignCandidate] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassignSubmitting, setReassignSubmitting] = useState(false);

  // Auto-open task if URL has ?taskId=...
  useEffect(() => {
    if (!targetTaskId) return;
    const found = tasks.find(t => String(t.id) === String(targetTaskId));
    if (found) {
      setSelectedTask(found);
    } else {
      getTask(targetTaskId)
        .then(t => {
          if (t) setSelectedTask(t);
        })
        .catch(err => console.error('Failed to load target task from URL:', err));
    }
  }, [targetTaskId, tasks]);

  // New Task Modal State (For CEO, CTO, PM, and TL)
  const [showModal, setShowModal] = useState(false);
  const [teams, setTeams] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('normal');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // File Attachments State
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Filter eligible assignees: No one can assign to CEO/CTO; TM cannot assign to PM
  const isEligibleAssignee = useCallback((targetRole) => {
    if (!targetRole) return false;
    if (targetRole === 'CEO' || targetRole === 'CTO') return false;
    if (user?.role === 'TM' && targetRole === 'PM') return false;
    return true;
  }, [user?.role]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
    }
  };

  const removeAttachedFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <ImageIcon size={14} color="#3b82f6" />;
    if (fileType?.startsWith('video/')) return <Film size={14} color="#8b5cf6" />;
    return <FileText size={14} color="#10b981" />;
  };

  const loadTasks = async () => {
    try {
      const data = await getTasks();
      setTasks(data);
      if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(data));
      // Join team rooms for real-time updates
      const teamIds = [...new Set(data.map(t => t.team_id))];
      teamIds.forEach(id => joinRoom(`team:${id}`));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadModalDependencies = async () => {
    try {
      const [teamsData, usersData] = await Promise.all([
        getTeams().catch(() => []),
        getUsers().catch(() => [])
      ]);
      setTeams(teamsData);
      setUsersList(usersData);

      const myTeams = user?.role === 'TL'
        ? teamsData.filter(t => t.memberships?.some(m => String(m.user_id || m.user?.id) === String(user?.id)))
        : teamsData;

      const orgEligible = usersData.filter(u => isEligibleAssignee(u.role));
      const candidates = user?.role === 'TL'
        ? orgEligible.filter(u => myTeams.some(t => t.memberships?.some(m => String(m.user_id || m.user?.id) === String(u.id))) || String(u.id) === String(user?.id))
        : orgEligible;

      if (candidates.length > 0) {
        const firstCandidate = candidates[0];
        setAssignedTo(firstCandidate.id);
        const userTeam = teamsData.find(t => t.memberships?.some(m => String(m.user_id || m.user?.id) === String(firstCandidate.id)));
        setTeamId(userTeam ? userTeam.id : '');
      } else {
        setAssignedTo('');
        setTeamId('');
      }
    } catch (err) {
      console.error('Failed to load modal deps:', err);
    }
  };

  const handleAssigneeChange = (value) => {
    setAssignedTo(value);
    const matchingTeam = teams.find(t => t.memberships?.some(m => String(m.user_id || m.user?.id) === String(value)));
    if (matchingTeam) {
      setTeamId(matchingTeam.id);
    } else {
      setTeamId('');
    }
  };



  useEffect(() => {
    loadTasks();
    const handleGdriveChange = () => setGdriveConnected(isGoogleDriveConnected());
    window.addEventListener('gdrive_auth_change', handleGdriveChange);
    return () => window.removeEventListener('gdrive_auth_change', handleGdriveChange);
  }, []);

  const openNewTaskModal = () => {
    setAttachedFiles([]);
    loadModalDependencies();
    setShowModal(true);
  };

  // Real-time handlers with instant 0 ms state synchronization
  const handleTaskCreated = useCallback((payload) => {
    if (!payload) return;
    const taskData = payload.task || payload.data || payload;
    if (taskData && taskData.id) {
      setTasks(prev => {
        if (prev.some(t => String(t.id) === String(taskData.id))) {
          return prev.map(t => String(t.id) === String(taskData.id) ? { ...t, ...taskData } : t);
        }
        return [taskData, ...prev];
      });
    }
    loadTasks();
  }, []);

  const handleTaskStatusChanged = useCallback((payload) => {
    if (!payload) return;
    const taskData = payload.task || payload.data || payload;
    const taskId = taskData?.task_id || taskData?.id;
    if (taskId) {
      setTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, ...taskData, status: taskData.status || t.status } : t));
      setSelectedTask(curr => (curr && String(curr.id) === String(taskId)) ? { ...curr, ...taskData, status: taskData.status || curr.status } : curr);
    }
  }, []);

  const handleTaskReassigned = useCallback((payload) => {
    if (!payload) return;
    const taskData = payload.task || payload.data || payload;
    const taskId = taskData?.task_id || taskData?.id;
    if (taskId) {
      setTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, ...taskData, assigned_to: taskData.assigned_to || t.assigned_to } : t));
      setSelectedTask(curr => (curr && String(curr.id) === String(taskId)) ? { ...curr, ...taskData, assigned_to: taskData.assigned_to || curr.assigned_to } : curr);
    }
    loadTasks();
  }, []);

  const handleTaskLocked = useCallback((payload) => {
    if (!payload) return;
    const taskData = payload.task || payload.data || payload;
    const taskId = taskData?.task_id || taskData?.id;
    if (taskId) {
      setTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, is_locked: true, status: 'completed' } : t));
      setSelectedTask(curr => (curr && String(curr.id) === String(taskId)) ? { ...curr, is_locked: true, status: 'completed' } : curr);
    }
  }, []);

  const handleTaskDeleted = useCallback((payload) => {
    if (!payload) return;
    const taskData = payload.task || payload.data || payload;
    const taskId = taskData?.task_id || taskData?.id;
    if (taskId) {
      setTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
      setSelectedTask(curr => (curr && String(curr.id) === String(taskId)) ? null : curr);
    }
  }, []);

  useRealtime('task.created', handleTaskCreated);
  useRealtime('task.status_changed', handleTaskStatusChanged);
  useRealtime('task.reassigned', handleTaskReassigned);
  useRealtime('task.locked', handleTaskLocked);
  useRealtime('task.deleted', handleTaskDeleted);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !assignedTo) {
      setFormError('Please fill in task title, description, and select an assignee.');
      return;
    }

    // Check if user has attached document files that require Google Drive OAuth
    const hasDocFiles = attachedFiles.some(f => !f.type?.startsWith('image/') && !f.type?.startsWith('video/'));
    let googleToken = null;
    if (hasDocFiles) {
      googleToken = getStoredGoogleToken();
      if (!googleToken) {
        setSubmitting(true);
        try {
          googleToken = await requestGoogleAccessToken();
        } catch (authErr) {
          console.warn('Google Drive Auth error:', authErr);
          setFormError(authErr?.message || 'Google Drive authentication is required to upload document attachments. Please grant permissions in the Google window.');
          setSubmitting(false);
          return;
        }
      }
    }

    setSubmitting(true);
    setFormError('');

    let effectiveTeamId = teamId;
    if (user?.role === 'PM') {
      const userTeam = teams.find(t => t.memberships?.some(m => String(m.user_id || m.user?.id) === String(assignedTo)));
      effectiveTeamId = userTeam ? userTeam.id : null;
    } else if (!effectiveTeamId) {
      const userTeam = teams.find(t => t.memberships?.some(m => String(m.user_id || m.user?.id) === String(assignedTo)));
      effectiveTeamId = userTeam?.id || (availableTeams[0]?.id || teams[0]?.id || null);
    }

    try {
      const newTask = await createTask({
        team_id: effectiveTeamId,
        title: title.trim(),
        description: description.trim(),
        assigned_to: assignedTo,
        priority,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        project_id: null,
        scheduled_date: null
      });

      // Enrich newly created task with assigner & assignee user objects for instant rendering
      const targetUser = usersList.find(u => String(u.id) === String(assignedTo));
      const enrichedTask = {
        ...newTask,
        assigner: newTask.assigner || {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url
        },
        assignee: newTask.assignee || (targetUser ? {
          id: targetUser.id,
          first_name: targetUser.first_name,
          last_name: targetUser.last_name,
          email: targetUser.email,
          role: targetUser.role,
          avatar_url: targetUser.avatar_url
        } : null)
      };

      // 0 ms instant UI update: Prepend to tasks list immediately so it displays with NO delay
      setTasks(prev => [enrichedTask, ...prev.filter(t => String(t.id) !== String(newTask.id))]);
      if (dispatch) {
        dispatch('task.created', enrichedTask);
      }

      // Close modal and reset form immediately
      setShowModal(false);
      setTitle('');
      setDescription('');
      setPriority('normal');
      setDeadline('');

      // Upload attached files asynchronously in the background so modal closing and task display are never blocked
      const filesToUpload = [...attachedFiles];
      setAttachedFiles([]);
      if (filesToUpload.length > 0 && newTask?.id) {
        Promise.all(filesToUpload.map(file => {
          const isDoc = !file.type?.startsWith('image/') && !file.type?.startsWith('video/');
          return uploadFile(file, newTask.id, null, isDoc ? googleToken : null).catch(uploadErr => {
            console.error('Failed to upload file attachment:', file.name, uploadErr);
          });
        })).then(() => {
          loadTasks();
        });
      } else {
        loadTasks();
      }
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to assign task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartTask = async (taskId, e) => {
    if (e) e.stopPropagation();
    // 0 ms Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'in_progress' } : t));
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(prev => ({ ...prev, status: 'in_progress' }));
    }
    if (dispatch) dispatch('task.status_changed', { id: taskId, status: 'in_progress' });
    try {
      const updated = await startTask(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t));
    } catch (err) {
      console.error('Failed to start task:', err);
      loadTasks();
    }
  };

  const handleAcceptTask = handleStartTask;

  const handleCompleteTask = async (taskId, e) => {
    e.stopPropagation();
    // 0 ms Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'in_review' } : t));
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(prev => ({ ...prev, status: 'in_review' }));
    }
    if (dispatch) dispatch('task.status_changed', { id: taskId, status: 'in_review' });
    try {
      const updated = await completeTask(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t));
    } catch (err) {
      console.error('Failed to complete task:', err);
      loadTasks();
    }
  };

  const handleConfirmTask = async (taskId, e) => {
    e.stopPropagation();
    // 0 ms Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', is_locked: true } : t));
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(prev => ({ ...prev, status: 'completed', is_locked: true }));
    }
    if (dispatch) dispatch('task.locked', { id: taskId, status: 'completed', is_locked: true });
    try {
      const updated = await confirmTask(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t));
    } catch (err) {
      console.error('Failed to confirm task:', err);
      loadTasks();
    }
  };

  const handleDeleteTask = async (taskId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }
    // Optimistic UI update
    setTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
    if (selectedTask && String(selectedTask.id) === String(taskId)) {
      setSelectedTask(null);
    }
    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert(err.response?.data?.detail || 'Failed to delete task.');
      loadTasks();
    }
  };

  const handleExecuteReassign = async (e) => {
    e.preventDefault();
    if (!reassigningTask || !reassignCandidate) return;
    const targetTaskId = reassigningTask.id;
    const cand = reassignCandidate;
    const rReason = reassignReason.trim() || undefined;

    // 0 ms Optimistic UI update
    setTasks(prev => prev.map(t => t.id === targetTaskId ? { ...t, assigned_to: cand, status: 'not_started' } : t));
    setReassigningTask(null);
    setReassignCandidate('');
    setReassignReason('');
    if (dispatch) dispatch('task.reassigned', { id: targetTaskId, assigned_to: cand });

    setReassignSubmitting(true);
    try {
      const updated = await reassignTask(targetTaskId, cand, rReason);
      setTasks(prev => prev.map(t => t.id === targetTaskId ? { ...t, ...updated } : t));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reassign task.');
      loadTasks();
    } finally {
      setReassignSubmitting(false);
    }
  };

  const isLeadership = ['CEO', 'CTO', 'PM'].includes(user?.role);

  const isTaskForDate = useCallback((t, targetDate) => {
    if (!t || !targetDate) return false;
    if (targetDate === 'all') return true;

    if (t.scheduled_date) {
      const sKey = normalizeToYYYYMMDD(t.scheduled_date);
      return sKey === targetDate;
    }
    if (t.deadline) {
      const dKey = normalizeToYYYYMMDD(t.deadline);
      if (dKey) return dKey === targetDate;
    }
    if (t.created_at) {
      const cKey = normalizeToYYYYMMDD(t.created_at);
      if (cKey === targetDate) return true;
    }

    const todayStr = getTodayYYYYMMDD();
    if (targetDate === todayStr && t.status !== 'completed') {
      return true;
    }

    return false;
  }, []);

  const userTasks = tasks.filter(t => {
    const isAssignedToMe = String(t.assigned_to) === String(user?.id);
    const isAssignedByMe = String(t.assigned_by) === String(user?.id);
    // CEO, CTO, and PM can see ALL tasks company-wide in read-only observation mode
    if (!isLeadership && !isAssignedToMe && !isAssignedByMe) return false;

    // The members can see current date tasks only; they can't access next upcoming days tasks
    if (user?.role === 'TM' && t.scheduled_date && isUpcomingDate(t.scheduled_date)) {
      return false;
    }
    return true;
  });

  const todayStr = getTodayYYYYMMDD();
  const todayTasks = userTasks.filter(t => isTaskForDate(t, todayStr));

  const dateFilteredTasks = useMemo(() => {
    return userTasks.filter(t => isTaskForDate(t, selectedDateFilter));
  }, [userTasks, selectedDateFilter, isTaskForDate]);

  const filteredTasks = useMemo(() => {
    return userTasks.filter(t => {
      if (filterTab === 'all') {
        return true;
      }
      if (filterTab === 'today') {
        if (!isTaskForDate(t, todayStr)) return false;
      } else if (selectedDateFilter !== 'all') {
        if (!isTaskForDate(t, selectedDateFilter)) return false;
      }

      if (filterTab === 'projects' && !t.project_id) return false;
      if (filterTab === 'standalone' && t.project_id) return false;
      if (filterTab === 'review' && t.status !== 'in_review') return false;

      return true;
    });
  }, [userTasks, filterTab, selectedDateFilter, isTaskForDate, todayStr]);

  const activeMetricTasks = filterTab === 'all' ? userTasks : (filterTab === 'today' ? todayTasks : dateFilteredTasks);

  const filterTabs = [
    {
      id: 'today',
      label: "Today's Tasks",
      count: todayTasks.length
    },
    {
      id: 'projects',
      label: "Project Tasks",
      count: userTasks.filter(t => Boolean(t.project_id) && (selectedDateFilter === 'all' || isTaskForDate(t, selectedDateFilter))).length
    },
    {
      id: 'standalone',
      label: "Standalone Tasks",
      count: userTasks.filter(t => !t.project_id && (selectedDateFilter === 'all' || isTaskForDate(t, selectedDateFilter))).length
    },
    {
      id: 'all',
      label: "All Tasks",
      count: userTasks.length
    },
    {
      id: 'review',
      label: "In Review",
      count: userTasks.filter(t => t.status === 'in_review' && (selectedDateFilter === 'all' || isTaskForDate(t, selectedDateFilter))).length
    }
  ];

  const availableTeams = user?.role === 'TL'
    ? teams.filter(t => t.memberships?.some(m => String(m.user_id || m.user?.id) === String(user?.id)))
    : teams;

  const eligibleOrgUsers = usersList.filter(u => isEligibleAssignee(u.role));

  const availableAssignees = user?.role === 'TL'
    ? eligibleOrgUsers.filter(u => availableTeams.some(t => t.memberships?.some(m => String(m.user_id || m.user?.id) === String(u.id))) || String(u.id) === String(user?.id))
    : eligibleOrgUsers;

  if (loading) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em' }}>Tasks</h2>
            <p className="text-sm text-secondary mt-1">Track assignments, progress updates, and completion deadlines</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="card skeleton" style={{ height: '290px' }}></div>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Title Section */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#1E293B', fontFamily: 'serif, Georgia, Inter, sans-serif', marginBottom: '4px' }}>
            Tasks & Deliverables
          </h2>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Track assignments, self-assigned workload, and delivery milestones.
          </p>
        </div>

        {/* Leadership actions: CEO, CTO, PM, TL can assign tasks */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {['CEO', 'CTO', 'PM', 'TL'].includes(user.role) && (
            <button
              className="btn btn-primary"
              onClick={() => openNewTaskModal()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#5551FF', borderRadius: '8px', padding: '10px 18px', fontWeight: 600 }}
            >
              <Plus size={16} />
              <span>New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Metric Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {/* Total Tasks */}
        <div style={{
          background: '#EEF2FF',
          border: '1px solid rgba(85, 81, 255, 0.2)',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Workload
          </span>
          <h3 style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A', marginTop: '4px', marginBottom: 0 }}>
            {activeMetricTasks.length}
          </h3>
        </div>

        {/* Completed */}
        <div style={{
          background: '#ECFDF5',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Completed
          </span>
          <h3 style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A', marginTop: '4px', marginBottom: 0 }}>
            {activeMetricTasks.filter(t => t.status === 'completed').length}
          </h3>
        </div>

        {/* In Progress */}
        <div style={{
          background: '#EBF5FF',
          border: '1px solid rgba(37, 99, 235, 0.2)',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            In Progress
          </span>
          <h3 style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A', marginTop: '4px', marginBottom: 0 }}>
            {activeMetricTasks.filter(t => t.status === 'in_progress').length}
          </h3>
        </div>

        {/* In Review */}
        <div style={{
          background: '#FFF7ED',
          border: '1px solid rgba(217, 119, 6, 0.2)',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            In Review
          </span>
          <h3 style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A', marginTop: '4px', marginBottom: 0 }}>
            {activeMetricTasks.filter(t => t.status === 'in_review').length}
          </h3>
        </div>
      </div>

      {/* Filter Tabs & Daily Date-wise Dropdown Row matching image UI */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {/* Left: Filter Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap',
          flex: 1
        }}>
          {filterTabs.map(tab => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilterTab(tab.id);
                  if (tab.id === 'today') {
                    setSelectedDateFilter(todayStr);
                  } else if (tab.id === 'all') {
                    setSelectedDateFilter('all');
                  }
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  border: isActive ? 'none' : '1px solid #E2E8F0',
                  background: isActive ? '#5551FF' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: isActive ? '0 3px 10px rgba(85, 81, 255, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '11.5px',
                  fontWeight: 500,
                  color: isActive ? 'rgba(255, 255, 255, 0.85)' : '#94A3B8'
                }}>
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Daily Date-wise Pill Input Filter */}
        <div 
          onClick={() => {
            if (dateInputRef.current?.showPicker) {
              dateInputRef.current.showPicker();
            } else {
              dateInputRef.current?.focus();
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#FFFFFF',
            border: '1.5px solid #5551FF',
            borderRadius: '9999px',
            padding: '5px 14px',
            boxShadow: '0 2px 6px rgba(85, 81, 255, 0.1)',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            cursor: 'pointer',
            height: '34px',
            position: 'relative'
          }}
        >
          {/* Far Left Calendar Icon */}
          <Calendar size={14} style={{ color: '#5551FF', flexShrink: 0 }} />

          {/* Formatted Date Display (DD-MM-YYYY) */}
          <span style={{
            fontSize: '12.5px',
            fontWeight: 600,
            color: '#1E293B',
            fontFamily: 'inherit',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap'
          }}>
            {selectedDateFilter !== 'all' ? formatYYYYMMDDtoDDMMYYYY(selectedDateFilter) : formatYYYYMMDDtoDDMMYYYY(todayStr)}
          </span>

          {/* Native Hidden Date Input */}
          <input
            type="date"
            ref={dateInputRef}
            className="custom-date-pill-input"
            value={selectedDateFilter === 'all' ? '' : selectedDateFilter}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedDateFilter(val ? val : 'all');
              if (val === todayStr) {
                setFilterTab('today');
              } else if (val) {
                setFilterTab('all');
              }
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer'
            }}
          />

          {/* Far Right Clear Icon */}
          {selectedDateFilter !== 'all' ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDateFilter('all');
                setFilterTab('all');
              }}
              title="Clear date filter"
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 0,
                color: '#94A3B8',
                zIndex: 2,
                marginLeft: '2px'
              }}
            >
              <X size={13} />
            </button>
          ) : (
            <Calendar size={14} style={{ color: '#5551FF', flexShrink: 0 }} />
          )}
        </div>
      </div>

      {/* Task List Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="card skeleton" style={{ height: '220px' }} />)}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--subtle-glass)' }}>
          <CheckSquare size={48} strokeWidth={1.5} style={{ margin: '0 auto 16px', color: 'var(--text-tertiary)' }} />
          <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>No Tasks Found</h3>
          <p className="text-secondary text-sm">There are no tasks matching your current view filter.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '20px' }}>
          {filteredTasks.map(task => {
            const isAssignedToMe = String(task.assigned_to) === String(user?.id);
            const isAssignedByMe = String(task.assigned_by) === String(user?.id);
            const isOverdue = isDeadlineOverdue(task.deadline, task.status);

            // Status Theme helper for Left Side Bar
            const getStatusTheme = (st) => {
              switch (st) {
                case 'not_started':
                  return { barBg: '#C84B31', label: 'NOT STARTED' };
                case 'in_progress':
                  return { barBg: '#2563EB', label: 'IN PROGRESS' };
                case 'in_review':
                  return { barBg: '#E17842', label: 'IN REVIEW' };
                case 'completed':
                  return { barBg: '#1EA566', label: 'COMPLETED' };
                default:
                  return { barBg: '#C84B31', label: (st || 'NOT STARTED').replace('_', ' ').toUpperCase() };
              }
            };

            const statusTheme = getStatusTheme(task.status);
            const assigneeName = isAssignedToMe
              ? 'You'
              : (task.assignee ? `${task.assignee.first_name || ''} ${task.assignee.last_name || ''}`.trim() : 'Unassigned');
            const assigneeInitials = isAssignedToMe
              ? (user?.first_name?.[0] || 'Y')
              : (task.assignee?.first_name?.[0] || 'U') + (task.assignee?.last_name?.[0] || '');

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  minHeight: '260px',
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.09)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)';
                }}
              >
                {/* Left Side Status Vertical Colored Banner */}
                <div
                  style={{
                    background: statusTheme.barBg,
                    width: '52px',
                    minWidth: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRight: '2px dashed #E2E8F0',
                    position: 'relative',
                    padding: '12px 0'
                  }}
                >
                  <span
                    style={{
                      writingMode: 'vertical-lr',
                      transform: 'rotate(180deg)',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {statusTheme.label}
                  </span>
                </div>

                {/* Main Card Body */}
                <div
                  style={{
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    background: '#FFFFFF'
                  }}
                >
                  {/* Top Header Meta Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                      {task.project_id ? `Project task` : 'Standalone task'}
                    </span>

                    {/* Delete icon button (only for task assigner) */}
                    {isAssignedByMe && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTask(task.id, e)}
                        title="Delete Task"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#EF4444';
                          e.currentTarget.style.background = '#FEF2F2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#94A3B8';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Task Title */}
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      fontFamily: 'serif, Georgia, Inter, sans-serif',
                      color: '#0F172A',
                      marginBottom: '6px',
                      lineHeight: '1.3',
                      letterSpacing: '-0.01em',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {task.title}
                  </h3>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#64748B',
                      lineHeight: '1.45',
                      marginBottom: '12px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {task.description || 'No description provided.'}
                  </p>

                  {/* Deadline & Exceeded Row */}
                  {task.deadline && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginBottom: '16px', color: isOverdue ? '#B91C1C' : '#475569', fontWeight: 500 }}>
                      <Calendar size={14} color={isOverdue ? '#B91C1C' : '#64748B'} />
                      <span>{formatDeadlineWithTime(task.deadline)}</span>
                      {isOverdue && (
                        <span style={{ color: '#B91C1C', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '4px' }}>
                          · ⚠️ Exceeded
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div style={{ marginTop: 'auto', marginBottom: '14px' }} onClick={e => e.stopPropagation()}>
                    {/* Action button set for Assigner */}
                    {task.status !== 'completed' && isAssignedByMe && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReassigningTask(task);
                            setReassignCandidate(String(task.assigned_to) || '');
                            setReassignReason('');
                          }}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            color: '#1E293B',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                        >
                          <UserCheck size={14} color="#475569" />
                          <span>Reassign</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleConfirmTask(task.id, e)}
                          style={{
                            background: '#1EA566',
                            border: 'none',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#047857'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#1EA566'; }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Complete</span>
                        </button>
                      </div>
                    )}

                    {/* Action button set for Assignee (Not Assigner) */}
                    {isAssignedToMe && !isAssignedByMe && task.status === 'not_started' && (
                      <button
                        type="button"
                        onClick={(e) => handleStartTask(task.id, e)}
                        style={{
                          width: '100%',
                          background: '#5551FF',
                          border: 'none',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          padding: '9px 12px',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>▶</span> Start Task
                      </button>
                    )}

                    {isAssignedToMe && !isAssignedByMe && task.status === 'in_progress' && (
                      <button
                        type="button"
                        onClick={(e) => handleCompleteTask(task.id, e)}
                        style={{
                          width: '100%',
                          background: '#1EA566',
                          border: 'none',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          padding: '9px 12px',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <CheckCircle2 size={14} />
                        Submit for Review
                      </button>
                    )}
                  </div>

                  {/* Bottom Footer User & Details Row */}
                  <div
                    style={{
                      paddingTop: '12px',
                      borderTop: '1px solid #F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '9999px',
                          background: '#F1F5F9',
                          color: '#334155',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {assigneeInitials}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                        {assigneeName}
                      </span>
                    </div>

                    <ArrowRight size={14} color="#5551FF" strokeWidth={2.2} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Assignment Modal (Available to CEO, CTO, PM, and TL) */}
      {showModal && (
        <div style={{
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
          zIndex: 999,
          padding: '20px'
        }}>
          <div className="card modal-animate" style={{
            width: '100%',
            maxWidth: '560px',
            padding: '28px',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-float)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold text-lg" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  {user?.role === 'TL' ? 'Assign Task to Team Member' : 'Assign New Task'}
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Dispatch deliverables and instructions to team members
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
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

            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Assign To User *</label>
                <select
                  value={assignedTo}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="input"
                  required
                >
                  <option value="" disabled>Select a user to assign...</option>
                  {(user?.role === 'TL' ? availableAssignees : eligibleOrgUsers).map(u => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.role}{u.department ? ` · ${u.department}` : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Implement OAuth 2.0 PKCE authentication flow"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Description & Instructions *</label>
                <textarea
                  rows={3}
                  placeholder="Detailed criteria, expectations, and steps required for this task..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  style={{ resize: 'vertical' }}
                  required
                />

                {/* Attach icon and files preview */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand-500)'; e.currentTarget.style.background = 'var(--brand-50)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--subtle)'; }}
                    >
                      <Paperclip size={14} color="var(--brand-600)" />
                      <span>Attach Images, videos and Docs</span>
                    </button>
                    <span className="text-xs text-secondary">
                      {attachedFiles.length > 0 ? `${attachedFiles.length} file${attachedFiles.length > 1 ? 's' : ''} attached` : 'Supports images, videos & documents'}
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                    style={{ display: 'none' }}
                  />

                  {attachedFiles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                      {attachedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--surface-hover)',
                            border: '1px solid var(--border)',
                            fontSize: '11px',
                            color: 'var(--text-primary)'
                          }}
                        >
                          {getFileIcon(file.type)}
                          <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </span>
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>
                            ({formatFileSize(file.size)})
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAttachedFile(idx)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }}
                            title="Remove attachment"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {attachedFiles.some(f => !f.type?.startsWith('image/') && !f.type?.startsWith('video/')) && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: gdriveConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                      border: `1px solid ${gdriveConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path d="M7.71 3.5L1.15 15l3.43 6h6.56l-3.43-6L14.28 3.5H7.71z" fill="#0066DA"/>
                          <path d="M22.85 15l-3.43-6H6.57l3.43 6h12.85z" fill="#00AC47"/>
                          <path d="M14.29 3.5L7.71 15l3.43 6 6.57-11.5L14.29 3.5z" fill="#EA4335"/>
                          <path d="M14.29 3.5h8.56l-6.57 11.5h-6.56L14.29 3.5z" fill="#FFBA00"/>
                        </svg>
                        <span style={{ color: gdriveConnected ? 'var(--status-active)' : 'var(--brand-600)', fontWeight: 500 }}>
                          {gdriveConnected ? 'Google Drive Connected (Files upload to your Drive)' : 'Google Drive Auth required for documents'}
                        </span>
                      </div>
                      {!gdriveConnected && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await requestGoogleAccessToken();
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          style={{
                            background: 'var(--brand-600)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Target Deadline & Time</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Assigning Task...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {reassigningTask && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setReassigningTask(null); }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div className="card modal-animate" style={{
            width: '100%',
            maxWidth: '460px',
            padding: '24px',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-float)'
          }}>
            <div className="flex justify-between items-center mb-3">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--brand-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserCheck size={18} />
                </div>
                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Reassign Task
                </h3>
              </div>
              <button
                onClick={() => setReassigningTask(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-secondary mb-4" style={{ lineHeight: 1.5 }}>
              Transfer responsibility for <strong>"{reassigningTask.title}"</strong> to another squad member. The status will return to Not Started.
            </p>

            <form onSubmit={handleExecuteReassign} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">
                  Select New Assignee *
                </label>
                <select
                  value={reassignCandidate}
                  onChange={(e) => setReassignCandidate(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">-- Select Member --</option>
                  {eligibleOrgUsers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} ({m.role}{m.department ? ` · ${m.department}` : ''}){String(m.id) === String(reassigningTask?.assigned_to) ? ' (Current Assignee)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">
                  Reassignment Note / Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain why this deliverable is being reassigned..."
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setReassigningTask(null)}
                  className="btn btn-secondary"
                  disabled={reassignSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={reassignSubmitting || !reassignCandidate}
                >
                  {reassignSubmitting ? 'Reassigning...' : 'Confirm Reassign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal with Right-Side Direct Chat */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          currentUser={user}
          onClose={() => {
            setSelectedTask(null);
            if (searchParams.get('taskId')) {
              searchParams.delete('taskId');
              setSearchParams(searchParams, { replace: true });
            }
          }}
          onTaskUpdated={(updated) => {
            setSelectedTask(updated);
            if (updated && updated.id) {
              setTasks(prev => prev.map(t => String(t.id) === String(updated.id) ? { ...t, ...updated } : t));
            }
            loadTasks();
          }}
        />
      )}
    </div>
  );
};

export default TasksPage;
