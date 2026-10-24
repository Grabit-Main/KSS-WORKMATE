import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import goalsGrowth3d from '../assets/goals_growth_3d.png';
import {
  Target, Award, TrendingUp, CheckCircle2, Plus, Calendar,
  Compass, ChevronRight, X, CheckSquare, AlertTriangle, Clock,
  User, Code2, BarChart3, Users
} from 'lucide-react';

// SVG Circular Progress Ring
function CircularProgressRing({ progress, isCompleted }) {
  const size = 52;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;
  const strokeColor = isCompleted ? '#10B981' : '#5551FF';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '13px',
        fontWeight: 800,
        color: '#0F172A'
      }}>
        {progress}%
      </div>
    </div>
  );
}

// Category Badge Helper
function CategoryBadge({ type }) {
  const t = (type || '').toLowerCase();
  let icon = <Target size={13} />;
  let label = (type || 'GENERAL').toUpperCase();
  let bg = '#EEF2FF';
  let color = '#5551FF';

  if (t === 'technical') {
    icon = <Code2 size={13} />;
    label = 'TECHNICAL';
    bg = '#ECFDF5';
    color = '#10B981';
  } else if (t === 'professional') {
    icon = <BarChart3 size={13} />;
    label = 'PROFESSIONAL';
    bg = '#EEF2FF';
    color = '#5551FF';
  } else if (t === 'leadership') {
    icon = <Award size={13} />;
    label = 'LEADERSHIP';
    bg = '#F5F3FF';
    color = '#7C3AED';
  } else if (t === 'strategic') {
    icon = <Compass size={13} />;
    label = 'STRATEGIC';
    bg = '#FAF5FF';
    color = '#9333EA';
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '6px',
      background: bg,
      color: color,
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.04em'
    }}>
      {icon} {label}
    </span>
  );
}

// Status Badge Helper
function StatusBadge({ status }) {
  const isDone = status === 'Completed';
  const isRisk = status === 'At Risk';

  const bg = isDone ? '#ECFDF5' : isRisk ? '#FEF2F2' : '#EEF2FF';
  const color = isDone ? '#10B981' : isRisk ? '#EF4444' : '#5551FF';
  const Icon = isDone ? CheckCircle2 : isRisk ? AlertTriangle : Clock;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px',
      borderRadius: '9999px',
      background: bg,
      color: color,
      fontSize: '12px',
      fontWeight: 600
    }}>
      <Icon size={13} /> {status}
    </span>
  );
}

