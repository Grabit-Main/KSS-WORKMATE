import React, { useEffect, useState } from 'react';
import { getUsers, createUser } from '../api/users';
import { UserPlus } from 'lucide-react';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (loading) return <div>Loading users...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Manage Users</h2>
        <button className="btn btn-primary">
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
              <th style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>Status</th>
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
                <td style={{ padding: '12px 24px' }}>
                  <span style={{ 
                    fontSize: '12px', fontWeight: 600, padding: '4px 8px', borderRadius: '12px', 
                    background: u.is_active ? 'var(--status-completed-bg)' : 'var(--status-blocked-bg)', 
                    color: u.is_active ? 'var(--status-completed)' : 'var(--status-blocked)' 
                  }}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center' }}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersPage;
