import React, { useState } from 'react';
import { X, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AskHelpModal({ isOpen, onClose, projects = [], tasks = [], users = [], user, onSuccess }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [taskId, setTaskId] = useState(tasks[0]?.id || '');
  const [needHelpFrom, setNeedHelpFrom] = useState('');
  const [helpType, setHelpType] = useState('Technical Guidance');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Normal');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedHelpRequest, setSubmittedHelpRequest] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!needHelpFrom) {
      setErrorMsg('Please select a person to ask help from.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Description is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const helperUser = users.find((u) => String(u.id) === String(needHelpFrom));
      const proj = projects.find((p) => String(p.id) === String(projectId));
      const tsk = tasks.find((t) => String(t.id) === String(taskId));

      const helpRequest = {
        id: `help_${Date.now()}`,
        requesterId: user?.id,
        requesterName: `${user?.first_name} ${user?.last_name}`,
        helperId: needHelpFrom,
        helperName: helperUser ? `${helperUser.first_name} ${helperUser.last_name}` : 'Team Member',
        projectId,
        projectName: proj?.name || 'General Project',
        taskId,
        taskTitle: tsk?.title || 'General Task',
        helpType,
        description: description.trim(),
        priority,
        status: 'Requested', // Lifecycle: Requested -> Viewed -> In Progress -> Answered -> Resolved
        createdAt: new Date().toISOString(),
        createdTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const storageKey = `mywork_help_requests_${user?.id}`;
      const existing = (() => {
        try {
          const s = localStorage.getItem(storageKey);
          return s ? JSON.parse(s) : [];
        } catch { return []; }
      })();
      const updated = [helpRequest, ...existing];
      localStorage.setItem(storageKey, JSON.stringify(updated));

      setSubmittedHelpRequest(helpRequest);
      if (onSuccess) onSuccess(helpRequest);
    } catch (err) {
      console.error('Error submitting help request:', err);
      setErrorMsg('Failed to submit help request.');
    } finally {
      setSubmitting(false);
    }
  };

  const helpTypes = [
    'Technical Guidance',
    'Requirement Clarification',
    'Code Review',
    'Design Feedback',
    'Project Context',
    'Access / Permission',
    'Process Question',
    'Other'
  ];

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
        maxHeight: '90vh',
        overflowY: 'auto',
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
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <HelpCircle size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary, #F8FAFC)' }}>
                Ask Help
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary, #94A3B8)', margin: 0 }}>
                Request guidance or assistance from a colleague or lead
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

        {submittedHelpRequest ? (
          <div style={{ textAlign: 'center', padding: '24px 10px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: '0 0 6px 0' }}>
              Help Request Submitted
            </h4>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #94A3B8)', margin: '0 0 24px 0' }}>
              Sent to {submittedHelpRequest.helperName} ({submittedHelpRequest.priority} Priority).
            </p>

            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{ padding: '10px 24px', background: '#8B5CF6' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Need Help From */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                Need Help From *
              </label>
              <select
                value={needHelpFrom}
                onChange={(e) => setNeedHelpFrom(e.target.value)}
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
                <option value="" disabled>Select Team Member or Lead...</option>
                {users
                  .filter((u) => u.id !== user?.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.role})
                    </option>
                  ))}
              </select>
            </div>

            {/* Help Type & Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                  Help Type *
                </label>
                <select
                  value={helpType}
                  onChange={(e) => setHelpType(e.target.value)}
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
                  {helpTypes.map((ht) => (
                    <option key={ht} value={ht}>
                      {ht}
                    </option>
                  ))}
                </select>
              </div>

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
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Related Project */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                Related Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
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
                <option value="">General / None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Related Task */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                Related Task
              </label>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
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
                <option value="">General / None</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Details of what guidance or assistance you need..."
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

            {/* Actions */}
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
                style={{ background: '#8B5CF6' }}
              >
                {submitting ? 'Submitting...' : 'Ask Help'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
