import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, AlertCircle, Smile, Meh, Frown, AlertOctagon } from 'lucide-react';

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

  const statusOptions = [
    { id: 'going_well', label: 'Going Well', icon: Smile, color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
    { id: 'normal', label: 'Normal', icon: Meh, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
    { id: 'need_help', label: 'Need Help', icon: Frown, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
    { id: 'blocked', label: 'Blocked', icon: AlertOctagon, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' }
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
        maxWidth: '560px',
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
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary, #F8FAFC)' }}>
                Daily Pulse
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary, #94A3B8)', margin: 0 }}>
                Share today's overall work status & priorities
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

        {submittedPulse ? (
          <div style={{ textAlign: 'center', padding: '24px 10px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: '0 0 6px 0' }}>
              Today's Pulse
            </h4>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#10B981',
              marginBottom: '20px'
            }}>
              ✓ Submitted at {submittedPulse.submittedAt}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={() => setSubmittedPulse(null)}
                className="btn btn-secondary"
                style={{ padding: '10px 18px' }}
              >
                Edit Pulse
              </button>
              <button
                onClick={onClose}
                className="btn btn-primary"
                style={{ padding: '10px 24px', background: '#F59E0B' }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Overall Status Selection */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '8px' }}>
                Overall Status *
              </label>
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
                        borderRadius: 'var(--radius-lg, 10px)',
                        border: selected ? `2px solid ${opt.color}` : '1px solid var(--border, rgba(255,255,255,0.12))',
                        background: selected ? opt.bg : 'var(--surface-dark, #0F172A)',
                        color: selected ? opt.color : 'var(--text-primary, #F8FAFC)',
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
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                Completed Today
              </label>
              <textarea
                value={completedToday}
                onChange={(e) => setCompletedToday(e.target.value)}
                rows={2}
                placeholder="What did you accomplish today?"
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

            {/* Currently Working On */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                Currently Working On
              </label>
              <textarea
                value={currentlyWorking}
                onChange={(e) => setCurrentlyWorking(e.target.value)}
                rows={2}
                placeholder="Active focus tasks..."
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

            {/* Blocker / Concern */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: isBlockerRequired ? '#EF4444' : 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                Blocker / Concern {isBlockerRequired && '*'}
              </label>
              <textarea
                value={blockerConcern}
                onChange={(e) => setBlockerConcern(e.target.value)}
                rows={2}
                placeholder="Describe any issues or blockers..."
                required={isBlockerRequired}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: isBlockerRequired ? '1px solid #EF4444' : '1px solid var(--border, rgba(255,255,255,0.12))',
                  background: 'var(--surface-dark, #0F172A)',
                  color: 'var(--text-primary, #F8FAFC)',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Next Focus */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                Next Focus
              </label>
              <textarea
                value={nextFocus}
                onChange={(e) => setNextFocus(e.target.value)}
                rows={2}
                placeholder="What will you focus on next?"
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

            {/* Need Help From */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '6px' }}>
                Need Help From
              </label>
              <select
                value={needHelpFrom}
                onChange={(e) => setNeedHelpFrom(e.target.value)}
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
                <option value="">None / Unspecified</option>
                {users
                  .filter((u) => u.id !== user?.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
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
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ background: '#F59E0B' }}
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
