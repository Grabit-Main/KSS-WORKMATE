import React, { useEffect, useState, useCallback } from 'react';
import { getDailyAnalytics, getWeeklyAnalytics, getMonthlyAnalytics } from '../api/analytics';
import { useRealtime } from '../realtime/useRealtime';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Users } from 'lucide-react';

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
      <div>
        <div className="skeleton skeleton-text" style={{ width: '250px', height: '28px', marginBottom: '24px' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="card skeleton" style={{ height: '100px' }}></div>)}
        </div>
        <div className="card skeleton" style={{ height: '120px' }}></div>
      </div>
    );
  }

  const kpi = data?.kpi || { total_tasks: 0, completed: 0, in_progress: 0, blocked: 0, completion_rate: 0 };
  const members = data?.members || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold">Welcome back, {user?.first_name}!</h2>
          <p className="text-sm text-secondary mt-1">
            {isExecutiveOrHR ? 'Company-wide Performance & Operational Analytics' : 'Your Personal Performance Dashboard'}
          </p>
        </div>

        {/* Period Selector */}
        <div style={{ display: 'flex', background: 'var(--subtle)', padding: '4px', borderRadius: 'var(--radius-md)', gap: '4px' }}>
          {[
            { id: 'daily', label: 'Daily' },
            { id: 'weekly', label: 'Weekly' },
            { id: 'monthly', label: 'Monthly' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => handlePeriodChange(p.id)}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                background: period === p.id ? 'var(--surface)' : 'transparent',
                color: period === p.id ? 'var(--brand-700)' : 'var(--text-secondary)',
                boxShadow: period === p.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="card text-center">
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--brand-600)' }}>{kpi.total_tasks}</div>
          <div className="text-sm text-secondary font-medium">Total Tasks</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--status-completed)' }}>{kpi.completed}</div>
          <div className="text-sm text-secondary font-medium">Completed</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--status-in-progress)' }}>{kpi.in_progress}</div>
          <div className="text-sm text-secondary font-medium">In Progress</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--status-blocked)' }}>{kpi.blocked}</div>
          <div className="text-sm text-secondary font-medium">Blocked</div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp size={18} color="var(--brand-600)" />
            {isExecutiveOrHR ? `${period.charAt(0).toUpperCase() + period.slice(1)} Performance Progress` : 'Progress Overview'}
          </h3>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-700)', background: 'var(--brand-50)', padding: '2px 8px', borderRadius: '12px' }}>
            {kpi.completion_rate}% Completed
          </span>
        </div>
        <div style={{ width: '100%', height: '16px', background: 'var(--subtle)', borderRadius: '8px', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${(kpi.completed / Math.max(kpi.total_tasks, 1)) * 100}%`, background: 'var(--status-completed)', transition: 'width 0.3s' }} />
          <div style={{ width: `${(kpi.in_progress / Math.max(kpi.total_tasks, 1)) * 100}%`, background: 'var(--status-in-progress)', transition: 'width 0.3s' }} />
          <div style={{ width: `${(kpi.blocked / Math.max(kpi.total_tasks, 1)) * 100}%`, background: 'var(--status-blocked)', transition: 'width 0.3s' }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-secondary font-medium">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Team Member Performance Analytics (Visible to CEO, CTO, and HR) */}
      {isExecutiveOrHR && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: '24px' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="font-semibold flex items-center gap-2">
              <Users size={18} color="var(--brand-600)" />
              Team Member Performance Analytics ({period})
            </h3>
            <span className="text-xs text-secondary">{members.length} members tracked</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--subtle)', textAlign: 'left' }}>
                <th style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>Member Name</th>
                <th style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>Role</th>
                <th style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Total Tasks</th>
                <th style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Completed</th>
                <th style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>In Progress</th>
                <th style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Blocked</th>
                <th style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.user_id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 24px' }}>
                    <div className="font-medium">{m.user_name}</div>
                  </td>
                  <td style={{ padding: '12px 24px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', background: 'var(--brand-100)', color: 'var(--brand-700)' }}>
                      {m.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px 24px', textAlign: 'center', fontWeight: 600 }}>{m.kpi.total_tasks}</td>
                  <td style={{ padding: '12px 24px', textAlign: 'center', color: 'var(--status-completed)', fontWeight: 600 }}>{m.kpi.completed}</td>
                  <td style={{ padding: '12px 24px', textAlign: 'center', color: 'var(--status-in-progress)', fontWeight: 600 }}>{m.kpi.in_progress}</td>
                  <td style={{ padding: '12px 24px', textAlign: 'center', color: 'var(--status-blocked)', fontWeight: 600 }}>{m.kpi.blocked}</td>
                  <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                      <div style={{ width: '60px', height: '8px', background: 'var(--subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${m.kpi.completion_rate}%`, height: '100%', background: 'var(--status-completed)' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, width: '40px' }}>{m.kpi.completion_rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No team member activity recorded for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
