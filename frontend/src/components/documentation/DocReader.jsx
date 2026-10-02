import React from 'react';
import { DocMarkdownRenderer } from './DocMarkdownRenderer';
import { getGoogleDriveViewUrl } from '../common/AttachmentCard';
import { formatDistanceToNow, parseISO } from 'date-fns';

export const DocReader = ({ doc, projectDocs = [], onBack, onSelectDoc, isTL = false, onEdit, onDelete }) => {
  const formattedDate = React.useMemo(() => {
    if (!doc?.updated_at) return 'about 18 hours ago';
    try {
      return formatDistanceToNow(parseISO(doc.updated_at), { addSuffix: true });
    } catch {
      return 'about 18 hours ago';
    }
  }, [doc?.updated_at]);

  const isPdf = doc?.file_url || doc?.file_type === 'pdf';
  const rawUrl = doc?.file_url || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  const gdriveViewUrl = getGoogleDriveViewUrl(rawUrl, doc?.gdrive_file_id);
  const fileUrl = gdriveViewUrl || rawUrl;

  if (!doc) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#fff',
      color: '#171a2b',
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      fontSize: '14px',
      lineHeight: 1.5
    }}>
      {/* Top Action Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        padding: '14px clamp(16px, 4vw, 40px)',
        borderBottom: '1px solid #e6e8f1',
        background: '#fff'
      }}>
        <button
          onClick={onBack}
          style={{
            border: '1px solid #e6e8f1',
            background: '#fff',
            color: '#171a2b',
            borderRadius: '10px',
            padding: '8px 14px',
            fontWeight: 600,
            fontSize: '13px',
            fontFamily: 'inherit',
            cursor: 'pointer'
          }}
        >
          ← Back
        </button>

        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flex: 1,
          minWidth: '220px',
          color: '#6b7089',
          fontSize: '13px',
          flexWrap: 'wrap'
        }}>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onBack(); }}
            style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}
          >
            Documentation
          </a>
          <span>/</span>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onBack(); }}
            style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}
          >
            {doc.project_name || 'Company Management System'}
          </a>
          <span>/</span>
          <b style={{ color: '#171a2b', fontWeight: 700 }}>{doc.title}</b>
        </div>

        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#4285f4',
              borderColor: '#4285f4',
              color: '#fff',
              border: '1px solid #4285f4',
              borderRadius: '10px',
              padding: '8px 14px',
              fontWeight: 600,
              fontSize: '13px',
              fontFamily: 'inherit',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            Open in Google Drive
          </a>
        )}

        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          border: '1px solid #e6e8f1',
          borderRadius: '99px',
          padding: '4px 12px',
          color: '#6b7089'
        }}>
          {doc.version || 'v1.0'}
        </span>

        {isTL && (
          <button
            onClick={() => onEdit && onEdit(doc)}
            style={{
              border: '1px solid #e6e8f1',
              background: '#fff',
              color: '#171a2b',
              borderRadius: '10px',
              padding: '8px 14px',
              fontWeight: 600,
              fontSize: '13px',
              fontFamily: 'inherit',
              cursor: 'pointer'
            }}
          >
            Edit
          </button>
        )}

        {isTL && (
          <button
            onClick={() => onDelete && onDelete(doc)}
            style={{
              background: '#fde1ea',
              border: '1px solid #fde1ea',
              color: '#a1214f',
              borderRadius: '10px',
              padding: '8px 14px',
              fontWeight: 600,
              fontSize: '13px',
              fontFamily: 'inherit',
              cursor: 'pointer'
            }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Content Wrapper */}
      <div style={{
        maxWidth: '900px',
        padding: '28px clamp(16px, 4vw, 40px) 48px',
        width: '100%',
        margin: '0 auto'
      }}>
        {/* Header Section */}
        <section style={{
          background: '#f1f0ff',
          border: '1px solid #dcd9ff',
          borderRadius: '18px',
          padding: '22px 24px'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '99px',
              padding: '4px 12px',
              background: '#fff',
              border: '1px solid #cfcbff',
              color: '#4f46e5'
            }}>
              {doc.category || 'Requirements'}
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '99px',
              padding: '4px 12px',
              background: '#fff',
              border: '1px solid #e6e8f1',
              color: '#6b7089'
            }}>
              {doc.project_name || 'Company Management System'}
            </span>
            {isPdf && (
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '99px',
                padding: '4px 12px',
                background: '#d9f5ea',
                border: '1px solid #bfe8d6',
                color: '#066a48'
              }}>
                PDF document
              </span>
            )}
          </div>

          <h1 style={{ fontSize: '28px', margin: '0 0 4px', letterSpacing: '-0.02em', fontWeight: 700, color: '#171a2b' }}>
            {doc.title || 'KALPANAAA CMS Full Documentation'}
          </h1>
          <p style={{ color: '#43466a', margin: '0 0 14px 0', fontSize: '14px' }}>
            {doc.project_name || 'Company Management System'}
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '13px',
              borderRadius: '99px',
              padding: '5px 12px',
              background: '#fff',
              border: '1px solid #e6e8f1',
              color: '#6b7089'
            }}>
              Updated {formattedDate}
            </span>
            <span style={{
              fontSize: '13px',
              borderRadius: '99px',
              padding: '5px 12px',
              background: '#fff',
              border: '1px solid #e6e8f1',
              color: '#6b7089'
            }}>
              Updated by {doc.updated_by || doc.author || 'Satya Ranjan Das'}
            </span>
          </div>
        </section>

        {/* Attachments Section */}
        <section style={{
          marginTop: '20px',
          borderRadius: '18px',
          padding: '22px 24px',
          border: '1px solid #cfe0ff',
          background: 'linear-gradient(180deg, #eef4ff, #fff 70%)'
        }}>
          <h2 style={{ fontSize: '16px', margin: '0 0 14px', fontWeight: 700, color: '#171a2b' }}>
            Attachments (1)
          </h2>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div
              tabIndex={0}
              role="button"
              onClick={() => fileUrl && window.open(fileUrl, '_blank')}
              aria-label={`Open ${doc.file_name || `${doc.title}.pdf`} in Google Drive`}
              style={{
                width: '170px',
                border: '1px solid #cfe0ff',
                borderRadius: '14px',
                background: '#fff',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
            >
              <div style={{
                height: '96px',
                background: '#e3edff',
                display: 'grid',
                placeItems: 'center',
                color: '#4285f4',
                fontWeight: 700,
                fontSize: '20px'
              }}>
                PDF
              </div>
              <div style={{
                padding: '10px 12px',
                fontSize: '13px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: '#171a2b'
              }}>
                {doc.file_name || `${doc.title}.pdf`}
                <small style={{ display: 'block', color: '#6b7089', fontWeight: 600, fontSize: '11px' }}>
                  Google Drive
                </small>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '240px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#171a2b' }}>
                {doc.file_name || `${doc.title}.pdf`}
              </h3>
              <p style={{ margin: '0 0 14px', color: '#6b7089', maxWidth: '56ch', fontSize: '13.5px' }}>
                Select the file or the button below to open the full PDF in your connected Google Drive account.
              </p>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#4285f4',
                    borderColor: '#4285f4',
                    color: '#fff',
                    border: '1px solid #4285f4',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontWeight: 600,
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    textDecoration: 'none',
                    display: 'inline-block',
                    cursor: 'pointer'
                  }}
                >
                  Open in connected Google Drive
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Document Remarks and Notes Section */}
        <section style={{
          marginTop: '20px',
          borderRadius: '18px',
          padding: '22px 24px',
          border: '1px solid #f0c987',
          background: 'linear-gradient(180deg, #fff9ec, #fff 70%)'
        }}>
          <h2 style={{ fontSize: '16px', margin: '0 0 14px', fontWeight: 700, color: '#171a2b' }}>
            Document remarks and notes
          </h2>
          <div style={{
            background: '#fff',
            border: '1px solid #f3dfb4',
            borderRadius: '12px',
            padding: '14px 16px',
            fontSize: '13.5px',
            color: '#171a2b'
          }}>
            {doc.content ? (
              <DocMarkdownRenderer content={doc.content} />
            ) : (
              'Created by Akshit Sir.'
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
