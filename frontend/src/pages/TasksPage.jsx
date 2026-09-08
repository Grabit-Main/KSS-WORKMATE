import React, { useEffect, useState, useCallback } from 'react';
import { getTasks, createTask, acceptTask, completeTask, confirmTask } from '../api/tasks';
import { getTeams } from '../api/teams';
import { getUsers } from '../api/users';
import { useRealtime } from '../realtime/useRealtime';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Clock, ArrowRight, CheckSquare, X, UserCheck, Check, Calendar, Flag, Sparkles } from 'lucide-react';

const TasksPage = () => {
  const [tasks, setTasks] = useState(() => {
    const cached = localStorage.getItem('cache_tasks');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(() => !localStorage.getItem('cache_tasks'));
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'mine', 'review'
  const { joinRoom } = useWebSocket();
  const { user } = useAuth();

  // New Task Modal State (For CEO, CTO, PM, and TL)
  const [showModal, setShowModal] = useState(false);
  const [teams, setTeams] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('normal');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

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

  const loadModalDependencies = async (isSelf = false) => {
    try {
      const [teamsData, usersData] = await Promise.all([
        getTeams().catch(() => []),
        getUsers().catch(() => [])
      ]);
      setTeams(teamsData);
      setUsersList(usersData);

      const myTeams = user?.role === 'TL'
        ? teamsData.filter(t => t.memberships?.some(m => String(m.user_id || m.user?.id) === String(user?.id)))
        : teamsData;

      const defaultTeam = myTeams.length > 0 ? myTeams[0] : (teamsData[0] || null);
      if (defaultTeam && (!teamId || !myTeams.some(t => String(t.id) === String(teamId)))) {
        setTeamId(defaultTeam.id);
      }

      if (isSelf && user) {
        setAssignedTo(user.id);
      } else if (user?.role === 'TL' && defaultTeam) {
        const otherMembers = (defaultTeam.memberships || []).filter(m => {
          const uid = m.user?.id || m.user_id || m.id;
          return String(uid) !== String(user?.id);
        });
        if (otherMembers.length > 0) {
          const firstUser = otherMembers[0].user || otherMembers[0];
          setAssignedTo(firstUser.id);
        } else {
          setAssignedTo(user.id);
        }
      } else if (!assignedTo) {
        setAssignedTo(user?.id || (usersData.length > 0 ? usersData[0].id : ''));
      }
    } catch (err) {
      console.error('Failed to load modal deps:', err);
    }
  };

  const handleTeamChange = (newTeamId) => {
    setTeamId(newTeamId);
    if (user?.role === 'TL') {
      const selected = teams.find(t => String(t.id) === String(newTeamId));
      const otherMembers = (selected?.memberships || []).filter(m => {
        const uid = m.user?.id || m.user_id || m.id;
        return String(uid) !== String(user?.id);
      });
      if (String(assignedTo) !== String(user?.id)) {
        const isStillValid = otherMembers.some(m => String(m.user?.id || m.user_id || m.id) === String(assignedTo));
        if (!isStillValid) {
          if (otherMembers.length > 0) {
            const firstUser = otherMembers[0].user || otherMembers[0];
            setAssignedTo(firstUser.id);
          } else {
            setAssignedTo(user.id);
          }
        }
      }
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const openNewTaskModal = (isSelf = false) => {
    loadModalDependencies(isSelf);
    setShowModal(true);
  };

  // Real-time handlers
  const handleTaskUpdate = useCallback(() => {
    loadTasks();
  }, []);

  useRealtime('task.created', handleTaskUpdate);
  useRealtime('task.status_changed', handleTaskUpdate);
  useRealtime('task.reassigned', handleTaskUpdate);
  useRealtime('task.locked', handleTaskUpdate);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !teamId || !assignedTo) {
      setFormError('Please fill in task title, description, team, and assignee.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await createTask({
        team_id: teamId,
        title: title.trim(),
        description: description.trim(),
        assigned_to: assignedTo,
        priority,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      setPriority('normal');
      setDeadline('');
      loadTasks();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to assign task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptTask = async (taskId, e) => {
    e.stopPropagation();
    try {
      await acceptTask(taskId);
      loadTasks();
    } catch (err) {
      console.error('Failed to accept task:', err);
    }
  };

  const handleCompleteTask = async (taskId, e) => {
    e.stopPropagation();
    try {
      await completeTask(taskId);
      loadTasks();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const handleConfirmTask = async (taskId, e) => {
    e.stopPropagation();
    try {
      await confirmTask(taskId);
      loadTasks();
    } catch (err) {
      console.error('Failed to confirm task:', err);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filterTab === 'mine') return String(t.assigned_to) === String(user?.id);
    if (filterTab === 'review') return t.status === 'in_review';
    return true;
  });

  const availableTeams = user?.role === 'TL'
    ? teams.filter(t => t.memberships?.some(m => String(m.user_id || m.user?.id) === String(user?.id)))
    : teams;

  const currentSelectedTeam = (availableTeams.length > 0 ? availableTeams : teams).find(t => String(t.id) === String(teamId)) || (availableTeams[0] || teams[0]);
  const currentTeamMembers = currentSelectedTeam?.memberships || [];
  const otherTeamMembers = currentTeamMembers.filter(m => {
    const uid = m.user?.id || m.user_id || m.id;
    return String(uid) !== String(user?.id);
  });

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
          <p className="text-sm text-secondary mt-1">Track assignments, self-assigned workload, and delivery milestones</p>
        </div>

        {/* Leadership actions: CEO, CTO, PM, TL can assign tasks */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Dedicated Self-Assign action for Project Managers and Team Leads */}
          {['PM', 'TL'].includes(user.role) && (
            <button
              className="btn btn-secondary"
              onClick={() => openNewTaskModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <UserCheck size={16} color="var(--brand-600)" />
              Self-Assign Task
            </button>
          )}

          {['CEO', 'CTO', 'PM', 'TL'].includes(user.role) && (
            <button className="btn btn-primary" onClick={() => openNewTaskModal(false)}>
              <Plus size={16} /> New Task
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs for Quick Access */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: `All Tasks (${tasks.length})` },
          { id: 'mine', label: `Assigned to Me (${tasks.filter(t => String(t.assigned_to) === String(user?.id)).length})` },
          { id: 'review', label: `In Review (${tasks.filter(t => t.status === 'in_review').length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: filterTab === tab.id ? 600 : 500,
              border: '1px solid',
              borderColor: filterTab === tab.id ? 'var(--brand-600)' : 'var(--border)',
              background: filterTab === tab.id ? 'var(--brand-50)' : 'var(--surface)',
              color: filterTab === tab.id ? 'var(--brand-700)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filteredTasks.map(task => {
          const isAssignedToMe = String(task.assigned_to) === String(user?.id);
          const isSelfAssigned = isAssignedToMe && String(task.assigned_by) === String(user?.id);

          return (
            <div
              key={task.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all var(--transition-smooth)',
                border: isAssignedToMe ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid var(--border)',
                background: isAssignedToMe ? 'linear-gradient(180deg, var(--surface) 0%, rgba(238, 242, 255, 0.25) 100%)' : 'var(--surface)'
              }}
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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

                    {/* Self-assigned / Assigned to you badge */}
                    {isAssignedToMe && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--brand-100)',
                        color: 'var(--brand-700)',
                        letterSpacing: '0.02em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <Sparkles size={10} />
                        {isSelfAssigned ? 'Self-Assigned' : 'Assigned to You'}
                      </span>
                    )}
                  </div>

                  {task.deadline && (
                    <span className="text-xs text-secondary font-medium" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={13} strokeWidth={1.8} style={{ color: 'var(--text-tertiary)' }} />
                      {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
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

              {/* Quick Actions for Self-Assigned or Assigned Tasks */}
              {isAssignedToMe && task.status === 'not_started' && (
                <div style={{ marginBottom: '12px' }}>
                  <button
                    onClick={(e) => handleAcceptTask(task.id, e)}
                    className="btn btn-primary"
                    style={{ width: '100%', height: '32px', fontSize: '12px', padding: '0 12px' }}
                  >
                    Accept & Start Working
                  </button>
                </div>
              )}

              {isAssignedToMe && task.status === 'in_progress' && (
                <div style={{ marginBottom: '12px' }}>
                  <button
                    onClick={(e) => handleCompleteTask(task.id, e)}
                    className="btn btn-secondary"
                    style={{
                      width: '100%',
                      height: '32px',
                      fontSize: '12px',
                      padding: '0 12px',
                      color: 'var(--brand-700)',
                      borderColor: 'rgba(99, 102, 241, 0.3)',
                      background: 'var(--brand-50)'
                    }}
                  >
                    Submit for Review
                  </button>
                </div>
              )}

              {task.status === 'in_review' && ['CEO', 'CTO', 'PM', 'TL'].includes(user.role) && (
                <div style={{ marginBottom: '12px' }}>
                  <button
                    onClick={(e) => handleConfirmTask(task.id, e)}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      height: '32px',
                      fontSize: '12px',
                      padding: '0 12px',
                      background: 'var(--status-completed)',
                      borderColor: 'var(--status-completed)'
                    }}
                  >
                    Confirm Complete
                  </button>
                </div>
              )}
              
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
                    background: isAssignedToMe ? 'var(--brand-gradient)' : 'var(--subtle)',
                    color: isAssignedToMe ? 'white' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    boxShadow: isAssignedToMe ? '0 2px 6px rgba(99, 102, 241, 0.25)' : 'none'
                  }}>
                    {task.assignee?.first_name?.[0]}{task.assignee?.last_name?.[0]}
                  </div>
                  <span className="text-xs font-semibold text-secondary">
                    {isAssignedToMe ? 'You' : `${task.assignee?.first_name} ${task.assignee?.last_name}`}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--brand-600)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Details <ArrowRight size={12} strokeWidth={2} />
                </span>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center' }}>
            <CheckSquare size={32} strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-tertiary)' }} />
            <h4 className="font-bold text-base mb-1">No Tasks Found</h4>
            <p className="text-secondary text-sm">
              {filterTab === 'mine'
                ? 'You currently have no tasks self-assigned or assigned to you.'
                : 'No tasks matching the selected filter were found.'}
            </p>
          </div>
        )}
      </div>

      {/* Task Assignment Modal (Available to CEO, CTO, PM, and TL) */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '20px'
        }}>
          <div className="card modal-animate" style={{
            width: '100%',
            maxWidth: '560px',
            padding: '28px',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-float)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold text-lg" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  {assignedTo === user?.id
                    ? 'Self-Assign Task'
                    : user?.role === 'TL'
                      ? 'Assign Task to Team Member'
                      : 'Assign New Task'}
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  {assignedTo === user?.id
                    ? `Assigning deliverable directly to yourself (${user?.first_name} ${user?.last_name})`
                    : user?.role === 'TL'
                      ? 'Assign deliverable to a member of your team or self-assign'
                      : 'Dispatch task deliverables to team members or self-assign'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
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

            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">
                  {user?.role === 'TL' ? 'Your Team *' : 'Target Team *'}
                </label>
                <select
                  value={teamId}
                  onChange={(e) => handleTeamChange(e.target.value)}
                  className="input"
                  required
                >
                  {availableTeams.length === 0 && <option value="">No teams found</option>}
                  {availableTeams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {user?.role === 'TL' && (
                  <p className="text-xs text-secondary mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    As Team Lead, you can assign tasks to all members of this team or self-assign to yourself.
                  </p>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="text-xs font-semibold text-secondary block">Assign To User *</label>
                  {user && (
                    <button
                      type="button"
                      onClick={() => setAssignedTo(user.id)}
                      style={{
                        background: assignedTo === user.id ? 'var(--brand-100)' : 'var(--subtle)',
                        color: assignedTo === user.id ? 'var(--brand-700)' : 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-full)',
                        padding: '2px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Check size={12} /> Assign to myself ({user.first_name})
                    </button>
                  )}
                </div>

                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="input"
                  required
                >
                  {/* Current user at top for rapid self-assignment */}
                  {user && (
                    <option value={user.id} style={{ fontWeight: 'bold' }}>
                      ⭐ Myself - {user.first_name} {user.last_name} ({user.role}{user.department ? ` · ${user.department}` : ''}) [Self-Assign]
                    </option>
                  )}

                  {user?.role === 'TL' ? (
                    otherTeamMembers.length > 0 ? (
                      <optgroup label={`Team Members (${otherTeamMembers.length})`}>
                        {otherTeamMembers.map(m => {
                          const u = m.user || m;
                          return (
                            <option key={u.id} value={u.id}>
                              {u.first_name} {u.last_name} ({u.role || 'Member'}{u.department ? ` · ${u.department}` : ''}){m.is_lead ? ' [Team Lead]' : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    ) : (
                      <option disabled value="">No other members in this team yet</option>
                    )
                  ) : (
                    <>
                      {otherTeamMembers.length > 0 && (
                        <optgroup label={`Team Members (${otherTeamMembers.length})`}>
                          {otherTeamMembers.map(m => {
                            const u = m.user || m;
                            return (
                              <option key={u.id} value={u.id}>
                                {u.first_name} {u.last_name} ({u.role || 'Member'}{u.department ? ` · ${u.department}` : ''})
                              </option>
                            );
                          })}
                        </optgroup>
                      )}
                      <optgroup label="Other Organization Users">
                        {usersList
                          .filter(u => String(u.id) !== String(user?.id) && !otherTeamMembers.some(m => String(m.user?.id || m.user_id || m.id) === String(u.id)))
                          .map(u => (
                            <option key={u.id} value={u.id}>
                              {u.first_name} {u.last_name} ({u.role}{u.department ? ` · ${u.department}` : ''})
                            </option>
                          ))}
                      </optgroup>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Implement OAuth 2.0 PKCE authentication flow"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Description & Instructions *</label>
                <textarea
                  rows={3}
                  placeholder="Detailed criteria, expectations, and steps required for this task..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Target Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Assigning Task...'
                    : assignedTo === user?.id
                      ? 'Self-Assign Task'
                      : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
