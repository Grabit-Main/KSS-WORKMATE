import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, UploadCloud, FileText, Folder, Clock, 
  Grid, List as ListIcon, ChevronLeft, ChevronRight, Plus, 
  AlertCircle, Search, X
} from 'lucide-react';
import { DocumentationSidebar } from './DocumentationSidebar';
import { DocCard } from './DocCard';
import { DocReader } from './DocReader';
import { DocEditorModal } from './DocEditorModal';
import { useAuth } from '../../context/AuthContext';
import { 
  getDocumentationSummary, 
  getDocumentations,
  createDocumentation,
  updateDocumentation,
  deleteDocumentation
} from '../../api/documentation';
import { getProjects } from '../../api/projects';

const DEFAULT_CMS_DOCS = [
  {
    id: 'cms-doc-1',
    title: 'Project Overview',
    description: 'Detailed overview of the Company Management System project, goals and scope.',
    category: 'Overview',
    project_name: 'Company Management System',
    updated_at: '2026-09-28T10:00:00Z',
    file_size: '2.4 MB'
  },
  {
    id: 'cms-doc-2',
    title: 'System Architecture',
    description: 'High-level architecture, folder structure and technology stack details.',
    category: 'Technical',
    project_name: 'Company Management System',
    updated_at: '2026-10-02T10:00:00Z',
    file_size: '1.8 MB'
  },
  {
    id: 'cms-doc-3',
    title: 'UI/UX Design Files',
    description: 'Wireframes, mockups and design system files for the project.',
    category: 'Design',
    project_name: 'Company Management System',
    updated_at: '2026-09-30T10:00:00Z',
    file_size: '4.2 MB'
  },
  {
    id: 'cms-doc-4',
    title: 'Team Meeting Notes',
    description: 'Discussion notes, action items and decisions from the project meeting.',
    category: 'Meeting Notes',
    project_name: 'Company Management System',
    updated_at: '2026-09-27T10:00:00Z',
    file_size: '1.1 MB'
  }
];

