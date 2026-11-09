import React, { useState, useEffect } from 'react';
import {
  Bell, Volume2, VolumeX, CheckCircle2,
  AlertTriangle, Radio, Sparkles
} from 'lucide-react';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getPushSubscriptionStatus
} from '../../services/desktopNotificationService';

export const NotificationSettings = () => {
  const [permission, setPermission] = useState('default');
  const [prefs, setPrefs] = useState(getNotificationPreferences());
  const [requesting, setRequesting] = useState(false);
  const [pushActive, setPushActive] = useState(false);

  const checkStatus = async () => {
    const notifSupported = isNotificationSupported();
    const perm = notifSupported ? getNotificationPermission() : 'unsupported';
    setPermission(perm);

    try {
      const isSubbed = await getPushSubscriptionStatus();
      setPushActive(isSubbed);
    } catch {
      setPushActive(false);
    }
  };

  useEffect(() => {
    checkStatus();

    const handlePermChange = (e) => {
      setPermission(e.detail || getNotificationPermission());
      checkStatus();
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
        await checkStatus();
      }
    } catch (err) {
      console.warn('[NotificationSettings] Permission request failed:', err);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div style={{
      background: 'var(--surface-glass, #FFFFFF)',
      backdropFilter: 'blur(20px)',
      borderRadius: 'var(--radius-lg, 20px)',
      border: '1px solid var(--border, #E2E8F0)',
      padding: '24px 24px',
      marginBottom: '24px',
      boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.02))',
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--brand-50, #EEF2FF)',
            color: 'var(--brand-600, #5551FF)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Bell size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary, #0F172A)', margin: 0 }}>
              Desktop Push Notifications
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary, #64748B)', margin: '2px 0 0 0' }}>
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
                padding: '6px 12px',
                borderRadius: '20px',
                background: '#ECFDF5',
                color: '#059669',
                fontSize: '12px',
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

      {/* Settings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
        {/* Toggle 1: Desktop Alerts */}
        <div style={{
          padding: '14px 16px',
          borderRadius: '14px',
          border: '1px solid var(--border, #F1F5F9)',
          background: 'var(--subtle, #F8FAFC)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary, #0F172A)' }}>
              Desktop Banners
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748B)', marginTop: '2px' }}>
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
              transition: 'background 0.2s',
              flexShrink: 0
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
          padding: '14px 16px',
          borderRadius: '14px',
          border: '1px solid var(--border, #F1F5F9)',
          background: 'var(--subtle, #F8FAFC)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary, #0F172A)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {prefs.soundEnabled ? <Volume2 size={15} color="#5551FF" /> : <VolumeX size={15} color="#94A3B8" />}
              Notification Sound
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748B)', marginTop: '2px' }}>
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
              transition: 'background 0.2s',
              flexShrink: 0
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
          padding: '14px 16px',
          borderRadius: '14px',
          border: '1px solid var(--border, #F1F5F9)',
          background: 'var(--subtle, #F8FAFC)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary, #0F172A)' }}>
              Direct Messages
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748B)', marginTop: '2px' }}>
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
              transition: 'background 0.2s',
              flexShrink: 0
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
          padding: '14px 16px',
          borderRadius: '14px',
          border: '1px solid var(--border, #F1F5F9)',
          background: 'var(--subtle, #F8FAFC)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary, #0F172A)' }}>
              Channels & Teams
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748B)', marginTop: '2px' }}>
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
              transition: 'background 0.2s',
              flexShrink: 0
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
    </div>
  );
};
