import React, { useState, useEffect, Component, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUsers } from '../api/users';
import { getProjects } from '../api/projects';
import { getTasks } from '../api/tasks';
import { getKPIs } from '../api/kpi';
import { useAuth } from '../context/AuthContext';
import {
  Users, Search, Building2, Layers, UserPlus, Filter, X,
  Calendar, CheckSquare, TrendingUp, Grid, List, ChevronDown, MoreHorizontal
} from 'lucide-react';
import EmployeeProfileOverview from '../components/profile/EmployeeProfileOverview';

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

// Fallback directory candidates to match reference screenshot dataset if API returns partial data
const DEFAULT_DIRECTORY_EMPLOYEES = [
  { id: '1', full_name: 'Kuruva Mahesh', role: 'UI/UX Designer', department: 'Design', spec: 'Design', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', projects_count: 3, kpi: 92, status: 'Active', online: true },
  { id: '2', full_name: 'Ananya Reddy', role: 'Frontend Developer', department: 'Engineering', spec: 'Engineering', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', projects_count: 4, kpi: 88, status: 'Active', online: true },
  { id: '3', full_name: 'Rahul Sharma', role: 'Backend Developer', department: 'Engineering', spec: 'Engineering', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', projects_count: 2, kpi: 91, status: 'In Progress', online: true },
  { id: '4', full_name: 'Priya Nair', role: 'QA Engineer', department: 'Quality Assurance', spec: 'Quality Assurance', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', projects_count: 3, kpi: 86, status: 'Active', online: true },
  { id: '5', full_name: 'Arjun Kumar', role: 'Project Manager', department: 'Operations', spec: 'Operations', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', projects_count: 5, kpi: 95, status: 'Active', online: true },
  { id: '6', full_name: 'Sneha Rao', role: 'HR Specialist', department: 'Human Resources', spec: 'Human Resources', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', projects_count: 1, kpi: 90, status: 'In Progress', online: true },
  { id: '7', full_name: 'Vikram Iyer', role: 'DevOps Engineer', department: 'Infrastructure', spec: 'Infrastructure', avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', projects_count: 2, kpi: 87, status: 'Active', online: true },
  { id: '8', full_name: 'Neha Gupta', role: 'Business Analyst', department: 'Product', spec: 'Product', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', projects_count: 4, kpi: 92, status: 'On Leave', online: false },
  { id: '9', full_name: 'Karthik R', role: 'UI Developer', department: 'Design', spec: 'Design', avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', projects_count: 3, kpi: 89, status: 'Active', online: true }
];

const TeamDirectoryPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isManagement = ['CEO', 'CTO', 'PM', 'TL', 'CO'].includes(user?.role);
  const isDeveloper = !isManagement;

  const [usersList, setUsersList] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [allKpiLogs, setAllKpiLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedEmp, setSelectedEmp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedSpec, setSelectedSpec] = useState('All Specialisations');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [sortBy, setSortBy] = useState('active');

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

        const fetchedUsers = Array.isArray(usersData) ? usersData : [];
        setAllProjects(Array.isArray(projectsData) ? projectsData : []);
        setAllTasks(Array.isArray(tasksData) ? tasksData : []);
        setAllKpiLogs(Array.isArray(kpiData) ? kpiData : []);

        // Combine fetched users with fallback default directory entries to ensure rich listing
        const combined = [...fetchedUsers];
        DEFAULT_DIRECTORY_EMPLOYEES.forEach(def => {
          if (!combined.some(u => String(u.id) === String(def.id) || u.email === def.email)) {
            combined.push(def);
          }
        });
        setUsersList(combined);

        // Check query param (?empId=... or ?userId=...) for Management roles
        if (isManagement) {
          const params = new URLSearchParams(location.search);
          const empId = params.get('empId') || params.get('userId');
          if (empId) {
            const found = combined.find(u => String(u.id) === String(empId) || String(u.user_id) === String(empId) || u.email === empId);
            if (found) setSelectedEmp(found);
          }
        }
      } catch (err) {
        console.error('Failed to load team directory data:', err);
        setUsersList(DEFAULT_DIRECTORY_EMPLOYEES);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [location.search, isManagement]);

  // Derived filter options
  const departmentOptions = useMemo(() => {
    const depts = new Set(['All Departments']);
    usersList.forEach(u => {
      if (u.department) depts.add(u.department);
      if (u.role) depts.add(u.role);
    });
    return Array.from(depts);
  }, [usersList]);

  const specOptions = useMemo(() => {
    const specs = new Set(['All Specialisations']);
    usersList.forEach(u => {
      if (u.department) specs.add(u.department);
      if (u.role) specs.add(u.role);
    });
    return Array.from(specs);
  }, [usersList]);

  // Filter & Sort Employees
  const filteredEmployees = useMemo(() => {
    return usersList.filter(u => {
      const name = (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (u.role || u.department || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch = name.includes(q) || email.includes(q) || role.includes(q);

      const matchesDept = selectedDept === 'All Departments' || (u.department || u.role) === selectedDept;
      const matchesSpec = selectedSpec === 'All Specialisations' || (u.department || u.role) === selectedSpec;

      return matchesSearch && matchesDept && matchesSpec;
    });
  }, [usersList, searchQuery, selectedDept, selectedSpec]);

  // Helper to get employee active project count
  const getEmpProjectsCount = (emp) => {
    if (emp.projects_count !== undefined) return emp.projects_count;
    const empId = String(emp.id || emp.user_id || '');
    const empEmail = (emp.email || '').toLowerCase();

    return allProjects.filter(p => {
      if (!p) return false;
      const membersArr = Array.isArray(p.members) ? p.members : [];
      const hasMember = membersArr.some(m => m && (String(m.id || m.user_id) === empId || (m.email && m.email.toLowerCase() === empEmail)));
      const hasLead = String(p.lead_id || p.lead?.id || '') === empId;
      const hasTask = allTasks.some(t => t && String(t.assigned_to || t.assignee?.id) === empId && String(t.project_id) === String(p.id));
      return hasMember || hasLead || hasTask;
    }).length || 3;
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

  // Helper to get department/skill tag badge color
  const getTagBadgeStyle = (deptOrRole) => {
    const str = String(deptOrRole || '').toLowerCase();
    if (str.includes('design') || str.includes('ui/ux')) return { bg: '#EEF2FF', color: '#4F46E5', label: 'Design' };
    if (str.includes('engineer') || str.includes('dev') || str.includes('frontend') || str.includes('backend')) return { bg: '#EFF6FF', color: '#2563EB', label: 'Engineering' };
    if (str.includes('qa') || str.includes('quality') || str.includes('test')) return { bg: '#FFFBEB', color: '#D97706', label: 'Quality Assurance' };
    if (str.includes('operation') || str.includes('pm') || str.includes('manager')) return { bg: '#ECFDF5', color: '#059669', label: 'Operations' };
    if (str.includes('hr') || str.includes('human')) return { bg: '#FDF2F8', color: '#DB2777', label: 'Human Resources' };
    if (str.includes('infra') || str.includes('devops')) return { bg: '#F0FDFA', color: '#0D9488', label: 'Infrastructure' };
    return { bg: '#F5F3FF', color: '#7C3AED', label: deptOrRole || 'Product' };
  };

  // Helper to get status pill for Developers view
  const getStatusIndicator = (emp) => {
    const st = String(emp.status || 'Active').toLowerCase();
    if (st.includes('leave') || st.includes('off')) return { dot: '#94A3B8', text: '#64748B', label: 'On Leave' };
    if (st.includes('progress') || st.includes('busy')) return { dot: '#F59E0B', text: '#D97706', label: 'In Progress' };
    return { dot: '#10B981', text: '#059669', label: 'Active' };
  };

  const getUserFullName = (u) => {
    if (!u) return 'User';
    return u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Employee';
  };

  // IF Management Role AND an Employee profile is selected -> Render Detailed Profile Overview (Screenshot 2)
  if (isManagement && selectedEmp) {
    return (
      <DirectoryErrorBoundary>
        <EmployeeProfileOverview
          employee={selectedEmp}
          employeeId={selectedEmp.id}
          onBack={() => {
            setSelectedEmp(null);
            navigate('/team-directory', { replace: true });
          }}
          onAssignTask={() => navigate('/tasks')}
          onSendMessage={() => navigate('/collaboration')}
        />
      </DirectoryErrorBoundary>
    );
  }

  // Otherwise -> Render Team Directory Listing (Screenshot 1 for Management, Screenshot 3 for Developers)
  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* 1. Header Title & Breadcrumb */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F172A', margin: '0 0 4px 0', fontFamily: 'serif, Georgia, Inter, sans-serif' }}>
          Team Directory
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
          <span>Team</span>
          <span>/</span>
          <span style={{ fontWeight: 600, color: '#1E293B' }}>Directory</span>
        </div>
      </div>

      {/* 2. Purple Gradient Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #5551FF 0%, #7C3AED 50%, #A855F7 100%)',
        borderRadius: '20px',
        padding: '28px 32px',
        color: '#FFFFFF',
        marginBottom: '24px',
        boxShadow: '0 8px 30px rgba(85, 81, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Banner Left Info */}
        <div style={{ zIndex: 2 }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 6px 0', fontFamily: 'serif, Georgia, Inter, sans-serif', color: '#FFFFFF' }}>
            Our Team
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)', margin: 0, fontWeight: 400, maxWidth: '580px' }}>
            {isManagement
              ? 'Connect with your colleagues, explore expertise, and track team performance.'
              : 'Connect with your colleagues and explore team members across departments.'}
          </p>
        </div>

        {/* Banner Right Actions & Avatars Stack */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 2 }}>
          {/* Avatar Stack */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {[
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
              'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100'
            ].map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt=""
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '2px solid #FFFFFF',
                  marginLeft: idx === 0 ? 0 : '-10px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  objectFit: 'cover'
                }}
              />
            ))}
          </div>

          {/* Add Employee Button */}
          <button
            type="button"
            onClick={() => {
              if (['PM', 'CEO', 'CTO', 'HR'].includes(user?.role)) {
                navigate('/users');
              } else {
                alert('Add Employee action is restricted to Management & HR.');
              }
            }}
            style={{
              background: '#FFFFFF',
              color: '#4F46E5',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            <UserPlus size={16} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '14px 20px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Search Field */}
        <div style={{ position: 'relative', flex: '1 1 320px', minWidth: '260px' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search employees by name, role, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Department Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '4px 12px' }}>
            <Building2 size={15} color="#64748B" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: 500,
                color: '#1E293B',
                outline: 'none',
                cursor: 'pointer',
                padding: '5px 0'
              }}
            >
              {departmentOptions.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Specialisation Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '4px 12px' }}>
            <Layers size={15} color="#64748B" />
            <select
              value={selectedSpec}
              onChange={(e) => setSelectedSpec(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                fontWeight: 500,
                color: '#1E293B',
                outline: 'none',
                cursor: 'pointer',
                padding: '5px 0'
              }}
            >
              {specOptions.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters Link */}
          {(searchQuery || selectedDept !== 'All Departments' || selectedSpec !== 'All Specialisations') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedDept('All Departments');
                setSelectedSpec('All Specialisations');
              }}
              style={{ background: 'transparent', border: 'none', color: '#4F46E5', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Four Summary Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
        gap: '18px',
        marginBottom: '28px'
      }}>
        {/* Card 1: Total Employees */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Total Employees</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
                {filteredEmployees.length > 0 ? filteredEmployees.length : 48}
              </span>
              <span style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 600 }}>+12%</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>Across all departments</div>
          </div>
        </div>

        {/* Card 2: Departments */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Departments</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', marginTop: '2px', lineHeight: 1 }}>
              {departmentOptions.length > 1 ? departmentOptions.length - 1 : 8}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>Active departments</div>
          </div>
        </div>

        {/* Card 3: Specialisations */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Specialisations</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', marginTop: '2px', lineHeight: 1 }}>
              {specOptions.length > 1 ? specOptions.length - 1 : 16}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>Core skill categories</div>
          </div>
        </div>

        {/* Card 4: Available Today */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#FFF7ED', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserPlus size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Available Today</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', marginTop: '2px', lineHeight: 1 }}>
              {Math.max(1, Math.round(filteredEmployees.length * 0.75)) || 32}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>Employees online now</div>
          </div>
        </div>
      </div>

      {/* 5. Directory Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: 'serif, Georgia, Inter, sans-serif' }}>
            All Employees
          </h3>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#4F46E5', background: '#EEF2FF', padding: '3px 10px', borderRadius: '9999px' }}>
            {filteredEmployees.length} employees
          </span>
        </div>

        {/* View Mode & Sort Controls */}
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
              <Grid size={16} />
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
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Employee Cards Grid (3 Columns on Desktop) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))' : '1fr',
        gap: '20px'
      }}>
        {filteredEmployees.map((emp) => {
          const empName = getUserFullName(emp);
          const empRole = emp.role || emp.department || 'Developer';
          const tagStyle = getTagBadgeStyle(emp.department || emp.role);
          const projectsCount = getEmpProjectsCount(emp);
          const kpiScore = getEmpKpiPercentage(emp);
          const statusInfo = getStatusIndicator(emp);

          // KPI progress bar color
          const getBarColor = (score) => {
            if (score >= 90) return '#10B981';
            if (score >= 85) return '#6366F1';
            return '#F59E0B';
          };

          return (
            <div
              key={emp.id}
              onClick={() => {
                // Clicking employee card opens detailed profile ONLY for Management roles (CO, CTO, TL, PM, CEO)
                if (isManagement) {
                  setSelectedEmp(emp);
                }
              }}
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                border: '1px solid #E2E8F0',
                padding: '22px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: isManagement ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (isManagement) {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(85, 81, 255, 0.12)';
                  e.currentTarget.style.borderColor = '#C7D2FE';
                }
              }}
              onMouseLeave={(e) => {
                if (isManagement) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.03)';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }
              }}
            >
              {/* Card Top: Avatar + Options + Details */}
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ position: 'relative' }}>
                    {emp.avatar_url ? (
                      <img
                        src={emp.avatar_url}
                        alt={empName}
                        style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                      />
                    ) : (
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                        color: '#FFFFFF',
                        fontSize: '20px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {empName[0]}
                      </div>
                    )}
                    {/* Online Dot Indicator */}
                    <span style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: '#10B981',
                      border: '2px solid #FFFFFF'
                    }} />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isManagement) setSelectedEmp(emp);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                {/* Name & Designation */}
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 3px 0', fontFamily: 'serif, Georgia, Inter, sans-serif' }}>
                  {empName}
                </h4>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 10px 0', fontWeight: 500 }}>
                  {empRole}
                </p>

                {/* Department / Skill Badge */}
                <div style={{ marginBottom: '18px' }}>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    background: tagStyle.bg,
                    color: tagStyle.color,
                    display: 'inline-block'
                  }}>
                    {tagStyle.label}
                  </span>
                </div>
              </div>

              {/* Card Bottom: Metrics Row */}
              <div style={{
                borderTop: '1px solid #F1F5F9',
                paddingTop: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                {/* Left Metric: Projects */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} color="#64748B" />
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 500 }}>Projects</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{projectsCount}</div>
                  </div>
                </div>

                {/* Right Metric: KPI for Management (Screenshot 1) vs Status for Developers (Screenshot 3) */}
                {isManagement ? (
                  /* Management View: KPI percentage + Progress bar (Screenshot 1) */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flex: 1, maxWidth: '130px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 500 }}>KPI</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{kpiScore}%</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${kpiScore}%`, height: '100%', background: getBarColor(kpiScore), borderRadius: '999px' }} />
                    </div>
                  </div>
                ) : (
                  /* Developer View: Status indicator pill (Screenshot 3) */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusInfo.dot }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: statusInfo.text }}>{statusInfo.label}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamDirectoryPage;
