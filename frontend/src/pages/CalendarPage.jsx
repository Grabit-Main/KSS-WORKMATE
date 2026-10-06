import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import { getTasks } from '../api/tasks';
import api from '../api/axios';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, Filter,
  CheckSquare, Folder, Target, Users, AlertTriangle, Sparkles, X, CheckCircle2,
  Video, Bell, Layers, FileText, ArrowUpRight, Search, Lock, AlertCircle, Eye,
  MoreHorizontal, Activity, Zap, Compass, Check, CalendarCheck, Trash2
} from 'lucide-react';
import TaskDetailsModal from '../components/tasks/TaskDetailsModal';
import { getHolidays, createHoliday, deleteHoliday } from '../api/holidays';

const DEFAULT_HOLIDAYS = [
  { id: 'hol_1', title: 'Ganesh Chaturthi', date: '2026-09-14', day_of_week: 'Monday', type: 'Paid Off' },
  { id: 'hol_2', title: 'Gandhi Jayanti', date: '2026-10-02', day_of_week: 'Friday', type: 'Paid Off' },
  { id: 'hol_3', title: 'Dussehra / Vijayadashami', date: '2026-10-20', day_of_week: 'Tuesday', type: 'Paid Off' },
  { id: 'hol_4', title: 'Karnataka Rajyotsava', date: '2026-11-01', day_of_week: 'Sunday', type: 'Paid Off' },
  { id: 'hol_5', title: 'Diwali / Deepavali', date: '2026-11-08', day_of_week: 'Sunday', type: 'Paid Off' },
  { id: 'hol_6', title: 'Christmas', date: '2026-12-25', day_of_week: 'Friday', type: 'Paid Off' },
];

const formatDateKey = (d) => {
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseTimeToHour = (timeStr) => {
  if (!timeStr) return 9;
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10);
    let m = 0;
    if (parts[1]) {
      m = parseInt(parts[1].replace(/[^0-9]/g, ''), 10) || 0;
      if (parts[1].toUpperCase().includes('PM') && h < 12) h += 12;
      if (parts[1].toUpperCase().includes('AM') && h === 12) h = 0;
    }
    return h + (m / 60);
  }
  const h = parseInt(timeStr, 10);
  return isNaN(h) ? 9 : h;
};

