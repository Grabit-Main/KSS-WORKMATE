import React, { useState, useEffect } from 'react';
import { TaskChat } from '../chat/TaskChat';
import { startTask, completeTask, confirmTask, reassignTask, deleteTask } from '../../api/tasks';
import { getUsers } from '../../api/users';
import { getTeams } from '../../api/teams';
import { AttachmentCard } from '../common/AttachmentCard';
import { useRealtime } from '../../realtime/useRealtime';
import { useWebSocket } from '../../context/WebSocketContext';
import { formatDateTime, normalizeToDDMMYYYY, getDeadlineStatus } from '../../utils/dateUtils';
import {
  X, Calendar, Clock, Play, CheckCircle2, User,
  Flag, AlertCircle, FolderKanban, Users, Shield, AlertTriangle, UserCheck, Trash2
} from 'lucide-react';

const formatScheduledDate = (val) => normalizeToDDMMYYYY(val);
const formatDeadlineWithTime = (dateVal) => formatDateTime(dateVal);

export const TaskDetailsModal = ({ task, currentUser, onClose, onTaskUpdated }) => {
  const [currentTask, setCurrentTask] = useState(task);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { dispatch } = useWebSocket() || {};

  // Real-time synchronization for active task
  useRealtime('task.status_changed', (data) => {
    if (String(data?.task_id) === String(currentTask?.id)) {
      setCurrentTask(prev => ({
        ...prev,
        status: data.status || prev.status,
        is_locked: data.is_locked !== undefined ? data.is_locked : prev.is_locked,
        deadline_exceeded: data.deadline_exceeded !== undefined ? data.deadline_exceeded : prev.deadline_exceeded
      }));
    }
  });

  useRealtime('task.updated', (data) => {
    if (String(data?.task_id || data?.id) === String(currentTask?.id)) {
      setCurrentTask(prev => ({ ...prev, ...data }));
    }
  });

  useRealtime('task.reassigned', (data) => {
    if (String(data?.task_id) === String(currentTask?.id)) {
      setCurrentTask(prev => ({
        ...prev,
        assigned_to: data.assigned_to || prev.assigned_to,
        status: data.status || prev.status
      }));
    }
  });

  useRealtime('task.locked', (data) => {
    if (String(data?.task_id) === String(currentTask?.id)) {
      setCurrentTask(prev => ({ ...prev, is_locked: true, status: 'completed' }));
    }
  });

  // Reassign State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignCandidate, setReassignCandidate] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [eligibleMembers, setEligibleMembers] = useState([]);
  const [reassignSuccessMsg, setReassignSuccessMsg] = useState('');

  useEffect(() => {
    setCurrentTask(task);
  }, [task]);

  useEffect(() => {
    const fetchEligibleMembers = async () => {
      try {
        const [usersData, teamsData] = await Promise.all([
          getUsers().catch(() => []),
          getTeams().catch(() => [])
        ]);

        let pool = [];
        if (currentTask.project_id) {
          const projTeams = teamsData.filter(t => String(t.project_id) === String(currentTask.project_id));
          if (projTeams.length > 0) {
            const memberIds = new Set(projTeams.flatMap(t => (t.memberships || []).map(m => String(m.user_id || m.user?.id))));
            pool = usersData.filter(u => memberIds.has(String(u.id)));
          }
        }
        if (pool.length === 0 && currentTask.team_id) {
          const curTeam = teamsData.find(t => String(t.id) === String(currentTask.team_id));
          if (curTeam && curTeam.memberships) {
            const memberIds = new Set(curTeam.memberships.map(m => String(m.user_id || m.user?.id)));
            pool = usersData.filter(u => memberIds.has(String(u.id)));
          }
        }
        if (pool.length === 0) {
          pool = usersData;
        }

        const filtered = pool.filter(u => {
          if (!u || !u.id) return false;
          if (u.role === 'CEO' || u.role === 'CTO') return false;
          if (currentUser.role === 'TM' && u.role === 'PM') return false;
          return true;
        });
        setEligibleMembers(filtered);
      } catch (err) {
        console.error('Failed to load eligible reassign members:', err);
      }
    };

    fetchEligibleMembers();
  }, [currentTask?.id, currentTask?.assigned_to, currentTask?.project_id, currentTask?.team_id, currentUser.role]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!currentTask) return null;

  const isAssignee = String(currentTask.assigned_to) === String(currentUser.id);
  const isAssigner = String(currentTask.assigned_by) === String(currentUser.id);
  const canConfirm = currentUser.role in { CEO: 1, CTO: 1, PM: 1, TL: 1 };

  const handleStart = async () => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      const updated = await startTask(currentTask.id);
      setCurrentTask(updated);
      if (onTaskUpdated) onTaskUpdated(updated);
      if (dispatch) dispatch('task.status_changed', { task_id: updated.id, id: updated.id, status: updated.status, project_id: updated.project_id });
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to start task.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      const updated = await completeTask(currentTask.id);
      setCurrentTask(updated);
      if (onTaskUpdated) onTaskUpdated(updated);
      if (dispatch) dispatch('task.status_changed', { task_id: updated.id, id: updated.id, status: updated.status, project_id: updated.project_id });
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to submit task for review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      const updated = await confirmTask(currentTask.id);
      setCurrentTask(updated);
      if (onTaskUpdated) onTaskUpdated(updated);
      if (dispatch) dispatch('task.status_changed', { task_id: updated.id, id: updated.id, status: updated.status, is_locked: updated.is_locked, project_id: updated.project_id });
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to confirm task.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteReassign = async (e) => {
    e.preventDefault();
    if (!reassignCandidate) return;
    setReassignLoading(true);
    setErrorMsg('');
    try {
      const updated = await reassignTask(currentTask.id, reassignCandidate, reassignReason.trim() || undefined);
      setCurrentTask(updated);
      if (onTaskUpdated) onTaskUpdated(updated);
      if (dispatch) dispatch('task.reassigned', { task_id: updated.id, id: updated.id, assigned_to: updated.assigned_to, project_id: updated.project_id });
      setShowReassignModal(false);
      setReassignReason('');
      const targetUser = eligibleMembers.find(m => String(m.id) === String(reassignCandidate));
      const targetName = targetUser ? `${targetUser.first_name} ${targetUser.last_name}` : 'new assignee';
      setReassignSuccessMsg(`Task successfully reassigned to ${targetName}!`);
      setTimeout(() => setReassignSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to reassign task.');
    } finally {
      setReassignLoading(false);
    }
  };

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
        fontSize: '11px',
        fontWeight: 700,
        padding: '3px 10px',
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

  const getUserFullName = (u) => {
    if (!u) return 'User';
    return u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
    try {
      setActionLoading(true);
      await deleteTask(currentTask.id);
      if (onTaskUpdated) onTaskUpdated();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to delete task.');
    } finally {
      setActionLoading(false);
    }
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
        zIndex: 9999,
        padding: '24px'
      }}
    >
      <div className="card modal-animate" style={{
        width: '100%',
        maxWidth: '1080px',
        height: '85vh',
        display: 'flex',
        padding: 0,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-float)',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--surface)'
      }}>
        {/* Left Side: Complete Task Details (60%) */}
        <div style={{
          flex: '1 1 58%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}>
          {/* Header Bar */}
          <div style={{
            padding: '20px 28px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--subtle-glass)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {getStatusBadge(currentTask.status)}
              {currentTask.scheduled_date && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--brand-50)',
                  color: 'var(--brand-700)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Calendar size={11} />
                  {formatScheduledDate(currentTask.scheduled_date)}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isAssigner && (
                <button
                  type="button"
                  onClick={handleDeleteTask}
                  disabled={actionLoading}
                  title="Delete Task (Only assigner can delete)"
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#EF4444',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                >
                  <Trash2 size={14} />
                  <span>Delete Task</span>
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

          {/* Body Details */}
          <div style={{ padding: '28px', flex: 1, display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {reassignSuccessMsg && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#059669',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600
              }}>
                ✓ {reassignSuccessMsg}
              </div>
            )}

            {errorMsg && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--status-blocked-bg)',
                color: 'var(--status-blocked)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px'
              }}>
                {errorMsg}
              </div>
            )}

            {/* Overdue Warning Banner */}
            {currentTask.deadline &&
              new Date(currentTask.deadline).getTime() < Date.now() &&
              currentTask.status !== 'completed' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 'var(--radius-md)',
                color: '#EF4444'
              }}>
                <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>
                    Deadline Exceeded!
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    This task was scheduled to complete on{' '}
                    <strong>{formatDeadlineWithTime(currentTask.deadline)}</strong> and is overdue. Immediate action required.
                  </div>
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {currentTask.title}
              </h2>
            </div>

            {/* Quick Metadata Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              padding: '14px 16px',
              background: 'var(--subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)'
            }}>
              <div>
                <span className="text-xs text-secondary font-semibold uppercase block mb-1">Assignee</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {currentTask.assignee?.avatar_url ? (
                    <img
                      src={currentTask.assignee.avatar_url}
                      alt=""
                      style={{ width: '24px', height: '24px', borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--brand-gradient)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700
                    }}>
                      {currentTask.assignee?.first_name?.[0]}{currentTask.assignee?.last_name?.[0]}
                    </div>
                  )}
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {getUserFullName(currentTask.assignee)}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-secondary font-semibold uppercase block mb-1">Assigned By</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {getUserFullName(currentTask.assigner)} ({currentTask.assigner?.role})
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-secondary font-semibold uppercase block mb-1">Deadline & Time</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)' }}>
                  <Clock size={14} color="var(--brand-600)" />
                  <span style={{ fontWeight: 600 }}>
                    {currentTask.deadline
                      ? formatDeadlineWithTime(currentTask.deadline)
                      : 'No deadline set'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-secondary font-semibold uppercase block mb-1">Priority</span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'capitalize',
                  color: currentTask.priority === 'urgent' ? 'var(--priority-urgent)' :
                         currentTask.priority === 'high' ? 'var(--priority-high)' : 'var(--text-primary)'
                }}>
                  {currentTask.priority}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold text-secondary uppercase mb-2">Description & Deliverables</h4>
              <div style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                fontSize: '14px',
                lineHeight: 1.6,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap'
              }}>
                {currentTask.description || 'No description provided.'}
              </div>
            </div>

            {/* Task Attachments */}
            {currentTask.attachments && currentTask.attachments.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-secondary uppercase mb-2" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Attachments</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--subtle)',
                    color: 'var(--text-secondary)'
                  }}>
                    {currentTask.attachments.length}
                  </span>
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '10px'
                }}>
                  {currentTask.attachments.map((att) => (
                    <AttachmentCard key={att.id || att.file_url} attachment={att} />
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div style={{
              marginTop: 'auto',
              paddingTop: '20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div>
                {currentTask.status === 'not_started' && (
                  <p className="text-xs text-secondary">
                    Click <strong>Start Task</strong> to transition status to in-progress and begin work.
                  </p>
                )}
                {currentTask.status === 'in_progress' && (
                  <p className="text-xs text-secondary">
                    Task is currently in progress. Complete deliverables before submitting for review.
                  </p>
                )}
                {currentTask.status === 'in_review' && (
                  <p className="text-xs text-secondary">
                    Deliverables submitted and currently pending review and confirmation.
                  </p>
                )}
                {currentTask.status === 'completed' && (
                  <p className="text-xs text-secondary" style={{ color: 'var(--status-completed)', fontWeight: 600 }}>
                    ✓ This task has been confirmed as completed.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {/* START ACTION: Only assignee can start task */}
                {currentTask.status === 'not_started' && isAssignee && (
                  <button
                    className="btn btn-primary"
                    onClick={handleStart}
                    disabled={actionLoading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 20px' }}
                  >
                    <Play size={16} fill="currentColor" />
                    <span>{actionLoading ? 'Starting...' : 'Start Task'}</span>
                  </button>
                )}

                {/* IN PROGRESS -> SUBMIT FOR REVIEW (Assignee only) */}
                {currentTask.status === 'in_progress' && isAssignee && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleComplete}
                    disabled={actionLoading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{actionLoading ? 'Submitting...' : 'Submit for Review'}</span>
                  </button>
                )}

                {/* ASSIGNER ACTIONS: Strictly only who assigned the task has Reassign and Complete Task */}
                {isAssigner && currentTask.status !== 'completed' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setErrorMsg('');
                        setReassignCandidate(String(currentTask.assigned_to) || '');
                        setShowReassignModal(true);
                      }}
                      disabled={actionLoading || reassignLoading}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        padding: '8px 14px',
                        background: 'var(--subtle)',
                        color: 'var(--brand-700)',
                        border: '1px solid rgba(99, 102, 241, 0.3)'
                      }}
                      title="Reassign this deliverable"
                    >
                      <UserCheck size={16} />
                      <span>Reassign</span>
                    </button>

                    <button
                      className="btn btn-primary"
                      onClick={handleConfirm}
                      disabled={actionLoading || reassignLoading}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        fontSize: '13px',
                        padding: '8px 18px',
                        background: 'var(--status-completed)',
                        borderColor: 'var(--status-completed)'
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>{actionLoading ? 'Completing...' : 'Complete Task'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Dedicated Task Chat (42%) */}
        <div style={{
          flex: '1 1 42%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <TaskChat task={currentTask} currentUser={currentUser} />
        </div>
      </div>

      {/* Reassign Deliverable Modal Dialog */}
      {showReassignModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowReassignModal(false); }}
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
            zIndex: 1100,
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
                onClick={() => setShowReassignModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-secondary mb-4" style={{ lineHeight: 1.5 }}>
              Transfer responsibility for <strong>"{currentTask.title}"</strong> to another squad member. The task status will return to Not Started for the new assignee.
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
                  {eligibleMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} ({m.role}{m.department ? ` · ${m.department}` : ''}){String(m.id) === String(currentTask.assigned_to) ? ' (Current Assignee)' : ''}
                    </option>
                  ))}
                </select>
                {eligibleMembers.length === 0 && (
                  <span className="text-xs text-tertiary mt-1 block">No alternate members found in squad.</span>
                )}
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
                  onClick={() => setShowReassignModal(false)}
                  className="btn btn-secondary"
                  disabled={reassignLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={reassignLoading || !reassignCandidate}
                >
                  {reassignLoading ? 'Reassigning...' : 'Confirm Reassign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetailsModal;
