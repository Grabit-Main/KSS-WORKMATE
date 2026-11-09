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
    }
    return permission;
  } catch (e) {
    console.error('[NotificationService] Permission request failed', e);
    return Notification.permission;
  }
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
 * Synthesize a pristine, modern Teams-style notification chime using Web Audio API.
 * Uses a harmonic two-tone chord with smooth exponential decay.
 * Zero asset downloads, instant playback, zero network latency, 100% reliable.
 */
let audioCtx = null;

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
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: 783.99 Hz (G5) chime delay by 60ms for that signature cheerful chime
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.06);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.22, now + 0.06);
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
  if (!prefs.desktopEnabled) return null;
  if (getNotificationPermission() !== 'granted') return null;

  // Deduplicate rapid identical notifications
  const dedupeKey = `${tag || title}-${body}`;
  if (recentNotifCache.has(dedupeKey)) {
    return null;
  }
  recentNotifCache.add(dedupeKey);
  setTimeout(() => recentNotifCache.delete(dedupeKey), 2500);

  // Play audio chime if enabled
  if (playSound && prefs.soundEnabled) {
    playNotificationSound();
  }

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

  // 1. Try Service Worker showNotification first (Standard for desktop push)
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
    console.warn('[NotificationService] ServiceWorker showNotification failed, falling back to Notification API', swErr);
  }

  // 2. Fallback to window Notification API
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
