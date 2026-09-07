import React, { useEffect, useState, useCallback } from 'react';
import { getTasks } from '../api/tasks';
import { useRealtime } from '../realtime/useRealtime';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Clock, ArrowRight, CheckSquare } from 'lucide-react';

const TasksPage = () => {
  const [tasks, setTasks] = useState(() => {
    const cached = localStorage.getItem('cache_tasks');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(() => !localStorage.getItem('cache_tasks'));
  const { joinRoom } = useWebSocket();
  const { user } = useAuth();

  const loadTasks = async () => {
    try {
      const data = await getTasks();
      setTasks(data);
      localStorage.setItem('cache_tasks', JSON.stringify(data));
      // Join team rooms for real-time updates
      const teamIds = [...new Set(data.map(t => t.team_id))];
      teamIds.forEach(id => joinRoom(`team:${id}`));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Real-time handlers
  const handleTaskUpdate = useCallback((eventData) => {
    loadTasks();
  }, []);

  useRealtime('task.created', handleTaskUpdate);
  useRealtime('task.status_changed', handleTaskUpdate);
  useRealtime('task.reassigned', handleTaskUpdate);
  useRealtime('task.locked', handleTaskUpdate);

  if (loading) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em' }}>Tasks</h2>
            <p className="text-sm text-secondary mt-1">Track assignments, progress updates, and completion deadlines</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="card skeleton" style={{ height: '170px' }}></div>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em' }}>Tasks</h2>
          <p className="text-sm text-secondary mt-1">Track assignments, progress updates, and completion deadlines</p>
        </div>
        {['CEO', 'CTO', 'PM', 'TL'].includes(user.role) && (
          <button className="btn btn-primary">
            <Plus size={16} /> New Task
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {tasks.map(task => (
          <div
            key={task.id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all var(--transition-smooth)'
            }}
          >
            <div>
              <div className="flex justify-between items-center mb-3">
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: `var(--status-${task.status.replace('_', '-')}-bg)`,
                  color: `var(--status-${task.status.replace('_', '-')})`,
                  letterSpacing: '0.02em'
                }}>
                  {task.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-xs text-secondary font-medium" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={13} strokeWidth={1.8} style={{ color: 'var(--text-tertiary)' }} />
                  {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <h3 className="font-bold text-base mb-1.5" style={{ letterSpacing: '-0.015em', color: 'var(--text-primary)' }}>
                {task.title}
              </h3>
              <p className="text-sm text-secondary mb-4" style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: '1.4'
              }}>
                {task.description}
              </p>
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '12px',
              borderTop: '1px solid var(--border)'
            }}>
              <div className="flex items-center gap-2">
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--brand-gradient)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)'
                }}>
                  {task.assignee?.first_name?.[0]}{task.assignee?.last_name?.[0]}
                </div>
                <span className="text-xs font-semibold text-secondary">
                  {task.assignee?.first_name} {task.assignee?.last_name}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--brand-600)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Details <ArrowRight size={12} strokeWidth={2} />
              </span>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center' }}>
            <CheckSquare size={32} strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-tertiary)' }} />
            <h4 className="font-bold text-base mb-1">No Tasks Found</h4>
            <p className="text-secondary text-sm">You have no tasks assigned in this workspace.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksPage;
