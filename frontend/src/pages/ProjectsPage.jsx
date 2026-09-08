import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getProjects, createProject, updateProject } from '../api/projects';
import { getTeams, updateTeam } from '../api/teams';
import { getUsers } from '../api/users';
import { getTasks } from '../api/tasks';
import { uploadFile } from '../api/upload';
import { useRealtime } from '../realtime/useRealtime';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Calendar, ArrowRight, FolderKanban, X, Check, Users,
  Paperclip, Image as ImageIcon, Film, FileText, ExternalLink,
  Briefcase, UserCheck, ChevronRight, CheckCircle2, Clock, AlertCircle,
  Pencil
} from 'lucide-react';

const ProjectsPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState(() => {
    try {
      const cached = localStorage.getItem('cache_projects');
      const parsed = cached ? JSON.parse(cached) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(() => !localStorage.getItem('cache_projects'));
  // Filter and Analytics state
  const [filterStatus, setFilterStatus] = useState('all');

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

  // Edit Project Modal state (For PM only)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAim, setEditAim] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editDeadline, setEditDeadline] = useState('');
  const [editAttachedFiles, setEditAttachedFiles] = useState([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState('');
  const editFileInputRef = useRef(null);

  // Project Overview Modal state
  const [selectedProject, setSelectedProject] = useState(null);
  const [overviewTeamToAllocate, setOverviewTeamToAllocate] = useState('');

  const loadData = async () => {
    try {
      const [projectsData, teamsData, usersData, tasksData] = await Promise.all([
        getProjects().catch(() => []),
        getTeams().catch(() => []),
        getUsers().catch(() => []),
        getTasks().catch(() => [])
      ]);
      const safeProjects = Array.isArray(projectsData) ? projectsData : [];
      const safeTeams = Array.isArray(teamsData) ? teamsData : [];
      const safeUsers = Array.isArray(usersData) ? usersData : [];
      const safeTasks = Array.isArray(tasksData) ? tasksData : [];

      setProjects(safeProjects);
      setTeams(safeTeams);
      setUsersList(safeUsers);
      setTasks(safeTasks);
      try {
        localStorage.setItem('cache_projects', JSON.stringify(safeProjects));
      } catch (e) {
        console.warn('Could not cache projects to localStorage:', e);
      }

      // If a project is currently open in overview modal, refresh its data
      setSelectedProject(prev => {
        if (!prev) return null;
        return safeProjects.find(p => String(p.id) === String(prev.id)) || prev;
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

  // Escape key handler to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedProject(null);
        setShowModal(false);
        setShowEditModal(false);
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

  const handleEditFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setEditAttachedFiles(prev => [...prev, ...files]);
    }
  };

  const removeEditAttachedFile = (index) => {
    setEditAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatForDateTimeInput = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
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

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!name.trim() || !aim.trim()) {
      setFormError('Please provide both a project name and project aim/objective.');
      return;
    }
    if (!selectedTeamId) {
      setFormError('Please allocate this project to a team.');
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
        team_id: selectedTeamId,
      };

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

  const handleOpenEditModal = (project, e) => {
    if (e) e.stopPropagation();
    setEditingProject(project);
    setEditName(project.name || '');
    setEditAim(project.aim || '');
    setEditStatus(project.status || 'active');
    setEditDeadline(formatForDateTimeInput(project.deadline));
    setEditAttachedFiles([]);
    setEditFormError('');
    setShowEditModal(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!editName.trim() || !editAim.trim()) {
      setEditFormError('Project name and aim/objective are required.');
      return;
    }
    setEditSubmitting(true);
    setEditFormError('');
    try {
      const updated = await updateProject(editingProject.id, {
        name: editName.trim(),
        aim: editAim.trim(),
        status: editStatus,
        deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
      });

      // Upload newly attached files if any
      if (editAttachedFiles.length > 0) {
        for (let i = 0; i < editAttachedFiles.length; i++) {
          const file = editAttachedFiles[i];
          try {
            await uploadFile(file, null, editingProject.id);
          } catch (uploadErr) {
            console.error(`Failed to upload file ${file.name}:`, uploadErr);
          }
        }
      }

      // Update in active modal if open
      if (selectedProject && String(selectedProject.id) === String(editingProject.id)) {
        setSelectedProject(prev => ({ ...prev, ...updated }));
      }

      setShowEditModal(false);
      setEditingProject(null);
      setEditAttachedFiles([]);
      loadData();
    } catch (err) {
      setEditFormError(err.response?.data?.detail || 'Failed to update project.');
    } finally {
      setEditSubmitting(false);
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

  // Helper to compute tasks and progress for a project
  const getProjectTaskStats = (projectId) => {
    const safeTeamsList = Array.isArray(teams) ? teams : [];
    const safeTasksList = Array.isArray(tasks) ? tasks : [];
    const allocatedTeams = safeTeamsList.filter(t => String(t.project_id) === String(projectId));
    const teamIds = new Set(allocatedTeams.map(t => String(t.id)));
    const projectTasks = safeTasksList.filter(t => teamIds.has(String(t.team_id)));
    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.status === 'completed').length;
    const inReview = projectTasks.filter(t => t.status === 'in_review').length;
    const inProgress = projectTasks.filter(t => t.status === 'in_progress').length;
    const blocked = projectTasks.filter(t => t.status === 'blocked').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { projectTasks, total, completed, inReview, inProgress, blocked, percent, allocatedTeams };
  };

  // Analytics & Filtering Calculations
  const projectList = Array.isArray(projects) ? projects : [];
  const totalProjects = projectList.length;
  const activeProjects = projectList.filter(p => (p.status || 'active').toLowerCase() === 'active').length;
  const inReviewProjects = projectList.filter(p => (p.status || '').toLowerCase() === 'in_review').length;
  const completedProjects = projectList.filter(p => (p.status || '').toLowerCase() === 'completed').length;
  const onHoldProjects = projectList.filter(p => ['blocked', 'on_hold', 'hold'].includes((p.status || '').toLowerCase())).length;

  const overallCompletionRate = totalProjects > 0
    ? Math.round((completedProjects / totalProjects) * 100)
    : 0;

  const filteredProjects = projectList.filter(p => {
    const st = (p.status || 'active').toLowerCase();
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return st === 'active';
    if (filterStatus === 'in_review') return st === 'in_review';
    if (filterStatus === 'completed') return st === 'completed';
    if (filterStatus === 'on_hold' || filterStatus === 'blocked') return ['blocked', 'on_hold', 'hold'].includes(st);
    return true;
  });

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

        {/* PM has ability to create and assign project deliverables */}
        {user?.role === 'PM' && (
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
        )}
      </div>

      {/* Interactive Analytics Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Total Projects */}
        <div
          className="card"
          onClick={() => setFilterStatus('all')}
          style={{
            padding: '18px 20px',
            cursor: 'pointer',
            border: filterStatus === 'all' ? '2px solid var(--brand-500)' : '1px solid var(--border)',
            background: filterStatus === 'all' ? 'var(--brand-50)' : 'var(--surface)',
            transition: 'all var(--transition-fast)',
            boxShadow: filterStatus === 'all' ? '0 4px 12px rgba(99, 102, 241, 0.12)' : 'none'
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider" style={{ fontSize: '11px' }}>
              Total Projects
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--brand-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FolderKanban size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {totalProjects}
            </h3>
            <span className="text-xs text-secondary">All initiatives</span>
          </div>
        </div>

        {/* Active Projects */}
        <div
          className="card"
          onClick={() => setFilterStatus('active')}
          style={{
            padding: '18px 20px',
            cursor: 'pointer',
            border: filterStatus === 'active' ? '2px solid #3b82f6' : '1px solid var(--border)',
            background: filterStatus === 'active' ? 'rgba(59, 130, 246, 0.08)' : 'var(--surface)',
            transition: 'all var(--transition-fast)',
            boxShadow: filterStatus === 'active' ? '0 4px 12px rgba(59, 130, 246, 0.12)' : 'none'
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ fontSize: '11px', color: '#2563eb' }}>
              Active
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold" style={{ color: '#1d4ed8', letterSpacing: '-0.02em' }}>
              {activeProjects}
            </h3>
            <span className="text-xs text-secondary">In progress</span>
          </div>
        </div>

        {/* In Review */}
        <div
          className="card"
          onClick={() => setFilterStatus('in_review')}
          style={{
            padding: '18px 20px',
            cursor: 'pointer',
            border: filterStatus === 'in_review' ? '2px solid #f59e0b' : '1px solid var(--border)',
            background: filterStatus === 'in_review' ? 'rgba(245, 158, 11, 0.08)' : 'var(--surface)',
            transition: 'all var(--transition-fast)',
            boxShadow: filterStatus === 'in_review' ? '0 4px 12px rgba(245, 158, 11, 0.12)' : 'none'
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ fontSize: '11px', color: '#d97706' }}>
              In Review
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold" style={{ color: '#b45309', letterSpacing: '-0.02em' }}>
              {inReviewProjects}
            </h3>
            <span className="text-xs text-secondary">Awaiting verification</span>
          </div>
        </div>

        {/* Completed Projects */}
        <div
          className="card"
          onClick={() => setFilterStatus('completed')}
          style={{
            padding: '18px 20px',
            cursor: 'pointer',
            border: filterStatus === 'completed' ? '2px solid #10b981' : '1px solid var(--border)',
            background: filterStatus === 'completed' ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface)',
            transition: 'all var(--transition-fast)',
            boxShadow: filterStatus === 'completed' ? '0 4px 12px rgba(16, 185, 129, 0.12)' : 'none'
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ fontSize: '11px', color: '#059669' }}>
              Completed
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold" style={{ color: '#047857', letterSpacing: '-0.02em' }}>
              {completedProjects}
            </h3>
            <span className="text-xs text-secondary">Shipped & delivered</span>
          </div>
        </div>

        {/* Overall Completion Rate */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            background: 'var(--surface)'
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider" style={{ fontSize: '11px' }}>
              Completion Rate
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--brand-600)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--brand-50)'
            }}>
              {completedProjects}/{totalProjects} Done
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {overallCompletionRate}%
            </h3>
            <span className="text-xs text-secondary">delivered</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{
              width: `${overallCompletionRate}%`,
              height: '100%',
              background: 'var(--brand-gradient)',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Filter Tabs / Quick Filter Pill Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Projects', count: totalProjects },
            { id: 'active', label: 'Active', count: activeProjects },
            { id: 'in_review', label: 'In Review', count: inReviewProjects },
            { id: 'completed', label: 'Completed', count: completedProjects },
            { id: 'on_hold', label: 'On Hold / Blocked', count: onHoldProjects },
          ].map(tab => {
            const isSelected = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected ? '1px solid var(--brand-500)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--brand-600)' : 'var(--surface)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--subtle)',
                  color: isSelected ? '#fff' : 'var(--text-tertiary)',
                  fontWeight: 700
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <span className="text-xs text-secondary">
          Showing <strong>{filteredProjects.length}</strong> of {totalProjects} project{totalProjects === 1 ? '' : 's'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {filteredProjects.map(p => {
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
                      {p.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                    {p.deadline && (
                      <span className="text-xs text-secondary font-medium" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={13} strokeWidth={1.8} style={{ color: 'var(--text-tertiary)' }} />
                        {new Date(p.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}, {new Date(p.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {user?.role === 'PM' && (
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditModal(p, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all var(--transition-fast)'
                      }}
                      title="Edit Project"
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--brand-600)'; e.currentTarget.style.background = 'var(--brand-50)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Pencil size={14} />
                    </button>
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

              {/* Functional Overview Action Button */}
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

        {filteredProjects.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center' }}>
            <FolderKanban size={32} strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-tertiary)' }} />
            <h4 className="font-bold text-base mb-1">
              {totalProjects === 0 ? 'No Projects Yet' : `No ${filterStatus.replace('_', ' ')} projects found`}
            </h4>
            <p className="text-secondary text-sm mb-3">
              {totalProjects === 0
                ? (user?.role === 'PM' ? 'Click "+ New Project" to create deliverables and allocate teams.' : 'Projects assigned by Project Managers will be listed here.')
                : 'There are currently no projects matching this filter criteria.'}
            </p>
            {totalProjects > 0 && filterStatus !== 'all' && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFilterStatus('all')}
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                Clear filter and view all
              </button>
            )}
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

              {/* Aim / Description */}
              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Aim & Scope Description *</label>
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

              {/* Allocate to Team Dropdown (Required) */}
              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Allocate to Team *</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">-- Select Team * --</option>
                  {(Array.isArray(teams) ? teams : []).map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.memberships?.length || 0} members)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-secondary mt-1">
                  Select an active squad to allocate and take ownership of this project deliverable.
                </p>
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

      {/* Edit Project Modal (Exclusive to PM) */}
      {showEditModal && editingProject && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
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
            zIndex: 1000,
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
                  Edit Project
                </h3>
                <p className="text-xs text-secondary mt-0.5">Update project deliverables, scope, and timeline</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {editFormError && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--status-blocked-bg)',
                color: 'var(--status-blocked)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {editFormError}
              </div>
            )}

            <form onSubmit={handleUpdateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Project Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Aim & Scope Description *</label>
                <textarea
                  rows={4}
                  value={editAim}
                  onChange={(e) => setEditAim(e.target.value)}
                  className="input"
                  style={{ resize: 'vertical' }}
                  required
                />

                {/* Attach Images, videos and Docs in Edit Modal */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
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
                      <span>Attach Images, videos and Docs</span>
                    </button>
                    <span className="text-xs text-secondary">
                      {editAttachedFiles.length > 0 ? `${editAttachedFiles.length} new file${editAttachedFiles.length > 1 ? 's' : ''} attached` : 'Supports images, videos & documents'}
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={editFileInputRef}
                    onChange={handleEditFileSelect}
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                    style={{ display: 'none' }}
                  />

                  {editAttachedFiles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                      {editAttachedFiles.map((file, idx) => (
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
                            onClick={() => removeEditAttachedFile(idx)}
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
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Project Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="input"
                  >
                    <option value="active">Active</option>
                    <option value="in_review">In Review</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Target Deadline & Time</label>
                  <input
                    type="datetime-local"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editSubmitting}
                >
                  {editSubmitting ? 'Saving Changes...' : 'Save Changes'}
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
        const unallocatedTeams = (Array.isArray(teams) ? teams : []).filter(t => !t.project_id);

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
                      Target: {new Date(selectedProject.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}, {new Date(selectedProject.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {user?.role === 'PM' && (
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditModal(selectedProject, e)}
                      className="btn btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', fontSize: '12px' }}
                    >
                      <Pencil size={13} />
                      <span>Edit Project</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedProject(null)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    <X size={20} />
                  </button>
                </div>
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
                {user?.role === 'PM' && unallocatedTeams.length > 0 && (
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

              {/* Attached Images, Videos & Documents (No Attach More button) */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-semibold text-secondary uppercase" style={{ letterSpacing: '0.05em' }}>
                    Attachments ({selectedProject.attachments?.length || 0})
                  </h4>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="btn btn-secondary"
                >
                  Close Overview
                </button>
                {user?.role === 'PM' && (
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditModal(selectedProject, e)}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Pencil size={14} />
                    <span>Edit Project</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ProjectsPage;
