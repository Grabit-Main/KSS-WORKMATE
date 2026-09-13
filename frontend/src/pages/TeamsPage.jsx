import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getTeams, createTeam, updateTeam, addMember, removeMember, deleteTeam, setTeamLead } from '../api/teams';
import { getProjects } from '../api/projects';
import { getUsers } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../realtime/useRealtime';
import {
  Users, Plus, FolderKanban, UserCheck, Shield, X, Check,
  UserPlus, Calendar, ChevronRight, Briefcase, Trash2
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
  useRealtime('team.deleted', handleUpdate);
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

  // Helper to reliably format user's full name
  const getUserFullName = (u) => {
    if (!u) return 'Unknown User';
    return (
      u.full_name ||
      `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
      u.email ||
      'User'
    );
  };

  // Helper to retrieve all teams a user is currently enrolled in
  const getUserTeamsList = (userId) => {
    const userTeamNames = teams
      .filter(t => (t.memberships || []).some(m => String(m.user_id || m.user?.id) === String(userId)))
      .map(t => t.name);
    return userTeamNames.length > 0 ? userTeamNames.join(', ') : 'None';
  };

  // Team Leads and Team Members cannot be CEO, CTO, or PM
  const eligibleTeamCandidates = usersList.filter(
    u => u.role !== 'CEO' && u.role !== 'CTO' && u.role !== 'PM'
  );

  const handleLeadChange = (newLeadId) => {
    setTeamLeadId(newLeadId);
    // When a team lead is designated, ensure they are not selected as member
    if (newLeadId) {
      setTeamMemberIds(prev => prev.filter(id => String(id) !== String(newLeadId)));
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setFormError('Please provide a team name.');
      return;
    }
    if (!teamLeadId) {
      setFormError('Please designate a Team Lead.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await createTeam({
        name: teamName.trim(),
        lead_user_id: teamLeadId,
        member_user_ids: teamMemberIds.length > 0 ? teamMemberIds : null,
      });

      setShowModal(false);
      setTeamName('');
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

  const handleDeleteTeam = async (teamId, name) => {
    if (!window.confirm(`Are you sure you want to delete team "${name}"? All assignments will be removed.`)) return;
    try {
      await deleteTeam(teamId);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete team.');
    }
  };

  const handleAssignLead = async (teamId, newLeadId) => {
    if (!newLeadId) return;
    try {
      await setTeamLead(teamId, newLeadId);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update team lead.');
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
      {/* Page Title Section */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#1E293B', fontFamily: 'serif, Georgia, Inter, sans-serif', marginBottom: '4px' }}>
            Teams & Squads
          </h2>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Active company squads, designated leads, and deliverable ownership.
          </p>
        </div>

        {user.role === 'PM' && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setFormError('');
              setShowModal(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#5551FF', borderRadius: '8px', padding: '10px 18px', fontWeight: 600 }}
          >
            <Plus size={16} />
            <span>Create Team</span>
          </button>
        )}
      </div>

      {/* Overview Metric Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Total Squads */}
        <div style={{
          background: '#EEF2FF',
          border: '1px solid rgba(85, 81, 255, 0.2)',
          borderRadius: '16px',
          padding: '18px 22px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Squads
          </span>
          <h3 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A', marginTop: '4px', marginBottom: 0 }}>
            {teams.length}
          </h3>
        </div>

        {/* Allocated to Projects */}
        <div style={{
          background: '#ECFDF5',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '16px',
          padding: '18px 22px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Allocated to Projects
          </span>
          <h3 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A', marginTop: '4px', marginBottom: 0 }}>
            {teams.filter(t => t.project_id).length}
          </h3>
        </div>

        {/* Standalone Squads */}
        <div style={{
          background: '#FFF7ED',
          border: '1px solid rgba(217, 119, 6, 0.2)',
          borderRadius: '16px',
          padding: '18px 22px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Standalone Squads
          </span>
          <h3 style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#0F172A', marginTop: '4px', marginBottom: 0 }}>
            {teams.filter(t => !t.project_id).length}
          </h3>
        </div>
      </div>

      {/* Teams Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
        {teams.map((team, index) => {
          const allocatedProject = projects.find(p => String(p.id) === String(team.project_id));
          const leadMembership = (team.memberships || []).find(m => m.is_lead);
          const otherMembers = (team.memberships || []).filter(m => !m.is_lead);
          const themeBgs = ['#5551FF', '#E17842', '#1EA566', '#0284C7', '#8B5CF6'];
          const headerBg = themeBgs[index % themeBgs.length];

          return (
            <div
              key={team.id}
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '380px',
                height: '100%',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
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
              <div>
                {/* Team Top Header Banner */}
                <div style={{
                  background: headerBg,
                  color: '#FFFFFF',
                  padding: '18px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}>
                      {team.name}
                    </h3>
                    <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>
                      {team.memberships?.length || 0} member{(team.memberships?.length || 0) === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Project Allocation Pill */}
                    {allocatedProject ? (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: '#FFFFFF',
                        color: headerBg,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}>
                        <FolderKanban size={11} /> {allocatedProject.name}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#FFFFFF',
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}>
                        Standalone
                      </span>
                    )}

                    {/* Delete Team Button */}
                    {['PM', 'CEO', 'CTO'].includes(user?.role) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.18)',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#FFFFFF',
                          padding: '5px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#EF4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'; }}
                        title="Delete Team"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Team Lead Section */}
                  <div style={{
                    padding: '10px 12px',
                  borderRadius: '10px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  marginBottom: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="text-xs font-semibold text-secondary uppercase" style={{ fontSize: '10px' }}>
                      Team Lead
                    </span>
                    {user.role === 'PM' && (
                      <select
                        value={leadMembership ? String(leadMembership.user_id) : ''}
                        onChange={(e) => handleAssignLead(team.id, e.target.value)}
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-xs)',
                          background: 'var(--surface)',
                          color: 'var(--brand-700)',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <option value="" disabled>-- {leadMembership ? 'Change Lead' : 'Assign Lead'} --</option>
                        {eligibleTeamCandidates.map(u => (
                          <option key={u.id} value={u.id}>
                            {getUserFullName(u)} ({u.role})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {leadMembership ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {leadMembership.user?.avatar_url ? (
                          <img
                            src={leadMembership.user.avatar_url}
                            alt=""
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: 'var(--radius-full)',
                              objectFit: 'cover',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                          />
                        ) : (
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
                        )}
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {getUserFullName(leadMembership.user)}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', height: '120px', overflowY: 'auto' }}>
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
                              {getUserFullName(m.user)}
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
                    <div style={{
                      height: '120px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--subtle)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px dashed var(--border)',
                      padding: '12px',
                      textAlign: 'center'
                    }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        No additional members in this squad.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

              {/* PM Project Allocation Selector */}
              {user.role === 'PM' && (
                <div style={{
                  paddingTop: '12px',
                  marginTop: 'auto',
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
              {user.role === 'PM' ? 'Click "+ Create Team" to assemble squads.' : 'Teams created by Project Managers will be displayed here.'}
            </p>
          </div>
        )}
      </div>

      {/* Create Team Modal */}
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
                <p className="text-xs text-secondary mt-0.5">Assemble a squad and designate squad members</p>
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
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Designate Team Lead *</label>
                <select
                  value={teamLeadId}
                  onChange={(e) => handleLeadChange(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">-- Select Team Lead * --</option>
                  {eligibleTeamCandidates.map(u => (
                    <option key={u.id} value={u.id}>
                      {getUserFullName(u)} ({u.role}) — Team: {getUserTeamsList(u.id)}
                    </option>
                  ))}
                </select>

                {teamLeadId && (() => {
                  const selectedLeadUser = usersList.find(u => String(u.id) === String(teamLeadId));
                  return selectedLeadUser ? (
                    <div style={{
                      marginTop: '6px',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--brand-50)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      fontSize: '11px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ color: 'var(--brand-700)', fontWeight: 600 }}>
                        Lead: {getUserFullName(selectedLeadUser)} ({selectedLeadUser.role})
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Team: <strong style={{ color: 'var(--brand-600)' }}>{getUserTeamsList(selectedLeadUser.id)}</strong>
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">
                  Select Team Members ({teamMemberIds.length} selected)
                </label>
                <div style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px',
                  background: 'var(--surface-hover)'
                }}>
                  {eligibleTeamCandidates
                    .filter(u => String(u.id) !== String(teamLeadId))
                    .map(u => {
                      const isSelected = teamMemberIds.includes(u.id);
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
                            marginBottom: '4px',
                            border: isSelected ? '1px solid rgba(99, 102, 241, 0.15)' : '1px solid transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              style={{ cursor: 'pointer', marginTop: '3px' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 500, color: 'var(--text-primary)' }}>
                                  {getUserFullName(u)}
                                </span>
                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>({u.role})</span>
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                                Team: <span style={{ color: getUserTeamsList(u.id) === 'None' ? 'var(--text-tertiary)' : 'var(--brand-600)', fontWeight: 500 }}>{getUserTeamsList(u.id)}</span>
                              </span>
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{u.role}</span>
                        </div>
                      );
                    })}
                  {eligibleTeamCandidates.filter(u => String(u.id) !== String(teamLeadId)).length === 0 && (
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '8px', textAlign: 'center' }}>
                      No available candidates.
                    </p>
                  )}
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
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setMemberModalTeam(null); }}
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
                  {eligibleTeamCandidates
                    .filter(u => !memberModalTeam.memberships?.some(m => String(m.user_id) === String(u.id)))
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {getUserFullName(u)} ({u.role}) — Team: {getUserTeamsList(u.id)}
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
