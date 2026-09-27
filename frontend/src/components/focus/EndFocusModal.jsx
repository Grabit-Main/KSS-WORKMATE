import React, { useState } from 'react';
import { X, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';
import { updateTask } from '../../api/tasks';
import { saveFocusSession } from '../../api/mywork';

export default function EndFocusModal({ isOpen, onClose, session, onContinueFocusing, onSaveAndEnd }) {
  if (!isOpen || !session) return null;

  const focusedMins = Math.max(1, Math.round(session.activeDurationSecs / 60));

  const [accomplishment, setAccomplishment] = useState('');
  const [remainingWork, setRemainingWork] = useState('');
  const [updateProgress, setUpdateProgress] = useState(false);
  const [newProgress, setNewProgress] = useState(session.currentProgress || 50);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      let updatedTaskObj = null;

      if (updateProgress && session.taskId && session.taskId !== 'general') {
        try {
          const finalStatus = Number(newProgress) === 100 ? 'completed' : session.status;
          updatedTaskObj = await updateTask(session.taskId, {
            status: finalStatus,
            progress: Number(newProgress)
          });
        } catch (err) {
          console.warn('Task progress update warning:', err);
        }
      }

const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

      await saveFocusSession({
        task_id: isUUID(session.taskId) ? session.taskId : null,
        duration_mins: session.durationMins || 25,
        active_duration_secs: session.activeDurationSecs || 0,
        status: 'completed'
      });

      onSaveAndEnd({
        accomplishment: accomplishment.trim(),
        remainingWork: remainingWork.trim(),
        updatedProgress: updateProgress ? Number(newProgress) : session.currentProgress,
        updatedTaskObj
      });
    } catch (err) {
      console.error('Error saving focus session:', err);
      setErrorMsg('Failed to save session summary.');
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
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '520px',
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
              background: '#ECFDF5',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                End Focus Session
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                Summarize your accomplishments and save focus session
              </p>
            </div>
          </div>
          <button
            onClick={onContinueFocusing}
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

        {/* Stats Preview Card */}
        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Focused Task</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>{session.taskTitle}</div>
            <div style={{ fontSize: '12px', color: '#6366F1' }}>{session.project}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Focused Time</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981' }}>{focusedMins} min</div>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* What did you accomplish? */}
          <div>
            <label style={labelStyle}>What did you accomplish?</label>
            <textarea
              value={accomplishment}
              onChange={(e) => setAccomplishment(e.target.value)}
              rows={2}
              placeholder="Summary of completed items during this session..."
              style={fieldStyle}
            />
          </div>

          {/* What remains? */}
          <div>
            <label style={labelStyle}>What remains?</label>
            <textarea
              value={remainingWork}
              onChange={(e) => setRemainingWork(e.target.value)}
              rows={2}
              placeholder="Outstanding items or next steps..."
              style={fieldStyle}
            />
          </div>

          {/* Update Task Progress (Optional) */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={updateProgress}
                  onChange={(e) => setUpdateProgress(e.target.checked)}
                  style={{ accentColor: '#10B981', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Update Task Progress
              </label>

              {updateProgress && (
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#10B981' }}>
                  {session.currentProgress}% → {newProgress}%
                </span>
              )}
            </div>

            {updateProgress && (
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={newProgress}
                onChange={(e) => setNewProgress(e.target.value)}
                style={{ width: '100%', accentColor: '#10B981', cursor: 'pointer', marginTop: '4px' }}
              />
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onContinueFocusing}
              className="btn btn-secondary"
              style={{ padding: '10px 20px', borderRadius: '10px' }}
            >
              Continue Focusing
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ padding: '10px 24px', background: '#10B981', borderRadius: '10px', fontWeight: 600 }}
            >
              {submitting ? 'Saving...' : 'End & Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
