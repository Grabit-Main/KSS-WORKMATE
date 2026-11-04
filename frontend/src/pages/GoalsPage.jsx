import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import goalsGrowth3d from '../assets/goals_growth_3d.png';
import {
  Target, Award, TrendingUp, CheckCircle2, Plus, Calendar,
  ChevronRight, ChevronLeft, X, Clock,
  Search, MoreVertical, SlidersHorizontal, Flame, BookOpen,
  Upload, Paperclip, Info, FileText, Minus, Check,
  Pencil, ChevronsUpDown, AlertCircle, Sparkles
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

// Initial Default Goals matching design screenshot
const INITIAL_GOALS = [
  {
    id: 1,
    title: 'Learn React.js',
    category: 'Technical Skills',
    type: 'Technical',
    priority: 'High',
    start_date: '2026-11-04',
    target_date: '2026-12-19',
    duration: '45 Days',
    progress: 35,
    milestones_completed: 2,
    milestones_total: 6,
    update_frequency: 'Daily',
    status: 'In Progress',
    time_spent: '18 hrs',
    icon_type: 'react',
    description: 'Build a strong foundation in React and develop a complete project.',
    target_outcome: 'Complete React.js fundamentals.\nBuild one complete project.\nBe confident in using React in real projects.',
    next_steps: 'Learn React Hooks (useState, useEffect) and practice with examples.',
    challenges: 'Still a bit unclear about lifecycle and useEffect dependencies.',
    activities: 'Learned React components and props.\nPracticed creating reusable components.\nImplemented basic component structure in a demo project.',
    resources: ['React_Notes.pdf', 'Component_Guide.pdf', 'Project_Reference.pdf'],
    milestones: [
      { id: 101, text: 'Complete React.js fundamentals', status: 'Completed' },
      { id: 102, text: 'Practiced creating reusable components', status: 'Completed' },
      { id: 103, text: 'Learn React Hooks (useState, useEffect)', status: 'In Progress' },
      { id: 104, text: 'Build one complete demo project', status: 'Upcoming' },
      { id: 105, text: 'State management architecture', status: 'Upcoming' },
      { id: 106, text: 'Final code review and performance tuning', status: 'Upcoming' }
    ]
  },
  {
    id: 2,
    title: 'Improve Figma Prototyping Skills',
    category: 'Professional Development',
    type: 'Professional',
    priority: 'Medium',
    start_date: '2026-10-28',
    target_date: '2026-11-28',
    duration: '31 Days',
    progress: 60,
    milestones_completed: 3,
    milestones_total: 5,
    update_frequency: 'Weekly',
    status: 'In Progress',
    time_spent: '12 hrs',
    icon_type: 'figma',
    description: 'Enhance prototyping velocity and master Figma interactive components.',
    target_outcome: 'Build high-fidelity prototypes with interactive states and micro-interactions.',
    next_steps: 'Master variables and advanced prototyping modes.',
    challenges: 'Complex component variants nesting.',
    activities: 'Designed interactive components and micro-interactions in Figma.',
    resources: ['Figma_Tokens_Guide.pdf', 'Prototype_Design_Kit.fig'],
    milestones: [
      { id: 201, text: 'Auto-layout and component variants', status: 'Completed' },
      { id: 202, text: 'Interactive component prototyping', status: 'Completed' },
      { id: 203, text: 'Design system token alignment', status: 'Completed' },
      { id: 204, text: 'Variables and conditional prototyping', status: 'In Progress' },
      { id: 205, text: 'User testing playback walkthrough', status: 'Upcoming' }
    ]
  },
  {
    id: 3,
    title: 'Prepare for UI/UX Certification',
    category: 'Career Development',
    type: 'Career',
    priority: 'Medium',
    start_date: '2026-11-10',
    target_date: '2026-12-31',
    duration: '51 Days',
    progress: 20,
    milestones_completed: 1,
    milestones_total: 4,
    update_frequency: 'Weekly',
    status: 'Not Started',
    time_spent: '4 hrs',
    icon_type: 'book',
    description: 'Prepare comprehensively for industry recognized UI/UX certification.',
    target_outcome: 'Pass the certified UX professional exam with distinction.',
    next_steps: 'Complete Module 1 quizzes and practical assignments.',
    challenges: 'Balancing study hours with daily sprint deliverables.',
    activities: 'Reviewed certification syllabus and initial study material.',
    resources: ['UX_Curriculum.pdf', 'Exam_Sample_Questions.pdf'],
    milestones: [
      { id: 301, text: 'Review certification curriculum', status: 'Completed' },
      { id: 302, text: 'UX research methodologies', status: 'Upcoming' },
      { id: 303, text: 'Usability heuristics and evaluation', status: 'Upcoming' },
      { id: 304, text: 'Mock exam and final assessment', status: 'Upcoming' }
    ]
  }
];

export default function GoalsPage() {
  const { user } = useAuth();
  const role = user?.role || 'TM';

  // Active Tab: 'goals', 'growth', 'achievements' (Notice: 'milestones' button removed!)
  const [activeTab, setActiveTab] = useState('goals');

  // Goals State with localStorage persistence
  const [goalsList, setGoalsList] = useState(() => {
    try {
      const saved = localStorage.getItem(`workos_goals_v2_${user?.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].category) {
          return parsed;
        }
      }
      return INITIAL_GOALS;
    } catch {
      return INITIAL_GOALS;
    }
  });

  // Save Goals to LocalStorage
  const saveGoals = (updated) => {
    setGoalsList(updated);
    try {
      localStorage.setItem(`workos_goals_v2_${user?.id}`, JSON.stringify(updated));
    } catch {}
  };

  // Realtime Sync Handler
  const handleRealtimeUpdate = useCallback(() => {
    try {
      const saved = localStorage.getItem(`workos_goals_v2_${user?.id}`);
      if (saved) setGoalsList(JSON.parse(saved));
    } catch {}
  }, [user?.id]);

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

  const handleAddCreateResource = () => {
    if (createResourceInput.trim()) {
      setCreateResourcesList([...createResourcesList, createResourceInput.trim()]);
      setCreateResourceInput('');
    }
  };

  const handleRemoveCreateResource = (index) => {
    setCreateResourcesList(createResourcesList.filter((_, i) => i !== index));
  };

  const handleCreateGoalSubmit = (e) => {
    e.preventDefault();
    if (!createTitle.trim()) return;

    const durationDays = calculateDurationDays(createStartDate, createTargetDate);
    const newGoal = {
      id: Date.now(),
      title: createTitle.trim(),
      category: createCategory,
      type: createCategory.includes('Technical') ? 'Technical' : 'Professional',
      priority: createPriority,
      start_date: createStartDate,
      target_date: createTargetDate,
      duration: durationDays,
      progress: 0,
      milestones_completed: 0,
      milestones_total: 3,
      update_frequency: createFrequency,
      status: 'In Progress',
      time_spent: '0 hrs',
      icon_type: createTitle.toLowerCase().includes('react') ? 'react' : createTitle.toLowerCase().includes('figma') ? 'figma' : 'book',
      description: createDescription.trim(),
      target_outcome: createOutcome.trim(),
      next_steps: 'Define initial milestones and review curriculum.',
      challenges: '',
      activities: 'Goal created.',
      resources: createResourcesList.length > 0 ? createResourcesList : ['Study_Plan.pdf'],
      milestones: [
        { id: Date.now() + 1, text: 'Initial research & planning', status: 'In Progress' },
        { id: Date.now() + 2, text: 'Complete milestone deliverables', status: 'Upcoming' },
        { id: Date.now() + 3, text: 'Final assessment & review', status: 'Upcoming' }
      ]
    };

    saveGoals([newGoal, ...goalsList]);
    setShowCreateGoalModal(false);
    // Reset fields
    setCreateTitle('');
    setCreateDescription('');
    setCreateOutcome('');
    setCreateResourcesList([]);
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

  const handleSaveProgress = (e) => {
    e.preventDefault();
    if (!updatingGoal) return;

    const newProg = Math.max(0, Math.min(100, Number(progressPercent)));
    const updatedStatus = newProg === 100 ? 'Completed' : (newProg > 0 ? 'In Progress' : updatingGoal.status);

    const updated = goalsList.map(g => {
      if (g.id === updatingGoal.id) {
        return {
          ...g,
          progress: newProg,
          update_frequency: progressFrequency,
          time_spent: timeSpent,
          activities: activities,
          next_steps: nextSteps,
          challenges: challenges,
          status: updatedStatus,
          resources: attachments
        };
      }
      return g;
    });

    saveGoals(updated);
    setUpdatingGoal(null);
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editGoalData, setEditGoalData] = useState(null);

  const openViewDetailsModal = (goal) => {
    setViewingGoal(goal);
    setEditGoalData({ ...goal });
    setIsEditMode(false);
    setActionMenuGoalId(null);
  };

  const handleSaveDetailsEdit = () => {
    if (!editGoalData) return;
    const updated = goalsList.map(g => g.id === editGoalData.id ? editGoalData : g);
    saveGoals(updated);
    setViewingGoal(editGoalData);
    setIsEditMode(false);
  };

  // ==========================================
  // GROWTH PLAN & ACHIEVEMENTS DATA
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

  const achievements = [
    {
      id: 1,
      title: 'Database Recovery & PITR Master',
      category: 'Technical Excellence',
      date: 'Sep 24, 2026',
      icon: '🛡️',
      desc: 'Successfully verified production database PITR backup recovery up to 24-09-2026 with 100% data integrity.'
    },
    {
      id: 2,
      title: '100% On-Time Task Execution',
      category: 'Productivity',
      date: 'Sep 2026',
      icon: '⚡',
      desc: 'Completed all high-priority sprint deliverables without missing project deadlines.'
    }
  ];

  // ==========================================
  // METRICS COMPUTATION (Matching top stat cards)
  // ==========================================
  const activeGoalsCount = goalsList.filter(g => g.status === 'In Progress').length || 1;
  const completedGoalsCount = goalsList.filter(g => g.status === 'Completed').length || 1;
  const upcomingMilestonesCount = 4; // matching design metric: 4 Upcoming Milestones
  const learningHoursText = '18 hrs'; // matching design metric: 18 hrs

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

        {/* Right Section: 3D Illustration & Create Goal Button (NO Milestone button) */}
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

      {/* 2. TOP SUMMARY METRICS ROW (4 Cards matching design) */}
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

      {/* 3. TABS NAVIGATION (Milestones tab button removed from top) */}
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
          <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table style={{
              width: '100%',
              minWidth: '1180px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              whiteSpace: 'nowrap'
            }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid #F1F5F9',
                  background: '#FFFFFF'
                }}>
                  <th style={{ padding: '15px 20px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      GOAL <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '15px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      PRIORITY <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '15px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      START DATE <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '15px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      TARGET DATE <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '15px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      PROGRESS <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '15px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      MILESTONES <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '15px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      UPDATE FREQUENCY <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '15px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      STATUS <ChevronsUpDown size={13} color="#94A3B8" />
                    </span>
                  </th>
                  <th style={{ padding: '15px 20px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredGoals.map((g, index) => {
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
                      <td style={{ padding: '15px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
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
                      <td style={{ padding: '15px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <PriorityTag priority={g.priority} />
                      </td>

                      {/* Start Date Col */}
                      <td style={{ padding: '15px 16px', verticalAlign: 'middle', fontSize: '13px', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {formatDateDisplay(g.start_date)}
                      </td>

                      {/* Target Date Col */}
                      <td style={{ padding: '15px 16px', verticalAlign: 'middle', fontSize: '13px', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {formatDateDisplay(g.target_date)}
                      </td>

                      {/* Progress Col */}
                      <td style={{ padding: '15px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
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
                      <td style={{ padding: '15px 16px', verticalAlign: 'middle', fontSize: '13px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        {g.milestones_completed ?? (g.milestones ? g.milestones.filter(m => m.status === 'Completed').length : 0)} / {g.milestones_total ?? (g.milestones ? g.milestones.length : 0)}
                      </td>

                      {/* Update Frequency Col */}
                      <td style={{ padding: '15px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
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
                      <td style={{ padding: '15px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <StatusTag status={g.status} />
                      </td>

                      {/* Actions Col (3-dot Menu) */}
                      <td style={{ padding: '15px 20px', verticalAlign: 'middle', textAlign: 'right', position: 'relative', whiteSpace: 'nowrap' }}>
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

                        {/* Dropdown Menu Popup */}
                        {isMenuOpen && (
                          <div
                            ref={actionMenuRef}
                            style={{
                              position: 'absolute',
                              right: '20px',
                              top: '48px',
                              width: '168px',
                              background: '#FFFFFF',
                              borderRadius: '12px',
                              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                              border: '1px solid #E2E8F0',
                              padding: '6px',
                              zIndex: 50,
                              textAlign: 'left'
                            }}
                          >
                            <button
                              onClick={() => openUpdateProgressModal(g)}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '9px 12px',
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
                              <TrendingUp size={15} color="#5551FF" />
                              Update Progress
                            </button>
                            <button
                              onClick={() => openViewDetailsModal(g)}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '9px 12px',
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
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
              Showing 1–{filteredGoals.length} of {filteredGoals.length} goals
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              {/* Prev */}
              <button
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
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
              
              <button
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#64748B',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                2
              </button>

              <button
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#64748B',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                3
              </button>

              <span style={{ color: '#94A3B8', fontSize: '13px', padding: '0 2px' }}>...</span>

              <button
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#64748B',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                13
              </button>

              {/* Next */}
              <button
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '24px'
        }}>
          {achievements.map(a => (
            <div
              key={a.id}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
                padding: '24px 26px',
                display: 'flex',
                gap: '18px',
                alignItems: 'flex-start',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
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
                  placeholder="Learned React components and props.&#10;Practiced creating reusable components.&#10;Implemented basic component structure in a demo project."
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
                    placeholder="Learn React Hooks (useState, useEffect) and practice with examples."
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
                  placeholder="Still a bit unclear about lifecycle and useEffect dependencies."
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
      {/* MODAL 2: GOAL DETAILS (Matches Image 4)                             */}
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
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            maxWidth: '740px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '28px 34px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Goal Details
                </h2>

                <button
                  type="button"
                  onClick={() => setIsEditMode(!isEditMode)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    border: '1px solid #5551FF',
                    background: isEditMode ? '#5551FF' : '#EEF2FF',
                    color: isEditMode ? '#FFFFFF' : '#5551FF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit'
                  }}
                >
                  <Pencil size={13} /> {isEditMode ? 'Exit Edit Mode' : 'Enable Edit Mode'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setViewingGoal(null);
                  setIsEditMode(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                  padding: '4px',
                  fontFamily: 'inherit'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Goal Header Card */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <GoalIconRenderer goal={viewingGoal} size={48} />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 3px 0' }}>
                    {viewingGoal.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                    {viewingGoal.description}
                  </p>
                </div>
              </div>

              <span style={{
                padding: '5px 14px',
                borderRadius: '9999px',
                background: '#EEF2FF',
                color: '#5551FF',
                fontSize: '12px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5551FF' }} />
                {viewingGoal.status}
              </span>
            </div>

            {/* Section: Goal Information (Grid Table matching Image 4) */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: '0 0 12px 0' }}>
                Goal Information
              </h4>

              <div style={{
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                overflow: 'hidden',
                background: '#FFFFFF'
              }}>
                {/* Row 1: Goal Title & Category */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #E2E8F0' }}>
                  <div style={{ padding: '12px 18px', borderRight: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Target size={16} color="#64748B" />
                    <span style={{ fontSize: '13px', color: '#64748B', width: '90px' }}>Goal Title</span>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editGoalData?.title || ''}
                        onChange={e => setEditGoalData({ ...editGoalData, title: e.target.value })}
                        style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontFamily: 'inherit' }}
                      />
                    ) : (
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{viewingGoal.title}</span>
                    )}
                  </div>

                  <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={16} color="#64748B" />
                    <span style={{ fontSize: '13px', color: '#64748B', width: '90px' }}>Category</span>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editGoalData?.category || ''}
                        onChange={e => setEditGoalData({ ...editGoalData, category: e.target.value })}
                        style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontFamily: 'inherit' }}
                      />
                    ) : (
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{viewingGoal.category}</span>
                    )}
                  </div>
                </div>

                {/* Row 2: Priority & Update Frequency */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #E2E8F0' }}>
                  <div style={{ padding: '12px 18px', borderRight: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Flame size={16} color="#EF4444" />
                    <span style={{ fontSize: '13px', color: '#64748B', width: '90px' }}>Priority</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444' }}>
                      🔥 {viewingGoal.priority}
                    </span>
                  </div>

                  <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={16} color="#64748B" />
                    <span style={{ fontSize: '13px', color: '#64748B', width: '90px' }}>Update Frequency</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{viewingGoal.update_frequency}</span>
                  </div>
                </div>

                {/* Row 3: Start Date & Target Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #E2E8F0' }}>
                  <div style={{ padding: '12px 18px', borderRight: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={16} color="#64748B" />
                    <span style={{ fontSize: '13px', color: '#64748B', width: '90px' }}>Start Date</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{formatDateDisplay(viewingGoal.start_date)}</span>
                  </div>

                  <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Target size={16} color="#64748B" />
                    <span style={{ fontSize: '13px', color: '#64748B', width: '90px' }}>Target Date</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{formatDateDisplay(viewingGoal.target_date)}</span>
                  </div>
                </div>

                {/* Row 4: Duration & Time Spent */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #E2E8F0' }}>
                  <div style={{ padding: '12px 18px', borderRight: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={16} color="#64748B" />
                    <span style={{ fontSize: '13px', color: '#64748B', width: '90px' }}>Duration</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{viewingGoal.duration || '45 Days'}</span>
                  </div>

                  <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={16} color="#64748B" />
                    <span style={{ fontSize: '13px', color: '#64748B', width: '90px' }}>Time Spent</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{viewingGoal.time_spent || '18 hrs'}</span>
                  </div>
                </div>

                {/* Row 5: Description */}
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <FileText size={16} color="#64748B" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#64748B', width: '130px', flexShrink: 0 }}>Description</span>
                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                    {viewingGoal.description}
                  </div>
                </div>

                {/* Row 6: Target Outcome / Success Criteria */}
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <Target size={16} color="#64748B" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#64748B', width: '130px', flexShrink: 0 }}>Target Outcome / Success Criteria</span>
                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                    {viewingGoal.target_outcome ? (
                      viewingGoal.target_outcome.split('\n').map((line, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748B', display: 'inline-block' }} />
                          {line.replace(/^[•\-\*]\s*/, '')}
                        </div>
                      ))
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748B' }} />
                          Complete React.js fundamentals.
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748B' }} />
                          Build one complete project.
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748B' }} />
                          Be confident in using React in real projects.
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Row 7: Next Steps */}
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <ChevronRight size={16} color="#64748B" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#64748B', width: '130px', flexShrink: 0 }}>Next Steps</span>
                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                    {viewingGoal.next_steps || 'Learn React Hooks (useState, useEffect) and practice with examples.'}
                  </div>
                </div>

                {/* Row 8: Challenges Faced */}
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <AlertCircle size={16} color="#64748B" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#64748B', width: '130px', flexShrink: 0 }}>Challenges Faced</span>
                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                    {viewingGoal.challenges || 'Still a bit unclear about lifecycle and useEffect dependencies.'}
                  </div>
                </div>

                {/* Row 9: Resources */}
                <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Paperclip size={16} color="#64748B" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#64748B', width: '130px', flexShrink: 0 }}>Resources</span>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {(viewingGoal.resources || ['React_Notes.pdf', 'Component_Guide.pdf', 'Project_Reference.pdf']).map((res, i) => (
                      <span
                        key={i}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: '#2563EB',
                          fontSize: '12.5px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        <FileText size={13} color="#2563EB" />
                        {res}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Progress Summary */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '16px 20px',
              marginBottom: '26px'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                Progress Summary
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '13px', color: '#64748B', minWidth: '110px' }}>Overall Progress</span>
                <div style={{
                  flex: 1,
                  height: '8px',
                  borderRadius: '9999px',
                  background: '#E2E8F0',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${viewingGoal.progress}%`,
                    height: '100%',
                    background: '#10B981',
                    borderRadius: '9999px'
                  }} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  {viewingGoal.progress}%
                </span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                {isEditMode ? 'Editing mode active' : "Viewing mode (Click 'Enable Edit Mode' to modify fields)"}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={handleSaveDetailsEdit}
                    style={{
                      background: '#5551FF',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '9px 20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    Save Changes
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setViewingGoal(null);
                    setIsEditMode(false);
                  }}
                  style={{
                    background: '#FFFFFF',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    padding: '9px 22px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: CREATE GOAL (Matches Image 5)                              */}
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
          padding: '20px'
        }}>
          <form
            onSubmit={handleCreateGoalSubmit}
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '28px 34px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Create Goal
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateGoalModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                  padding: '4px',
                  fontFamily: 'inherit'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* SECTION 1: Goal Details */}
            <div style={{ marginBottom: '22px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: '0 0 14px 0' }}>
                Goal Details
              </h3>

              {/* Goal Title */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Goal Title <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Learn React.js, Improve Design Skills"
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
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
                      <option value="Technical Skills">Technical Skills</option>
                      <option value="Professional Development">Professional Development</option>
                      <option value="Career Development">Career Development</option>
                      <option value="Leadership Standard">Leadership Standard</option>
                      <option value="Strategic Roadmap">Strategic Roadmap</option>
                    </select>
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
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
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

              {/* Target Outcome / Success Criteria */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Target Outcome / Success Criteria <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="• e.g., Complete React.js fundamentals&#10;• Build one complete project&#10;• Be confident in using React in real projects"
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
            </div>

            {/* SECTION 2: Timeline & Tracking */}
            <div style={{ marginBottom: '26px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: '0 0 14px 0' }}>
                Timeline & Tracking
              </h3>

              {/* Start Date, Target Date, Duration Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Start Date <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="date"
                      required
                      value={createStartDate}
                      onChange={e => setCreateStartDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
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
                    Target Date <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="date"
                      required
                      value={createTargetDate}
                      onChange={e => setCreateTargetDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
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
                    Duration
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Clock size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      readOnly
                      value={calculateDurationDays(createStartDate, createTargetDate)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        background: '#F8FAFC',
                        fontSize: '13px',
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
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Progress Update Frequency <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <Info size={14} color="#94A3B8" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {['Daily', 'Weekly', 'Custom'].map(freq => {
                    const isSelected = createFrequency === freq;
                    return (
                      <div
                        key={freq}
                        onClick={() => setCreateFrequency(freq)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: isSelected ? '1.5px solid #5551FF' : '1px solid #E2E8F0',
                          background: isSelected ? '#EEF2FF' : '#FFFFFF',
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
                          border: isSelected ? 'none' : '1.5px solid #CBD5E1',
                          background: isSelected ? '#5551FF' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF'
                        }}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span style={{ fontSize: '13.5px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#5551FF' : '#334155' }}>
                          {freq}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resources (Optional) */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Resources <span style={{ color: '#94A3B8', fontWeight: 400 }}>(Optional)</span>
                </label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Paperclip size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Add learning links, documents, or references"
                      value={createResourceInput}
                      onChange={e => setCreateResourceInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCreateResource();
                        }
                      }}
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
                  <button
                    type="button"
                    onClick={handleAddCreateResource}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: 'inherit'
                    }}
                  >
                    <Plus size={15} /> Add
                  </button>
                </div>

                {createResourcesList.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {createResourcesList.map((res, i) => (
                      <span
                        key={i}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: '#EEF2FF',
                          color: '#5551FF',
                          fontSize: '12px',
                          fontWeight: 500
                        }}
                      >
                        <FileText size={12} />
                        {res}
                        <X
                          size={13}
                          style={{ cursor: 'pointer', marginLeft: '2px' }}
                          onClick={() => handleRemoveCreateResource(i)}
                        />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowCreateGoalModal(false)}
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
                Create Goal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
