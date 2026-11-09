/**
 * KSS Workmate - JARVIS Voice Engine
 * High-performance, free browser-native speech synthesis service.
 * Powered by Web Speech API (window.speechSynthesis).
 */

const PREFS_KEY_PREFIX = 'workmate_jarvis_prefs_';
const INTRO_KEY_PREFIX = 'workmate_jarvis_intro_';
const GREETED_KEY_PREFIX = 'workmate_jarvis_greeted_session_';

export const DEFAULT_JARVIS_PREFS = {
  enabled: true,
  autoGreeting: true,
  taskAnnouncements: true,
  deadlineReminders: true,
  projectAnnouncements: true,
  voiceURI: '',
  volume: 0.9,
  rate: 1.0,
  pitch: 1.0,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  isMuted: false
};

// Check if Web Speech API is supported
export const isSpeechSupported = () => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
};

// Listeners for JARVIS state changes
const stateListeners = new Set();
let currentState = 'idle'; // 'idle' | 'speaking' | 'paused' | 'muted' | 'error'
let currentSubtitle = '';

const notifyStateChange = () => {
  stateListeners.forEach(listener => {
    try {
      listener({ state: currentState, subtitle: currentSubtitle });
    } catch (err) {
      console.warn('[Jarvis] State listener error:', err);
    }
  });
};

export const subscribeJarvisState = (callback) => {
  stateListeners.add(callback);
  callback({ state: currentState, subtitle: currentSubtitle });
  return () => stateListeners.delete(callback);
};

// Voice management
let cachedVoices = [];

export const getAvailableVoices = () => {
  if (!isSpeechSupported()) return [];
  if (cachedVoices.length > 0) return cachedVoices;

  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
};

