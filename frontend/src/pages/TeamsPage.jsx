import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getTeams, createTeam, updateTeam, addMember, removeMember } from '../api/teams';
import { getProjects } from '../api/projects';
import { getUsers } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import {
  Users, Plus, FolderKanban, UserCheck, Shield, X, Check,
  UserPlus, Calendar, ChevronRight, Briefcase
} from 'lucide-react';

const TeamsPage = () => {
  const [teams, setTeams] = useState(() => {
    const cached = localStorage.getItem('cache_teams');
    return cached ? JSON.parse(cached) : [];
  });
  const [projects, setProjects] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(() => !localStorage.getItem('cache_teams'));
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Create Team Modal State
  const [showModal, setShowModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamProjectId, setTeamProjectId] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [teamMemberIds, setTeamMemberIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Add Member Modal State
  const [memberModalTeam, setMemberModalTeam] = useState(null);
  const [selectedAddUserId, setSelectedAddUserId] = useState('');
  const [isLeadForAdd, setIsLeadForAdd] = useState(false);
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberError, setMemberError] = useState('');

  const loadData = async () => {
    try {
      const [teamsData, projectsData, usersData] = await Promise.all([
        getTeams().catch(() => []),
        getProjects().catch(() => []),
        getUsers().catch(() => [])
      ]);
      setTeams(teamsData);
      setProjects(projectsData);
      setUsersList(usersData);
      localStorage.setItem('cache_teams', JSON.stringify(teamsData));
    } catch (err) {
      console.error('Failed to load teams data:', err);
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

  useRealtime('team.created', handleUpdate);
  useRealtime('team.member_added', handleUpdate);
  useRealtime('team.member_removed', handleUpdate);
  useRealtime('team.lead_assigned', handleUpdate);

  // Check query param (?create=true) and window event from sidebar
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('create') === 'true' && user?.role === 'PM') {
      setShowModal(true);
      // Clean up query param from URL without page reload
      navigate('/teams', { replace: true });
    }

    const handleOpenCreateTeamEvent = () => {
      if (user?.role === 'PM') {
        setShowModal(true);
      }
    };

    window.addEventListener('workmate:open-create-team', handleOpenCreateTeamEvent);
    return () => {
      window.removeEventListener('workmate:open-create-team', handleOpenCreateTeamEvent);
    };
  }, [location.search, user?.role, navigate]);

  const eligibleAssignees = usersList.filter(u => u.role !== 'CEO' && u.role !== 'CTO');

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setFormError('Please provide a team name.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await createTeam({
        name: teamName.trim(),
        project_id: teamProjectId || null,
        lead_user_id: teamLeadId || null,
        member_user_ids: teamMemberIds.length > 0 ? teamMemberIds : null,
      });

      setShowModal(false);
      setTeamName('');
      setTeamProjectId('');
      setTeamLeadId('');
      setTeamMemberIds([]);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create team.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAllocateProject = async (teamId, projectId) => {
    try {
      await updateTeam(teamId, { project_id: projectId || null });
      loadData();
    } catch (err) {
      console.error('Failed to update project allocation:', err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedAddUserId || !memberModalTeam) return;
    setMemberSubmitting(true);
    setMemberError('');
    try {
      await addMember(memberModalTeam.id, {
        user_id: selectedAddUserId,
        is_lead: isLeadForAdd
      });
      setMemberModalTeam(null);
      setSelectedAddUserId('');
      setIsLeadForAdd(false);
      loadData();
    } catch (err) {
      setMemberError(err.response?.data?.detail || 'Failed to add member to team.');
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleRemoveMember = async (teamId, userId) => {
    if (!window.confirm('Remove this member from the squad?')) return;
    try {
      await removeMember(teamId, userId);
      loadData();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const toggleMemberSelection = (userId) => {
    setTeamMemberIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em' }}>Teams</h2>
            <p className="text-sm text-secondary mt-1">Company squads, lead assignments, and project allocations</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {[1,2,3,4].map(i => <div key={i} className="card skeleton" style={{ height: '180px' }}></div>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em' }}>Teams & Squads</h2>
          <p className="text-sm text-secondary mt-1">Active company squads, designated leads, and deliverable ownership</p>
        </div>

        {user.role === 'PM' && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setFormError('');
              setShowModal(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
          >
            <Plus size={16} />
            <span>Create Team</span>
          </button>
        )}
      </div>

      {/* Overview Metric Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <span className="text-xs text-secondary font-semibold uppercase">Total Squads</span>
          <h3 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{teams.length}</h3>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <span className="text-xs text-secondary font-semibold uppercase">Allocated to Projects</span>
          <h3 className="text-2xl font-bold mt-1" style={{ color: 'var(--brand-600)' }}>
            {teams.filter(t => t.project_id).length}
          </h3>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <span className="text-xs text-secondary font-semibold uppercase">Standalone Squads</span>
          <h3 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-secondary)' }}>
            {teams.filter(t => !t.project_id).length}
          </h3>
        </div>
      </div>

      {/* Teams Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {teams.map(team => {
          const allocatedProject = projects.find(p => String(p.id) === String(team.project_id));
          const leadMembership = (team.memberships || []).find(m => m.is_lead);
          const otherMembers = (team.memberships || []).filter(m => !m.is_lead);

          return (
            <div
              key={team.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all var(--transition-smooth)'
              }}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
                      {team.name}
                    </h3>
                    <span className="text-xs text-secondary">
                      {team.memberships?.length || 0} member{(team.memberships?.length || 0) === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Project Allocation Pill */}
                  {allocatedProject ? (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(99, 102, 241, 0.08)',
                      color: 'var(--brand-700)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <FolderKanban size={11} /> {allocatedProject.name}
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--text-tertiary)',
                      background: 'var(--subtle)',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border)'
                    }}>
                      Standalone
                    </span>
                  )}
                </div>

                {/* Team Lead Section */}
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  marginBottom: '14px'
                }}>
                  <span className="text-xs font-semibold text-secondary uppercase block mb-1" style={{ fontSize: '10px' }}>
                    Team Lead
                  </span>
                  {leadMembership ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--brand-gradient)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          {leadMembership.user?.first_name?.[0]}{leadMembership.user?.last_name?.[0]}
                        </div>
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {leadMembership.user?.full_name}
                          </p>
                          <p style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                            {leadMembership.user?.email}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--brand-600)',
                        color: '#fff',
                        fontWeight: 600
                      }}>
                        TL
                      </span>
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                      No Team Lead assigned yet
                    </p>
                  )}
                </div>

                {/* Members List */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-secondary uppercase" style={{ fontSize: '10px' }}>
                      Squad Members ({otherMembers.length})
                    </span>
                    {user.role === 'PM' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMemberError('');
                          setSelectedAddUserId('');
                          setIsLeadForAdd(false);
                          setMemberModalTeam(team);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--brand-600)',
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <UserPlus size={12} /> Add
                      </button>
                    )}
                  </div>

                  {otherMembers.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                      {otherMembers.map(m => (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--subtle)',
                            border: '1px solid var(--border)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                              {m.user?.full_name}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                              ({m.user?.role || 'TM'})
                            </span>
                          </div>
                          {user.role === 'PM' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(team.id, m.user_id)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0 }}
                              title="Remove member"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                      No additional members in this squad.
                    </p>
                  )}
                </div>
              </div>

              {/* PM Project Allocation Selector */}
              {user.role === 'PM' && (
                <div style={{
                  paddingTop: '12px',
                  marginTop: '16px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <label className="text-xs font-semibold text-secondary" style={{ fontSize: '11px' }}>
                    Allocate to:
                  </label>
                  <select
                    value={team.project_id || ''}
                    onChange={(e) => handleAllocateProject(team.id, e.target.value)}
                    className="input"
                    style={{ padding: '4px 8px', fontSize: '11px', flex: 1 }}
                  >
                    <option value="">-- Standalone (No Project) --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}

        {teams.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center' }}>
            <Users size={32} strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-tertiary)' }} />
            <h4 className="font-bold text-base mb-1">No Teams Created Yet</h4>
            <p className="text-secondary text-sm">
              {user.role === 'PM' ? 'Click "+ Create Team" or use the sidebar element to assemble squads.' : 'Teams created by Project Managers will be displayed here.'}
            </p>
          </div>
        )}
      </div>

      {/* Create Team Modal */}
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
            maxWidth: '540px',
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

            <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Team Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Core Engineering, Mobile Squad"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Allocate to Project (Optional)</label>
                <select
                  value={teamProjectId}
                  onChange={(e) => setTeamProjectId(e.target.value)}
                  className="input"
                >
                  <option value="">-- Standalone (No Project) --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Designate Team Lead (Optional)</label>
                <select
                  value={teamLeadId}
                  onChange={(e) => setTeamLeadId(e.target.value)}
                  className="input"
                >
                  <option value="">-- No Lead Assigned Yet --</option>
                  {eligibleAssignees.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role})
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
                  {eligibleAssignees.map(u => {
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
                            {u.full_name}
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
                  {submitting ? 'Creating Team...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {memberModalTeam && (
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
            maxWidth: '440px',
            padding: '24px',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-float)'
          }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Add Member to {memberModalTeam.name}
              </h3>
              <button
                onClick={() => setMemberModalTeam(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {memberError && (
              <div style={{
                padding: '8px 12px',
                background: 'var(--status-blocked-bg)',
                color: 'var(--status-blocked)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                marginBottom: '14px'
              }}>
                {memberError}
              </div>
            )}

            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Select User</label>
                <select
                  value={selectedAddUserId}
                  onChange={(e) => setSelectedAddUserId(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">-- Choose User --</option>
                  {eligibleAssignees
                    .filter(u => !memberModalTeam.memberships?.some(m => String(m.user_id) === String(u.id)))
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="leadCheck"
                  checked={isLeadForAdd}
                  onChange={(e) => setIsLeadForAdd(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="leadCheck" className="text-xs text-secondary font-medium" style={{ cursor: 'pointer' }}>
                  Assign as Team Lead (promotes to TL if TM)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setMemberModalTeam(null)}
                  className="btn btn-secondary"
                  disabled={memberSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={memberSubmitting}
                >
                  {memberSubmitting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
