import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, CheckCircle2, Clock, AlertTriangle, HelpCircle, Flame,
  Search, Filter, Calendar, FolderKanban, Eye, Edit3, Plus, ArrowUpRight,
  TrendingUp, RefreshCw, X, ShieldAlert, ChevronLeft, ChevronRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { getTasks, deleteTask, updateTask } from '../../api/tasks';
import { getUsers } from '../../api/users';
import { getProjects } from '../../api/projects';
import { getDailyPulses, getBlockers, getHelpRequests, getFocusSessions } from '../../api/mywork';
import DeveloperWorkDrawer from './DeveloperWorkDrawer';
import AddTaskModal from '../quickadd/AddTaskModal';

// Helper date functions
const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (dateStr) => {
  const target = dateStr || getTodayDateStr();
  const parts = target.split('-').map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  return target;
};

const getTaskDateStrings = (t) => {
  const dates = [];
  const addDate = (val) => {
    if (!val) return;
    if (typeof val === 'string') {
      const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) {
        dates.push(match[1]);
        return;
      }
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${day}`);
    }
  };

  addDate(t.scheduled_date);
  addDate(t.deadline);
  addDate(t.due_date);
  addDate(t.target_date);
  if (dates.length === 0) {
    addDate(t.created_at);
  }
  return dates;
};

// DatePickerPopover Component
const DatePickerPopover = ({ selectedDate, onApply, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  const [viewYear, setViewYear] = useState(() => {
    const target = selectedDate || getTodayDateStr();
    const parts = target.split('-').map(Number);
    return parts.length === 3 ? parts[0] : new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    const target = selectedDate || getTodayDateStr();
    const parts = target.split('-').map(Number);
    return parts.length === 3 ? parts[1] - 1 : new Date().getMonth();
  });

  const [tempSelectedDate, setTempSelectedDate] = useState(selectedDate || getTodayDateStr());

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const target = selectedDate || getTodayDateStr();
    setTempSelectedDate(target);
    if (target) {
      const parts = target.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setViewYear(parts[0]);
        setViewMonth(parts[1] - 1);
      }
    }
  }, [selectedDate]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarCells = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarCells.push({
      dayNum: daysInPrevMonth - i,
      isCurrentMonth: false,
      dateStr: ''
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    const dateStr = `${viewYear}-${mStr}-${dStr}`;
    calendarCells.push({
      dayNum: d,
      isCurrentMonth: true,
      dateStr
    });
  }

  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      dayNum: i,
      isCurrentMonth: false,
      dateStr: ''
    });
  }

  const handleApply = () => {
    const finalDate = tempSelectedDate || getTodayDateStr();
    onApply(finalDate);
    setIsOpen(false);
  };

  const handleClear = () => {
    const today = getTodayDateStr();
    setTempSelectedDate(today);
    onClear();
    setIsOpen(false);
  };

  const isFilterActive = Boolean(selectedDate);
  const activeHighlightDate = tempSelectedDate || selectedDate || getTodayDateStr();

  return (
    <div ref={popoverRef} style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 600,
          background: isFilterActive ? '#EEF2FF' : (isOpen ? '#FFFFFF' : '#F8FAFC'),
          color: (isFilterActive || isOpen) ? '#4F46E5' : '#334155',
          border: (isFilterActive || isOpen) ? '1.5px solid #4F46E5' : '1px solid var(--border)',
          boxShadow: (isFilterActive || isOpen) ? '0 0 0 3px rgba(79, 70, 229, 0.12)' : 'none',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap'
        }}
      >
        <Calendar size={15} color={(isFilterActive || isOpen) ? '#4F46E5' : '#64748B'} />
        <span>{formatDateLabel(selectedDate)}</span>
        {isOpen ? <ChevronUp size={14} color="#4F46E5" /> : <ChevronDown size={14} color={isFilterActive ? '#4F46E5' : '#64748B'} />}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 100,
            background: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.06)',
            padding: '20px',
            width: '290px',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569'
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569'
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '8px' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <span key={day} style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                {day}
              </span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '18px' }}>
            {calendarCells.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '6px 0',
                      fontSize: '12px',
                      color: '#CBD5E1',
                      cursor: 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {cell.dayNum}
                  </div>
                );
              }

              const isSelected = activeHighlightDate === cell.dateStr;

              return (
                <div
                  key={idx}
                  onClick={() => setTempSelectedDate(cell.dateStr)}
                  style={{
                    padding: '6px 0',
                    fontSize: '12px',
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? '#FFFFFF' : '#1E293B',
                    background: isSelected ? '#4F46E5' : 'transparent',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#F1F5F9';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {cell.dayNum}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleClear}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#EEF2FF',
                color: '#4F46E5',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleApply}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#4F46E5',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
                transition: 'background 0.15s ease'
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ProjectFilterPopover Component
const ProjectFilterPopover = ({ projects, selectedProjectId, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedProj = projects.find((p) => String(p.id) === String(selectedProjectId));
  const isFiltered = selectedProjectId !== 'all';

  const formatLabel = () => {
    if (!isFiltered || !selectedProj) return '📁 All Projects';
    return `📁 ${selectedProj.name}`;
  };

  const filteredProjects = projects.filter((p) =>
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={popoverRef} style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 600,
          background: isFiltered ? '#EEF2FF' : (isOpen ? '#FFFFFF' : '#F8FAFC'),
          color: (isFiltered || isOpen) ? '#4F46E5' : '#334155',
          border: (isFiltered || isOpen) ? '1.5px solid #4F46E5' : '1px solid var(--border)',
          boxShadow: (isFiltered || isOpen) ? '0 0 0 3px rgba(79, 70, 229, 0.12)' : 'none',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
          maxWidth: '180px'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {formatLabel()}
        </span>
        {isOpen ? <ChevronUp size={14} color="#4F46E5" /> : <ChevronDown size={14} color={isFiltered ? '#4F46E5' : '#64748B'} />}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 100,
            background: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.06)',
            padding: '12px',
            width: '240px',
            userSelect: 'none'
          }}
        >
          {projects.length > 5 && (
            <div style={{ marginBottom: '8px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 28px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '11px',
                  outline: 'none',
                  background: '#F8FAFC'
                }}
              />
              <Search size={12} color="#94A3B8" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          )}

          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div
              onClick={() => {
                onChange('all');
                setIsOpen(false);
              }}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: selectedProjectId === 'all' ? 700 : 500,
                color: selectedProjectId === 'all' ? '#4F46E5' : '#1E293B',
                background: selectedProjectId === 'all' ? '#EEF2FF' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => { if (selectedProjectId !== 'all') e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { if (selectedProjectId !== 'all') e.currentTarget.style.background = 'transparent'; }}
            >
              <span>📁 All Projects</span>
            </div>

            {filteredProjects.map((p) => {
              const isSelected = String(selectedProjectId) === String(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onChange(p.id);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? '#4F46E5' : '#1E293B',
                    background: isSelected ? '#EEF2FF' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#F1F5F9'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </div>
              );
            })}

            {filteredProjects.length === 0 && (
              <div style={{ padding: '10px', fontSize: '11px', color: '#94A3B8', textAlign: 'center' }}>
                No projects found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function ManagementMyWorkView({ user }) {
  const role = user?.role || 'TL';
  const isTL = role === 'TL';
  const isPM = role === 'PM';
  const isCTO = role === 'CTO';
  const isCEO = role === 'CEO';

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dailyPulses, setDailyPulses] = useState([]);
  const [blockers, setBlockers] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [focusSessions, setFocusSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevId, setSelectedDevId] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());

  // Drawer & Modal State
  const [selectedDrawerDev, setSelectedDrawerDev] = useState(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, usersRes, projectsRes, pulsesRes, blockersRes, helpRes, focusRes] = await Promise.all([
        getTasks().catch(() => []),
        getUsers().catch(() => []),
        getProjects().catch(() => []),
        getDailyPulses().catch(() => []),
        getBlockers().catch(() => []),
        getHelpRequests().catch(() => []),
        getFocusSessions().catch(() => [])
      ]);

      setTasks(Array.isArray(tasksRes) ? tasksRes : []);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setProjects(Array.isArray(projectsRes) ? projectsRes : []);
      setDailyPulses(Array.isArray(pulsesRes) ? pulsesRes : []);
      setBlockers(Array.isArray(blockersRes) ? blockersRes : []);
      setHelpRequests(Array.isArray(helpRes) ? helpRes : []);
      setFocusSessions(Array.isArray(focusRes) ? focusRes : []);
    } catch (err) {
      console.error('Error loading management developer work data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Eligible developers in scope (exclude executives & management from developer tables)
  const developersInScope = users.filter((u) => u.role !== 'CEO' && u.role !== 'CTO' && u.role !== 'PM');

  // Filter Developer Tasks (strictly excludes management's own tasks if any)
  const filteredTasks = tasks.filter((t) => {
    // Must be assigned to a developer in scope (not management self-assigned tasks)
    const assigneeId = String(t.assigned_to || t.assignee?.id || '');
    const isDevTask = developersInScope.some((d) => String(d.id) === assigneeId);

    if (!isDevTask && String(t.assigned_to) === String(user?.id)) {
      return false; // Exclude TL/PM/CTO/CEO's own personal tasks
    }

    if (selectedDevId !== 'all' && assigneeId !== String(selectedDevId)) {
      return false;
    }
    if (selectedProjectId !== 'all' && String(t.project_id || t.project?.id || '') !== String(selectedProjectId)) {
      return false;
    }
    if (selectedStatus !== 'all' && t.status !== selectedStatus) {
      return false;
    }
    if (selectedPriority !== 'all' && t.priority !== selectedPriority) {
      return false;
    }
    if (selectedDate) {
      const taskDates = getTaskDateStrings(t);
      if (!taskDates.includes(selectedDate)) return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const titleMatch = (t.title || '').toLowerCase().includes(q);
      const descMatch = (t.description || '').toLowerCase().includes(q);
      const devNameMatch = (t.assignee?.full_name || `${t.assignee?.first_name || ''} ${t.assignee?.last_name || ''}`).toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !devNameMatch) return false;
    }
    return true;
  });

  // Summary Counts
  const todayStr = new Date().toISOString().split('T')[0];
  const totalDevs = developersInScope.length;
  const activeTasksCount = tasks.filter((t) => ['in_progress', 'not_started'].includes(t.status)).length;
  const completedTodayCount = tasks.filter((t) => t.status === 'completed' && t.updated_at && t.updated_at.startsWith(todayStr)).length;
  const openBlockersCount = blockers.filter((b) => b.status !== 'resolved').length;
  const helpNeededCount = helpRequests.filter((h) => h.status === 'open').length;
  const activeFocusCount = focusSessions.length;

  const getDevName = (t) => {
    if (t.assignee) {
      return `${t.assignee.first_name || ''} ${t.assignee.last_name || ''}`.trim() || t.assignee.email || 'Developer';
    }
    const found = users.find((u) => String(u.id) === String(t.assigned_to));
    if (found) return `${found.first_name || ''} ${found.last_name || ''}`.trim() || found.email || 'Developer';
    return 'Developer';
  };

  const getDevObj = (t) => {
    let dev = t.assignee;
    const found = users.find((u) =>
      String(u.id) === String(t.assigned_to || t.assignee?.id) ||
      (u.email && (u.email === t.assigned_to || u.email === t.assignee?.email)) ||
      (`${u.first_name || ''} ${u.last_name || ''}`.trim() && `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase() === String(t.assigned_to).toLowerCase())
    );
    if (found) {
      return { ...found, ...dev, avatar_url: dev?.avatar_url || found.avatar_url };
    }
    if (dev) return dev;
    return { id: t.assigned_to, first_name: getDevName(t) };
  };

  const getProjectName = (t) => {
    if (t.project) return t.project.name;
    const found = projects.find((p) => String(p.id) === String(t.project_id));
    return found ? found.name : 'Standalone Task';
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '50px' }}>
      {/* HEADER BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
        borderRadius: 'var(--radius-xl, 16px)',
        padding: '24px 28px',
        marginBottom: '24px',
        border: '1px solid var(--border, #E2E8F0)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              background: 'var(--brand-600, #4F46E5)',
              color: '#FFFFFF',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              {role} Developer Work Portal
            </span>
            <span style={{ color: 'var(--text-tertiary, #94A3B8)', fontSize: '12px', fontWeight: 500 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary, #0F172A)', margin: 0, letterSpacing: '-0.02em' }}>
            {isTL ? 'Team Developer Work Control Center' :
             isPM ? 'Project Developer Work Overview' :
             isCTO ? 'Engineering Developer Work Dashboard' :
             'Executive Developer Work Overview'}
          </h1>
          <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '13px', margin: '4px 0 0 0' }}>
            {isTL ? 'Monitor and manage operational developer work across your squad with full CRUD controls.' :
             isPM ? 'Read-only view of developer tasks, progress, blockers, and milestone delivery.' :
             isCTO ? 'Engineering-oriented inspection of active technical deliverables, code velocity, and blockers.' :
             'Executive high-level organization work overview and team developer output.'}
          </p>
        </div>

        {/* TL Add Task Button */}
        {isTL && (
          <button
            onClick={() => setShowAddTaskModal(true)}
            className="btn btn-primary"
            style={{
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              borderRadius: '10px'
            }}
          >
            <Plus size={16} /> Assign Developer Task
          </button>
        )}
      </div>

      {/* SUMMARY METRICS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Total Developers */}
        <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Active Developers</span>
            <Users size={18} color="#4F46E5" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>{totalDevs}</div>
        </div>

        {/* Active Tasks */}
        <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Tasks In Progress</span>
            <Clock size={18} color="#2563EB" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>{activeTasksCount}</div>
        </div>

        {/* Completed Today */}
        <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Completed Today</span>
            <CheckCircle2 size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>{completedTodayCount}</div>
        </div>

        {/* Open Blockers */}
        <div className="card" style={{ padding: '16px 20px', background: '#FEF2F2', borderRadius: '14px', border: '1px solid #FEE2E2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600, textTransform: 'uppercase' }}>Open Blockers</span>
            <AlertTriangle size={18} color="#DC2626" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#991B1B', marginTop: '6px' }}>{openBlockersCount}</div>
        </div>

        {/* Help Requests */}
        <div className="card" style={{ padding: '16px 20px', background: '#FEF3C7', borderRadius: '14px', border: '1px solid #FDE68A' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#D97706', fontWeight: 600, textTransform: 'uppercase' }}>Need Help</span>
            <HelpCircle size={18} color="#D97706" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#92400E', marginTop: '6px' }}>{helpNeededCount}</div>
        </div>

        {/* Focus Sessions */}
        <div className="card" style={{ padding: '16px 20px', background: '#ECFDF5', borderRadius: '14px', border: '1px solid #A7F3D0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>Focus Sessions</span>
            <Flame size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#065F46', marginTop: '6px' }}>{activeFocusCount}</div>
        </div>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        position: 'relative',
        zIndex: 30,
        overflow: 'visible'
      }}>
        {/* Row 1: Search */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search developer, task title, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              outline: 'none',
              background: '#F8FAFC'
            }}
          />
        </div>

        {/* Row 2: Filter Dropdowns & Popovers (1 Row Sequence: Dev -> Project -> Status -> Priority -> Date) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', overflow: 'visible' }}>
          {/* 1. Developer Filter */}
          <select
            value={selectedDevId}
            onChange={(e) => setSelectedDevId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 600, background: '#F8FAFC', flexShrink: 0, maxWidth: '160px' }}
          >
            <option value="all">👤 All Developers</option>
            {developersInScope.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name || `${d.first_name || ''} ${d.last_name || ''}`.trim() || d.email} ({d.role})
              </option>
            ))}
          </select>

          {/* 2. Project Filter Popover */}
          <ProjectFilterPopover
            projects={projects}
            selectedProjectId={selectedProjectId}
            onChange={(id) => setSelectedProjectId(id)}
          />

          {/* 3. Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 600, background: '#F8FAFC', flexShrink: 0 }}
          >
            <option value="all">⚡ All Statuses</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
            <option value="not_started">Not Started</option>
          </select>

          {/* 4. Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 600, background: '#F8FAFC', flexShrink: 0 }}
          >
            <option value="all">🎯 All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          {/* 5. Select Date Filter (CO, CTO, PM, TL) */}
          <DatePickerPopover
            selectedDate={selectedDate}
            onApply={(d) => setSelectedDate(d)}
            onClear={() => setSelectedDate(getTodayDateStr())}
          />

          {(searchTerm || selectedDevId !== 'all' || selectedProjectId !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all' || selectedDate !== getTodayDateStr()) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDevId('all');
                setSelectedProjectId('all');
                setSelectedStatus('all');
                setSelectedPriority('all');
                setSelectedDate(getTodayDateStr());
              }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '12px', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* DEVELOPER WORK TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', background: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#F8FAFC'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderKanban size={18} color="#4F46E5" /> Developer Work Ledger ({filteredTasks.length})
          </h3>

          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
            {isTL ? 'TL Access: Full CRUD' : 'Access Mode: READ ONLY'}
          </span>
        </div>

        <div className="table-responsive" style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1080px' }}>
            <thead>
              <tr style={{ background: '#F1F5F9', fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', width: '220px', minWidth: '200px' }}>Developer</th>
                <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', width: '200px', minWidth: '180px' }}>Project</th>
                <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', minWidth: '260px' }}>Task Title</th>
                <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', width: '110px', minWidth: '100px', textAlign: 'center' }}>Priority</th>
                <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', width: '130px', minWidth: '120px', textAlign: 'center' }}>Progress</th>
                <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', width: '140px', minWidth: '130px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', width: '110px', minWidth: '100px' }}>Due Date</th>
                <th style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', width: '120px', minWidth: '110px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t) => {
                const devObj = getDevObj(t);
                const devName = getDevName(t);
                const projName = getProjectName(t);
                const progVal = t.progress !== undefined && t.progress !== null ? t.progress : (t.status === 'completed' ? 100 : (t.status === 'in_progress' ? 50 : 0));
                const avatarUrl = devObj?.avatar_url;

                return (
                  <tr
                    key={t.id}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setSelectedDrawerDev(devObj)}
                  >
                    {/* Developer Name & Avatar */}
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '180px' }}>
                        <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={devName}
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1px solid rgba(0,0,0,0.08)'
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextSibling) {
                                  e.currentTarget.nextSibling.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div
                            style={{
                              display: avatarUrl ? 'none' : 'flex',
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                              color: '#FFFFFF',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px',
                              fontWeight: 700,
                              flexShrink: 0
                            }}
                          >
                            {devName.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {devName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap' }}>
                            {devObj?.role || 'Developer'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Project Name */}
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: '#EEF2FF',
                          color: '#4338CA',
                          border: '1px solid rgba(99, 102, 241, 0.15)',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                          maxWidth: '220px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          verticalAlign: 'middle'
                        }}
                        title={projName}
                      >
                        {projName}
                      </span>
                    </td>

                    {/* Task Title */}
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', lineHeight: 1.4 }}>{t.title}</div>
                      {t.description && (
                        <div style={{ fontSize: '11px', color: '#64748B', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                          {t.description}
                        </div>
                      )}
                    </td>

                    {/* Priority */}
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                        background: t.priority === 'urgent' ? '#FEF2F2' : (t.priority === 'high' ? '#FFEDD5' : '#F1F5F9'),
                        color: t.priority === 'urgent' ? '#DC2626' : (t.priority === 'high' ? '#C2410C' : '#475569'),
                        border: t.priority === 'urgent' ? '1px solid #FECACA' : (t.priority === 'high' ? '1px solid #FDBA74' : '1px solid #E2E8F0')
                      }}>
                        {t.priority || 'normal'}
                      </span>
                    </td>

                    {/* Progress */}
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                        <div style={{ width: '64px', height: '6px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${progVal}%`, height: '100%', background: progVal === 100 ? '#10B981' : '#3B82F6', transition: 'width 0.3s ease' }} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>{progVal}%</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 11px',
                        borderRadius: '20px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                        background: t.status === 'completed' ? '#ECFDF5' : (t.status === 'blocked' ? '#FEF2F2' : '#EFF6FF'),
                        color: t.status === 'completed' ? '#059669' : (t.status === 'blocked' ? '#DC2626' : '#2563EB'),
                        border: t.status === 'completed' ? '1px solid #A7F3D0' : (t.status === 'blocked' ? '1px solid #FECACA' : '1px solid #BFDBFE')
                      }}>
                        {t.status ? t.status.replace('_', ' ').toUpperCase() : 'NOT STARTED'}
                      </span>
                    </td>

                    {/* Due Date */}
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle', fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap' }}>
                      {t.deadline ? new Date(t.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date'}
                    </td>

                    {/* Action Button */}
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedDrawerDev(devObj)}
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '5px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        {isTL ? 'Manage Work' : 'Inspect Work'}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    {selectedDate === getTodayDateStr() && !searchTerm && selectedDevId === 'all' && selectedProjectId === 'all' && selectedStatus === 'all' && selectedPriority === 'all'
                      ? "No tasks scheduled for today."
                      : "No developer work items match the selected filter criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEVELOPER WORK DRAWER */}
      <DeveloperWorkDrawer
        isOpen={!!selectedDrawerDev}
        onClose={() => setSelectedDrawerDev(null)}
        developer={selectedDrawerDev}
        role={role}
        onRefresh={loadAllData}
      />

      {/* TL ADD DEVELOPER TASK MODAL */}
      {isTL && (
        <AddTaskModal
          isOpen={showAddTaskModal}
          onClose={() => setShowAddTaskModal(false)}
          user={user}
          projects={projects}
          users={developersInScope}
          onSuccess={() => {
            setShowAddTaskModal(false);
            loadAllData();
          }}
        />
      )}
    </div>
  );
}
