import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUsers } from '../api/users';
import { useAuth } from '../context/AuthContext';
import { Users, Search } from 'lucide-react';
import EmployeeProfileOverview from '../components/profile/EmployeeProfileOverview';

const TeamDirectoryPage = () => {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      const list = Array.isArray(data) ? data : [];
      setUsersList(list);

      // Check query param (?empId=... or ?userId=...)
      const params = new URLSearchParams(location.search);
      const empId = params.get('empId') || params.get('userId');
      if (empId && list.length > 0) {
        const found = list.find(u => String(u.id) === String(empId) || String(u.user_id) === String(empId) || u.email === empId);
        if (found) {
          setSelectedEmp(found);
        } else {
          setSelectedEmp(list[0]);
        }
      } else if (list.length > 0) {
        setSelectedEmp(list[0]);
      } else if (user) {
        setSelectedEmp(user);
      } else {
        setSelectedEmp({
          id: '1',
          full_name: 'Kuruva Mahesh',
          role: 'UI/UX Designer',
          department: 'UI/UX Designer',
          email: 'mahesh@kalpanaaa.com',
          location: 'Bangalore, India',
          phone: '+91 98765 43210'
        });
      }
    } catch (err) {
      console.error('Failed to load team directory users:', err);
      if (user) setSelectedEmp(user);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [location.search]);

  const filteredUsers = usersList.filter(u => {
    const fullName = (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`).toLowerCase();
    const email = (u.email || '').toLowerCase();
    const role = (u.role || u.department || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return fullName.includes(q) || email.includes(q) || role.includes(q);
  });

  const getUserFullName = (u) => {
    if (!u) return 'User';
    return u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Employee';
  };

  const activeEmp = selectedEmp || (usersList.length > 0 ? usersList[0] : user) || {
    id: '1',
    full_name: 'Kuruva Mahesh',
    role: 'UI/UX Designer',
    department: 'UI/UX Designer',
    email: 'mahesh@kalpanaaa.com'
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Top Employee Quick Switcher Bar */}
      {usersList.length > 0 && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '12px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={18} color="#4F46E5" />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Directory Members:</span>
            <select
              value={activeEmp?.id || ''}
              onChange={(e) => {
                const found = usersList.find(u => String(u.id) === String(e.target.value));
                if (found) setSelectedEmp(found);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1E293B',
                background: '#F8FAFC',
                cursor: 'pointer',
                minWidth: '220px'
              }}
            >
              {usersList.map(u => (
                <option key={u.id} value={u.id}>
                  {getUserFullName(u)} ({u.department || u.role || 'Member'})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Search */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '12.5px',
                background: '#FFFFFF'
              }}
            />
            {searchQuery && filteredUsers.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                zIndex: 50,
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {filteredUsers.map(u => (
                  <div
                    key={u.id}
                    onClick={() => {
                      setSelectedEmp(u);
                      setSearchQuery('');
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: '#1E293B',
                      cursor: 'pointer',
                      borderBottom: '1px solid #F1F5F9'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2FF'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                  >
                    {getUserFullName(u)} <span style={{ color: '#64748B', fontSize: '11px' }}>({u.role})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Employee Profile Overview */}
      <EmployeeProfileOverview
        employee={activeEmp}
        employeeId={activeEmp.id}
        onBack={() => {
          if (usersList.length > 0) setSelectedEmp(usersList[0]);
        }}
        onAssignTask={() => navigate('/tasks')}
        onSendMessage={() => navigate('/collaboration')}
      />
    </div>
  );
};

export default TeamDirectoryPage;
