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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const handleSave = async (e) => {
    e.preventDefault();
    if (submitting || saveSuccess) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      let updatedTaskObj = null;

      // 1. Update task progress if requested
      if (updateProgress) {
        const parsedProgress = Number(newProgress);
        if (isNaN(parsedProgress) || parsedProgress < 0 || parsedProgress > 100) {
          setErrorMsg('Please enter a valid progress percentage between 0 and 100.');
          setSubmitting(false);
          return;
        }

        if (session.taskId && session.taskId !== 'general') {
          const finalStatus = parsedProgress === 100 ? 'completed' : (session.status === 'completed' ? 'in_progress' : session.status);
          updatedTaskObj = await updateTask(session.taskId, {
            status: finalStatus,
            progress: parsedProgress
          });
        }
      }

      // 2. Calculate accurate duration and timestamps
      const durationMins = Math.max(1, Math.round((session.activeDurationSecs || session.plannedDurationSecs || 1500) / 60));
      const startTimeIso = session.startTime || new Date(Date.now() - (session.activeDurationSecs || 0) * 1000).toISOString();
      const endTimeIso = new Date().toISOString();

      // 3. Persist focus session summary to backend
      const payload = {
        session_id: session.id || undefined,
        task_id: isUUID(session.taskId) ? session.taskId : null,
        duration_mins: durationMins,
        active_duration_secs: session.activeDurationSecs || 0,
        status: session.remainingSecs <= 0 ? 'completed' : 'stopped',
        accomplishment: accomplishment.trim() || null,
        accomplishment_summary: accomplishment.trim() || null,
        remaining_work: remainingWork.trim() || null,
        started_at: startTimeIso,
        ended_at: endTimeIso
      };

      const savedSession = await saveFocusSession(payload);

      // 4. Confirm success and notify parent
      setSaveSuccess(true);
      setTimeout(() => {
        onSaveAndEnd({
          savedSession,
          accomplishment: accomplishment.trim(),
          remainingWork: remainingWork.trim(),
          updatedProgress: updateProgress ? Number(newProgress) : session.currentProgress,
          updatedTaskObj
        });
      }, 600);
    } catch (err) {
      console.error('Error saving focus session:', err);
      let message = 'Failed to save session summary. Please try again.';
      if (err.response) {
        const status = err.response.status;
        const detail = err.response.data?.detail || err.response.data?.message;
        if (status === 400) {
          message = typeof detail === 'string' ? detail : 'Invalid session data provided. Please check your inputs.';
        } else if (status === 401) {
          message = 'Authentication expired. Please log in again.';
        } else if (status === 403) {
          message = 'You do not have permission to save this focus session.';
        } else if (status === 404) {
          message = 'Selected task or resource not found.';
        } else if (status === 409) {
          message = 'This focus session has already been saved.';
        } else if (status >= 500) {
          message = 'Server encountered an issue saving your summary. Please try again.';
        } else if (typeof detail === 'string') {
          message = detail;
        }
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        message = 'Connection timed out. Please check your internet connection and retry.';
      } else if (err.message && !err.response) {
        message = err.message.includes('valid progress') ? err.message : 'Network error. Please check your connection and retry.';
      }
      setErrorMsg(message);
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
            <CheckCircle2 size={16} /> Focus session summary saved successfully!
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
              disabled={submitting || saveSuccess}
              style={{ padding: '10px 20px', borderRadius: '10px' }}
            >
              Continue Focusing
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || saveSuccess}
              style={{ padding: '10px 24px', background: '#10B981', borderRadius: '10px', fontWeight: 600, opacity: (submitting || saveSuccess) ? 0.8 : 1 }}
            >
              {saveSuccess ? 'Saved!' : submitting ? 'Saving...' : 'End & Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
