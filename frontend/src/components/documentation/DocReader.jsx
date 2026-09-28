import React, { useState } from 'react';
import { 
  ArrowLeft, Pin, User, Clock, FileText, Share2, 
  BookOpen, ChevronRight, Check, Sparkles, Tag, Edit3, Pencil, Trash2
} from 'lucide-react';
import { DocMarkdownRenderer } from './DocMarkdownRenderer';
import { formatDistanceToNow, parseISO } from 'date-fns';

export const DocReader = ({ doc, projectDocs = [], onBack, onSelectDoc, isTL = false, onEdit, onDelete }) => {
  const [toc, setToc] = useState([]);
  const [activeTocId, setActiveTocId] = useState('');

  const formattedDate = React.useMemo(() => {
    if (!doc?.updated_at) return 'Recently';
    try {
      return formatDistanceToNow(parseISO(doc.updated_at), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  }, [doc?.updated_at]);

  const tagList = React.useMemo(() => {
    if (!doc?.tags) return [];
    return doc.tags.split(',').map(t => t.trim()).filter(Boolean);
  }, [doc?.tags]);

  const scrollToHeading = (id) => {
    setActiveTocId(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!doc) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--background)' }}>
      {/* Top Header / Breadcrumb Bar */}
      <div style={{
        padding: '12px 24px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={15} /> Back
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
            <span>Documentation</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--text-secondary)' }}>{doc.project_name || 'Project'}</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--brand-600)', fontWeight: 600 }}>{doc.title}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {doc.version && (
            <span style={{ fontSize: '12px', fontWeight: 600, background: 'var(--surface-hover)', padding: '4px 10px', borderRadius: '12px', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {doc.version}
            </span>
          )}
          {doc.is_pinned && (
            <span style={{ fontSize: '12px', fontWeight: 600, background: '#EEF2FF', color: 'var(--brand-600)', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Pin size={13} /> Pinned
            </span>
          )}

          {/* TL Management Buttons */}
          {isTL && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
              <button
                onClick={() => onEdit && onEdit(doc)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => onDelete && onDelete(doc)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: '#FEF2F2',
                  color: '#EF4444',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Reader Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT NAV: Other Docs in this project */}
        <aside style={{
          width: '240px',
          flexShrink: 0,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          padding: '16px 12px',
          overflowY: 'auto',
          display: 'none',
          '@media (min-width: 900px)': { display: 'block' }
        }} className="doc-left-nav">
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '12px', paddingLeft: '8px' }}>
            IN THIS PROJECT
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {projectDocs.map((pd) => {
              const isActive = pd.id === doc.id;
              return (
                <button
                  key={pd.id}
                  onClick={() => onSelectDoc(pd)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: isActive ? 'var(--brand-50, #EEF2FF)' : 'transparent',
                    color: isActive ? 'var(--brand-600)' : 'var(--text-primary)',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <FileText size={14} style={{ flexShrink: 0, color: isActive ? 'var(--brand-600)' : 'var(--text-tertiary)' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pd.title}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* CENTER CONTENT */}
        <main style={{
          flex: 1,
          padding: '32px 40px',
          overflowY: 'auto',
          maxWidth: '860px',
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Document Header Metadata */}
          <div style={{ marginBottom: '28px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-600)', background: 'var(--brand-50, #EEF2FF)', padding: '2px 10px', borderRadius: '12px' }}>
                {doc.category}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', background: 'var(--surface-hover)', padding: '2px 10px', borderRadius: '12px' }}>
                {doc.project_name || 'General'}
              </span>
            </div>

            <h1 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px 0', lineHeight: 1.3 }}>
              {doc.title}
            </h1>

            {doc.description && (
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                {doc.description}
              </p>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', fontSize: '12.5px', color: 'var(--text-tertiary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={14} /> Updated {formattedDate}
              </span>
              {doc.updated_by && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <User size={14} /> Updated by {doc.updated_by}
                </span>
              )}
            </div>
          </div>

          {/* Rendered Document Body */}
          <DocMarkdownRenderer content={doc.content} onTocExtracted={setToc} />
        </main>

        {/* RIGHT TOC: On this page */}
        {toc.length > 0 && (
          <aside style={{
            width: '240px',
            flexShrink: 0,
            padding: '24px 16px',
            borderLeft: '1px solid var(--border)',
            overflowY: 'auto',
            background: 'var(--surface)',
            display: 'none',
            '@media (min-width: 1100px)': { display: 'block' }
          }} className="doc-right-toc">
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '12px' }}>
              On this page
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {toc.map((item, i) => (
                <button
                  key={i}
                  onClick={() => scrollToHeading(item.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '13px',
                    color: activeTocId === item.id ? 'var(--brand-600)' : 'var(--text-secondary)',
                    fontWeight: activeTocId === item.id ? 600 : 400,
                    paddingLeft: `${(item.level - 1) * 12}px`,
                    cursor: 'pointer',
                    lineHeight: 1.4,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {item.text}
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
