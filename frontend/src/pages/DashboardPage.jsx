import React, { useEffect, useState, useCallback } from 'react';
import { getDailyAnalytics, getWeeklyAnalytics, getMonthlyAnalytics } from '../api/analytics';
import { useRealtime } from '../realtime/useRealtime';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Users, CheckCircle2, Clock, AlertCircle, CheckSquare, BarChart3, PieChart as PieIcon, LineChart as LineIcon } from 'lucide-react';
import { PieChart } from '../components/analytics/PieChart';
import { BarChart } from '../components/analytics/BarChart';
import { TrendLineChart } from '../components/analytics/TrendLineChart';

const DashboardPage = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('daily');
  const [data, setData] = useState(() => {
    const cached = localStorage.getItem(`cache_dashboard_${period}`);
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(() => !localStorage.getItem(`cache_dashboard_${period}`));

  // CEO, CTO, PM, and HR have leadership graph analytics
  const isLeadership = ['CEO', 'CTO', 'PM', 'HR'].includes(user?.role);

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

  const fullName = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || user?.email || 'User';

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Welcome Hero Banner Section for all Dashboards */}
      <div className="card mb-8" style={{
        background: 'linear-gradient(135deg, var(--brand-600) 0%, #4f46e5 50%, #3b82f6 100%)',
        color: '#ffffff',
        padding: '24px 28px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        position: 'relative',
        overflow: 'hidden'
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
            Your Personal Performance Dashboard
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
                color: period === p.id ? 'var(--brand-700)' : 'rgba(255, 255, 255, 0.9)',
                boxShadow: period === p.id ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, var(--surface) 0%, rgba(238, 242, 255, 0.4) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          minHeight: '135px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="text-xs font-semibold text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Tasks
              </div>
              <div className="text-3xl font-bold mt-2 mb-1" style={{ color: 'var(--brand-600)', letterSpacing: '-0.03em' }}>
                {kpi.total_tasks}
              </div>
            </div>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--brand-100)',
              color: 'var(--brand-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckSquare size={19} strokeWidth={2} />
            </div>
          </div>
          <div className="text-xs text-secondary mt-2">Active workload volume</div>
        </div>

        <div className="card" style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, var(--surface) 0%, rgba(209, 250, 229, 0.35) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          minHeight: '135px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="text-xs font-semibold text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Completed
              </div>
              <div className="text-3xl font-bold mt-2 mb-1" style={{ color: 'var(--status-completed)', letterSpacing: '-0.03em' }}>
                {kpi.completed}
              </div>
            </div>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--status-completed-bg)',
              color: 'var(--status-completed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={19} strokeWidth={2} />
            </div>
          </div>
          <div className="text-xs text-secondary mt-2">Successfully closed</div>
        </div>

        <div className="card" style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, var(--surface) 0%, rgba(254, 243, 199, 0.35) 100%)',
          border: '1px solid rgba(217, 119, 6, 0.15)',
          minHeight: '135px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="text-xs font-semibold text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                In Progress
              </div>
              <div className="text-3xl font-bold mt-2 mb-1" style={{ color: 'var(--status-in-progress)', letterSpacing: '-0.03em' }}>
                {kpi.in_progress}
              </div>
            </div>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--status-in-progress-bg)',
              color: 'var(--status-in-progress)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={19} strokeWidth={2} />
            </div>
          </div>
          <div className="text-xs text-secondary mt-2">Currently being executed</div>
        </div>

        <div className="card" style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, var(--surface) 0%, rgba(254, 226, 226, 0.35) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          minHeight: '135px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="text-xs font-semibold text-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Blocked
              </div>
              <div className="text-3xl font-bold mt-2 mb-1" style={{ color: 'var(--status-blocked)', letterSpacing: '-0.03em' }}>
                {kpi.blocked}
              </div>
            </div>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--status-blocked-bg)',
              color: 'var(--status-blocked)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertCircle size={19} strokeWidth={2} />
            </div>
          </div>
          <div className="text-xs text-secondary mt-2">Action required / impediment</div>
        </div>
      </div>

      {/* LEADERSHIP GRAPH ANALYTICS SECTION (Visible to CEO, CTO, PM, HR) */}
      {isLeadership && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
          {/* Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={20} color="var(--brand-600)" />
            <h3 className="font-bold text-lg" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Interactive Visual Graph Analytics ({period.toUpperCase()})
            </h3>
          </div>

          {/* Row 1: Pie / Donut Chart & Trend Line Area Graph */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '24px' }}>
            <PieChart
              data={statusDist}
              totalTasks={kpi.total_tasks}
              title="Deliverables Status Distribution"
            />
            <TrendLineChart
              data={timelineData}
              title={`${period.charAt(0).toUpperCase() + period.slice(1)} Velocity Trend`}
              subtitle="Closed deliverables velocity vs assigned workload"
            />
          </div>

          {/* Row 2: Department Workload Bar Graph & Team Contribution Bar Graph */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '24px' }}>
            <BarChart
              data={data?.departments || []}
              title="Department Workload & Delivery"
              subtitle="Total deliverables vs Closed tasks by technical department"
              primaryLabel="Assigned"
              secondaryLabel="Completed"
            />
            <BarChart
              data={memberBarData}
              title="Member Contribution & Output"
              subtitle="Individual task volume and completion rate"
              primaryLabel="Assigned"
              secondaryLabel="Completed"
            />
          </div>
        </div>
      )}

      {/* Overall Progress Velocity */}
      <div className="card mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-base flex items-center gap-2" style={{ letterSpacing: '-0.015em' }}>
            <TrendingUp size={20} color="var(--brand-600)" />
            {isLeadership ? `${period.charAt(0).toUpperCase() + period.slice(1)} Performance Velocity` : 'Progress Velocity'}
          </h3>
          <span style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--brand-700)',
            background: 'var(--brand-50)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(99, 102, 241, 0.15)'
          }}>
            {kpi.completion_rate}% Completed
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '14px',
          background: 'var(--subtle)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          display: 'flex',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
        }}>
          <div style={{ width: `${(kpi.completed / Math.max(kpi.total_tasks, 1)) * 100}%`, background: 'var(--status-completed)', transition: 'width 0.4s var(--ease-apple)' }} />
          <div style={{ width: `${(kpi.in_progress / Math.max(kpi.total_tasks, 1)) * 100}%`, background: 'var(--status-in-progress)', transition: 'width 0.4s var(--ease-apple)' }} />
          <div style={{ width: `${(kpi.blocked / Math.max(kpi.total_tasks, 1)) * 100}%`, background: 'var(--status-blocked)', transition: 'width 0.4s var(--ease-apple)' }} />
        </div>
        <div className="flex justify-between mt-3 text-xs text-secondary font-medium">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Team Member Performance Analytics Table (Visible to CEO, CTO, PM, HR) */}
      {isLeadership && (
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
              {user.role === 'PM' ? 'Project Team Members Ledger' : 'Organization Performance Ledger'} ({period})
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
      )}
    </div>
  );
};

export default DashboardPage;
