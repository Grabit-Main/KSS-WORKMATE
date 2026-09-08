import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getTasks, createTask, acceptTask, completeTask, confirmTask } from '../api/tasks';
import { getTeams } from '../api/teams';
import { getUsers } from '../api/users';
import { uploadFile } from '../api/upload';
import { useRealtime } from '../realtime/useRealtime';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Clock, ArrowRight, CheckSquare, X, Check, Calendar, Flag, Sparkles,
  Paperclip, Image as ImageIcon, Film, FileText
} from 'lucide-react';

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

  // File Attachments State
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Filter eligible assignees: No one can assign to CEO/CTO; TM cannot assign to PM
  const isEligibleAssignee = useCallback((targetRole) => {
    if (!targetRole) return false;
    if (targetRole === 'CEO' || targetRole === 'CTO') return false;
    if (user?.role === 'TM' && targetRole === 'PM') return false;
    return true;
  }, [user?.role]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
    }
  };

  const removeAttachedFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <ImageIcon size={14} color="#3b82f6" />;
    if (fileType?.startsWith('video/')) return <Film size={14} color="#8b5cf6" />;
    return <FileText size={14} color="#10b981" />;
  };

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

  const loadModalDependencies = async () => {
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
      let chosenTeamId = teamId;
      if (defaultTeam && (!chosenTeamId || !myTeams.some(t => String(t.id) === String(chosenTeamId)))) {
        chosenTeamId = defaultTeam.id;
        setTeamId(chosenTeamId);
      }

      const activeTeam = (myTeams.length > 0 ? myTeams : teamsData).find(t => String(t.id) === String(chosenTeamId));
      const teamEligible = (activeTeam?.memberships || [])
        .map(m => m.user || m)
        .filter(u => isEligibleAssignee(u.role));

      const orgEligible = usersData.filter(u => isEligibleAssignee(u.role));

      if (teamEligible.length > 0) {
        setAssignedTo(teamEligible[0].id);
      } else if (orgEligible.length > 0) {
        setAssignedTo(orgEligible[0].id);
      } else {
        setAssignedTo('');
      }
    } catch (err) {
      console.error('Failed to load modal deps:', err);
    }
  };

  const handleTeamChange = (newTeamId) => {
    setTeamId(newTeamId);
    const selected = teams.find(t => String(t.id) === String(newTeamId));
    const teamEligible = (selected?.memberships || [])
      .map(m => m.user || m)
      .filter(u => isEligibleAssignee(u.role));

    if (teamEligible.length > 0) {
      const isStillValid = teamEligible.some(u => String(u.id) === String(assignedTo));
      if (!isStillValid) {
        setAssignedTo(teamEligible[0].id);
      }
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const openNewTaskModal = () => {
    setAttachedFiles([]);
    loadModalDependencies();
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
      const newTask = await createTask({
        team_id: teamId,
        title: title.trim(),
        description: description.trim(),
        assigned_to: assignedTo,
        priority,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });

      // Upload attached files if any
      if (attachedFiles.length > 0 && newTask?.id) {
        for (const file of attachedFiles) {
          try {
            await uploadFile(file, newTask.id);
          } catch (uploadErr) {
            console.error('Failed to upload file attachment:', file.name, uploadErr);
          }
        }
      }

      setShowModal(false);
      setTitle('');
      setDescription('');
      setPriority('normal');
      setDeadline('');
      setAttachedFiles([]);
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
  const eligibleTeamMembers = (currentSelectedTeam?.memberships || [])
    .filter(m => {
      const u = m.user || m;
      return isEligibleAssignee(u.role);
    });

  const eligibleOrgUsers = usersList.filter(u => isEligibleAssignee(u.role));

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
          {['CEO', 'CTO', 'PM', 'TL'].includes(user.role) && (
            <button className="btn btn-primary" onClick={() => openNewTaskModal()}>
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
                      {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base mb-1.5" style={{ letterSpacing: '-0.015em', color: 'var(--text-primary)' }}>
                  {task.title}
                </h3>
                <p className="text-sm text-secondary mb-3" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: '1.4'
                }}>
                  {task.description}
                </p>

                {/* Attachments Display */}
                {task.attachments && task.attachments.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                    {task.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.file_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--subtle)',
                          border: '1px solid var(--border)',
                          fontSize: '11px',
                          color: 'var(--brand-700)',
                          textDecoration: 'none',
                          transition: 'all var(--transition-fast)'
                        }}
                        title={`Open attachment: ${att.file_name}`}
                      >
                        <Paperclip size={11} />
                        <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.file_name}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
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
                  {user?.role === 'TL' ? 'Assign Task to Team Member' : 'Assign New Task'}
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Dispatch deliverables and instructions to team members
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
                    As Team Lead, you can assign tasks to members of this team or to yourself.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Assign To User *</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="input"
                  required
                >
                  {user?.role === 'TL' ? (
                    eligibleTeamMembers.length > 0 ? (
                      <optgroup label={`Team Members (${eligibleTeamMembers.length})`}>
                        {eligibleTeamMembers.map(m => {
                          const u = m.user || m;
                          return (
                            <option key={u.id} value={u.id}>
                              {u.first_name} {u.last_name} ({u.role || 'Member'}{u.department ? ` · ${u.department}` : ''}){m.is_lead ? ' [Team Lead]' : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    ) : (
                      <option disabled value="">No eligible members in this team</option>
                    )
                  ) : (
                    <>
                      {eligibleTeamMembers.length > 0 && (
                        <optgroup label={`Team Members (${eligibleTeamMembers.length})`}>
                          {eligibleTeamMembers.map(m => {
                            const u = m.user || m;
                            return (
                              <option key={u.id} value={u.id}>
                                {u.first_name} {u.last_name} ({u.role || 'Member'}{u.department ? ` · ${u.department}` : ''}){m.is_lead ? ' [Team Lead]' : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      )}
                      <optgroup label="Organization Users">
                        {eligibleOrgUsers
                          .filter(u => !eligibleTeamMembers.some(m => String(m.user?.id || m.id) === String(u.id)))
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

                {/* Attach icon and files preview */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand-500)'; e.currentTarget.style.background = 'var(--brand-50)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--subtle)'; }}
                    >
                      <Paperclip size={14} color="var(--brand-600)" />
                      <span>Attach Images, videos and Docs</span>
                    </button>
                    <span className="text-xs text-secondary">
                      {attachedFiles.length > 0 ? `${attachedFiles.length} file${attachedFiles.length > 1 ? 's' : ''} attached` : 'Supports images, videos & documents'}
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                    style={{ display: 'none' }}
                  />

                  {attachedFiles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                      {attachedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--surface-hover)',
                            border: '1px solid var(--border)',
                            fontSize: '11px',
                            color: 'var(--text-primary)'
                          }}
                        >
                          {getFileIcon(file.type)}
                          <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </span>
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>
                            ({formatFileSize(file.size)})
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAttachedFile(idx)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }}
                            title="Remove attachment"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Target Deadline & Time</label>
                  <input
                    type="datetime-local"
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
                  {submitting ? 'Assigning Task...' : 'Assign Task'}
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
