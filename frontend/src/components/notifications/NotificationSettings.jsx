import React, { useState, useEffect } from 'react';
import {
  Bell, Volume2, VolumeX, Shield, CheckCircle2,
  AlertTriangle, Play, Sparkles, MessageSquare, Radio
} from 'lucide-react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getNotificationPreferences,
  saveNotificationPreferences,
  playNotificationSound,
  showDesktopNotification,
  getPushSubscriptionStatus,
  subscribeToPushNotifications
} from '../../services/desktopNotificationService';

export const NotificationSettings = () => {
  const [permission, setPermission] = useState('default');
  const [prefs, setPrefs] = useState(getNotificationPreferences());
  const [testSent, setTestSent] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [pushActive, setPushActive] = useState(false);

  useEffect(() => {
    if (isNotificationSupported()) {
      setPermission(getNotificationPermission());
      getPushSubscriptionStatus().then(st => setPushActive(st));
    }

    const handlePermChange = (e) => {
      setPermission(e.detail || getNotificationPermission());
      getPushSubscriptionStatus().then(st => setPushActive(st));
    };

    const handlePrefsChange = (e) => {
      setPrefs(e.detail || getNotificationPreferences());
    };

    window.addEventListener('workmate_notification_permission_changed', handlePermChange);
    window.addEventListener('workmate_notification_prefs_changed', handlePrefsChange);

    return () => {
      window.removeEventListener('workmate_notification_permission_changed', handlePermChange);
      window.removeEventListener('workmate_notification_prefs_changed', handlePrefsChange);
    };
  }, []);

  const handleToggle = (key) => {
    const updated = saveNotificationPreferences({ [key]: !prefs[key] });
    setPrefs(updated);
  };

  const handleRequestPermission = async () => {
    setRequesting(true);
    try {
      const res = await requestNotificationPermission();
      setPermission(res);
      if (res === 'granted') {
        saveNotificationPreferences({ desktopEnabled: true });
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleTestNotification = async () => {
    setTestSent(true);
    // 1. Play sound chime
    playNotificationSound();

    // 2. Trigger desktop notification
    await showDesktopNotification({
      title: 'Teams-Style Notification Alert',
      body: 'This is a test desktop notification from KSS Workmate with sound chime.',
      icon: '/logo.webp',
      badge: '/favicon.ico',
      tag: 'test-notification',
      playSound: false, // Already played above
      data: { url: '/collaboration' }
    });

    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: '20px',
      border: '1px solid #E2E8F0',
      padding: '24px 28px',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#EEF2FF',
            color: '#5551FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Bell size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Desktop Push Notifications
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
              Teams-like desktop alerts and audio chimes for Collaboration Chat messages
            </p>
          </div>
        </div>

        {/* Permission Status Pill */}
        <div>
          {permission === 'granted' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: '#ECFDF5',
                color: '#059669',
                fontSize: '12.5px',
                fontWeight: 700
              }}>
                <CheckCircle2 size={14} /> Desktop Notifications Active
              </span>
              {pushActive && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  background: '#EEF2FF',
                  color: '#4338CA',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  <Radio size={13} color="#4338CA" /> Closed-Tab Push Ready
                </span>
              )}
            </div>
          )}
          {permission === 'denied' && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: '#FEF2F2',
              color: '#DC2626',
              fontSize: '12.5px',
              fontWeight: 700
            }}>
              <AlertTriangle size={14} /> Blocked in Browser Settings
            </span>
          )}
          {permission === 'default' && (
            <button
              onClick={handleRequestPermission}
              disabled={requesting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '10px',
                background: '#5551FF',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(85, 81, 255, 0.3)'
              }}
            >
              <Sparkles size={14} /> {requesting ? 'Granting...' : 'Grant Permission'}
            </button>
          )}
        </div>
      </div>

      {permission === 'denied' && (
        <div style={{
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#92400E',
          lineHeight: 1.5
        }}>
          <strong>Notifications are blocked:</strong> To receive desktop alerts, click the padlock/tune icon in your browser address bar next to the website URL, toggle <strong>Notifications</strong> to <strong>Allow</strong>, and refresh the page.
        </div>
      )}

      {/* Settings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '22px' }}>
        {/* Toggle 1: Desktop Alerts */}
        <div style={{
          padding: '16px 18px',
          borderRadius: '14px',
          border: '1px solid #F1F5F9',
          background: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
              Desktop Banners
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Show native OS popups when messages arrive
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('desktopEnabled')}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '99px',
              background: prefs.desktopEnabled ? '#5551FF' : '#CBD5E1',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#FFFFFF',
              position: 'absolute',
              top: '3px',
              left: prefs.desktopEnabled ? '23px' : '3px',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </button>
        </div>

        {/* Toggle 2: Sound Chime */}
        <div style={{
          padding: '16px 18px',
          borderRadius: '14px',
          border: '1px solid #F1F5F9',
          background: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {prefs.soundEnabled ? <Volume2 size={16} color="#5551FF" /> : <VolumeX size={16} color="#94A3B8" />}
              Notification Sound
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Play Microsoft Teams-like chime on message
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('soundEnabled')}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '99px',
              background: prefs.soundEnabled ? '#5551FF' : '#CBD5E1',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#FFFFFF',
              position: 'absolute',
              top: '3px',
              left: prefs.soundEnabled ? '23px' : '3px',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </button>
        </div>

        {/* Toggle 3: Direct Messages */}
        <div style={{
          padding: '16px 18px',
          borderRadius: '14px',
          border: '1px solid #F1F5F9',
          background: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
              Direct Messages
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Notify on 1-on-1 team direct chats
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('notifyDirect')}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '99px',
              background: prefs.notifyDirect ? '#5551FF' : '#CBD5E1',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#FFFFFF',
              position: 'absolute',
              top: '3px',
              left: prefs.notifyDirect ? '23px' : '3px',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </button>
        </div>

        {/* Toggle 4: Channel Messages */}
        <div style={{
          padding: '16px 18px',
          borderRadius: '14px',
          border: '1px solid #F1F5F9',
          background: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
              Channels & Teams
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Notify on team channels (#general, #engineering)
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('notifyChannels')}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '99px',
              background: prefs.notifyChannels ? '#5551FF' : '#CBD5E1',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#FFFFFF',
              position: 'absolute',
              top: '3px',
              left: prefs.notifyChannels ? '23px' : '3px',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </button>
        </div>
      </div>

      {/* Action Bar: Test Notification & Sound */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        paddingTop: '16px',
        borderTop: '1px solid #F1F5F9'
      }}>
        <div style={{ fontSize: '13px', color: '#64748B' }}>
          Test your audio chime and desktop notification popup in real-time.
        </div>
        <button
          type="button"
          onClick={handleTestNotification}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            background: testSent ? '#ECFDF5' : '#FFFFFF',
            color: testSent ? '#059669' : '#0F172A',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: 'inherit'
          }}
          onMouseEnter={e => { if (!testSent) e.currentTarget.style.background = '#F8FAFC'; }}
          onMouseLeave={e => { if (!testSent) e.currentTarget.style.background = '#FFFFFF'; }}
        >
          {testSent ? (
            <>
              <CheckCircle2 size={15} color="#059669" /> Test Notification Triggered!
            </>
          ) : (
            <>
              <Play size={14} color="#5551FF" /> Test Notification & Sound
            </>
          )}
        </button>
      </div>
    </div>
  );
};

