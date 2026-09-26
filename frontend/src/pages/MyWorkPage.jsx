import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTasks, updateTaskStatus } from '../api/tasks';
import { CheckCircle2, Clock, AlertTriangle, PlayCircle, Plus, Calendar, Filter, Sparkles, User, FileText } from 'lucide-react';
import TaskDetailsModal from '../components/tasks/TaskDetailsModal';

export default function MyWorkPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);

  const fetchMyTasks = async () => {
    setLoading(true);
    try {
      const data = await getTasks();
      if (Array.isArray(data)) {
        // Filter tasks assigned to current user
        const myTasks = data.filter(t => 
          t.assignee_id === user?.id || 
          t.assignee?.id === user?.id ||
          (t.assigned_to && String(t.assigned_to) === String(user?.id))
        );
        setTasks(myTasks.length > 0 ? myTasks : data); // fallback to all if none explicitly assigned
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, [user]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      fetchMyTasks();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'in_progress') return t.status === 'in_progress';
    if (filter === 'in_review') return t.status === 'in_review';
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'blocked') return t.status === 'blocked';
    return true;
  });

  const counts = {
    total: tasks.length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    in_review: tasks.filter(t => t.status === 'in_review').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        marginBottom: '28px',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              background: 'var(--brand-500)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Sparkles size={13} /> Personal Workspace
            </span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            My Work & Active Agenda
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Track your daily deliverables, ongoing tasks, and performance milestones in one place.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            background: 'var(--surface)',
            padding: '12px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            textAlign: 'center',
            minWidth: '100px'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--brand-600)' }}>{counts.in_progress}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Active</div>
          </div>
          <div style={{
            background: 'var(--surface)',
            padding: '12px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            textAlign: 'center',
            minWidth: '100px'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#10B981' }}>{counts.completed}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Done</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '4px'
      }}>
        {[
          { key: 'all', label: `All Deliverables (${counts.total})` },
          { key: 'in_progress', label: `In Progress (${counts.in_progress})` },
          { key: 'in_review', label: `In Review (${counts.in_review})` },
          { key: 'blocked', label: `Blocked (${counts.blocked})` },
          { key: 'completed', label: `Completed (${counts.completed})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '9px 18px',
              borderRadius: 'var(--radius-md)',
              border: filter === tab.key ? '1px solid var(--brand-500)' : '1px solid var(--border)',
              background: filter === tab.key ? 'var(--brand-50)' : 'var(--surface)',
              color: filter === tab.key ? 'var(--brand-600)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: filter === tab.key ? 600 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card skeleton" style={{ height: '180px' }} />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <FileText size={44} style={{ margin: '0 auto 12px auto', opacity: 0.4, color: 'var(--brand-500)' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>No Tasks Found</h3>
          <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
            There are currently no tasks matching this filter. You can select another status tab or check back later.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {filteredTasks.map(t => (
            <div
              key={t.id}
              className="card card-hover"
              onClick={() => setSelectedTask(t)}
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                borderLeft: t.status === 'completed' ? '4px solid #10B981' : t.status === 'blocked' ? '4px solid #EF4444' : '4px solid #3B82F6'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: t.priority === 'urgent' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                    color: t.priority === 'urgent' ? '#EF4444' : 'var(--brand-600)'
                  }}>
                    {t.priority || 'Normal'} Priority
                  </span>
                  <span style={{
                    fontSize: '12px',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    background: t.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : t.status === 'blocked' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: t.status === 'completed' ? '#10B981' : t.status === 'blocked' ? '#EF4444' : '#F59E0B'
                  }}>
                    {t.status ? t.status.replace('_', ' ').toUpperCase() : 'PENDING'}
                  </span>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.3 }}>
                  {t.title}
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: '16px'
                }}>
                  {t.description || 'No detailed description provided.'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                  <Calendar size={14} />
                  <span>{t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No Deadline'}</span>
                </div>

                <select
                  value={t.status || 'todo'}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleStatusChange(t.id, e.target.value);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={fetchMyTasks}
        />
      )}
    </div>
  );
}
