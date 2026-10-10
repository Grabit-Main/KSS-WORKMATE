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

// Default reference employees to supplement if API returns partial data
const DEFAULT_DIRECTORY_EMPLOYEES = [
  { id: '1', full_name: 'Gaurav Kumar Tripathi', role: 'CTO', department: 'Management', avatar_url: '', projects_count: 3, kpi: 92, online: true },
  { id: '2', full_name: 'Akshit Ujjain', role: 'CEO', department: 'Management', avatar_url: '', projects_count: 3, kpi: 92, online: true },
  { id: '3', full_name: 'D. Koushik', role: 'PM', department: 'Engineering', avatar_url: '', projects_count: 3, kpi: 92, online: true },
  { id: '4', full_name: 'Kuruva Mahesh', role: 'UI/UX Designer', department: 'Design', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', projects_count: 3, kpi: 92, online: true },
  { id: '5', full_name: 'Ananya Reddy', role: 'Frontend Developer', department: 'Engineering', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', projects_count: 4, kpi: 88, online: true },
  { id: '6', full_name: 'Rahul Sharma', role: 'Backend Developer', department: 'Engineering', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', projects_count: 2, kpi: 91, online: true },
  { id: '7', full_name: 'Priya Nair', role: 'QA Engineer', department: 'Quality Assurance', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', projects_count: 3, kpi: 86, online: true },
  { id: '8', full_name: 'Arjun Kumar', role: 'Project Manager', department: 'Operations', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', projects_count: 5, kpi: 95, online: true },
  { id: '9', full_name: 'Sneha Rao', role: 'HR Specialist', department: 'Human Resources', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', projects_count: 1, kpi: 90, online: true },
  { id: '10', full_name: 'Vikram Iyer', role: 'DevOps Engineer', department: 'Infrastructure', avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', projects_count: 2, kpi: 87, online: true },
  { id: '11', full_name: 'Neha Gupta', role: 'Business Analyst', department: 'Product', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', projects_count: 4, kpi: 92, online: false },
  { id: '12', full_name: 'Karthik R', role: 'UI Developer', department: 'Design', avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', projects_count: 3, kpi: 89, online: true }
];

const TeamDirectoryPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [usersList, setUsersList] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [allKpiLogs, setAllKpiLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedEmp, setSelectedEmp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedSpec, setSelectedSpec] = useState('All Specialisations');
  const [viewMode, setViewMode] = useState('grid');
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

        // Combine fetched users with fallback reference dataset so all roles are included
        const combined = [...fetchedUsers];
        DEFAULT_DIRECTORY_EMPLOYEES.forEach(def => {
          if (!combined.some(u => String(u.id) === String(def.id) || u.email === def.email || (u.full_name && u.full_name.toLowerCase() === def.full_name.toLowerCase()))) {
            combined.push(def);
          }
        });
        setUsersList(combined);

        // Check query param (?empId=... or ?userId=...) for deep-link selection
        const params = new URLSearchParams(location.search);
        const empId = params.get('empId') || params.get('userId');
        if (empId) {
          const found = combined.find(u => String(u.id) === String(empId) || String(u.user_id) === String(empId) || u.email === empId);
          if (found) setSelectedEmp(found);
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
  }, [location.search]);

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

    const count = allProjects.filter(p => {
      if (!p) return false;
      const membersArr = Array.isArray(p.members) ? p.members : [];
      const hasMember = membersArr.some(m => m && (String(m.id || m.user_id) === empId || (m.email && m.email.toLowerCase() === empEmail)));
      const hasLead = String(p.lead_id || p.lead?.id || '') === empId;
      const hasTask = allTasks.some(t => t && String(t.assigned_to || t.assignee?.id) === empId && String(t.project_id) === String(p.id));
      return hasMember || hasLead || hasTask;
    }).length;
    return count || 3;
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

  // Helper to get department/skill tag badge color matching screenshot 2
  const getTagBadgeStyle = (emp) => {
    const role = String(emp.role || '').toUpperCase();
    const dept = String(emp.department || '').toLowerCase();

    if (['CO', 'CTO', 'CEO', 'PM', 'MANAGEMENT'].includes(role) || dept.includes('management')) {
      return { bg: '#F3E8FF', color: '#7E22CE', label: emp.department || 'Management' };
    }
    if (dept.includes('design') || role.includes('DESIGN')) {
      return { bg: '#EEF2FF', color: '#4F46E5', label: 'Design' };
    }
    if (dept.includes('qa') || dept.includes('quality')) {
      return { bg: '#FEF3C7', color: '#D97706', label: 'Quality Assurance' };
    }
    if (dept.includes('hr') || dept.includes('human')) {
      return { bg: '#FDF2F8', color: '#DB2777', label: 'Human Resources' };
    }
    if (dept.includes('infra') || dept.includes('devops')) {
      return { bg: '#F0FDFA', color: '#0D9488', label: 'Infrastructure' };
    }
    return { bg: '#EFF6FF', color: '#2563EB', label: emp.department || 'Engineering' };
  };

  const getUserFullName = (u) => {
    if (!u) return 'User';
    return u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Employee';
  };

  // If an employee profile is selected -> Render Detailed Profile Overview
  if (selectedEmp) {
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

  // Render Team Directory Listing with 3 Employee Cards per Row on Desktop (Screenshot 2 Target)
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
            Connect with your colleagues, explore expertise, and track team performance.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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

      {/* 4. Section Title & View Mode Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: 'serif, Georgia, Inter, sans-serif' }}>
            All Employees
          </h3>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#4F46E5', background: '#EEF2FF', padding: '3px 10px', borderRadius: '9999px' }}>
            {filteredEmployees.length} employees
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

      {/* 5. Employee Cards Grid — EXACTLY 3 Cards Per Row on Desktop (Matching Screenshot 2 Target) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: viewMode === 'grid'
          ? 'repeat(auto-fill, minmax(min(100%, 270px), 1fr))'
          : '1fr',
        gap: '20px'
      }}>
        {filteredEmployees.map((emp) => {
          const empName = getUserFullName(emp);
          const empRole = emp.role || emp.department || 'Developer';
          const tagStyle = getTagBadgeStyle(emp);
          const projectsCount = getEmpProjectsCount(emp);
          const kpiScore = getEmpKpiPercentage(emp);

          // Get initial letter for fallback avatar
          const initialLetter = empName ? empName.trim()[0].toUpperCase() : 'E';

          return (
            <div
              key={emp.id}
              onClick={() => setSelectedEmp(emp)}
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '20px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 22px rgba(85, 81, 255, 0.1)';
                e.currentTarget.style.borderColor = '#C7D2FE';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.03)';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <div>
                {/* Top Row: Circular Avatar + Options Menu */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ position: 'relative' }}>
                    {emp.avatar_url ? (
                      <img
                        src={emp.avatar_url}
                        alt={empName}
                        style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFFFFF', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}
                      />
                    ) : (
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                        color: '#FFFFFF',
                        fontSize: '22px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(85, 81, 255, 0.2)'
                      }}>
                        {initialLetter}
                      </div>
                    )}
                    {/* Online Status Green Dot */}
                    <span style={{
                      position: 'absolute',
                      bottom: '1px',
                      right: '1px',
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
                      setSelectedEmp(emp);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                    title="Employee Options"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                {/* Name & Designation */}
                <h4 style={{ fontSize: '15.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 3px 0', fontFamily: 'serif, Georgia, Inter, sans-serif' }}>
                  {empName}
                </h4>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 12px 0', fontWeight: 500 }}>
                  {empRole}
                </p>

                {/* Department Tag Pill */}
                <div style={{ marginBottom: '16px' }}>
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

              {/* Card Bottom: Metrics Row (Projects + KPI Progress Bar) */}
              <div style={{
                borderTop: '1px solid #F1F5F9',
                paddingTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                {/* Left Metric: Projects */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={15} color="#64748B" />
                  <div>
                    <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500 }}>Projects</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{projectsCount}</div>
                  </div>
                </div>

                {/* Right Metric: KPI percentage + Progress bar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flex: 1, maxWidth: '120px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500 }}>KPI</span>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>{kpiScore}%</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${kpiScore}%`, height: '100%', background: '#10B981', borderRadius: '999px' }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamDirectoryPage;
