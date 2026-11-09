/**
 * KSS Workmate - Desktop & Push Notification Service
 * Teams-like desktop notifications with audio chime and permission management.
 */

const PREFS_STORAGE_KEY = 'workmate_desktop_notification_prefs';

const DEFAULT_PREFS = {
  desktopEnabled: true,
  soundEnabled: true,
  notifyDirect: true,
  notifyChannels: true,
  dismissedPrompt: false
};

// Cache for recent notification IDs to prevent duplicate alerts
const recentNotifCache = new Set();

/**
 * Read notification preferences from localStorage
 */
export const getNotificationPreferences = () => {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
};

/**
 * Save notification preferences to localStorage
 */
export const saveNotificationPreferences = (newPrefs) => {
  try {
    const current = getNotificationPreferences();
    const updated = { ...current, ...newPrefs };
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom event for reactive UI updates
    window.dispatchEvent(new CustomEvent('workmate_notification_prefs_changed', { detail: updated }));
    return updated;
  } catch (e) {
    console.error('[NotificationService] Failed to save preferences', e);
    return getNotificationPreferences();
  }
};

/**
 * Check if the browser supports notifications
 */
export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Check if Service Worker is supported
 */
export const isServiceWorkerSupported = () => {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
};

/**
 * Get current browser notification permission
 */
export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
};

let cachedSwRegistration = null;

/**
 * Register the Service Worker for desktop push notifications
 */
export const registerServiceWorker = async () => {
  if (!isServiceWorkerSupported()) return null;
  if (cachedSwRegistration) return cachedSwRegistration;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    cachedSwRegistration = reg;
    console.log('[NotificationService] Service Worker registered successfully with scope:', reg.scope);
    return reg;
  } catch (err) {
    console.warn('[NotificationService] Service Worker registration failed:', err);
    return null;
  }
};

/**
 * Request notification permission from the user
 */
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    // Dispatch custom event for reactive UI updates
    window.dispatchEvent(new CustomEvent('workmate_notification_permission_changed', { detail: permission }));
    if (permission === 'granted') {
      await registerServiceWorker();
      // Auto-subscribe to Web Push for closed-tab notifications
      try {
        await subscribeToPushNotifications();
      } catch (pushErr) {
        console.warn('[NotificationService] Web Push auto-subscription notice:', pushErr);
      }
    }
    return permission;
  } catch (e) {
    console.error('[NotificationService] Permission request failed', e);
    return Notification.permission;
  }
};

/**
 * Synthesize a pristine, modern Teams-style notification chime using Web Audio API.
 * Uses a harmonic two-tone chord with smooth exponential decay.
 * Zero asset downloads, instant playback, zero network latency, 100% reliable.
 */
let audioCtx = null;
let isAudioUnlocked = false;

export const initAudioUnlock = () => {
  if (typeof window === 'undefined' || isAudioUnlocked) return;

  const unlock = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        if (!audioCtx || audioCtx.state === 'closed') {
          audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      }
      isAudioUnlocked = true;
    } catch {
      // Ignore user gesture unlock errors
    }
    ['pointerdown', 'keydown', 'click', 'touchstart'].forEach(evt => {
      window.removeEventListener(evt, unlock, true);
    });
  };

  ['pointerdown', 'keydown', 'click', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, unlock, { capture: true, once: true });
  });
};

if (typeof window !== 'undefined') {
  initAudioUnlock();
}

export const playNotificationSound = () => {
  const prefs = getNotificationPreferences();
  if (!prefs.soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Tone 1: 523.25 Hz (C5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: 783.99 Hz (G5) chime delay by 60ms for that signature cheerful Teams chime
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.06);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.24, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.warn('[NotificationService] Audio playback error:', err);
  }
};

/**
 * Display a desktop notification with message details and chime
 */
