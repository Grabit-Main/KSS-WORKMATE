import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { updateTask } from '../../api/tasks';
import { reportBlocker } from '../../api/mywork';

const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export default function ReportBlockerModal({
  isOpen,
  onClose,
  initialTask = null,
  tasks = [],
  users = [],
  projects = [],
  user,
  onSuccess,
  onViewBlockers
}) {
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [blockerType, setBlockerType] = useState('Technical');
  const [severity, setSeverity] = useState('High');
  const [description, setDescription] = useState('');
  const [blockingSince, setBlockingSince] = useState(() => new Date().toISOString().split('T')[0]);
  const [needHelpFrom, setNeedHelpFrom] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Merge initialTask into available tasks if not already present
  const availableTasks = useMemo(() => {
    if (initialTask && !tasks.some((t) => String(t.id) === String(initialTask.id))) {
      return [initialTask, ...tasks];
    }
    return tasks.length > 0 ? tasks : (initialTask ? [initialTask] : []);
  }, [tasks, initialTask]);

  // Sync state when modal opens or initialTask changes
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSaveSuccess(false);
      setDescription('');
      setBlockerType('Technical');
      setSeverity('High');
      setBlockingSince(new Date().toISOString().split('T')[0]);
      setNeedHelpFrom('');

      if (initialTask?.id) {
        setSelectedTaskId(String(initialTask.id));
      } else if (availableTasks.length > 0) {
        setSelectedTaskId(String(availableTasks[0].id));
      }
    }
  }, [isOpen, initialTask, availableTasks]);

  if (!isOpen) return null;

  const selectedTask = availableTasks.find((t) => String(t.id) === String(selectedTaskId)) || initialTask || availableTasks[0];

  const projectName = (() => {
    if (!selectedTask) return 'General Project';
    if (selectedTask.project?.name) return selectedTask.project.name;
    const matchProj = projects.find((p) => String(p.id) === String(selectedTask.project_id || selectedTask.projectId));
    return matchProj?.name || 'General Project';
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || saveSuccess) return;

    if (!description.trim()) {
      setErrorMsg('Blocker Description is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const helperUser = users.find((u) => String(u.id) === String(needHelpFrom));
      const helperName = helperUser ? `${helperUser.first_name} ${helperUser.last_name}`.trim() : '';

      const validTaskId = isUUID(selectedTask?.id) ? selectedTask.id : null;
      await reportBlocker({
        task_id: validTaskId,
        description: `[${blockerType}] ${description.trim()}`,
        severity: (severity || 'high').toLowerCase()
      });

      const newBlocker = {
        id: Date.now(),
        taskId: selectedTask?.id,
        taskTitle: selectedTask?.title || 'General Work Item',
        projectId: selectedTask?.project_id || selectedTask?.project?.id || null,
        project: projectName,
        type: blockerType,
        severity: severity,
        description: description.trim(),
        blockingSince,
        helper: helperName,
        needHelpFrom,
        reportedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'active'
      };

      // Save to localStorage list for My Work persistent state
      const savedListKey = `mywork_blockers_${user?.id}`;
      const existing = (() => {
        try {
          const s = localStorage.getItem(savedListKey);
          return s ? JSON.parse(s) : [];
        } catch {
          return [];
        }
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

      setSaveSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess(newBlocker);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error reporting blocker:', err);
      const detail = err.response?.data?.detail || err.response?.data?.message;
      setErrorMsg(detail || 'Failed to report blocker. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #CBD5E1',
    background: '#F8FAFC',
    color: '#0F172A',
    fontSize: '14px',
    fontWeight: 500,
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
    display: 'block',
    marginBottom: '6px'
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '520px',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '28px',
        borderRadius: '16px',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#FEE2E2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Report Blocker
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                Tell your team what is preventing your progress
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Alerts */}
        {saveSuccess && (
          <div style={{
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} /> Blocker reported successfully!
          </div>
        )}

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
              {availableTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Project (Read-Only) */}
          <div>
            <label style={labelStyle}>Project</label>
            <input
              type="text"
              readOnly
              value={projectName}
              style={{
                ...fieldStyle,
                background: '#F1F5F9',
                color: '#475569',
                cursor: 'default'
              }}
            />
          </div>

          {/* Blocker Type & Severity (Two Columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Blocker Type *</label>
              <select
                value={blockerType}
                onChange={(e) => setBlockerType(e.target.value)}
                style={fieldStyle}
              >
                <option value="Technical">Technical</option>
                <option value="Dependency">Dependency</option>
                <option value="Requirement">Requirement</option>
                <option value="Access">Access</option>
                <option value="Environment">Environment</option>
                <option value="Review">Review</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Severity *</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={fieldStyle}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
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
              style={{
                ...fieldStyle,
                resize: 'vertical',
                minHeight: '80px'
              }}
            />
          </div>

          {/* Blocking Since & Need Help From (Two Columns) */}
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
                <option value="">Unassigned Helper</option>
                {users
                  .filter((u) => u.id !== user?.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.role})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || saveSuccess}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: '#0F172A',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || saveSuccess}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                background: '#EF4444',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: (submitting || saveSuccess) ? 'not-allowed' : 'pointer',
                opacity: (submitting || saveSuccess) ? 0.8 : 1,
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)'
              }}
            >
              {saveSuccess ? 'Reported!' : submitting ? 'Reporting...' : 'Report Blocker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
