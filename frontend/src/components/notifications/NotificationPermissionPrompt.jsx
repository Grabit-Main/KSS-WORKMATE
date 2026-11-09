import React, { useState, useEffect } from 'react';
import { Bell, X, Sparkles, CheckCircle2 } from 'lucide-react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getNotificationPreferences,
  saveNotificationPreferences
} from '../../services/desktopNotificationService';

export const NotificationPermissionPrompt = () => {
  const [visible, setVisible] = useState(false);
  const [permission, setPermission] = useState('default');
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (!isNotificationSupported()) return;

    const currentPerm = getNotificationPermission();
    setPermission(currentPerm);

    const prefs = getNotificationPreferences();

    // Show prompt only if permission is still default and user hasn't explicitly dismissed it
    if (currentPerm === 'default' && !prefs.dismissedPrompt) {
      // Short delay so page loads cleanly before banner slides down
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result === 'granted') {
        saveNotificationPreferences({ desktopEnabled: true, dismissedPrompt: true });
        // Auto-hide banner after brief confirmation
        setTimeout(() => setVisible(false), 1200);
      } else {
        saveNotificationPreferences({ dismissedPrompt: true });
        setVisible(false);
      }
    } finally {
      setEnabling(false);
    }
  };

  const handleDismiss = () => {
    saveNotificationPreferences({ dismissedPrompt: true });
    setVisible(false);
  };

  if (!visible || permission === 'granted') return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #4338CA 0%, #5551FF 50%, #7C3AED 100%)',
      color: '#FFFFFF',
      padding: '10px 18px',
      borderRadius: '14px',
      margin: '0 0 16px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      boxShadow: '0 4px 14px rgba(85, 81, 255, 0.25)',
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      fontSize: '13.5px',
      position: 'relative',
      zIndex: 40,
      animation: 'slideDown 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Bell size={18} strokeWidth={2.4} color="#FFFFFF" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '13.5px', letterSpacing: '-0.01em' }}>
            Enable Teams-Style Desktop Notifications
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '2px' }}>
            Get instant desktop alerts and audio chimes when teammates message you, even when in another tab or minimized.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={handleEnable}
          disabled={enabling}
          style={{
            background: '#FFFFFF',
            color: '#4338CA',
            border: 'none',
            borderRadius: '9px',
            padding: '7px 16px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {enabling ? 'Requesting...' : (
            <>
              <Sparkles size={13} color="#4338CA" /> Enable Notifications
            </>
          )}
        </button>

        <button
          onClick={handleDismiss}
          title="Dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.7)',
            padding: '6px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

