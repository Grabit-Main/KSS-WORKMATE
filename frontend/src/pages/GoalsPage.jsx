import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import {
  Target, Award, TrendingUp, CheckCircle2, Flame, Plus, Calendar, Star,
  BookOpen, Compass, Shield, Zap, Sparkles, Filter, ChevronRight, X, Layers,
  CheckSquare, AlertTriangle, Clock, Lock, Eye, Users, User, ArrowUpRight
} from 'lucide-react';

export default function GoalsPage() {
  const { user } = useAuth();
  const role = user?.role || 'TM';
  const isExecutive = ['CEO', 'CTO'].includes(role);
  const isPM = role === 'PM';
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
          status: 'In Progress',
          milestones: [
            { id: 101, text: 'Complete architecture review & document best practices', status: 'Completed' },
            { id: 102, text: 'Build modular component library & enforce linting', status: 'In Progress' },
            { id: 103, text: 'Conduct performance profiling & reduce bundle size', status: 'Upcoming' }
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
          milestones: [
            { id: 201, text: 'Submit daily standup logs every weekday', status: 'Completed' },
            { id: 202, text: 'Resolve active task blockers within 24 hours', status: 'Completed' }
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
  const getGoalProgress = (milestones = []) => {
    if (!milestones || milestones.length === 0) return 0;
    const done = milestones.filter(m => m.status === 'Completed').length;
    return Math.round((done / milestones.length) * 100);
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
        const nextProgress = getGoalProgress(updatedMs);
        const nextStatus = nextProgress === 100 ? 'Completed' : 'In Progress';
        return { ...g, milestones: updatedMs, status: nextStatus };
      }
      return g;
    });
    saveGoals(updated);
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
  
  const avgProgress = goalsList.length > 0 
    ? Math.round(goalsList.reduce((acc, g) => acc + getGoalProgress(g.milestones), 0) / goalsList.length)
    : 0;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '50px' }}>
      
      {/* HEADER BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        marginBottom: '28px',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Target size={18} color="var(--brand-600)" />
            <span style={{ color: 'var(--brand-600)', fontSize: '13px', fontWeight: 600 }}>Personal & Career Development</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Goals & Growth
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0 0' }}>
            {isExecutive ? "Strategic organizational goals, technology roadmaps, and leadership milestones." :
             isPM ? "Project delivery targets, professional development, and process milestones." :
             isTL ? "Team leadership, mentorship targets, and technical growth plans." :
             "Set measurable personal goals, track skill development, and unlock achievements."}
          </p>
        </div>

        <button
          onClick={() => setShowCreateGoalModal(true)}
          className="btn btn-primary"
          style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
        >
          <Plus size={16} /> Create Goal
        </button>
      </div>

      {/* TOP SUMMARY METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{activeGoalsCount}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Goals</div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{completedGoalsCount}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Completed</div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{atRiskCount}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>At Risk</div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.12)', color: '#A855F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{avgProgress}%</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Growth Progress</div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px', gap: '16px' }}>
        {[
          { key: 'goals', label: `My Goals (${goalsList.length})`, icon: Target },
          { key: 'growth', label: 'Growth Plan', icon: Compass },
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
                padding: '12px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--brand-600)' : '3px solid transparent',
                color: isActive ? 'var(--brand-600)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={18} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: MY GOALS */}
      {activeTab === 'goals' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {goalsList.map(g => {
            const progress = getGoalProgress(g.milestones);
            return (
              <div key={g.id} className="card card-hover" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: '4px', background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
                      {g.type}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', background: g.status === 'Completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)', color: g.status === 'Completed' ? '#10B981' : 'var(--brand-600)' }}>
                      {g.status}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0', lineHeight: 1.3 }}>{g.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px 0', lineHeight: 1.4 }}>{g.description}</p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Goal Progress</span>
                    <span style={{ color: 'var(--brand-600)' }}>{progress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden', marginBottom: '16px' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #6366F1, #8B5CF6)', borderRadius: '4px' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> Target: {new Date(g.target_date).toLocaleDateString()}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Lock size={12} /> {g.visibility}</span>
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
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Current Development Role: {role}</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Skill matrix for personal growth. Note: Skill development is tracked independently from official KPI performance scoring.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#10B981" /> Verified Current Skills
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {skillsPlan.currentSkills.map((s, i) => (
                  <span key={i} style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontSize: '13px', fontWeight: 600 }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="var(--brand-600)" /> Skills to Improve
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {skillsPlan.skillsToImprove.map((s, i) => (
                  <span key={i} style={{ padding: '6px 12px', borderRadius: '20px', background: 'var(--brand-50)', color: 'var(--brand-600)', fontSize: '13px', fontWeight: 600 }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={18} color="#A855F7" /> Target Skills
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {skillsPlan.targetSkills.map((s, i) => (
                  <span key={i} style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(168, 85, 247, 0.15)', color: '#A855F7', fontSize: '13px', fontWeight: 600 }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Add Skill Form */}
          <form onSubmit={handleAddSkill} className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Add New Skill:</span>
            <input
              type="text"
              value={newSkillText}
              onChange={(e) => setNewSkillText(e.target.value)}
              placeholder="e.g. Next.js, Docker..."
              style={{ flex: 1, minWidth: '200px', padding: '9px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
            />
            <select
              value={skillCategory}
              onChange={(e) => setSkillCategory(e.target.value)}
              style={{ padding: '9px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '13px' }}
            >
              <option value="toImprove">Skills to Improve</option>
              <option value="current">Current Skills</option>
              <option value="target">Target Skills</option>
            </select>
            <button type="submit" className="btn btn-primary" style={{ padding: '9px 18px' }}><Plus size={16} /> Add Skill</button>
          </form>
        </div>
      )}

      {/* TAB 3: MILESTONES CHECKLIST */}
      {activeTab === 'milestones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {goalsList.map(g => (
            <div key={g.id} className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
                {g.title} <span style={{ fontSize: '13px', color: 'var(--brand-600)', fontWeight: 600, marginLeft: '8px' }}>({getGoalProgress(g.milestones)}% Done)</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {g.milestones.map(m => {
                  const isDone = m.status === 'Completed';
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleToggleMilestone(g.id, m.id)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: isDone ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface)',
                        border: isDone ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: isDone ? 'none' : '2px solid var(--text-tertiary)',
                          background: isDone ? '#10B981' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff'
                        }}>
                          {isDone && <CheckCircle2 size={16} />}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}>
                          {m.text}
                        </span>
                      </div>

                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: isDone ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-glass)', color: isDone ? '#10B981' : 'var(--text-tertiary)' }}>
                        {m.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: ACHIEVEMENTS */}
      {activeTab === 'achievements' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {achievements.map(a => (
            <div key={a.id} className="card card-hover" style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '32px', background: 'var(--surface-glass)', padding: '12px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                {a.icon}
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--brand-600)', letterSpacing: '0.04em' }}>{a.category}</span>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 6px 0' }}>{a.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>{a.desc}</p>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Unlocked: {a.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CREATE GOAL */}
      {showCreateGoalModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleCreateGoalSubmit} className="card" style={{ width: '520px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={20} color="var(--brand-600)" /> Create Development Goal
              </h3>
              <button type="button" onClick={() => setShowCreateGoalModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Goal Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Master Microservices Architecture..."
                required
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Type</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}>
                  <option value="Technical">Technical</option>
                  <option value="Professional">Professional</option>
                  <option value="Project">Project</option>
                  <option value="Team">Team</option>
                  <option value="Leadership">Leadership</option>
                  <option value="Learning">Learning</option>
                  <option value="Strategic">Strategic</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Target Date</label>
                <input type="date" value={newTargetDate} onChange={(e) => setNewTargetDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }} />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description</label>
              <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} placeholder="Explain goal objectives..." style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Success Criteria / Milestones (1 per line)</label>
              <textarea value={newCriteriaText} onChange={(e) => setNewCriteriaText(e.target.value)} rows={3} placeholder="Complete online course&#10;Build demo application..." style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowCreateGoalModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Save Goal</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
