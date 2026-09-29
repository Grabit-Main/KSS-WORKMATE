import React, { useState } from 'react';
import { 
  ArrowLeft, Pin, User, Clock, FileText, Share2, 
  BookOpen, ChevronRight, Check, Sparkles, Tag, Edit3, Pencil, Trash2,
  Download, ExternalLink, FileCheck
} from 'lucide-react';
import { DocMarkdownRenderer } from './DocMarkdownRenderer';
import { AttachmentCard } from '../common/AttachmentCard';
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

  const isPdf = doc?.file_url || doc?.file_type === 'pdf';

  const gdriveViewUrl = React.useMemo(() => {
    if (!doc?.file_url) return '';
    if (doc.file_url.includes('drive.google.com')) {
      const match = doc.file_url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || doc.file_url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/view`;
      }
      return doc.file_url;
    }
    return doc.file_url;
  }, [doc?.file_url]);

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
          {gdriveViewUrl && (
            <a
              href={gdriveViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                background: '#4285F4',
                color: '#FFF',
                fontSize: '12.5px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <ExternalLink size={14} /> Open in Google Drive
            </a>
          )}

          {doc.version && (
            <span style={{ fontSize: '12px', fontWeight: 600, background: 'var(--surface-hover)', padding: '4px 10px', borderRadius: '12px', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {doc.version}
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
        {projectDocs.length > 1 && (
          <aside style={{
            width: '240px',
            flexShrink: 0,
            background: 'var(--surface)',
            borderRight: '1px solid var(--border)',
            padding: '16px 12px',
            overflowY: 'auto'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '12px', paddingLeft: '8px' }}>
              PROJECT DOCUMENTS
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
        )}

        {/* CENTER CONTENT */}
        <main style={{
          flex: 1,
          padding: '28px 36px',
          overflowY: 'auto',
          maxWidth: '1000px',
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Document Header Metadata */}
          <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '18px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-600)', background: 'var(--brand-50, #EEF2FF)', padding: '2px 10px', borderRadius: '12px' }}>
                {doc.category}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', background: 'var(--surface-hover)', padding: '2px 10px', borderRadius: '12px' }}>
                {doc.project_name || 'General'}
              </span>
              {isPdf && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857', background: '#ECFDF5', padding: '2px 10px', borderRadius: '12px' }}>
                  PDF Document
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0', lineHeight: 1.3 }}>
              {doc.title}
            </h1>

            {doc.description && (
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
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

          {/* ATTACHMENT CARD SECTION (Matches Project Overview Attachment design) */}
          {doc.file_url ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg, 16px)',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Attachments (1)
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <AttachmentCard
                    attachment={{
                      file_url: gdriveViewUrl,
                      file_name: doc.file_name || `${doc.title}.pdf`,
                      file_type: 'pdf',
                      storage_provider: 'GDRIVE'
                    }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '240px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {doc.file_name || `${doc.title}.pdf`}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Click on the attachment card or the button below to open and access the full PDF document directly in your connected Google Drive account.
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <a
                        href={gdriveViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 18px',
                          borderRadius: '8px',
                          background: '#4285F4',
                          color: '#FFF',
                          fontSize: '13px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 2px 6px rgba(66, 133, 244, 0.25)'
                        }}
                      >
                        <ExternalLink size={15} /> Open in Connected Google Drive
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Notes if available */}
              {doc.content && (
                <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-lg, 12px)', border: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    Document Remarks & Notes
                  </h3>
                  <DocMarkdownRenderer content={doc.content} onTocExtracted={setToc} />
                </div>
              )}
            </div>
          ) : (
            /* Render Markdown Body if no PDF file */
            <DocMarkdownRenderer content={doc.content} onTocExtracted={setToc} />
          )}
        </main>
      </div>
    </div>
  );
};
