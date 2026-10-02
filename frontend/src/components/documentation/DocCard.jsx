import React from 'react';
import { 
  FileText, Code, Database, Layers, CheckSquare, 
  Rocket, HelpCircle, Shield, ArrowRight, User, 
  Clock, Tag, Pin, Terminal, Pencil, Trash2, Download, FileCheck, X
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

  const isPdf = doc.file_url || doc.file_type === 'pdf';

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
            background: isPdf ? '#ECFDF5' : doc.is_pinned ? '#EEF2FF' : 'var(--surface-hover)',
            color: isPdf ? '#047857' : doc.is_pinned ? 'var(--brand-600)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {isPdf ? <FileCheck size={18} /> : doc.is_pinned ? <Pin size={16} /> : <IconComp size={16} />}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {doc.title}
              </h4>
              {isPdf && (
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#047857', background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px' }}>
                  PDF
                </span>
              )}
              {doc.version && (
                <span style={{ fontSize: '11px', fontWeight: 600, background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                  {doc.version}
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {doc.description || doc.file_name || 'Project PDF Document'}
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

  // Grid view (100% exact match to Image 2 design)
  return (
    <div
      onClick={onClick}
      style={{
        background: '#ECFDF5',
        border: '1px solid #A7F3D0',
        borderRadius: '20px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        transition: 'all 0.2s ease',
        position: 'relative',
        minHeight: '200px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(4, 120, 87, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
      }}
    >
      <div>
        {/* Top Badges & TL Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#047857',
              background: '#D1FAE5',
              padding: '4px 10px',
              borderRadius: '8px'
            }}>
              PDF
            </span>

            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#4F46E5',
              background: '#EEF2FF',
              padding: '4px 10px',
              borderRadius: '8px'
            }}>
              {doc.category || 'Requirements'}
            </span>

            <span style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#6B7280',
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              padding: '3px 10px',
              borderRadius: '99px'
            }}>
              {doc.version || 'v1.0'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isTL && (
              <>
                <button
                  onClick={handleEdit}
                  title="Edit"
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#F3F4F6',
                    color: '#6B7280',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={handleDelete}
                  title="Delete"
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#FEE2E2',
                    color: '#EF4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={13} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <h4 style={{
          fontSize: '17px',
          fontWeight: 700,
          color: '#171A2B',
          margin: '0 0 4px 0',
          lineHeight: 1.35
        }}>
          {doc.title || 'KALPANAAA CMS Full Documentation'}
        </h4>

        {/* Subtitle */}
        <p style={{
          fontSize: '13.5px',
          color: '#6B7089',
          margin: 0,
          lineHeight: 1.4
        }}>
          {doc.project_name || 'Company Management System'}
        </p>
      </div>

      {/* Footer Info */}
      <div style={{
        paddingTop: '14px',
        borderTop: '1px solid #A7F3D0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '16px'
      }}>
        <div style={{ fontSize: '12px', color: '#6B7089', lineHeight: 1.4 }}>
          <div>Updated {formattedDate || '18 hours ago'}</div>
          <div>by {doc.updated_by || doc.author || 'Satya Ranjan Das'}</div>
        </div>
        <button style={{
          background: '#047857',
          color: '#FFFFFF',
          border: 'none',
          fontWeight: 600,
          fontSize: '13px',
          padding: '8px 18px',
          borderRadius: '10px',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(4, 120, 87, 0.2)',
          transition: 'all 0.15s ease'
        }}>
          View PDF
        </button>
      </div>
    </div>
  );
};
