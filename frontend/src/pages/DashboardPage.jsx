import React, { useEffect, useState, useCallback } from 'react';
import { getDailyAnalytics } from '../api/analytics';
import { useRealtime } from '../realtime/useRealtime';
import { useAuth } from '../context/AuthContext';

const DashboardPage = () => {
  const [data, setData] = useState(() => {
    const cached = localStorage.getItem('cache_dashboard');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(() => !localStorage.getItem('cache_dashboard'));
  const { user } = useAuth();

  const loadData = async () => {
    try {
      const res = await getDailyAnalytics();
      setData(res);
      localStorage.setItem('cache_dashboard', JSON.stringify(res));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = useCallback(() => {
    loadData();
  }, []);

  useRealtime('analytics.refresh', handleRefresh);

  if (loading) {
    return (
      <div>
        <div className="skeleton skeleton-text" style={{ width: '250px', height: '28px', marginBottom: '24px' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {[1,2,3,4].map(i => <div key={i} className="card skeleton" style={{ height: '100px' }}></div>)}
        </div>
        <div className="card skeleton" style={{ height: '120px' }}></div>
      </div>
    );
  }

  const kpi = data?.kpi || { total_tasks: 0, completed: 0, in_progress: 0, blocked: 0 };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Welcome back, {user?.first_name}!</h2>
      
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
      
      {/* ponytail: simple progress bar instead of chart.js */}
      <div className="card">
        <h3 className="font-semibold mb-4">Daily Progress</h3>
        <div style={{ width: '100%', height: '16px', background: 'var(--subtle)', borderRadius: '8px', overflow: 'hidden', display: 'flex' }}>
           <div style={{ width: `${(kpi.completed / Math.max(kpi.total_tasks, 1)) * 100}%`, background: 'var(--status-completed)' }} />
           <div style={{ width: `${(kpi.in_progress / Math.max(kpi.total_tasks, 1)) * 100}%`, background: 'var(--status-in-progress)' }} />
           <div style={{ width: `${(kpi.blocked / Math.max(kpi.total_tasks, 1)) * 100}%`, background: 'var(--status-blocked)' }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-secondary font-medium">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
