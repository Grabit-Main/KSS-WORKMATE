import React, { useState } from 'react';
import { X, FileText, CheckCircle2, AlertCircle, Smile, Meh, Frown, AlertOctagon } from 'lucide-react';
import { submitDailyPulse } from '../../api/mywork';

export default function DailyPulseModal({ isOpen, onClose, user, users = [], onSuccess }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const storageKey = `daily_pulse_${user?.id}_${todayStr}`;

  // Check existing submission for today
  const existingPulse = (() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  })();

  const [overallStatus, setOverallStatus] = useState(existingPulse?.overallStatus || 'going_well');
  const [completedToday, setCompletedToday] = useState(existingPulse?.completedToday || '');
  const [currentlyWorking, setCurrentlyWorking] = useState(existingPulse?.currentlyWorking || '');
  const [blockerConcern, setBlockerConcern] = useState(existingPulse?.blockerConcern || '');
  const [nextFocus, setNextFocus] = useState(existingPulse?.nextFocus || '');
  const [needHelpFrom, setNeedHelpFrom] = useState(existingPulse?.needHelpFrom || '');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedPulse, setSubmittedPulse] = useState(existingPulse || null);

  if (!isOpen) return null;

  const isBlockerRequired = ['need_help', 'blocked'].includes(overallStatus);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBlockerRequired && !blockerConcern.trim()) {
      setErrorMsg('Blocker / Concern is required when status is Need Help or Blocked.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const summaryText = [
        currentlyWorking && `Working on: ${currentlyWorking.trim()}`,
        completedToday && `Completed: ${completedToday.trim()}`,
        nextFocus && `Next focus: ${nextFocus.trim()}`
      ].filter(Boolean).join('\n');

      const pulseData = {
        userId: user?.id,
        userName: `${user?.first_name} ${user?.last_name}`,
        date: todayStr,
        submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        overallStatus,
        completedToday: completedToday.trim(),
        currentlyWorking: currentlyWorking.trim(),
        blockerConcern: blockerConcern.trim(),
        nextFocus: nextFocus.trim(),
        needHelpFrom
      };

      await submitDailyPulse({
        mood: overallStatus,
        summary: summaryText || 'Submitted daily pulse',
        blockers: blockerConcern.trim() || null
      });

      localStorage.setItem(storageKey, JSON.stringify(pulseData));
      setSubmittedPulse(pulseData);

      if (onSuccess) onSuccess(pulseData);
    } catch (err) {
      console.error('Error submitting daily pulse:', err);
      setErrorMsg('Failed to submit daily pulse.');
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

  const statusOptions = [
    { id: 'going_well', label: 'Going Well', icon: Smile, color: '#10B981', bg: '#ECFDF5' },
    { id: 'normal', label: 'Normal', icon: Meh, color: '#3B82F6', bg: '#EFF6FF' },
    { id: 'need_help', label: 'Need Help', icon: Frown, color: '#F59E0B', bg: '#FEF3C7' },
    { id: 'blocked', label: 'Blocked', icon: AlertOctagon, color: '#EF4444', bg: '#FEF2F2' }
  ];

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
        maxWidth: '560px',
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
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0F172A)' }}>
                Daily Pulse
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary, #64748B)', margin: '2px 0 0 0' }}>
                Share today's overall work status & priorities
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

        {submittedPulse ? (
          <div style={{ textAlign: 'center', padding: '24px 10px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
              Today's Pulse
            </h4>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#D97706',
              marginBottom: '20px'
            }}>
              ✓ Submitted at {submittedPulse.submittedAt}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={() => setSubmittedPulse(null)}
                className="btn btn-secondary"
                style={{ padding: '10px 18px', borderRadius: '10px' }}
              >
                Edit Pulse
              </button>
              <button
                onClick={onClose}
                className="btn btn-primary"
                style={{ padding: '10px 24px', background: '#F59E0B', borderRadius: '10px' }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Overall Status Selection */}
            <div>
              <label style={labelStyle}>Overall Status *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {statusOptions.map((opt) => {
                  const Icon = opt.icon;
                  const selected = overallStatus === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setOverallStatus(opt.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: selected ? `2px solid ${opt.color}` : '1px solid #CBD5E1',
                        background: selected ? opt.bg : '#F8FAFC',
                        color: selected ? opt.color : '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon size={18} color={opt.color} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Completed Today */}
            <div>
              <label style={labelStyle}>Completed Today</label>
              <textarea
                value={completedToday}
                onChange={(e) => setCompletedToday(e.target.value)}
                rows={2}
                placeholder="What did you accomplish today?"
                style={fieldStyle}
              />
            </div>

            {/* Currently Working On */}
            <div>
              <label style={labelStyle}>Currently Working On</label>
              <textarea
                value={currentlyWorking}
                onChange={(e) => setCurrentlyWorking(e.target.value)}
                rows={2}
                placeholder="Active focus tasks..."
                style={fieldStyle}
              />
            </div>

            {/* Blocker / Concern */}
            <div>
              <label style={{ ...labelStyle, color: isBlockerRequired ? '#DC2626' : 'var(--text-secondary, #334155)' }}>
                Blocker / Concern {isBlockerRequired && '*'}
              </label>
              <textarea
                value={blockerConcern}
                onChange={(e) => setBlockerConcern(e.target.value)}
                rows={2}
                placeholder="Describe any issues or blockers..."
                required={isBlockerRequired}
                style={{
                  ...fieldStyle,
                  borderColor: isBlockerRequired ? '#FCA5A5' : '#CBD5E1'
                }}
              />
            </div>

            {/* Next Focus */}
            <div>
              <label style={labelStyle}>Next Focus</label>
              <textarea
                value={nextFocus}
                onChange={(e) => setNextFocus(e.target.value)}
                rows={2}
                placeholder="What will you focus on next?"
                style={fieldStyle}
              />
            </div>

            {/* Need Help From */}
            <div>
              <label style={labelStyle}>Need Help From</label>
              <select
                value={needHelpFrom}
                onChange={(e) => setNeedHelpFrom(e.target.value)}
                style={fieldStyle}
              >
                <option value="" style={optionStyle}>None / Unspecified</option>
                {users
                  .filter((u) => u.id !== user?.id)
                  .map((u) => (
                    <option key={u.id} value={u.id} style={optionStyle}>
                      {u.first_name} {u.last_name} ({u.role})
                    </option>
                  ))}
              </select>
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
                style={{ padding: '10px 24px', background: '#F59E0B', borderRadius: '10px', fontWeight: 600 }}
              >
                {submitting ? 'Submitting...' : 'Submit Daily Pulse'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
