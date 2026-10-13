import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Folders, CheckSquare, TrendingUp, Calendar, Mail, MapPin, Phone,
  Plus, MessageSquare, MoreHorizontal, ArrowRight, Eye, Check, Clock, AlertTriangle, CheckCircle2, ChevronRight, Copy, Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getTasks } from '../../api/tasks';
import { getProjects } from '../../api/projects';
import { getKPIs } from '../../api/kpi';
import { getUsers } from '../../api/users';
import { formatDeadlineWithTime, isDeadlineOverdue } from '../projects/DayWiseTaskPlanner';
import AddTaskModal from '../quickadd/AddTaskModal';

export default function EmployeeProfileOverview({
  employee,
  employeeId,
  onBack,
  onAssignTask,
  onSendMessage
}) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'projects' | 'tasks' | 'kpi'
  const [kpiPeriodFilter, setKpiPeriodFilter] = useState('daily'); // 'daily' | 'weekly' | 'monthly' | 'yearly'
  const [taskFilterTab, setTaskFilterTab] = useState('today'); // 'today' | 'in_progress' | 'upcoming' | 'completed'
  const [hoveredKpiPoint, setHoveredKpiPoint] = useState(null);

  // Actions dropdown & modals
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const actionMenuRef = useRef(null);

  const [userObj, setUserObj] = useState(employee || null);
  const [allUsersList, setAllUsersList] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [allKpiLogs, setAllKpiLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync prop changes to userObj state
  useEffect(() => {
    if (employee) {
      setUserObj(employee);
    }
  }, [employee]);

  const targetEmpId = String(userObj?.id || employee?.id || employeeId || '');

  // Close actions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setShowActionDropdown(false);
      }
    };
    if (showActionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionDropdown]);

  // Load all required data for the employee
  useEffect(() => {
    let isMounted = true;
    const loadEmployeeData = async () => {
      setLoading(true);
      try {
        const [usersData, projectsData, tasksData, kpiData] = await Promise.all([
          getUsers().catch(() => []),
          getProjects().catch(() => []),
          getTasks().catch(() => []),
          getKPIs().catch(() => [])
        ]);

        if (!isMounted) return;

        const usersList = Array.isArray(usersData) ? usersData : [];
        setAllUsersList(usersList);

        // Find current employee object if not passed
        if (!userObj && targetEmpId) {
          const found = usersList.find(u => String(u.id) === targetEmpId || String(u.user_id) === targetEmpId || u.email === targetEmpId);
          if (found) setUserObj(found);
        }

        setAllProjects(Array.isArray(projectsData) ? projectsData : []);
        setAllTasks(Array.isArray(tasksData) ? tasksData : []);
        setAllKpiLogs(Array.isArray(kpiData) ? kpiData : []);
      } catch (err) {
        console.error('Failed to load employee profile data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadEmployeeData();
    return () => { isMounted = false; };
  }, [employeeId, targetEmpId, employee]);

  // Derived Employee Info
  const empName = useMemo(() => {
    if (!userObj) return 'Employee Profile';
    return userObj.full_name || `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() || userObj.email || 'Employee';
  }, [userObj]);

  const empDesignation = userObj?.department || userObj?.role || 'UI/UX Designer';
  const empEmail = userObj?.email || 'mahesh@kalpanaaa.com';
  const empLocation = userObj?.location || 'Bangalore, India';
  const empPhone = userObj?.phone || '+91 98765 43210';
  const empJoinedDate = userObj?.created_at
    ? new Date(userObj.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '12 Jan 2026';

  // Derived Skills Tags
  const empSkills = useMemo(() => {
    if (userObj?.skills && Array.isArray(userObj.skills) && userObj.skills.length > 0) {
      return userObj.skills;
    }
    const dept = (userObj?.department || userObj?.role || '').toLowerCase();
    if (dept.includes('designer') || dept.includes('ui/ux') || dept.includes('ui')) {
      return ['Design', 'UI/UX', 'Figma', 'Prototyping', 'Design Systems'];
    } else if (dept.includes('frontend') || dept.includes('react')) {
      return ['React', 'JavaScript', 'Tailwind', 'UI Components', 'Vite'];
    } else if (dept.includes('backend') || dept.includes('python')) {
      return ['Python', 'FastAPI', 'PostgreSQL', 'REST API', 'Docker'];
    } else if (dept.includes('qa') || dept.includes('tester')) {
      return ['QA Automation', 'Selenium', 'Manual Testing', 'API Testing', 'Bug Tracking'];
    }
    return ['Productivity', 'Problem Solving', 'Teamwork', 'Communication', 'Ownership'];
  }, [userObj]);

  // Filter Tasks assigned to employee
  const employeeTasks = useMemo(() => {
    if (!targetEmpId) return [];
    return (allTasks || []).filter(t => {
      if (!t) return false;
      const assignedTo = String(t.assigned_to || t.assignee?.id || '');
      const empEmailAddr = (userObj?.email || '').toLowerCase();
      return assignedTo === targetEmpId || (t.assignee?.email && t.assignee.email.toLowerCase() === empEmailAddr);
    });
  }, [allTasks, targetEmpId, userObj?.email]);

  // Filter Projects assigned to employee
  const employeeProjects = useMemo(() => {
    if (!targetEmpId) return [];
    const empEmailAddr = (userObj?.email || '').toLowerCase();

    return (allProjects || []).filter(p => {
      if (!p) return false;
      const membersArr = Array.isArray(p.members) ? p.members : [];
      const hasMember = membersArr.some(m => m && (String(m.id || m.user_id) === targetEmpId || (m.email && m.email.toLowerCase() === empEmailAddr)));
      const hasLead = String(p.lead_id || p.lead?.id || '') === targetEmpId;
      const hasTaskInProject = employeeTasks.some(t => t && String(t.project_id || t.project?.id || '') === String(p.id));
      return hasMember || hasLead || hasTaskInProject;
    });
  }, [allProjects, targetEmpId, userObj?.email, employeeTasks]);

  // Active Projects Count
  const activeProjectsCount = useMemo(() => {
    return (employeeProjects || []).filter(p => p && p.status !== 'completed').length || (employeeProjects ? employeeProjects.length : 0);
  }, [employeeProjects]);

  // Total Tasks Count
  const totalTasksCount = (employeeTasks || []).length;

  // Employee KPI Logs & Overall KPI Calculation
  const employeeKpiLogs = useMemo(() => {
    if (!targetEmpId) return [];
    const empEmailAddr = (userObj?.email || '').toLowerCase();
    return (allKpiLogs || []).filter(k => {
      if (!k) return false;
      const kEmpId = String(k.employee_id || k.employee?.id || '');
      const kEmpEmail = (k.employee?.email || '').toLowerCase();
      return kEmpId === targetEmpId || (empEmailAddr && kEmpEmail === empEmailAddr);
    });
  }, [allKpiLogs, targetEmpId, userObj?.email]);

  const overallKpiPercentage = useMemo(() => {
    if (employeeKpiLogs && employeeKpiLogs.length > 0) {
      const sum = employeeKpiLogs.reduce((acc, l) => acc + (Number(l?.daily_kpi_percentage) || 0), 0);
      return Math.round(sum / employeeKpiLogs.length);
    }
    if (userObj?.kpi !== undefined) return Math.round(Number(userObj.kpi));
    if (employee?.kpi !== undefined) return Math.round(Number(employee.kpi));
    return 88;
  }, [employeeKpiLogs, userObj?.kpi, employee?.kpi]);

  // KPI Performance Chart Data Points based on Selected Time Period (Daily, Weekly, Monthly, Yearly)
  const kpiChartData = useMemo(() => {
    const today = new Date();
    const logs = [...(employeeKpiLogs || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

    if (kpiPeriodFilter === 'daily') {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const yyyymmdd = d.toISOString().split('T')[0];
        const dateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
        const fullDateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

        const log = logs.find(k => k && k.date && String(k.date).startsWith(yyyymmdd));
        let val;
        if (log && !isNaN(Number(log.daily_kpi_percentage))) {
          val = Math.round(Number(log.daily_kpi_percentage));
        } else {
          // Nearest recorded log before this date or baseline average
          const pastLogs = logs.filter(k => k && k.date && String(k.date) <= yyyymmdd);
          if (pastLogs.length > 0) {
            val = Math.round(Number(pastLogs[pastLogs.length - 1].daily_kpi_percentage));
          } else {
            val = overallKpiPercentage;
          }
        }

        days.push({
          label: dateStr,
          fullDate: fullDateStr,
          value: isNaN(val) ? 80 : Math.max(0, Math.min(100, val)),
        });
      }
      return days;
    }

    if (kpiPeriodFilter === 'weekly') {
      const weeks = [];
      for (let w = 4; w >= 0; w--) {
        const endD = new Date(today);
        endD.setDate(endD.getDate() - (w * 7));
        const startD = new Date(endD);
        startD.setDate(startD.getDate() - 6);

        const startStr = startD.toISOString().split('T')[0];
        const endStr = endD.toISOString().split('T')[0];
        const label = `${startD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        const fullDateStr = `${startD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endD.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

        const weekLogs = logs.filter(k => {
          if (!k?.date) return false;
          const kDate = String(k.date).split('T')[0];
          return kDate >= startStr && kDate <= endStr;
        });

        let val;
        if (weekLogs.length > 0) {
          val = Math.round(weekLogs.reduce((acc, l) => acc + (Number(l.daily_kpi_percentage) || 0), 0) / weekLogs.length);
        } else {
          const pastLogs = logs.filter(k => String(k?.date || '').split('T')[0] <= endStr);
          val = pastLogs.length > 0 ? Math.round(Number(pastLogs[pastLogs.length - 1].daily_kpi_percentage)) : overallKpiPercentage;
        }

        weeks.push({
          label,
          fullDate: fullDateStr,
          value: isNaN(val) ? 80 : Math.max(0, Math.min(100, val)),
        });
      }
      return weeks;
    }

    if (kpiPeriodFilter === 'monthly') {
      const months = [];
      for (let m = 5; m >= 0; m--) {
        const d = new Date(today);
        d.setMonth(d.getMonth() - m);
        const yyyymm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        const fullDateStr = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const monthLogs = logs.filter(k => {
          if (!k) return false;
          const kMonth = k.month || (k.date ? String(k.date).slice(0, 7) : '');
          return kMonth === yyyymm;
        });

        let val;
        if (monthLogs.length > 0) {
          val = Math.round(monthLogs.reduce((acc, l) => acc + (Number(l.daily_kpi_percentage) || 0), 0) / monthLogs.length);
        } else {
          const pastLogs = logs.filter(k => String(k?.date || '').slice(0, 7) <= yyyymm);
          val = pastLogs.length > 0 ? Math.round(Number(pastLogs[pastLogs.length - 1].daily_kpi_percentage)) : overallKpiPercentage;
        }

        months.push({
          label,
          fullDate: fullDateStr,
          value: isNaN(val) ? 80 : Math.max(0, Math.min(100, val)),
        });
      }
      return months;
    }

    if (kpiPeriodFilter === 'yearly') {
      const quarters = [
        { label: 'Q1', fullDate: 'Q1 2026 (Jan - Mar)', start: '2026-01-01', end: '2026-03-31' },
        { label: 'Q2', fullDate: 'Q2 2026 (Apr - Jun)', start: '2026-04-01', end: '2026-06-30' },
        { label: 'Q3', fullDate: 'Q3 2026 (Jul - Sep)', start: '2026-07-01', end: '2026-09-30' },
        { label: 'Q4', fullDate: 'Q4 2026 (Oct - Dec)', start: '2026-10-01', end: '2026-12-31' },
      ];

      return quarters.map(q => {
        const qLogs = logs.filter(k => {
          if (!k?.date) return false;
          const kDate = String(k.date).split('T')[0];
          return kDate >= q.start && kDate <= q.end;
        });

        let val;
        if (qLogs.length > 0) {
          val = Math.round(qLogs.reduce((acc, l) => acc + (Number(l.daily_kpi_percentage) || 0), 0) / qLogs.length);
        } else {
          val = overallKpiPercentage;
        }

        return {
          label: q.label,
          fullDate: q.fullDate,
          value: isNaN(val) ? 80 : Math.max(0, Math.min(100, val)),
        };
      });
    }

    return [];
  }, [kpiPeriodFilter, employeeKpiLogs, overallKpiPercentage]);

  // Tasks Filtered for Current Tasks Widget
  const todayTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return (employeeTasks || []).filter(t =>
      (t.scheduled_date && String(t.scheduled_date).startsWith(todayStr)) ||
      (t.deadline && String(t.deadline).startsWith(todayStr)) ||
      t.status === 'in_progress'
    );
  }, [employeeTasks]);

  const inProgressTasks = useMemo(() => (employeeTasks || []).filter(t => t.status === 'in_progress' || t.status === 'started'), [employeeTasks]);
  const upcomingTasks = useMemo(() => (employeeTasks || []).filter(t => t.status === 'not_started' || t.status === 'pending' || t.status === 'planned'), [employeeTasks]);
  const completedTasks = useMemo(() => (employeeTasks || []).filter(t => t.status === 'completed' || t.status === 'done'), [employeeTasks]);

  const currentTasksFiltered = useMemo(() => {
    switch (taskFilterTab) {
      case 'today':
        return todayTasks.length > 0 ? todayTasks : (employeeTasks || []);
      case 'in_progress':
        return inProgressTasks;
      case 'upcoming':
        return upcomingTasks;
      case 'completed':
        return completedTasks;
      default:
        return employeeTasks || [];
    }
  }, [taskFilterTab, todayTasks, inProgressTasks, upcomingTasks, completedTasks, employeeTasks]);

  // Handler for Messaging the Employee
  const handleMessageClick = () => {
    if (onSendMessage) {
      onSendMessage(userObj);
    } else {
      navigate('/collaboration', { state: { selectedUserId: targetEmpId, user: userObj } });
    }
  };

  // Handler for Assigning a Task to the Employee
  const handleAssignTaskClick = () => {
    setShowAddTaskModal(true);
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* 1. Page Header (Without breadcrumb, keeping title and Back to Team Directory button) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: '#EEF2FF',
                border: '1px solid #C7D2FE',
                color: '#4F46E5',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              ← Back to Team Directory
            </button>
          )}
          <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F172A', margin: 0, fontFamily: 'serif, Georgia, Inter, sans-serif' }}>
            Team Directory
          </h1>
        </div>

        {copiedNotification && (
          <div style={{
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            fontSize: '12px',
            fontWeight: 600,
            padding: '5px 12px',
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Check size={14} color="#10B981" />
            Email copied to clipboard!
          </div>
        )}
      </div>

      {/* 2. Employee Profile Banner Header */}
      <div style={{
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
        borderRadius: '20px',
        border: '1px solid #E0E7FF',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(79, 70, 229, 0.04)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px'
      }}>
        {/* Left: Avatar + Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: '1 1 400px' }}>
          {/* Avatar with Status Indicator */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {userObj?.avatar_url ? (
              <img
                src={userObj.avatar_url}
                alt={empName}
                style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #FFFFFF', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
            ) : (
              <div style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                color: '#FFFFFF',
                fontSize: '32px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid #FFFFFF',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                {(empName && empName[0]) || 'U'}
              </div>
            )}
            <span style={{
              position: 'absolute',
              bottom: '4px',
              right: '4px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#10B981',
              border: '2.5px solid #FFFFFF'
            }} />
          </div>

          {/* Name, Designation & Skills */}
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.02em', fontFamily: 'serif, Georgia, Inter, sans-serif' }}>
              {empName}
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 12px 0', fontWeight: 500 }}>
              {empDesignation}
            </p>

            {/* Skills Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {empSkills.map((skill, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 500,
                    color: '#4F46E5',
                    background: '#EEF2FF',
                    border: '1px solid #C7D2FE',
                    padding: '3px 10px',
                    borderRadius: '9999px'
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Actions & Contact Info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '16px', flex: '1 1 300px' }}>
          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Three-Dot Menu Options Button */}
            <div style={{ position: 'relative' }} ref={actionMenuRef}>
              <button
                type="button"
                onClick={() => setShowActionDropdown(prev => !prev)}
                title="More Options"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '9px 11px',
                  cursor: 'pointer',
                  color: '#64748B',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <MoreHorizontal size={17} />
              </button>

              {/* Action Dropdown Menu */}
              {showActionDropdown && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '6px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  minWidth: '190px',
                  zIndex: 50,
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionDropdown(false);
                      handleAssignTaskClick();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: '#1E293B',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Plus size={14} color="#5551FF" />
                    <span>Assign Task</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionDropdown(false);
                      handleMessageClick();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: '#1E293B',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Mail size={14} color="#059669" />
                    <span>Send Message</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionDropdown(false);
                      setActiveTab('projects');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: '#1E293B',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Folders size={14} color="#2563EB" />
                    <span>View Projects</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionDropdown(false);
                      setActiveTab('tasks');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: '#1E293B',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <CheckSquare size={14} color="#D97706" />
                    <span>View Tasks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionDropdown(false);
                      setActiveTab('kpi');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: '#1E293B',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <TrendingUp size={14} color="#7C3AED" />
                    <span>View KPI History</span>
                  </button>

                  <div style={{ height: '1px', background: '#F1F5F9', margin: '4px 0' }} />

                  <button
                    type="button"
                    onClick={() => {
                      setShowActionDropdown(false);
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(empEmail);
                        setCopiedNotification(true);
                        setTimeout(() => setCopiedNotification(false), 2500);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: '#64748B',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Copy size={14} />
                    <span>Copy Email</span>
                  </button>
                </div>
              )}
            </div>

            {/* Assign Task Button */}
            <button
              type="button"
              onClick={handleAssignTaskClick}
              style={{
                background: '#5551FF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(85, 81, 255, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={16} />
              <span>Assign Task</span>
            </button>

            {/* Message Button */}
            <button
              type="button"
              onClick={handleMessageClick}
              style={{
                background: '#FFFFFF',
                color: '#1E293B',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Mail size={15} color="#475569" />
              <span>Message</span>
            </button>
          </div>

          {/* Contact & Meta Info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '8px 24px', fontSize: '12.5px', color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={13} color="#64748B" />
              <span>{empEmail}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={13} color="#64748B" />
              <span>{empLocation}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={13} color="#64748B" />
              <span>{empPhone}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={13} color="#64748B" />
              <span>Joined {empJoinedDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Profile Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        borderBottom: '1px solid #E2E8F0',
        marginBottom: '24px',
        paddingLeft: '4px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'overview', label: 'Overview', icon: <Users size={16} /> },
          { id: 'projects', label: 'Projects', icon: <Folders size={16} /> },
          { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={16} /> },
          { id: 'kpi', label: 'KPI', icon: <TrendingUp size={16} /> },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 4px',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#4F46E5' : '#64748B',
                borderBottom: isActive ? '2px solid #4F46E5' : '2px solid transparent',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginBottom: '-1px',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Summary Scorecards Row (Active Projects, Total Tasks, Overall KPI) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
        gap: '20px',
        marginBottom: '28px'
      }}>
        {/* Card 1: Active Projects */}
        <div
          onClick={() => setActiveTab('projects')}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Folders size={22} />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>{activeProjectsCount}</div>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>Active Projects</div>
            </div>
          </div>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F8FAFC', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E2E8F0' }}>
            <ArrowRight size={15} />
          </div>
        </div>

        {/* Card 2: Total Tasks */}
        <div
          onClick={() => setActiveTab('tasks')}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>{totalTasksCount}</div>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>Total Tasks</div>
            </div>
          </div>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={16} strokeWidth={2.5} />
          </div>
        </div>

        {/* Card 3: Overall KPI */}
        <div
          onClick={() => setActiveTab('kpi')}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>{overallKpiPercentage}%</div>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>Overall KPI</div>
            </div>
          </div>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F8FAFC', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E2E8F0' }}>
            <ArrowRight size={15} />
          </div>
        </div>
      </div>

      {/* VIEW CONTENT BY TAB */}

      {/* OVERVIEW TAB (Items 5 & 6 Side-by-side, then Item 7 Projects Table below) */}
      {activeTab === 'overview' && (
        <>
          {/* 5 & 6. Side-by-side Middle Grid: KPI Performance Chart + Current Tasks Widget */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
            gap: '24px',
            marginBottom: '28px'
          }}>
            {/* KPI Performance Interactive Line Graph */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Header with Title & Period Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={18} color="#4F46E5" />
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.01em', fontFamily: 'serif, Georgia, Inter, sans-serif' }}>
                      KPI Performance
                    </h3>
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 0 0' }}>
                    Track overall performance across different time periods
                  </p>
                </div>

                {/* Time Filter Controls: Daily, Weekly, Monthly, Yearly */}
                <div style={{ display: 'inline-flex', background: '#F1F5F9', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                  {['daily', 'weekly', 'monthly', 'yearly'].map(period => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setKpiPeriodFilter(period)}
                      style={{
                        background: kpiPeriodFilter === period ? '#5551FF' : 'transparent',
                        color: kpiPeriodFilter === period ? '#FFFFFF' : '#64748B',
                        border: 'none',
                        borderRadius: '7px',
                        padding: '5px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive SVG Chart */}
              <div style={{ flex: 1, minHeight: '260px', position: 'relative', width: '100%', marginTop: '10px' }}>
                <svg viewBox="0 0 600 240" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="kpiAreaGradOverview" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines & Y Axis Labels (0, 25, 50, 75, 100) */}
                  {[100, 75, 50, 25, 0].map((val, idx) => {
                    const y = 30 + (idx * 40);
                    return (
                      <g key={val}>
                        <line x1="40" y1={y} x2="580" y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray={val === 0 ? 'none' : '3 3'} />
                        <text x="28" y={y + 4} fontSize="11" fill="#94A3B8" textAnchor="end" fontWeight="500">
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bezier Path and Points */}
                  {(() => {
                    if (kpiChartData.length === 0) return null;
                    const points = kpiChartData.map((d, idx) => {
                      const x = kpiChartData.length > 1
                        ? 50 + (idx * (520 / (kpiChartData.length - 1)))
                        : 300;
                      const clampedVal = Math.max(0, Math.min(100, d.value || 0));
                      const y = 190 - ((clampedVal / 100) * 160);
                      return { x, y, ...d };
                    });

                    let dStr = `M ${points[0].x} ${points[0].y}`;
                    for (let i = 0; i < points.length - 1; i++) {
                      const p0 = points[i];
                      const p1 = points[i + 1];
                      const cx = (p0.x + p1.x) / 2;
                      dStr += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
                    }

                    const areaDStr = `${dStr} L ${points[points.length - 1].x} 190 L ${points[0].x} 190 Z`;

                    return (
                      <g>
                        <path d={areaDStr} fill="url(#kpiAreaGradOverview)" />
                        <path d={dStr} fill="none" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" />
                        {points.map((pt, idx) => (
                          <g key={idx} style={{ cursor: 'pointer' }} onMouseEnter={() => setHoveredKpiPoint(pt)} onMouseLeave={() => setHoveredKpiPoint(null)}>
                            <circle cx={pt.x} cy={pt.y} r="5" fill="#FFFFFF" stroke="#6366F1" strokeWidth="3" />
                            <text x={pt.x} y="215" fontSize="11" fill="#64748B" textAnchor="middle" fontWeight="500">
                              {pt.label}
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  })()}
                </svg>

                {/* Hover Tooltip */}
                {hoveredKpiPoint && (
                  <div style={{
                    position: 'absolute',
                    top: `${hoveredKpiPoint.y - 45}px`,
                    left: `${(hoveredKpiPoint.x / 600) * 100}%`,
                    transform: 'translateX(-50%)',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                    pointerEvents: 'none',
                    zIndex: 10,
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>{hoveredKpiPoint.fullDate}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#4F46E5' }}>
                      KPI <span style={{ color: '#0F172A' }}>{hoveredKpiPoint.value}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Current Tasks Widget */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckSquare size={18} color="#4F46E5" />
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.01em', fontFamily: 'serif, Georgia, Inter, sans-serif' }}>
                    Current Tasks
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  style={{ background: 'transparent', border: 'none', color: '#4F46E5', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  View All
                </button>
              </div>

              {/* Status Filter Tabs (Today, In Progress, Upcoming, Completed) */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                {[
                  { id: 'today', label: `Today (${todayTasks.length})` },
                  { id: 'in_progress', label: `In Progress (${inProgressTasks.length})` },
                  { id: 'upcoming', label: `Upcoming (${upcomingTasks.length})` },
                  { id: 'completed', label: `Completed (${completedTasks.length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTaskFilterTab(tab.id)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '9999px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      border: 'none',
                      background: taskFilterTab === tab.id ? '#5551FF' : '#F1F5F9',
                      color: taskFilterTab === tab.id ? '#FFFFFF' : '#475569',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Task Items */}
              {currentTasksFiltered.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px' }}>
                  <CheckSquare size={32} color="#94A3B8" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>No Tasks in this Tab</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>Check other filters or assign a task</div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {currentTasksFiltered.slice(0, 2).map((t) => {
                    const isOverdue = isDeadlineOverdue(t.deadline, t.status);
                    return (
                      <div
                        key={t.id}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '14px',
                          padding: '16px',
                          display: 'flex',
                          position: 'relative',
                          overflow: 'hidden',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}
                      >
                        {/* Status bar on left edge */}
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '4px',
                          background: t.status === 'completed' ? '#10B981' : t.status === 'in_progress' ? '#2563EB' : '#F59E0B'
                        }} />

                        <div style={{ paddingLeft: '8px', flex: 1 }}>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, marginBottom: '4px' }}>
                            {t.project_id ? 'Project task' : 'Standalone task'}
                          </div>
                          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                            {t.title}
                          </h4>
                          <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {t.description || 'Deliver project milestones and assignments based on engineering goals.'}
                          </p>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: isOverdue ? '#B91C1C' : '#64748B' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={13} color={isOverdue ? '#B91C1C' : '#64748B'} />
                              <span>{formatDeadlineWithTime(t.deadline || '2026-10-10T19:00:00')}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#EEF2FF', color: '#4F46E5', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {empName[0]}
                              </div>
                              <span style={{ fontWeight: 600, color: '#1E293B' }}>{empName.split(' ')[0]}</span>
                              <ArrowRight size={13} color="#4F46E5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 7. Projects Section (Lower Section in Overview) */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Folders size={18} color="#4F46E5" />
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.01em', fontFamily: 'serif, Georgia, Inter, sans-serif' }}>
                  Projects ({employeeProjects.length > 0 ? employeeProjects.length : 3})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('projects')}
                style={{ background: 'transparent', border: 'none', color: '#4F46E5', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                View All
              </button>
            </div>

            {/* Projects Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Project Name</th>
                    <th style={{ padding: '12px 16px' }}>Role</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', minWidth: '180px' }}>Progress</th>
                    <th style={{ padding: '12px 16px' }}>Start Date</th>
                    <th style={{ padding: '12px 16px' }}>Due Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(employeeProjects.length > 0 ? employeeProjects : [
                    { id: '1', name: 'Company Management System (CMS)', role: empDesignation, status: 'In Progress', progress: 70, start_date: '01 Oct 2026', due_date: '20 Nov 2026' },
                    { id: '2', name: 'WorkMate – Task Manager', role: empDesignation, status: 'Active', progress: 90, start_date: '15 Sep 2026', due_date: '30 Oct 2026' },
                    { id: '3', name: 'Kalpanaaa Website Revamp', role: empDesignation, status: 'Planning', progress: 40, start_date: '05 Nov 2026', due_date: '20 Dec 2026' },
                  ]).map((proj) => {
                    const getStatusBadge = (st) => {
                      const str = String(st || 'In Progress').toLowerCase();
                      if (str.includes('active') || str.includes('completed')) return { bg: '#ECFDF5', text: '#059669', label: 'Active' };
                      if (str.includes('plan')) return { bg: '#EFF6FF', text: '#2563EB', label: 'Planning' };
                      return { bg: '#FFFBEB', text: '#D97706', label: 'In Progress' };
                    };
                    const badge = getStatusBadge(proj.status);
                    const progressPct = proj.progress !== undefined ? proj.progress : 70;

                    return (
                      <tr key={proj.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0F172A' }}>
                          {proj.name}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#64748B' }}>
                          {proj.role || empDesignation}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            background: badge.bg,
                            color: badge.text,
                            display: 'inline-block'
                          }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 600, color: '#0F172A', minWidth: '32px', fontSize: '12.5px' }}>{progressPct}%</span>
                            <div style={{ flex: 1, height: '6px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #6366F1 0%, #4F46E5 100%)', borderRadius: '999px' }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12.5px' }}>
                          {proj.start_date || '01 Oct 2026'}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12.5px' }}>
                          {proj.due_date || proj.target_completion_date || '20 Nov 2026'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <button
                            type="button"
                            title="Project Options"
                            onClick={() => navigate('/projects')}
                            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* PROJECTS TAB */}
      {activeTab === 'projects' && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Folders size={20} color="#4F46E5" />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Assigned Projects ({employeeProjects.length > 0 ? employeeProjects.length : 3})
              </h3>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Project Name</th>
                  <th style={{ padding: '12px 16px' }}>Role</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', minWidth: '180px' }}>Progress</th>
                  <th style={{ padding: '12px 16px' }}>Start Date</th>
                  <th style={{ padding: '12px 16px' }}>Due Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(employeeProjects.length > 0 ? employeeProjects : [
                  { id: '1', name: 'Company Management System (CMS)', role: empDesignation, status: 'In Progress', progress: 70, start_date: '01 Oct 2026', due_date: '20 Nov 2026' },
                  { id: '2', name: 'WorkMate – Task Manager', role: empDesignation, status: 'Active', progress: 90, start_date: '15 Sep 2026', due_date: '30 Oct 2026' },
                  { id: '3', name: 'Kalpanaaa Website Revamp', role: empDesignation, status: 'Planning', progress: 40, start_date: '05 Nov 2026', due_date: '20 Dec 2026' },
                ]).map((proj) => {
                  const getStatusBadge = (st) => {
                    const str = String(st || 'In Progress').toLowerCase();
                    if (str.includes('active') || str.includes('completed')) return { bg: '#ECFDF5', text: '#059669', label: 'Active' };
                    if (str.includes('plan')) return { bg: '#EFF6FF', text: '#2563EB', label: 'Planning' };
                    return { bg: '#FFFBEB', text: '#D97706', label: 'In Progress' };
                  };
                  const badge = getStatusBadge(proj.status);
                  const progressPct = proj.progress !== undefined ? proj.progress : 70;

                  return (
                    <tr key={proj.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0F172A' }}>
                        {proj.name}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B' }}>
                        {proj.role || empDesignation}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          background: badge.bg,
                          color: badge.text,
                          display: 'inline-block'
                        }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 600, color: '#0F172A', minWidth: '32px', fontSize: '12.5px' }}>{progressPct}%</span>
                          <div style={{ flex: 1, height: '6px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #6366F1 0%, #4F46E5 100%)', borderRadius: '999px' }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12.5px' }}>
                        {proj.start_date || '01 Oct 2026'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12.5px' }}>
                        {proj.due_date || proj.target_completion_date || '20 Nov 2026'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => navigate('/projects')}
                          style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TASKS TAB */}
      {activeTab === 'tasks' && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
        }}>
          {/* Header & Filter Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={20} color="#4F46E5" />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Assigned Tasks ({employeeTasks.length})
              </h3>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'today', label: `Today (${todayTasks.length})` },
                { id: 'in_progress', label: `In Progress (${inProgressTasks.length})` },
                { id: 'upcoming', label: `Upcoming (${upcomingTasks.length})` },
                { id: 'completed', label: `Completed (${completedTasks.length})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTaskFilterTab(tab.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    background: taskFilterTab === tab.id ? '#5551FF' : '#F1F5F9',
                    color: taskFilterTab === tab.id ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Task Cards Grid */}
          {currentTasksFiltered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '14px' }}>
              <CheckSquare size={36} color="#94A3B8" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>No tasks found in this view</div>
              <div style={{ fontSize: '12.5px', color: '#94A3B8', marginTop: '4px' }}>Select another filter or assign a new task to {empName}.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: '16px' }}>
              {currentTasksFiltered.map(t => {
                const isOverdue = isDeadlineOverdue(t.deadline, t.status);
                return (
                  <div
                    key={t.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '16px',
                      padding: '18px',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '4px',
                      background: t.status === 'completed' ? '#10B981' : t.status === 'in_progress' ? '#2563EB' : '#F59E0B'
                    }} />

                    <div style={{ paddingLeft: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                          {t.project_id ? 'Project Task' : 'Standalone Task'}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: t.status === 'completed' ? '#ECFDF5' : t.status === 'in_progress' ? '#EFF6FF' : '#FFFBEB',
                          color: t.status === 'completed' ? '#059669' : t.status === 'in_progress' ? '#2563EB' : '#D97706',
                          textTransform: 'capitalize'
                        }}>
                          {String(t.status || 'pending').replace('_', ' ')}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                        {t.title}
                      </h4>
                      <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                        {t.description || 'Deliver project tasks and adhere to engineering deadlines.'}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: isOverdue ? '#B91C1C' : '#64748B' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={13} color={isOverdue ? '#B91C1C' : '#64748B'} />
                          <span>{formatDeadlineWithTime(t.deadline || '2026-10-10T19:00:00')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#EEF2FF', color: '#4F46E5', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {empName[0]}
                          </div>
                          <span style={{ fontWeight: 600, color: '#1E293B' }}>{empName.split(' ')[0]}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* KPI TAB */}
      {activeTab === 'kpi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Full-width Interactive Line Graph */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={20} color="#4F46E5" />
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    KPI Performance History
                  </h3>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Visualizing employee metrics over Daily, Weekly, Monthly, and Yearly intervals
                </p>
              </div>

              {/* Time Filter Buttons */}
              <div style={{ display: 'inline-flex', background: '#F1F5F9', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                {['daily', 'weekly', 'monthly', 'yearly'].map(period => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setKpiPeriodFilter(period)}
                    style={{
                      background: kpiPeriodFilter === period ? '#5551FF' : 'transparent',
                      color: kpiPeriodFilter === period ? '#FFFFFF' : '#64748B',
                      border: 'none',
                      borderRadius: '7px',
                      padding: '6px 14px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ minHeight: '300px', position: 'relative', width: '100%', marginTop: '10px' }}>
              <svg viewBox="0 0 600 240" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="kpiAreaGradTab" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {[100, 75, 50, 25, 0].map((val, idx) => {
                  const y = 30 + (idx * 40);
                  return (
                    <g key={val}>
                      <line x1="40" y1={y} x2="580" y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray={val === 0 ? 'none' : '3 3'} />
                      <text x="28" y={y + 4} fontSize="11" fill="#94A3B8" textAnchor="end" fontWeight="500">
                        {val}
                      </text>
                    </g>
                  );
                })}

                {(() => {
                  if (kpiChartData.length === 0) return null;
                  const points = kpiChartData.map((d, idx) => {
                    const x = kpiChartData.length > 1
                      ? 50 + (idx * (520 / (kpiChartData.length - 1)))
                      : 300;
                    const clampedVal = Math.max(0, Math.min(100, d.value || 0));
                    const y = 190 - ((clampedVal / 100) * 160);
                    return { x, y, ...d };
                  });

                  let dStr = `M ${points[0].x} ${points[0].y}`;
                  for (let i = 0; i < points.length - 1; i++) {
                    const p0 = points[i];
                    const p1 = points[i + 1];
                    const cx = (p0.x + p1.x) / 2;
                    dStr += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
                  }

                  const areaDStr = `${dStr} L ${points[points.length - 1].x} 190 L ${points[0].x} 190 Z`;

                  return (
                    <g>
                      <path d={areaDStr} fill="url(#kpiAreaGradTab)" />
                      <path d={dStr} fill="none" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" />
                      {points.map((pt, idx) => (
                        <g key={idx} style={{ cursor: 'pointer' }} onMouseEnter={() => setHoveredKpiPoint(pt)} onMouseLeave={() => setHoveredKpiPoint(null)}>
                          <circle cx={pt.x} cy={pt.y} r="5.5" fill="#FFFFFF" stroke="#6366F1" strokeWidth="3" />
                          <text x={pt.x} y="215" fontSize="11" fill="#64748B" textAnchor="middle" fontWeight="500">
                            {pt.label}
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })()}
              </svg>

              {hoveredKpiPoint && (
                <div style={{
                  position: 'absolute',
                  top: `${hoveredKpiPoint.y - 45}px`,
                  left: `${(hoveredKpiPoint.x / 600) * 100}%`,
                  transform: 'translateX(-50%)',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                  pointerEvents: 'none',
                  zIndex: 10,
                  textAlign: 'center',
                  whiteSpace: 'nowrap'
                }}>
                  <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>{hoveredKpiPoint.fullDate}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#4F46E5' }}>
                    KPI <span style={{ color: '#0F172A' }}>{hoveredKpiPoint.value}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KPI Log History Table */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
              Recent KPI Evaluation Logs
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>
                    <th style={{ padding: '10px 14px' }}>Date</th>
                    <th style={{ padding: '10px 14px' }}>KPI Score</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Task Completion</th>
                    <th style={{ padding: '10px 14px' }}>Quality</th>
                    <th style={{ padding: '10px 14px' }}>Productivity</th>
                    <th style={{ padding: '10px 14px' }}>Evaluator</th>
                  </tr>
                </thead>
                <tbody>
                  {(employeeKpiLogs.length > 0 ? employeeKpiLogs.slice(0, 8) : [
                    { id: '1', date: '2026-10-12', daily_kpi_percentage: 89, status: 'Excellent', task_completion: 5, quality: 5, productivity: 4, evaluator: { first_name: 'Lead', last_name: 'TL' } },
                    { id: '2', date: '2026-10-10', daily_kpi_percentage: 88, status: 'Very Good', task_completion: 4, quality: 5, productivity: 4, evaluator: { first_name: 'Lead', last_name: 'TL' } },
                    { id: '3', date: '2026-10-09', daily_kpi_percentage: 89, status: 'Excellent', task_completion: 5, quality: 5, productivity: 4, evaluator: { first_name: 'Lead', last_name: 'TL' } },
                    { id: '4', date: '2026-10-08', daily_kpi_percentage: 88, status: 'Very Good', task_completion: 4, quality: 4, productivity: 5, evaluator: { first_name: 'Lead', last_name: 'TL' } },
                    { id: '5', date: '2026-10-07', daily_kpi_percentage: 88, status: 'Very Good', task_completion: 5, quality: 4, productivity: 4, evaluator: { first_name: 'Lead', last_name: 'TL' } },
                  ]).map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>
                        {log.date ? new Date(log.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '12 Oct 2026'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#4F46E5' }}>
                        {Math.round(log.daily_kpi_percentage)}%
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: '#ECFDF5',
                          color: '#059669'
                        }}>
                          {log.status || 'Very Good'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748B' }}>{log.task_completion || 5} / 5</td>
                      <td style={{ padding: '12px 14px', color: '#64748B' }}>{log.quality || 5} / 5</td>
                      <td style={{ padding: '12px 14px', color: '#64748B' }}>{log.productivity || 4} / 5</td>
                      <td style={{ padding: '12px 14px', color: '#64748B' }}>
                        {log.evaluator ? `${log.evaluator.first_name || ''} ${log.evaluator.last_name || ''}`.trim() : 'Project Lead'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Task Assignment Modal */}
      <AddTaskModal
        isOpen={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        user={currentUser}
        projects={allProjects}
        users={allUsersList.length > 0 ? allUsersList : (userObj ? [userObj] : [])}
        initialAssigneeId={targetEmpId}
        onSuccess={(newTask) => {
          if (newTask) {
            setAllTasks(prev => [newTask, ...prev]);
            if (onAssignTask) onAssignTask(newTask);
          }
          setShowAddTaskModal(false);
        }}
      />
    </div>
  );
}
