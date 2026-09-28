import React from 'react';
import { ArrowRight, FolderKanban, Clock, FileText, Sparkles } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

const PROJECT_COLOR_THEMES = [
  { iconBg: '#6366F1', badgeBg: '#EEF2FF', badgeText: '#4338CA' },
  { iconBg: '#06B6D4', badgeBg: '#ECFEFF', badgeText: '#0891B2' },
  { iconBg: '#10B981', badgeBg: '#ECFDF5', badgeText: '#047857' },
  { iconBg: '#F59E0B', badgeBg: '#FFFBEB', badgeText: '#B45309' },
  { iconBg: '#8B5CF6', badgeBg: '#F5F3FF', badgeText: '#6D28D9' },
  { iconBg: '#EC4899', badgeBg: '#FDF2F8', badgeText: '#BE185D' }
];

export const ProjectDocCard = ({ project, index, onClick }) => {
  const theme = PROJECT_COLOR_THEMES[index % PROJECT_COLOR_THEMES.length];

  const formattedDate = React.useMemo(() => {
    if (!project.updated_at) return 'Recently';
    try {
      return formatDistanceToNow(parseISO(project.updated_at), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  }, [project.updated_at]);

  const categories = project.categories || ['Requirements', 'Design', 'API', 'Database'];

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg, 16px)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
        e.currentTarget.style.borderColor = 'var(--brand-300, #A5B4FC)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div>
        {/* Top Icon & Document Count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: theme.iconBg,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${theme.iconBg}40`
          }}>
            <FolderKanban size={20} />
          </div>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: theme.badgeText,
            background: theme.badgeBg,
            padding: '4px 10px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <FileText size={12} />
            {project.document_count || 0} Documents
          </span>
        </div>

        {/* Project Name & Description */}
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
          {project.name}
        </h3>
        <p style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          margin: '0 0 16px 0',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.5
        }}>
          {project.description}
        </p>

        {/* Available Categories */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {categories.slice(0, 5).map((cat, i) => (
            <span key={i} style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: 'var(--surface-hover)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)'
            }}>
              {cat}
            </span>
          ))}
          {categories.length > 5 && (
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '2px 4px' }}>
              +{categories.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Card Footer: Updated time & View Action */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '14px',
        borderTop: '1px solid var(--border)',
        marginTop: '10px'
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={13} />
          Updated {formattedDate}
        </span>
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--brand-600)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          View Documents <ArrowRight size={14} />
        </span>
      </div>
    </div>
  );
};
