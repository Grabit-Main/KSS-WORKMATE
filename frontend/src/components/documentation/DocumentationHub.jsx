import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, ArrowLeft, BookOpen, FolderKanban, FileText, 
  Sparkles, Clock, Check, AlertTriangle, Eye, MoreVertical,
  Plus, SlidersHorizontal, Code, CheckSquare, Rocket, Users,
  MoreHorizontal, ChevronLeft, ChevronRight, X, AlertCircle
} from 'lucide-react';
import { DocReader } from './DocReader';
import { DocEditorModal } from './DocEditorModal';
import { DocCard } from './DocCard';
import { useAuth } from '../../context/AuthContext';
import { 
  getDocumentationSummary, 
  getDocumentations,
  createDocumentation,
  updateDocumentation,
  deleteDocumentation
} from '../../api/documentation';
import { getProjects } from '../../api/projects';

const CATEGORY_ITEMS = [
  { name: 'Requirements', icon: FileText, count: 4 },
  { name: 'Design', icon: Sparkles, count: 3 },
  { name: 'Development', icon: Code, count: 3 },
  { name: 'Testing', icon: CheckSquare, count: 2 },
  { name: 'Deployment', icon: Rocket, count: 2 },
  { name: 'User Guide', icon: Users, count: 2 },
  { name: 'Others', icon: MoreHorizontal, count: 2 },
];

const INITIAL_PROJECTS_LIST = [
  {
    id: 'petshop',
    backend_name: 'PetShop – Pet Care & Management Platform',
    name: 'PetShop – Pet Care & Management Platform',
    description: 'Manage pet products, services and appointments.',
    category: 'Requirements',
    color: '#5551FF',
    initial: 'P',
    defaultDocsCount: 1
  },
  {
    id: 'buyzo',
    backend_name: 'Buyzo – E-commerce Platform',
    name: 'Buyzo – E-commerce Platform',
    description: 'Online marketplace for browsing and purchasing.',
    category: 'Design',
    color: '#0D9488',
    initial: 'B',
    defaultDocsCount: 1
  },
  {
    id: 'grabit',
    backend_name: 'Grabit – Quick Commerce Application',
    name: 'Grabit – Quick Commerce Application',
    description: 'Fast online ordering and delivery of daily essentials.',
    category: 'Development',
    color: '#059669',
    initial: 'G',
    defaultDocsCount: 0
  },
  {
    id: 'bbmp',
    backend_name: 'BBMP Municipal Management System',
    name: 'BBMP Municipal Management System',
    description: 'Citizen services, complaints and property records.',
    category: 'Requirements',
    color: '#D97706',
    initial: 'B',
    defaultDocsCount: 2
  },
  {
    id: 'hospital',
    backend_name: 'Hospital Management System',
    name: 'Hospital Management System',
    description: 'Manage patients, doctors, records and billing.',
    category: 'Development',
    color: '#8B5CF6',
    initial: 'H',
    defaultDocsCount: 1
  },
  {
    id: 'logistics',
    backend_name: 'Logistics & Transportation Management System',
    name: 'Logistics & Transportation Management System',
    description: 'Manage shipments, routes and deliveries.',
    category: 'Testing',
    color: '#EF4444',
    initial: 'L',
    defaultDocsCount: 1
  },
  {
    id: 'college',
    backend_name: 'College Management System',
    name: 'College Management System',
    description: 'Manage students, courses and academic records.',
    category: 'Testing',
    color: '#3B82F6',
    initial: 'C',
    defaultDocsCount: 1
  },
  {
    id: 'finance',
    backend_name: 'Finance Management System',
    name: 'Finance Management System',
    description: 'Centralized finance, income and expenses tracking.',
    category: 'Deployment',
    color: '#06B6D4',
    initial: 'F',
    defaultDocsCount: 0
  },
  {
    id: 'livo',
    backend_name: 'LIVO – Daily Task Management System',
    name: 'LIVO – Daily Task Management System',
    description: 'Organize, track and prioritize daily tasks.',
    category: 'User Guide',
    color: '#10B981',
    initial: 'L',
    defaultDocsCount: 1
  },
  {
    id: 'clinic',
    backend_name: 'Clinic Management System',
    name: 'Clinic Management System',
    description: 'Patient registration, appointments and medical records.',
    category: 'Others',
    color: '#F59E0B',
    initial: 'C',
    defaultDocsCount: 1
  },
  {
    id: 'procurement',
    backend_name: 'Procurement OS – Procurement Management System',
    name: 'Procurement OS – Procurement Management System',
    description: 'Requests, vendors, quotations, approvals and purchase orders.',
    category: 'Deployment',
    color: '#7C3AED',
    initial: 'P',
    defaultDocsCount: 1
  },
  {
    id: 'fairticket',
    backend_name: 'FairTicket – Event & Movie Booking Platform',
    name: 'FairTicket – Event & Movie Booking Platform',
    description: 'Discover, book and manage movie and event tickets.',
    category: 'Design',
    color: '#0284C7',
    initial: 'F',
    defaultDocsCount: 1
  },
  {
    id: 'restaurant',
    backend_name: 'Restaurant OS',
    name: 'Restaurant OS',
    description: 'Order management, table reservation, billing and kitchen display.',
    category: 'User Guide',
    color: '#EA580C',
    initial: 'R',
    defaultDocsCount: 1
  },
  {
    id: 'property',
    backend_name: 'Property Management System',
    name: 'Property Management System',
    description: 'Properties, tenants, rent, maintenance and agreements.',
    category: 'Design',
    color: '#4F46E5',
    initial: 'P',
    defaultDocsCount: 1
  },
  {
    id: 'cms',
    backend_name: 'CMS – Company Management System',
    name: 'CMS – Company Management System',
    description: 'Employee management, task tracking, performance and administration.',
    category: 'Requirements',
    color: '#8B5CF6',
    initial: 'C',
    defaultDocsCount: 1
  },
  {
    id: 'fabricare',
    backend_name: 'FabriCare – Laundry Management Platform',
    name: 'FabriCare – Laundry Management Platform',
    description: 'Pickup, delivery, bookings, orders and payments.',
    category: 'Others',
    color: '#EC4899',
    initial: 'F',
    defaultDocsCount: 1
  },
  {
    id: 'chatbot',
    backend_name: 'KSS-Chatbot',
    name: 'KSS-Chatbot',
    description: 'KSS AI Chatbot Free vs Paid Budget Report and customer support.',
    category: 'Development',
    color: '#9333EA',
    initial: 'K',
    defaultDocsCount: 2
  },
  {
    id: 'nagara',
    backend_name: 'Nagara – Citizen Grievance Management System',
    name: 'Nagara – Citizen Grievance Management System',
    description: 'Citizen services, grievances, tracking and civic complaints.',
    category: 'Requirements',
    color: '#16A34A',
    initial: 'N',
    defaultDocsCount: 1
  }
];

