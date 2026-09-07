import React, { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deactivateUser } from '../api/users';
import { UserPlus, X, Trash2, Power, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_ORDER = { CTO: 0, CEO: 1, PM: 2, HR: 3, TL: 4, TM: 5 };

const DEFAULT_DEPARTMENTS = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'UI/UX Designer',
  'DevOPS Engineer',
  'QA Tester',
  'Management',
  'Talent Acquisition',
  'Generative AI',
];

const UsersPage = () => {
  const [users, setUsers] = useState(() => {
    const cached = localStorage.getItem('cache_users');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(() => !localStorage.getItem('cache_users'));
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', role: 'TM', department: '', password: ''
  });

  // Department State with custom departments support (filtering out any test 'Example')
  const [departments, setDepartments] = useState(() => {
    const saved = localStorage.getItem('custom_departments');
    let custom = saved ? JSON.parse(saved) : [];
    custom = custom.filter(d => d && d.trim().toLowerCase() !== 'example' && d.trim() !== '');
    localStorage.setItem('custom_departments', JSON.stringify(custom));
    return Array.from(new Set([...DEFAULT_DEPARTMENTS, ...custom].filter(d => d && d.trim().toLowerCase() !== 'example')));
  });
  const [showAddDeptCreate, setShowAddDeptCreate] = useState(false);
  const [showAddDeptEdit, setShowAddDeptEdit] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');

  // Edit State
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    first_name: '', last_name: '', email: '', role: 'TM', department: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  const { user: currentUser } = useAuth();

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      // Sort by hierarchy: CTO, CEO, PM, HR, TL, TM
      const sorted = [...data].sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99));
      setUsers(sorted);
      localStorage.setItem('cache_users', JSON.stringify(sorted));

      // Merge any existing user departments into the dropdown list (excluding any "Example")
      const userDepts = data.map(u => u.department).filter(d => d && d.trim().toLowerCase() !== 'example');
      if (userDepts.length > 0) {
        setDepartments(prev => Array.from(new Set([...prev, ...userDepts].filter(d => d && d.trim().toLowerCase() !== 'example'))));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Check if a role is already taken (singleton roles: CEO, CTO)
  const isSingletonRoleTaken = (role) => {
    if (!['CEO', 'CTO'].includes(role)) return false;
    return users.some(u => u.role === role);
  };

  const handleAddNewDept = (mode) => {
    const trimmed = newDeptName.trim();
    if (!trimmed || trimmed.toLowerCase() === 'example') return;
    if (!departments.includes(trimmed)) {
      const updated = [...departments, trimmed];
      setDepartments(updated);
      const custom = updated.filter(d => !DEFAULT_DEPARTMENTS.includes(d) && d.trim().toLowerCase() !== 'example');
      localStorage.setItem('custom_departments', JSON.stringify(custom));
    }
    if (mode === 'create') {
      setFormData(prev => ({ ...prev, department: trimmed }));
      setShowAddDeptCreate(false);
    } else if (mode === 'edit') {
      setEditFormData(prev => ({ ...prev, department: trimmed }));
      setShowAddDeptEdit(false);
    }
    setNewDeptName('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createUser(formData);
      setShowModal(false);
      setFormData({ first_name: '', last_name: '', email: '', role: 'TM', department: '', password: '' });
      setShowAddDeptCreate(false);
      loadUsers();
    } catch (err) {
      alert('Failed to create user: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setEditFormData({
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      role: u.role,
      department: u.department || '',
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    try {
      await updateUser(editingUser.id, editFormData);
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      alert('Failed to update user: ' + (err.response?.data?.detail || err.message));
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleActive = async (u) => {
    if (['CEO', 'CTO'].includes(u.role)) {
      alert("CEO and CTO accounts cannot be disabled.");
      return;
    }
    if (u.id === currentUser?.id) {
      alert("You cannot disable your own account.");
      return;
    }
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      loadUsers();
    } catch (err) {
      alert('Failed to update user: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDelete = async (u) => {
    if (['CEO', 'CTO'].includes(u.role)) {
      alert("CEO and CTO accounts cannot be deleted.");
      return;
    }
    if (u.id === currentUser?.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete ${u.first_name}?`)) {
      try {
        await deactivateUser(u.id);
        loadUsers();
      } catch (err) {
        alert('Failed to delete user: ' + (err.response?.data?.detail || err.message));
      }
    }
  };

  // Roles available for new user creation: CTO, CEO, PM, HR, TM (TL is assigned only by PM in project assignment)
  const availableCreateRoles = ['CTO', 'CEO', 'PM', 'HR', 'TM'].filter(
    r => !['CEO', 'CTO'].includes(r) || !isSingletonRoleTaken(r)
  );

  if (loading) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em' }}>User Directory</h2>
            <p className="text-sm text-secondary mt-1">Manage team members, roles, and department allocations</p>
          </div>
          <button className="btn btn-primary" disabled style={{ opacity: 0.6 }}>
            <UserPlus size={16} /> Add User
          </button>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--subtle-glass)', textAlign: 'left', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>Name</th>
                <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>Email</th>
                <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>Role</th>
                <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>Department</th>
                <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>Status</th>
                <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map(i => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 24px' }}><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                  <td style={{ padding: '16px 24px' }}><div className="skeleton skeleton-text" style={{ width: '180px' }}></div></td>
                  <td style={{ padding: '16px 24px' }}><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                  <td style={{ padding: '16px 24px' }}><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                  <td style={{ padding: '16px 24px' }}><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                  <td style={{ padding: '16px 24px' }}><div className="skeleton skeleton-text" style={{ width: '100px', marginLeft: 'auto' }}></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.025em' }}>User Directory</h2>
          <p className="text-sm text-secondary mt-1">Manage team members, roles, and department allocations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--subtle-glass)', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>Team Member</th>
                <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>Email Address</th>
                <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>Role</th>
                <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>Department</th>
                <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>Status</th>
                <th style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', textAlign: 'right', minWidth: '220px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    transition: 'background var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--subtle-glass)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--brand-gradient)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                        flexShrink: 0
                      }}>
                        {u.first_name?.[0]}{u.last_name?.[0]}
                      </div>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {u.first_name} {u.last_name}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {u.email}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: ['CEO', 'CTO'].includes(u.role) ? 'var(--brand-100)' : 'var(--subtle)',
                      color: ['CEO', 'CTO'].includes(u.role) ? 'var(--brand-700)' : 'var(--text-secondary)',
                      letterSpacing: '0.02em',
                      border: '1px solid var(--border)'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {u.department ? (
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        padding: '3px 9px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--subtle)',
                        color: 'var(--text-secondary)'
                      }}>
                        {u.department}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-disabled)', fontStyle: 'italic' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-full)',
                      background: u.is_active ? 'var(--status-completed-bg)' : 'var(--status-blocked-bg)',
                      color: u.is_active ? 'var(--status-completed)' : 'var(--status-blocked)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: u.is_active ? 'var(--status-completed)' : 'var(--status-blocked)'
                      }} />
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="btn-outline"
                        title="Edit User"
                        style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', borderRadius: 'var(--radius-sm)' }}
                      >
                        <Pencil size={13} /> Edit
                      </button>

                      {/* Disable and Delete not shown for CEO and CTO */}
                      {!['CEO', 'CTO'].includes(u.role) && (
                        <>
                          <button
                            onClick={() => handleToggleActive(u)}
                            className="btn-outline"
                            title={u.is_active ? 'Disable Account' : 'Enable Account'}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              borderRadius: 'var(--radius-sm)',
                              color: u.is_active ? 'var(--text-secondary)' : 'var(--status-completed)'
                            }}
                          >
                            <Power size={13} /> {u.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            title="Delete User"
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: 'var(--status-blocked-bg)',
                              color: 'var(--status-blocked)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              transition: 'all var(--transition-fast)'
                            }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New User Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(12px) saturate(160%)',
          WebkitBackdropFilter: 'blur(12px) saturate(160%)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="card modal-animate" style={{
            width: '100%',
            maxWidth: '460px',
            padding: '28px',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-float)',
            background: 'var(--surface)',
            border: '1px solid var(--border)'
          }}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold text-lg" style={{ letterSpacing: '-0.02em' }}>Add New User</h3>
                <p className="text-xs text-secondary mt-0.5">Provision an account for a team member</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'var(--subtle)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: 'var(--radius-full)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18}/>
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-col gap-4">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">First Name</label>
                  <input required className="input" placeholder="e.g. Sarah" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Last Name</label>
                  <input required className="input" placeholder="e.g. Connor" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Work Email</label>
                <input required type="email" className="input" placeholder="name@company.in" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Assigned Role</label>
                <select className="input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  {availableCreateRoles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {['CEO', 'CTO'].includes(formData.role) && isSingletonRoleTaken(formData.role) && (
                  <p style={{ color: 'var(--status-blocked)', fontSize: '12px', marginTop: '5px' }}>
                    ⚠️ A {formData.role} already exists in the organization.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Department</label>

                {showAddDeptCreate && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: '13px', padding: '8px 12px' }}
                      placeholder="Enter new department name..."
                      value={newDeptName}
                      onChange={e => setNewDeptName(e.target.value)}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewDept('create');
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '8px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
                      onClick={() => handleAddNewDept('create')}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ padding: '8px 10px', fontSize: '12px' }}
                      onClick={() => { setShowAddDeptCreate(false); setNewDeptName(''); }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                <select
                  className="input"
                  value={formData.department}
                  onChange={e => {
                    if (e.target.value === '__add_new__') {
                      setShowAddDeptCreate(true);
                    } else {
                      setFormData({...formData, department: e.target.value});
                    }
                  }}
                >
                  <option value="">— Select Department —</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  <option value="__add_new__" style={{ color: 'var(--brand-600)', fontWeight: 600 }}>
                    + Add New Department...
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Password</label>
                <input required type="password" placeholder="Create temporary password" className="input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(12px) saturate(160%)',
          WebkitBackdropFilter: 'blur(12px) saturate(160%)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="card modal-animate" style={{
            width: '100%',
            maxWidth: '460px',
            padding: '28px',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-float)',
            background: 'var(--surface)',
            border: '1px solid var(--border)'
          }}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold text-lg" style={{ letterSpacing: '-0.02em' }}>Edit Member Profile</h3>
                <p className="text-xs text-secondary mt-0.5">Modify profile, role, or department details</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                style={{
                  background: 'var(--subtle)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: 'var(--radius-full)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18}/>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-col gap-4">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">First Name</label>
                  <input required className="input" value={editFormData.first_name} onChange={e => setEditFormData({...editFormData, first_name: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary mb-1.5 block">Last Name</label>
                  <input required className="input" value={editFormData.last_name} onChange={e => setEditFormData({...editFormData, last_name: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Email</label>
                <input required type="email" className="input" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Role</label>
                <select
                  className="input"
                  value={editFormData.role}
                  onChange={e => setEditFormData({...editFormData, role: e.target.value})}
                  disabled={['CEO', 'CTO'].includes(editingUser.role)}
                >
                  <option value="CTO" disabled={isSingletonRoleTaken('CTO') && editingUser.role !== 'CTO'}>
                    CTO{isSingletonRoleTaken('CTO') && editingUser.role !== 'CTO' ? ' (Already exists)' : ''}
                  </option>
                  <option value="CEO" disabled={isSingletonRoleTaken('CEO') && editingUser.role !== 'CEO'}>
                    CEO{isSingletonRoleTaken('CEO') && editingUser.role !== 'CEO' ? ' (Already exists)' : ''}
                  </option>
                  <option value="PM">PM</option>
                  <option value="HR">HR</option>
                  <option value="TL" disabled={editingUser.role !== 'TL'}>
                    TL{editingUser.role !== 'TL' ? ' (Assigned by PM in Projects)' : ''}
                  </option>
                  <option value="TM">TM</option>
                </select>
                {['CEO', 'CTO'].includes(editingUser.role) && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '5px' }}>
                    ℹ️ {editingUser.role} role cannot be altered.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary mb-1.5 block">Department</label>

                {showAddDeptEdit && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: '13px', padding: '8px 12px' }}
                      placeholder="Enter new department name..."
                      value={newDeptName}
                      onChange={e => setNewDeptName(e.target.value)}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewDept('edit');
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '8px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
                      onClick={() => handleAddNewDept('edit')}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ padding: '8px 10px', fontSize: '12px' }}
                      onClick={() => { setShowAddDeptEdit(false); setNewDeptName(''); }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                <select
                  className="input"
                  value={editFormData.department || ''}
                  onChange={e => {
                    if (e.target.value === '__add_new__') {
                      setShowAddDeptEdit(true);
                    } else {
                      setEditFormData({...editFormData, department: e.target.value});
                    }
                  }}
                >
                  <option value="">— Select Department —</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  <option value="__add_new__" style={{ color: 'var(--brand-600)', fontWeight: 600 }}>
                    + Add New Department...
                  </option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
