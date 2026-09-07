import React, { useEffect, useState, useCallback } from 'react';
import { getTasks } from '../api/tasks';
import { useRealtime } from '../realtime/useRealtime';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { Plus } from 'lucide-react';

const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { joinRoom } = useWebSocket();
  const { user } = useAuth();

  const loadTasks = async () => {
    try {
      const data = await getTasks();
      setTasks(data);
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
    // Ponytail: instead of complex state merging, just refetch on any event to ensure consistency.
    // It's lazier and less error-prone for a small-medium app.
    loadTasks();
  }, []);

  useRealtime('task.created', handleTaskUpdate);
  useRealtime('task.status_changed', handleTaskUpdate);
  useRealtime('task.reassigned', handleTaskUpdate);
  useRealtime('task.locked', handleTaskUpdate);

  if (loading) return <div>Loading tasks...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Tasks</h2>
        {['CEO', 'CTO', 'PM', 'TL'].includes(user.role) && (
          <button className="btn btn-primary">
            <Plus size={16} /> New Task
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {tasks.map(task => (
          <div key={task.id} className="card">
            <div className="flex justify-between items-center mb-2">
              <span style={{
                fontSize: '12px', fontWeight: 600, padding: '4px 8px', borderRadius: '12px',
                background: `var(--status-${task.status.replace('_', '-')}-bg)`,
                color: `var(--status-${task.status.replace('_', '-')})`
              }}>
                {task.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className="text-xs text-secondary">{new Date(task.deadline).toLocaleDateString()}</span>
            </div>
            <h3 className="font-semibold mb-1">{task.title}</h3>
            <p className="text-sm text-secondary mb-4" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {task.description}
            </p>
            <div className="flex items-center gap-2">
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--brand-100)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                {task.assignee?.first_name[0]}{task.assignee?.last_name[0]}
              </div>
              <span className="text-xs text-secondary">{task.assignee?.first_name} {task.assignee?.last_name}</span>
            </div>
          </div>
        ))}
        {tasks.length === 0 && <p className="text-secondary">No tasks found.</p>}
      </div>
    </div>
  );
};

export default TasksPage;