// Voice loader listener
if (isSpeechSupported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

/**
 * Get user-specific preferences
 */
export const getJarvisPreferences = (userId) => {
  if (!userId) return { ...DEFAULT_JARVIS_PREFS };
  try {
    const raw = localStorage.getItem(`${PREFS_KEY_PREFIX}${userId}`);
    if (!raw) return { ...DEFAULT_JARVIS_PREFS };
    return { ...DEFAULT_JARVIS_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_JARVIS_PREFS };
  }
};

/**
 * Save user-specific preferences
 */
export const saveJarvisPreferences = (userId, newPrefs) => {
  if (!userId) return DEFAULT_JARVIS_PREFS;
  try {
    const current = getJarvisPreferences(userId);
    const updated = { ...current, ...newPrefs };
    localStorage.setItem(`${PREFS_KEY_PREFIX}${userId}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('workmate_jarvis_prefs_changed', { detail: { userId, prefs: updated } }));
    return updated;
  } catch (err) {
    console.error('[Jarvis] Failed to save preferences:', err);
    return DEFAULT_JARVIS_PREFS;
  }
};

/**
 * Check if current time falls within quiet hours
 */
export const isQuietHours = (prefs) => {
  if (!prefs || !prefs.quietHoursEnabled) return false;
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
    const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  } catch {
    return false;
  }
};

/**
 * Check if first-time introduction has been completed for this user
 */
export const hasCompletedIntro = (userId) => {
  if (!userId) return false;
  return localStorage.getItem(`${INTRO_KEY_PREFIX}${userId}`) === 'true';
};

/**
 * Mark first-time introduction as completed
 */
export const markIntroCompleted = (userId) => {
  if (!userId) return;
  localStorage.setItem(`${INTRO_KEY_PREFIX}${userId}`, 'true');
};

/**
 * Reset introduction state (for testing or user request)
 */
export const resetIntroState = (userId) => {
  if (!userId) return;
  localStorage.removeItem(`${INTRO_KEY_PREFIX}${userId}`);
  sessionStorage.removeItem(`${GREETED_KEY_PREFIX}${userId}`);
};

/**
 * Check if the user has already received the session greeting today
 */
export const hasReceivedSessionGreeting = (userId) => {
  if (!userId) return false;
  return sessionStorage.getItem(`${GREETED_KEY_PREFIX}${userId}`) === 'true';
};

/**
 * Mark session greeting as delivered
 */
export const markSessionGreetingDelivered = (userId) => {
  if (!userId) return;
  sessionStorage.setItem(`${GREETED_KEY_PREFIX}${userId}`, 'true');
};

// Current active utterance reference
let currentUtterance = null;

/**
 * Speak text announcement using Web Speech API
 */
export const jarvisSpeak = (text, options = {}, userId = null) => {
  if (!isSpeechSupported()) {
    console.warn('[Jarvis] Speech synthesis not supported in this browser.');
    return Promise.reject(new Error('Speech synthesis not supported'));
  }

  const prefs = userId ? getJarvisPreferences(userId) : DEFAULT_JARVIS_PREFS;

  if (!prefs.enabled) {
    return Promise.resolve({ skipped: true, reason: 'disabled' });
  }

  if (prefs.isMuted) {
    currentState = 'muted';
    currentSubtitle = text;
    notifyStateChange();
    return Promise.resolve({ skipped: true, reason: 'muted' });
  }

  if (isQuietHours(prefs)) {
    console.log('[Jarvis] Speech suppressed due to quiet hours.');
    return Promise.resolve({ skipped: true, reason: 'quiet_hours' });
  }

  // Cancel any running speech before starting new utterance
  jarvisStop();

  return new Promise((resolve, reject) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      currentUtterance = utterance;

      // Select voice: user preferred, or default natural English voice
      const voices = getAvailableVoices();
      if (voices.length > 0) {
        let chosenVoice = null;
        if (prefs.voiceURI) {
          chosenVoice = voices.find(v => v.voiceURI === prefs.voiceURI);
        }
        if (!chosenVoice) {
          // Prefer high-quality English voice (Google US English, Microsoft Natural, Samantha)
          chosenVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('Alex'))) ||
                        voices.find(v => v.lang.startsWith('en'));
        }
        if (chosenVoice) {
          utterance.voice = chosenVoice;
        }
      }

      utterance.volume = typeof options.volume === 'number' ? options.volume : (prefs.volume ?? 0.9);
      utterance.rate = typeof options.rate === 'number' ? options.rate : (prefs.rate ?? 1.0);
      utterance.pitch = typeof options.pitch === 'number' ? options.pitch : (prefs.pitch ?? 1.0);

      utterance.onstart = () => {
        currentState = 'speaking';
        currentSubtitle = text;
        notifyStateChange();
      };

      utterance.onpause = () => {
        currentState = 'paused';
        notifyStateChange();
      };

      utterance.onresume = () => {
        currentState = 'speaking';
        notifyStateChange();
      };

      utterance.onend = () => {
        currentState = 'idle';
        currentUtterance = null;
        notifyStateChange();
        resolve({ completed: true });
      };

      utterance.onerror = (e) => {
        // 'interrupted' is normal when stop() or a new message interrupts previous
        if (e.error === 'interrupted' || e.error === 'canceled') {
          currentState = 'idle';
          currentUtterance = null;
          notifyStateChange();
          resolve({ interrupted: true });
        } else {
          console.warn('[Jarvis] Speech synthesis error:', e.error);
          currentState = 'error';
          currentUtterance = null;
          notifyStateChange();
          reject(e);
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      currentState = 'error';
      notifyStateChange();
      reject(err);
    }
  });
};

/**
 * Pause speech
 */
export const jarvisPause = () => {
  if (isSpeechSupported() && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    currentState = 'paused';
    notifyStateChange();
  }
};

/**
 * Resume speech
 */
export const jarvisResume = () => {
  if (isSpeechSupported() && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    currentState = 'speaking';
    notifyStateChange();
  }
};

/**
 * Stop and cancel all speech
 */
export const jarvisStop = () => {
  if (isSpeechSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    currentState = 'idle';
    currentUtterance = null;
    notifyStateChange();
  }
};

/**
 * Toggle mute state
 */
export const jarvisToggleMute = (userId) => {
  const prefs = getJarvisPreferences(userId);
  const updatedMute = !prefs.isMuted;
  if (updatedMute) {
    jarvisStop();
    currentState = 'muted';
  } else {
    currentState = 'idle';
  }
  notifyStateChange();
  return saveJarvisPreferences(userId, { isMuted: updatedMute });
};

/**
 * Get current state snapshot
 */
export const getJarvisState = () => ({
  state: currentState,
  subtitle: currentSubtitle
});

