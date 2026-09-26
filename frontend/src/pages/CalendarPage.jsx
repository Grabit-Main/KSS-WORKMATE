import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import { getTasks } from '../api/tasks';
import api from '../api/axios';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, Filter,
  CheckSquare, Folder, Target, Users, AlertTriangle, Sparkles, X, CheckCircle2,
  Video, Bell, Layers, FileText, ArrowUpRight, Search, Lock, AlertCircle, Eye,
  MoreHorizontal, Activity, Zap, Compass, Check
} from 'lucide-react';
import TaskDetailsModal from '../components/tasks/TaskDetailsModal';

export default function CalendarPage() {
  const { user } = useAuth();
  const role = user?.role || 'TM';
  const isExecutive = ['CEO', 'CTO'].includes(role);
  const isPM = role === 'PM';
  const isTL = role === 'TL';

  // Active View Mode: 'week', 'month', 'day'
  const [viewMode, setViewMode] = useState('week');

  // Active Selected Date (Default: Sep 2, 2024 / current date)
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 8, 26)); // Sep 26, 2026

  // Real WorkOS Data
  const [tasksList, setTasksList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [goalsList, setGoalsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Task Modal
  const [selectedTask, setSelectedTask] = useState(null);

  // Calendar Category Toggles
  const [categories, setCategories] = useState({
    work: true,
    personal: true,
    learning: true,
    health: true,
    travel: true
  });

  // Custom Events Storage
  const [customEvents, setCustomEvents] = useState(() => {
    try {
      const saved = localStorage.getItem(`workos_events_${user?.id}`);
      return saved ? JSON.parse(saved) : [
        {
          id: 'evt_1',
          title: 'Team Sync',
          category: 'work',
          type: 'Meeting',
          date: '2026-09-26',
          startTime: '11:30 AM',
          endTime: '12:30 PM',
          startHour: 11.5,
          duration: 1,
          hasVideo: true,
          color: '#EFF6FF',
          borderColor: '#3B82F6',
          textColor: '#1E40AF',
          tag: 'Event'
        },
        {
          id: 'evt_2',
          title: 'Design Discussion',
          category: 'work',
          type: 'Review',
          date: '2026-09-26',
          startTime: '11:00 AM',
          endTime: '12:00 PM',
          startHour: 11,
          duration: 1,
          color: '#FEF2F2',
          borderColor: '#F87171',
          textColor: '#991B1B',
          tag: 'High'
        },
        {
          id: 'evt_3',
          title: 'Client Presentation',
          category: 'work',
          type: 'Meeting',
          date: '2026-09-27',
          startTime: '02:00 PM',
          endTime: '03:00 PM',
          startHour: 14,
          duration: 1,
          color: '#ECFDF5',
          borderColor: '#10B981',
          textColor: '#065F46',
          tag: 'Work'
        },
        {
          id: 'evt_4',
          title: 'Gym & Fitness',
          category: 'health',
          type: 'Habit',
          date: '2026-09-26',
          startTime: '05:00 PM',
          endTime: '06:00 PM',
          startHour: 17,
          duration: 1,
          color: '#FFF7ED',
          borderColor: '#F97316',
          textColor: '#9A3412',
          tag: 'Habit'
        }
      ];
    } catch { return []; }
  });

  // Modal State
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtCategory, setEvtCategory] = useState('work');
  const [evtDate, setEvtDate] = useState('2026-09-26');
  const [evtTime, setEvtTime] = useState('10:00 AM');
  const [evtDesc, setEvtDesc] = useState('');

  // Fetch WorkOS Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resTasks, resProj] = await Promise.all([
        getTasks().catch(() => []),
        api.get('/projects').catch(() => ({ data: [] }))
      ]);

      if (Array.isArray(resTasks)) setTasksList(resTasks);
      if (Array.isArray(resProj.data)) setProjectsList(resProj.data);

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
    loadData();
  }, [loadData]);

  useRealtime('task.created', loadData);
  useRealtime('task.status_changed', loadData);
  useRealtime('analytics.refresh', loadData);

  // Unified Event Mapper
  const allEvents = [];

  // Tasks as Events
  tasksList.forEach(t => {
    if (t.deadline) {
      const dateStr = t.deadline.split('T')[0];
      allEvents.push({
        id: `task_${t.id}`,
        title: t.title,
        category: 'work',
        type: 'Task',
        date: dateStr,
        startTime: '09:00 AM',
        startHour: 9,
        duration: 1,
        color: '#F0FDF4',
        borderColor: '#22C55E',
        textColor: '#15803D',
        tag: 'Work',
        subText: t.description || 'Task deliverable',
        originalTask: t
      });
    }
  });

  // Projects as Events
  projectsList.forEach(p => {
    if (p.deadline) {
      allEvents.push({
        id: `proj_${p.id}`,
        title: `Project Review: ${p.name}`,
        category: 'work',
        type: 'Project',
        date: p.deadline.split('T')[0],
        startTime: '10:00 AM',
        startHour: 10,
        duration: 1,
        color: '#F3E8FF',
        borderColor: '#A855F7',
        textColor: '#6B21A8',
        tag: 'Project'
      });
    }
  });

  // Custom Events
  customEvents.forEach(e => allEvents.push(e));

  // Weekday Helpers for Week View
  const getWeekDates = (baseDate) => {
    const d = new Date(baseDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(d.setDate(diff));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const next = new Date(monday);
      next.setDate(monday.getDate() + i);
      week.push(next);
    }
    return week;
  };

  const weekDates = getWeekDates(selectedDate);
  const hoursList = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]; // 8 AM to 9 PM

  // Add Event Form Handler
  const handleCreateEvent = (e) => {
    e.preventDefault();
    if (!evtTitle.trim()) return;

    const newEvt = {
      id: `evt_${Date.now()}`,
      title: evtTitle.trim(),
      category: evtCategory,
      type: 'Event',
      date: evtDate,
      startTime: evtTime,
      startHour: parseInt(evtTime) || 10,
      duration: 1,
      color: evtCategory === 'health' ? '#FFF7ED' : evtCategory === 'learning' ? '#F0F9FF' : '#F5F3FF',
      borderColor: evtCategory === 'health' ? '#F97316' : evtCategory === 'learning' ? '#0284C7' : '#8B5CF6',
      textColor: evtCategory === 'health' ? '#9A3412' : evtCategory === 'learning' ? '#075985' : '#5B21B6',
      tag: evtCategory.charAt(0).toUpperCase() + evtCategory.slice(1)
    };

    const updated = [newEvt, ...customEvents];
    setCustomEvents(updated);
    localStorage.setItem(`workos_events_${user?.id}`, JSON.stringify(updated));

    setEvtTitle('');
    setShowAddEventModal(false);
  };

  // Mini Calendar Month Grid
  const miniYear = selectedDate.getFullYear();
  const miniMonth = selectedDate.getMonth();
  const daysInMiniMonth = new Date(miniYear, miniMonth + 1, 0).getDate();
  const firstDayMini = new Date(miniYear, miniMonth, 1).getDay();

  const miniDaysArray = [];
  for (let i = 0; i < (firstDayMini === 0 ? 6 : firstDayMini - 1); i++) miniDaysArray.push(null);
  for (let d = 1; d <= daysInMiniMonth; d++) miniDaysArray.push(d);

  // Today's Agenda Filter
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const agendaEvents = allEvents.filter(e => e.date === selectedDateStr);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* BREADCRUMB & HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Calendar</span> <ChevronRight size={14} /> <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Overview</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
            Calendar
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Manage your time. Make space for what matters.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowAddEventModal(true)}
            className="btn btn-primary"
            style={{
              padding: '10px 22px',
              borderRadius: 'var(--radius-md)',
              background: '#10B981',
              color: '#fff',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}
          >
            <Plus size={18} /> Add Event
          </button>
        </div>
      </div>

      {/* TOP CONTROLS & VIEW SWITCHER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 7);
              setSelectedDate(d);
            }}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', borderRadius: '50%', minWidth: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 7);
              setSelectedDate(d);
            }}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', borderRadius: '50%', minWidth: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronRight size={18} />
          </button>

          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CalendarIcon size={16} color="var(--brand-600)" />
            <span>Mon, {weekDates[0]?.getDate()} {weekDates[0]?.toLocaleString('en-US', { month: 'short' })} – Sun, {weekDates[6]?.getDate()} {weekDates[6]?.toLocaleString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>

          <button
            onClick={() => setSelectedDate(new Date(2026, 8, 26))}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}
          >
            Today
          </button>
        </div>

        {/* View Mode Selector */}
        <div style={{ display: 'flex', background: 'var(--surface)', padding: '3px', borderRadius: '20px', border: '1px solid var(--border)' }}>
          {['month', 'week', 'day'].map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              style={{
                padding: '6px 18px',
                borderRadius: '16px',
                border: 'none',
                background: viewMode === v ? '#10B981' : 'transparent',
                color: viewMode === v ? '#fff' : 'var(--text-secondary)',
                fontWeight: viewMode === v ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN LAYOUT GRID (LEFT: MAIN CALENDAR, RIGHT: SIDEBAR WIDGETS) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: MAIN WEEK CALENDAR GRID */}
        <div className="card" style={{ padding: '24px', overflowX: 'auto', borderRadius: 'var(--radius-xl)' }}>
          
          {/* Weekday Column Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: '1px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', minWidth: '750px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>GMT+5:30</div>
            {weekDates.map((wDate, i) => {
              const dayNum = wDate.getDate();
              const isToday = wDate.toDateString() === selectedDate.toDateString();
              const dayName = wDate.toLocaleString('en-US', { weekday: 'short' });

              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: isToday ? '#10B981' : 'var(--text-secondary)', marginBottom: '4px' }}>{dayName}</div>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isToday ? '#10B981' : 'transparent',
                    color: isToday ? '#fff' : 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto'
                  }}>
                    {dayNum}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Slots Grid (8 AM - 9 PM) */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: '1px', minWidth: '750px', position: 'relative', minHeight: '680px' }}>
            
            {/* Current Time Indicator Dashed Line (e.g., 11:30 AM) */}
            <div style={{
              position: 'absolute',
              top: '180px',
              left: '80px',
              right: 0,
              borderTop: '2px dashed #10B981',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ position: 'absolute', left: '-75px', top: '-12px', background: '#10B981', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                11:30 AM
              </span>
            </div>

            {/* Time Labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', paddingTop: '10px' }}>
              {hoursList.map(h => (
                <div key={h} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, height: '20px' }}>
                  {h === 12 ? '12:00 PM' : h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDates.map((wDate, colIdx) => {
              const cellDateStr = wDate.toISOString().split('T')[0];
              const dayEvts = allEvents.filter(e => e.date === cellDateStr);

              return (
                <div key={colIdx} style={{ borderLeft: '1px solid var(--border)', position: 'relative', minHeight: '680px' }}>
                  {dayEvts.map(evt => (
                    <div
                      key={evt.id}
                      onClick={() => {
                        if (evt.originalTask) setSelectedTask(evt.originalTask);
                      }}
                      style={{
                        position: 'absolute',
                        top: `${((evt.startHour || 10) - 8) * 48}px`,
                        left: '4px',
                        right: '4px',
                        height: `${(evt.duration || 1) * 44}px`,
                        background: evt.color || '#ECFDF5',
                        borderLeft: `4px solid ${evt.borderColor || '#10B981'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '6px 8px',
                        fontSize: '11px',
                        color: evt.textColor || '#065F46',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                        overflow: 'hidden',
                        zIndex: 5
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{evt.startTime}</span>
                        {evt.hasVideo && <Video size={12} color={evt.textColor} />}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '2px' }}>{evt.title}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Bottom Filter & Manage Bar */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Show calendars:</span>
              {Object.keys(categories).map(cat => (
                <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', textTransform: 'capitalize', color: 'var(--text-primary)', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={categories[cat]}
                    onChange={() => setCategories(prev => ({ ...prev, [cat]: !prev[cat] }))}
                    style={{ accentColor: '#10B981' }}
                  />
                  {cat}
                </label>
              ))}
            </div>

            <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '12px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} /> Manage calendars
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: SIDEBAR WIDGETS (MINI CALENDAR + TODAY'S AGENDA + ASSISTANT CARD) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* WIDGET 1: MINI MONTH CALENDAR */}
          <div className="card" style={{ padding: '20px', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setSelectedDate(new Date(miniYear, miniMonth - 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ChevronLeft size={16} /></button>
                <button onClick={() => setSelectedDate(new Date(miniYear, miniMonth + 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ChevronRight size={16} /></button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '8px' }}>
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
              {miniDaysArray.map((d, i) => {
                if (d === null) return <div key={i} />;
                const isSel = d === selectedDate.getDate();
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(new Date(miniYear, miniMonth, d))}
                    style={{
                      padding: '6px',
                      borderRadius: '50%',
                      border: 'none',
                      background: isSel ? '#10B981' : 'transparent',
                      color: isSel ? '#fff' : 'var(--text-primary)',
                      fontWeight: isSel ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* WIDGET 2: TODAY'S AGENDA */}
          <div className="card" style={{ padding: '20px', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Today's Agenda</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>Mon, {selectedDate.getDate()} {selectedDate.toLocaleString('en-US', { month: 'short' })}</div>
              </div>
              <button style={{ background: 'none', border: 'none', color: 'var(--brand-600)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                See all <ArrowUpRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {agendaEvents.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', padding: '20px 0' }}>
                  No commitments scheduled for today.
                </div>
              ) : (
                agendaEvents.map(evt => (
                  <div key={evt.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: evt.borderColor || '#10B981', marginTop: '6px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>{evt.startTime}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '10px', background: evt.color || 'rgba(16, 185, 129, 0.15)', color: evt.textColor || '#10B981' }}>{evt.tag}</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{evt.title}</div>
                      {evt.subText && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{evt.subText}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* WIDGET 3: WORKOS SMART ASSISTANT SUGGESTION CARD */}
          <div className="card" style={{ padding: '20px', borderRadius: 'var(--radius-xl)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(168, 85, 247, 0.06) 100%)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--brand-600)" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>WorkOS Suggests</span>
              </div>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '0 0 14px 0' }}>
              You have a busy day today. Try blocking 30 mins for a break to stay productive.
            </p>
            <button style={{ background: 'none', border: 'none', color: 'var(--brand-600)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Find time for a break <ArrowUpRight size={14} />
            </button>
          </div>

        </div>
      </div>

      {/* MODAL: ADD EVENT */}
      {showAddEventModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleCreateEvent} className="card" style={{ width: '480px', padding: '28px', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} color="#10B981" /> Schedule New Event
              </h3>
              <button type="button" onClick={() => setShowAddEventModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Event Title</label>
              <input
                type="text"
                value={evtTitle}
                onChange={(e) => setEvtTitle(e.target.value)}
                placeholder="e.g. Work on UI Design, Client Meeting..."
                required
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Category</label>
                <select value={evtCategory} onChange={(e) => setEvtCategory(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}>
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="learning">Learning</option>
                  <option value="health">Health</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Date</label>
                <input type="date" value={evtDate} onChange={(e) => setEvtDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Time</label>
              <input type="text" value={evtTime} onChange={(e) => setEvtTime(e.target.value)} placeholder="11:30 AM" style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowAddEventModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#10B981' }}>Save Event</button>
            </div>
          </form>
        </div>
      )}

      {/* TASK DETAILS MODAL */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}
