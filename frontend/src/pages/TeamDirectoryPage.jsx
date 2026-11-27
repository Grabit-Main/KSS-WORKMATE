import React, { useState, useEffect, Component, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUsers } from '../api/users';
import { getProjects } from '../api/projects';
import { getTasks } from '../api/tasks';
import { getKPIs } from '../api/kpi';
import { useAuth } from '../context/AuthContext';
import {
  Users, Search, Building2, Layers, UserPlus, Filter, X,
  Calendar, CheckSquare, TrendingUp, Grid, List, ChevronDown, ShieldCheck
} from 'lucide-react';
import EmployeeProfileOverview from '../components/profile/EmployeeProfileOverview';
import EmployeeProfileModal from '../components/profile/EmployeeProfileModal';
import { getAllAssignedProjectsForEmployee } from '../services/projectAssignmentsService';

class DirectoryErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Team Directory ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 24px',
          textAlign: 'center',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          margin: '20px 0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}>
          <h3 style={{ fontSize: '18px', color: '#DC2626', fontWeight: 700, marginBottom: '8px' }}>
            Profile Overview Encountered an Issue
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px 0' }}>
            {String(this.state.error?.message || 'Unable to render employee profile metrics')}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 18px',
              background: '#5551FF',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            Retry Loading
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Default reference employees to supplement if API returns partial data
const DEFAULT_DIRECTORY_EMPLOYEES = [
  { id: 'ref-cto-1', full_name: 'Akshit Ujjain', role: 'CTO', department: 'Executive Management', avatar_url: '', projects_count: 7, kpi: 96, online: true },
  { id: 'ref-cto-2', full_name: 'Gaurav Kumar Tripathi', role: 'CTO', department: 'Executive Management', avatar_url: '', projects_count: 6, kpi: 95, online: true },
  { id: 'ref-pm', full_name: 'D. Koushik', role: 'PM', department: 'Engineering', avatar_url: '', projects_count: 5, kpi: 94, online: true },
  { id: '4', full_name: 'Kuruva Mahesh', role: 'UI/UX Designer', department: 'Design', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', projects_count: 3, kpi: 92, online: true }
];

// Demo profile cards specifically removed as per user requirements
const isRemovedDemoEmployee = (emp) => {
  if (!emp) return false;
  const fullName = String(emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`).trim().toLowerCase();
  const email = String(emp.email || '').trim().toLowerCase();

  // 1. Founder CEO
  if (
    fullName === 'founder ceo' ||
    (fullName.includes('founder') && fullName.includes('ceo')) ||
    email.startsWith('founder@') ||
    String(emp.id) === 'ref-ceo'
  ) {
    return true;
  }

  // 2. The 7 specific demo employee profiles to remove
  const demoNames = [
    'rahul sharma',
    'priya nair',
    'arjun kumar',
    'sneha rao',
    'vikram iyer',
    'neha gupta',
    'karthik r'
  ];
  if (demoNames.includes(fullName)) {
    return true;
  }

  const demoIds = ['6', '7', '8', '9', '10', '11', '12'];
  if (demoIds.includes(String(emp.id))) {
    return true;
  }

  return false;
};

// Helper to determine if a user role belongs to Executive / Admins
const isAdminRole = (role) => {
  const r = String(role || '').trim().toUpperCase();
  return ['CEO', 'CTO'].includes(r);
};

const TeamDirectoryPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const normalizedUserRole = String(user?.role || '').trim().toUpperCase();
  const canViewDetailedProfile = ['TL', 'PM', 'CO', 'CTO', 'CEO'].includes(normalizedUserRole);
  const isDeveloper = ['DEVELOPER', 'DEV', 'TM'].includes(normalizedUserRole);

  const [usersList, setUsersList] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [allKpiLogs, setAllKpiLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedEmp, setSelectedEmp] = useState(null);
  const [modalEmployee, setModalEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectsSyncVersion, setProjectsSyncVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedSpec, setSelectedSpec] = useState('All Specialisations');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('active');

  // Listen to project assignments changes to keep directory card counts synced
  useEffect(() => {
    const handleProjectsSync = () => setProjectsSyncVersion(v => v + 1);
    window.addEventListener('workmate_projects_updated', handleProjectsSync);
    return () => window.removeEventListener('workmate_projects_updated', handleProjectsSync);
  }, []);

  // Load backend directory data
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [usersData, projectsData, tasksData, kpiData] = await Promise.all([
          getUsers().catch(() => []),
          getProjects().catch(() => []),
          getTasks().catch(() => []),
          getKPIs().catch(() => [])
        ]);

        if (!isMounted) return;

        const fetchedUsers = Array.isArray(usersData) ? usersData.filter(u => !isRemovedDemoEmployee(u)) : [];
        setAllProjects(Array.isArray(projectsData) ? projectsData : []);
        setAllTasks(Array.isArray(tasksData) ? tasksData : []);
        setAllKpiLogs(Array.isArray(kpiData) ? kpiData : []);

        const combined = [...fetchedUsers];
        DEFAULT_DIRECTORY_EMPLOYEES.forEach(def => {
          if (!isRemovedDemoEmployee(def) && !combined.some(u => String(u.id) === String(def.id) || (u.email && u.email.toLowerCase() === def.email?.toLowerCase()) || (u.full_name && u.full_name.toLowerCase() === def.full_name.toLowerCase()))) {
            combined.push(def);
          }
        });
        setUsersList(combined.filter(u => !isRemovedDemoEmployee(u)));

        // Check query param (?empId=... or ?userId=...) for deep-link selection ONLY if user role is authorized
        if (canViewDetailedProfile) {
          const params = new URLSearchParams(location.search);
          const empId = params.get('empId') || params.get('userId');
          if (empId) {
            const found = combined.find(u => !isRemovedDemoEmployee(u) && (String(u.id) === String(empId) || String(u.user_id) === String(empId) || u.email === empId));
            if (found) setSelectedEmp(found);
          }
        }
      } catch (err) {
        console.error('Failed to load team directory data:', err);
        setUsersList(DEFAULT_DIRECTORY_EMPLOYEES.filter(u => !isRemovedDemoEmployee(u)));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [location.search, canViewDetailedProfile]);

  // Derived filter options
  const departmentOptions = useMemo(() => {
    const depts = new Set(['All Departments']);
    usersList.filter(u => !isRemovedDemoEmployee(u)).forEach(u => {
      if (u.department) depts.add(u.department);
      if (u.role) depts.add(u.role);
    });
    return Array.from(depts);
  }, [usersList]);

  const specOptions = useMemo(() => {
    const specs = new Set(['All Specialisations']);
    usersList.filter(u => !isRemovedDemoEmployee(u)).forEach(u => {
      if (u.department) specs.add(u.department);
      if (u.role) specs.add(u.role);
    });
    return Array.from(specs);
  }, [usersList]);

  // Filter & Sort Employees across both sections
  const filteredEmployees = useMemo(() => {
    const list = usersList.filter(u => {
      if (isRemovedDemoEmployee(u)) return false;
      const name = (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (u.role || u.department || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch = name.includes(q) || email.includes(q) || role.includes(q);

      const matchesDept = selectedDept === 'All Departments' || (u.department || u.role) === selectedDept;
      const matchesSpec = selectedSpec === 'All Specialisations' || (u.department || u.role) === selectedSpec;

      return matchesSearch && matchesDept && matchesSpec;
    });

    if (sortBy === 'name') {
      return [...list].sort((a, b) => {
        const nameA = (a.full_name || `${a.first_name || ''} ${a.last_name || ''}`).toLowerCase();
        const nameB = (b.full_name || `${b.first_name || ''} ${b.last_name || ''}`).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }
    if (sortBy === 'kpi') {
      return [...list].sort((a, b) => (b.kpi || 90) - (a.kpi || 90));
    }
    return list;
  }, [usersList, searchQuery, selectedDept, selectedSpec, sortBy]);

  // Split into Employees (top) and Admins (bottom)
  const employeeMembers = useMemo(() => {
    return filteredEmployees.filter(emp => !isAdminRole(emp.role));
  }, [filteredEmployees]);

  const adminMembers = useMemo(() => {
    return filteredEmployees.filter(emp => isAdminRole(emp.role));
  }, [filteredEmployees]);

  // Helper to get employee active project count from single source of truth
  const getEmpProjectsCount = (emp) => {
    const empId = String(emp.id || emp.user_id || '');
    const empEmail = (emp.email || '').toLowerCase();
    const assigned = getAllAssignedProjectsForEmployee(empId, empEmail, allProjects, allTasks);
    if (assigned.length > 0) return assigned.length;
    if (emp.projects_count !== undefined) return emp.projects_count;
    return 0;
  };

  // Helper to get employee KPI score
  const getEmpKpiPercentage = (emp) => {
    if (emp.kpi !== undefined) return emp.kpi;
    const empId = String(emp.id || emp.user_id || '');
    const empLogs = allKpiLogs.filter(k => k && String(k.employee_id || k.employee?.id) === empId);
    if (empLogs.length === 0) return 92;
    const sum = empLogs.reduce((acc, l) => acc + (Number(l?.daily_kpi_percentage) || 0), 0);
    return Math.round(sum / empLogs.length);
  };

  // Helper to get department/skill tag badge color matching target UI
  const getTagBadgeStyle = (emp) => {
    const role = String(emp.role || '').toUpperCase();
    const dept = String(emp.department || '').toLowerCase();
    const rawDept = emp.department || emp.role || 'Engineering';

    if (['CEO', 'CTO'].includes(role)) {
      return {
        bg: 'linear-gradient(135deg, #F3E8FF 0%, #EDE9FE 100%)',
        color: '#6B21A8',
        border: '1px solid #D8B4FE',
        label: role === 'CEO' ? 'CEO · Executive' : 'CTO · Leadership'
      };
    }
    if (role === 'PM' || dept.includes('project management') || dept.includes('operations')) {
      return { bg: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', label: 'Project Management' };
    }
    if (role === 'TL' || dept.includes('lead')) {
      return { bg: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', label: 'Team Lead' };
    }
    if (dept.includes('backend') || role.includes('BACKEND')) {
      return { bg: '#EFF6FF', color: '#2563EB', border: 'none', label: 'Backend Developer' };
    }
    if (dept.includes('frontend') || role.includes('FRONTEND')) {
      return { bg: '#E0F2FE', color: '#0284C7', border: 'none', label: 'Frontend Developer' };
    }
    if (dept.includes('full stack') || role.includes('FULL STACK')) {
      return { bg: '#F0FDF4', color: '#16A34A', border: 'none', label: 'Full Stack Developer' };
    }
    if (dept.includes('generative') || role.includes('GENERATIVE') || dept.includes('ai') || role.includes('AI')) {
      return { bg: '#F5F3FF', color: '#7C3AED', border: 'none', label: 'Generative AI' };
    }
    if (dept.includes('design') || role.includes('DESIGN') || role.includes('UI/UX')) {
      return { bg: '#EEF2FF', color: '#4F46E5', border: 'none', label: 'Design' };
    }
    if (dept.includes('qa') || dept.includes('quality')) {
      return { bg: '#FEF3C7', color: '#D97706', border: 'none', label: 'Quality Assurance' };
    }
    if (dept.includes('hr') || dept.includes('human')) {
      return { bg: '#FDF2F8', color: '#DB2777', border: 'none', label: 'Human Resources' };
    }
    if (dept.includes('infra') || dept.includes('devops')) {
      return { bg: '#F0FDFA', color: '#0D9488', border: 'none', label: 'Infrastructure' };
    }
    if (dept.includes('ops') || dept.includes('operations')) {
      return { bg: '#ECFDF5', color: '#059669', border: 'none', label: 'Operations' };
    }
    if (dept.includes('product')) {
      return { bg: '#FDF4FF', color: '#C026D3', border: 'none', label: 'Product' };
    }
    return { bg: '#EFF6FF', color: '#2563EB', border: 'none', label: rawDept };
  };

  const getEmpStatus = (emp) => {
    if (emp.status) {
      const s = String(emp.status).toLowerCase();
      if (s.includes('progress') || s.includes('busy')) return { label: 'In Progress', color: '#F59E0B' };
      if (s.includes('leave') || s.includes('away') || s.includes('off')) return { label: 'On Leave', color: '#64748B' };
      return { label: 'Active', color: '#10B981' };
    }
    if (emp.online === false) return { label: 'On Leave', color: '#64748B' };
    const hash = String(emp.id || emp.full_name || '').charCodeAt(0) % 3;
    if (hash === 1) return { label: 'In Progress', color: '#F59E0B' };
    return { label: 'Active', color: '#10B981' };
  };

  const getUserFullName = (u) => {
    if (!u) return 'User';
    return u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Employee';
  };

  // Detailed Employee Profile Overview is rendered ONLY if logged-in user is an authorized role (TL, PM, CO, CTO, CEO)
  if (canViewDetailedProfile && selectedEmp) {
    return (
      <DirectoryErrorBoundary>
        <EmployeeProfileOverview
          employee={selectedEmp}
          employeeId={selectedEmp.id}
          onBack={() => {
            setSelectedEmp(null);
            navigate('/team-directory', { replace: true });
          }}
          onAssignTask={(targetUser) => navigate('/tasks', { state: { assigneeId: targetUser?.id || selectedEmp.id } })}
          onSendMessage={(targetUser) => navigate('/collaboration', { state: { selectedUserId: targetUser?.id || selectedEmp.id, user: targetUser || selectedEmp } })}
        />
      </DirectoryErrorBoundary>
    );
  }

  // Render individual employee card (used for both Employees and Admins sections)
  const renderEmployeeCard = (emp, isAdmin = false) => {
    const empName = getUserFullName(emp);
    const empRole = emp.role || emp.department || (isAdmin ? 'Executive' : 'Developer');
    const tagStyle = getTagBadgeStyle(emp);
    const projectsCount = getEmpProjectsCount(emp);
    const kpiScore = getEmpKpiPercentage(emp);
    const empStatus = getEmpStatus(emp);
    const isSelected = selectedEmp?.id === emp.id;
    const initialLetter = empName ? empName.trim()[0].toUpperCase() : (isAdmin ? 'A' : 'E');

    return (
      <div
        key={emp.id}
        onClick={() => {
          if (canViewDetailedProfile) {
            setSelectedEmp(emp);
          } else if (isDeveloper) {
            setModalEmployee(emp);
            setIsModalOpen(true);
          }
        }}
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: isSelected ? '1.5px solid #6366F1' : '1px solid #E2E8F0',
          padding: '16px 18px',
          boxShadow: isSelected
            ? '0 0 0 2px rgba(99, 102, 241, 0.15), 0 4px 12px rgba(0, 0, 0, 0.04)'
            : '0 2px 8px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: (canViewDetailedProfile || isDeveloper) ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          position: 'relative',
          height: '100%',
          boxSizing: 'border-box'
        }}
        onMouseEnter={(e) => {
          if (canViewDetailedProfile || isDeveloper) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(85, 81, 255, 0.08)';
            if (!isSelected) e.currentTarget.style.borderColor = '#C7D2FE';
          }
        }}
        onMouseLeave={(e) => {
          if (canViewDetailedProfile || isDeveloper) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = isSelected
              ? '0 0 0 2px rgba(99, 102, 241, 0.15), 0 4px 12px rgba(0, 0, 0, 0.04)'
              : '0 2px 8px rgba(0, 0, 0, 0.03)';
            if (!isSelected) e.currentTarget.style.borderColor = '#E2E8F0';
          }
        }}
      >
        {/* Upper Section */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '14px',
          flex: 1
        }}>
          {/* Left: Avatar with Online/Offline Status Indicator */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {emp.avatar_url ? (
              <img
                src={emp.avatar_url}
                alt={empName}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                }}
              />
            ) : (
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: isAdmin
                  ? 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)'
                  : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                color: '#FFFFFF',
                fontSize: '18px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isAdmin
                  ? '0 2px 6px rgba(124, 58, 237, 0.25)'
                  : '0 2px 6px rgba(85, 81, 255, 0.2)'
              }}>
                {initialLetter}
              </div>
            )}
            {/* Status Dot */}
            <span style={{
              position: 'absolute',
              bottom: '1px',
              right: '1px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: empStatus.color,
              border: '2px solid #FFFFFF'
            }} />
          </div>

          {/* Name, Designation & Department Badge */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <h4 style={{
              fontSize: '14.5px',
              fontWeight: 700,
              color: '#0F172A',
              margin: '0 0 2px 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {empName}
            </h4>
            <p style={{
              fontSize: '12px',
              color: '#64748B',
              margin: '0 0 6px 0',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {empRole}
            </p>
            <div>
              <span style={{
                fontSize: '10.5px',
                fontWeight: 600,
                padding: '2.5px 8px',
                borderRadius: '6px',
                background: tagStyle.bg,
                color: tagStyle.color,
                border: tagStyle.border || 'none',
                display: 'inline-block',
                whiteSpace: 'nowrap'
              }}>
                {tagStyle.label}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Section (Projects Count & KPI Metrics) */}
        {!canViewDetailedProfile ? (
          <div style={{
            borderTop: '1px solid #F1F5F9',
            paddingTop: '12px',
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            {/* Left: Projects */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
              <Calendar size={15} color="#64748B" />
              <div>
                <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500, lineHeight: 1.2 }}>Projects</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>{projectsCount}</div>
              </div>
            </div>

            {/* Right: Status */}
            <div>
              <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500, textAlign: 'right', marginBottom: '2px', lineHeight: 1.2 }}>Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: empStatus.color
                }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>{empStatus.label}</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            borderTop: '1px solid #F1F5F9',
            paddingTop: '12px',
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            {/* Left Metric: Projects */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
              <Calendar size={15} color="#64748B" />
              <div>
                <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500, lineHeight: 1.2 }}>Projects</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>{projectsCount}</div>
              </div>
            </div>

            {/* Right Metric: KPI percentage + Progress bar with light track and green fill */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500, lineHeight: 1.2 }}>KPI</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>{kpiScore}%</span>
                <div style={{ width: '56px', height: '6px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(kpiScore, 100)}%`, height: '100%', background: '#10B981', borderRadius: '999px' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Team Directory Listing with 3 Employee Cards per Row on Desktop
  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* 2. Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #5551FF 0%, #7C3AED 50%, #A855F7 100%)',
        borderRadius: '20px',
        padding: '24px 30px',
        color: '#FFFFFF',
        marginBottom: '24px',
        boxShadow: '0 8px 30px rgba(85, 81, 255, 0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 4px 0', fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#FFFFFF' }}>
            Our Team
          </h2>
          <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.9)', margin: 0, fontWeight: 400 }}>
            {!canViewDetailedProfile
              ? 'Connect with your colleagues and explore team members across departments.'
              : 'Connect with your colleagues, explore expertise, and track team performance.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Avatar Stack */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {[
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
              'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100',
              'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100'
            ].map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt=""
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: '2px solid #FFFFFF',
                  marginLeft: idx === 0 ? 0 : '-10px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  objectFit: 'cover'
                }}
              />
            ))}
          </div>

          {!isDeveloper && (
            <button
              type="button"
              onClick={() => navigate('/users')}
              style={{
                background: '#FFFFFF',
                color: '#4F46E5',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              <UserPlus size={15} />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '12px 18px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Search Field */}
        <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '240px' }}>
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search employees by name, role, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              color: '#0F172A',
              background: '#F8FAFC',
              outline: 'none'
            }}
          />
        </div>

        {/* Filter Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '3px 10px' }}>
            <Building2 size={14} color="#64748B" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '12.5px', fontWeight: 500, color: '#1E293B', outline: 'none', cursor: 'pointer', padding: '4px 0' }}
            >
              {departmentOptions.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '3px 10px' }}>
            <Layers size={14} color="#64748B" />
            <select
              value={selectedSpec}
              onChange={(e) => setSelectedSpec(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '12.5px', fontWeight: 500, color: '#1E293B', outline: 'none', cursor: 'pointer', padding: '4px 0' }}
            >
              {specOptions.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          {(searchQuery || selectedDept !== 'All Departments' || selectedSpec !== 'All Specialisations') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedDept('All Departments');
                setSelectedSpec('All Specialisations');
              }}
              style={{ background: 'transparent', border: 'none', color: '#4F46E5', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* 4 Summary KPI Cards (Developer View - Matching Screenshot 1) */}
      {!canViewDetailedProfile && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Total Employees */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#EEF2FF',
              color: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Users size={22} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', marginBottom: '2px' }}>Total Employees</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
                  {usersList.length || 48}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', background: '#D1FAE5', padding: '1px 6px', borderRadius: '999px' }}>
                  +12%
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Across all departments</div>
            </div>
          </div>

          {/* Departments */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
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
              <Building2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', marginBottom: '2px' }}>Departments</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
                {Math.max(departmentOptions.length - 1, 8)}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Active departments</div>
            </div>
          </div>

          {/* Specialisations */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
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
              <Layers size={22} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', marginBottom: '2px' }}>Specialisations</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
                {Math.max(specOptions.length - 1, 16)}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Core skill categories</div>
            </div>
          </div>

          {/* Available Today */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
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
              <UserPlus size={22} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', marginBottom: '2px' }}>Available Today</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
                {usersList.filter(u => u.online !== false).length || 32}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Employees online now</div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Section 1: Employees (TL, PM, and all team members) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: 'serif, Georgia, Inter, sans-serif' }}>
            Employees
          </h3>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#4F46E5', background: '#EEF2FF', padding: '3px 10px', borderRadius: '9999px' }}>
            {employeeMembers.length} {employeeMembers.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              fontWeight: 500,
              color: '#475569',
              background: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <option value="active">Recently active</option>
            <option value="name">Name A-Z</option>
            <option value="kpi">KPI High-Low</option>
          </select>

          <div style={{ display: 'inline-flex', background: '#F1F5F9', borderRadius: '8px', padding: '2px', gap: '2px' }}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? '#5551FF' : 'transparent',
                color: viewMode === 'grid' ? '#FFFFFF' : '#64748B',
                border: 'none',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center'
              }}
              title="Grid View"
            >
              <Grid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? '#5551FF' : 'transparent',
                color: viewMode === 'list' ? '#FFFFFF' : '#64748B',
                border: 'none',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center'
              }}
              title="List View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .team-directory-grid-layout {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          width: 100%;
        }
        @media (min-width: 600px) {
          .team-directory-grid-layout {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px;
          }
        }
        @media (min-width: 900px) {
          .team-directory-grid-layout {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 20px;
          }
        }
        .team-directory-grid-layout.list-view-mode {
          grid-template-columns: 1fr !important;
        }
      `}</style>

      {employeeMembers.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '36px 20px',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px dashed #CBD5E1',
          marginBottom: '32px'
        }}>
          <Users size={32} color="#94A3B8" style={{ marginBottom: '8px' }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#475569', margin: '0 0 4px 0' }}>No employees found</p>
          <p style={{ fontSize: '12.5px', color: '#94A3B8', margin: 0 }}>No team members match your current search or filter criteria.</p>
        </div>
      ) : (
        <div className={`team-directory-grid-layout ${viewMode === 'list' ? 'list-view-mode' : ''}`} style={{ marginBottom: '40px' }}>
          {employeeMembers.map((emp) => renderEmployeeCard(emp, false))}
        </div>
      )}

      {/* 5. Section 2: Admins (CTO and CEO profile cards) */}
      <div style={{
        marginTop: '16px',
        paddingTop: '28px',
        borderTop: '1px solid #E2E8F0',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: 'serif, Georgia, Inter, sans-serif' }}>
                Admins
              </h3>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#7E22CE', background: '#F3E8FF', padding: '3px 10px', borderRadius: '9999px' }}>
                {adminMembers.length} {adminMembers.length === 1 ? 'admin' : 'admins'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Executive leadership, CTO, and CEO administrative profiles.
            </p>
          </div>
        </div>
      </div>

      {adminMembers.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '36px 20px',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px dashed #CBD5E1'
        }}>
          <ShieldCheck size={32} color="#94A3B8" style={{ marginBottom: '8px' }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#475569', margin: '0 0 4px 0' }}>No admins found</p>
          <p style={{ fontSize: '12.5px', color: '#94A3B8', margin: 0 }}>No executive administrators match your current search or filter criteria.</p>
        </div>
      ) : (
        <div className={`team-directory-grid-layout ${viewMode === 'list' ? 'list-view-mode' : ''}`}>
          {adminMembers.map((emp) => renderEmployeeCard(emp, true))}
        </div>
      )}

      {/* Developer Profile Modal (developer portal only) */}
      {isDeveloper && isModalOpen && (
        <EmployeeProfileModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setModalEmployee(null);
          }}
          employee={modalEmployee}
          projects={allProjects}
          tasks={allTasks}
        />
      )}
    </div>
  );
};

export default TeamDirectoryPage;
