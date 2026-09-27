import React from 'react';
import { Flame, Clock, CheckCircle2, Play, Activity } from 'lucide-react';

export default function FocusSummaryCard({ focusHistory = [], activeSession = null, onStartFocus, role }) {
  const isExecutive = ['CEO', 'CTO'].includes(role);
  const isPM = role === 'PM';
  const isTL = role === 'TL';

  const todayStr = new Date().toISOString().split('T')[0];

  const todaySessions = focusHistory.filter((s) => s.date === todayStr || (s.startTime && s.startTime.startsWith(todayStr)));
  const completedSessions = todaySessions.filter((s) => s.status === 'Completed' || s.status === 'Ended Early');

  const totalFocusedSecs = todaySessions.reduce((acc, s) => acc + (s.activeDurationSecs || 0), 0);
  const totalFocusedMins = Math.round(totalFocusedSecs / 60);

  const formatHoursMins = (mins) => {
    if (mins < 60) return `${mins} mins`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="card" style={{
      padding: '24px',
      marginBottom: '28px',
      borderLeft: '4px solid #6366F1',
      background: 'var(--surface, #FFFFFF)',
      borderRadius: 'var(--radius-xl, 16px)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.12)',
            color: '#6366F1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Flame size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0F172A)' }}>
              Today's Focus
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary, #64748B)', margin: 0 }}>
              {isExecutive ? "Company-wide focus productivity & deep work overview" :
               isPM ? "Project team focus sessions & deep work summary" :
               isTL ? "Team squad focus activity & personal productivity" :
               "Your personal focus time and deep work accomplishments today"}
            </p>
          </div>
        </div>

        {!activeSession && onStartFocus && (
          <button
            onClick={onStartFocus}
            className="btn btn-primary"
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              background: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Play size={15} /> Start Focus
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={14} color="#6366F1" /> Total Sessions
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>
            {todaySessions.length} {todaySessions.length === 1 ? 'Session' : 'Sessions'}
          </div>
        </div>

        <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="#10B981" /> Focused Time
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981' }}>
            {formatHoursMins(totalFocusedMins)}
          </div>
        </div>

        <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} color="#3B82F6" /> Completed Sessions
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#3B82F6' }}>
            {completedSessions.length} Finished
          </div>
        </div>

        <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={14} color="#F59E0B" /> Current Focus
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: activeSession?.active ? '#F59E0B' : '#94A3B8', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {activeSession?.active ? activeSession.taskTitle : 'No Active Session'}
          </div>
        </div>
      </div>
    </div>
  );
}
