import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  X, Mail, Phone, MapPin, Calendar, Briefcase, CheckCircle2,
  Clock, AlertCircle, Layers, FolderGit2, Sparkles, ExternalLink
} from 'lucide-react';
import { getAllAssignedProjectsForEmployee } from '../../services/projectAssignmentsService';

export default function EmployeeProfileModal({
  isOpen,
  onClose,
  employee,
  projects = [],
  tasks = [],
  loading = false,
  error = null
}) {
  const modalRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Trap focus inside modal for accessibility
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      const handleTabKey = (e) => {
        if (e.key !== 'Tab') return;
        const focusable = Array.from(focusableElements);
        if (focusable.length === 0) return;
        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      const currentModal = modalRef.current;
      currentModal.addEventListener('keydown', handleTabKey);
      return () => currentModal.removeEventListener('keydown', handleTabKey);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Resolve target employee identity
  const empId = String(employee?.id || employee?.user_id || '');
  const empEmail = (employee?.email || '').toLowerCase();
  const empName = employee?.full_name || `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || employee?.email || 'Team Member';
  const empRole = String(employee?.role || 'Developer').trim();
  const empDept = employee?.department || 'Engineering';
  const initialLetter = empName ? empName.trim()[0].toUpperCase() : 'E';

  // Status computation
  const empStatus = useMemo(() => {
    if (employee?.status) {
      const s = String(employee.status).toLowerCase();
      if (s.includes('progress') || s.includes('busy')) return { label: 'In Progress', color: '#F59E0B', bg: '#FEF3C7' };
      if (s.includes('leave') || s.includes('away') || s.includes('off')) return { label: 'On Leave', color: '#64748B', bg: '#F1F5F9' };
      return { label: 'Active', color: '#10B981', bg: '#D1FAE5' };
    }
    if (employee?.online === false) return { label: 'On Leave', color: '#64748B', bg: '#F1F5F9' };
    const hash = String(empId || empName).charCodeAt(0) % 3;
    if (hash === 1) return { label: 'In Progress', color: '#F59E0B', bg: '#FEF3C7' };
    return { label: 'Active', color: '#10B981', bg: '#D1FAE5' };
  }, [employee, empId, empName]);

  // Contact info
  const phone = employee?.phone || '+91 98765 43210';
  const location = employee?.location || 'Bangalore, India';
  const joinedDate = employee?.created_at
    ? new Date(employee.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '12 Jan 2026';

  // Skill chips derivation
  const skillsList = useMemo(() => {
    if (employee?.skills && Array.isArray(employee.skills) && employee.skills.length > 0) {
      return employee.skills;
    }
    const roleLow = empRole.toLowerCase();
    const deptLow = empDept.toLowerCase();

    if (roleLow.includes('ceo') || roleLow.includes('cto') || roleLow.includes('executive')) {
      return ['Strategic Leadership', 'Executive Direction', 'Architecture', 'Team Scaling', 'Governance'];
    }
    if (roleLow.includes('pm') || deptLow.includes('project') || deptLow.includes('operations')) {
      return ['Sprint Planning', 'Agile / Scrum', 'Roadmap Management', 'Risk Assessment', 'Stakeholder Communication'];
    }
    if (roleLow.includes('tl') || deptLow.includes('lead')) {
      return ['Technical Leadership', 'Code Reviews', 'System Architecture', 'Mentorship', 'Delivery Oversight'];
    }
    if (deptLow.includes('design') || roleLow.includes('design') || roleLow.includes('ui/ux')) {
      return ['Design Systems', 'Figma', 'UI/UX', 'Wireframing', 'User Research', 'Interactive Prototypes'];
    }
    if (deptLow.includes('frontend') || roleLow.includes('frontend')) {
      return ['React.js', 'TypeScript', 'Tailwind CSS', 'Vite', 'State Management', 'Responsive Design'];
    }
    if (deptLow.includes('backend') || roleLow.includes('backend')) {
      return ['Python', 'FastAPI', 'PostgreSQL', 'RESTful APIs', 'Database Optimization', 'Docker'];
    }
    if (deptLow.includes('qa') || roleLow.includes('qa') || deptLow.includes('quality')) {
      return ['Test Automation', 'Selenium', 'Manual QA', 'Regression Testing', 'API Verification'];
    }
    return ['Productivity', 'Problem Solving', 'Teamwork', 'Communication', 'Ownership'];
  }, [employee, empRole, empDept]);

  const [syncVersion, setSyncVersion] = useState(0);

  useEffect(() => {
    const handleSync = () => setSyncVersion(v => v + 1);
    window.addEventListener('workmate_projects_updated', handleSync);
    return () => window.removeEventListener('workmate_projects_updated', handleSync);
  }, []);

  // Company Projects where this person participates (strictly manual TL assignments)
  const assignedProjects = useMemo(() => {
    if (!empId && !empEmail) return [];
    return getAllAssignedProjectsForEmployee(empId, empEmail);
  }, [empId, empEmail, syncVersion]);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return String(dateStr);
    }
  };

  // Project role helper
  const getProjectMemberRole = (p) => {
    if (String(p.lead_id || p.lead?.id || '') === empId) {
      return 'Project Lead';
    }
    if (Array.isArray(p.members)) {
      const m = p.members.find(mem => String(mem?.id || mem?.user_id) === empId || (mem?.email && mem.email.toLowerCase() === empEmail));
      if (m?.role) return m.role;
    }
    if (empRole === 'PM') return 'Project Manager';
    if (empRole === 'TL') return 'Technical Lead';
    return empDept || 'Contributor';
  };

  // Project status helper
  const getProjectStatusStyle = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('complete') || s === 'done') {
      return { bg: '#D1FAE5', color: '#047857', border: '#A7F3D0', label: 'Completed' };
    }
    if (s.includes('progress') || s === 'active') {
      return { bg: '#EEF2FF', color: '#4F46E5', border: '#C7D2FE', label: 'In Progress' };
    }
    if (s.includes('review')) {
      return { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', label: 'Review' };
    }
    if (s.includes('hold') || s.includes('block')) {
      return { bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA', label: 'On Hold' };
    }
    return { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0', label: status || 'Active' };
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-profile-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        animation: 'modalBackdropFadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <style>{`
        @keyframes modalBackdropFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalScaleIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pulseSkeleton {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .employee-profile-modal-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .employee-profile-modal-scrollbar::-webkit-scrollbar-track {
          background: #F1F5F9;
          border-radius: 8px;
        }
        .employee-profile-modal-scrollbar::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 8px;
        }
        .employee-profile-modal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
      `}</style>

      <div
        ref={modalRef}
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '85vh',
          background: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          animation: 'modalScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Close Button (Top-Right Floating) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile modal"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            zIndex: 10,
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.85)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#334155',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.color = '#0F172A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.color = '#334155';
          }}
        >
          <X size={18} />
        </button>

        {loading ? (
          // Loading Skeleton
          <div style={{ padding: '30px', animation: 'pulseSkeleton 1.5s infinite ease-in-out' }}>
            <div style={{ height: '90px', background: '#E2E8F0', borderRadius: '12px', marginBottom: '20px' }} />
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#CBD5E1', marginBottom: '16px' }} />
            <div style={{ width: '40%', height: '20px', background: '#E2E8F0', borderRadius: '6px', marginBottom: '10px' }} />
            <div style={{ width: '25%', height: '14px', background: '#E2E8F0', borderRadius: '6px', marginBottom: '24px' }} />
            <div style={{ height: '120px', background: '#F1F5F9', borderRadius: '12px' }} />
          </div>
        ) : error ? (
          // Error State
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <AlertCircle size={40} color="#EF4444" style={{ marginBottom: '12px' }} />
            <h4 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
              Unable to load employee profile
            </h4>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px 0' }}>
              {error}
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                background: '#4F46E5',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        ) : (
          // Modal Scrollable Content
          <div className="employee-profile-modal-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
            {/* 1. Header Gradient Banner */}
            <div style={{
              height: '110px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #8B5CF6 100%)',
              position: 'relative'
            }}>
              {/* Subtle Decorative Pattern Pill */}
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '20px',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(4px)',
                padding: '4px 12px',
                borderRadius: '999px',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                Team Profile
              </div>
            </div>

            {/* 2. Avatar & Title Overview Section */}
            <div style={{ padding: '0 24px 20px 24px', position: 'relative' }}>
              {/* Overlapping Avatar */}
              <div style={{
                marginTop: '-44px',
                marginBottom: '12px',
                display: 'inline-block',
                position: 'relative'
              }}>
                {employee?.avatar_url ? (
                  <img
                    src={employee.avatar_url}
                    alt={empName}
                    style={{
                      width: '82px',
                      height: '82px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3.5px solid #FFFFFF',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '82px',
                    height: '82px',
                    borderRadius: '50%',
                    background: ['CEO', 'CTO'].includes(empRole.toUpperCase())
                      ? 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)'
                      : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                    color: '#FFFFFF',
                    fontSize: '30px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3.5px solid #FFFFFF',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)'
                  }}>
                    {initialLetter}
                  </div>
                )}
                {/* Status Dot */}
                <span
                  title={empStatus.label}
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '4px',
                    width: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    background: empStatus.color,
                    border: '2.5px solid #FFFFFF'
                  }}
                />
              </div>

              {/* Name, Role & Status Pill */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3
                    id="employee-profile-modal-title"
                    style={{
                      fontSize: '21px',
                      fontWeight: 800,
                      color: '#0F172A',
                      margin: '0 0 4px 0',
                      letterSpacing: '-0.02em',
                      fontFamily: 'serif, Georgia, Inter, sans-serif'
                    }}
                  >
                    {empName}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#4F46E5',
                      background: '#EEF2FF',
                      padding: '2px 9px',
                      borderRadius: '6px'
                    }}>
                      {empRole}
                    </span>
                    <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                      {empDept}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: empStatus.bg,
                  color: empStatus.color,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: empStatus.color }} />
                  {empStatus.label}
                </div>
              </div>

              {/* 3. Contact Details Grid */}
              <div style={{
                marginTop: '20px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    color: '#6366F1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}>
                    <Mail size={16} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Email</div>
                    <div style={{ fontSize: '12.5px', color: '#1E293B', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {employee?.email || 'Not specified'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    color: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}>
                    <Phone size={16} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Phone</div>
                    <div style={{ fontSize: '12.5px', color: '#1E293B', fontWeight: 600 }}>
                      {phone}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    color: '#F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}>
                    <MapPin size={16} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Location</div>
                    <div style={{ fontSize: '12.5px', color: '#1E293B', fontWeight: 600 }}>
                      {location}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    color: '#8B5CF6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}>
                    <Calendar size={16} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Joined Date</div>
                    <div style={{ fontSize: '12.5px', color: '#1E293B', fontWeight: 600 }}>
                      {joinedDate}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Skills Section */}
              <div style={{ marginTop: '22px' }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748B',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Sparkles size={13} color="#6366F1" />
                  <span>Key Competencies & Skills</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {skillsList.map((skill, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#334155',
                        background: '#F1F5F9',
                        padding: '4px 11px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#6366F1' }} />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* 5. Company Projects Section */}
              <div style={{ marginTop: '26px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#64748B',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <FolderGit2 size={14} color="#6366F1" />
                    <span>Company Projects</span>
                  </div>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#4F46E5',
                    background: '#EEF2FF',
                    padding: '2px 8px',
                    borderRadius: '999px'
                  }}>
                    {assignedProjects.length} {assignedProjects.length === 1 ? 'project' : 'projects'}
                  </span>
                </div>

                {assignedProjects.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '28px 16px',
                    background: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px dashed #CBD5E1',
                    color: '#64748B'
                  }}>
                    <Briefcase size={28} color="#94A3B8" style={{ marginBottom: '8px' }} />
                    <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#475569', margin: '0 0 2px 0' }}>
                      No projects assigned yet.
                    </p>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
                      Assigned projects from Team Leads will automatically appear here.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {assignedProjects.map((p) => {
                      const pName = p.name || p.title || 'Untitled Project';
                      const pRole = getProjectMemberRole(p);
                      const statusStyle = getProjectStatusStyle(p.status);
                      const progress = p.progress !== undefined
                        ? Number(p.progress)
                        : (String(p.status).toLowerCase() === 'completed' ? 100 : 65);
                      const startDateStr = formatDate(p.start_date || p.startDate || p.created_at);
                      const dueDateStr = formatDate(p.due_date || p.dueDate || p.end_date || p.deadline);

                      return (
                        <div
                          key={p.id}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'border-color 0.15s ease'
                          }}
                        >
                          {/* Project Header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <h5 style={{
                                fontSize: '13.5px',
                                fontWeight: 700,
                                color: '#0F172A',
                                margin: '0 0 2px 0',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {pName}
                              </h5>
                              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                                Role: <strong style={{ color: '#334155' }}>{pRole}</strong>
                              </span>
                            </div>

                            {/* Status Badge */}
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2.5px 8px',
                              borderRadius: '6px',
                              background: statusStyle.bg,
                              color: statusStyle.color,
                              border: `1px solid ${statusStyle.border}`,
                              flexShrink: 0
                            }}>
                              {statusStyle.label}
                            </span>
                          </div>

                          {/* Progress Bar with Percentage */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Progress</span>
                              <span style={{ fontSize: '11px', color: '#0F172A', fontWeight: 700 }}>{progress}%</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${Math.min(Math.max(progress, 0), 100)}%`,
                                height: '100%',
                                background: progress >= 100 ? '#10B981' : '#4F46E5',
                                borderRadius: '999px',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>

                          {/* Dates row */}
                          {(startDateStr || dueDateStr) && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '11px',
                              color: '#94A3B8',
                              paddingTop: '4px',
                              borderTop: '1px solid #F8FAFC'
                            }}>
                              {startDateStr && <span>Started: {startDateStr}</span>}
                              {dueDateStr && <span>Due: {dueDateStr}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
