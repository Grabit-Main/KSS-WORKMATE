import React, { useEffect, useState, useCallback } from 'react';
import { getProjects, createProject } from '../api/projects';
import { useRealtime } from '../realtime/useRealtime';
import { useAuth } from '../context/AuthContext';
import { Plus, Calendar, ArrowRight, FolderKanban, X, Check } from 'lucide-react';

const ProjectsPage = () => {
  const [projects, setProjects] = useState(() => {
    const cached = localStorage.getItem('cache_projects');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(() => !localStorage.getItem('cache_projects'));
  const { user } = useAuth();

  // Create Project Modal state (For PM only)
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [aim, setAim] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
      localStorage.setItem('cache_projects', JSON.stringify(data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleUpdate = useCallback(() => {
    loadProjects();
  }, []);

  useRealtime('project.created', handleUpdate);
  useRealtime('project.updated', handleUpdate);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!name.trim() || !aim.trim()) {
      setFormError('Please provide both a project name and project aim/objective.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await createProject({
        name: name.trim(),
        aim: aim.trim(),
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      setShowModal(false);
      setName('');
      setAim('');
      setDeadline('');
      loadProjects();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
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
          {[1,2,3,4,5,6].map(i => <div key={i} className="card skeleton" style={{ height: '160px' }}></div>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em' }}>Projects</h2>
          <p className="text-sm text-secondary mt-1">Active company deliverables and project timelines</p>
        </div>

        {/* CTO and CEO do NOT assign the projects; only PM assigns and creates projects */}
        {user.role === 'PM' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {projects.map(p => (
          <div
            key={p.id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all var(--transition-smooth)'
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
                lineHeight: '1.5'
              }}>
                {p.aim}
              </p>
            </div>
            <div style={{ paddingTop: '16px', marginTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-xs text-secondary font-medium">Click to view overview</span>
              <ArrowRight size={14} strokeWidth={2} style={{ color: 'var(--brand-600)' }} />
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center' }}>
            <FolderKanban size={32} strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-tertiary)' }} />
            <h4 className="font-bold text-base mb-1">No Projects Yet</h4>
            <p className="text-secondary text-sm">
              {user.role === 'PM' ? 'Click "+ New Project" to create and assign deliverables.' : 'Projects assigned by Project Managers will be listed here.'}
            </p>
          </div>
        )}
      </div>

      {/* New Project Modal (Exclusive to PM) */}
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
            maxWidth: '520px',
            padding: '28px',
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-float)'
          }}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold text-lg" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  Create New Project
                </h3>
                <p className="text-xs text-secondary mt-0.5">Project Managers assign deliverables and timeline aims</p>
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

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Aim / Objective *</label>
                <textarea
                  rows={4}
                  placeholder="Describe the main goal, scope, and key deliverables..."
                  value={aim}
                  onChange={(e) => setAim(e.target.value)}
                  className="input"
                  style={{ resize: 'vertical' }}
                  required
                />
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
                  {submitting ? 'Creating Project...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
