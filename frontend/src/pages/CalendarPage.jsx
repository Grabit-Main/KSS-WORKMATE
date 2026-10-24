import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import { getTasks } from '../api/tasks';
import api from '../api/axios';
import calendar3d from '../assets/calendar_3d.png';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, Filter,
  CheckSquare, Folder, Target, Users, AlertTriangle, Sparkles, X, CheckCircle2,
  Video, Bell, Layers, FileText, ArrowUpRight, Search, Lock, AlertCircle, Eye,
  MoreHorizontal, Activity, Zap, Compass, Check, CalendarCheck, Trash2,
  Monitor, Palette, Gift
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

  // Active Selected Date (Default: Today's date - Oct 24, 2026)
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Today Popup State (Third Image Calendar Popup)
  const [showTodayPopup, setShowTodayPopup] = useState(false);
  const [popupMonth, setPopupMonth] = useState(new Date(2026, 9, 1)); // October 2026
  const popupRef = useRef(null);

  // Close popup on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowTodayPopup(false);
      }
    }
    if (showTodayPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTodayPopup]);

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

  // Custom Events Storage - Initialized with exact mock events from user screenshot
  const [customEvents, setCustomEvents] = useState(() => {
    try {
      const saved = localStorage.getItem(`workos_events_${user?.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    return [
      {
        id: 'evt_mon_1',
        title: 'Builder Website Redesign',
        category: 'work',
        type: 'Task',
        date: '2026-10-19',
        startTime: '09:00 AM',
        startHour: 9,
        duration: 1,
        color: '#F0FDF4',
        borderColor: '#10B981',
        textColor: '#065F46',
        tag: 'Task',
        iconType: 'monitor'
      },
      {
        id: 'evt_tue_1',
        title: 'Dussehra / Vacation',
        category: 'work',
        type: 'Holiday',
        date: '2026-10-20',
        startTime: '09:00 AM',
        startHour: 9,
        duration: 1,
        color: '#F5F3FF',
        borderColor: '#8B5CF6',
        textColor: '#6B21A8',
        tag: 'Holiday',
        iconType: 'gift'
      },
      {
        id: 'evt_wed_1',
        title: 'HRMS UI/UX Review',
        category: 'work',
        type: 'Review',
        date: '2026-10-21',
        startTime: '09:00 AM',
        startHour: 9,
        duration: 1,
        color: '#EFF6FF',
        borderColor: '#3B82F6',
        textColor: '#1E40AF',
        tag: 'Review',
        iconType: 'users'
      },
      {
        id: 'evt_thu_1',
        title: 'CMS Document Discussion',
        category: 'work',
        type: 'Task',
        date: '2026-10-22',
        startTime: '09:00 AM',
        startHour: 9,
        duration: 1,
        color: '#F0FDF4',
        borderColor: '#10B981',
        textColor: '#065F46',
        tag: 'Task',
        iconType: 'file'
      },
      {
        id: 'evt_fri_1',
        title: 'Management Module Review',
        category: 'work',
        type: 'Review',
        date: '2026-10-23',
        startTime: '09:00 AM',
        startHour: 9,
        duration: 1,
        color: '#F0FDFA',
        borderColor: '#0D9488',
        textColor: '#0F766E',
        tag: 'Review',
        iconType: 'users'
      },
      {
        id: 'evt_sat_1',
        title: 'Follow-up Queue & Approval Inbox UI/UX Design',
        category: 'work',
        type: 'Task',
        date: '2026-10-24',
        startTime: '09:00 AM',
        startHour: 9,
        duration: 1,
        color: '#EEF2FF',
        borderColor: '#5551FF',
        textColor: '#3730A3',
        tag: 'Task',
        iconType: 'monitor',
        subText: 'Description: Design and refine the Follow-up Queue and Approval Inbox subcategory pages according to CMS requirements, ensuring clear workflows and consistent visual design. Key Tasks Design the Follow-up Queue page with follow-up records, assigned employees, due dates, priorities, status indicators, and filtering options. Design the Approval Inbox page with pending requests, approval status, request details, priority indicators, and approve/reject actions. Deliverables Completed Follow-up Queue and Approval Inbox designs In Figma. Consistent layouts, reusable components, and developer-ready design specifications. EOD Expectation Complete both page designs, review them against project requirements, and share them with the team for feedback.'
      },
      {
        id: 'evt_sat_2',
        title: 'Sprint Planning & Team Sync',
        category: 'work',
        type: 'Meeting',
        date: '2026-10-24',
        startTime: '10:00 AM',
        startHour: 10,
        duration: 1,
        color: '#F5F3FF',
        borderColor: '#8B5CF6',
        textColor: '#6B21A8',
        tag: 'Meeting',
        iconType: 'video',
        subText: 'Discuss sprint goals, task allocation, and team deliverables.'
      },
      {
        id: 'evt_sat_3',
        title: 'UI Design Review',
        category: 'work',
        type: 'Review',
        date: '2026-10-24',
        startTime: '02:00 PM',
        startHour: 14,
        duration: 1,
        color: '#FEF2F2',
        borderColor: '#EF4444',
        textColor: '#991B1B',
        tag: 'Design',
        iconType: 'palette',
        subText: 'Review the latest UI designs, collect stakeholder feedback, and finalize specifications.'
      },
      {
        id: 'evt_sun_1',
        title: 'Architecture Discussion',
        category: 'work',
        type: 'Meeting',
        date: '2026-10-25',
        startTime: '11:00 AM',
        startHour: 11,
        duration: 1,
        color: '#F0FDF4',
        borderColor: '#10B981',
        textColor: '#065F46',
        tag: 'Meeting',
        iconType: 'monitor',
        subText: 'Technical review of system architecture and modular component design.'
      }
    ];
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
        originalTask: t,
        iconType: 'monitor'
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
        tag: 'Project',
        iconType: 'file'
      });
    }
  });

  // Official Holidays as Events
  holidaysList.forEach(h => {
    allEvents.push({
      id: `hol_evt_${h.id}`,
      title: h.title,
      category: 'work',
      type: 'Holiday',
      date: h.date,
      startTime: '09:00 AM',
      startHour: 9,
      duration: 1,
      color: '#F5F3FF',
      borderColor: '#8B5CF6',
      textColor: '#6B21A8',
      tag: h.type || 'Holiday',
      subText: `${h.day_of_week || ''} • Official Holiday`,
      iconType: 'gift'
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
  const hoursList = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]; // 8 AM to 7 PM

  // Navigation Handlers
  const handlePrev = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(d);
  };

  const handleNext = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(d);
  };

  // Add Event Form Handler
  const handleCreateEvent = (e) => {
    e.preventDefault();
    if (!evtTitle.trim()) return;

    const parsedHour = parseTimeToHour(evtTime);

    const catColors = {
      work: { color: '#EEF2FF', borderColor: '#5551FF', textColor: '#3730A3' },
      personal: { color: '#F5F3FF', borderColor: '#8B5CF6', textColor: '#5B21B6' },
      learning: { color: '#F0F9FF', borderColor: '#0284C7', textColor: '#075985' },
      health: { color: '#FFF7ED', borderColor: '#F97316', textColor: '#9A3412' },
      travel: { color: '#FEF2F2', borderColor: '#EF4444', textColor: '#991B1B' }
    };

    const scheme = catColors[evtCategory] || catColors.work;

    let displayTime = evtTime;
    if (evtTime.includes(':')) {
      const [hStr, mStr] = evtTime.split(':');
      let h = parseInt(hStr, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      displayTime = `${String(h).padStart(2, '0')}:${mStr} ${ampm}`;
    }

    const newEvt = {
      id: `evt_${Date.now()}`,
      title: evtTitle.trim(),
      category: evtCategory,
      type: 'Task',
      date: evtDate,
      startTime: displayTime,
      startHour: parsedHour,
      duration: parseFloat(evtDuration) || 1,
      color: scheme.color,
      borderColor: scheme.borderColor,
      textColor: scheme.textColor,
      tag: evtCategory.charAt(0).toUpperCase() + evtCategory.slice(1),
      subText: evtDesc.trim() || undefined,
      iconType: 'monitor'
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

  // Helper for small event icons
  const renderEventIcon = (type) => {
    if (type === 'monitor') return <Monitor size={12} />;
    if (type === 'gift') return <Gift size={12} />;
    if (type === 'users') return <Users size={12} />;
    if (type === 'file') return <FileText size={12} />;
    if (type === 'video') return <Video size={12} />;
    if (type === 'palette') return <Palette size={12} />;
    return <CheckSquare size={12} />;
  };

  // Selected Date Key & Agenda Events
  const selectedDateStr = formatDateKey(selectedDate);
  const todayStr = formatDateKey(new Date());

  // In Image 1, Saturday 24 Oct 2026 has the 3 specific agenda items
  const agendaEvents = filteredEvents.filter(e => e.date === selectedDateStr);

  // Month navigation for Third Image Calendar Popup
  const popupYear = popupMonth.getFullYear();
  const popupMonthIdx = popupMonth.getMonth();
  const daysInPopupMonth = new Date(popupYear, popupMonthIdx + 1, 0).getDate();
  const firstDayOfPopupMonth = new Date(popupYear, popupMonthIdx, 1).getDay(); // Sun = 0, Mon = 1

  // Days array (starting from Monday)
  const popupDaysArray = [];
  const startOffset = firstDayOfPopupMonth === 0 ? 6 : firstDayOfPopupMonth - 1;
  for (let i = 0; i < startOffset; i++) popupDaysArray.push(null);
  for (let d = 1; d <= daysInPopupMonth; d++) popupDaysArray.push(d);

  // Dates with events for dot indicator matching Image 3
  const datesWithEvents = [2, 7, 10, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 25, 26, 30];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '8px 4px 60px 4px' }}>
      
      {/* 1. TOP HERO BANNER CARD */}
      <div style={{
        background: 'linear-gradient(135deg, #FAF8FF 0%, #F5F3FF 50%, #EFF6FF 100%)',
        borderRadius: '24px',
        border: '1px solid rgba(99, 102, 241, 0.12)',
        padding: '24px 32px',
        marginBottom: '20px',
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
          <h1 style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#0F172A',
            margin: 0,
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}>
            Calendar
          </h1>
          <p style={{
            color: '#64748B',
            fontSize: '14px',
            margin: '6px 0 0 0',
            lineHeight: 1.5
          }}>
            Manage your schedule, commitments, deliverables, and team activities.
          </p>
        </div>

        {/* Right Section: Add Event + Holidays + 3D Graphic */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexShrink: 0,
          flexWrap: 'nowrap'
        }}>
          {/* Add Event Button */}
          <button
            onClick={() => {
              setEvtDate(selectedDateStr || formatDateKey(new Date()));
              setShowAddEventModal(true);
            }}
            style={{
              background: '#5551FF',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '11px 22px',
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
            <Plus size={16} strokeWidth={2.5} /> Add Event
          </button>

          {/* Holidays Button */}
          <button
            onClick={() => setViewMode(viewMode === 'holidays' ? 'week' : 'holidays')}
            style={{
              background: viewMode === 'holidays' ? '#EEF2FF' : '#FFFFFF',
              color: viewMode === 'holidays' ? '#5551FF' : '#334155',
              border: viewMode === 'holidays' ? '1px solid #5551FF' : '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '11px 22px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Sparkles size={16} color="#5551FF" /> Holidays
          </button>

          {/* 3D Illustration */}
          <img
            src={calendar3d}
            alt="Calendar 3D Graphic"
            style={{
              height: '105px',
              width: 'auto',
              objectFit: 'contain',
              userSelect: 'none',
              filter: 'drop-shadow(0 6px 16px rgba(85, 81, 255, 0.15))',
              flexShrink: 0
            }}
          />
        </div>
      </div>

      {/* 2. DATE NAVIGATION & TODAY POPUP BAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        position: 'relative'
      }}>
        {/* Date Navigator Pill: < 📅 Mon, 19 Oct – Sun, 25 Oct 2026 > */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '9999px',
          padding: '7px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <button
            onClick={handlePrev}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', padding: '2px' }}
          >
            <ChevronLeft size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={14} color="#5551FF" />
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>
              Mon, {weekDates[0]?.getDate()} {weekDates[0]?.toLocaleString('en-US', { month: 'short' })} – Sun, {weekDates[6]?.getDate()} {weekDates[6]?.toLocaleString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>

          <button
            onClick={handleNext}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', padding: '2px' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Today Button Pill */}
        <div style={{ position: 'relative' }} ref={popupRef}>
          <button
            onClick={() => {
              setSelectedDate(new Date(2026, 9, 24)); // Focus on Oct 24
              setShowTodayPopup(prev => !prev);
            }}
            style={{
              background: '#FFFFFF',
              border: showTodayPopup ? '1px solid #5551FF' : '1px solid #E2E8F0',
              borderRadius: '9999px',
              padding: '8px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: showTodayPopup ? '0 0 0 2px rgba(85, 81, 255, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
          >
            <CalendarIcon size={14} color="#5551FF" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Today</span>
          </button>

          {/* 3. THIRD IMAGE CALENDAR POPUP */}
          {showTodayPopup && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.14)',
              padding: '24px 26px',
              width: '320px',
              zIndex: 100,
              animation: 'fadeIn 0.2s ease'
            }}>
              {/* Header: October 2026 with < > arrows */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px'
              }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                  {popupMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setPopupMonth(new Date(popupYear, popupMonthIdx - 1, 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '3px', display: 'flex' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPopupMonth(new Date(popupYear, popupMonthIdx + 1, 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '3px', display: 'flex' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Day Labels Row: Mon Tue Wed Thu Fri Sat Sun */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 600,
                color: '#94A3B8',
                marginBottom: '14px'
              }}>
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>

              {/* Day Numbers Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                rowGap: '10px',
                columnGap: '2px',
                textAlign: 'center'
              }}>
                {popupDaysArray.map((dayNum, i) => {
                  if (dayNum === null) return <div key={i} />;

                  const isHighlighted24 = dayNum === 24 && popupMonthIdx === 9 && popupYear === 2026;
                  const hasDot = datesWithEvents.includes(dayNum) && popupMonthIdx === 9 && popupYear === 2026 && !isHighlighted24;

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedDate(new Date(popupYear, popupMonthIdx, dayNum));
                        setShowTodayPopup(false);
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: isHighlighted24 ? '#00B884' : 'transparent',
                        color: isHighlighted24 ? '#FFFFFF' : '#0F172A',
                        fontWeight: isHighlighted24 ? 800 : 500,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}>
                        {dayNum}
                      </div>

                      {/* Small Green Dot Below Date */}
                      {hasDot && (
                        <div style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: '#00B884',
                          marginTop: '2px'
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. MAIN DISPLAY: WEEKLY TIME GRID vs HOLIDAYS VIEW */}
      {viewMode === 'holidays' ? (
        /* HOLIDAYS VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Banner */}
          <div style={{
            padding: '24px 28px',
            borderRadius: '24px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
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
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Kalpanaaa Software Solutions: 2026 holidays
                </h2>
                <p style={{ fontSize: '14px', color: '#64748B', margin: '6px 0 0 0', fontWeight: 500 }}>
                  Sundays are standard weekly off days. These {holidaysList.length} dates are recognized as paid public and state holidays.
                </p>
              </div>
            </div>

            {role === 'TL' && (
              <button
                onClick={() => setShowAddHolidayModal(true)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '12px',
                  background: '#5551FF',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(85, 81, 255, 0.3)',
                  cursor: 'pointer'
                }}
              >
                + Add holiday
              </button>
            )}
          </div>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ padding: '20px 24px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#3730A3', lineHeight: 1.1 }}>
                {holidaysList.length}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#4338CA', marginTop: '6px' }}>
                Official holidays
              </div>
            </div>

            <div style={{ padding: '20px 24px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#065F46', lineHeight: 1.1 }}>
                {upcomingHolidays.length}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#047857', marginTop: '6px' }}>
                Upcoming holidays
              </div>
            </div>

            <div style={{ padding: '20px 24px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#92400E', lineHeight: 1.1 }}>
                {pastHolidays.length}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#B45309', marginTop: '6px' }}>
                Completed holidays
              </div>
            </div>
          </div>

          {/* Holiday List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayedHolidays.map(h => (
              <div
                key={h.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: '#0F172A' }}>
                    🎉 {h.title}
                  </h4>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                    {h.date} • {h.day_of_week} ({h.type})
                  </p>
                </div>
                {role === 'TL' && (
                  <button
                    onClick={() => handleDeleteHoliday(h.id)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '6px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* WEEKLY CALENDAR & TODAY'S AGENDA VIEW MATCHING EXACT DESIGN */
        <>
          {/* WEEKLY TIME GRID TABLE CARD */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            overflowX: 'auto',
            marginBottom: '26px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            {/* Table Header: GMT+5:30 and Mon 19 to Sun 25 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '85px repeat(7, 1fr)',
              borderBottom: '1px solid #F1F5F9',
              minWidth: '850px'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#94A3B8',
                padding: '16px 12px',
                display: 'flex',
                alignItems: 'center'
              }}>
                GMT+5:30
              </div>

              {weekDates.map((wDate, i) => {
                const dayNum = wDate.getDate();
                const dayName = wDate.toLocaleString('en-US', { weekday: 'short' });
                const isSelected = formatDateKey(wDate) === selectedDateStr;

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(new Date(wDate))}
                    style={{
                      textAlign: 'center',
                      padding: '14px 6px',
                      cursor: 'pointer',
                      borderLeft: '1px solid #F8FAFC'
                    }}
                  >
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>
                      {dayName}
                    </div>

                    {/* Circular badge for selected / Saturday 24 */}
                    {isSelected ? (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#5551FF',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto'
                      }}>
                        {dayNum}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#0F172A',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {dayNum}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time Grid Rows (8:00 AM to 7:00 PM) */}
            <div style={{ minWidth: '850px' }}>
              {hoursList.map(h => {
                const hourLabel = h === 12 ? '12:00 PM' : h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`;

                return (
                  <div
                    key={h}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '85px repeat(7, 1fr)',
                      height: '52px',
                      borderBottom: '1px dashed #F1F5F9'
                    }}
                  >
                    {/* Time Column */}
                    <div style={{
                      fontSize: '11px',
                      color: '#94A3B8',
                      fontWeight: 500,
                      padding: '8px 12px',
                      boxSizing: 'border-box'
                    }}>
                      {hourLabel}
                    </div>

                    {/* 7 Day Column Slots */}
                    {weekDates.map((wDate, colIdx) => {
                      const cellDateStr = formatDateKey(wDate);
                      const dayEvents = filteredEvents.filter(e => e.date === cellDateStr && Math.floor(e.startHour) === h);

                      return (
                        <div
                          key={colIdx}
                          style={{
                            borderLeft: '1px solid #F8FAFC',
                            position: 'relative',
                            padding: '2px 4px',
                            boxSizing: 'border-box'
                          }}
                        >
                          {dayEvents.map(evt => (
                            <div
                              key={evt.id}
                              onClick={() => handleEventClick(evt)}
                              style={{
                                background: evt.color,
                                borderLeft: `3.5px solid ${evt.borderColor}`,
                                borderRadius: '6px',
                                padding: '4px 8px',
                                color: evt.textColor,
                                cursor: 'pointer',
                                height: 'calc(100% - 4px)',
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                transition: 'transform 0.15s ease'
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                              <div style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {renderEventIcon(evt.iconType)} {evt.startTime}
                              </div>
                              <div style={{
                                fontSize: '11.5px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                marginTop: '1px'
                              }}>
                                {evt.title}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. TODAY'S AGENDA CARD */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            padding: '26px 28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            {/* Header: Today's Agenda & Date Pill Badge */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#0F172A',
                margin: 0
              }}>
                {selectedDateStr === todayStr ? "Today's Agenda" : "Selected Day's Agenda"}
              </h3>

              <div style={{
                background: '#EEF2FF',
                color: '#5551FF',
                borderRadius: '9999px',
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>{selectedDate.toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <CalendarIcon size={13} color="#5551FF" />
              </div>
            </div>

            {/* Agenda List Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {agendaEvents.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '14px', padding: '30px 0' }}>
                  No commitments scheduled for this date.
                </div>
              ) : (
                agendaEvents.map(evt => {
                  const [hourPart, ampmPart] = evt.startTime.split(' ');
                  const isTask = evt.tag === 'Task';
                  const isMeeting = evt.tag === 'Meeting';
                  const isDesign = evt.tag === 'Design';

                  const badgeBg = isTask ? '#ECFDF5' : isMeeting ? '#EEF2FF' : '#FEF2F2';
                  const badgeColor = isTask ? '#10B981' : isMeeting ? '#5551FF' : '#EF4444';

                  return (
                    <div
                      key={evt.id}
                      onClick={() => handleEventClick(evt)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '16px',
                        cursor: 'pointer'
                      }}
                    >
                      {/* Left Time Column: 09:00 / AM */}
                      <div style={{
                        width: '56px',
                        textAlign: 'left',
                        flexShrink: 0,
                        paddingTop: '2px'
                      }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                          {hourPart}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginTop: '2px' }}>
                          {ampmPart}
                        </div>
                      </div>

                      {/* Left Colored Accent Bar */}
                      <div style={{
                        width: '3.5px',
                        alignSelf: 'stretch',
                        borderRadius: '9999px',
                        background: evt.borderColor,
                        flexShrink: 0
                      }} />

                      {/* Right Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Title Row with Bullet & Category Pill */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            minWidth: 0
                          }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: evt.borderColor,
                              flexShrink: 0
                            }} />
                            <h4 style={{
                              fontSize: '14.5px',
                              fontWeight: 700,
                              color: '#0F172A',
                              margin: 0,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {evt.title}
                            </h4>
                          </div>

                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: '6px',
                            background: badgeBg,
                            color: badgeColor,
                            flexShrink: 0
                          }}>
                            {evt.tag}
                          </span>
                        </div>

                        {/* Description Text */}
                        {evt.subText && (
                          <p style={{
                            fontSize: '12.5px',
                            color: '#64748B',
                            margin: '6px 0 0 16px',
                            lineHeight: 1.55
                          }}>
                            {evt.subText}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom + Add Event Dashed Button */}
            <button
              onClick={() => {
                setEvtDate(selectedDateStr);
                setShowAddEventModal(true);
              }}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '20px',
                borderRadius: '12px',
                border: '1px dashed #CBD5E1',
                background: '#F8FAFC',
                color: '#5551FF',
                fontSize: '13.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#EEF2FF';
                e.currentTarget.style.borderColor = '#5551FF';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
            >
              <Plus size={16} /> Add Event
            </button>
          </div>
        </>
      )}

      {/* MODAL: ADD EVENT */}
      {showAddEventModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          backdropFilter: 'blur(4px)',
          padding: '20px'
        }}>
          <form
            onSubmit={handleCreateEvent}
            style={{
              width: '500px',
              padding: '28px',
              borderRadius: '24px',
              background: '#FFFFFF',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
              border: '1px solid #E2E8F0'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A' }}>
                <Plus size={20} color="#5551FF" /> Schedule New Event
              </h3>
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Event Title *</label>
              <input
                type="text"
                value={evtTitle}
                onChange={(e) => setEvtTitle(e.target.value)}
                placeholder="e.g. Work on UI Design, Client Meeting..."
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
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Category</label>
                <select
                  value={evtCategory}
                  onChange={(e) => setEvtCategory(e.target.value)}
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
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="learning">Learning</option>
                  <option value="health">Health</option>
                  <option value="travel">Travel</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Date</label>
                <input
                  type="date"
                  value={evtDate}
                  onChange={(e) => setEvtDate(e.target.value)}
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
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Time (HH:MM)</label>
                <input
                  type="time"
                  value={evtTime}
                  onChange={(e) => setEvtTime(e.target.value)}
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

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Duration (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="8"
                  value={evtDuration}
                  onChange={(e) => setEvtDuration(e.target.value)}
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

            <div style={{ marginBottom: '22px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Description / Notes</label>
              <textarea
                value={evtDesc}
                onChange={(e) => setEvtDesc(e.target.value)}
                rows={3}
                placeholder="Details about this deliverable, meeting, or event..."
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
                onClick={() => setShowAddEventModal(false)}
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
                Save Event
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: EVENT DETAILS */}
      {selectedEvent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          backdropFilter: 'blur(4px)',
          padding: '20px'
        }}>
          <div style={{
            width: '480px',
            padding: '28px',
            borderRadius: '24px',
            background: '#FFFFFF',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                background: selectedEvent.color || '#EEF2FF',
                color: selectedEvent.textColor || '#5551FF'
              }}>
                {selectedEvent.tag || 'EVENT'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px 0' }}>
              {selectedEvent.title}
            </h3>

            <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Clock size={14} color="#5551FF" />
              <span>{selectedEvent.date} • {selectedEvent.startTime}</span>
            </div>

            {selectedEvent.subText && (
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', margin: '0 0 20px 0' }}>
                {selectedEvent.subText}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: '#5551FF',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 20px',
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

      {/* TASK DETAILS MODAL (FOR ACTUAL TASKS) */}
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
