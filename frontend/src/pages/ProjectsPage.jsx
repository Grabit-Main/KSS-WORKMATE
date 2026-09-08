import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getProjects, createProject } from '../api/projects';
import { getTeams, createTeam, updateTeam } from '../api/teams';
import { getUsers } from '../api/users';
import { getTasks } from '../api/tasks';
import { uploadFile } from '../api/upload';
import { useRealtime } from '../realtime/useRealtime';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Calendar, ArrowRight, FolderKanban, X, Check, Users,
  Paperclip, Image as ImageIcon, Film, FileText, ExternalLink,
  Briefcase, UserCheck, ChevronRight, CheckCircle2, Clock, AlertCircle
} from 'lucide-react';

const ProjectsPage = () => {
  const [projects, setProjects] = useState(() => {
    const cached = localStorage.getItem('cache_projects');
    return cached ? JSON.parse(cached) : [];
  });
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(() => !localStorage.getItem('cache_projects'));
  const { user } = useAuth();

  // Create Project Modal state (For PM only)
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [aim, setAim] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState('');
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef(null);

  // Create Team Modal state (For PM only)
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [teamMemberIds, setTeamMemberIds] = useState([]);
  const [teamSubmitting, setTeamSubmitting] = useState(false);
  const [teamFormError, setTeamFormError] = useState('');

  // Project Overview Modal state
  const [selectedProject, setSelectedProject] = useState(null);
  const [overviewTeamToAllocate, setOverviewTeamToAllocate] = useState('');
  const [overviewUploading, setOverviewUploading] = useState(false);
  const overviewFileInputRef = useRef(null);

  const loadData = async () => {
    try {
      const [projectsData, teamsData, usersData, tasksData] = await Promise.all([
        getProjects().catch(() => []),
        getTeams().catch(() => []),
        getUsers().catch(() => []),
        getTasks().catch(() => [])
      ]);
      setProjects(projectsData);
      setTeams(teamsData);
      setUsersList(usersData);
      setTasks(tasksData);
      localStorage.setItem('cache_projects', JSON.stringify(projectsData));

      // If a project is currently open in overview modal, refresh its data
      setSelectedProject(prev => {
        if (!prev) return null;
        return projectsData.find(p => String(p.id) === String(prev.id)) || prev;
      });
    } catch (err) {
      console.error('Failed to load project data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdate = useCallback(() => {
    loadData();
  }, []);

  useRealtime('project.created', handleUpdate);
  useRealtime('project.updated', handleUpdate);
  useRealtime('team.created', handleUpdate);
  useRealtime('task.created', handleUpdate);
  useRealtime('task.updated', handleUpdate);
  useRealtime('task.completed', handleUpdate);

  // Listen for sidebar "+ Create Team" event
  useEffect(() => {
    const handleOpenCreateTeamEvent = () => {
      if (user?.role === 'PM') {
        setTeamFormError('');
        setShowTeamModal(true);
      }
    };
    window.addEventListener('workmate:open-create-team', handleOpenCreateTeamEvent);
    return () => {
      window.removeEventListener('workmate:open-create-team', handleOpenCreateTeamEvent);
    };
  }, [user?.role]);

  // Escape key handler to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedProject(null);
        setShowModal(false);
        setShowTeamModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // File handling helpers
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
    if (fileType?.startsWith('image/')) return <ImageIcon size={13} color="#3b82f6" />;
    if (fileType?.startsWith('video/')) return <Film size={13} color="#8b5cf6" />;
    return <FileText size={13} color="#10b981" />;
  };

  const getUserFullName = (u) => {
    if (!u) return 'Unknown User';
    return (
      u.full_name ||
      `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
      u.email ||
      'User'
    );
  };

  // Team Leads and Team Members cannot be CEO, CTO, or PM
  const eligibleTeamCandidates = usersList.filter(
    u => u.role !== 'CEO' && u.role !== 'CTO' && u.role !== 'PM'
  );

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!name.trim() || !aim.trim()) {
      setFormError('Please provide both a project name and project aim/objective.');
      return;
    }
    setSubmitting(true);
    setSubmitStatusText('Creating project...');
    setFormError('');
    try {
      const payload = {
        name: name.trim(),
        aim: aim.trim(),
        deadline: deadline ? new Date(deadline).toISOString() : null,
      };
      if (selectedTeamId) {
        payload.team_id = selectedTeamId;
      }

      const createdProject = await createProject(payload);

      // Upload attached files if any
      if (attachedFiles.length > 0 && createdProject?.id) {
        setSubmitStatusText(`Uploading ${attachedFiles.length} attachment(s)...`);
        for (let i = 0; i < attachedFiles.length; i++) {
          const file = attachedFiles[i];
          try {
            await uploadFile(file, null, createdProject.id);
          } catch (uploadErr) {
            console.error(`Failed to upload file ${file.name}:`, uploadErr);
          }
        }
      }

      setShowModal(false);
      setName('');
      setAim('');
      setDeadline('');
      setSelectedTeamId('');
      setAttachedFiles([]);
      setSubmitStatusText('');
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create project.');
    } finally {
      setSubmitting(false);
      setSubmitStatusText('');
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setTeamFormError('Please provide a team name.');
      return;
    }
    setTeamSubmitting(true);
    setTeamFormError('');
    try {
      await createTeam({
        name: teamName.trim(),
        lead_user_id: teamLeadId || null,
        member_user_ids: teamMemberIds.length > 0 ? teamMemberIds : null,
      });

      setShowTeamModal(false);
      setTeamName('');
      setTeamLeadId('');
      setTeamMemberIds([]);
      loadData();
    } catch (err) {
      setTeamFormError(err.response?.data?.detail || 'Failed to create team.');
    } finally {
      setTeamSubmitting(false);
    }
  };

  const handleAllocateTeamFromOverview = async () => {
    if (!overviewTeamToAllocate || !selectedProject) return;
    try {
      await updateTeam(overviewTeamToAllocate, { project_id: selectedProject.id });
      setOverviewTeamToAllocate('');
      loadData();
    } catch (err) {
      console.error('Failed to allocate team to project:', err);
    }
  };

  const handleOverviewFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !selectedProject) return;
    setOverviewUploading(true);
    try {
      for (const file of files) {
        await uploadFile(file, null, selectedProject.id);
      }
      loadData();
    } catch (err) {
      console.error('Failed to upload project attachment:', err);
    } finally {
      setOverviewUploading(false);
      if (overviewFileInputRef.current) {
        overviewFileInputRef.current.value = '';
      }
    }
  };

  const toggleMemberSelection = (userId) => {
    setTeamMemberIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Helper to compute tasks and progress for a project
  const getProjectTaskStats = (projectId) => {
    const allocatedTeams = teams.filter(t => String(t.project_id) === String(projectId));
    const teamIds = new Set(allocatedTeams.map(t => String(t.id)));
    const projectTasks = tasks.filter(t => teamIds.has(String(t.team_id)));
    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.status === 'completed').length;
    const inReview = projectTasks.filter(t => t.status === 'in_review').length;
    const inProgress = projectTasks.filter(t => t.status === 'in_progress').length;
    const blocked = projectTasks.filter(t => t.status === 'blocked').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { projectTasks, total, completed, inReview, inProgress, blocked, percent, allocatedTeams };
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em' }}>Projects</h2>
            <p className="text-sm text-secondary mt-1">Active company deliverables and project timelines</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="card skeleton" style={{ height: '180px' }}></div>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em' }}>Projects</h2>
          <p className="text-sm text-secondary mt-1">Active company deliverables, squad allocations, and milestone timelines</p>
        </div>

        {/* PM has exclusive ability to create teams and assign deliverables */}
        {user.role === 'PM' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setTeamFormError('');
                setShowTeamModal(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
            >
              <Users size={16} color="var(--brand-600)" />
              <span>Create Team</span>
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setFormError('');
                setShowModal(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
            >
              <Plus size={16} />
              <span>New Project</span>
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {projects.map(p => {
          const stats = getProjectTaskStats(p.id);
          const allocatedTeams = stats.allocatedTeams.length > 0 ? stats.allocatedTeams : (p.teams || []);
          const attachments = p.attachments || [];

          return (
            <div
              key={p.id}
              className="card"
              onClick={() => setSelectedProject(p)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all var(--transition-smooth)',
                position: 'relative',
                padding: '22px'
              }}
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--brand-50)',
                    color: 'var(--brand-700)',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    letterSpacing: '0.03em'
                  }}>
                    {p.status?.toUpperCase() || 'ACTIVE'}
                  </span>
                  {p.deadline && (
                    <span className="text-xs text-secondary font-medium" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={13} strokeWidth={1.8} style={{ color: 'var(--text-tertiary)' }} />
                      {new Date(p.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base mb-2" style={{ letterSpacing: '-0.015em', color: 'var(--text-primary)' }}>
                  {p.name}
                </h3>

                <p className="text-sm text-secondary" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: '1.5',
                  marginBottom: '14px'
                }}>
                  {p.aim}
                </p>

                {/* Progress bar if tasks exist */}
                {stats.total > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Progress ({stats.completed}/{stats.total} Tasks)
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--brand-600)', fontWeight: 700 }}>
                        {stats.percent}%
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${stats.percent}%`,
                        height: '100%',
                        background: 'var(--brand-gradient)',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                )}

                {/* Allocated Squads Pill */}
                <div style={{ marginBottom: '10px' }}>
                  {allocatedTeams.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                      {allocatedTeams.map(t => (
                        <span
                          key={t.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(99, 102, 241, 0.08)',
                            color: 'var(--brand-700)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          <Users size={11} />
                          {t.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--text-tertiary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Users size={11} /> Unallocated Squad
                    </span>
                  )}
                </div>

                {/* Attachments Section */}
                {attachments.length > 0 && (
                  <div
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {attachments.map(att => (
                      <a
                        key={att.id}
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--subtle)',
                          border: '1px solid var(--border)',
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          textDecoration: 'none',
                          maxWidth: '170px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={`Open attachment: ${att.file_name}`}
                      >
                        {getFileIcon(att.file_type)}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.file_name}</span>
                        <ExternalLink size={10} style={{ opacity: 0.6, flexShrink: 0 }} />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Functional & Prominent Overview Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProject(p);
                }}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: 'var(--brand-600)',
                  fontWeight: 600,
                  fontSize: '12px',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--brand-700)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--brand-600)'; }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <FolderKanban size={14} />
                  <span>Click to view overview</span>
                </span>
                <ArrowRight size={14} strokeWidth={2.2} />
              </button>
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center' }}>
            <FolderKanban size={32} strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-tertiary)' }} />
            <h4 className="font-bold text-base mb-1">No Projects Yet</h4>
            <p className="text-secondary text-sm">
              {user.role === 'PM' ? 'Click "+ New Project" to create deliverables and allocate teams.' : 'Projects assigned by Project Managers will be listed here.'}
            </p>
          </div>
        )}
      </div>

      {/* New Project Modal (Exclusive to PM) */}
      {showModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          style={{
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
          }}
        >
          <div className="card modal-animate" style={{
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-float)'
          }}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold text-lg" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  Create New Project
                </h3>
                <p className="text-xs text-secondary mt-0.5">Assign deliverables, allocate squads, and attach guidelines</p>
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

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Project Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Mobile Banking App v2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  required
                />
              </div>

              {/* Aim / Description with Attach Files Icon */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-secondary">Aim & Scope Description *</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      color: 'var(--brand-600)',
                      fontWeight: 600
                    }}
                  >
                    <Paperclip size={13} />
                    Attach files
                  </button>
                </div>

                <textarea
                  rows={4}
                  placeholder="Describe the main goal, scope, architectural requirements, and key deliverables..."
                  value={aim}
                  onChange={(e) => setAim(e.target.value)}
                  className="input"
                  style={{ resize: 'vertical' }}
                  required
                />

                {/* Attach Button and Upload Preview bar */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--subtle)',
                        border: '1px solid var(--border)',
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
                      <span>Attach Images, Videos & Docs</span>
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
                          <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

              {/* Allocate to Team Dropdown */}
              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Allocate to Team (Optional)</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="input"
                >
                  <option value="">-- None / Allocate Later --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.memberships?.length || 0} members)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-secondary mt-1">
                  You can allocate this project immediately to an existing squad, or leave it unassigned and allocate later.
                </p>
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
                  {submitting ? (submitStatusText || 'Creating Project...') : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal (Exclusive to PM) */}
      {showTeamModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowTeamModal(false); }}
          style={{
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
          }}
        >
          <div className="card modal-animate" style={{
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-float)'
          }}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold text-lg" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  Create New Team
                </h3>
                <p className="text-xs text-secondary mt-0.5">Assemble a squad, designate a lead, and allocate deliverables</p>
              </div>
              <button
                onClick={() => setShowTeamModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {teamFormError && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--status-blocked-bg)',
                color: 'var(--status-blocked)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {teamFormError}
              </div>
            )}

            <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Team Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Frontend Engineering, AI Research Squad"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Designate Team Lead (Optional)</label>
                <select
                  value={teamLeadId}
                  onChange={(e) => setTeamLeadId(e.target.value)}
                  className="input"
                >
                  <option value="">-- No Lead Assigned Yet --</option>
                  {eligibleTeamCandidates.map(u => (
                    <option key={u.id} value={u.id}>
                      {getUserFullName(u)} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">
                  Select Team Members ({teamMemberIds.length} selected)
                </label>
                <div style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px',
                  background: 'var(--surface-hover)'
                }}>
                  {eligibleTeamCandidates.map(u => {
                    const isSelected = teamMemberIds.includes(u.id);
                    const isLead = String(teamLeadId) === String(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleMemberSelection(u.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--brand-50)' : 'transparent',
                          marginBottom: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 400, color: 'var(--text-primary)' }}>
                            {getUserFullName(u)}
                          </span>
                          {isLead && (
                            <span style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-full)',
                              background: 'var(--brand-600)',
                              color: '#fff',
                              fontWeight: 600
                            }}>
                              Lead
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{u.role}</span>
                      </div>
                    );
                  })}
                  {eligibleTeamCandidates.length === 0 && (
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '8px', textAlign: 'center' }}>
                      No eligible candidates available (TL/TM only).
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="btn btn-secondary"
                  disabled={teamSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={teamSubmitting}
                >
                  {teamSubmitting ? 'Creating Team...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Project Overview Modal */}
      {selectedProject && (() => {
        const stats = getProjectTaskStats(selectedProject.id);
        const allocatedTeams = stats.allocatedTeams.length > 0 ? stats.allocatedTeams : (selectedProject.teams || []);
        const unallocatedTeams = teams.filter(t => !t.project_id);

        return (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedProject(null); }}
            style={{
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
            }}
          >
            <div className="card modal-animate" style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-float)'
            }}>
              {/* Modal Top Bar */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--brand-50)',
                    color: 'var(--brand-700)',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    letterSpacing: '0.03em'
                  }}>
                    {selectedProject.status?.toUpperCase() || 'ACTIVE'}
                  </span>
                  {selectedProject.deadline && (
                    <span className="text-xs text-secondary font-medium" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={13} strokeWidth={1.8} style={{ color: 'var(--text-tertiary)' }} />
                      Target: {new Date(selectedProject.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedProject(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <X size={20} />
                </button>
              </div>

              <h3 className="font-bold text-xl mb-3" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {selectedProject.name}
              </h3>

              {/* Aim & Objective Scope Box */}
              <div style={{ marginBottom: '20px' }}>
                <h4 className="text-xs font-semibold text-secondary uppercase mb-1.5" style={{ letterSpacing: '0.05em' }}>
                  Aim & Objectives
                </h4>
                <div style={{
                  background: 'var(--subtle)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedProject.aim}
                </div>
              </div>

              {/* Project Deliverables Progress */}
              <div style={{
                marginBottom: '20px',
                padding: '14px 16px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)'
              }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-secondary uppercase" style={{ letterSpacing: '0.05em' }}>
                    Deliverables Progress
                  </span>
                  <span className="text-xs font-bold" style={{ color: 'var(--brand-600)' }}>
                    {stats.percent}% Completed ({stats.completed}/{stats.total} Tasks)
                  </span>
                </div>

                <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{
                    width: `${stats.percent}%`,
                    height: '100%',
                    background: 'var(--brand-gradient)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.4s ease'
                  }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div style={{ padding: '6px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <span className="text-xs text-secondary block">Completed</span>
                    <span className="font-bold text-sm" style={{ color: 'var(--status-completed)' }}>{stats.completed}</span>
                  </div>
                  <div style={{ padding: '6px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <span className="text-xs text-secondary block">In Review</span>
                    <span className="font-bold text-sm" style={{ color: 'var(--brand-600)' }}>{stats.inReview}</span>
                  </div>
                  <div style={{ padding: '6px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <span className="text-xs text-secondary block">In Progress</span>
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{stats.inProgress}</span>
                  </div>
                  <div style={{ padding: '6px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <span className="text-xs text-secondary block">Blocked</span>
                    <span className="font-bold text-sm" style={{ color: 'var(--status-blocked)' }}>{stats.blocked}</span>
                  </div>
                </div>
              </div>

              {/* Tasks List for this Project */}
              {stats.projectTasks.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 className="text-xs font-semibold text-secondary uppercase mb-2" style={{ letterSpacing: '0.05em' }}>
                    Project Deliverable Tasks ({stats.projectTasks.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                    {stats.projectTasks.map(t => (
                      <div
                        key={t.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--subtle)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-full)',
                            background: t.status === 'completed' ? 'var(--status-completed-bg)' : 'var(--brand-50)',
                            color: t.status === 'completed' ? 'var(--status-completed)' : 'var(--brand-700)',
                            textTransform: 'uppercase'
                          }}>
                            {t.status.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.title}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {getUserFullName(t.assignee)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Allocated Squads */}
              <div style={{ marginBottom: '20px' }}>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-semibold text-secondary uppercase" style={{ letterSpacing: '0.05em' }}>
                    Allocated Teams ({allocatedTeams.length})
                  </h4>
                </div>

                {allocatedTeams.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {allocatedTeams.map(team => {
                      const lead = (team.memberships || []).find(m => m.is_lead);
                      return (
                        <div
                          key={team.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--surface-hover)',
                            border: '1px solid var(--border)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Users size={16} color="var(--brand-600)" />
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{team.name}</p>
                              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {team.memberships?.length || 0} members {lead ? `• Lead: ${getUserFullName(lead.user)}` : '• No lead assigned'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-secondary italic">No teams currently allocated to this project.</p>
                )}

                {/* PM Quick Team Allocation */}
                {user.role === 'PM' && unallocatedTeams.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <select
                      value={overviewTeamToAllocate}
                      onChange={(e) => setOverviewTeamToAllocate(e.target.value)}
                      className="input"
                      style={{ padding: '6px 10px', fontSize: '12px', flex: 1 }}
                    >
                      <option value="">-- Allocate an Existing Squad --</option>
                      {unallocatedTeams.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.memberships?.length || 0} members)
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAllocateTeamFromOverview}
                      disabled={!overviewTeamToAllocate}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                    >
                      Allocate
                    </button>
                  </div>
                )}
              </div>

              {/* Attached Images, Videos & Documents */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-semibold text-secondary uppercase" style={{ letterSpacing: '0.05em' }}>
                    Attachments ({selectedProject.attachments?.length || 0})
                  </h4>
                  {user.role === 'PM' && (
                    <>
                      <input
                        type="file"
                        ref={overviewFileInputRef}
                        onChange={handleOverviewFileSelect}
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => overviewFileInputRef.current?.click()}
                        disabled={overviewUploading}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--brand-600)',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Paperclip size={12} />
                        {overviewUploading ? 'Uploading...' : 'Attach More'}
                      </button>
                    </>
                  )}
                </div>

                {(selectedProject.attachments && selectedProject.attachments.length > 0) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedProject.attachments.map(att => (
                      <a
                        key={att.id}
                        href={att.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--subtle)',
                          border: '1px solid var(--border)',
                          textDecoration: 'none',
                          color: 'inherit',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {getFileIcon(att.file_type)}
                          <div>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {att.file_name}
                            </p>
                            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                              Storage: {att.storage_provider}
                            </p>
                          </div>
                        </div>
                        <ExternalLink size={14} color="var(--text-secondary)" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-secondary italic">No attachments provided for this project.</p>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="btn btn-secondary"
                >
                  Close Overview
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ProjectsPage;