export const showDesktopNotification = async ({
  title,
  body,
  icon = '/logo.webp',
  badge = '/favicon.ico',
  tag,
  data = {},
  playSound = true,
  onClick
}) => {
  const prefs = getNotificationPreferences();

  // Deduplicate rapid identical notifications
  const dedupeKey = `${tag || title}-${body}`;
  if (recentNotifCache.has(dedupeKey)) {
    return null;
  }
  recentNotifCache.add(dedupeKey);
  setTimeout(() => recentNotifCache.delete(dedupeKey), 2500);

  // 1. Play audio chime if enabled in preferences (independent of notification permission)
  if (playSound && prefs.soundEnabled) {
    playNotificationSound();
  }

  // 2. Check if desktop banner notifications are enabled and granted
  if (!prefs.desktopEnabled) return null;
  if (getNotificationPermission() !== 'granted') return null;

  const notificationOptions = {
    body,
    icon: icon || '/logo.webp',
    badge: badge || '/favicon.ico',
    tag: tag || `workmate-${Date.now()}`,
    data: {
      url: data?.url || '/collaboration',
      ...data
    },
    renotify: true,
    requireInteraction: false
  };

  // 3. Try Service Worker showNotification first (Standard for desktop push)
  try {
    let reg = cachedSwRegistration;
    if (!reg && isServiceWorkerSupported()) {
      reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await registerServiceWorker();
      }
    }

    if (reg && reg.showNotification) {
      await reg.showNotification(title, notificationOptions);
      return true;
    }
  } catch (swErr) {
    console.warn('[NotificationService] ServiceWorker showNotification fallback to Notification API', swErr);
  }

  // 4. Fallback to window Notification API
  try {
    const notif = new Notification(title, notificationOptions);
    notif.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (onClick) {
        onClick(notif);
      } else if (data?.url) {
        window.location.href = data.url;
      }
      notif.close();
    };
    return notif;
  } catch (nErr) {
    console.error('[NotificationService] Native Notification construction failed:', nErr);
    return null;
  }
};

/**
 * Convert base64 url-safe string to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Fetch VAPID public key from backend API
 */
export const fetchVapidPublicKey = async () => {
  try {
    const token = localStorage.getItem('access_token');
    const res = await fetch('/api/push/vapid-public-key', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.publicKey;
  } catch (err) {
    console.warn('[NotificationService] Failed to fetch VAPID public key:', err);
    return null;
  }
};

/**
 * Subscribe browser to Web Push for closed-tab notifications
 */
export const subscribeToPushNotifications = async () => {
  if (!isServiceWorkerSupported() || !('PushManager' in window)) {
    console.warn('[NotificationService] PushManager not supported');
    return false;
  }

  try {
    const reg = await registerServiceWorker();
    if (!reg) return false;

    // Wait until ServiceWorker is active
    let serviceWorker = reg.active;
    if (!serviceWorker) {
      serviceWorker = await navigator.serviceWorker.ready.then(r => r.active);
    }

    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      const publicKey = await fetchVapidPublicKey();
      if (!publicKey) {
        console.warn('[NotificationService] No VAPID public key available');
        return false;
      }
      const convertedKey = urlBase64ToUint8Array(publicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    if (subscription) {
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(subscription.toJSON())
        });
      }
      return true;
    }
  } catch (err) {
    console.error('[NotificationService] Push subscription failed:', err);
  }
  return false;
};

/**
 * Unsubscribe browser from Web Push
 */
export const unsubscribeFromPushNotifications = async () => {
  if (!isServiceWorkerSupported() || !('PushManager' in window)) return false;

  try {
    const reg = await registerServiceWorker();
    if (!reg) return false;

    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ endpoint })
        });
      }
      return true;
    }
  } catch (err) {
    console.warn('[NotificationService] Unsubscribe error:', err);
  }
  return false;
};

/**
 * Check if the browser currently has an active Push subscription
 */
export const getPushSubscriptionStatus = async () => {
  if (!isServiceWorkerSupported() || !('PushManager' in window)) return false;
  try {
    const reg = await registerServiceWorker();
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
};
