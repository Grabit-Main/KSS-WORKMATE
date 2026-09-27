import React, { useState, useEffect } from 'react';
import { X, Flame, Clock, BellOff, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';

export default function StartFocusSetupModal({ isOpen, onClose, tasks = [], projects = [], user, onStartSession }) {
  const authorizedTasks = tasks.filter((t) => {
    if (t.isPersonal) return true;
    if (['CEO', 'CTO', 'PM', 'TL'].includes(user?.role)) return true;
    return String(t.assigned_to) === String(user?.id) || String(t.assigned_by) === String(user?.id);
  });

  const [selectedTaskId, setSelectedTaskId] = useState(authorizedTasks[0]?.id || '');
  const selectedTask = authorizedTasks.find((t) => String(t.id) === String(selectedTaskId)) || authorizedTasks[0];

  // Presets: 25, 45, 60, 90, custom
  const [durationPreset, setDurationPreset] = useState(25);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [silenceNotifications, setSilenceNotifications] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (authorizedTasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(authorizedTasks[0].id);
    }
  }, [authorizedTasks, selectedTaskId]);

  if (!isOpen) return null;

  const calculateTotalSeconds = () => {
    if (durationPreset === 'custom') {
      const h = parseInt(customHours, 10) || 0;
      const m = parseInt(customMinutes, 10) || 0;
      return (h * 3600) + (m * 60);
    }
    return parseInt(durationPreset, 10) * 60;
  };

  const handleStart = (e) => {
    e.preventDefault();
    if (!selectedTask) {
      setErrorMsg('Please select a valid task to start focus.');
      return;
    }

    const totalSecs = calculateTotalSeconds();
    if (totalSecs <= 0) {
      setErrorMsg('Please enter a duration greater than 0 minutes.');
      return;
    }

    const projName = selectedTask.project?.name || projects.find(p => String(p.id) === String(selectedTask.project_id))?.name || 'Personal Workspace';

    const sessionData = {
      id: `focus_${Date.now()}`,
      taskId: selectedTask.id,
      taskTitle: selectedTask.title,
      project: projName,
      priority: selectedTask.priority || 'Normal',
      status: selectedTask.status || 'in_progress',
      currentProgress: selectedTask.progress ?? (selectedTask.status === 'completed' ? 100 : 50),
      dueDate: selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString() : 'Today',
      plannedDurationSecs: totalSecs,
      remainingSecs: totalSecs,
      activeDurationSecs: 0,
      pausedDurationSecs: 0,
      startTime: new Date().toISOString(),
      active: true,
      paused: false,
      silenceNotifications
    };

    onStartSession(sessionData);
    onClose();
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
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Flame size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Start Focus Session
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                Select a task and duration for deep, uninterrupted work
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
              color: '#64748B'
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

        <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Select Task */}
          <div>
            <label style={labelStyle}>Select Task *</label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              required
              style={fieldStyle}
            >
              {authorizedTasks.length === 0 ? (
                <option value="" disabled style={{ color: '#0F172A', background: '#FFFFFF' }}>No active tasks available</option>
              ) : (
                authorizedTasks.map((t) => (
                  <option key={t.id} value={t.id} style={{ color: '#0F172A', background: '#FFFFFF' }}>
                    {t.title} ({t.status ? t.status.toUpperCase() : 'PENDING'})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Task Information Preview Card */}
          {selectedTask && (
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#6366F1', letterSpacing: '0.04em' }}>
                  {selectedTask.project?.name || projects.find(p => String(p.id) === String(selectedTask.project_id))?.name || 'Personal Task'}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: selectedTask.priority === 'urgent' ? '#FEE2E2' : '#EEF2FF',
                  color: selectedTask.priority === 'urgent' ? '#DC2626' : '#4F46E5'
                }}>
                  {selectedTask.priority ? selectedTask.priority.toUpperCase() : 'NORMAL'}
                </span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                {selectedTask.title}
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                <span>Due: {selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString() : 'Today'}</span>
                <span>Current Progress: <strong style={{ color: '#10B981' }}>{selectedTask.progress ?? 50}%</strong></span>
              </div>
            </div>
          )}

          {/* Focus Duration Presets */}
          <div>
            <label style={labelStyle}>Focus Duration *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '8px' }}>
              {[25, 45, 60, 90, 'custom'].map((preset) => {
                const isSelected = durationPreset === preset;
                const label = preset === 'custom' ? 'Custom' : `${preset}m`;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDurationPreset(preset)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #6366F1' : '1px solid #CBD5E1',
                      background: isSelected ? '#EEF2FF' : '#F8FAFC',
                      color: isSelected ? '#4F46E5' : '#334155',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Custom Hours & Minutes */}
            {durationPreset === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>Minutes</label>
                  <input
                    type="number"
                    min="1"
                    max="59"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Focus Mode (WorkOS Notification Toggle) */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BellOff size={18} color="#6366F1" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Silence Non-Critical Notifications</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Mute non-urgent WorkOS notification alerts during session</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSilenceNotifications(!silenceNotifications)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                background: silenceNotifications ? '#10B981' : '#CBD5E1',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {silenceNotifications ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '10px 20px', borderRadius: '10px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={authorizedTasks.length === 0}
              style={{ padding: '10px 24px', background: '#6366F1', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Flame size={16} /> Start Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
