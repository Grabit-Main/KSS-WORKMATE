import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { formatDeadlineWithTime, isUpcomingDate } from '../components/projects/DayWiseTaskPlanner';
import {
  Plus, Clock, ArrowRight, CheckSquare, X, Check, Calendar, Flag, Sparkles,
  Paperclip, Image as ImageIcon, Film, FileText, AlertTriangle, UserCheck, CheckCircle2, Trash2, Shield
} from 'lucide-react';

const TasksPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const targetTaskId = searchParams.get('taskId');
  const { user } = useAuth();
  const cacheKey = user ? `cache_tasks_${user.id}` : 'cache_tasks';
  const [tasks, setTasks] = useState(() => {
    const cached = localStorage.getItem(cacheKey) || localStorage.getItem('cache_tasks');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(() => !(localStorage.getItem(cacheKey) || localStorage.getItem('cache_tasks')));
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'projects', 'standalone', 'mine', 'review'
  const [selectedTask, setSelectedTask] = useState(null);
  const [gdriveConnected, setGdriveConnected] = useState(isGoogleDriveConnected());
  const { joinRoom, dispatch } = useWebSocket();

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

  const filteredTasks = userTasks.filter(t => {
    if (filterTab === 'mine') return String(t.assigned_to) === String(user?.id);
    if (filterTab === 'review') return t.status === 'in_review';
    if (filterTab === 'projects') return Boolean(t.project_id);
    if (filterTab === 'standalone') return !t.project_id;
    return true;
  });

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
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em' }}>Tasks</h2>
          <p className="text-sm text-secondary mt-1">Track assignments, self-assigned workload, and delivery milestones</p>
        </div>

        {/* Leadership actions: CEO, CTO, PM, TL can assign tasks */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {['CEO', 'CTO', 'PM', 'TL'].includes(user.role) && (
            <button className="btn btn-primary" onClick={() => openNewTaskModal()}>
              <Plus size={16} /> New Task
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs for Quick Access */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'nowrap', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%', paddingBottom: '4px' }}>
        {[
          { id: 'all', label: `All Tasks (${userTasks.length})` },
          { id: 'projects', label: `Project Tasks (${userTasks.filter(t => Boolean(t.project_id)).length})` },
          { id: 'standalone', label: `Standalone Tasks (${userTasks.filter(t => !t.project_id).length})` },
          { id: 'mine', label: `Assigned to Me (${userTasks.filter(t => String(t.assigned_to) === String(user?.id)).length})` },
          { id: 'review', label: `In Review (${userTasks.filter(t => t.status === 'in_review').length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: filterTab === tab.id ? 600 : 500,
              border: '1px solid',
              borderColor: filterTab === tab.id ? 'var(--brand-600)' : 'var(--border)',
              background: filterTab === tab.id ? 'var(--brand-50)' : 'var(--surface)',
              color: filterTab === tab.id ? 'var(--brand-700)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            {tab.label}
          </button>
        ))}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
          {filteredTasks.map(task => {
            const isAssignedToMe = String(task.assigned_to) === String(user?.id);
            const isAssignedByMe = String(task.assigned_by) === String(user?.id);
            const isSelfAssigned = isAssignedToMe && isAssignedByMe;
            const isOverdue = task.deadline && new Date(task.deadline).getTime() < Date.now() && task.status !== 'completed';

            return (
              <div
                key={task.id}
                className="card"
                onClick={() => setSelectedTask(task)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '295px',
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all var(--transition-smooth)',
                  position: 'relative',
                  border: isOverdue
                    ? '1px solid rgba(239, 68, 68, 0.45)'
                    : isAssignedToMe
                    ? '1px solid rgba(99, 102, 241, 0.35)'
                    : '1px solid var(--border)',
                  borderLeft: isOverdue ? '4px solid #EF4444' : undefined,
                  background: isOverdue
                    ? 'linear-gradient(180deg, var(--surface) 0%, rgba(254, 242, 242, 0.25) 100%)'
                    : isAssignedToMe
                    ? 'linear-gradient(180deg, var(--surface) 0%, rgba(238, 242, 255, 0.25) 100%)'
                    : 'var(--surface)'
                }}
              >
                <div>
                  <div className="flex justify-between items-center mb-3" style={{ minHeight: '26px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: `var(--status-${task.status.replace('_', '-')}-bg)`,
                        color: `var(--status-${task.status.replace('_', '-')})`,
                        letterSpacing: '0.02em'
                      }}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>

                      {/* Project Deliverable vs Standalone Task Badge */}
                      {task.project_id ? (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: 'var(--brand-700)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          letterSpacing: '0.02em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          Project Deliverable
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--subtle)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                          letterSpacing: '0.02em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          Standalone Task
                        </span>
                      )}

                      {/* Self-assigned / Assigned to you badge */}
                      {isAssignedToMe && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--brand-100)',
                          color: 'var(--brand-700)',
                          letterSpacing: '0.02em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <Sparkles size={10} />
                          {isSelfAssigned ? 'Self-Assigned' : 'Assigned to You'}
                        </span>
                      )}

                      {/* Observing (Read-Only) badge for leadership */}
                      {!isAssignedToMe && !isAssignedByMe && isLeadership && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(100, 116, 139, 0.12)',
                          color: '#475569',
                          border: '1px solid rgba(100, 116, 139, 0.25)',
                          letterSpacing: '0.02em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <Shield size={10} />
                          Observing (Read-Only)
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {task.deadline && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isOverdue && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 'var(--radius-full)',
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#DC2626',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.02em'
                            }}>
                              <AlertTriangle size={10} />
                              Exceeded
                            </span>
                          )}
                          <span className="text-xs font-medium" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isOverdue ? '#DC2626' : 'var(--text-secondary)' }}>
                            <Clock size={13} strokeWidth={1.8} style={{ color: isOverdue ? '#DC2626' : 'var(--text-tertiary)' }} />
                            {formatDeadlineWithTime(task.deadline)}
                          </span>
                        </div>
                      )}

                      {/* Delete icon - Only who assigned the task can delete */}
                      {isAssignedByMe && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTask(task.id, e)}
                          title="Delete Task (Only assigner can delete)"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-tertiary)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: 'var(--radius-xs)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all var(--transition-fast)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#EF4444';
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-tertiary)';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-base mb-1.5" style={{
                    letterSpacing: '-0.015em',
                    color: 'var(--text-primary)',
                    minHeight: '42px',
                    lineHeight: '1.35',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {task.title}
                  </h3>
                  <p className="text-sm text-secondary mb-3" style={{
                    minHeight: '38px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: '1.45'
                  }}>
                    {task.description}
                  </p>

                  {/* Compact Attachments Chip if present */}
                  {task.attachments && task.attachments.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--subtle)',
                        border: '1px solid var(--border)',
                        color: 'var(--brand-700)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Paperclip size={11} /> {task.attachments.length} attachment{task.attachments.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Actions Slot with consistent height */}
                <div style={{ marginTop: 'auto', paddingTop: '10px', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                  {isAssignedToMe && task.status === 'not_started' && (
                    <button
                      onClick={(e) => handleStartTask(task.id, e)}
                      className="btn btn-primary"
                      style={{ width: '100%', height: '32px', fontSize: '12px', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <span>▶</span> Start Task
                    </button>
                  )}

                  {isAssignedToMe && task.status === 'in_progress' && (
                    <button
                      onClick={(e) => handleCompleteTask(task.id, e)}
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        height: '32px',
                        fontSize: '12px',
                        padding: '0 12px',
                        color: 'var(--brand-700)',
                        borderColor: 'rgba(99, 102, 241, 0.3)',
                        background: 'var(--brand-50)'
                      }}
                    >
                      Submit for Review
                    </button>
                  )}

                  {/* Assigner Actions: Strictly only who assigned the task gets Reassign & Complete */}
                  {task.status !== 'completed' && isAssignedByMe && (
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReassigningTask(task);
                          setReassignCandidate(String(task.assigned_to) || '');
                          setReassignReason('');
                        }}
                        className="btn btn-secondary"
                        style={{
                          flex: 1,
                          height: '32px',
                          fontSize: '12px',
                          padding: '0 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          color: 'var(--brand-700)',
                          borderColor: 'rgba(99, 102, 241, 0.3)',
                          background: 'var(--brand-50)'
                        }}
                        title="Reassign this deliverable"
                      >
                        <UserCheck size={14} />
                        <span>Reassign</span>
                      </button>

                      <button
                        onClick={(e) => handleConfirmTask(task.id, e)}
                        className="btn btn-primary"
                        style={{
                          flex: 1.3,
                          height: '32px',
                          fontSize: '12px',
                          padding: '0 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          background: 'var(--status-completed)',
                          borderColor: 'var(--status-completed)'
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Complete Task</span>
                      </button>
                    </div>
                  )}

                  {/* Read-Only Observer Indicator for Leadership */}
                  {!isAssignedToMe && !isAssignedByMe && isLeadership && (
                    <div style={{
                      width: '100%',
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--subtle)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: 'var(--text-secondary)'
                    }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Shield size={12} color="var(--brand-600)" />
                        <span>Assigned by {task.assigner?.first_name || 'TL'}</span>
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--text-tertiary)',
                        background: 'var(--surface)',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--border)'
                      }}>
                        View Only
                      </span>
                    </div>
                  )}
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  marginTop: '6px',
                  borderTop: '1px solid var(--border)',
                  minHeight: '38px'
                }}>
                  <div className="flex items-center gap-2">
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--radius-full)',
                      background: isAssignedToMe ? 'var(--brand-gradient)' : 'var(--subtle)',
                      color: isAssignedToMe ? 'white' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      boxShadow: isAssignedToMe ? '0 2px 6px rgba(99, 102, 241, 0.25)' : 'none'
                    }}>
                      {task.assignee?.first_name?.[0]}{task.assignee?.last_name?.[0]}
                    </div>
                    <span className="text-xs font-semibold text-secondary">
                      {isAssignedToMe ? 'You' : `${task.assignee?.first_name} ${task.assignee?.last_name}`}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--brand-600)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Details & Chat <ArrowRight size={12} strokeWidth={2} />
                  </span>
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
            loadTasks();
          }}
        />
      )}
    </div>
  );
};

export default TasksPage;
