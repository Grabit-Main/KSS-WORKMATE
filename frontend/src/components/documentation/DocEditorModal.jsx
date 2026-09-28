import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Save, FileText, Pin, AlertCircle, Upload, FileCheck } from 'lucide-react';
import { uploadFile } from '../../api/upload';
import { getStoredGoogleToken, requestGoogleAccessToken } from '../../services/googleDriveAuth';

export const DocEditorModal = ({
  isOpen,
  onClose,
  onSave,
  doc = null,
  projects = [],
  categories = []
}) => {
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [category, setCategory] = useState('Requirements');
  const [customCategory, setCustomCategory] = useState('');
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('pdf');
  const [version, setVersion] = useState('v1.0');
  const [tags, setTags] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Use exact projects list from database
  const projectOptions = useMemo(() => {
    return (projects || []).map(p => ({
      id: p.id || p.name,
      name: p.name
    })).filter(p => !!p.name);
  }, [projects]);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title || '');
      setDescription(doc.description || '');
      setProjectId(doc.project_id || doc.project_name || (projectOptions[0]?.id || ''));
      const isCustom = !categories.includes(doc.category);
      if (isCustom && doc.category) {
        setCategory('Custom');
        setCustomCategory(doc.category);
      } else {
        setCategory(doc.category || 'Requirements');
        setCustomCategory('');
      }
      setContent(doc.content || '');
      setFileUrl(doc.file_url || '');
      setFileName(doc.file_name || '');
      setFileType(doc.file_type || 'pdf');
      setVersion(doc.version || 'v1.0');
      setTags(doc.tags || '');
      setIsPinned(!!doc.is_pinned);
    } else {
      setTitle('');
      setDescription('');
      setProjectId(projectOptions[0]?.id || '');
      setCategory('Requirements');
      setCustomCategory('');
      setContent('');
      setFileUrl('');
      setFileName('');
      setFileType('pdf');
      setVersion('v1.0');
      setTags('');
      setIsPinned(false);
    }
    setError(null);
  }, [doc, isOpen, projectOptions, categories]);

  if (!isOpen) return null;

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please select a valid PDF file (.pdf).');
      return;
    }

    try {
      setUploadingPdf(true);
      setError(null);

      // Check for Google Drive token
      let googleToken = getStoredGoogleToken();
      if (!googleToken) {
        try {
          googleToken = await requestGoogleAccessToken();
        } catch (authErr) {
          console.warn('[GDRIVE] User cancelled Google Drive auth:', authErr);
        }
      }

      // Standalone PDF upload for Documentation Hub
      const res = await uploadFile(file, null, null, googleToken);

      if (!res || !res.url) {
        throw new Error('Upload response did not return a valid file URL.');
      }

      setFileUrl(res.url);
      setFileName(res.file_name || file.name);
      setFileType('pdf');
      
      // Auto fill title if empty
      if (!title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    } catch (err) {
      console.error('PDF upload error:', err);
      const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to upload PDF file.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleRemovePdf = () => {
    setFileUrl('');
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }

    if (!fileUrl && !content.trim()) {
      setError('Please upload a PDF document or provide document content.');
      return;
    }

    const finalCategory = category === 'Custom' ? customCategory.trim() || 'General' : category;

    try {
      setSaving(true);
      setError(null);
      await onSave({
        id: doc?.id,
        title: title.trim(),
        description: description.trim(),
        project_id: (projectId && projectId !== "" && projectId !== "null") ? projectId : null,
        category: finalCategory,
        content: content,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType || 'pdf',
        version: version.trim() || 'v1.0',
        tags: tags.trim(),
        is_pinned: isPinned
      });
      onClose();
    } catch (err) {
      console.error('Save documentation error:', err);
      const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.message;
      let errorMsg = 'Failed to save document. Please try again.';
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        errorMsg = detail.map(d => d.msg || d.detail || JSON.stringify(d)).join(', ');
      } else if (detail && typeof detail === 'object') {
        errorMsg = detail.msg || JSON.stringify(detail);
      }
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-xl, 16px)',
        border: '1px solid var(--border)',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'var(--brand-50, #EEF2FF)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {doc ? 'Edit PDF Documentation' : 'Upload PDF Documentation'}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Attach PDF documents to project knowledge base
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* PDF File Upload Zone */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Upload PDF File *
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handlePdfUpload}
              style={{ display: 'none' }}
            />

            {fileUrl ? (
              <div style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileCheck size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#065F46' }}>
                      {fileName || 'PDF Document Attached'}
                    </div>
                    <span style={{ fontSize: '11.5px', color: '#047857' }}>
                      PDF Uploaded Successfully
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: '12px', color: 'var(--brand-600)', background: '#FFF', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Change PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePdf}
                    style={{ fontSize: '12px', color: '#EF4444', background: '#FFF', border: '1px solid #FCA5A5', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '24px',
                  borderRadius: 'var(--radius-lg, 12px)',
                  border: '2px dashed var(--brand-300, #A5B4FC)',
                  background: 'var(--brand-50, #EEF2FF)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand-600)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--brand-300, #A5B4FC)'}
              >
                <Upload size={28} style={{ color: 'var(--brand-600)', marginBottom: '8px' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {uploadingPdf ? 'Uploading PDF Document...' : 'Click to Upload Project PDF Document'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Supports PDF files up to 50MB
                </div>
              </div>
            )}
          </div>

          {/* Title & Version */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Document Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Technical Requirement Specification"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-hover)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ width: '120px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Version
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-hover)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Short Description / Summary
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of what this project PDF document covers..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface-hover)',
                color: 'var(--text-primary)',
                fontSize: '13.5px',
                outline: 'none'
              }}
            />
          </div>

          {/* Project & Category Select */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Associated Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-hover)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              >
                <option value="">General / Platform</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-hover)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="Custom">+ Create New Category</option>
              </select>
            </div>
          </div>

          {category === 'Custom' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                New Category Name
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Security Audit"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-hover)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Tags & Pinned */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Requirements, PDF, Spec"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-hover)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ paddingTop: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--brand-600)' }}
                />
                Pin Document Guidelines
              </label>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Additional Document Notes / Remarks (Optional)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Add key highlights or notes regarding this PDF file..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface-hover)',
                color: 'var(--text-primary)',
                fontSize: '13.5px',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingPdf}
              style={{
                padding: '9px 20px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--brand-600)',
                color: '#FFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Save size={16} />
              {saving ? 'Saving...' : doc ? 'Save Changes' : 'Upload Documentation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
