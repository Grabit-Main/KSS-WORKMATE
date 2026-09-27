import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { updateTask } from '../../api/tasks';
import { reportBlocker } from '../../api/mywork';

const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export default function ReportBlockerModal({ isOpen, onClose, tasks = [], users = [], projects = [], user, onSuccess, onViewBlockers }) {
  const [selectedTaskId, setSelectedTaskId] = useState(tasks[0]?.id || '');
  const selectedTask = tasks.find((t) => String(t.id) === String(selectedTaskId)) || tasks[0];

  const [blockerType, setBlockerType] = useState('Technical');
  const [severity, setSeverity] = useState('High');
  const [description, setDescription] = useState('');
  const [blockingSince, setBlockingSince] = useState(new Date().toISOString().split('T')[0]);
  const [needHelpFrom, setNeedHelpFrom] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdBlocker, setCreatedBlocker] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Blocker Description is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const helperUser = users.find((u) => String(u.id) === String(needHelpFrom));
      const helperName = helperUser ? `${helperUser.first_name} ${helperUser.last_name}` : '';

      const newBlocker = {
        id: Date.now(),
        taskId: selectedTask?.id,
        taskTitle: selectedTask?.title || 'General Work Item',
        projectId: selectedTask?.project_id || selectedTask?.project?.id || null,
        project: selectedTask?.project?.name || 'Project',
        type: blockerType,
        severity: severity,
        description: description.trim(),
        blockingSince,
        helper: helperName,
        needHelpFrom,
        reportedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'active'
      };

      const validTaskId = isUUID(selectedTask?.id) ? selectedTask.id : null;
      await reportBlocker({
        task_id: validTaskId,
        description: `[${blockerType}] ${description.trim()}`,
        severity: severity.toLowerCase()
      });

      // Save to localStorage list for My Work persistent state
      const savedListKey = `mywork_blockers_${user?.id}`;
      const existing = (() => {
        try {
          const s = localStorage.getItem(savedListKey);
          return s ? JSON.parse(s) : [];
        } catch { return []; }
      })();
      const updated = [newBlocker, ...existing];
      localStorage.setItem(savedListKey, JSON.stringify(updated));

      // Update task status to blocked if task exists and not personal
      if (selectedTask && !selectedTask.isPersonal) {
        try {
          await updateTask(selectedTask.id, { status: 'blocked' });
        } catch (err) {
          console.warn('Task status update skipped or restricted by workflow:', err);
        }
      }

      setCreatedBlocker(newBlocker);
      if (onSuccess) onSuccess(newBlocker);
    } catch (err) {
      console.error('Error reporting blocker:', err);
      setErrorMsg('Failed to report blocker.');
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
      zIndex: 10000,
      padding: '20px'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '540px',
        maxHeight: '90vh',
        overflowY: 'auto',
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
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0F172A)' }}>
                Report Blocker
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary, #64748B)', margin: '2px 0 0 0' }}>
                Tell your team what is preventing your progress
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

        {createdBlocker ? (
          <div style={{ textAlign: 'center', padding: '24px 10px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#FEF2F2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
              Blocker Reported
            </h4>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px 0' }}>
              Your team & assigner have been notified regarding "{createdBlocker.taskTitle}".
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={onClose}
                className="btn btn-secondary"
                style={{ padding: '10px 18px', borderRadius: '10px' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (onViewBlockers) onViewBlockers();
                  onClose();
                }}
                className="btn btn-primary"
                style={{ padding: '10px 24px', background: '#EF4444', borderRadius: '10px' }}
              >
                View Blocker
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Related Task */}
            <div>
              <label style={labelStyle}>Related Task *</label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                required
                style={fieldStyle}
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id} style={optionStyle}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Project (Auto/Display) */}
            <div>
              <label style={labelStyle}>Project</label>
              <input
                type="text"
                readOnly
                value={selectedTask?.project?.name || 'General Project'}
                style={{
                  ...fieldStyle,
                  background: '#F1F5F9',
                  color: '#64748B'
                }}
              />
            </div>

            {/* Blocker Type & Severity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Blocker Type *</label>
                <select
                  value={blockerType}
                  onChange={(e) => setBlockerType(e.target.value)}
                  style={fieldStyle}
                >
                  <option value="Technical" style={optionStyle}>Technical</option>
                  <option value="Dependency" style={optionStyle}>Dependency</option>
                  <option value="Requirement" style={optionStyle}>Requirement</option>
                  <option value="Access" style={optionStyle}>Access</option>
                  <option value="Environment" style={optionStyle}>Environment</option>
                  <option value="Review" style={optionStyle}>Review</option>
                  <option value="Other" style={optionStyle}>Other</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Severity *</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  style={fieldStyle}
                >
                  <option value="Low" style={optionStyle}>Low</option>
                  <option value="Medium" style={optionStyle}>Medium</option>
                  <option value="High" style={optionStyle}>High</option>
                  <option value="Critical" style={optionStyle}>Critical</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Explain what is blocking your work..."
                required
                style={fieldStyle}
              />
            </div>

            {/* Blocking Since & Need Help From */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Blocking Since</label>
                <input
                  type="date"
                  value={blockingSince}
                  onChange={(e) => setBlockingSince(e.target.value)}
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Need Help From</label>
                <select
                  value={needHelpFrom}
                  onChange={(e) => setNeedHelpFrom(e.target.value)}
                  style={fieldStyle}
                >
                  <option value="" style={optionStyle}>Unassigned Helper</option>
                  {users
                    .filter((u) => u.id !== user?.id)
                    .map((u) => (
                      <option key={u.id} value={u.id} style={optionStyle}>
                        {u.first_name} {u.last_name} ({u.role})
                      </option>
                    ))}
                </select>
              </div>
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
                style={{ padding: '10px 24px', background: '#EF4444', borderRadius: '10px', fontWeight: 600 }}
              >
                {submitting ? 'Submitting...' : 'Report Blocker'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
