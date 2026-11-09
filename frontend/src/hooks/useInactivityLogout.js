import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jarvisStop } from '../services/jarvisVoiceService';
import {
  INACTIVITY_TIMEOUT_MS,
  WARNING_BEFORE_TIMEOUT_MS,
  recordUserActivity,
  getLastActivity,
  clearSessionActivity,
  evaluateInactivity,
  broadcastSessionEvent,
  subscribeSessionEvents
} from '../services/sessionInactivityService';

/**
 * Custom hook for 24-hour inactivity tracking, 15-minute warning,
 * multi-tab sync, and automatic session logout.
 * 
 * @param {object} options
 * @param {number} [options.timeoutMs] - Inactivity threshold (default 24h)
 * @param {number} [options.warningBeforeMs] - Warning time before logout (default 15m)
 * @param {boolean} [options.enabled] - Whether tracking is active
 */
export const useInactivityLogout = (options = {}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const userId = user?.id ? String(user.id) : null;
  const timeoutMs = options.timeoutMs ?? INACTIVITY_TIMEOUT_MS;
  const warningBeforeMs = options.warningBeforeMs ?? WARNING_BEFORE_TIMEOUT_MS;
  const isTrackingEnabled = options.enabled !== false && !!userId;

  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.floor(warningBeforeMs / 1000));

  const isLoggingOutRef = useRef(false);
  const checkIntervalRef = useRef(null);

  /**
   * Perform safe session logout
   */
  const handlePerformLogout = useCallback((reason = 'inactivity') => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    // 1. Halt any active or queued JARVIS speech
    try {
      jarvisStop();
    } catch (err) {
      console.warn('[Inactivity] Error stopping JARVIS:', err);
    }

    // 2. Clear stored activity timestamp
    if (userId) {
      clearSessionActivity(userId);
    }

    // 3. Notify other tabs to log out immediately
    broadcastSessionEvent({
      type: 'SESSION_LOGOUT',
      userId,
      reason
    });

    // 4. Trigger AuthContext logout
    try {
      logout();
    } catch (err) {
      console.warn('[Inactivity] Error during auth logout:', err);
    }

    // 5. Navigate to login with reason
    setShowWarning(false);
    navigate(`/login?reason=${encodeURIComponent(reason)}`, { replace: true });
  }, [userId, logout, navigate]);

  /**
   * Reset session timer on explicit user confirmation
   */
  const handleContinueSession = useCallback(() => {
    if (!userId) return;

    // Record immediate activity
    recordUserActivity(userId, { force: true });
    setShowWarning(false);
    setRemainingSeconds(Math.floor(warningBeforeMs / 1000));

    // Inform other tabs to dismiss warning as well
    broadcastSessionEvent({
      type: 'SESSION_CONTINUE',
      userId,
      timestamp: Date.now()
    });
  }, [userId, warningBeforeMs]);

  /**
   * Manual user logout action from modal
   */
  const handleLogoutNow = useCallback(() => {
    handlePerformLogout('user_choice');
  }, [handlePerformLogout]);

  /**
   * Check inactivity status and update UI/timer
   */
  const checkStatus = useCallback(() => {
    if (!isTrackingEnabled || isLoggingOutRef.current) return;

    const evaluation = evaluateInactivity(userId, timeoutMs, warningBeforeMs);

    // Case 1: Inactivity exceeded 24 hours -> Immediate Logout
    if (evaluation.isExpired) {
      handlePerformLogout('inactivity');
      return;
    }

    // Case 2: Inactivity reached 23h 45m -> Show 15-Minute Warning
    if (evaluation.isWarning) {
      setShowWarning(true);
      const secondsLeft = Math.max(1, Math.floor(evaluation.remainingMs / 1000));
      setRemainingSeconds(secondsLeft);
      return;
    }

    // Case 3: Inactivity within normal threshold (< 23h 45m)
    if (showWarning) {
      setShowWarning(false);
    }
  }, [isTrackingEnabled, userId, timeoutMs, warningBeforeMs, showWarning, handlePerformLogout]);

  // Initial recording on mount if not yet present
  useEffect(() => {
    if (isTrackingEnabled && userId) {
      const existing = getLastActivity(userId);
      if (!existing) {
        recordUserActivity(userId, { force: true });
      }
      const initialCheckTimer = setTimeout(() => {
        checkStatus();
      }, 0);
      return () => clearTimeout(initialCheckTimer);
    }
  }, [isTrackingEnabled, userId, checkStatus]);

  // Event listeners for genuine user interactions
  useEffect(() => {
    if (!isTrackingEnabled) return;

    const onUserInteraction = () => {
      // Only record activity if the warning dialog is NOT showing.
      // Once the warning dialog is showing, the user must explicitly click "Continue Session".
      if (!showWarning) {
        recordUserActivity(userId);
      }
    };

    // Low-overhead listener registration
    const eventOptions = { passive: true };
    const interactionEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'pointerdown'];

    interactionEvents.forEach(evt => {
      window.addEventListener(evt, onUserInteraction, eventOptions);
    });

    return () => {
      interactionEvents.forEach(evt => {
        window.removeEventListener(evt, onUserInteraction, eventOptions);
      });
    };
  }, [isTrackingEnabled, userId, showWarning]);

  // Periodic heartbeat checker & visibility check
  useEffect(() => {
    if (!isTrackingEnabled) return;

    // Check every 5 seconds
    checkIntervalRef.current = setInterval(() => {
      checkStatus();
    }, 5000);

    // Check immediately when tab becomes visible or receives focus (e.g. waking from sleep)
    const onVisibilityOrFocusChange = () => {
      if (document.visibilityState === 'visible') {
        checkStatus();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityOrFocusChange);
    window.addEventListener('focus', onVisibilityOrFocusChange);

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      document.removeEventListener('visibilitychange', onVisibilityOrFocusChange);
      window.removeEventListener('focus', onVisibilityOrFocusChange);
    };
  }, [isTrackingEnabled, checkStatus]);

  // Countdown timer while warning is open
  useEffect(() => {
    if (!showWarning) return;

    const countdownInterval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          handlePerformLogout('inactivity');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [showWarning, handlePerformLogout]);

  // Cross-tab synchronization listener
  useEffect(() => {
    if (!isTrackingEnabled) return;

    const unsubscribe = subscribeSessionEvents((msg) => {
      if (!msg) return;

      // Ensure event is for the same user if userId is provided
      if (msg.userId && msg.userId !== userId) return;

      if (msg.type === 'SESSION_LOGOUT') {
        if (!isLoggingOutRef.current) {
          isLoggingOutRef.current = true;
          try {
            jarvisStop();
          } catch {}
          setShowWarning(false);
          logout();
          navigate(`/login?reason=${encodeURIComponent(msg.reason || 'inactivity')}`, { replace: true });
        }
      } else if (msg.type === 'SESSION_CONTINUE') {
        setShowWarning(false);
        setRemainingSeconds(Math.floor(warningBeforeMs / 1000));
      } else if (msg.type === 'ACTIVITY_PING') {
        if (showWarning) {
          // If another tab resumed activity, close warning in this tab too
          setShowWarning(false);
        }
      }
    });

    return () => unsubscribe();
  }, [isTrackingEnabled, userId, showWarning, warningBeforeMs, logout, navigate]);

  return {
    showWarning,
    remainingSeconds,
    handleContinueSession,
    handleLogoutNow
  };
};
