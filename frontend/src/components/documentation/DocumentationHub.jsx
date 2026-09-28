import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, ArrowLeft, BookOpen, FolderKanban, FileText, 
  Layers, Pin, Sparkles, Grid, List as ListIcon, Clock, 
  ArrowRight, Shield, CheckCircle2, ChevronRight, X, AlertCircle, Plus
} from 'lucide-react';
import { DocumentationSidebar } from './DocumentationSidebar';
import { ProjectDocCard } from './ProjectDocCard';
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

const STATIC_14_PROJECTS_FALLBACK = [
  'Finance Management System',
  'College Management System',
  'Hospital Management System',
  'BBMP Municipal Management System',
  'Grabit',
  'Buyzo',
  'PETSHOP',
  'LIVO',
  'Nagara',
  'Property Management System',
  'Logistics / Transportation',
  'Procurement OS',
  'FairTicket',
  'Lundrix'
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
  const [selectedView, setSelectedView] = useState('overview'); // 'overview', 'pinned', 'project', 'category'
  const [selectedProject, setSelectedProject] = useState(null); // project object or name/id
  const [selectedCategory, setSelectedCategory] = useState(null); // category string
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [activeDoc, setActiveDoc] = useState(null); // document object if opened in reader

  // Load summary & initial documents
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
      // First add projects from getProjects()
      (projectsRes || []).forEach(p => {
        if (p.name) projectMap.set(p.name.trim().toLowerCase(), { id: p.id, name: p.name, description: p.aim });
      });
      // Next add projects from sumRes.projects
      (sumRes?.projects || []).forEach(p => {
        if (p.name) projectMap.set(p.name.trim().toLowerCase(), { id: p.id, name: p.name, description: p.description, document_count: p.document_count, categories: p.categories, updated_at: p.updated_at });
      });
      // Fallback add static 14 projects
      STATIC_14_PROJECTS_FALLBACK.forEach(name => {
        const key = name.trim().toLowerCase();
        if (!projectMap.has(key)) {
          projectMap.set(key, { id: name, name, description: 'Project workspace documentation and specs.', document_count: 0, categories: [] });
        }
      });

      const mergedProjects = Array.from(projectMap.values());
      const mergedSummary = {
        ...(sumRes || {}),
        total_projects: mergedProjects.length,
        projects: mergedProjects
      };

      setSummary(mergedSummary);
      setDocs(docsRes || []);
    } catch (err) {
      console.error('Failed to load documentation data:', err);
      setError('Failed to load documentation data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered documents calculation
  const filteredDocs = useMemo(() => {
    return docs.filter(d => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = d.title?.toLowerCase().includes(q);
        const matchDesc = d.description?.toLowerCase().includes(q);
        const matchCat = d.category?.toLowerCase().includes(q);
        const matchProj = d.project_name?.toLowerCase().includes(q);
        const matchContent = d.content?.toLowerCase().includes(q);
        const matchTags = d.tags?.toLowerCase().includes(q);

        if (!matchTitle && !matchDesc && !matchCat && !matchProj && !matchContent && !matchTags) {
          return false;
        }
      }

      // Project filter
      if (selectedProject) {
        const pId = typeof selectedProject === 'object' ? selectedProject.id : selectedProject;
        const pName = typeof selectedProject === 'object' ? selectedProject.name : selectedProject;
        const matchesProjId = d.project_id && (d.project_id === pId || d.project_id === selectedProject.id);
        const matchesProjName = d.project_name && (d.project_name.toLowerCase() === pName?.toLowerCase());
        if (!matchesProjId && !matchesProjName) return false;
      }

      // Category filter
      if (selectedCategory && selectedCategory.toLowerCase() !== 'all') {
        if (d.category?.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      // Pinned filter
      if (selectedView === 'pinned') {
        if (!d.is_pinned) return false;
      }

      return true;
    });
  }, [docs, searchQuery, selectedProject, selectedCategory, selectedView]);

  // Project details if selected
  const activeProjectObj = useMemo(() => {
    if (!selectedProject || !summary?.projects) return null;
    const pId = typeof selectedProject === 'object' ? selectedProject.id : selectedProject;
    const pName = typeof selectedProject === 'object' ? selectedProject.name : selectedProject;
    return summary.projects.find(p => p.id === pId || p.name?.toLowerCase() === pName?.toLowerCase());
  }, [selectedProject, summary]);

  // Available categories for selected project
  const projectCategoriesBreakdown = useMemo(() => {
    if (!selectedProject) return [];
    const pDocs = filteredDocs;
    const catMap = {};
    pDocs.forEach(d => {
      catMap[d.category] = (catMap[d.category] || 0) + 1;
    });
    return Object.entries(catMap).map(([category, count]) => ({ category, count }));
  }, [selectedProject, filteredDocs]);

  // Available categories list
  const allCategoriesList = useMemo(() => {
    if (summary?.categories_list) return summary.categories_list;
    return [
      'Requirements', 'Design', 'Development', 'API', 'Database',
      'Testing', 'Deployment', 'User Guide', 'Architecture', 'Security',
      'Integration', 'Meeting Notes', 'Decision Records', 'Change Log'
    ];
  }, [summary]);

  // Handler functions
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

  // TL CRUD Handlers
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 'calc(100vh - 120px)',
      background: 'var(--background)',
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--border)',
      overflow: 'hidden'
    }}>
      {/* TOP HUB HEADER */}
      <header style={{
        padding: '16px 24px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Left Back & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onBackToCollaboration}
            title="Back to Collaboration"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface)'}
          >
            <ArrowLeft size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--brand-600)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BookOpen size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Documentation Hub
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Knowledge Base & System Specifications
              </span>
            </div>
          </div>
        </div>

        {/* Right Search & TL Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Global Hub Search Bar */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documentation..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface-hover)',
                fontSize: '13.5px',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* ONLY TEAM LEAD GETS Upload PDF Documentation BUTTON */}
          {isTL && (
            <button
              onClick={handleCreateNew}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand-600)',
                color: '#FFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={16} /> Upload PDF Documentation
            </button>
          )}
        </div>
      </header>

      {/* HUB MAIN LAYOUT: SIDEBAR + CONTENT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
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

        {/* CENTER MAIN CONTENT AREA */}
        <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', background: 'var(--background)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid var(--border)', borderTopColor: 'var(--brand-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: '12px', fontSize: '14px' }}>Loading Documentation Hub...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#EF4444' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
              <p>{error}</p>
            </div>
          ) : (
            <>
              {/* VIEW 1: OVERVIEW / HOME */}
              {selectedView === 'overview' && !selectedProject && !selectedCategory && !searchQuery && (
                <div>
                  {/* Home Banner */}
                  <div style={{ marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                      Documentation
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                      Everything your team needs to understand, build, maintain and deliver every project.
                    </p>
                  </div>

                  {/* Summary Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ background: 'var(--surface)', padding: '16px 20px', borderRadius: 'var(--radius-lg, 16px)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Total Projects</span>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--brand-600)', marginTop: '4px' }}>
                        {summary?.total_projects || 0}
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface)', padding: '16px 20px', borderRadius: 'var(--radius-lg, 16px)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Total Documents</span>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                        {summary?.total_documents || 0}
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface)', padding: '16px 20px', borderRadius: 'var(--radius-lg, 16px)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Categories</span>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#06B6D4', marginTop: '4px' }}>
                        {summary?.total_categories || 0}
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface)', padding: '16px 20px', borderRadius: 'var(--radius-lg, 16px)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Recently Updated</span>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: '#8B5CF6', marginTop: '4px' }}>
                        {summary?.recently_updated?.length || 0}
                      </div>
                    </div>
                  </div>

                  {/* Empty State if No Real Documents Yet */}
                  {docs.length === 0 && (
                    <div style={{
                      padding: '48px 24px',
                      marginBottom: '32px',
                      textAlign: 'center',
                      background: 'var(--surface)',
                      borderRadius: 'var(--radius-lg, 16px)',
                      border: '1px dashed var(--brand-300, #A5B4FC)'
                    }}>
                      <BookOpen size={42} style={{ color: 'var(--brand-600)', marginBottom: '14px' }} />
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                        No Project PDF Documentation Uploaded Yet
                      </h3>
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 20px 0', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
                        Upload your real project PDF documents to build your workspace knowledge base.
                      </p>
                      {isTL && (
                        <button
                          onClick={handleCreateNew}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--brand-600)',
                            color: '#FFF',
                            border: 'none',
                            fontSize: '13.5px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={16} /> Upload PDF Documentation
                        </button>
                      )}
                    </div>
                  )}

                  {/* PINNED DOCUMENTATION */}
                  {docs.filter(d => d.is_pinned).length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Pin size={18} style={{ color: 'var(--brand-600)' }} />
                        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          PINNED DOCUMENTATION
                        </h3>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                        {docs.filter(d => d.is_pinned).map(docItem => (
                          <DocCard
                            key={docItem.id}
                            doc={docItem}
                            viewMode="grid"
                            onClick={() => handleOpenDoc(docItem)}
                            isTL={isTL}
                            onEdit={handleEditDoc}
                            onDelete={handleDeleteDoc}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PROJECT DOCUMENTATION */}
                  <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FolderKanban size={18} style={{ color: 'var(--brand-600)' }} />
                        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          PROJECT DOCUMENTATION
                        </h3>
                      </div>
                    </div>

                    {/* Responsive Grid: 3 columns on desktop */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                      {(summary?.projects || []).map((proj, idx) => (
                        <ProjectDocCard
                          key={proj.id || idx}
                          project={proj}
                          index={idx}
                          onClick={() => handleSelectProject(proj.id, proj.name)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* RECENTLY UPDATED */}
                  {summary?.recently_updated && summary.recently_updated.length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Clock size={18} style={{ color: 'var(--brand-600)' }} />
                        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          RECENTLY UPDATED
                        </h3>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {summary.recently_updated.map(item => {
                          const docObj = docs.find(d => d.id === item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => docObj && handleOpenDoc(docObj)}
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                padding: '12px 18px',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface)'}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-600)', background: 'var(--brand-50, #EEF2FF)', padding: '2px 8px', borderRadius: '12px' }}>
                                  {item.project_name}
                                </span>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {item.title}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={13} /> Updated {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'Recently'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 2: SELECTED PROJECT DOCUMENTATION */}
              {selectedProject && (
                <div>
                  {/* Breadcrumb & Project Header */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                      <button onClick={handleSelectOverview} style={{ background: 'transparent', border: 'none', color: 'var(--brand-600)', cursor: 'pointer', padding: 0, fontWeight: 500 }}>
                        Documentation
                      </button>
                      <ChevronRight size={14} />
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activeProjectObj?.name || selectedProject.name || selectedProject}</span>
                    </div>

                    <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                      {activeProjectObj?.name || selectedProject.name || selectedProject}
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                      {activeProjectObj?.description || 'Project workspace documentation, requirements, and specifications.'}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12.5px', color: 'var(--text-tertiary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: 'var(--brand-600)' }}>
                        <FileText size={14} /> {filteredDocs.length} Documents
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={14} /> Last updated: {activeProjectObj?.updated_at ? new Date(activeProjectObj.updated_at).toLocaleDateString() : 'Recently'}
                      </span>
                    </div>
                  </div>

                  {/* Project Categories Breakdown */}
                  {projectCategoriesBreakdown.length > 0 && (
                    <div style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      <button
                        onClick={() => setSelectedCategory(null)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          border: '1px solid var(--border)',
                          background: !selectedCategory ? 'var(--brand-600)' : 'var(--surface)',
                          color: !selectedCategory ? '#FFF' : 'var(--text-primary)',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        All ({filteredDocs.length})
                      </button>
                      {projectCategoriesBreakdown.map(cat => (
                        <button
                          key={cat.category}
                          onClick={() => setSelectedCategory(cat.category)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: '1px solid var(--border)',
                            background: selectedCategory === cat.category ? 'var(--brand-600)' : 'var(--surface)',
                            color: selectedCategory === cat.category ? '#FFF' : 'var(--text-primary)',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {cat.category} ({cat.count})
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Toolbar & View Switcher */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Showing {filteredDocs.length} documents
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--surface)', border: '1px solid var(--border)', padding: '2px', borderRadius: 'var(--radius-md)' }}>
                      <button
                        onClick={() => setViewMode('grid')}
                        style={{
                          padding: '6px 10px',
                          border: 'none',
                          background: viewMode === 'grid' ? 'var(--surface-hover)' : 'transparent',
                          color: viewMode === 'grid' ? 'var(--brand-600)' : 'var(--text-tertiary)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <Grid size={15} />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        style={{
                          padding: '6px 10px',
                          border: 'none',
                          background: viewMode === 'list' ? 'var(--surface-hover)' : 'transparent',
                          color: viewMode === 'list' ? 'var(--brand-600)' : 'var(--text-tertiary)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <ListIcon size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Document Grid / List */}
                  {filteredDocs.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-lg, 16px)', border: '1px solid var(--border)' }}>
                      <BookOpen size={36} style={{ color: 'var(--text-tertiary)', marginBottom: '12px' }} />
                      <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                        Documentation is coming soon
                      </h4>
                      <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0 }}>
                        No documents found matching your filter criteria.
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      display: viewMode === 'grid' ? 'grid' : 'flex',
                      gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'none',
                      flexDirection: viewMode === 'list' ? 'column' : 'none',
                      gap: '16px'
                    }}>
                      {filteredDocs.map(docItem => (
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
                  )}
                </div>
              )}

              {/* VIEW 3: CATEGORY / PINNED / SEARCH RESULTS */}
              {(selectedCategory || selectedView === 'pinned' || searchQuery) && !selectedProject && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                      {searchQuery ? `Search results for "${searchQuery}"` : selectedView === 'pinned' ? 'Pinned Guidelines' : `${selectedCategory} Documentation`}
                    </h1>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0 }}>
                      Found {filteredDocs.length} matching documents across all projects.
                    </p>
                  </div>

                  {filteredDocs.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-lg, 16px)', border: '1px solid var(--border)' }}>
                      <BookOpen size={36} style={{ color: 'var(--text-tertiary)', marginBottom: '12px' }} />
                      <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                        No matching documents
                      </h4>
                      <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0 }}>
                        Documentation is coming soon for this selection.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                      {filteredDocs.map(docItem => (
                        <DocCard
                          key={docItem.id}
                          doc={docItem}
                          viewMode="grid"
                          onClick={() => handleOpenDoc(docItem)}
                          isTL={isTL}
                          onEdit={handleEditDoc}
                          onDelete={handleDeleteDoc}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
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
          categories={allCategoriesList}
        />
      )}
    </div>
  );
};
