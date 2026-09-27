import React, { useState } from 'react';
import { Flame, Pause, Play, StopCircle, Minimize2, Maximize2, ShieldCheck } from 'lucide-react';

export default function ActiveFocusOverlay({ session, onPauseResume, onEndFocus }) {
  const [minimized, setMinimized] = useState(false);

  if (!session || !session.active) return null;

  const formatSeconds = (secs) => {
    const total = Math.max(0, secs);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = session.plannedDurationSecs > 0 
    ? Math.min(100, Math.round(((session.plannedDurationSecs - session.remainingSecs) / session.plannedDurationSecs) * 100))
    : 0;

  if (minimized) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: '#0F172A',
        color: '#FFFFFF',
        borderRadius: '16px',
        padding: '12px 18px',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(99, 102, 241, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        zIndex: 9999,
        cursor: 'pointer'
      }}
      onClick={() => setMinimized(false)}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: session.paused ? '#F59E0B' : '#10B981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF'
        }}>
          <Flame size={18} />
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
            {session.paused ? 'FOCUS PAUSED' : 'FOCUSING'}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC' }}>
            {formatSeconds(session.remainingSecs)}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setMinimized(false); }}
          style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
        >
          <Maximize2 size={16} />
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '36px 32px',
        borderRadius: '24px',
        background: '#0F172A',
        color: '#FFFFFF',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(99, 102, 241, 0.3)',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Minimize Button */}
        <button
          onClick={() => setMinimized(true)}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94A3B8',
            cursor: 'pointer'
          }}
          title="Minimize overlay"
        >
          <Minimize2 size={16} />
        </button>

        {/* Flame Badge */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: session.paused ? 'rgba(245, 158, 11, 0.2)' : 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
          color: session.paused ? '#F59E0B' : '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.5)'
        }}>
          <Flame size={32} />
        </div>

        {/* Session Status Tag */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 14px',
          borderRadius: '20px',
          background: session.paused ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          color: session.paused ? '#F59E0B' : '#10B981',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          marginBottom: '12px'
        }}>
          {session.paused ? 'FOCUS SESSION PAUSED' : 'ACTIVE FOCUS SESSION'}
        </div>

        {/* Task Title & Project */}
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC', margin: '0 0 4px 0', lineHeight: 1.3 }}>
          {session.taskTitle}
        </h2>
        <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 24px 0' }}>
          {session.project} • Task Progress: <strong style={{ color: '#10B981' }}>{session.currentProgress}%</strong>
        </p>

        {/* Big Timer Display */}
        <div style={{
          fontSize: '56px',
          fontWeight: 800,
          color: session.paused ? '#F59E0B' : '#6366F1',
          letterSpacing: '0.04em',
          margin: '0 0 16px 0',
          fontVariantNumeric: 'tabular-nums'
        }}>
          {formatSeconds(session.remainingSecs)}
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', marginBottom: '28px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: session.paused ? '#F59E0B' : 'linear-gradient(90deg, #6366F1 0%, #10B981 100%)',
            transition: 'width 1s linear'
          }} />
        </div>

        {/* Notification Mute Banner */}
        {session.silenceNotifications && (
          <div style={{
            fontSize: '12px',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginBottom: '24px'
          }}>
            <ShieldCheck size={14} color="#10B981" /> WorkOS Notifications Silenced
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
          <button
            onClick={onPauseResume}
            className="btn btn-secondary"
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '14px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#F8FAFC',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            {session.paused ? <Play size={18} /> : <Pause size={18} />}
            {session.paused ? 'Resume' : 'Pause'}
          </button>

          <button
            onClick={onEndFocus}
            className="btn btn-primary"
            style={{
              padding: '12px 28px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '14px',
              background: '#EF4444'
            }}
          >
            <StopCircle size={18} /> End Focus
          </button>
        </div>
      </div>
    </div>
  );
}