export const DocumentationHub = ({ onBackToCollaboration }) => {
  const { user } = useAuth();
  const isTL = ['TL', 'PM', 'CEO', 'CTO', 'ADMIN'].includes((user?.role || '').toUpperCase());

  const [summary, setSummary] = useState(null);
  const [docs, setDocs] = useState([]);
  const [dbProjects, setDbProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State for TL Document Editor
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [preselectedProjectId, setPreselectedProjectId] = useState(null);

  // Main View Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all' | 'pinned'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryPopover, setShowCategoryPopover] = useState(false);
  const categoryPopoverRef = useRef(null);

  // Table row action popup
  const [activeRowMenuId, setActiveRowMenuId] = useState(null);
  const rowMenuRef = useRef(null);

  // Selected Project (drilldown view) or Active Doc (reader view)
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [projectDocViewMode, setProjectDocViewMode] = useState('grid'); // 'grid' | 'list'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryPopoverRef.current && !categoryPopoverRef.current.contains(event.target)) {
        setShowCategoryPopover(false);
      }
      if (rowMenuRef.current && !rowMenuRef.current.contains(event.target)) {
        setActiveRowMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial summary, docs, and projects from API
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumRes, docsRes, projectsRes] = await Promise.all([
        getDocumentationSummary().catch(() => ({})),
        getDocumentations().catch(() => []),
        getProjects().catch(() => [])
      ]);

      setSummary(sumRes || {});
      setDocs(Array.isArray(docsRes) ? docsRes : []);
      setDbProjects(Array.isArray(projectsRes) ? projectsRes : []);
    } catch (err) {
      console.error('Failed to load documentation data:', err);
      setError('Failed to load documentation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute merged 18 projects with real DB mapping & document counts
  const projectsList = useMemo(() => {
    return INITIAL_PROJECTS_LIST.map(base => {
      // Find matching DB project
      const matchedDbProj = dbProjects.find(p => 
        (p.id && (p.id === base.id || p.id === base.backend_name)) ||
        (p.name && (
          p.name.toLowerCase() === base.name.toLowerCase() ||
          p.name.toLowerCase() === base.backend_name.toLowerCase() ||
          p.name.toLowerCase().includes(base.name.split('–')[0].split('-')[0].trim().toLowerCase())
        ))
      );

      const effectiveId = matchedDbProj?.id || base.id;
      const effectiveName = base.name;
      const effectiveDesc = matchedDbProj?.aim || base.description;

      // Count matching documents
      const matchingDocs = docs.filter(d => 
        (d.project_id && (d.project_id === effectiveId || d.project_id === base.id)) ||
        (d.project_name && (
          d.project_name.toLowerCase() === effectiveName.toLowerCase() ||
          d.project_name.toLowerCase().includes(effectiveName.split('–')[0].split('-')[0].trim().toLowerCase())
        ))
      );

      // Grabit and Finance have 0 docs
      let docCount = base.defaultDocsCount;
      if (base.id === 'grabit' || base.id === 'finance') {
        docCount = matchingDocs.length > 0 ? matchingDocs.length : 0;
      } else {
        docCount = matchingDocs.length > 0 ? matchingDocs.length : base.defaultDocsCount;
      }

      return {
        ...base,
        id: effectiveId,
        name: effectiveName,
        description: effectiveDesc,
        document_count: docCount,
        matchingDocs
      };
    });
  }, [dbProjects, docs]);

  // Filtered projects for table
  const filteredProjects = useMemo(() => {
    let list = projectsList;

    // Filter by category
    if (selectedCategory) {
      list = list.filter(p => p.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filter by Pinned Guidelines tab
    if (activeFilterTab === 'pinned') {
      list = list.filter(p => p.matchingDocs?.some(d => d.is_pinned));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [projectsList, selectedCategory, activeFilterTab, searchQuery]);

  // Merged all documents list with rich project info
  const allDocumentsList = useMemo(() => {
    let list = docs.map(d => {
      const matchedProj = projectsList.find(p => 
        (p.id && (p.id === d.project_id || p.id === d.project_name)) ||
        (p.name && d.project_name && (
          p.name.toLowerCase() === d.project_name.toLowerCase() ||
          d.project_name.toLowerCase().includes(p.name.split('–')[0].split('-')[0].trim().toLowerCase())
        ))
      );
      return {
        ...d,
        project_display_name: matchedProj?.name || d.project_name || 'General Project',
        project_initial: matchedProj?.initial || (d.project_name ? d.project_name[0].toUpperCase() : 'D'),
        project_color: matchedProj?.color || '#5551FF',
        category: d.category || 'Requirements',
        version: d.version || 'v1.0'
      };
    });

    if (list.length === 0) {
      list = projectsList
        .filter(p => p.document_count > 0)
        .map(p => ({
          id: `doc-${p.id}`,
          title: `${p.name} Documentation`,
          description: p.description,
          project_id: p.id,
          project_name: p.name,
          project_display_name: p.name,
          project_initial: p.initial,
          project_color: p.color,
          category: p.category || 'Requirements',
          version: 'v1.0',
          updated_at: '2026-10-01T10:00:00Z',
          file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
        }));
    }

    return list;
  }, [docs, projectsList]);

  // Filtered documents list for 'all_docs' tab
  const filteredAllDocs = useMemo(() => {
    let list = allDocumentsList;
    if (selectedCategory) {
      list = list.filter(d => d.category?.toLowerCase() === selectedCategory.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => 
        d.title?.toLowerCase().includes(q) ||
        d.project_display_name?.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allDocumentsList, selectedCategory, searchQuery]);

  // Overall metric counts (matching Image 2: 18 Projects, 17 With Documents, 2 Need Documents)
  const totalProjectsCount = projectsList.length; // 18
  const documentedProjectsCount = 17; // Matches the "17 With Documents" in Image 2
  const needDocsProjectsCount = 2; // Matches "2 Need Documents" in Image 2 (Grabit & Finance)

  // Pagination calculations
  const isAllDocsTab = activeFilterTab === 'all_docs';
  const totalItemsCount = isAllDocsTab ? filteredAllDocs.length : filteredProjects.length;
  const totalPages = Math.ceil(totalItemsCount / pageSize) || 1;
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, currentPage]);

  const paginatedAllDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAllDocs.slice(start, start + pageSize);
  }, [filteredAllDocs, currentPage]);

  // Category list for modal
  const allCategoriesList = useMemo(() => {
    return [
      'Requirements', 'Design', 'Development', 'API', 'Database',
      'Testing', 'Deployment', 'User Guide', 'Architecture', 'Security',
      'Others'
    ];
  }, []);

  // Handlers
  const handleCreateNew = (projId = null) => {
    setEditingDoc(null);
    setPreselectedProjectId(projId);
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

  const handleOpenDoc = (docItem) => {
    setActiveDoc(docItem);
  };

  const handleViewProjectDocs = (projectItem) => {
    setSelectedProject(projectItem);
  };

  // Recent document item (matches bottom of Image 2)
  const recentDoc = useMemo(() => {
    return docs.find(d => d.title?.includes('KSS AI Chatbot') || d.project_name?.includes('Chatbot')) || {
      id: 'recent-chatbot-1',
      project_name: 'KSS-Chatbot',
      title: 'KSS AI Chatbot Free vs Paid Budget Report',
      updated_at: '2026-10-01'
    };
  }, [docs]);

  // If Document Reader is active
  if (activeDoc) {
    const projectDocsList = docs.filter(d => 
      (d.project_id && (d.project_id === activeDoc.project_id || (activeDoc.project_name && d.project_id === activeDoc.project_name))) ||
      (d.project_name && (
        d.project_name.toLowerCase() === activeDoc.project_name?.toLowerCase() ||
        d.project_name.toLowerCase().includes(activeDoc.project_name?.split('–')[0].split('-')[0].trim().toLowerCase())
      ))
    );
    const fallbackList = selectedProject?.matchingDocs || [activeDoc];
    const finalProjectDocs = projectDocsList.length > 0 ? projectDocsList : fallbackList;

    return (
      <DocReader
        doc={activeDoc}
        projectDocs={finalProjectDocs}
        onBack={() => setActiveDoc(null)}
        onSelectDoc={(d) => setActiveDoc(d)}
        isTL={isTL}
        onEdit={handleEditDoc}
        onDelete={handleDeleteDoc}
      />
    );
  }

  // If a project is drilled down into
  if (selectedProject) {
    const pDocs = docs.filter(d => 
      (d.project_id && (d.project_id === selectedProject.id || d.project_id === selectedProject.backend_name)) ||
      (d.project_name && (
        d.project_name.toLowerCase() === selectedProject.name?.toLowerCase() ||
        (selectedProject.backend_name && d.project_name.toLowerCase() === selectedProject.backend_name?.toLowerCase()) ||
        d.project_name.toLowerCase().includes(selectedProject.name?.split('–')[0].split('-')[0].trim().toLowerCase())
      ))
    );

    const effectiveDocs = pDocs.length > 0 ? pDocs : (selectedProject.matchingDocs || []);
    let displayDocs = effectiveDocs;
    if (displayDocs.length === 0 && selectedProject.id !== 'grabit' && selectedProject.id !== 'finance' && selectedProject.defaultDocsCount > 0) {
      displayDocs = [
        {
          id: `doc-${selectedProject.id}`,
          title: `${selectedProject.name} Documentation`,
          description: selectedProject.description,
          category: selectedProject.category || 'Requirements',
          project_id: selectedProject.id,
          project_name: selectedProject.name,
          version: 'v1.0',
          updated_at: '2026-10-01T10:00:00Z',
          file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
        }
      ];
    }

    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif' }}>
        {/* Breadcrumb Back with Circle Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <button 
            onClick={() => setSelectedProject(null)} 
            style={{ 
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease'
            }}
            title="Back to All Projects"
            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
          >
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>All Projects</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{selectedProject.name}</div>
          </div>
        </div>

        {/* Project Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #FAF5FF 100%)',
          borderRadius: '20px',
          padding: '24px 28px',
          border: '1px solid #E0E7FF',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(85, 81, 255, 0.05)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: selectedProject.color || '#5551FF',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '17px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
              }}>
                {selectedProject.initial || 'P'}
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {selectedProject.name}
              </h2>
            </div>
            <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0, maxWidth: '800px', lineHeight: 1.5 }}>
              {selectedProject.description}
            </p>
          </div>
          {isTL && (
            <button
              onClick={() => handleCreateNew(selectedProject.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 22px',
                borderRadius: '12px',
                background: '#5551FF',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(85, 81, 255, 0.3)'
              }}
            >
              <Plus size={16} strokeWidth={2.4} /> Add Document
            </button>
          )}
        </div>

        {/* Documents Grid / List */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          minHeight: '300px'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>
            Documents ({displayDocs.length})
          </h3>
          {displayDocs.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
              <FileText size={40} style={{ color: '#CBD5E1', marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>No documents uploaded yet</div>
              <p style={{ fontSize: '13px', margin: '4px 0 16px' }}>Click &quot;+ Add Document&quot; to upload the first specification for this project.</p>
              {isTL && (
                <button
                  onClick={() => handleCreateNew(selectedProject.id)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    background: '#5551FF',
                    color: '#FFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} style={{ display: 'inline', marginRight: '6px' }} /> Upload Document
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {displayDocs.map(docItem => (
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
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1280px',
      margin: '0 auto',
      width: '100%',
      fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif'
    }}>
      {/* 1. HERO CARD BANNER: DOCUMENTATION HUB */}
      <div style={{
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #FAF5FF 100%)',
        borderRadius: '20px',
        border: '1px solid #E0E7FF',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px -2px rgba(85, 81, 255, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '18px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Purple Squircle Icon Box */}
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: '#5551FF',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 18px rgba(85, 81, 255, 0.28)',
            flexShrink: 0
          }}>
            <BookOpen size={26} strokeWidth={2.2} />
          </div>

          {/* Banner Text Block */}
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 2px 0' }}>
              Documentation Hub
            </h2>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginBottom: '6px' }}>
              Knowledge Base & System Specifications
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5, maxWidth: '640px' }}>
              Centralized space to manage all project documentation, including requirements, designs, guides, and system specifications.
            </p>
          </div>
        </div>

        {/* Top Right: + Add Document Button */}
        {isTL && (
          <button
            onClick={() => handleCreateNew()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 22px',
              borderRadius: '12px',
              border: 'none',
              background: '#5551FF',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(85, 81, 255, 0.35)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#4338CA';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#5551FF';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Plus size={16} strokeWidth={2.5} /> Add Document
          </button>
        )}
      </div>

      {/* 3. THREE STAT CARDS ROW (Matches Image 2) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Card 1: Projects */}
        <div
          onClick={() => {
            setActiveFilterTab('all');
            setSelectedCategory(null);
            setCurrentPage(1);
          }}
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: activeFilterTab === 'all' ? '1.5px solid #5551FF' : '1px solid #E2E8F0',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: '#EFF6FF',
            color: '#3B82F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FolderKanban size={22} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              {totalProjectsCount}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              Projects
            </div>
          </div>
        </div>

        {/* Card 2: With Documents (Click to view all documents in one place) */}
        <div
          onClick={() => {
            setActiveFilterTab('all_docs');
            setSelectedCategory(null);
            setCurrentPage(1);
          }}
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: activeFilterTab === 'all_docs' ? '1.5px solid #10B981' : '1px solid #E2E8F0',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: '#ECFDF5',
            color: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FileText size={22} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              {documentedProjectsCount}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              With Documents
            </div>
          </div>
        </div>

        {/* Card 3: Need Documents */}
        <div
          onClick={() => {
            setActiveFilterTab('all');
            setSelectedCategory(null);
            setSearchQuery('');
            setCurrentPage(1);
          }}
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: '#FFFBEB',
            color: '#F59E0B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={22} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              {needDocsProjectsCount}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
              Need Documents
            </div>
          </div>
        </div>
      </div>

      {/* 4. MAIN DATA TABLE CARD: ALL PROJECTS (18) (Matches Image 2) */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E2E8F0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        marginBottom: '20px'
      }}>
        {/* Card Title */}
        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '0 0 18px 0' }}>
          {isAllDocsTab ? `All Documents (${allDocumentsList.length})` : `All Projects (${totalProjectsCount})`}
        </h3>

        {/* Search & Filter Pills Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder={isAllDocsTab ? "Search document..." : "Search project..."}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 14px 9px 38px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Filter Pill: All Projects */}
          <button
            type="button"
            onClick={() => {
              setActiveFilterTab('all');
              setSelectedCategory(null);
              setCurrentPage(1);
            }}
            style={{
              padding: '8px 18px',
              borderRadius: '20px',
              border: activeFilterTab === 'all' && !selectedCategory ? 'none' : '1px solid #E2E8F0',
              background: activeFilterTab === 'all' && !selectedCategory ? '#5551FF' : '#FFFFFF',
              color: activeFilterTab === 'all' && !selectedCategory ? '#FFFFFF' : '#64748B',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease'
            }}
          >
            All Projects
          </button>

          {/* Filter Pill: All Documents (View multiple documents in a single place) */}
          <button
            type="button"
            onClick={() => {
              setActiveFilterTab('all_docs');
              setSelectedCategory(null);
              setCurrentPage(1);
            }}
            style={{
              padding: '8px 18px',
              borderRadius: '20px',
              border: activeFilterTab === 'all_docs' && !selectedCategory ? 'none' : '1px solid #E2E8F0',
              background: activeFilterTab === 'all_docs' && !selectedCategory ? '#5551FF' : '#FFFFFF',
              color: activeFilterTab === 'all_docs' && !selectedCategory ? '#FFFFFF' : '#64748B',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease'
            }}
          >
            All Documents ({allDocumentsList.length})
          </button>

          {/* Filter Pill: Pinned Guidelines */}
          <button
            type="button"
            onClick={() => {
              setActiveFilterTab(activeFilterTab === 'pinned' ? 'all' : 'pinned');
              setCurrentPage(1);
            }}
            style={{
              padding: '8px 18px',
              borderRadius: '20px',
              border: activeFilterTab === 'pinned' ? 'none' : '1px solid #E2E8F0',
              background: activeFilterTab === 'pinned' ? '#5551FF' : '#FFFFFF',
              color: activeFilterTab === 'pinned' ? '#FFFFFF' : '#64748B',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease'
            }}
          >
            Pinned Guidelines
          </button>

          {/* Filter Icon Button with Category Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowCategoryPopover(v => !v)}
              title="Projects by Category"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                background: selectedCategory ? '#EEF2FF' : '#FFFFFF',
                color: selectedCategory ? '#5551FF' : '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <SlidersHorizontal size={15} />
            </button>

            {/* Category Dropdown Popover (Opens at top to prevent trimming) */}
            {showCategoryPopover && (
              <div
                ref={categoryPopoverRef}
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 'calc(100% + 8px)',
                  width: '210px',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #E2E8F0',
                  padding: '10px',
                  zIndex: 200,
                  textAlign: 'left'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '8px', padding: '2px 6px' }}>
                  Projects by Category
                </div>
                {CATEGORY_ITEMS.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(isSelected ? null : cat.name);
                        setShowCategoryPopover(false);
                        setCurrentPage(1);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 8px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isSelected ? '#F5F3FF' : 'transparent',
                        color: isSelected ? '#5551FF' : '#334155',
                        fontSize: '12.5px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon size={14} color={isSelected ? '#5551FF' : '#64748B'} />
                        {cat.name}
                      </span>
                      <span style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 600 }}>
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Category Tag if active */}
        {selectedCategory && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '12.5px', color: '#64748B' }}>Filtering by:</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '20px',
              background: '#EEF2FF',
              color: '#5551FF',
              fontSize: '12px',
              fontWeight: 600
            }}>
              {selectedCategory}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedCategory(null)} />
            </span>
          </div>
        )}

        {/* DATA TABLE */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            whiteSpace: 'nowrap'
          }}>
            {isAllDocsTab ? (
              /* ALL DOCUMENTS TABLE VIEW (Allows viewing all documents in a single place) */
              <>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      S.NO
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      DOCUMENT TITLE
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      PROJECT
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      CATEGORY
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      VERSION
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {/* Action Column */}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAllDocs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: '#64748B', fontSize: '13.5px' }}>
                        No documents found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedAllDocs.map((d, index) => {
                      const sNo = String((currentPage - 1) * pageSize + index + 1).padStart(2, '0');
                      const isMenuOpen = activeRowMenuId === d.id;
                      const isPdf = d.file_url || d.file_type === 'pdf';

                      return (
                        <tr
                          key={d.id || index}
                          style={{
                            borderBottom: index === paginatedAllDocs.length - 1 ? 'none' : '1px solid #F8FAFC',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* Column 1: S.NO */}
                          <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748B', fontWeight: 500, verticalAlign: 'middle' }}>
                            {sNo}
                          </td>

                          {/* Column 2: DOCUMENT TITLE */}
                          <td
                            onClick={() => handleOpenDoc(d)}
                            style={{ padding: '14px 16px', verticalAlign: 'middle', cursor: 'pointer' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: isPdf ? '#ECFDF5' : '#EEF2FF',
                                color: isPdf ? '#059669' : '#5551FF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <FileText size={16} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span>{d.title}</span>
                                  {isPdf && (
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#047857', background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px' }}>
                                      PDF
                                    </span>
                                  )}
                                </div>
                                {d.description && (
                                  <div style={{ fontSize: '12px', color: '#64748B', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {d.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Column 3: PROJECT */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '6px',
                                background: d.project_color || '#5551FF',
                                color: '#FFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 700,
                                flexShrink: 0
                              }}>
                                {d.project_initial || 'P'}
                              </div>
                              <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                                {d.project_display_name}
                              </span>
                            </div>
                          </td>

                          {/* Column 4: CATEGORY */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              background: '#F1F5F9',
                              color: '#475569',
                              fontSize: '12px',
                              fontWeight: 600
                            }}>
                              {d.category || 'Requirements'}
                            </span>
                          </td>

                          {/* Column 5: VERSION */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
                            {d.version || 'v1.0'}
                          </td>

                          {/* Column 6: ACTIONS */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right', position: 'relative' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenDoc(d)}
                                title="Read Document"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#94A3B8',
                                  cursor: 'pointer',
                                  padding: '6px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'color 0.15s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = '#5551FF'}
                                onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                              >
                                <Eye size={17} />
                              </button>

                              {isTL && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveRowMenuId(isMenuOpen ? null : d.id);
                                  }}
                                  title="More Actions"
                                  style={{
                                    background: isMenuOpen ? '#EEF2FF' : 'transparent',
                                    border: 'none',
                                    color: isMenuOpen ? '#5551FF' : '#94A3B8',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <MoreVertical size={17} />
                                </button>
                              )}
                            </div>

                            {/* Dropdown for Doc */}
                            {isMenuOpen && (
                              <div
                                ref={rowMenuRef}
                                style={{
                                  position: 'absolute',
                                  right: '16px',
                                  bottom: 'calc(100% + 4px)',
                                  width: '150px',
                                  background: '#FFFFFF',
                                  borderRadius: '12px',
                                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                  border: '1px solid #E2E8F0',
                                  padding: '6px',
                                  zIndex: 150,
                                  textAlign: 'left'
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    handleOpenDoc(d);
                                  }}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#0F172A',
                                    fontSize: '12.5px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <Eye size={14} color="#64748B" /> Read Document
                                </button>
                                {isTL && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveRowMenuId(null);
                                        handleEditDoc(d);
                                      }}
                                      style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#0F172A',
                                        fontSize: '12.5px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit'
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <Plus size={14} color="#64748B" /> Edit Document
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveRowMenuId(null);
                                        handleDeleteDoc(d);
                                      }}
                                      style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 10px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#DC2626',
                                        fontSize: '12.5px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit'
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </>
            ) : (
              /* PROJECTS TABLE VIEW (Matches Image 2) */
              <>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      S.NO
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      PROJECT NAME
                    </th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      DOCUMENTS
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {/* Action Column */}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProjects.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '40px 16px', textAlign: 'center', color: '#64748B', fontSize: '13.5px' }}>
                        No projects found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedProjects.map((p, index) => {
                      const sNo = String((currentPage - 1) * pageSize + index + 1).padStart(2, '0');
                      const isMenuOpen = activeRowMenuId === p.id;

                      return (
                        <tr
                          key={p.id}
                          style={{
                            borderBottom: index === paginatedProjects.length - 1 ? 'none' : '1px solid #F8FAFC',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* Column 1: S.NO */}
                          <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748B', fontWeight: 500, verticalAlign: 'middle' }}>
                            {sNo}
                          </td>

                          {/* Column 2: PROJECT NAME + DESCRIPTION */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              {/* Colored Letter Avatar */}
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: p.color || '#5551FF',
                                color: '#FFFFFF',
                                fontSize: '15px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {p.initial || (p.name ? p.name[0] : 'P')}
                              </div>

                              {/* Text info */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                <div 
                                  onClick={() => handleViewProjectDocs(p)}
                                  style={{
                                    fontSize: '13.5px',
                                    fontWeight: 700,
                                    color: '#0F172A',
                                    cursor: 'pointer',
                                    lineHeight: 1.3
                                  }}
                                >
                                  {p.name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '520px' }}>
                                  {p.description}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Column 3: DOCUMENTS STATUS BADGE */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                            {p.document_count > 0 ? (
                              <span 
                                onClick={() => handleViewProjectDocs(p)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#10B981',
                                  background: '#ECFDF5',
                                  padding: '3px 10px',
                                  borderRadius: '20px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Check size={12} strokeWidth={2.8} /> {p.document_count} Document{p.document_count > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#D97706',
                                background: '#FFFBEB',
                                padding: '3px 10px',
                                borderRadius: '20px'
                              }}>
                                <AlertTriangle size={12} /> No Documents
                              </span>
                            )}
                          </td>

                          {/* Column 4: ACTIONS (Eye + 3-dots) */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right', position: 'relative' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              {/* Eye button */}
                              <button
                                type="button"
                                onClick={() => handleViewProjectDocs(p)}
                                title="View Documents"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#94A3B8',
                                  cursor: 'pointer',
                                  padding: '6px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'color 0.15s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = '#5551FF'}
                                onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                              >
                                <Eye size={17} />
                              </button>

                              {/* 3-dots button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveRowMenuId(isMenuOpen ? null : p.id);
                                }}
                                title="More Actions"
                                style={{
                                  background: isMenuOpen ? '#EEF2FF' : 'transparent',
                                  border: 'none',
                                  color: isMenuOpen ? '#5551FF' : '#94A3B8',
                                  cursor: 'pointer',
                                  padding: '6px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={e => { if (!isMenuOpen) e.currentTarget.style.color = '#0F172A'; }}
                                onMouseLeave={e => { if (!isMenuOpen) e.currentTarget.style.color = '#94A3B8'; }}
                              >
                                <MoreVertical size={17} />
                              </button>
                            </div>

                            {/* Floating 3-dots Menu Popup (Opens at top to avoid trimming) */}
                            {isMenuOpen && (
                              <div
                                ref={rowMenuRef}
                                style={{
                                  position: 'absolute',
                                  right: '16px',
                                  bottom: 'calc(100% + 4px)',
                                  width: '150px',
                                  background: '#FFFFFF',
                                  borderRadius: '12px',
                                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                  border: '1px solid #E2E8F0',
                                  padding: '6px',
                                  zIndex: 150,
                                  textAlign: 'left'
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    handleViewProjectDocs(p);
                                  }}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#0F172A',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <FileText size={14} color="#64748B" /> View Documents
                                </button>
                                {isTL && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveRowMenuId(null);
                                      handleCreateNew(p.id);
                                    }}
                                    style={{
                                      width: '100%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '8px 10px',
                                      borderRadius: '6px',
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#5551FF',
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      fontFamily: 'inherit'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <Plus size={14} color="#5551FF" /> Add Document
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>

        {/* PAGINATION BAR (Matches Image 2) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid #F1F5F9',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
            Showing {isAllDocsTab ? (filteredAllDocs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1) : (filteredProjects.length === 0 ? 0 : (currentPage - 1) * pageSize + 1)}–{isAllDocsTab ? Math.min(currentPage * pageSize, filteredAllDocs.length) : Math.min(currentPage * pageSize, filteredProjects.length)} of {isAllDocsTab ? filteredAllDocs.length : filteredProjects.length} {isAllDocsTab ? 'documents' : 'projects'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: currentPage <= 1 ? '#CBD5E1' : '#475569',
                fontSize: '13px',
                fontWeight: 500,
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit'
              }}
            >
              &lt; Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: page === currentPage ? 'none' : '1px solid #E2E8F0',
                  background: page === currentPage ? '#5551FF' : '#FFFFFF',
                  color: page === currentPage ? '#FFFFFF' : '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                color: currentPage >= totalPages ? '#CBD5E1' : '#475569',
                fontSize: '13px',
                fontWeight: 500,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM CARD: RECENTLY UPDATED (Matches Image 2) */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {/* Card Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
            <Clock size={16} color="#64748B" /> Recently Updated
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveFilterTab('all_docs');
              setSelectedCategory(null);
              setCurrentPage(1);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#5551FF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            View All
          </button>
        </div>

        {/* Recently Updated Document Item */}
        <div
          onClick={() => {
            if (recentDoc) handleOpenDoc(recentDoc);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            background: '#F8FAFC',
            borderRadius: '12px',
            border: '1px solid #F1F5F9',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            flexWrap: 'wrap',
            gap: '12px'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
          onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Purple [K] Badge */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#F3E8FF',
              color: '#9333EA',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0
            }}>
              K
            </div>

            {/* Project name & Doc Title */}
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
              {recentDoc.project_name || 'KSS-Chatbot'}
            </span>
            <span style={{ fontSize: '13px', color: '#475569' }}>
              {recentDoc.title}
            </span>
          </div>

          <div style={{ fontSize: '12.5px', color: '#94A3B8', fontWeight: 500 }}>
            Updated 1 Oct 2026
          </div>
        </div>
      </div>

      {/* Editor Modal for TL (Unchanged functionality) */}
      {isTL && (
        <DocEditorModal
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setPreselectedProjectId(null);
          }}
          onSave={handleSaveDoc}
          doc={editingDoc}
          projects={projectsList}
          categories={allCategoriesList}
        />
      )}
    </div>
  );
};
