import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import goalsGrowth3d from '../assets/goals_growth_3d.png';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../api/goals';
import {
  Target, Award, TrendingUp, CheckCircle2, Plus, Calendar,
  ChevronRight, ChevronLeft, X, Clock,
  Search, MoreVertical, SlidersHorizontal, Flame, BookOpen,
  Upload, Paperclip, Info, FileText, Minus, Check,
  Pencil, ChevronsUpDown, AlertCircle, Sparkles, Flag, RefreshCw, Trash2
} from 'lucide-react';

// Figma Logo SVG component
function FigmaLogo({ size = 18 }) {
  return (
    <svg width={size} height={(size * 57) / 38} viewBox="0 0 38 57" fill="none" style={{ flexShrink: 0 }}>
      <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
      <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
      <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
      <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
      <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
    </svg>
  );
}

// React Logo SVG component
function ReactLogo({ size = 20, color = "#00D8FF" }) {
  return (
    <svg width={size} height={size} viewBox="-11.5 -10.23174 23 20.46348" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="0" cy="0" r="2.05" fill={color} />
      <g stroke={color} strokeWidth="1" fill="none">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </svg>
  );
}

// Goal Icon helper
function GoalIconRenderer({ goal, size = 36 }) {
  const iconType = goal?.icon_type || '';
  const title = (goal?.title || '').toLowerCase();
  const category = (goal?.category || '').toLowerCase();

  if (iconType === 'figma' || title.includes('figma')) {
    return (
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '10px',
        background: '#FFF7ED',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <FigmaLogo size={Math.round(size * 0.45)} />
      </div>
    );
  }

  if (iconType === 'react' || title.includes('react')) {
    return (
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '10px',
        background: '#E0F7FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <ReactLogo size={Math.round(size * 0.55)} color="#00B4D8" />
      </div>
    );
  }

  if (iconType === 'book' || title.includes('certif') || category.includes('career')) {
    return (
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '10px',
        background: '#EEF2FF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6366F1',
        flexShrink: 0
      }}>
        <BookOpen size={Math.round(size * 0.52)} />
      </div>
    );
  }

  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '10px',
      background: '#EEF2FF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#5551FF',
      flexShrink: 0
    }}>
      <Target size={Math.round(size * 0.52)} />
    </div>
  );
}

// Category Pill Badge Helper
function CategoryTag({ category }) {
  const cat = (category || 'Technical Skills').toLowerCase();
  let bg = '#ECFDF5';
  let color = '#10B981';

  if (cat.includes('professional')) {
    bg = '#F5F3FF';
    color = '#7C3AED';
  } else if (cat.includes('career')) {
    bg = '#EFF6FF';
    color = '#2563EB';
  } else if (cat.includes('leadership')) {
    bg = '#FFF7ED';
    color = '#EA580C';
  } else if (cat.includes('strategic')) {
    bg = '#FAF5FF';
    color = '#9333EA';
  }

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '6px',
      background: bg,
      color: color,
      fontSize: '11px',
      fontWeight: 600,
      marginTop: '3px',
      whiteSpace: 'nowrap'
    }}>
      {category || 'Technical Skills'}
    </span>
  );
}

// Priority Pill Helper
function PriorityTag({ priority }) {
  const p = (priority || 'Normal').toLowerCase();

  if (p === 'high') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '4px 12px',
        borderRadius: '9999px',
        background: '#FEF2F2',
        color: '#EF4444',
        border: '1px solid #FEE2E2',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap'
      }}>
        <Flame size={13} fill="#EF4444" color="#EF4444" /> High
      </span>
    );
  }

  if (p === 'medium' || p === 'normal') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '9999px',
        background: '#FFFBEB',
        color: '#D97706',
        border: '1px solid #FEF3C7',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap'
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D97706', flexShrink: 0 }} /> Medium
      </span>
    );
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px',
      borderRadius: '9999px',
      background: '#F1F5F9',
      color: '#64748B',
      border: '1px solid #E2E8F0',
      fontSize: '12px',
      fontWeight: 600,
      whiteSpace: 'nowrap'
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8', flexShrink: 0 }} /> Low
    </span>
  );
}

// Status Dot Helper
function StatusTag({ status }) {
  const isDone = status === 'Completed';
  const isProgress = status === 'In Progress';
  
  if (isDone) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        color: '#10B981',
        fontSize: '13px',
        fontWeight: 600,
        whiteSpace: 'nowrap'
      }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }} /> Completed
      </span>
    );
  }

  if (isProgress) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        color: '#5551FF',
        fontSize: '13px',
        fontWeight: 600,
        whiteSpace: 'nowrap'
      }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#5551FF', flexShrink: 0 }} /> In Progress
      </span>
    );
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      color: '#64748B',
      fontSize: '13px',
      fontWeight: 500,
      whiteSpace: 'nowrap'
    }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#94A3B8', flexShrink: 0 }} /> Not Started
    </span>
  );
}