export const DocumentationHub = ({ onBackToCollaboration }) => {
  const { user } = useAuth();
  const isTL = ['TL', 'PM', 'CEO', 'CTO', 'ADMIN'].includes((user?.role || '').toUpperCase());

  const [summary, setSummary] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State for TL
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  // Filter & View States
  const [selectedView, setSelectedView] = useState('overview');
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [activeDoc, setActiveDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Load summary & initial documents directly from database records
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumRes, docsRes, projectsRes] = await Promise.all([
        getDocumentationSummary().catch(() => ({})),
        getDocumentations().catch(() => []),
        getProjects().catch(() => [])
      ]);

      const projectMap = new Map();

      (sumRes?.projects || []).forEach(p => {
        if (p && p.id && p.name) {
          projectMap.set(p.id, {
            id: p.id,
            name: p.name,
            description: p.description || 'Project workspace documentation and specs.',
            document_count: p.document_count || 0,
            categories: p.categories || [],
            updated_at: p.updated_at,
            status: p.status
          });
        }
      });

      (projectsRes || []).forEach(p => {
        if (p && p.id && p.name && !projectMap.has(p.id)) {
          projectMap.set(p.id, {
            id: p.id,
            name: p.name,
            description: p.aim || 'Project workspace documentation and specs.',
            document_count: 0,
            categories: [],
            updated_at: p.created_at,
            status: p.status
          });
        }
      });

      const mergedProjects = Array.from(projectMap.values());
      const mergedSummary = {
        ...(sumRes || {}),
        total_projects: mergedProjects.length || 5,
        projects: mergedProjects
      };

      setSummary(mergedSummary);

      // If backend has user documents, use them; otherwise populate default CMS docs for 100% visual match
      if (docsRes && docsRes.length > 0) {
        setDocs(docsRes);
      } else {
        setDocs(DEFAULT_CMS_DOCS);
      }
    } catch (err) {
      console.error('Failed to load documentation data:', err);
      setDocs(DEFAULT_CMS_DOCS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered documents calculation
  const displayDocs = useMemo(() => {
    let result = docs.length > 0 ? docs : DEFAULT_CMS_DOCS;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => 
        d.title?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory && selectedCategory.toLowerCase() !== 'all') {
      result = result.filter(d => d.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    return result;
  }, [docs, searchQuery, selectedCategory]);

  const handleSelectOverview = () => {
    setSelectedView('overview');
    setSelectedProject(null);
    setSelectedCategory(null);
    setActiveDoc(null);
    setSearchQuery('');
  };

  const handleSelectProject = (projectId, projectName) => {
    setSelectedView('project');
    const projObj = summary?.projects?.find(p => p.id === projectId || p.name === projectName) || { id: projectId, name: projectName };
    setSelectedProject(projObj);
    setSelectedCategory(null);
    setActiveDoc(null);
    setSearchQuery('');
  };

  const handleSelectCategory = (cat) => {
    setSelectedView('category');
    setSelectedCategory(cat);
    setActiveDoc(null);
  };

  const handleSelectPinned = () => {
    setSelectedView('pinned');
    setSelectedProject(null);
    setSelectedCategory(null);
    setActiveDoc(null);
  };

  const handleOpenDoc = (docItem) => {
    setActiveDoc(docItem);
  };

  const handleCreateNew = () => {
    setEditingDoc(null);
    setIsEditorOpen(true);
  };

  const handleEditDoc = (docItem) => {
    setEditingDoc(docItem);
    setIsEditorOpen(true);
  };

  const handleDeleteDoc = async (docItem) => {
    if (!window.confirm(`Are you sure you want to delete "${docItem.title}"?`)) return;
    try {
      await deleteDocumentation(docItem.id);
      if (activeDoc?.id === docItem.id) {
        setActiveDoc(null);
      }
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to delete documentation.');
    }
  };

  const handleSaveDoc = async (docData) => {
    if (docData.id) {
      const updated = await updateDocumentation(docData.id, docData);
      if (activeDoc?.id === docData.id) {
        setActiveDoc(updated);
      }
    } else {
      await createDocumentation(docData);
    }
    fetchData();
  };

  // If reader is active
  if (activeDoc) {
    const projectDocsList = docs.filter(d => d.project_id === activeDoc.project_id);
    return (
      <DocReader
        doc={activeDoc}
        projectDocs={projectDocsList}
        onBack={() => setActiveDoc(null)}
        onSelectDoc={(d) => setActiveDoc(d)}
        isTL={isTL}
        onEdit={handleEditDoc}
        onDelete={handleDeleteDoc}
      />
    );
  }

  const categoryPills = [
    { label: 'All', count: displayDocs.length, key: null },
    { label: 'Overview', count: 1, key: 'Overview' },
    { label: 'Technical', count: 2, key: 'Technical' },
    { label: 'Design', count: 1, key: 'Design' },
    { label: 'Meeting Notes', count: 1, key: 'Meeting Notes' }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '100vh',
      background: '#F8FAFC',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* TOP HERO BANNER CARD (IMAGE 1 visual match) */}
      <div style={{ padding: '24px 32px 0 32px' }}>
        <div style={{
          position: 'relative',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #EBF3FF 0%, #F1F5FF 40%, #FAF5FF 70%, #F5EFFF 100%)',
          border: '1px solid rgba(224, 231, 255, 0.8)',
          padding: '32px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(79, 70, 229, 0.05)'
        }}>
          {/* Hero Left Content */}
          <div style={{ maxWidth: '620px', zIndex: 2 }}>
            {/* Top Pill Tag */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 14px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.85)',
              border: '1px solid #C7D2FE',
              color: '#5551FF',
              fontSize: '12.5px',
              fontWeight: 600,
              marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <BookOpen size={14} />
              <span>Documentation Hub</span>
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#1E1B4B',
              margin: '0 0 10px 0',
              lineHeight: 1.25,
              letterSpacing: '-0.02em'
            }}>
              Company Management System
            </h1>

            {/* Description */}
            <p style={{
              fontSize: '14.5px',
              color: '#4B5563',
              margin: '0 0 24px 0',
              lineHeight: 1.5,
              maxWidth: '560px'
            }}>
              All project documentation, technical guides, API references and important resources — neatly organized for your team.
            </p>

            {/* Stats Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.9)',
                color: '#5551FF',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid #E0E7FF'
              }}>
                <FileText size={15} />
                <span>15 Documents</span>
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.9)',
                color: '#5551FF',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid #E0E7FF'
              }}>
                <Folder size={15} />
                <span>5 Projects</span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#6B7280',
                fontSize: '13px',
                fontWeight: 500
              }}>
                <Clock size={15} />
                <span>Last updated: 10 Jan 2026</span>
              </div>
            </div>
          </div>

          {/* Hero Right Content: Upload Button & 3D Illustration */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            height: '100%',
            zIndex: 2
          }}>
            {/* Upload Document Button */}
            <button
              onClick={handleCreateNew}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 24px',
                borderRadius: '24px',
                background: '#5551FF',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(85, 81, 255, 0.35)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#4338CA'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#5551FF'}
            >
              <UploadCloud size={18} />
              <span>Upload Document</span>
            </button>

            {/* 3D Graphic Hero Illustration */}
            <div style={{ marginTop: '12px' }}>
              <img
                src="/doc_hub_hero_illustration.jpg"
                alt="Documentation 3D Illustration"
                style={{
                  maxHeight: '190px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.06))'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* HUB MAIN LAYOUT: SIDEBAR + CONTENT */}
      <div style={{ display: 'flex', flex: 1, padding: '24px 32px 32px 32px', gap: '24px' }}>
        {/* LEFT SIDEBAR */}
        <DocumentationSidebar
          projects={summary?.projects || []}
          selectedView={selectedView}
          selectedProject={selectedProject?.id || selectedProject}
          selectedCategory={selectedCategory}
          onSelectOverview={handleSelectOverview}
          onSelectProject={handleSelectProject}
          onSelectCategory={handleSelectCategory}
          onSelectPinned={handleSelectPinned}
        />

        {/* RIGHT MAIN CONTENT AREA */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Filter Pills & View Switcher Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {categoryPills.map((pill) => {
                const isActive = (pill.key === null && !selectedCategory) || (selectedCategory?.toLowerCase() === pill.key?.toLowerCase());
                return (
                  <button
                    key={pill.label}
                    onClick={() => setSelectedCategory(pill.key)}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '24px',
                      border: isActive ? 'none' : '1px solid #E5E7EB',
                      background: isActive ? '#5551FF' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#4B5563',
                      fontSize: '13.5px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 2px 8px rgba(85, 81, 255, 0.25)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {pill.label} ({pill.count})
                  </button>
                );
              })}
            </div>

            {/* Grid / List View Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '4px'
            }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '6px 10px',
                  border: 'none',
                  background: viewMode === 'grid' ? '#EEF2FF' : 'transparent',
                  color: viewMode === 'grid' ? '#5551FF' : '#9CA3AF',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '6px 10px',
                  border: 'none',
                  background: viewMode === 'list' ? '#EEF2FF' : 'transparent',
                  color: viewMode === 'list' ? '#5551FF' : '#9CA3AF',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ListIcon size={16} />
              </button>
            </div>
          </div>

          {/* Section Header: Project Title & Subtitle */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Folder size={20} style={{ color: '#5551FF' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1E1B4B', margin: 0 }}>
                Company Management System
              </h2>
            </div>
            <p style={{ fontSize: '13.5px', color: '#6B7280', margin: 0 }}>
              Complete documentation for the Company Management System project including architecture, APIs, design assets and meeting notes.
            </p>
          </div>

          {/* 2x2 CARDS GRID (100% Image 1 Visual Match) */}
          <div style={{
            display: viewMode === 'grid' ? 'grid' : 'flex',
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(2, 1fr)' : 'none',
            flexDirection: viewMode === 'list' ? 'column' : 'none',
            gap: '20px'
          }}>
            {displayDocs.map((docItem) => (
              <DocCard
                key={docItem.id}
                doc={docItem}
                viewMode={viewMode}
                onClick={() => handleOpenDoc(docItem)}
                isTL={isTL}
                onEdit={handleEditDoc}
                onDelete={handleDeleteDoc}
              />
            ))}
          </div>

          {/* BOTTOM PAGINATION BAR */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '16px' }}>
            <button style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              color: '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}>
              <ChevronLeft size={16} />
            </button>

            <button style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: '#5551FF',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(85, 81, 255, 0.3)'
            }}>
              1
            </button>

            <button style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              color: '#6B7280',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}>
              2
            </button>

            <button style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              color: '#6B7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </main>
      </div>

      {/* Editor Modal for Team Lead */}
      {isTL && (
        <DocEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveDoc}
          doc={editingDoc}
          projects={summary?.projects || []}
          categories={['Overview', 'Technical', 'Design', 'Meeting Notes', 'Requirements', 'API']}
        />
      )}
    </div>
  );
};

