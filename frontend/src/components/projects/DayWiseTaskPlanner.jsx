import React, { useState, useEffect } from 'react';
import { getTasks, createTask, startTask } from '../../api/tasks';
import { getUsers } from '../../api/users';
import { getTeams } from '../../api/teams';
import { TaskDetailsModal } from '../tasks/TaskDetailsModal';
import {
  Calendar, Plus, Clock, User, CheckCircle2,
  FolderKanban, Play, Sparkles, X, ChevronRight, MessageSquare
} from 'lucide-react';

export const DayWiseTaskPlanner = ({ project, currentUser, onClose }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5']);
  const [activeDay, setActiveDay] = useState('Day 1');
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamId, setTeamId] = useState(null);

  // Modal State for New Task
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('normal');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Task Details & Chat Modal
  const [selectedTask, setSelectedTask] = useState(null);

  const loadData = async () => {
    try {
      const [tasksData, teamsData, usersData] = await Promise.all([
        getTasks({ project_id: project.id }),
        getTeams(),
        getUsers()
      ]);

      setTasks(tasksData);

      // Identify the squad allocated to this project
      const allocatedTeam = teamsData.find(t => String(t.project_id) === String(project.id));
      if (allocatedTeam) {
        setTeamId(allocatedTeam.id);
        const memberIds = (allocatedTeam.memberships || []).map(m => String(m.user_id));
        const filteredMembers = usersData.filter(u => memberIds.includes(String(u.id)));
        setTeamMembers(filteredMembers.length > 0 ? filteredMembers : usersData);
      } else {
        setTeamMembers(usersData);
      }

      // Check if existing tasks have custom days and include them in days list
      const existingDays = tasksData.map(t => t.scheduled_date).filter(Boolean);
      if (existingDays.length > 0) {
        setDays(prev => Array.from(new Set([...prev, ...existingDays])));
      }
    } catch (err) {
      console.error('Failed loading planner data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (project?.id) {
      loadData();
    }
  }, [project?.id]);

  const handleAddDay = () => {
    const nextDayNum = days.length + 1;
    const newDay = `Day ${nextDayNum}`;
    setDays([...days, newDay]);
    setActiveDay(newDay);
  };

  const handlePreFillTasks = async () => {
    if (!teamMembers || teamMembers.length === 0) {
      alert('Please ensure squad members are available to allocate tasks.');
      return;
    }
    const confirmPreFill = window.confirm('Pre-fill recommended structured deliverables across Day 1 to Day 5?');
    if (!confirmPreFill) return;

    setLoading(true);
    const sampleTemplates = [
      { day: 'Day 1', title: 'Architecture Setup & DB Models', desc: 'Initialize core entity models, database relations, and authentication flow.' },
      { day: 'Day 2', title: 'API Endpoints & Business Logic', desc: 'Build and validate CRUD operations, business constraints, and data validations.' },
      { day: 'Day 3', title: 'Frontend UI Integration', desc: 'Connect REST endpoints, implement responsive state management and rich user feedback.' },
      { day: 'Day 4', title: 'Comprehensive QA & Testing', desc: 'Perform end-to-end user journey tests, boundary checks, and error audits.' },
      { day: 'Day 5', title: 'Production Staging & Client Demo', desc: 'Deploy final build artifact to staging environment, prepare milestone presentation.' }
    ];

    try {
      for (let i = 0; i < sampleTemplates.length; i++) {
        const t = sampleTemplates[i];
        const assignedMember = teamMembers[i % teamMembers.length];
        await createTask({
          project_id: project.id,
          team_id: teamId,
          title: t.title,
          description: t.desc,
          assigned_to: assignedMember.id,
          priority: 'normal',
          scheduled_date: t.day
        });
      }
      await loadData();
    } catch (err) {
      console.error('Failed to pre-fill tasks:', err);
      alert('Error pre-filling deliverables: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      setFormError('Please enter a task title.');
      return;
    }
    if (!newTaskAssignee) {
      setFormError('Please select an assignee.');
      return;
    }
    setCreating(true);
    setFormError('');
    try {
      await createTask({
        project_id: project.id,
        team_id: teamId,
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || 'No description provided.',
        assigned_to: newTaskAssignee,
        priority: newTaskPriority,
        deadline: newTaskDeadline ? new Date(newTaskDeadline).toISOString() : null,
        scheduled_date: activeDay
      });
      setShowAddModal(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskAssignee('');
      setNewTaskPriority('normal');
      setNewTaskDeadline('');
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create task.');
    } finally {
      setCreating(false);
    }
  };

  const handleStartTaskDirect = async (e, task) => {
    e.stopPropagation();
    try {
      const updated = await startTask(task.id);
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to start task.');
    }
  };

  const activeDayTasks = tasks.filter(t => t.scheduled_date === activeDay);

  const getStatusBadge = (status) => {
    const map = {
      not_started: { label: 'Not Started', bg: 'var(--subtle)', color: 'var(--text-secondary)' },
      in_progress: { label: 'In Progress', bg: 'rgba(217, 119, 6, 0.12)', color: '#D97706' },
      in_review: { label: 'In Review', bg: 'rgba(99, 102, 241, 0.12)', color: '#4F46E5' },
      completed: { label: 'Completed', bg: 'rgba(16, 185, 129, 0.12)', color: '#059669' },
      blocked: { label: 'Blocked', bg: 'rgba(239, 68, 68, 0.12)', color: '#DC2626' }
    };
    const s = map[status] || map.not_started;
    return (
      <span style={{
        fontSize: '10px',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        background: s.bg,
        color: s.color,
        letterSpacing: '0.02em',
        textTransform: 'uppercase'
      }}>
        {s.label}
      </span>
    );
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '24px'
      }}
    >
      <div className="card modal-animate" style={{
        width: '100%',
        maxWidth: '1100px',
        height: '88vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-float)',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--surface)'
      }}>
        {/* Planner Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--subtle-glass)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--brand-100)',
                color: 'var(--brand-700)',
                textTransform: 'uppercase'
              }}>
                Day-Wise Allocation
              </span>
              <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {project.name}
              </h3>
            </div>
            <p className="text-xs text-secondary mt-1">
              Plan and allocate daily task deliverables for squad members. Click any task to inspect details and chat.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Pre-fill Tasks Button */}
            <button
              onClick={handlePreFillTasks}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 14px' }}
              title="Pre-fill sprint deliverables for Day 1 to Day 5"
            >
              <Sparkles size={14} color="var(--brand-600)" />
              <span>Pre-fill Tasks</span>
            </button>

            {/* Add Task for Day Button */}
            <button
              onClick={() => {
                setFormError('');
                setShowAddModal(true);
              }}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 14px' }}
            >
              <Plus size={14} />
              <span>Add Task on {activeDay}</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                padding: '4px',
                borderRadius: 'var(--radius-full)'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Days Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 28px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
          flexShrink: 0
        }}>
          {days.map(d => {
            const countForDay = tasks.filter(t => t.scheduled_date === d).length;
            const isSelected = activeDay === d;
            return (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected ? '1px solid var(--brand-500)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--brand-50)' : 'var(--subtle)',
                  color: isSelected ? 'var(--brand-700)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all var(--transition-fast)',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{d}</span>
                <span style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: isSelected ? 'var(--brand-600)' : 'var(--border)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 700
                }}>
                  {countForDay}
                </span>
              </button>
            );
          })}

          <button
            onClick={handleAddDay}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              border: '1px dashed var(--border)',
              background: 'transparent',
              color: 'var(--brand-600)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            <Plus size={13} />
            <span>Add Day</span>
          </button>
        </div>

        {/* Day Tasks Content */}
        <div style={{
          flex: 1,
          padding: '24px 28px',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}>
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Allocated Deliverables for {activeDay} ({activeDayTasks.length})
            </h4>
            <span className="text-xs text-secondary">
              Click any card to open full details & team chat
            </span>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {[1, 2, 3].map(i => <div key={i} className="card skeleton" style={{ height: '140px' }} />)}
            </div>
          ) : activeDayTasks.length === 0 ? (
            <div className="card" style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: 'var(--subtle-glass)',
              border: '1px dashed var(--border)'
            }}>
              <Calendar size={36} strokeWidth={1.5} style={{ margin: '0 auto 10px', color: 'var(--text-tertiary)' }} />
              <h5 className="font-bold text-sm mb-1">No Deliverables Scheduled for {activeDay}</h5>
              <p className="text-xs text-secondary mb-4">
                Assign tasks to squad members on this day or click "Pre-fill Tasks" to build a standard roadmap.
              </p>
              <button
                onClick={() => {
                  setFormError('');
                  setShowAddModal(true);
                }}
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Add Task on {activeDay}</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {activeDayTasks.map(t => {
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="card"
                    style={{
                      padding: '18px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all var(--transition-smooth)',
                      border: '1px solid var(--border)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--brand-300)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2.5">
                        {getStatusBadge(t.status)}
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          color: t.priority === 'urgent' ? 'var(--priority-urgent)' :
                                 t.priority === 'high' ? 'var(--priority-high)' : 'var(--text-tertiary)'
                        }}>
                          {t.priority}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm mb-1.5" style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {t.title}
                      </h4>
                      <p className="text-xs text-secondary text-truncate-2" style={{ lineHeight: 1.5, marginBottom: '14px' }}>
                        {t.description || 'No description provided.'}
                      </p>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border)',
                      fontSize: '11px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {t.assignee?.avatar_url ? (
                          <img
                            src={t.assignee.avatar_url}
                            alt=""
                            style={{ width: '22px', height: '22px', borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--brand-gradient)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '9px',
                            fontWeight: 700
                          }}>
                            {t.assignee?.first_name?.[0]}{t.assignee?.last_name?.[0]}
                          </div>
                        )}
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {t.assignee?.first_name} {t.assignee?.last_name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Start Action directly from card if not started */}
                        {t.status === 'not_started' && (
                          <button
                            type="button"
                            onClick={(e) => handleStartTaskDirect(e, t)}
                            style={{
                              background: 'var(--brand-50)',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              color: 'var(--brand-700)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Start Task"
                          >
                            <Play size={10} fill="currentColor" /> Start
                          </button>
                        )}

                        <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MessageSquare size={13} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
        >
          <div className="card modal-animate" style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-float)'
          }}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold text-lg" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  Allocate Task on {activeDay}
                </h3>
                <p className="text-xs text-secondary mt-0.5">Assign deliverable to a squad member</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--status-blocked-bg)',
                color: 'var(--status-blocked)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTaskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Implement user dashboard widgets"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Assign To Member *</label>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">-- Select Member * --</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} ({m.role} - {m.department || 'Squad'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Deadline</label>
                  <input
                    type="date"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Description & Specs</label>
                <textarea
                  rows={3}
                  placeholder="Details, requirements, and acceptance criteria..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Allocating...' : `Allocate Task on ${activeDay}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details & Chat Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          currentUser={currentUser}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={(updated) => {
            setSelectedTask(updated);
            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
          }}
        />
      )}
    </div>
  );
};

export default DayWiseTaskPlanner;
