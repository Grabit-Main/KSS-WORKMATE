import React, { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deactivateUser } from '../api/users';
import { UserPlus, X, Trash2, Power, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_ORDER = { CTO: 0, CEO: 1, PM: 2, TL: 3, TM: 4 };

const DEPARTMENTS = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'UI/UX Designer',
  'DevOPS Engineer',
  'QA Tester',
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
      // Sort by hierarchy: CTO, CEO, PM, TL, TM
      const sorted = [...data].sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99));
      setUsers(sorted);
      localStorage.setItem('cache_users', JSON.stringify(sorted));
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

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createUser(formData);
      setShowModal(false);
      setFormData({ first_name: '', last_name: '', email: '', role: 'TM', department: '', password: '' });
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

  // Roles available for new user creation: CTO, CEO, PM, TM (TL is assigned only by PM in project assignment)
  const availableCreateRoles = ['CTO', 'CEO', 'PM', 'TM'].filter(
    r => !['CEO', 'CTO'].includes(r) || !isSingletonRoleTaken(r)
  );

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Manage Users</h2>
          <button className="btn btn-primary" disabled><UserPlus size={16} /> Add User</button>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--subtle)', textAlign: 'left' }}>
                <th style={{ padding: '12px 24px' }}>Name</th>
                <th style={{ padding: '12px 24px' }}>Email</th>
                <th style={{ padding: '12px 24px' }}>Role</th>
                <th style={{ padding: '12px 24px' }}>Department</th>
                <th style={{ padding: '12px 24px' }}>Status</th>
                <th style={{ padding: '12px 24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map(i => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 24px' }}><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                  <td style={{ padding: '12px 24px' }}><div className="skeleton skeleton-text" style={{ width: '180px' }}></div></td>
                  <td style={{ padding: '12px 24px' }}><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                  <td style={{ padding: '12px 24px' }}><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                  <td style={{ padding: '12px 24px' }}><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                  <td style={{ padding: '12px 24px' }}><div className="skeleton skeleton-text" style={{ width: '100px', marginLeft: 'auto' }}></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Manage Users</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--subtle)', textAlign: 'left' }}>
              <th style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>Name</th>
              <th style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>Email</th>
              <th style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>Role</th>
              <th style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>Department</th>
              <th style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>Status</th>
              <th style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', textAlign: 'right', minWidth: '220px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 24px' }}>
                  <div className="font-medium">{u.first_name} {u.last_name}</div>
                </td>
                <td style={{ padding: '12px 24px', color: 'var(--text-secondary)' }}>{u.email}</td>
                <td style={{ padding: '12px 24px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 8px', borderRadius: '12px', background: 'var(--brand-100)', color: 'var(--brand-700)' }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '12px 24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {u.department || <span style={{ color: 'var(--text-disabled)', fontStyle: 'italic' }}>—</span>}
                </td>
                <td style={{ padding: '12px 24px' }}>
                  <span style={{
                    fontSize: '12px', fontWeight: 600, padding: '4px 8px', borderRadius: '12px',
                    background: u.is_active ? 'var(--status-completed-bg)' : 'var(--status-blocked-bg)',
                    color: u.is_active ? 'var(--status-completed)' : 'var(--status-blocked)'
                  }}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="btn-outline"
                      title="Edit User"
                      style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Pencil size={14} /> Edit
                    </button>

                    {/* Disable and Delete not shown for CEO and CTO */}
                    {!['CEO', 'CTO'].includes(u.role) && (
                      <>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className="btn-outline"
                          title={u.is_active ? 'Disable' : 'Enable'}
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Power size={14} /> {u.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          title="Delete"
                          style={{
                            padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px',
                            background: 'var(--status-blocked-bg)', color: 'var(--status-blocked)',
                            border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500
                          }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center' }}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add New User Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Add New User</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleCreate} className="flex-col gap-4">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="text-sm font-medium mb-1 block">First Name</label>
                  <input required className="input" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Last Name</label>
                  <input required className="input" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <input required type="email" className="input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Role</label>
                <select className="input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  {availableCreateRoles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {['CEO', 'CTO'].includes(formData.role) && isSingletonRoleTaken(formData.role) && (
                  <p style={{ color: 'var(--status-blocked)', fontSize: '12px', marginTop: '4px' }}>
                    A {formData.role} already exists.
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Department</label>
                <select className="input" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                  <option value="">— Select Department —</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Password</label>
                <input required type="password" className="input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary mt-2">Create User</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Edit User</h3>
              <button onClick={() => setEditingUser(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleEditSubmit} className="flex-col gap-4">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="text-sm font-medium mb-1 block">First Name</label>
                  <input required className="input" value={editFormData.first_name} onChange={e => setEditFormData({...editFormData, first_name: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Last Name</label>
                  <input required className="input" value={editFormData.last_name} onChange={e => setEditFormData({...editFormData, last_name: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <input required type="email" className="input" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Role</label>
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
                  <option value="TL" disabled={editingUser.role !== 'TL'}>
                    TL{editingUser.role !== 'TL' ? ' (Assigned by PM in Projects)' : ''}
                  </option>
                  <option value="TM">TM</option>
                </select>
                {['CEO', 'CTO'].includes(editingUser.role) && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                    {editingUser.role} accounts cannot change role.
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Department</label>
                <select className="input" value={editFormData.department || ''} onChange={e => setEditFormData({...editFormData, department: e.target.value})}>
                  <option value="">— Select Department —</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button type="submit" className="btn btn-primary mt-2" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
