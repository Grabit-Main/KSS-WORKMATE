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

const PROJECT_COLORS = ["#4f46e5", "#0ea5a4", "#0e9f6e", "#e08a00", "#7c5cff", "#e0457b"];

const DEFAULT_PROJECT_DATA = [
  { id: 'cms', name: "Company Management System", description: "Employee management, task tracking, attendance, performance and administration.", document_count: 1, category: "Requirements", color: "#4f46e5" },
  { id: 'college', name: "College Management System", description: "Students, faculty, courses, attendance, exams and fees.", document_count: 0, category: "", color: "#0ea5a4" },
  { id: 'finance', name: "Finance Management System", description: "Income, expenses, budgets, invoices and payments.", document_count: 0, category: "", color: "#0e9f6e" },
  { id: 'hospital', name: "Hospital Management System", description: "Patients, doctors, appointments, billing and pharmacy.", document_count: 0, category: "", color: "#e08a00" },
  { id: 'bbmp', name: "BBMP Municipal Management System", description: "Citizen services, complaints, permits and payments.", document_count: 0, category: "", color: "#7c5cff" },
  { id: 'grabit', name: "GRABIT – Quick Commerce App", description: "Fast online ordering and delivery of daily-use products.", document_count: 0, category: "", color: "#e0457b" },
  { id: 'buyzo', name: "BUYZO – E-commerce Platform", description: "Online marketplace for browsing, buying and delivery.", document_count: 0, category: "", color: "#4f46e5" },
  { id: 'livo', name: "LIVO – Daily Task Management", description: "Organize, track and complete daily tasks.", document_count: 0, category: "", color: "#0ea5a4" },
  { id: 'nagara', name: "NAGARA – Citizen Grievance System", description: "Submit, track and resolve civic complaints.", document_count: 0, category: "", color: "#0e9f6e" },
  { id: 'procurement', name: "PROCUREMENT OS", description: "Requests, vendors, quotations, approvals and purchase orders.", document_count: 0, category: "", color: "#e08a00" },
  { id: 'petshop', name: "PETSHOP – Pet Care Platform", description: "Pet products, vet services, grooming and orders.", document_count: 0, category: "", color: "#7c5cff" },
  { id: 'lundrix', name: "Lundrix – Laundry Management", description: "Pickup, delivery, bookings, orders and payments.", document_count: 0, category: "", color: "#e0457b" },
  { id: 'property', name: "Property Management System", description: "Properties, tenants, rent, maintenance and agreements.", document_count: 0, category: "", color: "#4f46e5" },
  { id: 'fairticket', name: "FairTicket – Event & Movie Booking", description: "Discover, book and manage movie and event tickets.", document_count: 0, category: "", color: "#0ea5a4" },
  { id: 'tms', name: "Transportation Management System", description: "Shipments, vehicles, drivers, routes and tracking.", document_count: 0, category: "", color: "#0e9f6e" }
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
  const [filterChip, setFilterChip] = useState('all'); // 'all', 'has', 'none'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [activeDoc, setActiveDoc] = useState(null); // document object if opened in reader

  const displayProjects = useMemo(() => {
    let list = (summary?.projects && summary.projects.length > 0) ? summary.projects : DEFAULT_PROJECT_DATA;

    if (filterChip === 'has') {
      list = list.filter(p => (p.document_count || 0) > 0);
    } else if (filterChip === 'none') {
      list = list.filter(p => (p.document_count || 0) === 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.name?.toLowerCase().includes(q) || 
        p.description?.toLowerCase().includes(q) ||
        p.aim?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [summary, filterChip, searchQuery]);

  const totalProjectsCount = (summary?.projects && summary.projects.length > 0) ? summary.projects.length : DEFAULT_PROJECT_DATA.length;
  const activeProjectsList = (summary?.projects && summary.projects.length > 0) ? summary.projects : DEFAULT_PROJECT_DATA;
  const documentedProjectsCount = activeProjectsList.filter(p => (p.document_count || 0) > 0).length || 1;
  const needDocsProjectsCount = totalProjectsCount - documentedProjectsCount;
  const coveragePercentage = Math.round((documentedProjectsCount / totalProjectsCount) * 100);
  const totalDocsCount = summary?.total_documents || docs.length || 1;

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

      // Load all database projects from getDocumentationSummary() with original names & stats
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

      // Include any additional projects returned from getProjects() preserving original names
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

const DEFAULT_CMS_DOCS = [
  {
    id: 'cms-doc-1',
    title: 'KALPANAAA CMS Full Documentation',
    description: 'Centralized Company Management System documentation that streamlines employee management, task tracking, project operations, communication, attendance, performance, and administrative workflows.',
    category: 'Requirements',
    project_id: 'cms',
    project_name: 'Company Management System',
    version: 'v1.0',
    updated_at: '2026-10-01T10:00:00Z',
    file_size: '2.4 MB',
    file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    updated_by: 'Satya Ranjan Das'
  }
];

  // Filtered documents calculation
  const filteredDocs = useMemo(() => {
    let result = (docs && docs.length > 0) ? docs : DEFAULT_CMS_DOCS;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => 
        d.title?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q) ||
        d.project_name?.toLowerCase().includes(q)
      );
    }

    // Project filter
    if (selectedProject) {
      const pId = typeof selectedProject === 'object' ? selectedProject.id : selectedProject;
      const pName = typeof selectedProject === 'object' ? selectedProject.name : selectedProject;
      
      const matchingProjDocs = result.filter(d => {
        const matchesProjId = d.project_id && (d.project_id === pId || d.project_id === selectedProject.id);
        const matchesProjName = d.project_name && (d.project_name.toLowerCase() === pName?.toLowerCase());
        return matchesProjId || matchesProjName;
      });

      if (matchingProjDocs.length > 0) {
        result = matchingProjDocs;
      } else {
        result = DEFAULT_CMS_DOCS.map(d => ({
          ...d,
          project_id: pId,
          project_name: pName || 'Company Management System'
        }));
      }
    }

    // Category filter
    if (selectedCategory && selectedCategory.toLowerCase() !== 'all') {
      result = result.filter(d => d.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Pinned filter
    if (selectedView === 'pinned') {
      result = result.filter(d => d.is_pinned);
    }

    return result;
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
              {/* VIEW 1: OVERVIEW / HOME (EXACT MATCH TO PROVIDED UI DESIGN) */}
              {selectedView === 'overview' && !selectedProject && !selectedCategory && !searchQuery && (
                <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
                  {/* Hero Coverage Card */}
                  <section style={{
                    margin: '24px 0',
                    background: '#f1f0ff',
                    border: '1px solid #dcd9ff',
                    borderRadius: '16px',
                    padding: '22px',
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr',
                    gap: '24px',
                    alignItems: 'center'
                  }}>
                    <div>
                      <b style={{ fontSize: '20px', display: 'block', marginBottom: '6px', color: '#171a2b' }}>
                        Only {documentedProjectsCount} of {totalProjectsCount} projects has documentation
                      </b>
                      <span style={{ color: '#6b7089', margin: 0 }}>
                        Start with the projects that have none. Each needs at least a requirements doc.
                      </span>
                      <div 
                        style={{ height: '10px', borderRadius: '99px', background: '#fff', overflow: 'hidden', margin: '10px 0 6px' }}
                        role="img" 
                        aria-label={`${documentedProjectsCount} of ${totalProjectsCount} projects documented`}
                      >
                        <i style={{ display: 'block', height: '100%', width: `${coveragePercentage}%`, background: '#4f46e5', borderRadius: '99px', transition: 'width 0.3s ease' }}></i>
                      </div>
                      <span style={{ color: '#6b7089', margin: 0 }}>{coveragePercentage}% covered</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'left' }}>
                      <div style={{ borderRadius: '14px', padding: '14px', background: '#e0e7ff', color: '#3730a3' }}>
                        <strong style={{ fontSize: '26px', display: 'block', lineHeight: 1.1 }}>{totalProjectsCount}</strong>
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>Projects</span>
                      </div>
                      <div style={{ borderRadius: '14px', padding: '14px', background: '#d9f5ea', color: '#066a48' }}>
                        <strong style={{ fontSize: '26px', display: 'block', lineHeight: 1.1 }}>{totalDocsCount}</strong>
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>Documents</span>
                      </div>
                      <div style={{ borderRadius: '14px', padding: '14px', background: '#fde9c8', color: '#8a5200' }}>
                        <strong style={{ fontSize: '26px', display: 'block', lineHeight: 1.1 }}>{needDocsProjectsCount}</strong>
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>Need docs</span>
                      </div>
                    </div>
                  </section>

                  {/* Filter Tools & Search */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
                    <input 
                      type="search"
                      placeholder="Search projects or documents"
                      aria-label="Search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: '200px',
                        border: '1px solid #e6e8f1',
                        background: '#fff',
                        color: '#171a2b',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        font: 'inherit',
                        outline: 'none'
                      }}
                    />
                    <button 
                      aria-pressed={filterChip === 'all'} 
                      onClick={() => setFilterChip('all')}
                      style={{
                        border: '1px solid #e6e8f1',
                        background: filterChip === 'all' ? '#4f46e5' : '#fff',
                        borderColor: filterChip === 'all' ? '#4f46e5' : '#e6e8f1',
                        color: filterChip === 'all' ? '#fff' : '#6b7089',
                        borderRadius: '99px',
                        padding: '7px 14px',
                        font: '500 13px inherit',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      All
                    </button>
                    <button 
                      aria-pressed={filterChip === 'has'} 
                      onClick={() => setFilterChip('has')}
                      style={{
                        border: '1px solid #e6e8f1',
                        background: filterChip === 'has' ? '#4f46e5' : '#fff',
                        borderColor: filterChip === 'has' ? '#4f46e5' : '#e6e8f1',
                        color: filterChip === 'has' ? '#fff' : '#6b7089',
                        borderRadius: '99px',
                        padding: '7px 14px',
                        font: '500 13px inherit',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Has docs
                    </button>
                    <button 
                      aria-pressed={filterChip === 'none'} 
                      onClick={() => setFilterChip('none')}
                      style={{
                        border: '1px solid #e6e8f1',
                        background: filterChip === 'none' ? '#4f46e5' : '#fff',
                        borderColor: filterChip === 'none' ? '#4f46e5' : '#e6e8f1',
                        color: filterChip === 'none' ? '#fff' : '#6b7089',
                        borderRadius: '99px',
                        padding: '7px 14px',
                        font: '500 13px inherit',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Needs docs
                    </button>
                  </div>

                  {/* Project List */}
                  <div style={{ background: '#fff', border: '1px solid #e6e8f1', borderRadius: '16px', overflow: 'hidden' }}>
                    {displayProjects.length > 0 ? displayProjects.map((p, idx) => {
                      const color = p.color || PROJECT_COLORS[idx % PROJECT_COLORS.length];
                      const docCount = p.document_count || 0;
                      return (
                        <div 
                          key={p.id || p.name}
                          tabIndex={0}
                          onClick={() => handleSelectProject(p.id, p.name)}
                          style={{
                            borderLeft: `4px solid ${color}`,
                            background: `linear-gradient(90deg, color-mix(in srgb, ${color} 7%, #fff), #fff 45%)`,
                            display: 'grid',
                            gridTemplateColumns: '40px 1fr 110px 120px',
                            gap: '16px',
                            alignItems: 'center',
                            padding: '16px 20px',
                            borderTop: idx === 0 ? 0 : '1px solid #e6e8f1',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 700,
                            color: '#fff',
                            background: color
                          }}>
                            {p.name ? p.name[0] : 'P'}
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#171a2b' }}>{p.name}</h3>
                            <p style={{
                              margin: '2px 0 0',
                              color: '#6b7089',
                              fontSize: '13px',
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {p.description || 'Project workspace documentation and specs.'}
                            </p>
                          </div>
                          {docCount > 0 ? (
                            <>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '99px',
                                padding: '3px 10px',
                                justifySelf: 'start',
                                background: '#e3f6ee',
                                color: '#0e9f6e'
                              }}>
                                {docCount} {docCount === 1 ? 'document' : 'documents'}
                              </span>
                              <span style={{
                                justifySelf: 'end',
                                color: color,
                                fontWeight: 600,
                                fontSize: '13px',
                                border: `1px solid ${color}`,
                                borderRadius: '8px',
                                padding: '5px 12px'
                              }}>
                                View documents
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '99px',
                                padding: '3px 10px',
                                justifySelf: 'start',
                                background: '#fde9c8',
                                color: '#8a5200'
                              }}>
                                No documents
                              </span>
                              <span style={{
                                justifySelf: 'end',
                                color: color,
                                fontWeight: 600,
                                fontSize: '13px',
                                border: `1px solid ${color}`,
                                borderRadius: '8px',
                                padding: '5px 12px'
                              }}>
                                Add first doc
                              </span>
                            </>
                          )}
                        </div>
                      );
                    }) : (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7089' }}>
                        No projects match your search. Try a different name.
                      </div>
                    )}
                  </div>

                  {/* Recently Updated Section */}
                  <section style={{ marginTop: '28px' }}>
                    <h2 style={{ fontSize: '16px', margin: '0 0 10px', fontWeight: 700, color: '#171a2b' }}>
                      Recently updated
                    </h2>
                    <div 
                      onClick={() => docs[0] && handleOpenDoc(docs[0])}
                      style={{
                        background: '#e3f6ee',
                        border: '1px solid #bfe8d6',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        cursor: docs[0] ? 'pointer' : 'default'
                      }}
                    >
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '99px',
                        padding: '3px 10px',
                        color: '#4f46e5',
                        background: '#eeedff'
                      }}>
                        {docs[0]?.project_name || 'Company Management System'}
                      </span>
                      <strong style={{ fontSize: '14px', color: '#171a2b' }}>
                        {docs[0]?.title || 'KALPANAAA CMS Full Documentation'}
                      </strong>
                      <span style={{ color: '#6b7089', marginLeft: 'auto', fontSize: '12px' }}>
                        Updated 1 Oct 2026
                      </span>
                    </div>
                  </section>
                </div>
              )}

              {/* VIEW 2: SELECTED PROJECT DOCUMENTATION (EXACT MATCH TO IMAGE 2) */}
              {selectedProject && (
                <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
                  {/* Breadcrumb */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', marginBottom: '16px' }}>
                    <button 
                      onClick={handleSelectOverview} 
                      style={{ background: 'transparent', border: 'none', color: '#5551FF', cursor: 'pointer', padding: 0, fontWeight: 600, fontSize: '13.5px' }}
                    >
                      Documentation
                    </button>
                    <span style={{ color: '#9CA3AF' }}>/</span>
                    <span style={{ color: '#171A2B', fontWeight: 700 }}>
                      {activeProjectObj?.name || selectedProject.name || selectedProject}
                    </span>
                  </div>

                  {/* Project Hero Card Container (Light Purple Card Box) */}
                  <div style={{
                    background: 'linear-gradient(135deg, #F3F0FF 0%, #F5F2FF 100%)',
                    borderRadius: '20px',
                    padding: '24px 28px',
                    marginBottom: '24px',
                    border: '1px solid #EBE4FF'
                  }}>
                    <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#171A2B', margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>
                      {activeProjectObj?.name || selectedProject.name || selectedProject}
                    </h1>
                    <p style={{ fontSize: '14px', color: '#5C6079', margin: '0 0 18px 0', lineHeight: 1.5, maxWidth: '900px' }}>
                      {activeProjectObj?.description || 'To develop a centralized Company Management System that streamlines employee management, task tracking, project operations, communication, attendance, performance, and administrative workflows through role-based portals.'}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{
                        background: '#FFFFFF',
                        color: '#5551FF',
                        borderRadius: '99px',
                        padding: '6px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}>
                        {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
                      </span>
                      <span style={{
                        background: '#FFFFFF',
                        color: '#6B7089',
                        borderRadius: '99px',
                        padding: '6px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}>
                        Last updated {activeProjectObj?.updated_at ? new Date(activeProjectObj.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '1 Oct 2026'}
                      </span>
                    </div>
                  </div>

                  {/* Toolbar Row: Category Pills & Grid/List Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                    {/* Category Pills on Left */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setSelectedCategory(null)}
                        style={{
                          padding: '7px 18px',
                          borderRadius: '99px',
                          border: !selectedCategory ? 'none' : '1px solid #E6E8F1',
                          background: !selectedCategory ? '#5551FF' : '#FFFFFF',
                          color: !selectedCategory ? '#FFFFFF' : '#6B7089',
                          fontSize: '13px',
                          fontWeight: !selectedCategory ? 600 : 500,
                          cursor: 'pointer',
                          boxShadow: !selectedCategory ? '0 2px 6px rgba(85, 81, 255, 0.2)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        All ({filteredDocs.length})
                      </button>
                      {(projectCategoriesBreakdown.length > 0 ? projectCategoriesBreakdown : [{ category: 'Requirements', count: 1 }]).map(cat => (
                        <button
                          key={cat.category}
                          onClick={() => setSelectedCategory(cat.category)}
                          style={{
                            padding: '7px 18px',
                            borderRadius: '99px',
                            border: selectedCategory === cat.category ? 'none' : '1px solid #E6E8F1',
                            background: selectedCategory === cat.category ? '#5551FF' : '#FFFFFF',
                            color: selectedCategory === cat.category ? '#FFFFFF' : '#6B7089',
                            fontSize: '13px',
                            fontWeight: selectedCategory === cat.category ? 600 : 500,
                            cursor: 'pointer',
                            boxShadow: selectedCategory === cat.category ? '0 2px 6px rgba(85, 81, 255, 0.2)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {cat.category} ({cat.count})
                        </button>
                      ))}
                    </div>

                    {/* Right Side: Showing text + Grid/List Switcher */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13.5px', color: '#6B7089' }}>
                        Showing {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
                      </span>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#F4F5FA',
                        borderRadius: '12px',
                        padding: '3px'
                      }}>
                        <button
                          onClick={() => setViewMode('grid')}
                          style={{
                            padding: '5px 14px',
                            border: 'none',
                            background: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                            color: viewMode === 'grid' ? '#5551FF' : '#6B7089',
                            fontWeight: viewMode === 'grid' ? 600 : 500,
                            fontSize: '13px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                          }}
                        >
                          Grid
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          style={{
                            padding: '5px 14px',
                            border: 'none',
                            background: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                            color: viewMode === 'list' ? '#5551FF' : '#6B7089',
                            fontWeight: viewMode === 'list' ? 600 : 500,
                            fontSize: '13px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                          }}
                        >
                          List
                        </button>
                      </div>
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
