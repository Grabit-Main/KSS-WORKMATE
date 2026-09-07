import React, { useEffect, useState, useCallback } from 'react';
import { getProjects } from '../api/projects';
import { useRealtime } from '../realtime/useRealtime';
import { useAuth } from '../context/AuthContext';
import { Plus, Calendar, ArrowRight, FolderKanban } from 'lucide-react';

const ProjectsPage = () => {
  const [projects, setProjects] = useState(() => {
    const cached = localStorage.getItem('cache_projects');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(() => !localStorage.getItem('cache_projects'));
  const { user } = useAuth();

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
        {['CEO', 'CTO', 'PM'].includes(user.role) && (
          <button className="btn btn-primary">
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
                <span className="text-xs text-secondary font-medium" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={13} strokeWidth={1.8} style={{ color: 'var(--text-tertiary)' }} />
                  {new Date(p.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
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
            <p className="text-secondary text-sm">Create a new project to get started with task planning.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;
