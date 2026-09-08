import React, { useState, useEffect } from 'react';
import { TaskChat } from '../chat/TaskChat';
import { startTask, completeTask, confirmTask } from '../../api/tasks';
import { AttachmentCard } from '../common/AttachmentCard';
import {
  X, Calendar, Clock, Play, CheckCircle2, User,
  Flag, AlertCircle, FolderKanban, Users, Shield, AlertTriangle
} from 'lucide-react';

const formatScheduledDate = (val) => {
  if (!val) return '';
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) return val;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-');
    return `${d}-${m}-${y}`;
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return val;
};

export const TaskDetailsModal = ({ task, currentUser, onClose, onTaskUpdated }) => {
  const [currentTask, setCurrentTask] = useState(task);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setCurrentTask(task);
  }, [task]);

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
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to confirm task.');
    } finally {
      setActionLoading(false);
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

          {/* Body Details */}
          <div style={{ padding: '28px', flex: 1, display: 'flex', flexDirection: 'column', gap: '22px' }}>
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
                    <strong>{new Date(currentTask.deadline).toLocaleString()}</strong> and is overdue. Immediate action required.
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
                <span className="text-xs text-secondary font-semibold uppercase block mb-1">Deadline</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)' }}>
                  <Calendar size={14} color="var(--brand-600)" />
                  <span>
                    {currentTask.deadline
                      ? new Date(currentTask.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
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
                {/* START ACTION: Member or Lead starts task */}
                {currentTask.status === 'not_started' && (isAssignee || isAssigner || canConfirm) && (
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

                {/* IN PROGRESS -> SUBMIT FOR REVIEW */}
                {currentTask.status === 'in_progress' && isAssignee && (
                  <button
                    className="btn btn-primary"
                    onClick={handleComplete}
                    disabled={actionLoading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{actionLoading ? 'Submitting...' : 'Submit for Review'}</span>
                  </button>
                )}

                {/* IN REVIEW -> CONFIRM TASK */}
                {currentTask.status === 'in_review' && (isAssigner || canConfirm) && (
                  <button
                    className="btn btn-primary"
                    onClick={handleConfirm}
                    disabled={actionLoading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'var(--status-completed)', borderColor: 'var(--status-completed)' }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{actionLoading ? 'Confirming...' : 'Confirm & Complete'}</span>
                  </button>
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
    </div>
  );
};

export default TaskDetailsModal;
