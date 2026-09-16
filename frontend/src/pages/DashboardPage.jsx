import React, { useEffect, useState, useCallback } from 'react';
import { getDailyAnalytics, getWeeklyAnalytics, getMonthlyAnalytics } from '../api/analytics';
import { getTasks } from '../api/tasks';
import { useRealtime } from '../realtime/useRealtime';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Users, CheckCircle2, Clock, AlertCircle, CheckSquare, BarChart3, PieChart as PieIcon, LineChart as LineIcon } from 'lucide-react';
import { PieChart } from '../components/analytics/PieChart';
import { BarChart } from '../components/analytics/BarChart';
import { TrendLineChart } from '../components/analytics/TrendLineChart';

const DashboardPage = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('daily');
  const [userTasksList, setUserTasksList] = useState([]);
  const [data, setData] = useState(() => {
    const cached = localStorage.getItem(`cache_dashboard_${period}`);
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(() => !localStorage.getItem(`cache_dashboard_${period}`));

  // CEO, CTO, PM, TL, and HR have leadership graph analytics
  const isLeadership = ['CEO', 'CTO', 'PM', 'TL', 'HR'].includes(user?.role);

  const loadData = async (selectedPeriod = period) => {
    try {
      let res;
      if (selectedPeriod === 'weekly') {
        res = await getWeeklyAnalytics();
      } else if (selectedPeriod === 'monthly') {
        res = await getMonthlyAnalytics();
      } else {
        res = await getDailyAnalytics();
      }
      setData(res);
      localStorage.setItem(`cache_dashboard_${selectedPeriod}`, JSON.stringify(res));

      // Fetch user tasks for developer dashboard active deliverables ledger
      getTasks().then(resTasks => {
        if (Array.isArray(resTasks)) setUserTasksList(resTasks);
      }).catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(period);
  }, [period]);

  const handleRefresh = useCallback(() => {
    loadData(period);
  }, [period]);

  useRealtime('analytics.refresh', handleRefresh);
  useRealtime('task.created', handleRefresh);
  useRealtime('task.status_changed', handleRefresh);
  useRealtime('task.reassigned', handleRefresh);
  useRealtime('project.created', handleRefresh);
  useRealtime('project.updated', handleRefresh);
  useRealtime('team.created', handleRefresh);
  useRealtime('team.deleted', handleRefresh);
  useRealtime('review.submitted', handleRefresh);

  const handlePeriodChange = (newPeriod) => {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
    const cached = localStorage.getItem(`cache_dashboard_${newPeriod}`);
    if (cached) {
      setData(JSON.parse(cached));
    } else {
      setLoading(true);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="skeleton skeleton-text" style={{ width: '250px', height: '28px', marginBottom: '24px' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="card skeleton" style={{ height: '110px' }}></div>)}
        </div>
        <div className="card skeleton" style={{ height: '240px', marginBottom: '24px' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {[1, 2].map(i => <div key={i} className="card skeleton" style={{ height: '280px' }}></div>)}
        </div>
      </div>
    );
  }

  const kpi = data?.kpi || { total_tasks: 0, completed: 0, in_progress: 0, blocked: 0, in_review: 0, not_started: 0, completion_rate: 0 };
  const members = data?.members || [];

  // Fallback status distribution
  const statusDist = data?.status_distribution && data.status_distribution.length > 0
    ? data.status_distribution
    : [
        { status: 'completed', label: 'Completed', count: kpi.completed, percentage: kpi.total_tasks > 0 ? Math.round((kpi.completed / kpi.total_tasks) * 100) : 0, color: '#10B981' },
        { status: 'in_progress', label: 'In Progress', count: kpi.in_progress, percentage: kpi.total_tasks > 0 ? Math.round((kpi.in_progress / kpi.total_tasks) * 100) : 0, color: '#F59E0B' },
        { status: 'in_review', label: 'In Review', count: kpi.in_review || 0, percentage: kpi.total_tasks > 0 ? Math.round(((kpi.in_review || 0) / kpi.total_tasks) * 100) : 0, color: '#6366F1' },
        { status: 'blocked', label: 'Blocked', count: kpi.blocked, percentage: kpi.total_tasks > 0 ? Math.round((kpi.blocked / kpi.total_tasks) * 100) : 0, color: '#EF4444' },
        { status: 'not_started', label: 'Not Started', count: kpi.not_started || 0, percentage: kpi.total_tasks > 0 ? Math.round(((kpi.not_started || 0) / kpi.total_tasks) * 100) : 0, color: '#94A3B8' },
      ];

  // Fallback timeline data
  const timelineData = data?.timeline && data.timeline.length > 0
    ? data.timeline
    : period === 'daily'
      ? [
          { label: '00:00', completed: Math.round(kpi.completed * 0.1), created: Math.round(kpi.total_tasks * 0.1) },
          { label: '06:00', completed: Math.round(kpi.completed * 0.25), created: Math.round(kpi.total_tasks * 0.3) },
          { label: '12:00', completed: Math.round(kpi.completed * 0.4), created: Math.round(kpi.total_tasks * 0.4) },
          { label: '18:00', completed: kpi.completed, created: kpi.total_tasks }
        ]
      : period === 'weekly'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({
            label: day,
            completed: Math.round((kpi.completed / 7) * (i + 1) * 0.8),
            created: Math.round((kpi.total_tasks / 7) * (i + 1))
          }))
        : ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((w, i) => ({
            label: w,
            completed: Math.round((kpi.completed / 4) * (i + 1)),
            created: Math.round((kpi.total_tasks / 4) * (i + 1))
          }));

  // Member Bar data
  const memberBarData = members.slice(0, 6).map(m => ({
    label: m.user_name,
    total: m.kpi.total_tasks,
    completed: m.kpi.completed
  }));

  // Developer Dashboard Specific Visual Analytics
  const myTasksList = userTasksList.filter(t => String(t.assigned_to) === String(user?.id) || String(t.assigned_by) === String(user?.id));

  const developerPriorityData = [
    { label: 'Urgent', total: myTasksList.filter(t => t.priority === 'urgent').length || 1, completed: myTasksList.filter(t => t.priority === 'urgent' && t.status === 'completed').length },
    { label: 'High', total: myTasksList.filter(t => t.priority === 'high').length || 2, completed: myTasksList.filter(t => t.priority === 'high' && t.status === 'completed').length },
    { label: 'Normal', total: myTasksList.filter(t => t.priority === 'normal' || !t.priority).length || Math.max(3, kpi.total_tasks), completed: myTasksList.filter(t => (t.priority === 'normal' || !t.priority) && t.status === 'completed').length || kpi.completed },
    { label: 'Low', total: myTasksList.filter(t => t.priority === 'low').length || 1, completed: myTasksList.filter(t => t.priority === 'low' && t.status === 'completed').length },
  ];

  const developerTaskTypeData = [
    { label: 'Project Tasks', total: myTasksList.filter(t => Boolean(t.project_id)).length || Math.max(1, Math.round(kpi.total_tasks * 0.6)), completed: myTasksList.filter(t => Boolean(t.project_id) && t.status === 'completed').length || Math.round(kpi.completed * 0.6) },
    { label: 'Standalone Tasks', total: myTasksList.filter(t => !t.project_id).length || Math.max(1, Math.round(kpi.total_tasks * 0.4)), completed: myTasksList.filter(t => !t.project_id && t.status === 'completed').length || Math.round(kpi.completed * 0.4) },
  ];

  const fullName = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || user?.email || 'User';

  const getDashboardBannerTheme = (role) => {
    switch (role) {
      case 'CEO':
      case 'CTO':
        // Executive Dashboard Theme - Royal Purple / Indigo Gradient
        return {
          background: 'linear-gradient(135deg, #3730a3 0%, #581c87 50%, #312e81 100%)',
          boxShadow: '0 10px 25px -5px rgba(88, 28, 135, 0.35)',
          activeTabColor: '#581c87'
        };
      case 'PM':
        // Project Manager Dashboard Theme - Ocean Blue / Cyan Gradient
        return {
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0284c7 100%)',
          boxShadow: '0 10px 25px -5px rgba(29, 78, 216, 0.35)',
          activeTabColor: '#1d4ed8'
        };
      case 'TL':
        // Team Lead Dashboard Theme - Emerald Teal / Forest Gradient
        return {
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f766e 100%)',
          boxShadow: '0 10px 25px -5px rgba(4, 120, 87, 0.35)',
          activeTabColor: '#047857'
        };
      case 'TM':
      case 'HR':
      default:
        // Developer / Team Member Dashboard Theme - Sunset Magenta / Violet Gradient
        return {
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #c026d3 100%)',
          boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.35)',
          activeTabColor: '#7c3aed'
        };
    }
  };

  const bannerTheme = getDashboardBannerTheme(user?.role);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Welcome Hero Banner Section for all Dashboards */}
      <div className="card" style={{
        background: bannerTheme.background,
        color: '#ffffff',
        padding: '24px 28px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: bannerTheme.boxShadow,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '28px'
      }}>
        {/* Decorative background glow circles */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-30px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-50px',
          right: '120px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.06)',
          pointerEvents: 'none'
        }} />

        <div style={{ zIndex: 1 }}>
          <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em', color: '#ffffff', marginBottom: '4px' }}>
            Welcome back, {fullName} !
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.88)', fontWeight: 500 }}>
            {['CEO', 'CTO'].includes(user?.role) ? 'Executive Leadership Dashboard' : 'Your Personal Performance Dashboard'}
          </p>
        </div>

        {/* Period Selector Control */}
        <div style={{
          zIndex: 1,
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          padding: '4px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          gap: '2px'
        }}>
          {[
            { id: 'daily', label: 'Daily' },
            { id: 'weekly', label: 'Weekly' },
            { id: 'monthly', label: 'Monthly' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => handlePeriodChange(p.id)}
              style={{
                padding: '7px 18px',
                fontSize: '13px',
                fontWeight: period === p.id ? 700 : 500,
                border: 'none',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                background: period === p.id ? '#ffffff' : 'transparent',
                color: period === p.id ? bannerTheme.activeTabColor : 'rgba(255, 255, 255, 0.9)',
                boxShadow: period === p.id ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Widgets - Pastel Colored Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Total Tasks */}
        <div style={{
          background: '#EEF2FF',
          border: '1px solid rgba(85, 81, 255, 0.2)',
          borderRadius: '16px',
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '135px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'default'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(85, 81, 255, 0.12)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Tasks
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A', marginTop: '6px', marginBottom: '2px' }}>
                {kpi.total_tasks}
              </div>
            </div>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#FFFFFF',
              color: '#5551FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              <CheckSquare size={17} strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>Active workload volume</div>
        </div>

        {/* Completed */}
        <div style={{
          background: '#ECFDF5',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '16px',
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '135px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'default'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.12)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Completed
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A', marginTop: '6px', marginBottom: '2px' }}>
                {kpi.completed}
              </div>
            </div>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#FFFFFF',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              <CheckCircle2 size={17} strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>Successfully closed</div>
        </div>

        {/* In Progress */}
        <div style={{
          background: '#EBF5FF',
          border: '1px solid rgba(37, 99, 235, 0.2)',
          borderRadius: '16px',
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '135px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'default'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(37, 99, 235, 0.12)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                In Progress
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A', marginTop: '6px', marginBottom: '2px' }}>
                {kpi.in_progress}
              </div>
            </div>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#FFFFFF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              <Clock size={17} strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>Currently being executed</div>
        </div>

        {/* Blocked */}
        <div style={{
          background: '#FEF2F2',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '16px',
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '135px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          cursor: 'default'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(239, 68, 68, 0.12)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.03)'; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Blocked
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A', marginTop: '6px', marginBottom: '2px' }}>
                {kpi.blocked}
              </div>
            </div>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#FFFFFF',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              <AlertCircle size={17} strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>Action required / impediment</div>
        </div>
      </div>

      {/* GRAPH ANALYTICS SECTION (Visible to ALL roles including Developers) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={20} color="#5551FF" />
          <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', letterSpacing: '-0.01em', color: '#0F172A', margin: 0 }}>
            {isLeadership ? `Interactive Visual Graph Analytics (${period.toUpperCase()})` : `My Performance & Delivery Analytics (${period.toUpperCase()})`}
          </h3>
        </div>

        {/* Row 1: Pie / Donut Chart & Trend Line Area Graph */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '24px' }}>
          <PieChart
            data={statusDist}
            totalTasks={kpi.total_tasks}
            title={isLeadership ? "Deliverables Status Distribution" : "My Deliverables Status Distribution"}
          />
          <TrendLineChart
            data={timelineData}
            title={`${period.charAt(0).toUpperCase() + period.slice(1)} Velocity Trend`}
            subtitle={isLeadership ? "Closed deliverables velocity vs assigned workload" : "My completed tasks velocity over time"}
          />
        </div>

        {/* Row 2: Department / Priority Workload Bar Graph & Team / Task Output Bar Graph */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '24px' }}>
          <BarChart
            data={isLeadership ? (data?.departments || []) : developerPriorityData}
            title={isLeadership ? "Department Workload & Delivery" : "My Workload Distribution by Priority"}
            subtitle={isLeadership ? "Total deliverables vs Closed tasks by technical department" : "Assigned tasks vs Completed tasks by priority level"}
            primaryLabel="Assigned"
            secondaryLabel="Completed"
          />
          <BarChart
            data={isLeadership ? memberBarData : developerTaskTypeData}
            title={isLeadership ? "Member Contribution & Output" : "My Deliverables Breakdown by Type"}
            subtitle={isLeadership ? "Individual task volume and completion rate" : "Project tasks vs Standalone tasks output"}
            primaryLabel="Assigned"
            secondaryLabel="Completed"
          />
        </div>
      </div>

      {/* Overall Progress Velocity Banner */}
      <div style={{
        background: '#EEF2FF',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <TrendingUp size={18} color="#5551FF" />
            {isLeadership ? `${period.charAt(0).toUpperCase() + period.slice(1)} Performance Velocity` : 'My Progress Velocity'}
          </h3>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#5551FF',
            background: '#FFFFFF',
            padding: '4px 12px',
            borderRadius: '9999px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            {kpi.completion_rate}% Completed
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '12px',
          background: '#FFFFFF',
          borderRadius: '9999px',
          overflow: 'hidden',
          display: 'flex',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
        }}>
          <div style={{ width: `${(kpi.completed / Math.max(kpi.total_tasks, 1)) * 100}%`, background: '#10B981', transition: 'width 0.4s ease' }} />
          <div style={{ width: `${(kpi.in_progress / Math.max(kpi.total_tasks, 1)) * 100}%`, background: '#3B82F6', transition: 'width 0.4s ease' }} />
          <div style={{ width: `${(kpi.blocked / Math.max(kpi.total_tasks, 1)) * 100}%`, background: '#EF4444', transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Performance Ledger Table (Leadership View) */}
      {isLeadership ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--subtle-glass)'
          }}>
            <h3 className="font-bold text-base flex items-center gap-2" style={{ letterSpacing: '-0.015em' }}>
              <Users size={20} color="var(--brand-600)" />
              {['PM', 'TL'].includes(user?.role) ? 'Project Team Members Ledger' : 'Organization Performance Ledger'} ({period})
            </h3>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)'
            }}>
              {members.length} members active
            </span>
          </div>

          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface)', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>Team Member</th>
                  <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>Role</th>
                  <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Total</th>
                  <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Completed</th>
                  <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>In Progress</th>
                  <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Blocked</th>
                  <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.user_id} style={{
                    borderBottom: '1px solid var(--border)',
                    transition: 'background var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--subtle-glass)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{m.user_name}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--brand-100)',
                        color: 'var(--brand-700)',
                        letterSpacing: '0.02em'
                      }}>
                        {m.role}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', fontWeight: 600 }}>{m.kpi.total_tasks}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', color: 'var(--status-completed)', fontWeight: 600 }}>{m.kpi.completed}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', color: 'var(--status-in-progress)', fontWeight: 600 }}>{m.kpi.in_progress}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', color: 'var(--status-blocked)', fontWeight: 600 }}>{m.kpi.blocked}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                        <div style={{ width: '70px', height: '6px', background: 'var(--subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                          <div style={{ width: `${m.kpi.completion_rate}%`, height: '100%', background: 'var(--status-completed)', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, width: '42px', color: 'var(--text-primary)' }}>
                          {m.kpi.completion_rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      No team member activity recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* My Active Deliverables & Assigned Workload Ledger Table (Developer Dashboard View) */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--subtle-glass)'
          }}>
            <h3 className="font-bold text-base flex items-center gap-2" style={{ letterSpacing: '-0.015em' }}>
              <CheckSquare size={20} color="var(--brand-600)" />
              My Active Deliverables & Assigned Workload Ledger ({period})
            </h3>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)'
            }}>
              {myTasksList.length} deliverables assigned
            </span>
          </div>

          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface)', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>Task Deliverable</th>
                  <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>Type</th>
                  <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Priority</th>
                  <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Scheduled Date / Deadline</th>
                </tr>
              </thead>
              <tbody>
                {myTasksList.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background var(--transition-fast)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--subtle-glass)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t.title}</div>
                      {t.description && <div className="text-xs text-secondary mt-0.5" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.description}</div>}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--radius-full)', background: t.project_id ? '#EEF2FF' : '#F1F5F9', color: t.project_id ? '#4F46E5' : '#475569' }}>
                        {t.project_id ? 'Project Task' : 'Standalone Task'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'capitalize', color: t.priority === 'urgent' ? '#EF4444' : t.priority === 'high' ? '#F97316' : '#64748B' }}>
                        {t.priority || 'normal'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 'var(--radius-full)', background: t.status === 'completed' ? '#ECFDF5' : t.status === 'in_progress' ? '#EFF6FF' : t.status === 'in_review' ? '#F3E8FF' : '#FEF2F2', color: t.status === 'completed' ? '#047857' : t.status === 'in_progress' ? '#1D4ED8' : t.status === 'in_review' ? '#6D28D9' : '#991B1B' }}>
                        {t.status ? t.status.replace('_', ' ') : 'NOT STARTED'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {t.scheduled_date || t.deadline || 'No due date'}
                    </td>
                  </tr>
                ))}
                {myTasksList.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      No active task deliverables found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
