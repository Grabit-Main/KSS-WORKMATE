import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import { getTasks } from '../api/tasks';
import api from '../api/axios';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, Filter,
  CheckSquare, Folder, Target, Users, AlertTriangle, Sparkles, X, CheckCircle2,
  Video, Bell, Layers, FileText, ArrowUpRight, Search, Lock, AlertCircle, Eye
} from 'lucide-react';
import TaskDetailsModal from '../components/tasks/TaskDetailsModal';

export default function CalendarPage() {
  const { user } = useAuth();
  const role = user?.role || 'TM';
  const isExecutive = ['CEO', 'CTO'].includes(role);
  const isPM = role === 'PM';
  const isTL = role === 'TL';

  // Calendar View: 'month', 'week', 'day', 'agenda'
  const [viewMode, setViewMode] = useState('month');

  // Selected Date State (Defaults to Sep 2026 / current date)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 26)); // September 26, 2026

  // Real WorkOS Data
  const [tasksList, setTasksList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [goalsList, setGoalsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'tasks', 'projects', 'meetings', 'milestones', 'reviews', 'goals', 'company'
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Task Modal
  const [selectedTask, setSelectedTask] = useState(null);

  // Custom Created Events (localStorage persistence)
  const [customEvents, setCustomEvents] = useState(() => {
    try {
      const saved = localStorage.getItem(`workos_events_${user?.id}`);
      return saved ? JSON.parse(saved) : [
        {
          id: 'evt_1',
          title: 'WorkOS Architecture & PITR Sync Review',
          type: 'Meeting',
          date: '2026-09-26',
          startTime: '14:00',
          endTime: '15:00',
          description: 'Review production database PITR recovery and API route performance.',
          reminder: '15 minutes',
          participants: ['Satya Ranjan Das']
        },
        {
          id: 'evt_2',
          title: 'Q3 Sprint Planning & Release Cut',
          type: 'Release',
          date: '2026-09-28',
          startTime: '10:00',
          endTime: '11:30',
          description: 'Finalize production release features and deployment checklist.',
          reminder: '1 hour',
          participants: ['Team']
        }
      ];
    } catch { return []; }
  });

  // Modal & Conflict States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictingEvent, setConflictingEvent] = useState(null);

  // Form State
  const [evtTitle, setEvtTitle] = useState('');
  const [evtType, setEvtType] = useState('Meeting'); // 'Task Deadline', 'Project Milestone', 'Meeting', 'Review', 'Release', 'Goal Deadline', 'Company Event'
  const [evtDate, setEvtDate] = useState('2026-09-26');
  const [evtStartTime, setEvtStartTime] = useState('11:00');
  const [evtEndTime, setEvtEndTime] = useState('12:00');
  const [evtProjectId, setEvtProjectId] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [evtReminder, setEvtReminder] = useState('15 minutes');

  // Load WorkOS Data
  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const [resTasks, resProj, resUsers] = await Promise.all([
        getTasks().catch(() => []),
        api.get('/projects').catch(() => ({ data: [] })),
        api.get('/users').catch(() => ({ data: [] }))
      ]);

      if (Array.isArray(resTasks)) setTasksList(resTasks);
      if (Array.isArray(resProj.data)) setProjectsList(resProj.data);
      if (Array.isArray(resUsers.data)) setTeamUsers(resUsers.data);

      try {
        const savedGoals = localStorage.getItem(`workos_goals_${user?.id}`);
        if (savedGoals) setGoalsList(JSON.parse(savedGoals));
      } catch {}
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  useRealtime('task.created', loadCalendarData);
  useRealtime('task.status_changed', loadCalendarData);
  useRealtime('analytics.refresh', loadCalendarData);

  // Date Navigation
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 8, 26)); // Sep 26, 2026
  };

  // Build Unified Events Array from Real WorkOS Data
  const unifiedEvents = [];

  // 1. Task Deadlines
  tasksList.forEach(t => {
    if (t.deadline) {
      const dateStr = t.deadline.split('T')[0];
      unifiedEvents.push({
        id: `task_${t.id}`,
        title: t.title,
        type: 'Task Deadline',
        date: dateStr,
        startTime: '18:00',
        endTime: '19:00',
        priority: t.priority,
        status: t.status,
        project: t.project?.name || 'Task Workspace',
        originalTask: t
      });
    }
  });

  // 2. Project Milestones
  projectsList.forEach(p => {
    if (p.deadline) {
      unifiedEvents.push({
        id: `proj_${p.id}`,
        title: `Milestone: ${p.name}`,
        type: 'Project Milestone',
        date: p.deadline.split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        project: p.name
      });
    }
  });

  // 3. Goal Deadlines
  goalsList.forEach(g => {
    if (g.target_date) {
      unifiedEvents.push({
        id: `goal_${g.id}`,
        title: `Goal Target: ${g.title}`,
        type: 'Goal Deadline',
        date: g.target_date,
        startTime: '17:00',
        endTime: '18:00'
      });
    }
  });

  // 4. Custom Events & Meetings
  customEvents.forEach(e => {
    unifiedEvents.push(e);
  });

  // Filter Unified Events
  const filteredEvents = unifiedEvents.filter(evt => {
    if (searchQuery.trim() && !evt.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeFilter === 'tasks') return evt.type === 'Task Deadline';
    if (activeFilter === 'projects') return evt.type === 'Project Milestone';
    if (activeFilter === 'meetings') return evt.type === 'Meeting';
    if (activeFilter === 'milestones') return evt.type === 'Project Milestone';
    if (activeFilter === 'goals') return evt.type === 'Goal Deadline';
    if (activeFilter === 'reviews') return evt.type === 'Review';
    return true;
  });

  // Conflict Detection
  const checkConflict = (date, start, end) => {
    return customEvents.find(e => {
      if (e.date !== date) return false;
      return (start >= e.startTime && start < e.endTime) || (end > e.startTime && end <= e.endTime);
    });
  };

  // Submit Create Event
  const handleSaveEvent = (force = false) => {
    if (!evtTitle.trim()) return;

    if (!force) {
      const conflict = checkConflict(evtDate, evtStartTime, evtEndTime);
      if (conflict) {
        setConflictingEvent(conflict);
        setShowConflictModal(true);
        return;
      }
    }

    const newEvt = {
      id: `evt_${Date.now()}`,
      title: evtTitle.trim(),
      type: evtType,
      date: evtDate,
      startTime: evtStartTime,
      endTime: evtEndTime,
      description: evtDesc.trim(),
      reminder: evtReminder,
      projectId: evtProjectId
    };

    const updated = [newEvt, ...customEvents];
    setCustomEvents(updated);
    localStorage.setItem(`workos_events_${user?.id}`, JSON.stringify(updated));

    setShowCreateModal(false);
    setShowConflictModal(false);
    setEvtTitle('');
    setEvtDesc('');
  };

  // Month Grid Calculation
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const daysArray = [];
  for (let i = 0; i < firstDayIndex; i++) daysArray.push(null);
  for (let d = 1; d <= daysInMonth; d++) daysArray.push(d);

  const monthYearStr = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const todayDateStr = '2026-09-26';

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '50px' }}>
      
      {/* HEADER & CONTROLS */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px 32px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <CalendarIcon size={18} color="var(--brand-600)" />
            <span style={{ color: 'var(--brand-600)', fontSize: '13px', fontWeight: 600 }}>WorkOS Commitment & Schedule Layer</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            WorkOS Calendar
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0 0' }}>
            {isExecutive ? "Executive schedule visualizer for strategic milestones, board reviews & high-level releases." :
             isPM ? "Project schedule visualizer for task deadlines, releases, client meetings & sprint reviews." :
             isTL ? "Team schedule visualizer for reviews, task deadlines & team standups." :
             "Unified timeline connecting task deadlines, project milestones, meetings, and personal goals."}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* View Mode Buttons */}
          <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '3px', border: '1px solid var(--border)' }}>
            {['month', 'week', 'day', 'agenda'].map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: viewMode === m ? 'var(--brand-600)' : 'transparent',
                  color: viewMode === m ? '#fff' : 'var(--text-secondary)',
                  fontWeight: viewMode === m ? 600 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {m}
              </button>
            ))}
          </div>

          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" style={{ padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <Plus size={16} /> Schedule Event
          </button>
        </div>
      </div>

      {/* MONTH NAVIGATION BAR & FILTERS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={handlePrev} className="btn btn-secondary" style={{ padding: '8px 12px' }}><ChevronLeft size={18} /></button>
          <button onClick={handleToday} className="btn btn-secondary" style={{ padding: '8px 16px', fontWeight: 600 }}>Today</button>
          <button onClick={handleNext} className="btn btn-secondary" style={{ padding: '8px 12px' }}><ChevronRight size={18} /></button>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginLeft: '8px' }}>{monthYearStr}</span>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { key: 'all', label: 'All Commitments' },
            { key: 'tasks', label: 'Task Deadlines' },
            { key: 'projects', label: 'Project Milestones' },
            { key: 'meetings', label: 'Meetings' },
            { key: 'goals', label: 'Goal Deadlines' },
            { key: 'reviews', label: 'Reviews' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                border: activeFilter === f.key ? '1px solid var(--brand-500)' : '1px solid var(--border)',
                background: activeFilter === f.key ? 'var(--brand-50)' : 'var(--surface)',
                color: activeFilter === f.key ? 'var(--brand-600)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: activeFilter === f.key ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW MODE 1: MONTH GRID */}
      {viewMode === 'month' && (
        <div className="card" style={{ padding: '24px', overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', minWidth: '800px' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ textAlign: 'center', fontWeight: 700, fontSize: '13px', color: 'var(--text-tertiary)', paddingBottom: '12px' }}>
                {day}
              </div>
            ))}

            {daysArray.map((dayNum, idx) => {
              if (dayNum === null) return <div key={`empty-${idx}`} style={{ minHeight: '110px' }} />;

              const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
              const formattedMonth = (currentDate.getMonth() + 1) < 10 ? `0${currentDate.getMonth() + 1}` : `${currentDate.getMonth() + 1}`;
              const cellDateStr = `${currentDate.getFullYear()}-${formattedMonth}-${formattedDay}`;

              const cellEvents = filteredEvents.filter(e => e.date === cellDateStr);
              const isToday = cellDateStr === todayDateStr;

              return (
                <div
                  key={`day-${dayNum}`}
                  style={{
                    minHeight: '120px',
                    background: isToday ? 'var(--brand-50)' : 'var(--surface)',
                    borderRadius: 'var(--radius-md)',
                    border: isToday ? '2px solid var(--brand-500)' : '1px solid var(--border)',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--brand-600)' : 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{dayNum}</span>
                    {isToday && <span style={{ fontSize: '9px', background: 'var(--brand-500)', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>TODAY</span>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
                    {cellEvents.map(evt => (
                      <div
                        key={evt.id}
                        onClick={() => {
                          if (evt.originalTask) setSelectedTask(evt.originalTask);
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: evt.type === 'Task Deadline' ? 'rgba(99, 102, 241, 0.15)' : evt.type === 'Project Milestone' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                          color: evt.type === 'Task Deadline' ? 'var(--brand-600)' : evt.type === 'Project Milestone' ? '#10B981' : '#A855F7',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={evt.title}
                      >
                        {evt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: AGENDA */}
      {viewMode === 'agenda' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredEvents.map(evt => (
            <div key={evt.id} className="card card-hover" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
                    {evt.type}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}><Clock size={13} /> {evt.date} • {evt.startTime || 'All Day'}</span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{evt.title}</h3>
                {evt.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{evt.description}</p>}
              </div>

              {evt.originalTask && (
                <button onClick={() => setSelectedTask(evt.originalTask)} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                  Open Task
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: SCHEDULE EVENT */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveEvent(false); }} className="card" style={{ width: '500px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={20} color="var(--brand-600)" /> Schedule WorkOS Event
              </h3>
              <button type="button" onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Event Title</label>
              <input
                type="text"
                value={evtTitle}
                onChange={(e) => setEvtTitle(e.target.value)}
                placeholder="e.g. Sprint Architecture Sync..."
                required
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Event Type</label>
                <select value={evtType} onChange={(e) => setEvtType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}>
                  <option value="Meeting">Meeting</option>
                  <option value="Review">Review</option>
                  <option value="Release">Release</option>
                  <option value="Company Event">Company Event</option>
                  <option value="Personal WorkOS Event">Personal WorkOS Event</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Date</label>
                <input type="date" value={evtDate} onChange={(e) => setEvtDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Start Time</label>
                <input type="time" value={evtStartTime} onChange={(e) => setEvtStartTime(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }} />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>End Time</label>
                <input type="time" value={evtEndTime} onChange={(e) => setEvtEndTime(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }} />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description</label>
              <textarea value={evtDesc} onChange={(e) => setEvtDesc(e.target.value)} rows={2} placeholder="Agenda notes..." style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Save Event</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: CONFLICT DETECTION WARNING */}
      {showConflictModal && conflictingEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="card" style={{ width: '460px', padding: '28px', borderLeft: '4px solid #F59E0B' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 10px 0', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} /> Schedule Conflict Detected
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '0 0 16px 0' }}>
              The selected time window (<strong>{evtStartTime} - {evtEndTime}</strong>) overlaps with existing event:
              <br />
              <strong style={{ color: 'var(--text-primary)' }}>{conflictingEvent.title}</strong> ({conflictingEvent.startTime} - {conflictingEvent.endTime})
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowConflictModal(false)} className="btn btn-secondary">Adjust Time</button>
              <button onClick={() => handleSaveEvent(true)} className="btn btn-primary" style={{ background: '#F59E0B' }}>Schedule Anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* TASK DETAILS MODAL */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={loadCalendarData}
        />
      )}
    </div>
  );
}
