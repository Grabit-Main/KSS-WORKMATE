import React, { useEffect, useState, useCallback } from 'react';
import { getProjects } from '../api/projects';
import { useRealtime } from '../realtime/useRealtime';
import { useAuth } from '../context/AuthContext';
import { Plus } from 'lucide-react';

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
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

  if (loading) return <div>Loading projects...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Projects</h2>
        {['CEO', 'CTO', 'PM'].includes(user.role) && (
          <button className="btn btn-primary">
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {projects.map(p => (
          <div key={p.id} className="card">
            <div className="flex justify-between items-center mb-2">
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 8px', borderRadius: '12px', background: 'var(--brand-100)', color: 'var(--brand-700)' }}>
                {p.status.toUpperCase()}
              </span>
              <span className="text-xs text-secondary">{new Date(p.deadline).toLocaleDateString()}</span>
            </div>
            <h3 className="font-semibold mb-2">{p.name}</h3>
            <p className="text-sm text-secondary" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {p.aim}
            </p>
          </div>
        ))}
        {projects.length === 0 && <p className="text-secondary">No projects found.</p>}
      </div>
    </div>
  );
};

export default ProjectsPage;