// Date Formatter helper: '04 Nov 2026'
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Duration Calculator Helper
function calculateDurationDays(startStr, targetStr) {
  if (!startStr || !targetStr) return '0 Days';
  const start = new Date(startStr);
  const target = new Date(targetStr);
  const diffTime = target - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays > 0 ? diffDays : 0} Days`;
}

export default function GoalsPage() {
  const { user } = useAuth();
  const role = user?.role || 'TM';

  // Active Tab: 'goals', 'growth', 'achievements'
  const [activeTab, setActiveTab] = useState('goals');

  // Goals State with localStorage persistence (starts empty or loads user-created goals)
  const [goalsList, setGoalsList] = useState(() => {
    try {
      const saved = localStorage.getItem(`workos_goals_v2_${user?.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Remove the 3 initial demo goals
          return parsed.filter(g => ![1, 2, 3].includes(g.id) && !['Learn React.js', 'Improve Figma Prototyping Skills', 'Prepare for UI/UX Certification'].includes(g.title));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Save Goals to LocalStorage
  const saveGoals = (updated) => {
    setGoalsList(updated);
    try {
      localStorage.setItem(`workos_goals_v2_${user?.id}`, JSON.stringify(updated));
    } catch {}
  };

  const [loadingGoals, setLoadingGoals] = useState(false);

  // Fetch Goals from Backend Database
  const fetchGoals = useCallback(async () => {
    try {
      setLoadingGoals(true);
      const data = await getGoals();
      if (Array.isArray(data)) {
        const cleanGoals = data.filter(g => ![1, 2, 3].includes(g.id) && !['Learn React.js', 'Improve Figma Prototyping Skills', 'Prepare for UI/UX Certification'].includes(g.title));
        setGoalsList(cleanGoals);
        try {
          localStorage.setItem(`workos_goals_v2_${user?.id}`, JSON.stringify(cleanGoals));
        } catch {}
      }
    } catch (err) {
      console.warn('Could not fetch goals from DB, using cached goals:', err);
    } finally {
      setLoadingGoals(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Realtime Sync Handler
  const handleRealtimeUpdate = useCallback(() => {
    fetchGoals();
  }, [fetchGoals]);

  useRealtime('analytics.refresh', handleRealtimeUpdate);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('last_updated');

  // Actions 3-dot dropdown popup
  const [actionMenuGoalId, setActionMenuGoalId] = useState(null);
  const actionMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuGoalId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modals state
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [updatingGoal, setUpdatingGoal] = useState(null);
  const [viewingGoal, setViewingGoal] = useState(null);

  // ==========================================
  // CREATE GOAL FORM STATE
  // ==========================================
  const [createTitle, setCreateTitle] = useState('');
  const [createCategory, setCreateCategory] = useState('Technical Skills');
  const [createPriority, setCreatePriority] = useState('High');
  const [createDescription, setCreateDescription] = useState('');
  const [createOutcome, setCreateOutcome] = useState('');
  const [createStartDate, setCreateStartDate] = useState('2026-11-04');
  const [createTargetDate, setCreateTargetDate] = useState('2026-12-19');
  const [createFrequency, setCreateFrequency] = useState('Daily');
  const [createResourceInput, setCreateResourceInput] = useState('');
  const [createResourcesList, setCreateResourcesList] = useState([]);

  // Create Goal — Milestones panel state
  const [createMilestones, setCreateMilestones] = useState([
    { id: 1, text: 'Learn React Fundamentals', targetDate: '2026-11-10', status: 'Completed', lastUpdated: '10 Nov 2026' },
    { id: 2, text: 'Understand Components & Props', targetDate: '2026-11-17', status: 'Completed', lastUpdated: '17 Nov 2026' }
  ]);
  const [showAddMilestoneInput, setShowAddMilestoneInput] = useState(false);
  const [createMilestoneTitleInput, setCreateMilestoneTitleInput] = useState('');
  const [createMilestoneDateInput, setCreateMilestoneDateInput] = useState('');

  const handleAddCreateMilestone = () => {
    if (!createMilestoneTitleInput.trim()) return;
    setCreateMilestones(prev => [...prev, {
      id: Date.now(),
      text: createMilestoneTitleInput.trim(),
      targetDate: createMilestoneDateInput,
      status: 'Not Started',
      lastUpdated: null
    }]);
    setCreateMilestoneTitleInput('');
    setCreateMilestoneDateInput('');
    setShowAddMilestoneInput(false);
  };

  const handleRemoveCreateMilestone = (id) => {
    setCreateMilestones(prev => prev.filter(m => m.id !== id));
  };

  const handleAddCreateResource = () => {
    if (createResourceInput.trim()) {
      setCreateResourcesList([...createResourcesList, createResourceInput.trim()]);
      setCreateResourceInput('');
    }
  };

  const handleRemoveCreateResource = (index) => {
    setCreateResourcesList(createResourcesList.filter((_, i) => i !== index));
  };

  const handleCreateGoalSubmit = async (e) => {
    e.preventDefault();
    if (!createTitle.trim()) return;

    const durationDays = calculateDurationDays(createStartDate, createTargetDate);
    const finalMilestones = createMilestones.length > 0 ? createMilestones : [
      { id: Date.now() + 1, text: 'Initial research & planning', targetDate: '', status: 'Not Started', lastUpdated: null },
      { id: Date.now() + 2, text: 'Complete milestone deliverables', targetDate: '', status: 'Not Started', lastUpdated: null },
      { id: Date.now() + 3, text: 'Final assessment & review', targetDate: '', status: 'Not Started', lastUpdated: null }
    ];
    const initialHistory = [
      {
        date: createStartDate || new Date().toISOString().split('T')[0],
        progress: 0,
        delta: null,
        title: 'Goal Started',
        activities: createDescription ? createDescription.substring(0, 80) : 'Goal created.',
        timeSpent: '0 hrs',
        activityCount: 1,
        attachments: 0
      }
    ];
    const newGoalPayload = {
      title: createTitle.trim(),
      category: createCategory,
      type: createCategory.includes('Technical') ? 'Technical' : 'Professional',
      priority: createPriority,
      start_date: createStartDate,
      target_date: createTargetDate,
      duration: durationDays,
      progress: 0,
      milestones_completed: finalMilestones.filter(m => m.status === 'Completed').length,
      milestones_total: finalMilestones.length,
      update_frequency: createFrequency,
      status: 'In Progress',
      time_spent: '0 hrs',
      icon_type: createTitle.toLowerCase().includes('react') ? 'react' : createTitle.toLowerCase().includes('figma') ? 'figma' : 'book',
      description: createDescription.trim(),
      target_outcome: createOutcome.trim(),
      next_steps: 'Define initial milestones and review curriculum.',
      challenges: '',
      activities: 'Goal created.',
      resources: createResourcesList.length > 0 ? createResourcesList : [],
      milestones: finalMilestones,
      progress_history: initialHistory,
      progressHistory: initialHistory
    };

    try {
      const created = await createGoal(newGoalPayload);
      if (created && created.id) {
        saveGoals([created, ...goalsList]);
      } else {
        saveGoals([{ id: Date.now(), ...newGoalPayload }, ...goalsList]);
      }
    } catch (err) {
      console.warn('Could not save goal to DB, falling back to local storage:', err);
      saveGoals([{ id: Date.now(), ...newGoalPayload }, ...goalsList]);
    }

    setShowCreateGoalModal(false);
    // Reset fields
    setCreateTitle('');
    setCreateDescription('');
    setCreateOutcome('');
    setCreateResourcesList([]);
    setCreateMilestones([]);
    setCreateMilestoneTitleInput('');
    setCreateMilestoneDateInput('');
  };

  // ==========================================
  // UPDATE PROGRESS MODAL STATE
  // ==========================================
  const [progressFrequency, setProgressFrequency] = useState('Daily');
  const [updateDate, setUpdateDate] = useState('2026-11-04');
  const [timeSpent, setTimeSpent] = useState('2 hrs');
  const [activities, setActivities] = useState('');
  const [progressPercent, setProgressPercent] = useState(35);
  const [nextSteps, setNextSteps] = useState('');
  const [challenges, setChallenges] = useState('');
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  const openUpdateProgressModal = (goal) => {
    setUpdatingGoal(goal);
    setProgressFrequency(goal.update_frequency || 'Daily');
    setUpdateDate(goal.start_date || '2026-11-04');
    setTimeSpent(goal.time_spent || '2 hrs');
    setActivities(goal.activities || '');
    setProgressPercent(goal.progress || 0);
    setNextSteps(goal.next_steps || '');
    setChallenges(goal.challenges || '');
    setAttachments(goal.resources || []);
    setActionMenuGoalId(null);
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!updatingGoal) return;

    const newProg = Math.max(0, Math.min(100, Number(progressPercent)));
    const updatedStatus = newProg === 100 ? 'Completed' : (newProg > 0 ? 'In Progress' : updatingGoal.status);

    const prevProgress = updatingGoal.progress || 0;
    const delta = newProg - prevProgress;
    const currentHist = updatingGoal.progress_history || updatingGoal.progressHistory || [];
    const newHistoryEntry = {
      date: updateDate || new Date().toISOString().split('T')[0],
      progress: newProg,
      delta: delta > 0 ? delta : null,
      title: activities ? activities.split('\n')[0].substring(0, 50) : 'Progress Update',
      activities: activities,
      timeSpent: timeSpent,
      activityCount: activities ? activities.split('\n').filter(l => l.trim()).length : 1,
      attachments: attachments.length
    };

    const updatedHistory = [newHistoryEntry, ...currentHist];

    const updatePayload = {
      progress: newProg,
      update_frequency: progressFrequency,
      time_spent: timeSpent,
      activities: activities,
      next_steps: nextSteps,
      challenges: challenges,
      status: updatedStatus,
      resources: attachments,
      progress_history: updatedHistory,
      progressHistory: updatedHistory
    };

    const updated = goalsList.map(g => {
      if (g.id === updatingGoal.id) {
        return {
          ...g,
          ...updatePayload
        };
      }
      return g;
    });

    saveGoals(updated);
    if (viewingGoal && viewingGoal.id === updatingGoal.id) {
      setViewingGoal(prev => ({ ...prev, ...updatePayload }));
    }
    setUpdatingGoal(null);

    // Persist update to DB
    try {
      if (updatingGoal.id && String(updatingGoal.id).includes('-')) {
        await updateGoal(updatingGoal.id, updatePayload);
      }
    } catch (err) {
      console.warn('Could not update goal in DB:', err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachments(prev => [...prev, file.name]);
    }
  };

  // ==========================================
  // VIEW GOAL DETAILS MODAL STATE
  // ==========================================
  const [detailsTab, setDetailsTab] = useState('overview'); // 'overview' | 'progress' | 'milestones'
  const [editGoalData, setEditGoalData] = useState(null);

  // Milestone inline edit state for details modal
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [milestoneStatusEdit, setMilestoneStatusEdit] = useState('In Progress');
  const [milestoneNoteEdit, setMilestoneNoteEdit] = useState('');

  // Add milestone form in details modal
  const [showAddMilestoneInDetails, setShowAddMilestoneInDetails] = useState(false);
  const [newMilestoneText, setNewMilestoneText] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');

  const openViewDetailsModal = (goal) => {
    const effectiveMilestones = (goal.milestones && goal.milestones.length > 0)
      ? goal.milestones
      : [
          { id: 1, text: 'Learn React Fundamentals', targetDate: '2026-11-10', status: 'Completed', lastUpdated: '10 Nov 2026', note: 'Completed fundamentals and JSX exercises.' },
          { id: 2, text: 'Understand Components & Props', targetDate: '2026-11-17', status: 'Completed', lastUpdated: '17 Nov 2026', note: 'Built custom reusable component library.' },
          { id: 3, text: 'Learn React Hooks', targetDate: '2026-11-24', status: 'In Progress', lastUpdated: '08 Nov 2026', note: 'Learned useState and useEffect with examples.' },
          { id: 4, text: 'Integrate APIs & Routing', targetDate: '2026-12-01', status: 'Not Started', lastUpdated: null, note: '' },
          { id: 5, text: 'Build and Deploy Final Project', targetDate: '2026-12-19', status: 'Not Started', lastUpdated: null, note: '' }
        ];

    const effectiveHistory = (goal.progress_history && goal.progress_history.length > 0)
      ? goal.progress_history
      : (goal.progressHistory && goal.progressHistory.length > 0)
        ? goal.progressHistory
        : [
            {
              date: '2026-11-08',
              progress: 35,
              delta: 10,
              title: 'Practiced React Hooks',
              activities: 'Learned and implemented useState, useEffect and useContext with examples.',
              timeSpent: '2 hrs',
              activityCount: 2,
              attachments: 1
            },
            {
              date: '2026-11-07',
              progress: 25,
              delta: 10,
              title: 'Worked on Components',
              activities: 'Created reusable components and practiced props handling.',
              timeSpent: '2.5 hrs',
              activityCount: 3,
              attachments: 1
            },
            {
              date: '2026-11-06',
              progress: 15,
              delta: 5,
              title: 'Completed React Setup',
              activities: 'Set up the React project using Vite and explored the project structure.',
              timeSpent: '1.5 hrs',
              activityCount: 2,
              attachments: 0
            },
            {
              date: '2026-11-05',
              progress: 10,
              delta: 5,
              title: 'Learned the Basics',
              activities: 'Understood the core concepts of React and JSX.',
              timeSpent: '2 hrs',
              activityCount: 2,
              attachments: 1
            },
            {
              date: '2026-11-04',
              progress: 5,
              delta: null,
              title: 'Goal Started',
              activities: 'Started the React.js learning goal and planned the learning roadmap.',
              timeSpent: '1 hr',
              activityCount: 1,
              attachments: 0
            }
          ];

    const enrichedGoal = {
      ...goal,
      milestones: effectiveMilestones,
      milestones_completed: effectiveMilestones.filter(m => m.status === 'Completed').length,
      milestones_total: effectiveMilestones.length,
      progress_history: effectiveHistory,
      progressHistory: effectiveHistory
    };

    setViewingGoal(enrichedGoal);
    setEditGoalData({ ...enrichedGoal });
    setDetailsTab('overview');
    setSelectedMilestone(null);
    setActionMenuGoalId(null);
  };

  const handleSaveDetailsEdit = async (updatedData) => {
    const data = updatedData || editGoalData;
    if (!data) return;
    const updated = goalsList.map(g => g.id === data.id ? data : g);
    saveGoals(updated);
    setViewingGoal(data);
    setEditGoalData(data);
    try {
      if (data.id && String(data.id).includes('-')) {
        await updateGoal(data.id, data);
      }
    } catch (err) {
      console.warn('Could not save goal edit in DB:', err);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    const updated = goalsList.filter(g => g.id !== goalId);
    saveGoals(updated);
    setActionMenuGoalId(null);
    try {
      if (goalId && String(goalId).includes('-')) {
        await deleteGoal(goalId);
      }
    } catch (err) {
      console.warn('Could not delete goal in DB:', err);
    }
  };

  const handleUpdateMilestoneStatus = async () => {
    if (!selectedMilestone || !viewingGoal) return;
    const nowIso = new Date().toISOString().split('T')[0];
    const updatedMilestones = (viewingGoal.milestones || []).map(m =>
      m.id === selectedMilestone.id
        ? { ...m, status: milestoneStatusEdit, note: milestoneNoteEdit, lastUpdated: nowIso }
        : m
    );
    const completedCount = updatedMilestones.filter(m => m.status === 'Completed').length;
    const allCompleted = updatedMilestones.length > 0 && completedCount === updatedMilestones.length;
    const newProgress = updatedMilestones.length > 0
      ? Math.round((completedCount / updatedMilestones.length) * 100)
      : viewingGoal.progress;
    const newStatus = allCompleted ? 'Completed' : (newProgress > 0 ? 'In Progress' : viewingGoal.status);

    const updatedGoal = {
      ...viewingGoal,
      milestones: updatedMilestones,
      milestones_completed: completedCount,
      milestones_total: updatedMilestones.length,
      progress: newProgress,
      status: newStatus
    };
    await handleSaveDetailsEdit(updatedGoal);
    setSelectedMilestone(null);
    setMilestoneNoteEdit('');
  };

  const handleDeleteMilestone = async (milestoneId) => {
    if (!viewingGoal) return;
    const updatedMilestones = (viewingGoal.milestones || []).filter(m => m.id !== milestoneId);
    const completedCount = updatedMilestones.filter(m => m.status === 'Completed').length;
    const updatedGoal = {
      ...viewingGoal,
      milestones: updatedMilestones,
      milestones_completed: completedCount,
      milestones_total: updatedMilestones.length
    };
    await handleSaveDetailsEdit(updatedGoal);
  };

  const handleAddMilestoneInDetails = async () => {
    if (!newMilestoneText.trim() || !viewingGoal) return;
    const newM = { id: Date.now(), text: newMilestoneText.trim(), targetDate: newMilestoneDate, status: 'Not Started', lastUpdated: null };
    const updatedMilestones = [...(viewingGoal.milestones || []), newM];
    const completedCount = updatedMilestones.filter(m => m.status === 'Completed').length;
    const updatedGoal = {
      ...viewingGoal,
      milestones: updatedMilestones,
      milestones_completed: completedCount,
      milestones_total: updatedMilestones.length
    };
    await handleSaveDetailsEdit(updatedGoal);
    setNewMilestoneText('');
    setNewMilestoneDate('');
    setShowAddMilestoneInDetails(false);
  };

  // ==========================================
  // GROWTH PLAN STATE
  // ==========================================
  const [skillsPlan, setSkillsPlan] = useState(() => {
    try {
      const saved = localStorage.getItem(`workos_skills_${user?.id}`);
      return saved ? JSON.parse(saved) : {
        currentSkills: ['React', 'JavaScript', 'FastAPI', 'PostgreSQL', 'Git'],
        skillsToImprove: ['System Design', 'Realtime WebSockets', 'Performance Tuning'],
        targetSkills: ['GraphQL', 'Kubernetes', 'CI/CD Pipelines']
      };
    } catch {
      return {
        currentSkills: ['React', 'JavaScript', 'FastAPI', 'PostgreSQL', 'Git'],
        skillsToImprove: ['System Design', 'Realtime WebSockets', 'Performance Tuning'],
        targetSkills: ['GraphQL', 'Kubernetes', 'CI/CD Pipelines']
      };
    }
  });

  const [newSkillText, setNewSkillText] = useState('');
  const [skillCategory, setSkillCategory] = useState('toImprove');

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!newSkillText.trim()) return;
    const key = skillCategory === 'current' ? 'currentSkills' : skillCategory === 'toImprove' ? 'skillsToImprove' : 'targetSkills';
    const updated = {
      ...skillsPlan,
      [key]: [...skillsPlan[key], newSkillText.trim()]
    };
    setSkillsPlan(updated);
    try {
      localStorage.setItem(`workos_skills_${user?.id}`, JSON.stringify(updated));
    } catch {}
    setNewSkillText('');
  };

  // Dynamic achievements derived from user-created goals with completed milestone(s) or completed goals
  const achievements = goalsList.filter(g => {
    const hasCompletedMilestone = (g.milestones_completed > 0) || (Array.isArray(g.milestones) && g.milestones.some(m => m.status === 'Completed'));
    const isCompletedGoal = g.status === 'Completed' || g.progress === 100;
    return hasCompletedMilestone || isCompletedGoal;
  }).map(g => {
    const completedM = Array.isArray(g.milestones) ? g.milestones.filter(m => m.status === 'Completed') : [];
    const latestMilestone = completedM[completedM.length - 1];
    const allDone = Array.isArray(g.milestones) && g.milestones.length > 0 && completedM.length === g.milestones.length;
    const completedCount = g.milestones_completed || completedM.length;
    const totalCount = g.milestones_total || (Array.isArray(g.milestones) ? g.milestones.length : 0);

    let desc = 'Milestone completed.';
    if (allDone && totalCount > 0) {
      desc = `All ${totalCount} milestones completed successfully!`;
    } else if (latestMilestone?.text) {
      desc = `Completed milestone: "${latestMilestone.text}" (${completedCount}/${totalCount} completed)`;
    } else if (completedCount > 0) {
      desc = `${completedCount} milestone${completedCount > 1 ? 's' : ''} completed!`;
    } else if (g.description) {
      desc = g.description;
    }

    return {
      id: g.id,
      title: g.title,
      category: g.category || 'Milestone Achievement',
      desc,
      date: latestMilestone?.lastUpdated ? formatDateDisplay(latestMilestone.lastUpdated) : formatDateDisplay(g.updated_at || g.target_date || new Date().toISOString().split('T')[0]),
      icon: g.icon_type === 'figma' ? '🎨' : g.icon_type === 'react' ? '⚛️' : '🏆',
      goal: g
    };
  });

  // ==========================================
  // METRICS COMPUTATION (Dynamic from real goals)
  // ==========================================
  const activeGoalsCount = goalsList.filter(g => g.status === 'In Progress').length;
  const completedGoalsCount = goalsList.filter(g => g.status === 'Completed').length;
  const upcomingMilestonesCount = goalsList.reduce((acc, g) => {
    if (g.milestones) {
      return acc + g.milestones.filter(m => m.status !== 'Completed').length;
    }
    return acc;
  }, 0);
  const totalLearningHours = goalsList.reduce((acc, g) => {
    const hrs = parseInt(g.time_spent) || 0;
    return acc + hrs;
  }, 0);
  const learningHoursText = `${totalLearningHours} hrs`;

  // Filtered goals for table
  const filteredGoals = goalsList.filter(g => {
    const matchesSearch = !searchQuery.trim() ||
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.category && g.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || g.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesCategory = categoryFilter === 'All' || (g.category && g.category.toLowerCase().includes(categoryFilter.toLowerCase()));

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '8px 4px 60px 4px' }}>
      
      {/* 1. TOP HERO BANNER CARD */}
      <div style={{
        background: 'linear-gradient(135deg, #FAF8FF 0%, #F5F3FF 50%, #EFF6FF 100%)',
        borderRadius: '24px',
        border: '1px solid rgba(99, 102, 241, 0.14)',
        padding: '24px 32px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'nowrap',
        gap: '24px',
        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.05)',
        position: 'relative'
      }}>
        {/* Left Section */}
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          {/* Pill Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '5px 14px',
            background: '#EEF2FF',
            color: '#5551FF',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '14px',
            letterSpacing: '0.01em'
          }}>
            Personal & Career Development
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {/* Target Box Icon */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: '#EEF2FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '3px solid #5551FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2.5px solid #5551FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#5551FF'
                  }} />
                </div>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div style={{ minWidth: 0 }}>
              <h1 style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#0F172A',
                margin: 0,
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}>
                Goals & Growth
              </h1>
              <p style={{
                color: '#64748B',
                fontSize: '13.5px',
                margin: '5px 0 0 0',
                lineHeight: 1.45,
                maxWidth: '480px'
              }}>
                Set measurable personal goals, track skill development, and unlock achievements.
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: 3D Illustration & Create Goal Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexShrink: 0,
          flexWrap: 'nowrap'
        }}>
          <img
            src={goalsGrowth3d}
            alt="Goals & Growth 3D Graphic"
            style={{
              height: '95px',
              width: 'auto',
              objectFit: 'contain',
              userSelect: 'none',
              filter: 'drop-shadow(0 6px 16px rgba(85, 81, 255, 0.15))',
              flexShrink: 0
            }}
          />

          <button
            onClick={() => setShowCreateGoalModal(true)}
            style={{
              background: '#5551FF',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 22px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(85, 81, 255, 0.35)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              fontFamily: 'inherit'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(85, 81, 255, 0.45)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(85, 81, 255, 0.35)';
            }}
          >
            <Plus size={16} strokeWidth={2.5} /> Create Goal
          </button>
        </div>
      </div>

      {/* 2. TOP SUMMARY METRICS ROW (4 Cards) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '16px',
        marginBottom: '26px'
      }}>
        {/* Card 1: Active Goals */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          minWidth: 0
        }}>
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
            <Target size={22} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              {activeGoalsCount}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap' }}>
              Active Goals
            </div>
          </div>
        </div>

        {/* Card 2: Completed */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          minWidth: 0
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#ECFDF5',
            color: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CheckCircle2 size={22} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              {completedGoalsCount}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap' }}>
              Completed
            </div>
          </div>
        </div>

        {/* Card 3: Upcoming Milestones */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          minWidth: 0
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#F5F3FF',
            color: '#7C3AED',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Calendar size={22} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              {upcomingMilestonesCount}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap' }}>
              Upcoming Milestones
            </div>
          </div>
        </div>

        {/* Card 4: Learning Hours */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          minWidth: 0
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#EFF6FF',
            color: '#3B82F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Clock size={22} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                {learningHoursText}
              </span>
              <Info size={15} color="#94A3B8" style={{ cursor: 'pointer' }} />
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap' }}>
              Learning Hours
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'goals', label: `My Goals (${goalsList.length})`, icon: Target },
          { key: 'growth', label: 'Growth Plan', icon: TrendingUp },
          { key: 'achievements', label: `Achievements (${achievements.length})`, icon: Award }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: isActive ? '10px 22px' : '10px 18px',
                borderRadius: '9999px',
                background: isActive ? '#5551FF' : 'transparent',
                color: isActive ? '#FFFFFF' : '#64748B',
                fontWeight: isActive ? 600 : 500,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: isActive ? '0 2px 8px rgba(85, 81, 255, 0.28)' : 'none',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit'
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.color = '#1E293B';
                  e.currentTarget.style.background = '#F1F5F9';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.color = '#64748B';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* 4. TAB CONTENT: DATA TABLE FOR MY GOALS */}
      {activeTab === 'goals' && (
        goalsList.length === 0 ? (
          /* Empty State - No Goals Yet */
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.02)',
            padding: '60px 24px 50px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            minHeight: '400px'
          }}>
            <img
              src="/no_goals_empty.png"
              alt="No Goals"
              style={{
                width: '220px',
                height: 'auto',
                marginBottom: '28px',
                objectFit: 'contain'
              }}
            />
            <h3 style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#0F172A',
              margin: '0 0 10px 0',
              fontFamily: 'inherit'
            }}>
              No Goals Yet
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#64748B',
              margin: '0 0 28px 0',
              maxWidth: '400px',
              lineHeight: 1.6,
              fontFamily: 'inherit'
            }}>
              You haven't created any goals yet. Set a goal to track your learning, growth and career progress.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateGoal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 28px',
                borderRadius: '12px',
                border: 'none',
                background: '#5551FF',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                boxShadow: '0 4px 14px rgba(85, 81, 255, 0.3)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#4340E6';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(85, 81, 255, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#5551FF';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(85, 81, 255, 0.3)';
              }}
            >
              <Plus size={18} /> Create Goal
            </button>
          </div>
        ) : (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.02)',
          overflow: 'hidden'
        }}>
          {/* Top Filter and Search Bar */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            {/* Search Input */}
            <div style={{
              position: 'relative',
              flex: '1 1 280px',
              maxWidth: '380px'
            }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search goals..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 14px 9px 38px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  fontSize: '13.5px',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Filter Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Status Dropdown */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  fontSize: '13px',
                  color: '#475569',
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                <option value="All">Status: All Status</option>
                <option value="In Progress">Status: In Progress</option>
                <option value="Completed">Status: Completed</option>
                <option value="Not Started">Status: Not Started</option>
              </select>

              {/* Category Dropdown */}
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  fontSize: '13px',
                  color: '#475569',
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                <option value="All">Category: All Categories</option>
                <option value="Technical">Category: Technical Skills</option>
                <option value="Professional">Category: Professional Development</option>
                <option value="Career">Category: Career Development</option>
              </select>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  fontSize: '13px',
                  color: '#475569',
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                <option value="last_updated">Sort By: Last Updated</option>
                <option value="progress">Sort By: Progress</option>
                <option value="target_date">Sort By: Target Date</option>
              </select>
            </div>
          </div>

          {/* Table Container with horizontal overflow protection */}
          <div style={{
            overflowX: 'auto',
            width: '100%',
            WebkitOverflowScrolling: 'touch',
            minHeight: actionMenuGoalId ? '220px' : 'auto',
            paddingBottom: actionMenuGoalId ? '70px' : '0',
            padding: '0 10px'
          }}>
            <table style={{
              width: '100%',
              minWidth: '960px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              whiteSpace: 'nowrap',
              tableLayout: 'auto'
            }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid #F1F5F9',
                  background: '#FFFFFF'
                }}>
                  <th style={{ padding: '13px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      GOAL <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '13px 12px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      PRIORITY <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '13px 12px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      START DATE <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '13px 12px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      TARGET DATE <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '13px 12px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      PROGRESS <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '13px 12px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      MILESTONES <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '13px 12px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      UPDATE FREQUENCY <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '13px 12px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      STATUS <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '13px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredGoals.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '60px 24px', textAlign: 'center', background: '#FFFFFF' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '16px',
                          background: '#F8FAFC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94A3B8'
                        }}>
                          <Target size={26} />
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                          No Goals Found
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748B', maxWidth: '360px' }}>
                          {searchQuery || statusFilter !== 'All' || categoryFilter !== 'All'
                            ? 'No goals match your current filter criteria.'
                            : 'Click "+ Create Goal" above to create your first goal.'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredGoals.map((g, index) => {
                    const isMenuOpen = actionMenuGoalId === g.id;
                    return (
                      <tr
                        key={g.id}
                        style={{
                          borderBottom: index === filteredGoals.length - 1 ? 'none' : '1px solid #F8FAFC',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Goal Col - Single Line Data Display */}
                        <td style={{ padding: '13px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', whiteSpace: 'nowrap' }}>
                            <GoalIconRenderer goal={g} size={36} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', whiteSpace: 'nowrap' }}>
                              <div style={{
                                fontSize: '14px',
                                fontWeight: 700,
                                color: '#0F172A',
                                lineHeight: 1.25,
                                whiteSpace: 'nowrap'
                              }}>
                                {g.title}
                              </div>
                              <div>
                                <CategoryTag category={g.category} />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Priority Col */}
                        <td style={{ padding: '13px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <PriorityTag priority={g.priority} />
                        </td>

                        {/* Start Date Col */}
                        <td style={{ padding: '13px 12px', verticalAlign: 'middle', fontSize: '13px', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {formatDateDisplay(g.start_date)}
                        </td>

                        {/* Target Date Col */}
                        <td style={{ padding: '13px 12px', verticalAlign: 'middle', fontSize: '13px', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {formatDateDisplay(g.target_date)}
                        </td>

                        {/* Progress Col */}
                        <td style={{ padding: '13px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', minWidth: '32px', whiteSpace: 'nowrap' }}>
                              {g.progress}%
                            </span>
                            <div style={{
                              width: '74px',
                              height: '6px',
                              borderRadius: '9999px',
                              background: '#E2E8F0',
                              overflow: 'hidden',
                              flexShrink: 0
                            }}>
                              <div style={{
                                width: `${g.progress}%`,
                                height: '100%',
                                background: '#10B981',
                                borderRadius: '9999px',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        </td>

                        {/* Milestones Col */}
                        <td style={{ padding: '13px 12px', verticalAlign: 'middle', fontSize: '13px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                          {g.milestones_completed ?? (g.milestones ? g.milestones.filter(m => m.status === 'Completed').length : 0)} / {g.milestones_total ?? (g.milestones ? g.milestones.length : 0)}
                        </td>

                        {/* Update Frequency Col */}
                        <td style={{ padding: '13px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 14px',
                            borderRadius: '9999px',
                            background: '#EEF2FF',
                            color: '#5551FF',
                            fontSize: '12px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}>
                            {g.update_frequency || 'Daily'}
                          </span>
                        </td>

                        {/* Status Col */}
                        <td style={{ padding: '13px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <StatusTag status={g.status} />
                        </td>

                        {/* Actions Col (3-dot Menu) */}
                        <td style={{ padding: '13px 16px', verticalAlign: 'middle', textAlign: 'right', position: 'relative', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuGoalId(isMenuOpen ? null : g.id);
                            }}
                            style={{
                              background: isMenuOpen ? '#EEF2FF' : 'transparent',
                              border: 'none',
                              borderRadius: '8px',
                              width: '32px',
                              height: '32px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#64748B',
                              transition: 'all 0.15s ease',
                              fontFamily: 'inherit'
                            }}
                            onMouseEnter={e => {
                              if (!isMenuOpen) e.currentTarget.style.background = '#F1F5F9';
                            }}
                            onMouseLeave={e => {
                              if (!isMenuOpen) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {/* Dropdown Menu Popup - Only View Details and Delete */}
                          {isMenuOpen && (
                            <div
                              ref={actionMenuRef}
                              style={{
                                position: 'absolute',
                                right: '16px',
                                top: '44px',
                                width: '150px',
                                background: '#FFFFFF',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                border: '1px solid #E2E8F0',
                                padding: '6px',
                                zIndex: 100,
                                textAlign: 'left'
                              }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenuGoalId(null);
                                  openViewDetailsModal(g);
                                }}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#0F172A',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'background 0.15s ease',
                                  fontFamily: 'inherit',
                                  whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <FileText size={15} color="#64748B" />
                                View Details
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGoal(g.id);
                                }}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#EF4444',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'background 0.15s ease',
                                  fontFamily: 'inherit',
                                  whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <Trash2 size={15} color="#EF4444" />
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Bar */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Showing {filteredGoals.length > 0 ? 1 : 0}–{filteredGoals.length} of {filteredGoals.length} goals
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              {/* Prev */}
              <button
                disabled={filteredGoals.length === 0}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: filteredGoals.length === 0 ? '#CBD5E1' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: filteredGoals.length === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                <ChevronLeft size={16} />
              </button>

              {/* Active page 1 */}
              <button
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#5551FF',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                1
              </button>

              {/* Next */}
              <button
                disabled={filteredGoals.length === 0}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: filteredGoals.length === 0 ? '#CBD5E1' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: filteredGoals.length === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                <ChevronRight size={16} />
              </button>

              {/* Per page */}
              <select
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  fontSize: '13px',
                  color: '#475569',
                  fontWeight: 500,
                  marginLeft: '8px',
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
              </select>
            </div>
          </div>
        </div>
        )
      )}

      {/* TAB 2: GROWTH PLAN & SKILLS */}
      {activeTab === 'growth' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            padding: '26px 28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
              Current Development Role: {role}
            </h2>
            <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0 }}>
              Skill matrix for personal growth. Note: Skill development is tracked independently from official KPI performance scoring.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#10B981" /> Verified Current Skills
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {skillsPlan.currentSkills.map((s, i) => (
                  <span key={i} style={{ padding: '6px 14px', borderRadius: '20px', background: '#ECFDF5', color: '#10B981', fontSize: '13px', fontWeight: 600 }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#5551FF" /> Skills to Improve
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {skillsPlan.skillsToImprove.map((s, i) => (
                  <span key={i} style={{ padding: '6px 14px', borderRadius: '20px', background: '#EEF2FF', color: '#5551FF', fontSize: '13px', fontWeight: 600 }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#A855F7" /> Target Skills
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {skillsPlan.targetSkills.map((s, i) => (
                  <span key={i} style={{ padding: '6px 14px', borderRadius: '20px', background: '#F5F3FF', color: '#A855F7', fontSize: '13px', fontWeight: 600 }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Add Skill Form */}
          <form
            onSubmit={handleAddSkill}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Add New Skill:</span>
            <input
              type="text"
              value={newSkillText}
              onChange={(e) => setNewSkillText(e.target.value)}
              placeholder="e.g. Next.js, Docker..."
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            <select
              value={skillCategory}
              onChange={(e) => setSkillCategory(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            >
              <option value="toImprove">Skills to Improve</option>
              <option value="current">Current Skills</option>
              <option value="target">Target Skills</option>
            </select>
            <button
              type="submit"
              style={{
                background: '#5551FF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'inherit'
              }}
            >
              <Plus size={16} /> Add Skill
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: ACHIEVEMENTS */}
      {activeTab === 'achievements' && (
        achievements.length === 0 ? (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: '#F8FAFC',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8',
              marginBottom: '14px'
            }}>
              <Award size={28} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
              No Achievements Yet
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0 }}>
              Complete personal goals and reach milestones to unlock achievements.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '24px'
          }}>
            {achievements.map(a => (
              <div
                key={a.id}
                onClick={() => a.goal && openViewDetailsModal(a.goal)}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1px solid #E2E8F0',
                  padding: '24px 26px',
                  display: 'flex',
                  gap: '18px',
                  alignItems: 'flex-start',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                }}
              >
                <div style={{
                  fontSize: '28px',
                  background: '#F8FAFC',
                  padding: '14px',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  flexShrink: 0
                }}>
                  {a.icon}
                </div>
                <div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#5551FF',
                    letterSpacing: '0.04em'
                  }}>
                    {a.category}
                  </span>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '4px 0 6px 0' }}>
                    {a.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.45 }}>
                    {a.desc}
                  </p>
                  <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>
                    Unlocked: {a.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* =================================================================== */}
      {/* MODAL 1: UPDATE PROGRESS (Matches Image 3)                           */}
      {/* =================================================================== */}
      {updatingGoal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            maxWidth: '620px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '28px 32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Update Progress
              </h2>
              <button
                type="button"
                onClick={() => setUpdatingGoal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'inherit'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Goal Info Card */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '20px'
            }}>
              <GoalIconRenderer goal={updatingGoal} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                    {updatingGoal.title}
                  </span>
                  <CategoryTag category={updatingGoal.category} />
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#FEF2F2',
                    color: '#EF4444',
                    fontSize: '11px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    <Flame size={11} fill="#EF4444" color="#EF4444" /> High Priority
                  </span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Log your progress, log your learnings, and plan next steps.
                </p>
              </div>
            </div>

            {/* Update Frequency Toggle Buttons */}
            <div style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '22px'
            }}>
              {[
                { key: 'Daily', label: 'Daily', icon: Calendar },
                { key: 'Weekly', label: 'Weekly', icon: Calendar },
                { key: 'Custom', label: 'Custom', icon: SlidersHorizontal }
              ].map(tab => {
                const isSelected = progressFrequency === tab.key;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setProgressFrequency(tab.key)}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: isSelected ? '1px solid #5551FF' : '1px solid #E2E8F0',
                      background: isSelected ? '#5551FF' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#475569',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontFamily: 'inherit'
                    }}
                  >
                    <Icon size={15} /> {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProgress}>
              {/* Row 1: Update Date & Time Spent */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Update Date <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={updateDate}
                      onChange={e => setUpdateDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 38px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        fontSize: '13px',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Time Spent <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Clock size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <select
                      value={timeSpent}
                      onChange={e => setTimeSpent(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 38px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        fontSize: '13px',
                        color: '#0F172A',
                        outline: 'none',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit'
                      }}
                    >
                      <option value="1 hr">1 hr</option>
                      <option value="2 hrs">2 hrs</option>
                      <option value="3 hrs">3 hrs</option>
                      <option value="4 hrs">4 hrs</option>
                      <option value="5+ hrs">5+ hrs</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 2: Activities Completed */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Activities Completed <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={activities}
                  onChange={e => setActivities(e.target.value)}
                  placeholder="Log activities completed..."
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Row 3: Progress Stepper & Next Steps */}
              <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Progress <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '4px 6px',
                    background: '#FFFFFF'
                  }}>
                    <button
                      type="button"
                      onClick={() => setProgressPercent(prev => Math.max(0, prev - 5))}
                      style={{
                        width: '32px',
                        height: '32px',
                        border: 'none',
                        background: '#F1F5F9',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569',
                        fontFamily: 'inherit'
                      }}
                    >
                      <Minus size={15} />
                    </button>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      {progressPercent} %
                    </span>
                    <button
                      type="button"
                      onClick={() => setProgressPercent(prev => Math.min(100, prev + 5))}
                      style={{
                        width: '32px',
                        height: '32px',
                        border: 'none',
                        background: '#F1F5F9',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569',
                        fontFamily: 'inherit'
                      }}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Next Steps
                  </label>
                  <input
                    type="text"
                    value={nextSteps}
                    onChange={e => setNextSteps(e.target.value)}
                    placeholder="Plan your next steps..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13px',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              {/* Row 4: Challenges Faced */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Challenges Faced <span style={{ color: '#94A3B8', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  value={challenges}
                  onChange={e => setChallenges(e.target.value)}
                  placeholder="Any blockers or challenges encountered..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Row 5: Attachments (Optional) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px dashed #CBD5E1',
                background: '#F8FAFC',
                marginBottom: '26px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                  <Paperclip size={16} color="#64748B" />
                  <span>Attachments <span style={{ color: '#94A3B8' }}>(Optional)</span></span>
                  {attachments.length > 0 && (
                    <span style={{ fontSize: '12px', color: '#5551FF', fontWeight: 600, background: '#EEF2FF', padding: '2px 8px', borderRadius: '12px' }}>
                      {attachments.length} files
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  <Upload size={14} /> Upload File
                </button>
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setUpdatingGoal(null)}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    padding: '10px 26px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#5551FF',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(85, 81, 255, 0.3)',
                    fontFamily: 'inherit'
                  }}
                >
                  Save Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: GOAL DETAILS — 3-tab design (Overview/Progress/Milestones) */}
      {/* =================================================================== */}
      {viewingGoal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '16px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '94vh',
            overflowY: 'auto',
            padding: '28px 32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0',
            position: 'relative'
          }}>

            {/* Header: Title + Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Goal Details</h2>
              <button
                type="button"
                onClick={() => { setViewingGoal(null); setDetailsTab('overview'); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', fontFamily: 'inherit' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px', marginBottom: '22px' }}>
              {[
                { key: 'overview', label: 'Overview', icon: FileText },
                { key: 'progress', label: `Progress Updates (${(viewingGoal.progress_history || viewingGoal.progressHistory || []).length})`, icon: TrendingUp },
                { key: 'milestones', label: `Milestones (${(viewingGoal.milestones || []).filter(m => m.status === 'Completed').length}/${(viewingGoal.milestones || []).length})`, icon: Flag }
              ].map(tab => {
                const isActive = detailsTab === tab.key;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setDetailsTab(tab.key)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isActive ? '#5551FF' : 'transparent',
                      color: isActive ? '#FFFFFF' : '#64748B',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={14} color={isActive ? '#FFFFFF' : '#64748B'} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Goal Header Card (shown on all tabs) */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              marginBottom: '22px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <GoalIconRenderer goal={viewingGoal} size={44} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{viewingGoal.title}</h3>
                    {detailsTab !== 'overview' && (
                      <>
                        <CategoryTag category={viewingGoal.category} />
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '2px 8px', borderRadius: '6px', background: '#FEF2F2',
                          color: '#EF4444', fontSize: '11px', fontWeight: 600
                        }}>
                          <Flame size={11} fill="#EF4444" color="#EF4444" /> {viewingGoal.priority} Priority
                        </span>
                      </>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0 0' }}>{viewingGoal.description}</p>
                </div>
              </div>
              <span style={{
                padding: '5px 14px', borderRadius: '9999px', background: '#EEF2FF',
                color: '#5551FF', fontSize: '12px', fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5551FF' }} />
                {viewingGoal.status}
              </span>
            </div>

            {/* ============================================================ */}
            {/* TAB: OVERVIEW                                                 */}
            {/* ============================================================ */}
            {detailsTab === 'overview' && (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: '0 0 12px 0' }}>Goal Information</h4>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden', background: '#FFFFFF' }}>
                    {[
                      [{ icon: Target, label: 'Goal Title', val: viewingGoal.title }, { icon: FileText, label: 'Category', val: viewingGoal.category }],
                      [{ icon: Flame, label: 'Priority', val: `🔥 ${viewingGoal.priority}`, color: '#EF4444' }, { icon: Calendar, label: 'Update Frequency', val: viewingGoal.update_frequency }],
                      [{ icon: Calendar, label: 'Start Date', val: formatDateDisplay(viewingGoal.start_date) }, { icon: Target, label: 'Target Date', val: formatDateDisplay(viewingGoal.target_date) }],
                      [{ icon: Clock, label: 'Duration', val: viewingGoal.duration || '0 Days' }, { icon: Clock, label: 'Time Spent', val: viewingGoal.time_spent || '0 hrs' }],
                    ].map((row, ri) => (
                      <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #E2E8F0' }}>
                        {row.map((cell, ci) => {
                          const CIcon = cell.icon;
                          return (
                            <div key={ci} style={{ padding: '11px 18px', borderRight: ci === 0 ? '1px solid #E2E8F0' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <CIcon size={15} color="#64748B" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: '12.5px', color: '#64748B', minWidth: '100px' }}>{cell.label}</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: cell.color || '#0F172A' }}>{cell.val}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div style={{ padding: '11px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <FileText size={15} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontSize: '12.5px', color: '#64748B', minWidth: '100px', flexShrink: 0 }}>Description</span>
                      <span style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>{viewingGoal.description || '—'}</span>
                    </div>
                    <div style={{ padding: '11px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <Target size={15} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontSize: '12.5px', color: '#64748B', minWidth: '100px', flexShrink: 0 }}>Target Outcome / Success Criteria</span>
                      <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                        {viewingGoal.target_outcome ? viewingGoal.target_outcome.split('\n').map((line, idx) => (
                          <div key={idx}>{line.replace(/^[•\-\*]\s*/, '')}</div>
                        )) : <span style={{ color: '#94A3B8' }}>None specified</span>}
                      </div>
                    </div>
                    <div style={{ padding: '11px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <ChevronRight size={15} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontSize: '12.5px', color: '#64748B', minWidth: '100px', flexShrink: 0 }}>Next Steps</span>
                      <span style={{ fontSize: '13px', color: '#334155' }}>{viewingGoal.next_steps || 'None specified'}</span>
                    </div>
                    <div style={{ padding: '11px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <AlertCircle size={15} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontSize: '12.5px', color: '#64748B', minWidth: '100px', flexShrink: 0 }}>Challenges Faced</span>
                      <span style={{ fontSize: '13px', color: '#334155' }}>{viewingGoal.challenges || '—'}</span>
                    </div>
                    <div style={{ padding: '11px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Paperclip size={15} color="#64748B" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '12.5px', color: '#64748B', minWidth: '100px', flexShrink: 0 }}>Resources</span>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {(viewingGoal.resources && viewingGoal.resources.length > 0) ? viewingGoal.resources.map((res, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#2563EB', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' }}>
                            <FileText size={13} color="#2563EB" />{res}
                          </span>
                        )) : <span style={{ color: '#94A3B8', fontSize: '13px' }}>No resources attached</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Summary */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>Progress Summary</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '13px', color: '#64748B', minWidth: '110px' }}>Overall Progress</span>
                    <div style={{ flex: 1, height: '8px', borderRadius: '9999px', background: '#E2E8F0', overflow: 'hidden' }}>
                      <div style={{ width: `${viewingGoal.progress || 0}%`, height: '100%', background: '#10B981', borderRadius: '9999px' }} />
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{viewingGoal.progress || 0}%</span>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                    Viewing mode (Click &apos;Enable Edit Mode&apos; to modify fields)
                  </div>
                  <button
                    type="button"
                    onClick={() => { setViewingGoal(null); setDetailsTab('overview'); }}
                    style={{ background: '#FFFFFF', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '9px 22px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {/* ============================================================ */}
            {/* TAB: PROGRESS UPDATES                                         */}
            {/* ============================================================ */}
            {detailsTab === 'progress' && (
              <>
                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '14px', marginBottom: '24px' }}>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px 20px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap' }}>Overall Progress</span>
                      <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>{viewingGoal.progress || 0}%</span>
                    </div>
                    <div style={{ height: '7px', borderRadius: '9999px', background: '#E2E8F0', overflow: 'hidden' }}>
                      <div style={{ width: `${viewingGoal.progress || 0}%`, height: '100%', background: '#10B981', borderRadius: '9999px', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', background: '#FFFFFF' }}>
                    {[
                      { icon: Calendar, label: 'Start Date', val: formatDateDisplay(viewingGoal.start_date) },
                      { icon: Calendar, label: 'Target Date', val: formatDateDisplay(viewingGoal.target_date) },
                      { icon: Clock, label: 'Duration', val: viewingGoal.duration || '0 Days' },
                      { icon: RefreshCw, label: 'Update Frequency', val: viewingGoal.update_frequency || 'Daily' }
                    ].map((item, i) => {
                      const IIcon = item.icon;
                      return (
                        <div key={i} style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px', whiteSpace: 'nowrap' }}>
                            <IIcon size={13} color="#94A3B8" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500, whiteSpace: 'nowrap' }}>{item.label}</span>
                          </div>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>{item.val}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Progress Updates header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Progress Updates</div>
                    <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>A complete history of all progress updates for this goal.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setViewingGoal(null); openUpdateProgressModal(viewingGoal); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px', borderRadius: '10px',
                      border: '1.5px solid #5551FF', background: '#FFFFFF',
                      color: '#5551FF', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                    }}
                  >
                    <Plus size={15} /> Update Progress
                  </button>
                </div>

                {/* Progress history timeline */}
                {((viewingGoal.progress_history || viewingGoal.progressHistory || []).length > 0) ? (
                  <div style={{ position: 'relative' }}>
                    {(viewingGoal.progress_history || viewingGoal.progressHistory || []).map((entry, idx, arr) => {
                      const isLast = idx === arr.length - 1;
                      const formattedDate = formatDateDisplay(entry.date) || '';
                      const dateParts = formattedDate.split(' ');
                      const dayMonth = dateParts.length >= 2 ? `${dateParts[0]} ${dateParts[1]}` : formattedDate;
                      const year = dateParts.length >= 3 ? dateParts[2] : '';
                      return (
                        <div key={idx} style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                          {/* Timeline dot & line */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '20px' }}>
                            <div style={{
                              width: '18px', height: '18px', borderRadius: '50%',
                              background: '#FFFFFF',
                              border: `2.5px solid ${idx === 0 ? '#5551FF' : isLast ? '#CBD5E1' : '#5551FF'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              marginTop: '16px', zIndex: 1
                            }}>
                              {idx === 0 && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#5551FF' }} />}
                            </div>
                            {!isLast && <div style={{ width: '2px', flex: 1, background: '#E2E8F0', marginTop: '4px' }} />}
                          </div>

                          {/* Entry card */}
                          <div style={{
                            flex: 1, border: '1px solid #E2E8F0', borderRadius: '14px',
                            padding: '16px 20px', background: '#FFFFFF',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                              {/* Date box */}
                              <div style={{
                                background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0',
                                padding: '8px 12px', textAlign: 'center', flexShrink: 0, minWidth: '60px'
                              }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>{dayMonth}</div>
                                {year && <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{year}</div>}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>{entry.progress}%</span>
                                  {entry.delta != null && (
                                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                      ↗ +{entry.delta}%
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                                  {entry.title || 'Progress Update'}
                                </div>
                                <div style={{ fontSize: '13px', color: '#475569', marginBottom: '10px', lineHeight: 1.45 }}>
                                  {entry.activities}
                                </div>
                                <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#64748B' }}>
                                    <Clock size={13} color="#94A3B8" /> Time Spent: {entry.timeSpent || '—'}
                                  </span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#64748B' }}>
                                    <FileText size={13} color="#94A3B8" /> Activities: {entry.activityCount || 1}
                                  </span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#64748B' }}>
                                    <Paperclip size={13} color="#94A3B8" /> Attachments: {entry.attachments || 0}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px', flexShrink: 0 }}
                              >
                                <MoreVertical size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94A3B8' }}>
                    <TrendingUp size={36} style={{ marginBottom: '12px', opacity: 0.4 }} />
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>No progress updates yet</div>
                    <div style={{ fontSize: '13px' }}>Click &ldquo;+ Update Progress&rdquo; to log your first update.</div>
                  </div>
                )}

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => { setViewingGoal(null); setDetailsTab('overview'); }}
                    style={{ background: '#FFFFFF', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '9px 22px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {/* ============================================================ */}
            {/* TAB: MILESTONES                                               */}
            {/* ============================================================ */}
            {detailsTab === 'milestones' && (
              <>
                {/* Stats row (same as progress tab) */}
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '14px', marginBottom: '24px' }}>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px 20px', background: '#FFFFFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap' }}>Overall Progress</span>
                      <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>{viewingGoal.progress || 0}%</span>
                    </div>
                    <div style={{ height: '7px', borderRadius: '9999px', background: '#E2E8F0', overflow: 'hidden' }}>
                      <div style={{ width: `${viewingGoal.progress || 0}%`, height: '100%', background: '#10B981', borderRadius: '9999px', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', background: '#FFFFFF' }}>
                    {[
                      { icon: Calendar, label: 'Start Date', val: formatDateDisplay(viewingGoal.start_date) },
                      { icon: Calendar, label: 'Target Date', val: formatDateDisplay(viewingGoal.target_date) },
                      { icon: Clock, label: 'Duration', val: viewingGoal.duration || '0 Days' },
                      { icon: RefreshCw, label: 'Update Frequency', val: viewingGoal.update_frequency || 'Daily' }
                    ].map((item, i) => {
                      const IIcon = item.icon;
                      return (
                        <div key={i} style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px', whiteSpace: 'nowrap' }}>
                            <IIcon size={13} color="#94A3B8" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500, whiteSpace: 'nowrap' }}>{item.label}</span>
                          </div>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>{item.val}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Milestones header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                      Milestones ({(viewingGoal.milestones || []).filter(m => m.status === 'Completed').length}/{(viewingGoal.milestones || []).length})
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>Manage and update all milestones for this goal.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddMilestoneInDetails(v => !v)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px', borderRadius: '10px',
                      border: '1.5px solid #5551FF', background: '#FFFFFF',
                      color: '#5551FF', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                    }}
                  >
                    <Plus size={15} /> Add Milestone
                  </button>
                </div>

                {/* Add milestone inline form */}
                {showAddMilestoneInDetails && (
                  <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: '10px', alignItems: 'flex-end' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Milestone Title</label>
                        <input
                          type="text"
                          placeholder="e.g., Learn React Fundamentals"
                          value={newMilestoneText}
                          onChange={e => setNewMilestoneText(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Target Date</label>
                        <input
                          type="date"
                          value={newMilestoneDate}
                          onChange={e => setNewMilestoneDate(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddMilestoneInDetails}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#5551FF', color: '#FFFFFF', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Milestones table */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                        {['Milestone', 'Target Date', 'Status', 'Last Updated', 'Actions'].map((h, i) => (
                          <th key={i} style={{ padding: '11px 16px', fontSize: '12px', fontWeight: 700, color: '#64748B', textAlign: i === 4 ? 'center' : 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(viewingGoal.milestones || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                            No milestones yet. Click &ldquo;+ Add Milestone&rdquo; to add one.
                          </td>
                        </tr>
                      ) : (viewingGoal.milestones || []).map((m, i) => {
                        const isCompleted = m.status === 'Completed';
                        const isInProgress = m.status === 'In Progress';
                        const isSelected = selectedMilestone?.id === m.id;
                        return (
                          <tr
                            key={m.id || i}
                            style={{ borderBottom: i < (viewingGoal.milestones.length - 1) ? '1px solid #F1F5F9' : 'none', background: isSelected ? '#F5F3FF' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                            onClick={() => {
                              setSelectedMilestone(isSelected ? null : m);
                              setMilestoneStatusEdit(m.status || 'Not Started');
                              setMilestoneNoteEdit(m.note || '');
                            }}
                          >
                            <td style={{ padding: '12px 16px', fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>{m.text}</td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Calendar size={13} color="#94A3B8" />
                                {m.targetDate ? formatDateDisplay(m.targetDate) : '—'}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                background: isCompleted ? '#ECFDF5' : isInProgress ? '#EEF2FF' : '#F8FAFC',
                                color: isCompleted ? '#10B981' : isInProgress ? '#5551FF' : '#64748B'
                              }}>
                                {isCompleted ? <Check size={12} /> : <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />}
                                {m.status || 'Not Started'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>
                              {m.lastUpdated ? formatDateDisplay(m.lastUpdated) : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); setSelectedMilestone(isSelected ? null : m); setMilestoneStatusEdit(m.status || 'Not Started'); setMilestoneNoteEdit(m.note || ''); }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', display: 'flex' }}
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); handleDeleteMilestone(m.id); }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px', display: 'flex' }}
                                >
                                  <Trash2 size={15} color="#EF4444" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Update Milestone Panel */}
                <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '18px 20px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Update Milestone</div>
                    <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
                      {selectedMilestone ? `Editing: "${selectedMilestone.text}"` : 'Update the selected milestone\'s status and notes.'}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr auto', gap: '12px', alignItems: 'flex-start' }}>
                    {/* Status Column */}
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', height: '18px', lineHeight: '18px', marginBottom: '6px' }}>
                        Status <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '8px', borderRadius: '50%', background: milestoneStatusEdit === 'Completed' ? '#10B981' : milestoneStatusEdit === 'In Progress' ? '#5551FF' : '#94A3B8', flexShrink: 0, zIndex: 1 }} />
                        <select
                          value={milestoneStatusEdit}
                          onChange={e => setMilestoneStatusEdit(e.target.value)}
                          style={{
                            width: '100%',
                            height: '42px',
                            boxSizing: 'border-box',
                            padding: '0 12px 0 28px',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            fontSize: '13px',
                            color: '#0F172A',
                            outline: 'none',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                            fontFamily: 'inherit'
                          }}
                        >
                          <option value="Not Started">Not Started</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                    </div>

                    {/* Update Note Column */}
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', height: '18px', lineHeight: '18px', marginBottom: '6px' }}>
                        Update Note
                      </label>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <input
                          type="text"
                          maxLength={200}
                          placeholder="Add a note about the milestone update..."
                          value={milestoneNoteEdit}
                          onChange={e => setMilestoneNoteEdit(e.target.value)}
                          style={{
                            width: '100%',
                            height: '42px',
                            boxSizing: 'border-box',
                            padding: '0 70px 0 14px',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            fontSize: '13px',
                            color: '#0F172A',
                            outline: 'none',
                            background: '#FFFFFF',
                            fontFamily: 'inherit'
                          }}
                        />
                        <span style={{
                          position: 'absolute',
                          right: '14px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '12px',
                          color: '#94A3B8',
                          pointerEvents: 'none'
                        }}>
                          {milestoneNoteEdit.length} / 200
                        </span>
                      </div>
                    </div>

                    {/* Save Button Column */}
                    <div>
                      <div style={{ height: '18px', marginBottom: '6px' }} />
                      <button
                        type="button"
                        onClick={handleUpdateMilestoneStatus}
                        disabled={!selectedMilestone}
                        style={{
                          height: '42px',
                          boxSizing: 'border-box',
                          padding: '0 24px',
                          borderRadius: '10px',
                          border: 'none',
                          background: selectedMilestone ? '#5551FF' : '#E2E8F0',
                          color: selectedMilestone ? '#FFFFFF' : '#94A3B8',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: selectedMilestone ? 'pointer' : 'not-allowed',
                          fontFamily: 'inherit',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Save Update
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => { setViewingGoal(null); setDetailsTab('overview'); }}
                    style={{ background: '#FFFFFF', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '9px 22px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: CREATE GOAL — Two-column layout with Milestones panel      */}
      {/* =================================================================== */}
      {showCreateGoalModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '16px'
        }}>
          <form
            onSubmit={handleCreateGoalSubmit}
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '960px',
              width: '100%',
              maxHeight: '94vh',
              overflowY: 'auto',
              padding: '28px 32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Create Goal
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateGoalModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px', fontFamily: 'inherit' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '28px' }}>

              {/* LEFT COLUMN: Goal Details + Timeline */}
              <div>
                {/* SECTION 1: Goal Details */}
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: '0 0 16px 0' }}>Goal Details</h3>

                {/* Goal Title */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Goal Title <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Learn React.js, Improve UI/UX Skills"
                    value={createTitle}
                    onChange={e => setCreateTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13px',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Category & Priority Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Category <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <BookOpen size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <select
                        value={createCategory}
                        onChange={e => setCreateCategory(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 36px',
                          borderRadius: '10px',
                          border: '1px solid #E2E8F0',
                          fontSize: '13px',
                          color: '#0F172A',
                          outline: 'none',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit',
                          appearance: 'none'
                        }}
                      >
                        <option value="Technical Skills">Technical Skills</option>
                        <option value="Professional Development">Professional Development</option>
                        <option value="Career Development">Career Development</option>
                        <option value="Leadership Standard">Leadership Standard</option>
                        <option value="Strategic Roadmap">Strategic Roadmap</option>
                      </select>
                      <ChevronRight size={14} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Priority <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Flame size={16} color="#EF4444" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <select
                        value={createPriority}
                        onChange={e => setCreatePriority(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 36px',
                          borderRadius: '10px',
                          border: '1px solid #E2E8F0',
                          fontSize: '13px',
                          color: '#0F172A',
                          outline: 'none',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit',
                          appearance: 'none'
                        }}
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                      <ChevronRight size={14} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Description <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    maxLength={300}
                    placeholder="Describe what you want to achieve and why this goal is important."
                    value={createDescription}
                    onChange={e => setCreateDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13px',
                      color: '#0F172A',
                      outline: 'none',
                      lineHeight: 1.5,
                      resize: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                  />
                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    {createDescription.length}/300
                  </div>
                </div>

                {/* Target Outcome */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Target Outcome / Success Criteria <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder={'• e.g., Complete React.js fundamentals\n• Build one complete project\n• Be confident in using React in real projects'}
                    value={createOutcome}
                    onChange={e => setCreateOutcome(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      fontSize: '13px',
                      color: '#0F172A',
                      outline: 'none',
                      lineHeight: 1.6,
                      resize: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* SECTION 2: Timeline & Tracking */}
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: '0 0 14px 0' }}>Timeline & Tracking</h3>

                {/* Start Date, Target Date, Duration */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                      Start Date <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Calendar size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="date"
                        required
                        value={createStartDate}
                        onChange={e => setCreateStartDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 10px 9px 32px',
                          borderRadius: '10px',
                          border: '1px solid #E2E8F0',
                          fontSize: '12.5px',
                          color: '#0F172A',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                      Target Date <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Calendar size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="date"
                        required
                        value={createTargetDate}
                        onChange={e => setCreateTargetDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 10px 9px 32px',
                          borderRadius: '10px',
                          border: '1px solid #E2E8F0',
                          fontSize: '12.5px',
                          color: '#0F172A',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '5px' }}>
                      Duration
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Calendar size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        readOnly
                        value={calculateDurationDays(createStartDate, createTargetDate)}
                        style={{
                          width: '100%',
                          padding: '9px 10px 9px 32px',
                          borderRadius: '10px',
                          border: '1px solid #E2E8F0',
                          background: '#F8FAFC',
                          fontSize: '12.5px',
                          color: '#475569',
                          fontWeight: 600,
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Progress Update Frequency */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      Progress Update Frequency <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <Info size={14} color="#94A3B8" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {['Daily', 'Weekly', 'Custom'].map(freq => {
                      const isSel = createFrequency === freq;
                      return (
                        <div
                          key={freq}
                          onClick={() => setCreateFrequency(freq)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: isSel ? '1.5px solid #5551FF' : '1px solid #E2E8F0',
                            background: isSel ? '#EEF2FF' : '#FFFFFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: isSel ? 'none' : '1.5px solid #CBD5E1',
                            background: isSel ? '#5551FF' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            flexShrink: 0
                          }}>
                            {isSel && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: isSel ? 700 : 500, color: isSel ? '#5551FF' : '#334155' }}>
                            {freq}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Add Milestones panel */}
              <div>
                {/* Add Milestones Banner */}
                <div style={{
                  background: '#F5F3FF',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <div style={{ color: '#5551FF', flexShrink: 0, marginTop: '2px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                      <line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '3px' }}>Add Milestones</div>
                    <div style={{ fontSize: '12.5px', color: '#64748B' }}>Break this goal into smaller, trackable milestones.</div>
                  </div>
                </div>

                {/* Milestones count label */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Milestones</span>
                  {createMilestones.length > 0 && (
                    <span style={{ fontSize: '12px', color: '#64748B' }}>{createMilestones.length} Milestone{createMilestones.length > 1 ? 's' : ''} Added</span>
                  )}
                </div>

                {/* Milestone list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {createMilestones.map((m, idx) => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        background: '#FAFAFA'
                      }}
                    >
                      <span style={{ color: '#94A3B8', cursor: 'grab', flexShrink: 0 }}>⠿</span>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#5551FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Check size={11} strokeWidth={3} color="#FFFFFF" />
                      </div>
                      <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#0F172A', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.text}
                      </span>
                      {m.targetDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <Calendar size={13} color="#94A3B8" />
                          <span style={{ fontSize: '12px', color: '#64748B' }}>{formatDateDisplay(m.targetDate)}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveCreateMilestone(m.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Milestone button / input row */}
                {showAddMilestoneInput ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <input
                      type="text"
                      placeholder="Milestone title..."
                      value={createMilestoneTitleInput}
                      onChange={e => setCreateMilestoneTitleInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCreateMilestone(); } }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '13px',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit'
                      }}
                    />
                    <input
                      type="date"
                      value={createMilestoneDateInput}
                      onChange={e => setCreateMilestoneDateInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '13px',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleAddCreateMilestone}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#5551FF',
                          color: '#FFFFFF',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddMilestoneInput(false)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                          background: '#FFFFFF',
                          color: '#64748B',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddMilestoneInput(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: '1.5px solid #5551FF',
                      background: '#FFFFFF',
                      color: '#5551FF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      marginBottom: '16px'
                    }}
                  >
                    <Plus size={15} /> Add Milestone
                  </button>
                )}

                {/* Note box */}
                <div style={{
                  background: '#F5F3FF',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  border: '1px solid #EDE9FE'
                }}>
                  <div style={{ color: '#5551FF', flexShrink: 0, marginTop: '2px' }}>
                    <Award size={18} color="#5551FF" />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '3px' }}>Note</div>
                    <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                      You can also add, edit, or manage milestones later from the Goal Details page.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #F1F5F9' }}>
              <button
                type="button"
                onClick={() => setShowCreateGoalModal(false)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 28px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#5551FF',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(85, 81, 255, 0.3)',
                  fontFamily: 'inherit'
                }}
              >
                Create Goal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