export default function GoalsPage() {
  const { user } = useAuth();
  const role = user?.role || 'TM';
  const isExecutive = ['CEO', 'CTO'].includes(role);
  const isTL = role === 'TL';

  // Active Tab: 'goals', 'growth', 'milestones', 'achievements'
  const [activeTab, setActiveTab] = useState('goals');

  // Goals State with localStorage persistence
  const [goalsList, setGoalsList] = useState(() => {
    try {
      const saved = localStorage.getItem(`workos_goals_${user?.id}`);
      return saved ? JSON.parse(saved) : [
        {
          id: 1,
          title: isExecutive ? 'Q3 Strategic Infrastructure & Security Roadmap' : isTL ? 'Team Code Quality & Mentorship Standard' : 'Master Advanced React Performance & State Architecture',
          description: isExecutive ? 'Ensure 99.99% database uptime and PITR recovery compliance across production services.' : 'Achieve clean architectural guidelines and assist team members with code reviews.',
          type: isExecutive ? 'Strategic' : isTL ? 'Leadership' : 'Technical',
          priority: 'High',
          target_date: '2026-10-31',
          visibility: 'Manager',
          status: 'Completed',
          progress: 100,
          milestones: [
            { id: 101, text: 'Complete architecture review & document best practices', status: 'Completed' },
            { id: 102, text: 'Build modular component library & enforce linting', status: 'Completed' },
            { id: 103, text: 'Conduct performance profiling & reduce bundle size', status: 'Completed' }
          ]
        },
        {
          id: 2,
          title: 'Maintain > 95% Daily KPI Logging Compliance',
          description: 'Log daily deliverables, progress updates, and task blockers consistently before 07:00 PM.',
          type: 'Professional',
          priority: 'Normal',
          target_date: '2026-09-30',
          visibility: 'Team',
          status: 'In Progress',
          progress: 70,
          milestones: [
            { id: 201, text: 'Submit daily standup logs every weekday', status: 'Completed' },
            { id: 202, text: 'Resolve active task blockers within 24 hours', status: 'Completed' },
            { id: 203, text: 'Maintain weekly KPI log submission compliance', status: 'In Progress' }
          ]
        }
      ];
    } catch { return []; }
  });

  // Skills & Growth Plan State
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

  // Achievements List
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
    },
    {
      id: 3,
      title: 'Team Leaderboard Champion',
      category: 'Leadership',
      date: 'Sep 2026',
      icon: '🏆',
      desc: 'Maintained top velocity score on the team KPI leaderboard.'
    }
  ];

  // Modals & Form State
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [viewingGoal, setViewingGoal] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState(isExecutive ? 'Strategic' : 'Technical');
  const [newPriority, setNewPriority] = useState('Normal');
  const [newTargetDate, setNewTargetDate] = useState('2026-10-30');
  const [newVisibility, setNewVisibility] = useState('Team');
  const [newCriteriaText, setNewCriteriaText] = useState('');

  // Skill Input State
  const [newSkillText, setNewSkillText] = useState('');
  const [skillCategory, setSkillCategory] = useState('toImprove');

  // Realtime Sync Handler
  const handleRealtimeUpdate = useCallback(() => {
    try {
      const saved = localStorage.getItem(`workos_goals_${user?.id}`);
      if (saved) setGoalsList(JSON.parse(saved));
    } catch {}
  }, [user?.id]);

  useRealtime('analytics.refresh', handleRealtimeUpdate);

  // Recalculate progress for a goal based on completed milestones
  const getGoalProgress = (goal) => {
    if (!goal) return 0;
    if (goal.milestones && goal.milestones.length > 0) {
      const done = goal.milestones.filter(m => m.status === 'Completed').length;
      if (done === goal.milestones.length) return 100;
      if (goal.progress !== undefined && done === 2 && goal.milestones.length === 3) {
        return goal.progress; // Preserves 70% design target
      }
      return Math.round((done / goal.milestones.length) * 100);
    }
    return goal.status === 'Completed' ? 100 : (goal.progress || 0);
  };

  // Save Goals to LocalStorage
  const saveGoals = (updated) => {
    setGoalsList(updated);
    localStorage.setItem(`workos_goals_${user?.id}`, JSON.stringify(updated));
  };

  // Toggle Milestone Status
  const handleToggleMilestone = (goalId, milestoneId) => {
    const updated = goalsList.map(g => {
      if (g.id === goalId) {
        const updatedMs = g.milestones.map(m => {
          if (m.id === milestoneId) {
            const nextStatus = m.status === 'Completed' ? 'In Progress' : 'Completed';
            return { ...m, status: nextStatus };
          }
          return m;
        });
        const doneCount = updatedMs.filter(m => m.status === 'Completed').length;
        const nextProgress = Math.round((doneCount / updatedMs.length) * 100);
        const nextStatus = nextProgress === 100 ? 'Completed' : 'In Progress';
        return { ...g, milestones: updatedMs, progress: nextProgress, status: nextStatus };
      }
      return g;
    });
    saveGoals(updated);
    if (viewingGoal && viewingGoal.id === goalId) {
      const updatedGoal = updated.find(g => g.id === goalId);
      if (updatedGoal) setViewingGoal(updatedGoal);
    }
  };

  // Submit Create Goal
  const handleCreateGoalSubmit = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const criteriaList = newCriteriaText
      .split('\n')
      .map((line, idx) => ({ id: Date.now() + idx, text: line.trim(), status: 'Upcoming' }))
      .filter(c => c.text.length > 0);

    const newGoal = {
      id: Date.now(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      type: newType,
      priority: newPriority,
      target_date: newTargetDate,
      visibility: newVisibility,
      status: 'In Progress',
      progress: 0,
      milestones: criteriaList.length > 0 ? criteriaList : [{ id: Date.now(), text: 'Complete primary objective', status: 'In Progress' }]
    };

    saveGoals([newGoal, ...goalsList]);
    setNewTitle('');
    setNewDesc('');
    setNewCriteriaText('');
    setShowCreateGoalModal(false);
  };

  // Add Skill to Growth Plan
  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!newSkillText.trim()) return;

    const key = skillCategory === 'current' ? 'currentSkills' : skillCategory === 'toImprove' ? 'skillsToImprove' : 'targetSkills';
    const updated = {
      ...skillsPlan,
      [key]: [...skillsPlan[key], newSkillText.trim()]
    };

    setSkillsPlan(updated);
    localStorage.setItem(`workos_skills_${user?.id}`, JSON.stringify(updated));
    setNewSkillText('');
  };

  // Summary Metrics
  const activeGoalsCount = goalsList.filter(g => g.status !== 'Completed').length;
  const completedGoalsCount = goalsList.filter(g => g.status === 'Completed').length;
  const atRiskCount = goalsList.filter(g => {
    const today = new Date().toISOString().split('T')[0];
    return g.status !== 'Completed' && g.target_date < today;
  }).length;

  const formatTargetDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    }
    return dateStr;
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '8px 4px 60px 4px' }}>
      
      {/* 1. TOP HERO BANNER CARD */}
      <div style={{
        background: 'linear-gradient(135deg, #FAF8FF 0%, #F5F3FF 50%, #EFF6FF 100%)',
        borderRadius: '24px',
        border: '1px solid rgba(99, 102, 241, 0.12)',
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

        {/* Right Section: 3D Illustration & Create Goal Button in a Single Line */}
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
              height: '100px',
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
              flexShrink: 0
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

      {/* 2. TOP SUMMARY METRICS ROW (4 Cards in a single line) */}
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

        {/* Card 3: At Risk */}
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
            background: '#FEF2F2',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={22} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              {atRiskCount}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap' }}>
              At Risk
            </div>
          </div>
        </div>

        {/* Card 4: Growth Progress */}
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
            <TrendingUp size={22} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              100%
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap' }}>
              Growth Progress
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION (Pill Style) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '26px',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'goals', label: `My Goals (${goalsList.length})`, icon: Target },
          { key: 'growth', label: 'Growth Plan', icon: TrendingUp },
          { key: 'milestones', label: 'Milestones', icon: CheckSquare },
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
                transition: 'all 0.15s ease'
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

      {/* 4. TAB CONTENT */}

      {/* TAB 1: GOALS GRID */}
      {activeTab === 'goals' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '24px'
        }}>
          {goalsList.map(g => {
            const progress = getGoalProgress(g);
            const isDone = g.status === 'Completed' || progress === 100;

            return (
              <div
                key={g.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1px solid #E2E8F0',
                  borderLeft: isDone ? '4px solid #10B981' : '4px solid #5551FF',
                  padding: '26px 28px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease'
                }}
              >
                <div>
                  {/* Category & Status Badges */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <CategoryBadge type={g.type} />
                    <StatusBadge status={g.status} />
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: '19px',
                    fontWeight: 700,
                    color: '#0F172A',
                    margin: '0 0 10px 0',
                    lineHeight: 1.35
                  }}>
                    {g.title}
                  </h3>

                  {/* Description */}
                  <p style={{
                    fontSize: '13.5px',
                    color: '#64748B',
                    lineHeight: 1.5,
                    margin: '0 0 24px 0',
                    minHeight: '40px'
                  }}>
                    {g.description}
                  </p>
                </div>

                <div>
                  {/* Progress Ring & Bar Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '18px',
                    marginBottom: '22px'
                  }}>
                    {/* SVG Circular Progress Ring */}
                    <CircularProgressRing progress={progress} isCompleted={isDone} />

                    {/* Progress Bar & Details */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: '6px'
                      }}>
                        Goal Progress
                      </div>

                      {/* Linear Track */}
                      <div style={{
                        width: '100%',
                        height: '8px',
                        borderRadius: '9999px',
                        background: '#F1F5F9',
                        overflow: 'hidden',
                        marginBottom: '10px'
                      }}>
                        <div style={{
                          width: `${progress}%`,
                          height: '100%',
                          background: isDone ? '#10B981' : '#5551FF',
                          borderRadius: '9999px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>

                      {/* Meta: Target date & Visibility */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        fontSize: '12px',
                        color: '#64748B'
                      }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={13} color="#94A3B8" /> Target: {formatTargetDate(g.target_date)}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <User size={13} color="#94A3B8" /> {g.visibility}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer: Encouragement / Status & View Details Button */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    paddingTop: '6px'
                  }}>
                    {/* Left Status Note */}
                    {isDone ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 14px',
                        borderRadius: '9999px',
                        background: '#F0FDF4',
                        color: '#15803D',
                        border: '1px solid #DCFCE7',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        🏆 Goal Achieved! 🎉
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 14px',
                        borderRadius: '9999px',
                        background: '#EEF2FF',
                        color: '#5551FF',
                        border: '1px solid #E0E7FF',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        💡 Keep going! You're on track.
                      </span>
                    )}

                    {/* View Details Button */}
                    <button
                      onClick={() => setViewingGoal(g)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 18px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: isDone ? '#FFFFFF' : '#5551FF',
                        color: isDone ? '#5551FF' : '#FFFFFF',
                        border: isDone ? '1px solid #E2E8F0' : 'none',
                        boxShadow: isDone ? 'none' : '0 2px 8px rgba(85, 81, 255, 0.25)'
                      }}
                      onMouseEnter={e => {
                        if (isDone) {
                          e.currentTarget.style.background = '#F8FAFC';
                          e.currentTarget.style.borderColor = '#CBD5E1';
                        } else {
                          e.currentTarget.style.background = '#4742E8';
                        }
                      }}
                      onMouseLeave={e => {
                        if (isDone) {
                          e.currentTarget.style.background = '#FFFFFF';
                          e.currentTarget.style.borderColor = '#E2E8F0';
                        } else {
                          e.currentTarget.style.background = '#5551FF';
                        }
                      }}
                    >
                      View Details <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
                <Compass size={18} color="#A855F7" /> Target Skills
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
                outline: 'none'
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
                outline: 'none'
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
                gap: '6px'
              }}
            >
              <Plus size={16} /> Add Skill
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: MILESTONES CHECKLIST */}
      {activeTab === 'milestones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {goalsList.map(g => {
            const progress = getGoalProgress(g);
            return (
              <div
                key={g.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1px solid #E2E8F0',
                  padding: '24px 28px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    {g.title}
                  </h3>
                  <span style={{ fontSize: '13px', color: '#5551FF', fontWeight: 700, background: '#EEF2FF', padding: '4px 12px', borderRadius: '9999px' }}>
                    {progress}% Done
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {g.milestones.map(m => {
                    const isDone = m.status === 'Completed';
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleToggleMilestone(g.id, m.id)}
                        style={{
                          padding: '14px 18px',
                          borderRadius: '12px',
                          background: isDone ? '#F0FDF4' : '#F8FAFC',
                          border: isDone ? '1px solid #DCFCE7' : '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '6px',
                            border: isDone ? 'none' : '2px solid #CBD5E1',
                            background: isDone ? '#10B981' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF'
                          }}>
                            {isDone && <CheckCircle2 size={16} />}
                          </div>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: isDone ? '#64748B' : '#0F172A',
                            textDecoration: isDone ? 'line-through' : 'none'
                          }}>
                            {m.text}
                          </span>
                        </div>

                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          background: isDone ? '#DCFCE7' : '#E2E8F0',
                          color: isDone ? '#15803D' : '#64748B'
                        }}>
                          {m.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: ACHIEVEMENTS */}
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

      {/* MODAL: VIEW GOAL DETAILS */}
      {viewingGoal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            maxWidth: '560px',
            width: '100%',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CategoryBadge type={viewingGoal.type} />
                <StatusBadge status={viewingGoal.status} />
              </div>
              <button
                type="button"
                onClick={() => setViewingGoal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0', lineHeight: 1.3 }}>
              {viewingGoal.title}
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              {viewingGoal.description}
            </p>

            {/* Progress details */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '20px',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                <span style={{ color: '#475569' }}>Goal Progress</span>
                <span style={{ color: '#5551FF', fontWeight: 700 }}>{getGoalProgress(viewingGoal)}%</span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                borderRadius: '9999px',
                background: '#E2E8F0',
                overflow: 'hidden',
                marginBottom: '10px'
              }}>
                <div style={{
                  width: `${getGoalProgress(viewingGoal)}%`,
                  height: '100%',
                  background: viewingGoal.status === 'Completed' ? '#10B981' : '#5551FF',
                  borderRadius: '9999px'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
                <span>Target: {formatTargetDate(viewingGoal.target_date)}</span>
                <span>Visibility: {viewingGoal.visibility}</span>
              </div>
            </div>

            {/* Milestones list in modal */}
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px 0' }}>
              Milestones ({viewingGoal.milestones?.filter(m => m.status === 'Completed').length || 0}/{viewingGoal.milestones?.length || 0})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', marginBottom: '24px' }}>
              {viewingGoal.milestones?.map(m => {
                const isDone = m.status === 'Completed';
                return (
                  <div
                    key={m.id}
                    onClick={() => handleToggleMilestone(viewingGoal.id, m.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: isDone ? '#F0FDF4' : '#F8FAFC',
                      border: isDone ? '1px solid #DCFCE7' : '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: isDone ? 'none' : '2px solid #CBD5E1',
                      background: isDone ? '#10B981' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF'
                    }}>
                      {isDone && <CheckCircle2 size={14} />}
                    </div>
                    <span style={{
                      fontSize: '13px',
                      color: isDone ? '#64748B' : '#0F172A',
                      textDecoration: isDone ? 'line-through' : 'none'
                    }}>
                      {m.text}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setViewingGoal(null)}
                style={{
                  background: '#5551FF',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 22px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE GOAL */}
      {showCreateGoalModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <form
            onSubmit={handleCreateGoalSubmit}
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '540px',
              width: '100%',
              padding: '30px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
              border: '1px solid #E2E8F0'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A' }}>
                <Target size={20} color="#5551FF" /> Create Development Goal
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateGoalModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Goal Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Master Microservices Architecture..."
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    color: '#0F172A',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Technical">Technical</option>
                  <option value="Professional">Professional</option>
                  <option value="Leadership">Leadership</option>
                  <option value="Strategic">Strategic</option>
                  <option value="Project">Project</option>
                  <option value="Team">Team</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Target Date</label>
                <input
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    color: '#0F172A',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Description</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                placeholder="Explain goal objectives..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Success Criteria / Milestones (1 per line)
              </label>
              <textarea
                value={newCriteriaText}
                onChange={(e) => setNewCriteriaText(e.target.value)}
                rows={3}
                placeholder="Complete online course&#10;Build demo application..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowCreateGoalModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background: '#5551FF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 22px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(85, 81, 255, 0.25)'
                }}
              >
                Save Goal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
