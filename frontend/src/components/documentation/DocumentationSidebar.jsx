import React, { useState } from 'react';
import { 
  ChevronDown, ChevronRight, Folder, FileText, Lightbulb
} from 'lucide-react';

export const DocumentationSidebar = ({
  projects = [],
  selectedView,
  selectedProject,
  selectedCategory,
  onSelectOverview,
  onSelectProject,
  onSelectCategory,
  onSelectPinned
}) => {
  const [isDocTreeExpanded, setIsDocTreeExpanded] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState({
    'Company Management System': true
  });

  const toggleProjectExpand = (projName, e) => {
    e.stopPropagation();
    setExpandedProjects(prev => ({
      ...prev,
      [projName]: !prev[projName]
    }));
  };

  const defaultProjectList = [
    { id: 'cms', name: 'Company Management System', document_count: 5 },
    { id: 'college', name: 'College Management System', document_count: 2 },
    { id: 'finance', name: 'Finance Management System', document_count: 2 },
    { id: 'hospital', name: 'Hospital Management System', document_count: 1 },
    { id: 'bbmp', name: 'BBMP Municipal Management', document_count: 1 },
    { id: 'grabit', name: 'GRABIT - Quick Commerce App', document_count: 2 },
    { id: 'lundrix', name: 'Lundrix - Laundry Management', document_count: 1 },
    { id: 'property', name: 'Property Management System', document_count: 1 }
  ];

  const activeProjectList = projects.length > 0 ? projects : defaultProjectList;

  const cmsSubItems = [
    { title: 'Project Overview', count: 1, category: 'Overview' },
    { title: 'Tech Stack & Architecture', count: 1, category: 'Technical' },
    { title: 'API Documentation', count: 2, category: 'Technical' },
    { title: 'Design Files', count: 1, category: 'Design' },
    { title: 'Meeting Notes', count: 0, category: 'Meeting Notes' }
  ];

  return (
    <aside style={{
      width: '280px',
      flexShrink: 0,
      background: '#FFFFFF',
      borderRadius: '16px',
      border: '1px solid #E5E7EB',
      display: 'flex',
      flexDirection: 'column',
      height: 'fit-content',
      overflow: 'hidden',
      padding: '20px 16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      {/* Scrollable Tree Container */}
      <div style={{ overflowY: 'auto', paddingRight: '2px' }}>
        {/* Project Documentation Section Header */}
        <div 
          onClick={() => setIsDocTreeExpanded(!isDocTreeExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 4px',
            cursor: 'pointer',
            color: '#1E1B4B',
            fontSize: '13.5px',
            fontWeight: 700
          }}
        >
          {isDocTreeExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <Folder size={16} style={{ color: '#5551FF' }} />
          <span>Project Documentation</span>
        </div>

        {isDocTreeExpanded && (
          <div style={{ paddingLeft: '14px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* All Documents item */}
            <div
              onClick={onSelectOverview}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '10px',
                background: selectedView === 'overview' && !selectedProject && !selectedCategory ? '#EEF2FF' : 'transparent',
                color: selectedView === 'overview' && !selectedProject && !selectedCategory ? '#5551FF' : '#4B5563',
                fontWeight: selectedView === 'overview' && !selectedProject && !selectedCategory ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={15} style={{ color: selectedView === 'overview' ? '#5551FF' : '#9CA3AF' }} />
                <span>All Documents</span>
              </div>
              <span style={{ fontSize: '11.5px', color: selectedView === 'overview' ? '#5551FF' : '#6B7280', fontWeight: 600 }}>15</span>
            </div>

            {/* Render Tree Projects */}
            {activeProjectList.map((proj) => {
              const isCMS = proj.name === 'Company Management System';
              const isExpanded = expandedProjects[proj.name];
              const isSelected = selectedProject === proj.id || selectedProject === proj.name;

              return (
                <div key={proj.id || proj.name}>
                  {/* Folder Item */}
                  <div
                    onClick={() => {
                      onSelectProject(proj.id, proj.name);
                      if (isCMS) {
                        setExpandedProjects(prev => ({ ...prev, [proj.name]: !prev[proj.name] }));
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      background: isSelected && !selectedCategory ? '#EEF2FF' : 'transparent',
                      color: isSelected ? '#5551FF' : '#374151',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      <span 
                        onClick={(e) => toggleProjectExpand(proj.name, e)}
                        style={{ display: 'inline-flex', alignItems: 'center', color: '#9CA3AF' }}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                      <Folder size={15} style={{ color: isSelected ? '#5551FF' : '#9CA3AF', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj.name}</span>
                    </div>
                    <span style={{ fontSize: '11.5px', color: isSelected ? '#5551FF' : '#9CA3AF', fontWeight: 600, marginLeft: '6px', flexShrink: 0 }}>
                      {proj.document_count || (isCMS ? 5 : 2)}
                    </span>
                  </div>

                  {/* Nested Sub-items under Company Management System if expanded */}
                  {isCMS && isExpanded && (
                    <div style={{ paddingLeft: '28px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {cmsSubItems.map((sub) => {
                        const isSubSelected = selectedCategory === sub.category;
                        return (
                          <div
                            key={sub.title}
                            onClick={() => onSelectCategory(sub.category)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: isSubSelected ? '#EEF2FF' : 'transparent',
                              color: isSubSelected ? '#5551FF' : '#6B7280',
                              fontSize: '12.5px',
                              fontWeight: isSubSelected ? 600 : 400,
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                              <FileText size={14} style={{ color: isSubSelected ? '#5551FF' : '#9CA3AF', flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.title}</span>
                            </div>
                            <span style={{ fontSize: '11px', color: isSubSelected ? '#5551FF' : '#9CA3AF', fontWeight: 500 }}>{sub.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Help Card ("Need something specific?") */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #F5F7FF 0%, #EFF4FF 100%)',
        border: '1px solid #E0E7FF',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(85, 81, 255, 0.12)',
          flexShrink: 0
        }}>
          <Lightbulb size={17} style={{ color: '#5551FF' }} />
        </div>
        <div>
          <h5 style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E1B4B', margin: '0 0 4px 0' }}>
            Need something specific?
          </h5>
          <p style={{ fontSize: '11.5px', color: '#6B7280', margin: 0, lineHeight: 1.45 }}>
            Use search or filter to quickly find the document you need.
          </p>
        </div>
      </div>
    </aside>
  );
};


