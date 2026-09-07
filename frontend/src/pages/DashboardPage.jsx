import React, { useEffect, useState, useCallback } from 'react';
import { getDailyAnalytics, getWeeklyAnalytics, getMonthlyAnalytics } from '../api/analytics';
import { useRealtime } from '../realtime/useRealtime';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Users, CheckCircle2, Clock, AlertCircle, CheckSquare } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('daily');
  const [data, setData] = useState(() => {
    const cached = localStorage.getItem(`cache_dashboard_${period}`);
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(() => !localStorage.getItem(`cache_dashboard_${period}`));

  const isExecutiveOrHR = ['CEO', 'CTO', 'HR'].includes(user?.role);

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
        <div className="card skeleton" style={{ height: '140px' }}></div>
      </div>
    );
  }

  const kpi = data?.kpi || { total_tasks: 0, completed: 0, in_progress: 0, blocked: 0, completion_rate: 0 };
  const members = data?.members || [];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em' }}>
            Welcome back, {user?.first_name}!
          </h2>
          <p className="text-sm text-secondary mt-1">
            {isExecutiveOrHR ? 'Company-wide Performance & Operational Analytics' : 'Your Personal Performance Dashboard'}
          </p>
        </div>

        {/* Apple Segmented Pill Control */}
        <div style={{
          display: 'flex',
          background: 'var(--subtle)',
          padding: '4px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border)',
          gap: '2px',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'
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
                fontWeight: period === p.id ? 600 : 500,
                border: 'none',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                background: period === p.id ? 'var(--surface)' : 'transparent',
                color: period === p.id ? 'var(--brand-600)' : 'var(--text-secondary)',
                boxShadow: period === p.id ? 'var(--shadow-subtle)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, var(--surface) 0%, rgba(238, 242, 255, 0.4) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.15)'
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
          border: '1px solid rgba(16, 185, 129, 0.15)'
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
          border: '1px solid rgba(217, 119, 6, 0.15)'
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
          border: '1px solid rgba(239, 68, 68, 0.15)'
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

      {/* Overall Progress Widget */}
      <div className="card mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-base flex items-center gap-2" style={{ letterSpacing: '-0.015em' }}>
            <TrendingUp size={20} color="var(--brand-600)" />
            {isExecutiveOrHR ? `${period.charAt(0).toUpperCase() + period.slice(1)} Performance Velocity` : 'Progress Velocity'}
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

      {/* Team Member Performance Analytics (Visible to CEO, CTO, and HR) */}
      {isExecutiveOrHR && (
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
              Organization Performance Ledger ({period})
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

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
