import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, Volume2, VolumeX, Shield, CheckCircle2,
  AlertTriangle, Play, Sparkles, MessageSquare, Radio,
  Activity, Terminal, RefreshCw, Send, Check, XCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { useRealtime } from '../../realtime/useRealtime';
import {
  isNotificationSupported,
  isServiceWorkerSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getNotificationPreferences,
  saveNotificationPreferences,
  playNotificationSound,
  showDesktopNotification,
  getPushSubscriptionStatus,
  subscribeToPushNotifications,
  fetchVapidPublicKey,
  sendBackendTestPush,
  getAudioContextState
} from '../../services/desktopNotificationService';

export const NotificationSettings = () => {
  const { user } = useAuth();
  const ws = useWebSocket();
  const [permission, setPermission] = useState('default');
  const [prefs, setPrefs] = useState(getNotificationPreferences());
  const [testSent, setTestSent] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [pushActive, setPushActive] = useState(false);

  // Diagnostic states
  const [swActive, setSwActive] = useState(false);
  const [swScope, setSwScope] = useState('');
  const [vapidKey, setVapidKey] = useState('');
  const [backendRegStatus, setBackendRegStatus] = useState('Pending');
  const [dbPersistStatus, setDbPersistStatus] = useState('Pending');
  const [audioState, setAudioState] = useState('Uninitialized');
  const [diagLogs, setDiagLogs] = useState([]);
  const [runningTest, setRunningTest] = useState(null);

  const addDiagLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setDiagLogs(prev => [...prev.slice(-25), { time, msg, type }]);
  };

  const refreshDiagnostics = async () => {
    const notifSupported = isNotificationSupported();
    const perm = notifSupported ? getNotificationPermission() : 'unsupported';
    setPermission(perm);
    setAudioState(getAudioContextState());

    if (isServiceWorkerSupported()) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.active) {
          setSwActive(true);
          setSwScope(reg.scope);
        } else {
          setSwActive(false);
        }
      } catch (err) {
        setSwActive(false);
      }
    }

    try {
      const isSubbed = await getPushSubscriptionStatus();
      setPushActive(isSubbed);
      if (isSubbed) {
        setBackendRegStatus('Verified');
        setDbPersistStatus('Verified');
      }
    } catch {
      setPushActive(false);
    }

    try {
      const key = await fetchVapidPublicKey();
      if (key) {
        setVapidKey(key);
      }
    } catch {
      setVapidKey('');
    }
  };

  useEffect(() => {
    refreshDiagnostics();

    const handlePermChange = (e) => {
      setPermission(e.detail || getNotificationPermission());
      refreshDiagnostics();
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

  // Listen for WebSocket test ping
  useRealtime('chat.diag_ping', (eventData) => {
    addDiagLog(`[PASS] WebSocket echo received: "${eventData?.text || 'Echo'}" at ${new Date().toLocaleTimeString()}`, 'success');
  });

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
        addDiagLog('[PASS] Notification permission granted by user', 'success');
        await refreshDiagnostics();
      } else {
        addDiagLog(`[WARN] Notification permission: ${res}`, 'warn');
      }
    } catch (err) {
      addDiagLog(`[FAIL] Permission request failed: ${err.message}`, 'error');
    } finally {
      setRequesting(false);
    }
  };

  // Diagnostic Test 1: Desktop OS Notification
  const runTestDesktopNotification = async () => {
    setRunningTest('desktop');
    try {
      if (getNotificationPermission() !== 'granted') {
        addDiagLog('[FAIL] Desktop notification requires permission "granted". Current: ' + getNotificationPermission(), 'error');
        return;
      }
      const notif = await showDesktopNotification({
        title: 'KSS Workmate Desktop Alert',
        body: `Native OS banner test successful at ${new Date().toLocaleTimeString()}`,
        icon: '/logo.webp',
        badge: '/favicon.ico',
        tag: 'diag-desktop-test',
        playSound: false
      });
      if (notif) {
        addDiagLog('[PASS] Native desktop notification banner dispatched successfully', 'success');
      } else {
        addDiagLog('[FAIL] Notification construction returned null. Check OS notification settings.', 'error');
      }
    } catch (err) {
      addDiagLog(`[FAIL] Desktop notification error: ${err.message}`, 'error');
    } finally {
      setRunningTest(null);
    }
  };

  // Diagnostic Test 2: Sound Chime
  const runTestSound = () => {
    setRunningTest('sound');
    try {
      playNotificationSound();
      const state = getAudioContextState();
      setAudioState(state);
      if (state === 'running') {
        addDiagLog('[PASS] Teams harmonic chord synthesized and played. AudioContext: running', 'success');
      } else {
        addDiagLog(`[WARN] AudioContext state: ${state}. Click anywhere on page to unlock audio.`, 'warn');
      }
    } catch (err) {
      addDiagLog(`[FAIL] Sound chime error: ${err.message}`, 'error');
    } finally {
      setRunningTest(null);
    }
  };

  // Diagnostic Test 3: WebSocket Event Dispatch & Reception
  const runTestWebSocket = () => {
    setRunningTest('ws');
    try {
      if (!ws || !ws.isConnected) {
        addDiagLog(`[FAIL] WebSocket is currently DISCONNECTED. Target: wss://kss-workmate.onrender.com/ws`, 'error');
        return;
      }
      addDiagLog(`[INFO] Sending diagnostic ping via WebSocket/BroadcastChannel bus...`, 'info');
      ws.dispatch('chat.diag_ping', { text: 'Diagnostic ping test', timestamp: Date.now() });
    } catch (err) {
      addDiagLog(`[FAIL] WebSocket dispatch error: ${err.message}`, 'error');
    } finally {
      setRunningTest(null);
    }
  };

  // Diagnostic Test 4: Web Push Subscription
  const runTestPushSubscription = async () => {
    setRunningTest('pushSub');
    try {
      addDiagLog('[INFO] Fetching VAPID public key from backend...', 'info');
      const key = await fetchVapidPublicKey();
      if (!key) {
        addDiagLog('[FAIL] VAPID public key not received from backend', 'error');
        return;
      }
      setVapidKey(key);
      addDiagLog(`[PASS] VAPID key retrieved: ${key.slice(0, 16)}...`, 'success');

      addDiagLog('[INFO] Registering push subscription with browser and backend...', 'info');
      const res = await subscribeToPushNotifications();
      if (res) {
        setPushActive(true);
        setBackendRegStatus('Verified');
        setDbPersistStatus('Verified');
        addDiagLog(`[PASS] Push subscription registered and persisted in database. Response: ${JSON.stringify(res)}`, 'success');
      } else {
        addDiagLog('[FAIL] Push subscription registration failed', 'error');
      }
    } catch (err) {
      addDiagLog(`[FAIL] Push subscription error: ${err.message}`, 'error');
    } finally {
      setRunningTest(null);
    }
  };

  // Diagnostic Test 5: Backend Web Push Test Delivery
  const runTestBackendPushDelivery = async () => {
    setRunningTest('pushDelivery');
    try {
      addDiagLog('[INFO] Requesting backend to dispatch Web Push via VAPID...', 'info');
      const res = await sendBackendTestPush();
      addDiagLog(`[PASS] Backend push delivered: ${JSON.stringify(res)}`, 'success');
    } catch (err) {
      addDiagLog(`[FAIL] Backend push delivery failed: ${err.response?.data?.detail || err.message}`, 'error');
    } finally {
      setRunningTest(null);
    }
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

      {/* DIAGNOSTICS & VERIFICATION PANEL */}
      <div style={{
        marginTop: '28px',
        padding: '20px',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        background: '#0F172A',
        color: '#F8FAFC'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={18} color="#38BDF8" />
            <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em', color: '#FFFFFF' }}>
              End-to-End Notification Diagnostics & Pipeline Verification
            </span>
          </div>
          <button
            type="button"
            onClick={refreshDiagnostics}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#1E293B',
              color: '#38BDF8',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '5px 12px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={12} /> Refresh Pipeline State
          </button>
        </div>

        {/* Diagnostic Status Table */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '18px' }}>
          <div style={{ background: '#1E293B', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px' }}>
            <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Browser Notification API</div>
            <div style={{ fontWeight: 700, marginTop: '2px', color: isNotificationSupported() ? '#4ADE80' : '#F87171' }}>
              {isNotificationSupported() ? 'Supported' : 'Unsupported'}
            </div>
          </div>

          <div style={{ background: '#1E293B', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px' }}>
            <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>OS Notification Permission</div>
            <div style={{ fontWeight: 700, marginTop: '2px', color: permission === 'granted' ? '#4ADE80' : permission === 'denied' ? '#F87171' : '#FBBF24' }}>
              {permission.toUpperCase()}
            </div>
          </div>

          <div style={{ background: '#1E293B', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px' }}>
            <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Service Worker & Scope</div>
            <div style={{ fontWeight: 700, marginTop: '2px', color: swActive ? '#4ADE80' : '#F87171' }}>
              {swActive ? `Active (${swScope || '/'})` : 'Inactive'}
            </div>
          </div>

          <div style={{ background: '#1E293B', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px' }}>
            <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Render WebSocket</div>
            <div style={{ fontWeight: 700, marginTop: '2px', color: ws?.isConnected ? '#4ADE80' : '#F87171' }}>
              {ws?.isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          <div style={{ background: '#1E293B', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px' }}>
            <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Authenticated User</div>
            <div style={{ fontWeight: 700, marginTop: '2px', color: user ? '#4ADE80' : '#F87171', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user ? `${user.first_name} ${user.last_name}` : 'Not verified'}
            </div>
          </div>

          <div style={{ background: '#1E293B', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px' }}>
            <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>VAPID Key Pair</div>
            <div style={{ fontWeight: 700, marginTop: '2px', color: vapidKey ? '#4ADE80' : '#F87171' }}>
              {vapidKey ? `Available (${vapidKey.slice(0, 10)}...)` : 'Missing'}
            </div>
          </div>

          <div style={{ background: '#1E293B', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px' }}>
            <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Push Subscription</div>
            <div style={{ fontWeight: 700, marginTop: '2px', color: pushActive ? '#4ADE80' : '#94A3B8' }}>
              {pushActive ? 'Registered' : 'Not registered'}
            </div>
          </div>

          <div style={{ background: '#1E293B', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px' }}>
            <div style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Web AudioContext</div>
            <div style={{ fontWeight: 700, marginTop: '2px', color: audioState === 'running' ? '#4ADE80' : '#FBBF24' }}>
              {audioState.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Diagnostic Action Buttons */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
            Execute Live Diagnostic Tests
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={runningTest !== null}
              onClick={runTestDesktopNotification}
              style={{
                background: '#1E293B',
                color: '#FFFFFF',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              1. Test Browser Desktop Banner
            </button>

            <button
              type="button"
              disabled={runningTest !== null}
              onClick={runTestSound}
              style={{
                background: '#1E293B',
                color: '#FFFFFF',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              2. Test Notification Sound (Chime)
            </button>

            <button
              type="button"
              disabled={runningTest !== null}
              onClick={runTestWebSocket}
              style={{
                background: '#1E293B',
                color: '#FFFFFF',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              3. Test WebSocket Ping Reception
            </button>

            <button
              type="button"
              disabled={runningTest !== null}
              onClick={runTestPushSubscription}
              style={{
                background: '#4338CA',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              4. Test Push Subscription Registration
            </button>

            <button
              type="button"
              disabled={runningTest !== null}
              onClick={runTestBackendPushDelivery}
              style={{
                background: '#059669',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              5. Test Backend Push Delivery (VAPID)
            </button>
          </div>
        </div>

        {/* Live Terminal Log Output */}
        <div style={{
          background: '#020617',
          borderRadius: '10px',
          border: '1px solid #1E293B',
          padding: '12px 14px',
          fontFamily: 'monospace',
          fontSize: '11.5px',
          maxHeight: '180px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', marginBottom: '6px' }}>
            <Terminal size={13} />
            <span>Diagnostic Execution Output Log:</span>
          </div>
          {diagLogs.length === 0 ? (
            <div style={{ color: '#475569' }}>Click any of the test buttons above to execute real pipeline operations...</div>
          ) : (
            diagLogs.map((log, idx) => (
              <div key={idx} style={{
                color: log.type === 'error' ? '#F87171' : log.type === 'success' ? '#4ADE80' : log.type === 'warn' ? '#FBBF24' : '#E2E8F0',
                lineHeight: 1.5
              }}>
                <span style={{ color: '#64748B' }}>[{log.time}]</span> {log.msg}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
