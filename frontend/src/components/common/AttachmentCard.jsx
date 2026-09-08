import React from 'react';
import {
  FileText, Image, Video, FileSpreadsheet, FileArchive,
  FileCode, File, ExternalLink
} from 'lucide-react';

const isImageFile = (url, type, name = '') => {
  if (type === 'image') return true;
  const str = (url || name || '').toLowerCase();
  return str.endsWith('.png') || str.endsWith('.jpg') || str.endsWith('.jpeg') ||
         str.endsWith('.gif') || str.endsWith('.webp') || str.endsWith('.svg') ||
         str.includes('image/upload');
};

const getFileIcon = (url, type, name = '') => {
  const str = (url || name || '').toLowerCase();
  if (type === 'video' || str.endsWith('.mp4') || str.endsWith('.mov') || str.endsWith('.webm')) {
    return <Video size={24} color="#8B5CF6" />;
  }
  if (str.endsWith('.xlsx') || str.endsWith('.xls') || str.endsWith('.csv')) {
    return <FileSpreadsheet size={24} color="#10B981" />;
  }
  if (str.endsWith('.zip') || str.endsWith('.rar') || str.endsWith('.tar') || str.endsWith('.7z')) {
    return <FileArchive size={24} color="#F59E0B" />;
  }
  if (str.endsWith('.pdf')) {
    return <FileText size={24} color="#EF4444" />;
  }
  if (str.endsWith('.js') || str.endsWith('.jsx') || str.endsWith('.py') || str.endsWith('.json') || str.endsWith('.html')) {
    return <FileCode size={24} color="#3B82F6" />;
  }
  return <File size={24} color="var(--brand-600)" />;
};

const getCleanFileName = (url, name) => {
  if (name) return name;
  if (!url) return 'Attachment';
  try {
    const parts = url.split('/');
    const last = parts[parts.length - 1];
    return decodeURIComponent(last.split('?')[0]);
  } catch {
    return 'Attachment';
  }
};

export const AttachmentCard = ({ attachment, url, name, type, storage }) => {
  const fileUrl = attachment?.file_url || url || '';
  const fileName = getCleanFileName(fileUrl, attachment?.file_name || name);
  const fileType = attachment?.file_type || type || '';
  const storageProvider = attachment?.storage_provider || storage || '';
  const isImg = isImageFile(fileUrl, fileType, fileName);

  const handleClick = (e) => {
    e.stopPropagation();
    if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      title={`Click to open: ${fileName}`}
      style={{
        width: '120px',
        minWidth: '120px',
        maxWidth: '130px',
        height: '110px',
        borderRadius: 'var(--radius-md, 10px)',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.18s ease-in-out',
        boxShadow: 'var(--shadow-subtle, 0 1px 3px rgba(0,0,0,0.06))',
        position: 'relative',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'var(--brand-400, #818cf8)';
        e.currentTarget.style.boxShadow = 'var(--shadow-hover, 0 4px 12px rgba(99,102,241,0.15))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'var(--shadow-subtle, 0 1px 3px rgba(0,0,0,0.06))';
      }}
    >
      {/* Top Preview Section */}
      <div style={{
        height: '66px',
        width: '100%',
        background: 'var(--subtle, #f8fafc)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        borderBottom: '1px solid var(--border)'
      }}>
        {isImg && fileUrl ? (
          <img
            src={fileUrl}
            alt={fileName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.parentNode) {
                e.target.parentNode.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
              }
            }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {getFileIcon(fileUrl, fileType, fileName)}
          </div>
        )}

        {/* Hover open icon overlay */}
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          borderRadius: 'var(--radius-xs, 4px)',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff'
        }}>
          <ExternalLink size={10} />
        </div>
      </div>

      {/* Bottom Info Section */}
      <div style={{
        padding: '5px 8px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        flex: 1,
        background: 'var(--surface)'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.3
        }}>
          {fileName}
        </div>
        <div style={{
          fontSize: '9px',
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          fontWeight: 700,
          letterSpacing: '0.03em',
          marginTop: '2px'
        }}>
          {storageProvider ? storageProvider : (isImg ? 'IMAGE' : 'DOC')}
        </div>
      </div>
    </div>
  );
};

export default AttachmentCard;
