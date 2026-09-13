import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getProjects, createProject, updateProject, deleteProject } from '../api/projects';
import { getTeams, updateTeam } from '../api/teams';
import { getTasks } from '../api/tasks';
import { uploadFile } from '../api/upload';
import { getStoredGoogleToken, requestGoogleAccessToken, isGoogleDriveConnected } from '../services/googleDriveAuth';
import { useRealtime } from '../realtime/useRealtime';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Calendar, ArrowRight, FolderKanban, X, Users,
  Paperclip, Image as ImageIcon, Film, FileText,
  Clock, AlertCircle, Pencil, AlertTriangle, CheckCircle2, Trash2
} from 'lucide-react';
import { AttachmentCard } from '../components/common/AttachmentCard';
import { DayWiseTaskPlanner, formatDeadlineWithTime } from '../components/projects/DayWiseTaskPlanner';

const PROJECT_THEMES = [
  {
    headerBg: '#5551FF',      // Purple / Indigo (City 360 Nagara)
    headerText: '#FFFFFF',
    tagBg: '#FFFFFF',
    tagText: '#5551FF',
    codeBg: 'rgba(255, 255, 255, 0.25)',
    codeText: '#FFFFFF',
    teamBg: '#EEF2FF',
    teamText: '#4338CA',
    teamIcon: '#4F46E5',
    btnBg: '#5551FF',
    btnHover: '#4338CA',
    defaultCode: 'CTY'
  },
  {
    headerBg: '#E17842',      // Warm Orange / Rust (Life OS)
    headerText: '#FFFFFF',
    tagBg: '#FFFFFF',
    tagText: '#E17842',
    codeBg: 'rgba(255, 255, 255, 0.25)',
    codeText: '#FFFFFF',
    teamBg: '#FFF7ED',
    teamText: '#C2410C',
    teamIcon: '#EA580C',
    btnBg: '#E17842',
    btnHover: '#C2410C',
    defaultCode: 'LOS'
  },
  {
    headerBg: '#1EA566',      // Vibrant Emerald Green (Blinkit)
    headerText: '#FFFFFF',
    tagBg: '#FFFFFF',
    tagText: '#1EA566',
    codeBg: 'rgba(255, 255, 255, 0.25)',
    codeText: '#FFFFFF',
    teamBg: '#ECFDF5',
    teamText: '#047857',
    teamIcon: '#059669',
    btnBg: '#1EA566',
    btnHover: '#047857',
    defaultCode: 'BLK'
  },
  {
    headerBg: '#0284C7',      // Sky / Royal Blue
    headerText: '#FFFFFF',
    tagBg: '#FFFFFF',
    tagText: '#0284C7',
    codeBg: 'rgba(255, 255, 255, 0.25)',
    codeText: '#FFFFFF',
    teamBg: '#F0F9FF',
    teamText: '#0369A1',
    teamIcon: '#0284C7',
    btnBg: '#0284C7',
    btnHover: '#0369A1',
    defaultCode: 'PRJ'
  },
  {
    headerBg: '#8B5CF6',      // Violet / Purple
    headerText: '#FFFFFF',
    tagBg: '#FFFFFF',
    tagText: '#8B5CF6',
    codeBg: 'rgba(255, 255, 255, 0.25)',
    codeText: '#FFFFFF',
    teamBg: '#F5F3FF',
    teamText: '#6D28D9',
    teamIcon: '#7C3AED',
    btnBg: '#8B5CF6',
    btnHover: '#6D28D9',
    defaultCode: 'APP'
  }
];

