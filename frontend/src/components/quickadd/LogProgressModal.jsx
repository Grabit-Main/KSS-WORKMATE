import React, { useState, useEffect } from 'react';
import { X, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { updateTask } from '../../api/tasks';

export default function LogProgressModal({ isOpen, onClose, tasks = [], user, onSuccess }) {
  const authorizedTasks = tasks.filter((t) => {
    if (t.isPersonal) return true;
    if (user?.role in ['CEO', 'CTO', 'PM', 'TL']) return true;
    return String(t.assigned_to) === String(user?.id) || String(t.assigned_by) === String(user?.id);
  });

  const [selectedTaskId, setSelectedTaskId] = useState(authorizedTasks[0]?.id || '');
  const targetTask = authorizedTasks.find((t) => String(t.id) === String(selectedTaskId)) || authorizedTasks[0];

  const initialProgress = targetTask?.progress ?? (targetTask?.status === 'completed' ? 100 : targetTask?.status === 'in_progress' ? 50 : 0);

  const [currentProgress, setCurrentProgress] = useState(initialProgress);
  const [newProgress, setNewProgress] = useState(initialProgress);
  const [status, setStatus] = useState(targetTask?.status || 'in_progress');
  const [completedNotes, setCompletedNotes] = useState('');
  const [remainingNotes, setRemainingNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [updatedSuccess, setUpdatedSuccess] = useState(null);

  useEffect(() => {
    if (targetTask) {
      const p = targetTask.progress ?? (targetTask.status === 'completed' ? 100 : targetTask.status === 'in_progress' ? 50 : 0);
      setCurrentProgress(p);
      setNewProgress(p);
      setStatus(targetTask.status || 'in_progress');
    }
  }, [selectedTaskId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetTask) {
      setErrorMsg('Please select a valid task.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const updatedStatus = Number(newProgress) === 100 ? 'completed' : status;

      if (!targetTask.isPersonal) {
        await updateTask(targetTask.id, {
          status: updatedStatus,
          progress: Number(newProgress)
        });
      }

      setUpdatedSuccess({
        oldProgress: currentProgress,
        newProgress: Number(newProgress),
        taskTitle: targetTask.title
      });

      if (onSuccess) onSuccess({ ...targetTask, status: updatedStatus, progress: Number(newProgress) });
    } catch (err) {
      console.error('Error logging progress:', err);
      setErrorMsg('Failed to update task progress. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border-input, #CBD5E1)',
    background: 'var(--bg-input, #F8FAFC)',
    color: 'var(--text-primary, #0F172A)',
    fontSize: '14px',
    fontWeight: 500,
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary, #334155)',
    display: 'block',
    marginBottom: '6px'
  };

  const optionStyle = {
    color: '#0F172A',
    background: '#FFFFFF'
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 300,
      padding: '20px'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '540px',
        padding: '28px',
        borderRadius: '16px',
        background: 'var(--surface, #FFFFFF)',
        border: '1px solid var(--border, #E2E8F0)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0F172A)' }}>
                Log Progress
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary, #64748B)', margin: '2px 0 0 0' }}>
                Update task completion percentage & notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-tertiary, #64748B)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {updatedSuccess ? (
          <div style={{ textAlign: 'center', padding: '24px 10px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#ECFDF5',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
              Progress Updated
            </h4>
            <div style={{
              display: 'inline-block',
              background: '#ECFDF5',
              color: '#10B981',
              fontWeight: 800,
              fontSize: '18px',
              padding: '6px 18px',
              borderRadius: '20px',
              margin: '8px 0 16px 0'
            }}>
              {updatedSuccess.oldProgress}% → {updatedSuccess.newProgress}%
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px 0' }}>
              Task "{updatedSuccess.taskTitle}" has been updated successfully.
            </p>

            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{ padding: '10px 24px', background: '#10B981', borderRadius: '10px' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Task Dropdown */}
            <div>
              <label style={labelStyle}>Select Task *</label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                required
                style={fieldStyle}
              >
                {authorizedTasks.map((t) => (
                  <option key={t.id} value={t.id} style={optionStyle}>
                    {t.title} ({t.status ? t.status.toUpperCase() : 'PENDING'})
                  </option>
                ))}
              </select>
            </div>

            {/* Progress Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={labelStyle}>New Progress *</label>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#10B981' }}>
                  {newProgress}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={newProgress}
                onChange={(e) => setNewProgress(e.target.value)}
                style={{ width: '100%', accentColor: '#10B981', cursor: 'pointer' }}
              />
            </div>

            {/* Status Select */}
            <div>
              <label style={labelStyle}>Task Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={fieldStyle}
              >
                <option value="not_started" style={optionStyle}>Not Started</option>
                <option value="in_progress" style={optionStyle}>In Progress</option>
                <option value="in_review" style={optionStyle}>In Review</option>
                <option value="completed" style={optionStyle}>Completed</option>
                <option value="blocked" style={optionStyle}>Blocked</option>
              </select>
            </div>

            {/* What did you complete */}
            <div>
              <label style={labelStyle}>What did you complete?</label>
              <textarea
                value={completedNotes}
                onChange={(e) => setCompletedNotes(e.target.value)}
                rows={2}
                placeholder="Key deliverables finished..."
                style={fieldStyle}
              />
            </div>

            {/* Any remaining work */}
            <div>
              <label style={labelStyle}>Any remaining work?</label>
              <textarea
                value={remainingNotes}
                onChange={(e) => setRemainingNotes(e.target.value)}
                rows={2}
                placeholder="Outstanding sub-tasks or dependency..."
                style={fieldStyle}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={submitting}
                style={{ padding: '10px 20px', borderRadius: '10px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ padding: '10px 24px', background: '#10B981', borderRadius: '10px', fontWeight: 600 }}
              >
                {submitting ? 'Saving...' : 'Save Progress'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