export default function CalendarPage() {
  const { user } = useAuth();
  const role = user?.role || 'TM';

  // Active View Mode: 'week' | 'month' | 'day' | 'holidays'
  const [viewMode, setViewMode] = useState('week');

  // Active Selected Date (Default: Today's current date)
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Real WorkOS Data
  const [tasksList, setTasksList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Holidays State
  const [holidaysList, setHolidaysList] = useState(DEFAULT_HOLIDAYS);
  const [holidayFilter, setHolidayFilter] = useState('all'); // 'all' | 'upcoming' | 'past'
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [holTitle, setHolTitle] = useState('');
  const [holDate, setHolDate] = useState(formatDateKey(new Date()));
  const [holType, setHolType] = useState('Paid Off');
  const [holDesc, setHolDesc] = useState('');
  const [holidaySaving, setHolidaySaving] = useState(false);

  // Selected Task / Event Modals
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const handleEventClick = (evt) => {
    if (evt.originalTask) {
      setSelectedTask(evt.originalTask);
    } else {
      setSelectedEvent(evt);
    }
  };

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
      if (saved) return JSON.parse(saved);
      const todayStr = formatDateKey(new Date());
      const tomorrowObj = new Date();
      tomorrowObj.setDate(tomorrowObj.getDate() + 1);
      const tomorrowStr = formatDateKey(tomorrowObj);

      return [
        {
          id: 'evt_1',
          title: 'Sprint Planning & Team Sync',
          category: 'work',
          type: 'Meeting',
          date: todayStr,
          startTime: '10:00 AM',
          startHour: 10,
          duration: 1,
          hasVideo: true,
          color: '#EFF6FF',
          borderColor: '#3B82F6',
          textColor: '#1E40AF',
          tag: 'Meeting'
        },
        {
          id: 'evt_2',
          title: 'UI Design Review',
          category: 'work',
          type: 'Review',
          date: todayStr,
          startTime: '02:00 PM',
          startHour: 14,
          duration: 1,
          color: '#FEF2F2',
          borderColor: '#F87171',
          textColor: '#991B1B',
          tag: 'Design'
        },
        {
          id: 'evt_3',
          title: 'Architecture Discussion',
          category: 'work',
          type: 'Meeting',
          date: tomorrowStr,
          startTime: '11:00 AM',
          startHour: 11,
          duration: 1,
          color: '#ECFDF5',
          borderColor: '#10B981',
          textColor: '#065F46',
          tag: 'Work'
        }
      ];
    } catch {
      return [];
    }
  });

  // Add Event Modal State
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtCategory, setEvtCategory] = useState('work');
  const [evtDate, setEvtDate] = useState(formatDateKey(new Date()));
  const [evtTime, setEvtTime] = useState('10:00');
  const [evtDuration, setEvtDuration] = useState('1');
  const [evtDesc, setEvtDesc] = useState('');

  // Fetch WorkOS Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resTasks, resProj, resHolidays] = await Promise.all([
        getTasks().catch(() => []),
        api.get('/projects').catch(() => ({ data: [] })),
        getHolidays().catch(() => null)
      ]);

      if (Array.isArray(resTasks)) setTasksList(resTasks);
      if (Array.isArray(resProj.data)) setProjectsList(resProj.data);
      if (Array.isArray(resHolidays) && resHolidays.length > 0) {
        setHolidaysList(resHolidays);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

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
        tag: 'Task',
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
        title: `Project Milestone: ${p.name}`,
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

  // Official Holidays as Events
  holidaysList.forEach(h => {
    allEvents.push({
      id: `hol_evt_${h.id}`,
      title: `🎉 ${h.title}`,
      category: 'work',
      type: 'Holiday',
      date: h.date,
      startTime: 'All Day',
      startHour: 9,
      duration: 1,
      color: '#F3E8FF',
      borderColor: '#8B5CF6',
      textColor: '#6B21A8',
      tag: h.type || 'Holiday',
      subText: `${h.day_of_week || ''} • Official Holiday`
    });
  });

  // Custom Events
  customEvents.forEach(e => allEvents.push(e));

  // Filter Events by Category Toggle
  const filteredEvents = allEvents.filter(e => categories[e.category] !== false);

  // Calculate dynamic metadata for Holidays view
  const calculateHolidayMeta = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isPast = diffDays < 0;
    const isSunday = target.getDay() === 0;

    return { diffDays, isPast, isSunday };
  };

  const holidaysWithMeta = holidaysList.map((h, index) => {
    const meta = calculateHolidayMeta(h.date);
    const themes = [
      { accent: '#B45309', paidBg: 'rgba(245, 158, 11, 0.18)', paidText: '#B45309' },
      { accent: '#0D9488', paidBg: 'rgba(20, 184, 166, 0.18)', paidText: '#0F766E' },
      { accent: '#E11D48', paidBg: 'rgba(244, 63, 94, 0.18)', paidText: '#9F1239' },
      { accent: '#4F46E5', paidBg: 'rgba(99, 102, 241, 0.18)', paidText: '#3730A3' },
      { accent: '#D97706', paidBg: 'rgba(245, 158, 11, 0.18)', paidText: '#B45309' },
      { accent: '#059669', paidBg: 'rgba(16, 185, 129, 0.18)', paidText: '#065F46' },
    ];
    const theme = themes[index % themes.length];
    return { ...h, ...meta, theme };
  });

  const upcomingHolidays = holidaysWithMeta.filter(h => !h.isPast);
  const pastHolidays = holidaysWithMeta.filter(h => h.isPast);
  const sundayCount = holidaysWithMeta.filter(h => h.isSunday).length;

  const nextUpcoming = upcomingHolidays.length > 0
    ? upcomingHolidays.reduce((prev, curr) => (curr.diffDays < prev.diffDays ? curr : prev))
    : null;

  const displayedHolidays = holidaysWithMeta.filter(h => {
    if (holidayFilter === 'upcoming') return !h.isPast;
    if (holidayFilter === 'past') return h.isPast;
    return true;
  });

  // Weekday Helpers for Week View
  const getWeekDates = (baseDate) => {
    const d = new Date(baseDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
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
  const hoursList = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]; // 8 AM to 8 PM

  // Month Grid Helpers
  const getMonthGridDates = (baseDate) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDay = firstDay.getDay() - 1; // Mon = 0
    if (startDay === -1) startDay = 6;

    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDay);

    const days = [];
    const totalCells = Math.ceil((startDay + lastDay.getDate()) / 7) * 7;
    for (let i = 0; i < totalCells; i++) {
      const next = new Date(startDate);
      next.setDate(startDate.getDate() + i);
      days.push(next);
    }
    return days;
  };

  const monthGridDates = getMonthGridDates(selectedDate);

  // Navigation Handlers
  const handlePrev = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'day') {
      d.setDate(d.getDate() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setSelectedDate(d);
  };

  const handleNext = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'day') {
      d.setDate(d.getDate() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setSelectedDate(d);
  };

  // Add Event Form Handler
  const handleCreateEvent = (e) => {
    e.preventDefault();
    if (!evtTitle.trim()) return;

    const parsedHour = parseTimeToHour(evtTime);

    const catColors = {
      work: { color: '#EFF6FF', borderColor: '#3B82F6', textColor: '#1E40AF' },
      personal: { color: '#F5F3FF', borderColor: '#8B5CF6', textColor: '#5B21B6' },
      learning: { color: '#F0F9FF', borderColor: '#0284C7', textColor: '#075985' },
      health: { color: '#FFF7ED', borderColor: '#F97316', textColor: '#9A3412' },
      travel: { color: '#FEF2F2', borderColor: '#EF4444', textColor: '#991B1B' }
    };

    const scheme = catColors[evtCategory] || catColors.work;

    // Format time display
    let displayTime = evtTime;
    if (evtTime.includes(':')) {
      const [hStr, mStr] = evtTime.split(':');
      let h = parseInt(hStr, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      displayTime = `${h}:${mStr} ${ampm}`;
    }

    const newEvt = {
      id: `evt_${Date.now()}`,
      title: evtTitle.trim(),
      category: evtCategory,
      type: 'Event',
      date: evtDate,
      startTime: displayTime,
      startHour: parsedHour,
      duration: parseFloat(evtDuration) || 1,
      color: scheme.color,
      borderColor: scheme.borderColor,
      textColor: scheme.textColor,
      tag: evtCategory.charAt(0).toUpperCase() + evtCategory.slice(1),
      subText: evtDesc.trim() || undefined
    };

    const updated = [newEvt, ...customEvents];
    setCustomEvents(updated);
    try {
      localStorage.setItem(`workos_events_${user?.id}`, JSON.stringify(updated));
    } catch {}

    setEvtTitle('');
    setEvtDesc('');
    setShowAddEventModal(false);
  };

  const handleDeleteCustomEvent = (id) => {
    const updated = customEvents.filter(e => e.id !== id);
    setCustomEvents(updated);
    try {
      localStorage.setItem(`workos_events_${user?.id}`, JSON.stringify(updated));
    } catch {}
    setSelectedEvent(null);
  };

  // Holiday Handlers (TL allowed to create/delete)
  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    if (!holTitle.trim() || !holDate) return;
    setHolidaySaving(true);
    try {
      const created = await createHoliday({
        title: holTitle.trim(),
        date: holDate,
        type: holType,
        description: holDesc.trim() || undefined
      });
      setHolidaysList(prev => [...prev.filter(h => h.id !== created.id), created]);
      setHolTitle('');
      setHolDesc('');
      setShowAddHolidayModal(false);
    } catch (err) {
      console.error('Failed to create holiday:', err);
      const dateObj = new Date(holDate);
      const dayName = !isNaN(dateObj.getTime()) ? dateObj.toLocaleString('en-US', { weekday: 'long' }) : '';
      const localNew = {
        id: `hol_${Date.now()}`,
        title: holTitle.trim(),
        date: holDate,
        day_of_week: dayName,
        type: holType,
        description: holDesc.trim() || undefined
      };
      setHolidaysList(prev => [...prev, localNew]);
      setShowAddHolidayModal(false);
    } finally {
      setHolidaySaving(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    try {
      await deleteHoliday(id).catch(() => {});
    } catch {}
    setHolidaysList(prev => prev.filter(h => h.id !== id));
  };

  // Mini Calendar Month Grid
  const miniYear = selectedDate.getFullYear();
  const miniMonth = selectedDate.getMonth();
  const daysInMiniMonth = new Date(miniYear, miniMonth + 1, 0).getDate();
  const firstDayMini = new Date(miniYear, miniMonth, 1).getDay();

  const miniDaysArray = [];
  for (let i = 0; i < (firstDayMini === 0 ? 6 : firstDayMini - 1); i++) miniDaysArray.push(null);
  for (let d = 1; d <= daysInMiniMonth; d++) miniDaysArray.push(d);

  // Selected Date Key & Agenda Events
  const selectedDateStr = formatDateKey(selectedDate);
  const todayStr = formatDateKey(new Date());
  const agendaEvents = filteredEvents.filter(e => e.date === selectedDateStr);

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
            Manage your schedule, commitments, deliverables, and team activities.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setViewMode(viewMode === 'holidays' ? 'week' : 'holidays')}
            className="btn btn-secondary"
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              background: viewMode === 'holidays' ? 'rgba(99, 102, 241, 0.2)' : 'var(--surface)',
              color: viewMode === 'holidays' ? '#818CF8' : 'var(--text-primary)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: viewMode === 'holidays' ? '1px solid #6366F1' : '1px solid var(--border)',
              boxShadow: viewMode === 'holidays' ? '0 0 12px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            <Sparkles size={18} color={viewMode === 'holidays' ? '#818CF8' : '#8B5CF6'} />
            Holidays
          </button>

          <button
            onClick={() => {
              setEvtDate(selectedDateStr || formatDateKey(new Date()));
              setShowAddEventModal(true);
            }}
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
            onClick={handlePrev}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', borderRadius: '50%', minWidth: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={handleNext}
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
            <span>
              {viewMode === 'month' && selectedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              {viewMode === 'day' && selectedDate.toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              {viewMode === 'week' && (
                `Mon, ${weekDates[0]?.getDate()} ${weekDates[0]?.toLocaleString('en-US', { month: 'short' })} – Sun, ${weekDates[6]?.getDate()} ${weekDates[6]?.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`
              )}
            </span>
          </div>

          <button
            onClick={() => setSelectedDate(new Date())}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}
          >
            Today
          </button>
        </div>

        {/* View Mode Selector */}
        <div style={{ display: 'flex', background: 'var(--surface)', padding: '3px', borderRadius: '20px', border: '1px solid var(--border)' }}>
          {['month', 'week', 'day', 'holidays'].map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              style={{
                padding: '6px 18px',
                borderRadius: '16px',
                border: 'none',
                background: viewMode === v ? (v === 'holidays' ? '#6366F1' : '#10B981') : 'transparent',
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

      {/* MAIN CONTENT DISPLAY */}
      {viewMode === 'holidays' ? (
        /* HOLIDAYS VIEW DISPLAY MATCHING USER SCREENSHOT */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* BANNER HEADER (CARD 1) */}
          <div className="card" style={{
            padding: '24px 28px',
            borderRadius: '24px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '18px',
                background: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                flexShrink: 0
              }}>
                <Sparkles size={26} />
              </div>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                  Kalpanaaa Software Solutions: 2026 holidays
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '6px 0 0 0', fontWeight: 500 }}>
                  Sundays are standard weekly off days. These {holidaysList.length} dates are recognized as paid public and state holidays.
                </p>
              </div>
            </div>

            {role === 'TL' && (
              <button
                onClick={() => setShowAddHolidayModal(true)}
                className="btn btn-primary"
                style={{
                  padding: '10px 24px',
                  borderRadius: '24px',
                  background: '#4F46E5',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
                }}
              >
                + Add holiday
              </button>
            )}
          </div>

          {/* TOP SUMMARY STAT CARDS GRID (ROW 2) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Stat Card 1: Official Holidays */}
            <div className="card" style={{ padding: '20px 24px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#3730A3', lineHeight: 1.1 }}>
                {holidaysList.length}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#4338CA', marginTop: '6px' }}>
                Official holidays
              </div>
            </div>

            {/* Stat Card 2: Days Until Next Holiday */}
            <div className="card" style={{ padding: '20px 24px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#065F46', lineHeight: 1.1 }}>
                {nextUpcoming ? `${nextUpcoming.diffDays} days` : '0 days'}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#047857', marginTop: '6px' }}>
                Until {nextUpcoming ? nextUpcoming.title : 'next holiday'}
              </div>
            </div>

            {/* Stat Card 3: Still to Come This Year */}
            <div className="card" style={{ padding: '20px 24px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#92400E', lineHeight: 1.1 }}>
                {upcomingHolidays.length}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#B45309', marginTop: '6px' }}>
                Still to come this year
              </div>
            </div>
          </div>

          {/* FILTER BAR & SUNDAY NOTE ROW (ROW 3) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {['all', 'upcoming', 'past'].map(f => (
                <button
                  key={f}
                  onClick={() => setHolidayFilter(f)}
                  style={{
                    padding: '8px 22px',
                    borderRadius: '20px',
                    border: holidayFilter === f ? 'none' : '1px solid var(--border)',
                    background: holidayFilter === f ? '#4F46E5' : 'var(--surface)',
                    color: holidayFilter === f ? '#FFFFFF' : 'var(--text-secondary)',
                    fontWeight: holidayFilter === f ? 600 : 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : 'Past'}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-tertiary)' }}>
              {sundayCount === 1
                ? 'One holiday falls on a Sunday, so no extra day off.'
                : `${sundayCount === 2 ? 'Two' : sundayCount} holidays fall on a Sunday, so no extra day off.`}
            </div>
          </div>

          {/* HOLIDAY CARDS GRID (2-COLUMN GRID, ROW 4) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {displayedHolidays.map((h) => {
              const dateObj = new Date(h.date);
              const monthStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase() : 'DEC';
              const dayNum = !isNaN(dateObj.getTime()) ? String(dateObj.getDate()).padStart(2, '0') : '01';
              const dayName = h.day_of_week || (!isNaN(dateObj.getTime()) ? dateObj.toLocaleString('en-US', { weekday: 'long' }) : '');

              return (
                <div
                  key={h.id}
                  className="card"
                  style={{
                    padding: '20px 24px',
                    borderRadius: '20px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderLeft: `6px solid ${h.theme.accent}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1 }}>
                    {/* Date Badge Box */}
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '16px',
                      background: h.theme.accent,
                      color: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em' }}>
                        {monthStr}
                      </span>
                      <span style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.1 }}>
                        {dayNum}
                      </span>
                    </div>

                    {/* Info & Badges */}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                        {h.title}
                      </h4>
                      <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '4px 0 8px 0', fontWeight: 500 }}>
                        {dayName} · {h.date}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Paid off Pill */}
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '4px 14px',
                          borderRadius: '16px',
                          background: h.theme.paidBg,
                          color: h.theme.paidText,
                          whiteSpace: 'nowrap'
                        }}>
                          {h.type || 'Paid off'}
                        </span>

                        {/* Days / Past Pill */}
                        {h.isPast ? (
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '4px 14px',
                            borderRadius: '16px',
                            background: 'rgba(156, 163, 175, 0.15)',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap'
                          }}>
                            Past
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '4px 14px',
                            borderRadius: '16px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#065F46',
                            whiteSpace: 'nowrap'
                          }}>
                            In {h.diffDays} days
                          </span>
                        )}

                        {/* Falls on Sunday Pill */}
                        {h.isSunday && (
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '4px 14px',
                            borderRadius: '16px',
                            background: 'rgba(245, 158, 11, 0.18)',
                            color: '#92400E',
                            whiteSpace: 'nowrap'
                          }}>
                            Falls on Sunday
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Circle Action Button */}
                  {role === 'TL' ? (
                    <button
                      onClick={() => handleDeleteHoliday(h.id)}
                      title="Delete Holiday"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(156, 163, 175, 0.15)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-tertiary)',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.color = '#EF4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(156, 163, 175, 0.15)';
                        e.currentTarget.style.color = 'var(--text-tertiary)';
                      }}
                    >
                      <X size={16} />
                    </button>
                  ) : (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(156, 163, 175, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-tertiary)',
                      flexShrink: 0,
                      opacity: 0.6
                    }}>
                      <X size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* MAIN LAYOUT GRID (LEFT: MAIN CALENDAR, RIGHT: SIDEBAR WIDGETS) */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: MAIN CALENDAR DISPLAY */}
        <div className="card" style={{ padding: '24px', overflowX: 'auto', borderRadius: 'var(--radius-xl)' }}>
          
          {/* VIEW MODE 1: WEEK VIEW */}
          {viewMode === 'week' && (
            <>
              {/* Weekday Column Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)', gap: '1px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', minWidth: '750px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>GMT+5:30</div>
                {weekDates.map((wDate, i) => {
                  const dayNum = wDate.getDate();
                  const isToday = formatDateKey(wDate) === todayStr;
                  const isSelected = formatDateKey(wDate) === selectedDateStr;
                  const dayName = wDate.toLocaleString('en-US', { weekday: 'short' });

                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDate(new Date(wDate))}
                      style={{ textAlign: 'center', cursor: 'pointer' }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 600, color: isToday ? '#10B981' : 'var(--text-secondary)', marginBottom: '4px' }}>{dayName}</div>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isToday ? '#10B981' : isSelected ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        color: isToday ? '#fff' : isSelected ? '#10B981' : 'var(--text-primary)',
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

              {/* Time Slots Grid (8 AM - 8 PM) */}
              <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, 1fr)', gap: '1px', minWidth: '750px', position: 'relative', minHeight: '560px' }}>
                
                {/* Time Labels */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingTop: '10px', paddingBottom: '10px' }}>
                  {hoursList.map(h => (
                    <div key={h} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, height: '40px' }}>
                      {h === 12 ? '12:00 PM' : h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`}
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {weekDates.map((wDate, colIdx) => {
                  const cellDateStr = formatDateKey(wDate);
                  const dayEvts = filteredEvents.filter(e => e.date === cellDateStr);

                  return (
                    <div key={colIdx} style={{ borderLeft: '1px solid var(--border)', position: 'relative', minHeight: '560px' }}>
                      {dayEvts.map(evt => {
                        const startH = evt.startHour || 9;
                        const topPx = Math.max(0, (startH - 8) * 42);
                        const heightPx = Math.max(38, (evt.duration || 1) * 40);

                        return (
                          <div
                            key={evt.id}
                            onClick={() => handleEventClick(evt)}
                            style={{
                              position: 'absolute',
                              top: `${topPx}px`,
                              left: '4px',
                              right: '4px',
                              height: `${heightPx}px`,
                              background: evt.color || '#ECFDF5',
                              borderLeft: `4px solid ${evt.borderColor || '#10B981'}`,
                              borderRadius: 'var(--radius-md)',
                              padding: '5px 8px',
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
                            <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {evt.title}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* VIEW MODE 2: MONTH VIEW */}
          {viewMode === 'month' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', textAlign: 'center', fontWeight: 700, fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginTop: '12px' }}>
                {monthGridDates.map((mDate, idx) => {
                  const mDateStr = formatDateKey(mDate);
                  const isCurrentMonth = mDate.getMonth() === selectedDate.getMonth();
                  const isToday = mDateStr === todayStr;
                  const isSel = mDateStr === selectedDateStr;
                  const mEvts = filteredEvents.filter(e => e.date === mDateStr);

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(new Date(mDate))}
                      style={{
                        minHeight: '85px',
                        background: isSel ? 'rgba(16, 185, 129, 0.06)' : 'var(--surface)',
                        border: isSel ? '2px solid #10B981' : isToday ? '1px solid #10B981' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '8px',
                        cursor: 'pointer',
                        opacity: isCurrentMonth ? 1 : 0.45,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontWeight: isToday || isSel ? 800 : 600,
                          fontSize: '13px',
                          color: isToday ? '#10B981' : 'var(--text-primary)'
                        }}>
                          {mDate.getDate()}
                        </span>
                        {mEvts.length > 0 && (
                          <span style={{ fontSize: '10px', fontWeight: 700, background: '#10B981', color: '#fff', padding: '1px 6px', borderRadius: '10px' }}>
                            {mEvts.length}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                        {mEvts.slice(0, 2).map(evt => (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(evt);
                            }}
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              background: evt.color || '#EFF6FF',
                              color: evt.textColor || '#1E40AF',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              cursor: 'pointer'
                            }}
                          >
                            {evt.title}
                          </div>
                        ))}
                        {mEvts.length > 2 && (
                          <div style={{ fontSize: '9.5px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                            +{mEvts.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 3: DAY VIEW */}
          {viewMode === 'day' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    {selectedDate.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
                    {agendaEvents.length} commitment{agendaEvents.length === 1 ? '' : 's'} scheduled for this date
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEvtDate(selectedDateStr);
                    setShowAddEventModal(true);
                  }}
                  className="btn btn-primary"
                  style={{ padding: '6px 14px', fontSize: '12px', borderRadius: 'var(--radius-md)', background: '#10B981' }}
                >
                  <Plus size={14} /> Add Day Event
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {agendaEvents.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    <CalendarCheck size={40} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-tertiary)' }} />
                    <h4 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px', color: 'var(--text-primary)' }}>No events scheduled for this day</h4>
                    <p style={{ fontSize: '13px', margin: 0 }}>Click "+ Add Event" above to schedule a task or meeting.</p>
                  </div>
                ) : (
                  agendaEvents.map(evt => (
                    <div
                      key={evt.id}
                      onClick={() => handleEventClick(evt)}
                      style={{
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'center',
                        padding: '16px',
                        background: evt.color || '#EFF6FF',
                        borderLeft: `5px solid ${evt.borderColor || '#3B82F6'}`,
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ minWidth: '80px', fontSize: '13px', fontWeight: 700, color: evt.textColor || '#1E40AF' }}>
                        {evt.startTime}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{evt.title}</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.7)', color: evt.textColor }}>{evt.tag}</span>
                        </div>
                        {evt.subText && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{evt.subText}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

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
          </div>
        </div>

        {/* RIGHT COLUMN: SIDEBAR WIDGETS (MINI CALENDAR + TODAY'S AGENDA) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* WIDGET 1: MINI MONTH CALENDAR */}
          <div className="card" style={{ padding: '20px', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setSelectedDate(new Date(miniYear, miniMonth - 1, 1))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setSelectedDate(new Date(miniYear, miniMonth + 1, 1))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '8px' }}>
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
              {miniDaysArray.map((d, i) => {
                if (d === null) return <div key={i} />;
                const cellObj = new Date(miniYear, miniMonth, d);
                const cellStr = formatDateKey(cellObj);
                const isToday = cellStr === todayStr;
                const isSel = cellStr === selectedDateStr;
                const hasEvts = filteredEvents.some(e => e.date === cellStr);

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(cellObj)}
                    style={{
                      padding: '6px',
                      borderRadius: '50%',
                      border: isToday && !isSel ? '1px solid #10B981' : 'none',
                      background: isSel ? '#10B981' : 'transparent',
                      color: isSel ? '#fff' : isToday ? '#10B981' : 'var(--text-primary)',
                      fontWeight: isSel || isToday ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    {d}
                    {hasEvts && !isSel && (
                      <span style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', width: '3px', height: '3px', borderRadius: '50%', background: '#10B981' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* WIDGET 2: TODAY'S AGENDA */}
          <div className="card" style={{ padding: '20px', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {selectedDateStr === todayStr ? "Today's Agenda" : "Selected Day Agenda"}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
                  {selectedDate.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>

              <button
                onClick={() => {
                  setEvtDate(selectedDateStr);
                  setShowAddEventModal(true);
                }}
                style={{ background: 'none', border: 'none', color: '#10B981', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                + Add <ArrowUpRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {agendaEvents.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', padding: '20px 0' }}>
                  No commitments scheduled for this date.
                </div>
              ) : (
                agendaEvents.map(evt => (
                  <div
                    key={evt.id}
                    onClick={() => handleEventClick(evt)}
                    style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}
                  >
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
        </div>
      </div>
      )}

      {/* MODAL: ADD EVENT */}
      {showAddEventModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <form onSubmit={handleCreateEvent} className="card modal-animate" style={{ width: '500px', padding: '28px', borderRadius: 'var(--radius-xl)', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <Plus size={20} color="#10B981" /> Schedule New Event
              </h3>
              <button type="button" onClick={() => setShowAddEventModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Event Title *</label>
              <input
                type="text"
                value={evtTitle}
                onChange={(e) => setEvtTitle(e.target.value)}
                placeholder="e.g. Work on UI Design, Client Meeting..."
                required
                className="input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Category</label>
                <select value={evtCategory} onChange={(e) => setEvtCategory(e.target.value)} className="input">
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="learning">Learning</option>
                  <option value="health">Health</option>
                  <option value="travel">Travel</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Date *</label>
                <input type="date" value={evtDate} onChange={(e) => setEvtDate(e.target.value)} required className="input" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Start Time</label>
                <input type="time" value={evtTime.includes(':') ? evtTime : '10:00'} onChange={(e) => setEvtTime(e.target.value)} className="input" />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Duration (Hours)</label>
                <select value={evtDuration} onChange={(e) => setEvtDuration(e.target.value)} className="input">
                  <option value="0.5">0.5 Hour (30m)</option>
                  <option value="1">1 Hour</option>
                  <option value="1.5">1.5 Hours</option>
                  <option value="2">2 Hours</option>
                  <option value="3">3 Hours</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description / Notes (Optional)</label>
              <textarea
                rows={2}
                value={evtDesc}
                onChange={(e) => setEvtDesc(e.target.value)}
                placeholder="Add meeting agenda, notes, or links..."
                className="input"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowAddEventModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ background: '#10B981' }}>Save Event</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD HOLIDAY (TL ONLY) */}
      {showAddHolidayModal && role === 'TL' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <form onSubmit={handleCreateHoliday} className="card modal-animate" style={{ width: '500px', padding: '28px', borderRadius: 'var(--radius-xl)', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <Sparkles size={20} color="#6366F1" /> Declare Official Holiday
              </h3>
              <button type="button" onClick={() => setShowAddHolidayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Holiday Title *</label>
              <input
                type="text"
                value={holTitle}
                onChange={(e) => setHolTitle(e.target.value)}
                placeholder="e.g. Ganesh Chaturthi, New Year..."
                required
                className="input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Date *</label>
                <input type="date" value={holDate} onChange={(e) => setHolDate(e.target.value)} required className="input" />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Holiday Type</label>
                <select value={holType} onChange={(e) => setHolType(e.target.value)} className="input">
                  <option value="Paid Off">Paid Off</option>
                  <option value="Optional Off">Optional Off</option>
                  <option value="Restricted Holiday">Restricted Holiday</option>
                  <option value="Public Holiday">Public Holiday</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description / Notes (Optional)</label>
              <textarea
                rows={2}
                value={holDesc}
                onChange={(e) => setHolDesc(e.target.value)}
                placeholder="Add notes about paid leave policies..."
                className="input"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowAddHolidayModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" disabled={holidaySaving} className="btn btn-primary" style={{ background: '#6366F1' }}>
                {holidaySaving ? 'Saving...' : 'Add Holiday'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TASK DETAILS MODAL */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          currentUser={user}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={loadData}
          onUpdate={loadData}
        />
      )}

      {/* EVENT DETAILS MODAL */}
      {selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div className="card modal-animate" style={{ width: '480px', padding: '24px', borderRadius: 'var(--radius-xl)', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: selectedEvent.color || '#EFF6FF', color: selectedEvent.textColor || '#1E40AF', textTransform: 'uppercase' }}>
                  {selectedEvent.tag || selectedEvent.category || 'Event'}
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '8px 0 0 0', color: 'var(--text-primary)' }}>
                  {selectedEvent.title}
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={16} color="#10B981" />
                <span><strong>Date:</strong> {selectedEvent.date}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#10B981" />
                <span><strong>Time:</strong> {selectedEvent.startTime || 'All day'} {selectedEvent.duration ? `(${selectedEvent.duration} hr${selectedEvent.duration > 1 ? 's' : ''})` : ''}</span>
              </div>
              {selectedEvent.subText && (
                <div style={{ background: 'var(--background)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '4px' }}>Notes / Description</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{selectedEvent.subText}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              {selectedEvent.id?.startsWith('evt_') ? (
                <button
                  onClick={() => handleDeleteCustomEvent(selectedEvent.id)}
                  className="btn btn-secondary"
                  style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <Trash2 size={14} /> Delete Event
                </button>
              ) : <div />}
              <button onClick={() => setSelectedEvent(null)} className="btn btn-primary" style={{ background: '#10B981', padding: '8px 20px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