const getProjectTheme = (project, index) => {
  const name = (project.name || '').toLowerCase();
  if (name.includes('city') || name.includes('nagara')) {
    return { ...PROJECT_THEMES[0], code: 'CTY' };
  }
  if (name.includes('life os') || name.includes('life')) {
    return { ...PROJECT_THEMES[1], code: 'LOS' };
  }
  if (name.includes('blinkit')) {
    return { ...PROJECT_THEMES[2], code: 'BLK' };
  }
  
  const theme = PROJECT_THEMES[index % PROJECT_THEMES.length];
  const words = project.name ? project.name.split(/[\s\-()]+/).filter(Boolean) : [];
  let code = theme.defaultCode;
  if (words.length >= 3) {
    code = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  } else if (words.length === 2) {
    code = (words[0].substring(0, 2) + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 3) {
    code = words[0].substring(0, 3).toUpperCase();
  }
  return { ...theme, code };
};

const ProjectsPage = () => {
  const { user } = useAuth();
  const cacheKey = user ? `cache_projects_${user.id}` : 'cache_projects';
  const [plannerProject, setPlannerProject] = useState(null);
  const [gdriveConnected, setGdriveConnected] = useState(isGoogleDriveConnected());
  const [projects, setProjects] = useState(() => {
    try {
      const cached = localStorage.getItem(cacheKey) || localStorage.getItem('cache_projects');
      const parsed = cached ? JSON.parse(cached) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(() => !(localStorage.getItem(cacheKey) || localStorage.getItem('cache_projects')));
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
  const [editSelectedTeamIds, setEditSelectedTeamIds] = useState([]);
  const [editAttachedFiles, setEditAttachedFiles] = useState([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState('');
  const editFileInputRef = useRef(null);

  // Project Overview Modal state
  const [selectedProject, setSelectedProject] = useState(null);
  const [overviewTeamToAllocate, setOverviewTeamToAllocate] = useState('');

  const loadData = async () => {
    try {
      const [projectsData, teamsData, tasksData] = await Promise.all([
        getProjects().catch(() => []),
        getTeams().catch(() => []),
        getTasks().catch(() => [])
      ]);
      const safeProjects = Array.isArray(projectsData) ? projectsData : [];
      const safeTeams = Array.isArray(teamsData) ? teamsData : [];
      const safeTasks = Array.isArray(tasksData) ? tasksData : [];

      setProjects(safeProjects);
      setTeams(safeTeams);
      setTasks(safeTasks);
      try {
        if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(safeProjects));
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
  useRealtime('project.deleted', handleUpdate);
  useRealtime('team.created', handleUpdate);
  useRealtime('task.created', handleUpdate);
  useRealtime('task.status_changed', handleUpdate);
  useRealtime('task.updated', handleUpdate);
  useRealtime('task.completed', handleUpdate);
  useRealtime('task.reassigned', handleUpdate);
  useRealtime('task.locked', handleUpdate);

  // Escape key handler to close modals & GDrive auth change listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedProject(null);
        setShowModal(false);
        setShowEditModal(false);
      }
    };
    const handleGdriveChange = () => setGdriveConnected(isGoogleDriveConnected());
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('gdrive_auth_change', handleGdriveChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('gdrive_auth_change', handleGdriveChange);
    };
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

  const parseIsoDate = (isoStr) => {
    if (!isoStr) return null;
    if (isoStr instanceof Date) return isNaN(isoStr.getTime()) ? null : isoStr;
    let str = String(isoStr).trim();
    if (!str) return null;
    if (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str)) {
      str += 'Z';
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatForDateTimeInput = (isoStr) => {
    const d = parseIsoDate(isoStr);
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
    // Check if user has attached document files that require Google Drive OAuth
    const hasDocFiles = attachedFiles.some(f => !f.type?.startsWith('image/') && !f.type?.startsWith('video/'));
    let googleToken = null;
    if (hasDocFiles) {
      googleToken = getStoredGoogleToken();
      if (!googleToken) {
        setSubmitting(true);
        setSubmitStatusText('Requesting Google Drive permission...');
        try {
          googleToken = await requestGoogleAccessToken();
        } catch (authErr) {
          console.warn('Google Drive Auth error:', authErr);
          setFormError(authErr?.message || 'Google Drive authentication is required to upload document attachments. Please grant permissions in the Google window.');
          setSubmitting(false);
          setSubmitStatusText('');
          return;
        }
      }
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
          const isDoc = !file.type?.startsWith('image/') && !file.type?.startsWith('video/');
          try {
            await uploadFile(file, null, createdProject.id, isDoc ? googleToken : null);
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
    const currentTeamIds = (project.teams || []).map(t => t.id);
    setEditSelectedTeamIds(currentTeamIds);
    setEditAttachedFiles([]);
    setEditFormError('');
    setShowEditModal(true);
  };

  const handleToggleEditTeam = (teamId) => {
    setEditSelectedTeamIds(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!editName.trim() || !editAim.trim()) {
      setEditFormError('Project name and aim/objective are required.');
      return;
    }

    // Check if user has attached document files that require Google Drive OAuth
    const hasDocFiles = editAttachedFiles.some(f => !f.type?.startsWith('image/') && !f.type?.startsWith('video/'));
    let googleToken = null;
    if (hasDocFiles) {
      googleToken = getStoredGoogleToken();
      if (!googleToken) {
        setEditSubmitting(true);
        try {
          googleToken = await requestGoogleAccessToken();
        } catch (authErr) {
          console.warn('Google Drive Auth error:', authErr);
          setEditFormError(authErr?.message || 'Google Drive authentication is required to upload document attachments. Please grant permissions in the Google window.');
          setEditSubmitting(false);
          return;
        }
      }
    }

    setEditSubmitting(true);
    setEditFormError('');
    try {
      const updated = await updateProject(editingProject.id, {
        name: editName.trim(),
        aim: editAim.trim(),
        status: editStatus,
        deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
        team_ids: editSelectedTeamIds,
      });

      // Upload newly attached files if any
      if (editAttachedFiles.length > 0) {
        for (let i = 0; i < editAttachedFiles.length; i++) {
          const file = editAttachedFiles[i];
          const isDoc = !file.type?.startsWith('image/') && !file.type?.startsWith('video/');
          try {
            await uploadFile(file, null, editingProject.id, isDoc ? googleToken : null);
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
      setEditSelectedTeamIds([]);
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

  const handleDeleteProject = async (projectId, projectName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete project "${projectName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteProject(projectId);
      if (selectedProject && String(selectedProject.id) === String(projectId)) {
        setSelectedProject(null);
      }
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete project.');
    }
  };

  // Helper to compute tasks and progress for a project
  const getProjectTaskStats = (projectInput) => {
    const projId = typeof projectInput === 'object' ? projectInput?.id : projectInput;
    const projectObj = typeof projectInput === 'object' ? projectInput : (projects.find(p => String(p.id) === String(projId)) || {});
    const safeTeamsList = Array.isArray(teams) ? teams : [];
    const safeTasksList = Array.isArray(tasks) ? tasks : [];

    const allocatedTeams = (projectObj.teams && projectObj.teams.length > 0)
      ? projectObj.teams
      : safeTeamsList.filter(t => String(t.project_id) === String(projId));

    const projectTasks = safeTasksList.filter(t => String(t.project_id) === String(projId));
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
      {/* Header Title Section */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#1E293B', fontFamily: 'serif, Georgia, Inter, sans-serif', marginBottom: '4px' }}>
            Projects
          </h2>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Active company deliverables, squad allocations, and milestone timelines.
          </p>
        </div>

        {/* PM Has ability to create new projects */}
        {user?.role === 'PM' && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setFormError('');
              setShowModal(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#5551FF', borderRadius: '8px', padding: '10px 18px', fontWeight: 600 }}
          >
            <Plus size={16} />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* 4 Stat Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
        gap: '16px',
        marginBottom: '16px'
      }}>
        {/* Total projects */}
        <div
          onClick={() => setFilterStatus('all')}
          style={{
            background: filterStatus === 'all' ? '#EEF2FF' : '#EEF2FF',
            border: filterStatus === 'all' ? '2px solid #5551FF' : '1px solid rgba(85, 81, 255, 0.2)',
            borderRadius: '16px',
            padding: '20px 22px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filterStatus === 'all' ? '0 4px 14px rgba(85, 81, 255, 0.12)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4F46E5' }}>Total projects</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <FolderKanban size={16} color="#5551FF" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A' }}>{totalProjects}</span>
            <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>All initiatives</span>
          </div>
        </div>

        {/* Active */}
        <div
          onClick={() => setFilterStatus('active')}
          style={{
            background: '#EBF5FF',
            border: filterStatus === 'active' ? '2px solid #2563EB' : '1px solid rgba(37, 99, 235, 0.18)',
            borderRadius: '16px',
            padding: '20px 22px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filterStatus === 'active' ? '0 4px 14px rgba(37, 99, 235, 0.12)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB' }}>Active</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <Clock size={16} color="#2563EB" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A' }}>{activeProjects}</span>
            <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>In progress</span>
          </div>
        </div>

        {/* In review */}
        <div
          onClick={() => setFilterStatus('in_review')}
          style={{
            background: '#FFF7ED',
            border: filterStatus === 'in_review' ? '2px solid #D97706' : '1px solid rgba(217, 119, 6, 0.18)',
            borderRadius: '16px',
            padding: '20px 22px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filterStatus === 'in_review' ? '0 4px 14px rgba(217, 119, 6, 0.12)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#D97706' }}>In review</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <AlertCircle size={16} color="#D97706" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A' }}>{inReviewProjects}</span>
            <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Awaiting verification</span>
          </div>
        </div>

        {/* Completed */}
        <div
          onClick={() => setFilterStatus('completed')}
          style={{
            background: '#ECFDF5',
            border: filterStatus === 'completed' ? '2px solid #059669' : '1px solid rgba(5, 150, 105, 0.18)',
            borderRadius: '16px',
            padding: '20px 22px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: filterStatus === 'completed' ? '0 4px 14px rgba(5, 150, 105, 0.12)' : 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>Completed</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <CheckCircle2 size={16} color="#059669" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A' }}>{completedProjects}</span>
            <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Shipped & delivered</span>
          </div>
        </div>
      </div>

      {/* Completion rate Banner with Segmented Bar */}
      <div
        style={{
          background: '#EEF2FF',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
            Completion rate
          </span>
          <span
            style={{
              background: '#FFFFFF',
              color: '#5551FF',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 700,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            {completedProjects}/{totalProjects} done
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A' }}>
            {overallCompletionRate}%
          </span>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>delivered</span>
        </div>

        {/* Dashed Segmented Bar */}
        <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
          {Array.from({ length: 24 }).map((_, idx) => {
            const segPercent = ((idx + 1) / 24) * 100;
            const isFilled = overallCompletionRate > 0 && segPercent <= overallCompletionRate;
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: '8px',
                  borderRadius: '4px',
                  background: isFilled ? '#5551FF' : '#FFFFFF',
                  transition: 'background 0.3s ease'
                }}
              />
            );
          })}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%', paddingBottom: '4px' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
        {filteredProjects.map((p, index) => {
          const stats = getProjectTaskStats(p);
          const allocatedTeams = stats.allocatedTeams;
          const attachments = p.attachments || [];
          const theme = getProjectTheme(p, index);

          // Deadline calculation
          let deadlineText = 'No deadline set';
          let isOverdue = false;
          if (p.deadline) {
            const d = parseIsoDate(p.deadline);
            if (d) {
              isOverdue = d.getTime() < Date.now() && p.status !== 'completed';
              deadlineText = `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }
          }

          return (
            <div
              key={p.id}
              onClick={() => {
                if (['TL', 'TM'].includes(user?.role)) {
                  setPlannerProject(p);
                } else {
                  setSelectedProject(p);
                }
              }}
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.09)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)';
              }}
            >
              {/* Colored Top Header Banner */}
              <div
                style={{
                  background: theme.headerBg,
                  color: theme.headerText,
                  padding: '20px 22px 18px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Header Top Meta Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        background: theme.tagBg,
                        color: theme.tagText,
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}
                    >
                      {p.status ? p.status.toUpperCase() : 'ACTIVE'}
                    </span>
                    <span
                      style={{
                        background: theme.codeBg,
                        color: theme.codeText,
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        letterSpacing: '0.06em'
                      }}
                    >
                      {theme.code}
                    </span>
                  </div>

                  {/* Management Edit/Delete Buttons */}
                  {['PM', 'CEO', 'CTO'].includes(user?.role) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditModal(p, e)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.18)',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '5px',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        title="Edit Project"
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'; }}
                      >
                        <Pencil size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteProject(p.id, p.name, e)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.18)',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '5px',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        title="Delete Project"
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#EF4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'; }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Project Title */}
                <h3
                  style={{
                    color: '#FFFFFF',
                    fontSize: '19px',
                    fontWeight: 700,
                    margin: 0,
                    lineHeight: '1.3',
                    letterSpacing: '-0.01em',
                    fontFamily: 'serif, Georgia, Inter, sans-serif',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {p.name}
                </h3>
              </div>

              {/* White Card Body Container */}
              <div
                style={{
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  background: '#FFFFFF'
                }}
              >
                {/* Aim / Description */}
                <p
                  style={{
                    fontSize: '13px',
                    color: '#475569',
                    lineHeight: '1.5',
                    marginBottom: '16px',
                    minHeight: '38px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {p.aim || 'No description provided for this project.'}
                </p>

                {/* Soft Red / Alert Box for Deadline */}
                <div
                  style={{
                    background: isOverdue ? '#FEF2F2' : '#F8FAFC',
                    border: isOverdue ? '1px solid #FEE2E2' : '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: isOverdue ? '#B91C1C' : '#475569', fontWeight: 500 }}>
                    <Calendar size={14} color={isOverdue ? '#DC2626' : '#64748B'} />
                    <span>{deadlineText}</span>
                  </div>

                  {p.deadline && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: isOverdue ? '#DC2626' : '#16A34A',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      {isOverdue ? '⚠️ Exceeded' : '✓ On Track'}
                    </span>
                  )}
                </div>

                {/* Progress Header & Bar */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                      Progress · {stats.total > 0 ? `${stats.total} tasks scheduled` : '0 tasks scheduled'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: theme.headerBg }}>
                      {stats.percent}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '7px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${stats.percent || 0}%`,
                        height: '100%',
                        background: theme.headerBg,
                        borderRadius: '9999px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>

                {/* Squad Pill & Attachments row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {allocatedTeams.length > 0 ? (
                    allocatedTeams.slice(0, 2).map(t => (
                      <span
                        key={t.id}
                        style={{
                          background: theme.teamBg,
                          color: theme.teamText,
                          padding: '4px 11px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Users size={12} color={theme.teamIcon} />
                        {t.name}
                      </span>
                    ))
                  ) : (
                    <span
                      style={{
                        background: '#F1F5F9',
                        color: '#64748B',
                        padding: '4px 11px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Users size={12} />
                      Unallocated Squad
                    </span>
                  )}

                  {allocatedTeams.length > 2 && (
                    <span style={{ background: '#F1F5F9', color: '#475569', fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '9999px' }}>
                      +{allocatedTeams.length - 2}
                    </span>
                  )}

                  {attachments.length > 0 && (
                    <span style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569', fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Paperclip size={11} /> {attachments.length}
                    </span>
                  )}
                </div>

                {/* Grid 2-Column Action Buttons */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: ['TL', 'TM'].includes(user?.role) ? '1fr 1fr' : '1fr',
                    gap: '10px',
                    marginTop: 'auto',
                    paddingTop: '12px'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {['TL', 'TM'].includes(user?.role) && (
                    <button
                      type="button"
                      onClick={() => setPlannerProject(p)}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#1E293B',
                        borderRadius: '8px',
                        padding: '9px 12px',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#94A3B8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                    >
                      <Calendar size={13} color="#475569" />
                      <span>Day-wise tasks</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedProject(p)}
                    style={{
                      background: theme.btnBg,
                      border: 'none',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = theme.btnHover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = theme.btnBg; }}
                  >
                    <span>Overview</span>
                    <ArrowRight size={13} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
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

                  {attachedFiles.some(f => !f.type?.startsWith('image/') && !f.type?.startsWith('video/')) && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: gdriveConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                      border: `1px solid ${gdriveConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path d="M7.71 3.5L1.15 15l3.43 6h6.56l-3.43-6L14.28 3.5H7.71z" fill="#0066DA"/>
                          <path d="M22.85 15l-3.43-6H6.57l3.43 6h12.85z" fill="#00AC47"/>
                          <path d="M14.29 3.5L7.71 15l3.43 6 6.57-11.5L14.29 3.5z" fill="#EA4335"/>
                          <path d="M14.29 3.5h8.56l-6.57 11.5h-6.56L14.29 3.5z" fill="#FFBA00"/>
                        </svg>
                        <span style={{ color: gdriveConnected ? 'var(--status-active)' : 'var(--brand-600)', fontWeight: 500 }}>
                          {gdriveConnected ? 'Google Drive Connected (Files upload to your Drive)' : 'Google Drive Auth required for documents'}
                        </span>
                      </div>
                      {!gdriveConnected && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await requestGoogleAccessToken();
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          style={{
                            background: 'var(--brand-600)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Connect
                        </button>
                      )}
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

                  {editAttachedFiles.some(f => !f.type?.startsWith('image/') && !f.type?.startsWith('video/')) && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: gdriveConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                      border: `1px solid ${gdriveConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path d="M7.71 3.5L1.15 15l3.43 6h6.56l-3.43-6L14.28 3.5H7.71z" fill="#0066DA"/>
                          <path d="M22.85 15l-3.43-6H6.57l3.43 6h12.85z" fill="#00AC47"/>
                          <path d="M14.29 3.5L7.71 15l3.43 6 6.57-11.5L14.29 3.5z" fill="#EA4335"/>
                          <path d="M14.29 3.5h8.56l-6.57 11.5h-6.56L14.29 3.5z" fill="#FFBA00"/>
                        </svg>
                        <span style={{ color: gdriveConnected ? 'var(--status-active)' : 'var(--brand-600)', fontWeight: 500 }}>
                          {gdriveConnected ? 'Google Drive Connected (Files upload to your Drive)' : 'Google Drive Auth required for documents'}
                        </span>
                      </div>
                      {!gdriveConnected && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await requestGoogleAccessToken();
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          style={{
                            background: 'var(--brand-600)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Allocate Squads / Teams (Single or Multiple) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="text-xs font-semibold text-secondary block">
                    Assigned Squads / Teams
                  </label>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: editSelectedTeamIds.length > 0 ? 'var(--brand-50)' : 'var(--subtle)',
                    color: editSelectedTeamIds.length > 0 ? 'var(--brand-700)' : 'var(--text-tertiary)',
                    border: '1px solid var(--border)'
                  }}>
                    {editSelectedTeamIds.length} {editSelectedTeamIds.length === 1 ? 'team' : 'teams'} selected
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '190px',
                  overflowY: 'auto',
                  padding: '10px',
                  background: 'var(--bg)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)'
                }}>
                  {(Array.isArray(teams) ? teams : []).map(t => {
                    const isSelected = editSelectedTeamIds.includes(t.id);
                    const assignedProjs = projects.filter(proj =>
                      (proj.teams || []).some(tm => String(tm.id) === String(t.id)) || String(t.project_id) === String(proj.id)
                    );
                    const otherProjects = assignedProjs.filter(proj => String(proj.id) !== String(editingProject?.id));

                    return (
                      <div
                        key={t.id}
                        onClick={() => handleToggleEditTeam(t.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          background: isSelected ? 'var(--brand-50)' : 'var(--surface)',
                          border: isSelected ? '1px solid var(--brand-300)' : '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'var(--subtle)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'var(--surface)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by container onClick
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--brand-600)' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: isSelected ? 'var(--brand-700)' : 'var(--text-primary)' }}>
                              {t.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              {t.memberships?.length || 0} members
                              {otherProjects.length > 0 && ` • Also assigned to ${otherProjects.map(op => `"${op.name}"`).join(', ')}`}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--brand-100)',
                            color: 'var(--brand-800)'
                          }}>
                            Assigned
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {(!teams || teams.length === 0) && (
                    <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                      No teams available.
                    </div>
                  )}
                </div>
                <p className="text-xs text-secondary mt-1">
                  Select single or multiple teams to assign to this project deliverable.
                </p>
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
                  {selectedProject.deadline && (() => {
                    const d = parseIsoDate(selectedProject.deadline);
                    if (!d) return null;
                    const isProjOverdue = d.getTime() < Date.now() && selectedProject.status !== 'completed';
                    return (
                      <span
                        className="text-xs font-medium"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: isProjOverdue ? '#DC2626' : 'var(--text-secondary)',
                          background: isProjOverdue ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                          padding: isProjOverdue ? '2px 8px' : '0',
                          borderRadius: isProjOverdue ? 'var(--radius-sm)' : '0',
                          border: isProjOverdue ? '1px solid rgba(239, 68, 68, 0.25)' : 'none'
                        }}
                      >
                        {isProjOverdue ? <AlertTriangle size={13} color="#DC2626" /> : <Calendar size={13} strokeWidth={1.8} style={{ color: 'var(--text-tertiary)' }} />}
                        <span>Target: {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}, {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isProjOverdue && <strong style={{ color: '#DC2626', fontSize: '11px' }}>Exceeded</strong>}
                      </span>
                    );
                  })()}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {['TL', 'TM'].includes(user?.role) && (
                    <button
                      type="button"
                      onClick={() => {
                        const proj = selectedProject;
                        setSelectedProject(null);
                        setPlannerProject(proj);
                      }}
                      className="btn btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', fontSize: '12px' }}
                    >
                      <Calendar size={13} />
                      <span>Day-Wise Planner</span>
                    </button>
                  )}
                  {['PM', 'CEO', 'CTO'].includes(user?.role) && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditModal(selectedProject, e)}
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', fontSize: '12px' }}
                      >
                        <Pencil size={13} />
                        <span>Edit Project</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteProject(selectedProject.id, selectedProject.name, e)}
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                      >
                        <Trash2 size={13} />
                        <span>Delete Project</span>
                      </button>
                    </>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          {t.deadline && (
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }} title="Deadline & Time">
                              <Clock size={11} /> {formatDeadlineWithTime(t.deadline)}
                            </span>
                          )}
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {getUserFullName(t.assignee)}
                          </span>
                        </div>
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
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '10px'
                  }}>
                    {selectedProject.attachments.map(att => (
                      <AttachmentCard key={att.id || att.file_url} attachment={att} />
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

      {plannerProject && ['TL', 'TM'].includes(user?.role) && (
        <DayWiseTaskPlanner
          project={plannerProject}
          currentUser={user}
          onClose={() => {
            setPlannerProject(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default ProjectsPage;
