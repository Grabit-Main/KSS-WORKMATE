import React from 'react';
import { 
  FileText, Code, Database, Layers, CheckSquare, 
  Rocket, HelpCircle, Shield, ArrowRight, User, 
  Clock, Tag, Pin, Terminal, Pencil, Trash2, Download, FileCheck,
  MoreHorizontal, Calendar, HardDrive, Image as ImageIcon, MessageSquare
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

const CATEGORY_STYLES = {
  'Overview': {
    bg: '#F4F7FF',
    border: '#E0E7FF',
    iconBg: '#5551FF',
    pillBg: '#EEF2FF',
    pillText: '#5551FF',
    icon: FileText
  },
  'Technical': {
    bg: '#F0FDF4',
    border: '#DCFCE7',
    iconBg: '#10B981',
    pillBg: '#D1FAE5',
    pillText: '#047857',
    icon: Code
  },
  'Development': {
    bg: '#F0FDF4',
    border: '#DCFCE7',
    iconBg: '#10B981',
    pillBg: '#D1FAE5',
    pillText: '#047857',
    icon: Code
  },
  'Design': {
    bg: '#FFF5F5',
    border: '#FFE4E6',
    iconBg: '#F43F5E',
    pillBg: '#FFE4E6',
    pillText: '#E11D48',
    icon: ImageIcon
  },
  'Meeting Notes': {
    bg: '#F5F3FF',
    border: '#EDE9FE',
    iconBg: '#3B82F6',
    pillBg: '#E0F2FE',
    pillText: '#0284C7',
    icon: MessageSquare
  },
  'Requirements': {
    bg: '#F4F7FF',
    border: '#E0E7FF',
    iconBg: '#5551FF',
    pillBg: '#EEF2FF',
    pillText: '#5551FF',
    icon: FileText
  },
  'API': {
    bg: '#FAF5FF',
    border: '#F3E8FF',
    iconBg: '#8B5CF6',
    pillBg: '#F3E8FF',
    pillText: '#7C3AED',
    icon: Terminal
  }
};

const DEFAULT_STYLE = {
  bg: '#F8FAFC',
  border: '#E2E8F0',
  iconBg: '#5551FF',
  pillBg: '#EEF2FF',
  pillText: '#5551FF',
  icon: FileText
};

export const DocCard = ({ doc, viewMode = 'grid', onClick, isTL = false, onEdit, onDelete }) => {
  const catStyle = CATEGORY_STYLES[doc.category] || DEFAULT_STYLE;
  const IconComp = catStyle.icon;

  const formattedDate = React.useMemo(() => {
    if (!doc.updated_at && !doc.created_at) return 'Sep 28, 2026';
    try {
      const d = parseISO(doc.updated_at || doc.created_at);
      return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    } catch {
      return 'Sep 28, 2026';
    }
  }, [doc.updated_at, doc.created_at]);

  const fileSizeStr = doc.file_size || (doc.file_url ? '2.4 MB' : '1.5 MB');

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
          background: catStyle.bg,
          border: `1px solid ${catStyle.border}`,
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '12px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: catStyle.iconBg,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <IconComp size={18} />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1E1B4B', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {doc.title}
              </h4>
              <span style={{ fontSize: '11px', fontWeight: 600, color: catStyle.pillText, background: catStyle.pillBg, padding: '2px 8px', borderRadius: '12px' }}>
                {doc.category || 'Overview'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '3px 0 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {doc.description || 'Project documentation and technical specifications.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#9CA3AF' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={13} /> {formattedDate}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HardDrive size={13} /> {fileSizeStr}
            </span>
          </div>

          {isTL && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={handleEdit}
                title="Edit Documentation"
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'rgba(255,255,255,0.8)',
                  color: '#4B5563',
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
            background: '#FFFFFF',
            border: '1px solid #E0E7FF',
            color: '#5551FF',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            View <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Grid view (100% match Image 2 card design)
  return (
    <div
      onClick={onClick}
      style={{
        background: catStyle.bg,
        border: `1px solid ${catStyle.border}`,
        borderRadius: '18px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        minHeight: '210px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(85, 81, 255, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
      }}
    >
      <div>
        {/* Top Header: Badge, Pill & Menu */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: catStyle.iconBg,
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
            }}>
              <IconComp size={18} />
            </div>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: catStyle.pillText,
              background: catStyle.pillBg,
              padding: '3px 10px',
              borderRadius: '14px'
            }}>
              {doc.category || 'Overview'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isTL && (
              <>
                <button
                  onClick={handleEdit}
                  title="Edit"
                  style={{
                    padding: '5px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'rgba(255,255,255,0.7)',
                    color: '#6B7280',
                    cursor: 'pointer'
                  }}
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={handleDelete}
                  title="Delete"
                  style={{
                    padding: '5px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#FEF2F2',
                    color: '#EF4444',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
            <button
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* Title */}
        <h4 style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#1E1B4B',
          margin: '0 0 8px 0',
          lineHeight: 1.35
        }}>
          {doc.title}
        </h4>

        {/* Description */}
        <p style={{
          fontSize: '13px',
          color: '#6B7280',
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.5
        }}>
          {doc.description || 'Detailed documentation, goals, architecture and scope notes.'}
        </p>
      </div>

      {/* Card Footer: Date, File Size, View -> Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '20px',
        paddingTop: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#9CA3AF' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={13} /> {formattedDate}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <HardDrive size={13} /> {fileSizeStr}
          </span>
        </div>

        <button style={{
          background: '#FFFFFF',
          border: '1px solid #E0E7FF',
          color: '#5551FF',
          borderRadius: '20px',
          padding: '5px 14px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease'
        }}>
          View <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};

