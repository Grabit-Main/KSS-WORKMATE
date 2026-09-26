import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import { getTasks, updateTask } from '../api/tasks';
import api from '../api/axios';
import {
  CheckCircle2, Clock, AlertTriangle, PlayCircle, Plus, Calendar, Filter, Sparkles,
  User, FileText, ArrowUpRight, CheckSquare, MessageSquare, AlertCircle, ShieldAlert,
  Flame, Pause, StopCircle, RefreshCw, X, ArrowUpDown, ChevronRight, UserCheck, Layers,
  ListOrdered, Lock, Send, Target, Award, Eye
} from 'lucide-react';
import TaskDetailsModal from '../components/tasks/TaskDetailsModal';

export default function MyWorkPage() {
  const { user } = useAuth();
  const role = user?.role || 'TM';
  const isExecutive = ['CEO', 'CTO'].includes(role);
  const isPM = role === 'PM';
  const isTL = role === 'TL';
  const isDev = !isExecutive && !isPM && !isTL;

  // Global State
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today'); // 'today', 'upcoming', 'overdue', 'completed'
  const [selectedTask, setSelectedTask] = useState(null);

  // Modals & Panels
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [updateProgressModalTask, setUpdateProgressModalTask] = useState(null);
  const [reportBlockerModalTask, setReportBlockerModalTask] = useState(null);
  const [deadlineChangeModalTask, setDeadlineChangeModalTask] = useState(null);

  // Form States
  const [progressVal, setProgressVal] = useState(50);
  const [progressStatus, setProgressStatus] = useState('in_progress');
  const [progressNote, setProgressNote] = useState('');

  const [blockerType, setBlockerType] = useState('Technical');
  const [blockerSeverity, setBlockerSeverity] = useState('High');
  const [blockerDesc, setBlockerDesc] = useState('');
  const [blockerHelper, setBlockerHelper] = useState('');

  const [deadlineReason, setDeadlineReason] = useState('');
  const [requestedDate, setRequestedDate] = useState('');

  // Quick Add State
  const [quickAddType, setQuickAddType] = useState('personal_task'); // 'personal_task', 'work_note'
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddDesc, setQuickAddDesc] = useState('');

  // Local Storage Items: Focus Sessions & Blockers & Personal Tasks
  const [blockersList, setBlockersList] = useState(() => {
    try {
      const saved = localStorage.getItem(`mywork_blockers_${user?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [personalTasks, setPersonalTasks] = useState(() => {
    try {
      const saved = localStorage.getItem(`mywork_personal_${user?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Focus Timer State
  const [focusState, setFocusState] = useState(() => {
    try {
      const saved = localStorage.getItem(`mywork_focus_${user?.id}`);
      return saved ? JSON.parse(saved) : { active: false, paused: false, taskId: null, taskTitle: '', seconds: 0, goal: '' };
    } catch { return { active: false, paused: false, taskId: null, taskTitle: '', seconds: 0, goal: '' }; }
  });

  // Upcoming Sort
  const [upcomingSort, setUpcomingSort] = useState('dueDate'); // 'dueDate', 'priority', 'project'

  // Drag and drop task order
  const [customTaskOrder, setCustomTaskOrder] = useState([]);

  // Fetch Tasks
  const loadTasks = useCallback(async () => {
    try {
      const data = await getTasks();
      if (Array.isArray(data)) {
        setTasks(data);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Realtime handlers
  const handleRealtimeRefresh = useCallback(() => {
    loadTasks();
  }, [loadTasks]);

  useRealtime('task.created', handleRealtimeRefresh);
  useRealtime('task.status_changed', handleRealtimeRefresh);
  useRealtime('task.reassigned', handleRealtimeRefresh);
  useRealtime('analytics.refresh', handleRealtimeRefresh);

  // Focus Timer Interval
  useEffect(() => {
    let interval = null;
    if (focusState.active && !focusState.paused) {
      interval = setInterval(() => {
        setFocusState(prev => {
          const next = { ...prev, seconds: prev.seconds + 1 };
          localStorage.setItem(`mywork_focus_${user?.id}`, JSON.stringify(next));
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [focusState.active, focusState.paused, user?.id]);

  // Derived Work Lists
  const myAssignedTasks = tasks.filter(t => 
    String(t.assigned_to) === String(user?.id) || 
    t.assignee?.id === user?.id
  );

  const allWorkItems = [...myAssignedTasks, ...personalTasks];

  // Helper date calculations
  const todayStr = new Date().toISOString().split('T')[0];
  
  const todayTasks = allWorkItems.filter(t => {
    if (t.isPersonal) return true;
    if (t.status === 'in_progress' || t.status === 'blocked') return true;
    if (t.deadline && t.deadline.startsWith(todayStr)) return true;
    return false;
  });

  const overdueTasks = allWorkItems.filter(t => {
    if (t.status === 'completed') return false;
    if (!t.deadline) return false;
    return t.deadline.split('T')[0] < todayStr;
  });

  const upcomingTasks = allWorkItems.filter(t => {
    if (t.status === 'completed') return false;
    if (!t.deadline) return true;
    return t.deadline.split('T')[0] > todayStr;
  });

  const completedTasks = allWorkItems.filter(t => t.status === 'completed');

  // Summary Counts
  const counts = {
    today: todayTasks.length,
    inProgress: allWorkItems.filter(t => t.status === 'in_progress').length,
    dueSoon: upcomingTasks.length,
    blocked: blockersList.filter(b => b.status !== 'resolved').length + allWorkItems.filter(t => t.status === 'blocked').length,
    overdue: overdueTasks.length,
    completed: completedTasks.length
  };

  // Drag and Drop Handler
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = Number(e.dataTransfer.getData('text/plain'));
    if (isNaN(dragIndex) || dragIndex === dropIndex) return;

    const list = [...todayTasks];
    const [draggedItem] = list.splice(dragIndex, 1);
    list.splice(dropIndex, 0, draggedItem);
    setCustomTaskOrder(list.map(t => t.id));
  };

  // Submit Update Progress
  const handleSaveProgress = async () => {
    if (!updateProgressModalTask) return;
    try {
      if (updateProgressModalTask.isPersonal) {
        setPersonalTasks(prev => prev.map(pt => pt.id === updateProgressModalTask.id ? { ...pt, progress: progressVal, status: progressStatus } : pt));
      } else {
        await updateTask(updateProgressModalTask.id, {
          status: progressStatus,
          progress: progressVal
        });
        loadTasks();
      }
      setUpdateProgressModalTask(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Blocker
  const handleReportBlocker = async (e) => {
    e.preventDefault();
    if (!blockerDesc.trim()) return;

    const newBlocker = {
      id: Date.now(),
      taskId: reportBlockerModalTask?.id,
      taskTitle: reportBlockerModalTask?.title || 'General Blocker',
      project: reportBlockerModalTask?.project?.name || 'General Project',
      type: blockerType,
      severity: blockerSeverity,
      description: blockerDesc,
      helper: blockerHelper,
      reportedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'active'
    };

    const updated = [newBlocker, ...blockersList];
    setBlockersList(updated);
    localStorage.setItem(`mywork_blockers_${user?.id}`, JSON.stringify(updated));

    // Update task status to blocked if task selected
    if (reportBlockerModalTask && !reportBlockerModalTask.isPersonal) {
      try {
        await updateTask(reportBlockerModalTask.id, { status: 'blocked' });
        loadTasks();
      } catch (err) {}
    }

    setReportBlockerModalTask(null);
    setBlockerDesc('');
    setBlockerHelper('');
  };

  // Start Focus Session
  const handleStartFocusSession = (task) => {
    const newFocus = {
      active: true,
      paused: false,
      taskId: task?.id || 'general',
      taskTitle: task?.title || 'General Deep Work Session',
      seconds: 0,
      goal: `Complete key deliverables for ${task?.title || 'today'}`
    };
    setFocusState(newFocus);
    localStorage.setItem(`mywork_focus_${user?.id}`, JSON.stringify(newFocus));
    setShowFocusModal(true);
  };

  const handlePauseFocus = () => {
    setFocusState(prev => {
      const next = { ...prev, paused: !prev.paused };
      localStorage.setItem(`mywork_focus_${user?.id}`, JSON.stringify(next));
      return next;
    });
  };

  const handleFinishFocus = () => {
    setFocusState(prev => {
      const next = { ...prev, active: false, paused: false };
      localStorage.setItem(`mywork_focus_${user?.id}`, JSON.stringify(next));
      return next;
    });
    setShowFocusModal(false);
  };

  // Quick Add Personal Task / Note
  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;

    if (quickAddType === 'personal_task') {
      const newTask = {
        id: `personal_${Date.now()}`,
        title: quickAddTitle.trim(),
        description: quickAddDesc.trim(),
        isPersonal: true,
        status: 'in_progress',
        priority: 'normal',
        created_at: new Date().toISOString()
      };
      const updated = [newTask, ...personalTasks];
      setPersonalTasks(updated);
      localStorage.setItem(`mywork_personal_${user?.id}`, JSON.stringify(updated));
    }

    setQuickAddTitle('');
    setQuickAddDesc('');
    setShowQuickAdd(false);
  };

  // Format seconds to MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '50px' }}>
      
      {/* HEADER SECTION */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              background: 'var(--brand-500)',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.02em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Sparkles size={13} /> {role} Personal Workspace
            </span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            My Work
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0 0' }}>
            {isExecutive ? "Executive Action Center for high-level commitments, approvals, and decisions." :
             isPM ? "Project coordination center for personal commitments, milestones, and project risks." :
             isTL ? "Team Lead control center for personal priorities and team items requiring attention." :
             "Your personal workspace for managing today's priorities, progress, deadlines and blockers."}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowQuickAdd(true)}
            className="btn btn-secondary"
            style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
          >
            <Plus size={16} /> Quick Add
          </button>
          
          <button
            onClick={() => handleStartFocusSession(todayTasks[0])}
            className="btn btn-primary"
            style={{
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              background: focusState.active ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'var(--brand-600)'
            }}
          >
            <Flame size={16} /> {focusState.active ? `Focusing (${formatTime(focusState.seconds)})` : 'Start Focus'}
          </button>
        </div>
      </div>

      {/* SUMMARY STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckSquare size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{counts.today}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {isExecutive ? "My Commitments" : isPM ? "My Tasks" : "Today's Work"}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{counts.inProgress}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {isExecutive ? "Pending Decisions" : "In Progress"}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{counts.dueSoon}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {isExecutive ? "Approvals" : "Due Soon"}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{counts.blocked}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {isExecutive ? "Critical Attention" : "Blocked Items"}
            </div>
          </div>
        </div>
      </div>

      {/* TEAM LEAD / PM / EXECUTIVE SPECIAL ATTENTION SECTIONS */}
      {isTL && (
        <div className="card" style={{ padding: '24px', marginBottom: '28px', borderLeft: '4px solid var(--brand-500)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={20} color="var(--brand-600)" /> Team Attention & Pending Reviews
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'var(--surface-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Pending Code/Task Reviews</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--brand-600)' }}>{tasks.filter(t => t.status === 'in_review').length} Tasks</div>
            </div>
            <div style={{ background: 'var(--surface-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Team Reported Blockers</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#EF4444' }}>{blockersList.length} Active</div>
            </div>
            <div style={{ background: 'var(--surface-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Upcoming Team Deadlines</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#F59E0B' }}>{overdueTasks.length} Overdue</div>
            </div>
          </div>
        </div>
      )}

      {isExecutive && (
        <div className="card" style={{ padding: '24px', marginBottom: '28px', borderLeft: '4px solid #8B5CF6' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} color="#8B5CF6" /> Executive Priorities & Decision Queue
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'var(--surface-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Pending Approvals</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#8B5CF6' }}>2 Decisions</div>
            </div>
            <div style={{ background: 'var(--surface-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Critical Escalations</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#EF4444' }}>{blockersList.length} Active</div>
            </div>
            <div style={{ background: 'var(--surface-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Upcoming Commitments</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#10B981' }}>Q3 Deliverables</div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE BLOCKERS SECTION */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={20} color="#EF4444" /> Active Work Blockers
        </h2>
        
        {blockersList.length === 0 ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <p style={{ margin: 0, color: '#10B981', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} /> No active blockers. You're clear to continue your work!
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {blockersList.map(b => (
              <div key={b.id} className="card" style={{ padding: '18px', borderLeft: '4px solid #EF4444' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
                    {b.type} Blocker ({b.severity})
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{b.reportedTime}</span>
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>{b.taskTitle}</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>{b.description}</p>
                {b.helper && <div style={{ fontSize: '12px', color: 'var(--brand-600)', fontWeight: 500 }}>Waiting for: {b.helper}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MAIN WORK TABS */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px', gap: '16px' }}>
        {[
          { key: 'today', label: `Today (${counts.today})`, icon: CheckSquare },
          { key: 'upcoming', label: `Upcoming (${counts.dueSoon})`, icon: Calendar },
          { key: 'overdue', label: `Overdue (${counts.overdue})`, icon: AlertTriangle },
          { key: 'completed', label: `Completed (${counts.completed})`, icon: CheckCircle2 }
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

      {/* TAB 1: TODAY WORK LIST (WITH REORDERING & QUICK ACTIONS) */}
      {activeTab === 'today' && (
        <div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[1, 2, 3].map(i => <div key={i} className="card skeleton" style={{ height: '140px' }} />)}
            </div>
          ) : todayTasks.length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <CheckCircle2 size={48} style={{ color: '#10B981', margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>All Caught Up for Today!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px', margin: '6px auto 0 auto' }}>
                You have completed or cleared all priority items for today. Check the Upcoming tab or Start a Focus Session.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {todayTasks.map((t, idx) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, idx)}
                  className="card card-hover"
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    borderLeft: t.status === 'blocked' ? '4px solid #EF4444' : t.status === 'completed' ? '4px solid #10B981' : '4px solid var(--brand-600)',
                    cursor: 'grab'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ListOrdered size={16} style={{ color: 'var(--text-tertiary)', cursor: 'grab' }} title="Drag to reorder priority" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-600)', textTransform: 'uppercase' }}>
                        {t.isPersonal ? 'Personal Item' : t.project?.name || 'Project Task'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: t.priority === 'urgent' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                        color: t.priority === 'urgent' ? '#EF4444' : 'var(--brand-600)'
                      }}>
                        {t.priority || 'Normal'}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: t.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : t.status === 'blocked' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: t.status === 'completed' ? '#10B981' : t.status === 'blocked' ? '#EF4444' : '#F59E0B'
                      }}>
                        {t.status ? t.status.replace('_', ' ').toUpperCase() : 'PENDING'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>{t.title}</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{t.description}</p>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> Due: {t.deadline ? new Date(t.deadline).toLocaleDateString() : 'Today'}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setSelectedTask(t)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Open Task
                      </button>

                      <button
                        onClick={() => {
                          setUpdateProgressModalTask(t);
                          setProgressStatus(t.status || 'in_progress');
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Update Progress
                      </button>

                      <button
                        onClick={() => setReportBlockerModalTask(t)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', color: '#EF4444' }}
                      >
                        Report Blocker
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UPCOMING WORK */}
      {activeTab === 'upcoming' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {upcomingTasks.map(t => (
            <div key={t.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-600)' }}>{t.project?.name || 'Upcoming'}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Due: {t.deadline ? new Date(t.deadline).toLocaleDateString() : 'Next Week'}</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>{t.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{t.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: OVERDUE WORK */}
      {activeTab === 'overdue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {overdueTasks.map(t => (
            <div key={t.id} className="card" style={{ padding: '20px', borderLeft: '4px solid #EF4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444' }}>OVERDUE TASK</span>
                <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>Due: {new Date(t.deadline).toLocaleDateString()}</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>{t.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>{t.description}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setSelectedTask(t)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Open Task</button>
                <button onClick={() => setDeadlineChangeModalTask(t)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--brand-600)' }}>Request Deadline Change</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: COMPLETED WORK */}
      {activeTab === 'completed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {completedTasks.map(t => (
            <div key={t.id} className="card" style={{ padding: '20px', borderLeft: '4px solid #10B981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>COMPLETED</span>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Done</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{t.title}</h3>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: UPDATE PROGRESS */}
      {updateProgressModalTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '450px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Update Progress</h3>
              <button onClick={() => setUpdateProgressModalTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Status</label>
              <select
                value={progressStatus}
                onChange={(e) => setProgressStatus(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              >
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setUpdateProgressModalTask(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveProgress} className="btn btn-primary">Save Update</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REPORT BLOCKER */}
      {reportBlockerModalTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleReportBlocker} className="card" style={{ width: '480px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} /> Report Blocker
              </h3>
              <button type="button" onClick={() => setReportBlockerModalTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Blocker Type</label>
              <select value={blockerType} onChange={(e) => setBlockerType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}>
                <option value="Technical">Technical</option>
                <option value="Dependency">Dependency</option>
                <option value="Requirement">Requirement</option>
                <option value="Access">Access</option>
                <option value="Environment">Environment</option>
                <option value="Review">Review</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Severity</label>
              <select value={blockerSeverity} onChange={(e) => setBlockerSeverity(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Description</label>
              <textarea
                value={blockerDesc}
                onChange={(e) => setBlockerDesc(e.target.value)}
                rows={3}
                placeholder="Explain what is blocking your work..."
                required
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setReportBlockerModalTask(null)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#EF4444' }}>Submit Blocker</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: QUICK ADD */}
      {showQuickAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleQuickAddSubmit} className="card" style={{ width: '480px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Quick Add Item</h3>
              <button type="button" onClick={() => setShowQuickAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Title</label>
              <input
                type="text"
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                placeholder="Item title..."
                required
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Details</label>
              <textarea
                value={quickAddDesc}
                onChange={(e) => setQuickAddDesc(e.target.value)}
                rows={3}
                placeholder="Additional notes..."
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowQuickAdd(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Save Personal Item</button>
            </div>
          </form>
        </div>
      )}

      {/* FOCUS SESSION OVERLAY */}
      {showFocusModal && focusState.active && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div className="card" style={{ width: '450px', padding: '36px', textAlign: 'center', background: 'var(--surface)' }}>
            <Flame size={48} style={{ color: 'var(--brand-600)', margin: '0 auto 16px auto' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0' }}>Focus Session Active</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '0 0 24px 0' }}>{focusState.taskTitle}</p>
            
            <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--brand-600)', letterSpacing: '0.04em', margin: '0 0 28px 0' }}>
              {formatTime(focusState.seconds)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
              <button onClick={handlePauseFocus} className="btn btn-secondary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pause size={18} /> {focusState.paused ? 'Resume' : 'Pause'}
              </button>
              <button onClick={handleFinishFocus} className="btn btn-primary" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px', background: '#10B981' }}>
                <StopCircle size={18} /> Finish Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TASK DETAILS MODAL */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={loadTasks}
        />
      )}
    </div>
  );
}
