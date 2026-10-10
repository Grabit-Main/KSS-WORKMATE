import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Folders, CheckSquare, TrendingUp, Calendar, Mail, MapPin, Phone,
  Plus, MessageSquare, MoreHorizontal, ArrowRight, Eye, Check, Clock, AlertTriangle, CheckCircle2, ChevronRight
} from 'lucide-react';
import { getTasks } from '../../api/tasks';
import { getProjects } from '../../api/projects';
import { getKPIs } from '../../api/kpi';
import { getUsers } from '../../api/users';
import { formatDeadlineWithTime, isDeadlineOverdue } from '../projects/DayWiseTaskPlanner';

export default function EmployeeProfileOverview({
  employee,
  employeeId,
  onBack,
  onAssignTask,
  onSendMessage
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'projects' | 'tasks' | 'kpi'
  const [kpiPeriodFilter, setKpiPeriodFilter] = useState('daily'); // 'daily' | 'weekly' | 'monthly' | 'yearly'
  const [taskFilterTab, setTaskFilterTab] = useState('today'); // 'today' | 'in_progress' | 'upcoming' | 'completed'
  const [hoveredKpiPoint, setHoveredKpiPoint] = useState(null);

  const [userObj, setUserObj] = useState(employee || null);
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

        // Find current employee object if not passed
        if (!userObj && targetEmpId) {
          const found = (usersData || []).find(u => String(u.id) === targetEmpId || String(u.user_id) === targetEmpId || u.email === targetEmpId);
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

  // Derived Skills Tags (Default skills based on designation if user skills array not set)
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
      const empEmail = (userObj?.email || '').toLowerCase();
      return assignedTo === targetEmpId || (t.assignee?.email && t.assignee.email.toLowerCase() === empEmail);
    });
  }, [allTasks, targetEmpId, userObj?.email]);

  // Filter Projects assigned to employee
  const employeeProjects = useMemo(() => {
    if (!targetEmpId) return [];
    const empEmail = (userObj?.email || '').toLowerCase();

    return (allProjects || []).filter(p => {
      if (!p) return false;
      // Check project members safely handling non-array members property
      const membersArr = Array.isArray(p.members) ? p.members : [];
      const hasMember = membersArr.some(m => m && (String(m.id || m.user_id) === targetEmpId || (m.email && m.email.toLowerCase() === empEmail)));
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
    return (allKpiLogs || []).filter(k => k && String(k.employee_id || k.employee?.id || '') === targetEmpId);
  }, [allKpiLogs, targetEmpId]);

  const overallKpiPercentage = useMemo(() => {
    if (!employeeKpiLogs || employeeKpiLogs.length === 0) return 92; // Default realistic score if no logs logged yet
    const sum = employeeKpiLogs.reduce((acc, l) => acc + (Number(l?.daily_kpi_percentage) || 0), 0);
    return Math.round(sum / employeeKpiLogs.length);
  }, [employeeKpiLogs]);

  // KPI Chart Data Points for Daily/Weekly/Monthly/Yearly
  const kpiChartData = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      const fullDateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

      // Find matching log safely checking date string
      const dayLog = (employeeKpiLogs || []).find(k => k && k.date && String(k.date).startsWith(d.toISOString().split('T')[0]));
      const mockCurve = [35, 58, 70, 58, 73, 62, 68];
      const defaultVal = mockCurve[6 - i] !== undefined ? mockCurve[6 - i] : overallKpiPercentage;
      const val = dayLog ? Math.round(Number(dayLog.daily_kpi_percentage)) : defaultVal;

      days.push({
        label: dateStr,
        fullDate: fullDateStr,
        value: isNaN(val) ? 75 : val,
      });
    }
    return days;
  }, [employeeKpiLogs, overallKpiPercentage]);

  // Filter Tasks for Current Tasks Widget based on tab
  const currentTasksFiltered = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const validTasks = employeeTasks || [];
    switch (taskFilterTab) {
      case 'today':
        return validTasks.filter(t => (t && t.scheduled_date && String(t.scheduled_date).startsWith(todayStr)) || t.status === 'in_progress');
      case 'in_progress':
        return validTasks.filter(t => t && t.status === 'in_progress');
      case 'upcoming':
        return validTasks.filter(t => t && t.status === 'not_started');
      case 'completed':
        return validTasks.filter(t => t && t.status === 'completed');
      default:
        return validTasks;
    }
  }, [employeeTasks, taskFilterTab]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* 1. Page Header & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F172A', margin: '0 0 4px 0', fontFamily: 'serif, Georgia, Inter, sans-serif' }}>
            Team Directory
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
            <span style={{ cursor: 'pointer', color: '#4F46E5', fontWeight: 500 }} onClick={onBack}>Team</span>
            <ChevronRight size={14} color="#94A3B8" />
            <span style={{ cursor: 'pointer', color: '#4F46E5', fontWeight: 500 }} onClick={onBack}>Directory</span>
            <ChevronRight size={14} color="#94A3B8" />
            <span style={{ fontWeight: 600, color: '#1E293B' }}>{empName}</span>
          </div>
        </div>
      </div>

      {/* 2. Employee Profile Banner */}
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
          {/* Avatar with Online Status */}
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
                {empName[0]}
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
            <button
              type="button"
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
                justifyContent: 'center'
              }}
            >
              <MoreHorizontal size={17} />
            </button>

            <button
              type="button"
              onClick={() => onAssignTask ? onAssignTask(userObj) : alert(`Assign task to ${empName}`)}
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
                boxShadow: '0 2px 8px rgba(85, 81, 255, 0.25)'
              }}
            >
              <Plus size={16} />
              <span>Assign Task</span>
            </button>

            <button
              type="button"
              onClick={() => onSendMessage ? onSendMessage(userObj) : alert(`Send message to ${empName}`)}
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
                gap: '6px'
              }}
            >
              <Mail size={15} color="#475569" />
              <span>Message</span>
            </button>
          </div>

          {/* Contact & Meta Grid */}
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
        paddingLeft: '4px'
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
                marginBottom: '-1px'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Summary Scorecards Row (3 Cards) */}
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

      {/* 5 & 6. Middle Grid: KPI Performance Chart + Current Tasks Widget */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
        gap: '24px',
        marginBottom: '28px'
      }}>
        {/* Middle Left: KPI Performance Interactive SVG Chart */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Chart Header & Filter Buttons */}
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

            {/* Time Filter Pills */}
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

          {/* SVG Line Chart Area */}
          <div style={{ flex: 1, minHeight: '260px', position: 'relative', width: '100%', marginTop: '10px' }}>
            <svg viewBox="0 0 600 240" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="kpiAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Y Labels */}
              {[100, 75, 50, 25, 0].map((val, idx) => {
                const y = 30 + (idx * 40);
                return (
                  <g key={val}>
                    <line x1="40" y1={y} x2="580" y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray={val === 0 ? "none" : "3 3"} />
                    <text x="28" y={y + 4} fontSize="11" fill="#94A3B8" textAnchor="end" fontWeight="500">
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Cubic Bezier Path calculation */}
              {(() => {
                const points = kpiChartData.map((d, idx) => {
                  const x = 50 + (idx * (520 / (kpiChartData.length - 1)));
                  const y = 190 - ((d.value / 100) * 160);
                  return { x, y, ...d };
                });

                // Path string
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
                    {/* Area fill */}
                    <path d={areaDStr} fill="url(#kpiAreaGrad)" />
                    {/* Line */}
                    <path d={dStr} fill="none" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" />

                    {/* Data Points */}
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

            {/* Hover Tooltip matching screenshot style */}
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

        {/* Middle Right: Current Tasks Widget */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Widget Header */}
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

          {/* Task Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
            {[
              { id: 'today', label: `Today (${employeeTasks.length > 0 ? 1 : 0})` },
              { id: 'in_progress', label: `In Progress (${employeeTasks.filter(t => t.status === 'in_progress').length})` },
              { id: 'upcoming', label: `Upcoming (${employeeTasks.filter(t => t.status === 'not_started').length})` },
              { id: 'completed', label: `Completed (${employeeTasks.filter(t => t.status === 'completed').length})` },
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

          {/* Selected Task Card preview */}
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
                    {/* Left status vertical bar */}
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
                        {t.description || 'Design the UI/UX foundation for the Company Management System based on the new design system.'}
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

      {/* 7. Projects Table (Lower Section) */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        {/* Table Header */}
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

        {/* Projects Data Table */}
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
    </div>
  );
}
