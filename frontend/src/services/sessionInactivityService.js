/**
 * KSS Workmate - Session Inactivity Service
 * 
 * Manages 24-hour inactivity tracking, 15-minute expiration warnings,
 * and multi-tab synchronization for authenticated Workmate users.
 * 
 * Rules:
 * - 24 hours continuous inactivity triggers automatic logout.
 * - Warning dialog appears at 23 hours and 45 minutes (15 minutes before expiration).
 * - Only genuine user events (mouse, keys, scroll, touch) reset the inactivity timer.
 * - Background API polling / WebSockets do NOT reset this timer.
 * - Multi-tab synchronization is supported via BroadcastChannel and StorageEvent.
 */

export const INACTIVITY_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours (86,400,000 ms)
export const WARNING_BEFORE_TIMEOUT_MS = 15 * 60 * 1000;   // 15 minutes (900,000 ms)
export const WARNING_THRESHOLD_MS = INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_TIMEOUT_MS; // 23h 45m (85,500,000 ms)
export const ACTIVITY_THROTTLE_MS = 15 * 1000;             // 15 seconds throttle for high-frequency events

const STORAGE_PREFIX = 'workmate_last_activity_';
const CHANNEL_NAME = 'workmate_session_sync';

export const getActivityStorageKey = (userId) => {
  return `${STORAGE_PREFIX}${userId ? String(userId) : 'default'}`;
};

// Singleton broadcast channel instance
let broadcastChannel = null;
const getBroadcastChannel = () => {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    if (!broadcastChannel) {
      try {
        broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      } catch (err) {
        console.warn('[SessionService] BroadcastChannel unavailable:', err);
      }
    }
  }
  return broadcastChannel;
};

/**
 * Retrieve the last recorded activity timestamp for a given user.
 */
export const getLastActivity = (userId) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getActivityStorageKey(userId));
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? null : parsed;
  } catch (err) {
    console.warn('[SessionService] Error reading last activity:', err);
    return null;
  }
};

// Memory throttle cache to prevent disk I/O thrashing
let lastMemoryWrite = 0;

/**
 * Record genuine user activity.
 * @param {string|number} userId
 * @param {object} options - { force: boolean }
 * @returns {number} The recorded timestamp
 */
export const recordUserActivity = (userId, options = {}) => {
  if (typeof window === 'undefined' || !userId) return Date.now();
  
  const now = Date.now();
  const force = options.force === true;

  // Throttle disk writes unless explicitly forced (e.g., clicking Continue Session)
  if (!force && (now - lastMemoryWrite) < ACTIVITY_THROTTLE_MS) {
    return now;
  }

  lastMemoryWrite = now;
  const key = getActivityStorageKey(userId);

  try {
    localStorage.setItem(key, String(now));
  } catch (err) {
    console.warn('[SessionService] Error saving activity to localStorage:', err);
  }

  // Broadcast to other tabs
  broadcastSessionEvent({
    type: 'ACTIVITY_PING',
    userId: String(userId),
    timestamp: now
  });

  return now;
};

/**
 * Clear the stored activity timestamp upon logout.
 */
export const clearSessionActivity = (userId) => {
  if (typeof window === 'undefined') return;
  try {
    if (userId) {
      localStorage.removeItem(getActivityStorageKey(userId));
    } else {
      // Clear all keys matching prefix
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (err) {
    console.warn('[SessionService] Error clearing session activity:', err);
  }
};

/**
 * Calculate current inactivity state.
 */
export const evaluateInactivity = (
  userId,
  timeoutMs = INACTIVITY_TIMEOUT_MS,
  warningBeforeMs = WARNING_BEFORE_TIMEOUT_MS
) => {
  const now = Date.now();
  const last = getLastActivity(userId);

  // If no timestamp was recorded yet, return not expired but elapsed 0
  if (!last) {
    return {
      now,
      lastActivity: now,
      elapsedMs: 0,
      isExpired: false,
      isWarning: false,
      remainingMs: timeoutMs
    };
  }

  const elapsedMs = Math.max(0, now - last);
  const warningThreshold = Math.max(0, timeoutMs - warningBeforeMs);
  const isExpired = elapsedMs >= timeoutMs;
  const isWarning = !isExpired && elapsedMs >= warningThreshold;
  const remainingMs = Math.max(0, timeoutMs - elapsedMs);

  return {
    now,
    lastActivity: last,
    elapsedMs,
    isExpired,
    isWarning,
    remainingMs
  };
};

/**
 * Broadcast an event across all open Workmate browser tabs.
 */
export const broadcastSessionEvent = (payload) => {
  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage(payload);
    } catch (err) {
      console.warn('[SessionService] Error posting to BroadcastChannel:', err);
    }
  }
};

/**
 * Subscribe to cross-tab session events (BroadcastChannel + storage fallback).
 */
export const subscribeSessionEvents = (callback) => {
  if (typeof window === 'undefined') return () => {};

  const channel = getBroadcastChannel();
  
  // Handler for BroadcastChannel
  const handleChannelMessage = (event) => {
    if (event.data && typeof callback === 'function') {
      try {
        callback(event.data);
      } catch (err) {
        console.warn('[SessionService] Listener error in BroadcastChannel:', err);
      }
    }
  };

  if (channel) {
    channel.addEventListener('message', handleChannelMessage);
  }

  // Fallback / supplement handler for localStorage storage events
  const handleStorageEvent = (event) => {
    if (!event.key) return;
    
    // Check for activity timestamp update from another tab
    if (event.key.startsWith(STORAGE_PREFIX) && event.newValue) {
      const parsedTime = parseInt(event.newValue, 10);
      if (!isNaN(parsedTime)) {
        const userId = event.key.replace(STORAGE_PREFIX, '');
        callback({
          type: 'ACTIVITY_PING',
          userId,
          timestamp: parsedTime,
          fromStorage: true
        });
      }
    }
    // Check if user was logged out in another tab
    if (event.key === 'user' && !event.newValue) {
      callback({
        type: 'SESSION_LOGOUT',
        reason: 'storage_logout'
      });
    }
  };

  window.addEventListener('storage', handleStorageEvent);

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleChannelMessage);
    }
    window.removeEventListener('storage', handleStorageEvent);
  };
};

