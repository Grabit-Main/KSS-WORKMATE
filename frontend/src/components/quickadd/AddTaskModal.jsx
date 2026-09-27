import React, { useState } from 'react';
import { X, CheckSquare, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { createTask } from '../../api/tasks';

export default function AddTaskModal({ isOpen, onClose, user, projects = [], users = [], onSuccess, onOpenTask }) {
  const role = user?.role || 'TM';
  const isExecutive = ['CEO', 'CTO'].includes(role);
  const isPM = role === 'PM';
  const isTL = role === 'TL';
  const isDev = !isExecutive && !isPM && !isTL;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [priority, setPriority] = useState('normal'); // 'low', 'normal' (Medium), 'high', 'urgent'
  const [deadline, setDeadline] = useState('');
  const [assignedTo, setAssignedTo] = useState(user?.id || '');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdTask, setCreatedTask] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Task Title is required.');
      return;
    }
    if (!projectId) {
      setErrorMsg('Project selection is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        project_id: projectId,
        priority: priority,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        assigned_to: assignedTo || user?.id
      };

      const result = await createTask(payload);
      setCreatedTask(result);
      if (onSuccess) onSuccess(result);
    } catch (err) {
      console.error('Error creating task:', err);
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to create task. Check role permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
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
        borderRadius: 'var(--radius-xl, 16px)',
        background: 'var(--surface, #1E293B)',
        border: '1px solid var(--border, rgba(255,255,255,0.12))',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--brand-600, #6366F1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckSquare size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary, #F8FAFC)' }}>
                Add Task
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary, #94A3B8)', margin: 0 }}>
                Quickly create a task without leaving My Work
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary, #94A3B8)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* Success State */}
        {createdTask ? (
          <div style={{ textAlign: 'center', padding: '24px 10px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: '0 0 6px 0' }}>
              Task Created
            </h4>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #94A3B8)', margin: '0 0 24px 0' }}>
              "{createdTask.title}" has been added to My Work.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={onClose}
                className="btn btn-secondary"
                style={{ padding: '10px 20px' }}
              >
                Close
              </button>
              {onOpenTask && (
                <button
                  onClick={() => {
                    onOpenTask(createdTask);
                    onClose();
                  }}
                  className="btn btn-primary"
                  style={{ padding: '10px 20px', background: 'var(--brand-600, #6366F1)' }}
                >
                  Open Task
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Task Title */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                Task Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title..."
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--border, rgba(255,255,255,0.12))',
                  background: 'var(--surface-dark, #0F172A)',
                  color: 'var(--text-primary, #F8FAFC)',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Task description & deliverables..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--border, rgba(255,255,255,0.12))',
                  background: 'var(--surface-dark, #0F172A)',
                  color: 'var(--text-primary, #F8FAFC)',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Project Dropdown */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                Project *
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--border, rgba(255,255,255,0.12))',
                  background: 'var(--surface-dark, #0F172A)',
                  color: 'var(--text-primary, #F8FAFC)',
                  fontSize: '14px'
                }}
              >
                <option value="" disabled>Select Project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority & Due Date Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--border, rgba(255,255,255,0.12))',
                    background: 'var(--surface-dark, #0F172A)',
                    color: 'var(--text-primary, #F8FAFC)',
                    fontSize: '14px'
                  }}
                >
                  <option value="low">Low</option>
                  <option value="normal">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                  Due Date
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--border, rgba(255,255,255,0.12))',
                    background: 'var(--surface-dark, #0F172A)',
                    color: 'var(--text-primary, #F8FAFC)',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Assigned To */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                Assigned To
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={isDev}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--border, rgba(255,255,255,0.12))',
                  background: 'var(--surface-dark, #0F172A)',
                  color: 'var(--text-primary, #F8FAFC)',
                  fontSize: '14px',
                  opacity: isDev ? 0.7 : 1
                }}
              >
                {isDev ? (
                  <option value={user?.id}>
                    {user?.first_name} {user?.last_name} (Self)
                  </option>
                ) : (
                  users
                    .filter((u) => !['CEO', 'CTO'].includes(u.role))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.role})
                      </option>
                    ))
                )}
              </select>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ background: 'var(--brand-600, #6366F1)' }}
              >
                {submitting ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
