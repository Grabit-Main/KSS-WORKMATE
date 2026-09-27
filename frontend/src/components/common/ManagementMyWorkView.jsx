import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, CheckCircle2, Clock, AlertTriangle, HelpCircle, Flame,
  Search, Filter, Calendar, FolderKanban, Eye, Edit3, Plus, ArrowUpRight,
  TrendingUp, RefreshCw, X, ShieldAlert
} from 'lucide-react';
import { getTasks, deleteTask, updateTask } from '../../api/tasks';
import { getUsers } from '../../api/users';
import { getProjects } from '../../api/projects';
import { getDailyPulses, getBlockers, getHelpRequests, getFocusSessions } from '../../api/mywork';
import DeveloperWorkDrawer from './DeveloperWorkDrawer';
import AddTaskModal from '../quickadd/AddTaskModal';

export default function ManagementMyWorkView({ user }) {
  const role = user?.role || 'TL';
  const isTL = role === 'TL';
  const isPM = role === 'PM';
  const isCTO = role === 'CTO';
  const isCEO = role === 'CEO';

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dailyPulses, setDailyPulses] = useState([]);
  const [blockers, setBlockers] = useState([]);
  const [helpRequests, setHelpRequests] = useState([]);
  const [focusSessions, setFocusSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevId, setSelectedDevId] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  // Drawer & Modal State
  const [selectedDrawerDev, setSelectedDrawerDev] = useState(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, usersRes, projectsRes, pulsesRes, blockersRes, helpRes, focusRes] = await Promise.all([
        getTasks().catch(() => []),
        getUsers().catch(() => []),
        getProjects().catch(() => []),
        getDailyPulses().catch(() => []),
        getBlockers().catch(() => []),
        getHelpRequests().catch(() => []),
        getFocusSessions().catch(() => [])
      ]);

      setTasks(Array.isArray(tasksRes) ? tasksRes : []);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setProjects(Array.isArray(projectsRes) ? projectsRes : []);
      setDailyPulses(Array.isArray(pulsesRes) ? pulsesRes : []);
      setBlockers(Array.isArray(blockersRes) ? blockersRes : []);
      setHelpRequests(Array.isArray(helpRes) ? helpRes : []);
      setFocusSessions(Array.isArray(focusRes) ? focusRes : []);
    } catch (err) {
      console.error('Error loading management developer work data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Eligible developers in scope (exclude executives & management from developer tables)
  const developersInScope = users.filter((u) => u.role !== 'CEO' && u.role !== 'CTO' && u.role !== 'PM');

  // Filter Developer Tasks (strictly excludes management's own tasks if any)
  const filteredTasks = tasks.filter((t) => {
    // Must be assigned to a developer in scope (not management self-assigned tasks)
    const assigneeId = String(t.assigned_to || t.assignee?.id || '');
    const isDevTask = developersInScope.some((d) => String(d.id) === assigneeId);

    if (!isDevTask && String(t.assigned_to) === String(user?.id)) {
      return false; // Exclude TL/PM/CTO/CEO's own personal tasks
    }

    if (selectedDevId !== 'all' && assigneeId !== String(selectedDevId)) {
      return false;
    }
    if (selectedProjectId !== 'all' && String(t.project_id || t.project?.id || '') !== String(selectedProjectId)) {
      return false;
    }
    if (selectedStatus !== 'all' && t.status !== selectedStatus) {
      return false;
    }
    if (selectedPriority !== 'all' && t.priority !== selectedPriority) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const titleMatch = (t.title || '').toLowerCase().includes(q);
      const descMatch = (t.description || '').toLowerCase().includes(q);
      const devNameMatch = (t.assignee?.full_name || `${t.assignee?.first_name || ''} ${t.assignee?.last_name || ''}`).toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !devNameMatch) return false;
    }
    return true;
  });

  // Summary Counts
  const todayStr = new Date().toISOString().split('T')[0];
  const totalDevs = developersInScope.length;
  const activeTasksCount = tasks.filter((t) => ['in_progress', 'not_started'].includes(t.status)).length;
  const completedTodayCount = tasks.filter((t) => t.status === 'completed' && t.updated_at && t.updated_at.startsWith(todayStr)).length;
  const openBlockersCount = blockers.filter((b) => b.status !== 'resolved').length;
  const helpNeededCount = helpRequests.filter((h) => h.status === 'open').length;
  const activeFocusCount = focusSessions.length;

  const getDevName = (t) => {
    if (t.assignee) {
      return `${t.assignee.first_name || ''} ${t.assignee.last_name || ''}`.trim() || t.assignee.email || 'Developer';
    }
    const found = users.find((u) => String(u.id) === String(t.assigned_to));
    if (found) return `${found.first_name || ''} ${found.last_name || ''}`.trim() || found.email || 'Developer';
    return 'Developer';
  };

  const getDevObj = (t) => {
    if (t.assignee) return t.assignee;
    const found = users.find((u) =>
      String(u.id) === String(t.assigned_to) ||
      (u.email && u.email === t.assigned_to) ||
      (`${u.first_name || ''} ${u.last_name || ''}`.trim() && `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase() === String(t.assigned_to).toLowerCase())
    );
    if (found) return found;
    return { id: t.assigned_to, first_name: getDevName(t) };
  };

  const getProjectName = (t) => {
    if (t.project) return t.project.name;
    const found = projects.find((p) => String(p.id) === String(t.project_id));
    return found ? found.name : 'Standalone Task';
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '50px' }}>
      {/* HEADER BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
        borderRadius: 'var(--radius-xl, 16px)',
        padding: '24px 28px',
        marginBottom: '24px',
        border: '1px solid var(--border, #E2E8F0)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              background: 'var(--brand-600, #4F46E5)',
              color: '#FFFFFF',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              {role} Developer Work Portal
            </span>
            <span style={{ color: 'var(--text-tertiary, #94A3B8)', fontSize: '12px', fontWeight: 500 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary, #0F172A)', margin: 0, letterSpacing: '-0.02em' }}>
            {isTL ? 'Team Developer Work Control Center' :
             isPM ? 'Project Developer Work Overview' :
             isCTO ? 'Engineering Developer Work Dashboard' :
             'Executive Developer Work Overview'}
          </h1>
          <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '13px', margin: '4px 0 0 0' }}>
            {isTL ? 'Monitor and manage operational developer work across your squad with full CRUD controls.' :
             isPM ? 'Read-only view of developer tasks, progress, blockers, and milestone delivery.' :
             isCTO ? 'Engineering-oriented inspection of active technical deliverables, code velocity, and blockers.' :
             'Executive high-level organization work overview and team developer output.'}
          </p>
        </div>

        {/* TL Add Task Button */}
        {isTL && (
          <button
            onClick={() => setShowAddTaskModal(true)}
            className="btn btn-primary"
            style={{
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              borderRadius: '10px'
            }}
          >
            <Plus size={16} /> Assign Developer Task
          </button>
        )}
      </div>

      {/* SUMMARY METRICS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Total Developers */}
        <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Active Developers</span>
            <Users size={18} color="#4F46E5" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>{totalDevs}</div>
        </div>

        {/* Active Tasks */}
        <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Tasks In Progress</span>
            <Clock size={18} color="#2563EB" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>{activeTasksCount}</div>
        </div>

        {/* Completed Today */}
        <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Completed Today</span>
            <CheckCircle2 size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>{completedTodayCount}</div>
        </div>

        {/* Open Blockers */}
        <div className="card" style={{ padding: '16px 20px', background: '#FEF2F2', borderRadius: '14px', border: '1px solid #FEE2E2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600, textTransform: 'uppercase' }}>Open Blockers</span>
            <AlertTriangle size={18} color="#DC2626" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#991B1B', marginTop: '6px' }}>{openBlockersCount}</div>
        </div>

        {/* Help Requests */}
        <div className="card" style={{ padding: '16px 20px', background: '#FEF3C7', borderRadius: '14px', border: '1px solid #FDE68A' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#D97706', fontWeight: 600, textTransform: 'uppercase' }}>Need Help</span>
            <HelpCircle size={18} color="#D97706" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#92400E', marginTop: '6px' }}>{helpNeededCount}</div>
        </div>

        {/* Focus Sessions */}
        <div className="card" style={{ padding: '16px 20px', background: '#ECFDF5', borderRadius: '14px', border: '1px solid #A7F3D0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>Focus Sessions</span>
            <Flame size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#065F46', marginTop: '6px' }}>{activeFocusCount}</div>
        </div>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search developer, task title, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Filter Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Developer Filter */}
          <select
            value={selectedDevId}
            onChange={(e) => setSelectedDevId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 600, background: '#F8FAFC' }}
          >
            <option value="all">👤 All Developers</option>
            {developersInScope.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name || `${d.first_name || ''} ${d.last_name || ''}`.trim() || d.email} ({d.role})
              </option>
            ))}
          </select>

          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 600, background: '#F8FAFC' }}
          >
            <option value="all">📁 All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 600, background: '#F8FAFC' }}
          >
            <option value="all">⚡ All Statuses</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
            <option value="not_started">Not Started</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 600, background: '#F8FAFC' }}
          >
            <option value="all">🎯 All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          {(searchTerm || selectedDevId !== 'all' || selectedProjectId !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDevId('all');
                setSelectedProjectId('all');
                setSelectedStatus('all');
                setSelectedPriority('all');
              }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '12px', fontWeight: 600 }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* DEVELOPER WORK TABLE */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', background: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#F8FAFC'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderKanban size={18} color="#4F46E5" /> Developer Work Ledger ({filteredTasks.length})
          </h3>

          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
            {isTL ? 'TL Access: Full CRUD' : 'Access Mode: READ ONLY'}
          </span>
        </div>

        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
            <thead>
              <tr style={{ background: '#F1F5F9', fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>Developer</th>
                <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>Project</th>
                <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>Task Title</th>
                <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>Priority</th>
                <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Progress</th>
                <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>Due Date</th>
                <th style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t) => {
                const devObj = getDevObj(t);
                const devName = getDevName(t);
                const projName = getProjectName(t);
                const progVal = t.progress !== undefined && t.progress !== null ? t.progress : (t.status === 'completed' ? 100 : (t.status === 'in_progress' ? 50 : 0));

                return (
                  <tr
                    key={t.id}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setSelectedDrawerDev(devObj)}
                  >
                    {/* Developer Name */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700
                        }}>
                          {devName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{devName}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{devObj?.role || 'Developer'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Project Name */}
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '3px 9px',
                        borderRadius: '6px',
                        background: '#EEF2FF',
                        color: '#4338CA'
                      }}>
                        {projName}
                      </span>
                    </td>

                    {/* Task Title */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{t.title}</div>
                      {t.description && (
                        <div style={{ fontSize: '11px', color: '#64748B', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.description}
                        </div>
                      )}
                    </td>

                    {/* Priority */}
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        textTransform: 'uppercase',
                        background: t.priority === 'urgent' ? '#FEF2F2' : (t.priority === 'high' ? '#FFEDD5' : '#F1F5F9'),
                        color: t.priority === 'urgent' ? '#DC2626' : (t.priority === 'high' ? '#C2410C' : '#475569')
                      }}>
                        {t.priority || 'normal'}
                      </span>
                    </td>

                    {/* Progress */}
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <div style={{ width: '60px', height: '6px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${progVal}%`, height: '100%', background: progVal === 100 ? '#10B981' : '#3B82F6' }} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>{progVal}%</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: t.status === 'completed' ? '#ECFDF5' : (t.status === 'blocked' ? '#FEF2F2' : '#EFF6FF'),
                        color: t.status === 'completed' ? '#059669' : (t.status === 'blocked' ? '#DC2626' : '#2563EB')
                      }}>
                        {t.status ? t.status.replace('_', ' ').toUpperCase() : 'NOT STARTED'}
                      </span>
                    </td>

                    {/* Due Date */}
                    <td style={{ padding: '14px 20px', fontSize: '12px', color: '#64748B' }}>
                      {t.deadline ? new Date(t.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date'}
                    </td>

                    {/* Action Button */}
                    <td style={{ padding: '14px 20px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedDrawerDev(devObj)}
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px', fontWeight: 600 }}
                      >
                        {isTL ? 'Manage Work' : 'Inspect Work'}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    No developer work items match the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEVELOPER WORK DRAWER */}
      <DeveloperWorkDrawer
        isOpen={!!selectedDrawerDev}
        onClose={() => setSelectedDrawerDev(null)}
        developer={selectedDrawerDev}
        role={role}
        onRefresh={loadAllData}
      />

      {/* TL ADD DEVELOPER TASK MODAL */}
      {isTL && (
        <AddTaskModal
          isOpen={showAddTaskModal}
          onClose={() => setShowAddTaskModal(false)}
          user={user}
          projects={projects}
          users={developersInScope}
          onSuccess={() => {
            setShowAddTaskModal(false);
            loadAllData();
          }}
        />
      )}
    </div>
  );
}
