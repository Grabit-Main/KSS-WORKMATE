import React from 'react';
import { Clock, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

export const SessionTimeoutWarningModal = ({
  isOpen,
  remainingSeconds = 900,
  onContinueSession,
  onLogoutNow
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
        }}
      >
        {/* Accent Header Stripe */}
        <div
          style={{
            height: '6px',
            background: 'linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)'
          }}
        />

        <div style={{ padding: '28px 28px 24px 28px' }}>
          {/* Icon and Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Clock size={24} />
            </div>
            <div>
              <h2
                id="session-warning-title"
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#1E293B',
                  letterSpacing: '-0.01em'
                }}
              >
                Session Expiration Warning
              </h2>
              <p
                style={{
                  margin: '3px 0 0 0',
                  fontSize: '13px',
                  color: '#64748B'
                }}
              >
                Inactivity detected on KSS Workmate
              </p>
            </div>
          </div>

          {/* Explanation Text */}
          <p
            style={{
              fontSize: '14px',
              lineHeight: '1.55',
              color: '#334155',
              margin: '0 0 20px 0'
            }}
          >
            Your Workmate session will expire in <strong>15 minutes</strong> due to inactivity. To protect your account and company data, inactive sessions are automatically signed out after 24 hours.
          </p>

          {/* Countdown Display Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              marginBottom: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400E', fontSize: '13px', fontWeight: 600 }}>
              <ShieldAlert size={16} />
              <span>Time remaining before logout:</span>
            </div>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '18px',
                fontWeight: 700,
                color: '#B45309',
                letterSpacing: '0.05em'
              }}
            >
              {formattedCountdown}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onLogoutNow}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                backgroundColor: '#F1F5F9',
                color: '#475569',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E2E8F0';
                e.currentTarget.style.color = '#1E293B';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F1F5F9';
                e.currentTarget.style.color = '#475569';
              }}
            >
              <LogOut size={15} />
              Log Out Now
            </button>

            <button
              type="button"
              onClick={onContinueSession}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563EB';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3B82F6';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <RefreshCw size={15} />
              Continue Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

