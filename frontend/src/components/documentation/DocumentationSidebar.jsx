import React from 'react';
import { 
  BookOpen, Pin, FolderKanban, Tag, Layers, FileText, 
  Code, Database, CheckSquare, Rocket, HelpCircle, 
  Shield, GitBranch, MessageSquare, Terminal, ChevronRight
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Requirements': FileText,
  'Design': Layers,
  'Development': Code,
  'API': Terminal,
  'Database': Database,
  'Testing': CheckSquare,
  'Deployment': Rocket,
  'User Guide': HelpCircle,
  'Architecture': Layers,
  'Security': Shield,
  'Integration': GitBranch,
  'Meeting Notes': MessageSquare,
  'Decision Records': FileText,
  'Change Log': FileText
};

export const DocumentationSidebar = ({
  projects = [],
  selectedView,
  selectedProject,
  selectedCategory,
  onSelectOverview,
  onSelectProject,
  onSelectCategory,
  onSelectPinned
}) => {
  const categoriesList = [
    'Requirements',
    'Design',
    'Development',
    'API',
    'Database',
    'Testing',
    'Deployment',
    'User Guide',
    'Architecture',
    'Security',
    'Integration',
    'Meeting Notes',
    'Decision Records',
    'Change Log'
  ];

  return (
    <aside style={{
      width: '260px',
      flexShrink: 0,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Scrollable Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* DOCUMENTATION SECTION */}
        <div>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-tertiary)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: '0 8px 8px 8px'
          }}>
            DOCUMENTATION
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button
              onClick={onSelectOverview}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: selectedView === 'overview' && !selectedProject && !selectedCategory ? 'var(--brand-50, #EEF2FF)' : 'transparent',
                color: selectedView === 'overview' && !selectedProject && !selectedCategory ? 'var(--brand-600)' : 'var(--text-primary)',
                fontWeight: selectedView === 'overview' && !selectedProject && !selectedCategory ? 600 : 400,
                fontSize: '13.5px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={16} />
                Overview
              </div>
            </button>

            <button
              onClick={onSelectPinned}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: selectedView === 'pinned' ? 'var(--brand-50, #EEF2FF)' : 'transparent',
                color: selectedView === 'pinned' ? 'var(--brand-600)' : 'var(--text-primary)',
                fontWeight: selectedView === 'pinned' ? 600 : 400,
                fontSize: '13.5px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Pin size={16} />
                Pinned Guidelines
              </div>
            </button>
          </div>
        </div>

        {/* PROJECTS SECTION */}
        <div>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-tertiary)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: '0 8px 8px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>PROJECTS</span>
            <span style={{ fontSize: '10px', background: 'var(--surface-hover)', padding: '2px 6px', borderRadius: '10px' }}>
              {projects.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {projects.map((proj) => {
              const isSelected = selectedProject === proj.id || selectedProject === proj.name;
              return (
                <button
                  key={proj.id || proj.name}
                  onClick={() => onSelectProject(proj.id, proj.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: isSelected ? 'var(--brand-50, #EEF2FF)' : 'transparent',
                    color: isSelected ? 'var(--brand-600)' : 'var(--text-primary)',
                    fontWeight: isSelected ? 600 : 400,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    <FolderKanban size={15} style={{ flexShrink: 0, color: isSelected ? 'var(--brand-600)' : 'var(--text-tertiary)' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj.name}</span>
                  </div>
                  {proj.document_count > 0 && (
                    <span style={{
                      fontSize: '11px',
                      color: isSelected ? 'var(--brand-600)' : 'var(--text-tertiary)',
                      background: isSelected ? 'rgba(79, 70, 229, 0.12)' : 'var(--surface-hover)',
                      padding: '1px 6px',
                      borderRadius: '8px'
                    }}>
                      {proj.document_count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CATEGORIES SECTION */}
        <div>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-tertiary)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: '0 8px 8px 8px'
          }}>
            CATEGORIES
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {categoriesList.map((cat) => {
              const IconComponent = CATEGORY_ICONS[cat] || Tag;
              const isSelected = selectedCategory?.toLowerCase() === cat.toLowerCase();

              return (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(cat)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: isSelected ? 'var(--brand-50, #EEF2FF)' : 'transparent',
                    color: isSelected ? 'var(--brand-600)' : 'var(--text-primary)',
                    fontWeight: isSelected ? 600 : 400,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconComponent size={15} style={{ flexShrink: 0, color: isSelected ? 'var(--brand-600)' : 'var(--text-tertiary)' }} />
                    <span>{cat}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
