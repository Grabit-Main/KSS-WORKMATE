import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTasks } from '../api/tasks';
import { getProjects } from '../api/projects';
import {
  isSpeechSupported,
  getJarvisPreferences,
  saveJarvisPreferences,
  jarvisSpeak,
  jarvisPause,
  jarvisResume,
  jarvisStop,
  jarvisToggleMute,
  hasCompletedIntro,
  markIntroCompleted,
  resetIntroState,
  hasReceivedSessionGreeting,
  markSessionGreetingDelivered,
  subscribeJarvisState,
  isQuietHours
} from '../services/jarvisVoiceService';
import {
  generateGreetingSpeech,
  generateTaskSummaryAction,
  generateDueTodayAction,
  generateOverdueAction,
  generateFocusRecommendationAction,
  generateWorkProgressAction,
  generateDeadlineReminder
} from '../services/jarvisBrainService';

const REMINDED_TASKS_KEY_PREFIX = 'workmate_jarvis_reminded_tasks_';

export const useJarvis = () => {
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : null;

  const [prefs, setPrefs] = useState(() => getJarvisPreferences(userId));
  const [voiceState, setVoiceState] = useState('idle'); // 'idle' | 'speaking' | 'paused' | 'muted' | 'error'
  const [subtitle, setSubtitle] = useState('');
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const tasksRef = useRef(tasks);
  const projectsRef = useRef(projects);
  const prefsRef = useRef(prefs);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  // Sync preferences on user change
  useEffect(() => {
    if (userId) {
      setPrefs(getJarvisPreferences(userId));
    }
  }, [userId]);

  // Listen for preference changes
  useEffect(() => {
    const handlePrefsChange = (e) => {
      if (e.detail && e.detail.userId === userId) {
        setPrefs(e.detail.prefs);
      }
    };
    window.addEventListener('workmate_jarvis_prefs_changed', handlePrefsChange);
    return () => window.removeEventListener('workmate_jarvis_prefs_changed', handlePrefsChange);
  }, [userId]);

  // Subscribe to voice synthesis state changes
  useEffect(() => {
    const unsubscribe = subscribeJarvisState(({ state, subtitle }) => {
      setVoiceState(state);
      setSubtitle(subtitle);
    });
    return () => unsubscribe();
  }, []);

  // Track user interaction for speech synthesis unlocking
  useEffect(() => {
    if (hasInteracted) return;
    const unlock = () => {
      setHasInteracted(true);
      ['click', 'keydown', 'pointerdown', 'touchstart'].forEach(evt => {
        window.removeEventListener(evt, unlock, true);
      });
    };
    ['click', 'keydown', 'pointerdown', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, unlock, { capture: true, once: true });
    });
    return () => {
      ['click', 'keydown', 'pointerdown', 'touchstart'].forEach(evt => {
        window.removeEventListener(evt, unlock, true);
      });
    };
  }, [hasInteracted]);

  // Fetch actual user tasks and projects
  const refreshData = useCallback(async () => {
    if (!userId) return;
    try {
      const [fetchedTasks, fetchedProjects] = await Promise.allSettled([
        getTasks(),
        getProjects()
      ]);
      if (fetchedTasks.status === 'fulfilled' && Array.isArray(fetchedTasks.value)) {
        setTasks(fetchedTasks.value);
      }
      if (fetchedProjects.status === 'fulfilled' && Array.isArray(fetchedProjects.value)) {
        setProjects(fetchedProjects.value);
      }
      setDataLoaded(true);
    } catch (err) {
      console.warn('[Jarvis] Failed to fetch data:', err);
      setDataLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Automatic greeting on initial login / session start
  useEffect(() => {
    if (!userId || !dataLoaded || !user) return;

    const currentPrefs = prefsRef.current;
    if (!currentPrefs.enabled || !currentPrefs.autoGreeting) return;
    if (isQuietHours(currentPrefs)) return;

    // Check if greeting was already spoken in this session
    if (hasReceivedSessionGreeting(userId)) {
      return;
    }

    // Delay slightly so layout & UI animate smoothly before voice begins
    const timer = setTimeout(async () => {
      const isFirst = !hasCompletedIntro(userId);
      const greetingText = generateGreetingSpeech({
        user,
        isFirstTime: isFirst,
        tasks: tasksRef.current,
        projects: projectsRef.current
      });

      try {
        await jarvisSpeak(greetingText, {}, userId);
        markIntroCompleted(userId);
        markSessionGreetingDelivered(userId);
      } catch (err) {
        console.log('[Jarvis] Auto-greeting deferred or rejected by browser autoplay policy.');
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [userId, dataLoaded, user]);

  // Periodic deadline reminder check (runs every 10 minutes)
  useEffect(() => {
    if (!userId || !prefs.enabled || !prefs.deadlineReminders) return;

    const checkDeadlines = () => {
      if (isQuietHours(prefsRef.current)) return;
      const currentTasks = tasksRef.current;
      const todayStr = new Date().toISOString().split('T')[0];
      const now = new Date();

      // Read already reminded task IDs for this session
      let reminded = new Set();
      try {
        const raw = sessionStorage.getItem(`${REMINDED_TASKS_KEY_PREFIX}${userId}`);
        if (raw) reminded = new Set(JSON.parse(raw));
      } catch {}

      for (const t of currentTasks) {
        if (['completed', 'confirmed'].includes((t.status || '').toLowerCase())) continue;
        if (reminded.has(t.id)) continue;

        let shouldRemind = false;
        if (t.deadline) {
          const d = new Date(t.deadline);
          const diffHours = (d - now) / (1000 * 60 * 60);
          // Due in less than 3 hours or due today
          if (diffHours > 0 && diffHours <= 3) {
            shouldRemind = true;
          }
        }
        if (t.scheduled_date && (t.scheduled_date.includes(todayStr) || todayStr.includes(t.scheduled_date))) {
          shouldRemind = true;
        }

        if (shouldRemind) {
          reminded.add(t.id);
          sessionStorage.setItem(`${REMINDED_TASKS_KEY_PREFIX}${userId}`, JSON.stringify([...reminded]));
          const reminderText = generateDeadlineReminder(t, user);
          jarvisSpeak(reminderText, {}, userId).catch(() => {});
          break; // Announce one deadline reminder at a time to avoid audio flood
        }
      }
    };

    const interval = setInterval(checkDeadlines, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId, prefs.enabled, prefs.deadlineReminders, user]);

  // Clean up on unmount or logout
  useEffect(() => {
    return () => {
      jarvisStop();
    };
  }, []);

  // Action: Speak greeting
  const speakGreeting = useCallback((forceFirstTime = false) => {
    if (!user) return;
    const isFirst = forceFirstTime ? true : !hasCompletedIntro(userId);
    const speech = generateGreetingSpeech({
      user,
      isFirstTime: isFirst,
      tasks: tasksRef.current,
      projects: projectsRef.current
    });
    jarvisSpeak(speech, {}, userId).then(() => {
      markIntroCompleted(userId);
    });
  }, [user, userId]);

  // Action: Read my task summary
  const speakTaskSummary = useCallback(() => {
    const text = generateTaskSummaryAction(tasksRef.current, user);
    jarvisSpeak(text, {}, userId);
  }, [user, userId]);

  // Action: What is due today?
  const speakDueToday = useCallback(() => {
    const text = generateDueTodayAction(tasksRef.current, user);
    jarvisSpeak(text, {}, userId);
  }, [user, userId]);

  // Action: What tasks are overdue?
  const speakOverdue = useCallback(() => {
    const text = generateOverdueAction(tasksRef.current, user);
    jarvisSpeak(text, {}, userId);
  }, [user, userId]);

  // Action: What should I focus on today?
  const speakFocus = useCallback(() => {
    const text = generateFocusRecommendationAction(tasksRef.current, user);
    jarvisSpeak(text, {}, userId);
  }, [user, userId]);

  // Action: Give me my work progress
  const speakProgress = useCallback(() => {
    const text = generateWorkProgressAction(tasksRef.current, projectsRef.current, user);
    jarvisSpeak(text, {}, userId);
  }, [user, userId]);

  // Update preferences
  const updatePreferences = useCallback((newPrefs) => {
    const updated = saveJarvisPreferences(userId, newPrefs);
    setPrefs(updated);
    return updated;
  }, [userId]);

  return {
    isSupported: isSpeechSupported(),
    voiceState, // 'idle' | 'speaking' | 'paused' | 'muted' | 'error'
    subtitle,
    prefs,
    tasks,
    projects,
    updatePreferences,
    speakGreeting,
    speakTaskSummary,
    speakDueToday,
    speakOverdue,
    speakFocus,
    speakProgress,
    pause: jarvisPause,
    resume: jarvisResume,
    stop: jarvisStop,
    toggleMute: () => jarvisToggleMute(userId),
    resetIntro: () => resetIntroState(userId),
    refreshData
  };
};

