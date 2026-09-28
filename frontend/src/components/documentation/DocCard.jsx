import React from 'react';
import { 
  FileText, Code, Database, Layers, CheckSquare, 
  Rocket, HelpCircle, Shield, ArrowRight, User, 
  Clock, Tag, Pin, Terminal, Pencil, Trash2
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

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
  'Security': Shield
};

export const DocCard = ({ doc, viewMode = 'grid', onClick, isTL = false, onEdit, onDelete }) => {
  const IconComp = CATEGORY_ICONS[doc.category] || FileText;

  const formattedDate = React.useMemo(() => {
    if (!doc.updated_at) return 'Recently';
    try {
      return formatDistanceToNow(parseISO(doc.updated_at), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  }, [doc.updated_at]);

  const tagList = React.useMemo(() => {
    if (!doc.tags) return [];
    return doc.tags.split(',').map(t => t.trim()).filter(Boolean);
  }, [doc.tags]);

  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(doc);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(doc);
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--brand-300, #A5B4FC)';
          e.currentTarget.style.background = 'var(--surface-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.background = 'var(--surface)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: doc.is_pinned ? '#EEF2FF' : 'var(--surface-hover)',
            color: doc.is_pinned ? 'var(--brand-600)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {doc.is_pinned ? <Pin size={16} /> : <IconComp size={16} />}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {doc.title}
              </h4>
              {doc.version && (
                <span style={{ fontSize: '11px', fontWeight: 600, background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                  {doc.version}
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {doc.description}
            </p>
          </div>
        </div>

        {/* Project & Meta right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '16px', flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-600)' }}>
              {doc.project_name || 'General'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {doc.category} · Updated {formattedDate}
            </div>
          </div>

          {/* Role TL CRUD buttons */}
          {isTL && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={handleEdit}
                title="Edit Documentation"
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--surface-hover)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleDelete}
                title="Delete Documentation"
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#FEF2F2',
                  color: '#EF4444',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}

          <button style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--brand-600)',
            cursor: 'pointer',
            padding: '4px'
          }}>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg, 16px)',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.2s ease',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
        e.currentTarget.style.borderColor = 'var(--brand-300, #A5B4FC)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div>
        {/* Top bar with Icon, Category, Version & TL controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: doc.is_pinned ? '#EEF2FF' : 'var(--surface-hover)',
              color: doc.is_pinned ? 'var(--brand-600)' : 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {doc.is_pinned ? <Pin size={16} /> : <IconComp size={16} />}
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand-600)', background: 'var(--brand-50, #EEF2FF)', padding: '2px 8px', borderRadius: '12px' }}>
              {doc.category}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {doc.version && (
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--surface-hover)', padding: '2px 6px', borderRadius: '4px' }}>
                {doc.version}
              </span>
            )}
            {/* TL Actions */}
            {isTL && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  onClick={handleEdit}
                  title="Edit Document"
                  style={{
                    padding: '4px 6px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'var(--surface-hover)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={handleDelete}
                  title="Delete Document"
                  style={{
                    padding: '4px 6px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#FEF2F2',
                    color: '#EF4444',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Document Title & Description */}
        <h4 style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0', lineHeight: 1.4 }}>
          {doc.title}
        </h4>
        <p style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          margin: '0 0 14px 0',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.5
        }}>
          {doc.description}
        </p>

        {/* Tags */}
        {tagList.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
            {tagList.map((tag, i) => (
              <span key={i} style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', background: 'var(--surface-hover)', padding: '1px 6px', borderRadius: '4px' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{
        paddingTop: '12px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '10px'
      }}>
        <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
          <div>{doc.project_name || 'General'}</div>
          <div>Updated {formattedDate} {doc.updated_by ? `by ${doc.updated_by}` : ''}</div>
        </div>
        <button style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--brand-600)',
          fontWeight: 600,
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          cursor: 'pointer'
        }}>
          Open <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
