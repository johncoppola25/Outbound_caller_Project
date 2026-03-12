import { useState, useEffect } from 'react';
import { Users, Shield, Trash2, Crown, UserCheck, AlertCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/api/admin/users');
      if (res.ok) {
        setUsers(await res.json());
      } else {
        setError('Failed to load users.');
      }
    } catch (err) {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) fetchUsers();
    } catch (err) { /* ignore */ }
  };

  const handleDelete = async (userId, name) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
    } catch (err) { /* ignore */ }
  };

  if (loading) return <div style={{ padding: '40px', color: '#6b7280' }}>Loading users...</div>;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>User Management</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>View and manage all registered users</p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Users', value: users.filter(u => u.role !== 'admin').length, icon: Users, color: '#4f46e5' },
          { label: 'Active Subscriptions', value: users.filter(u => u.subscription_status === 'active').length, icon: UserCheck, color: '#059669' },
          { label: 'Setup Fees Paid', value: users.filter(u => u.setup_fee_paid).length, icon: Shield, color: '#f59e0b' },
          { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: Crown, color: '#8b5cf6' },
        ].map((stat, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <stat.icon size={16} color={stat.color} />
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{stat.label}</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Name', 'Email', 'Company', 'Role', 'Setup Fee', 'Subscription', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px', fontWeight: '600', color: '#111827' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '7px',
                        background: user.role === 'admin' ? '#8b5cf6' : '#4f46e5',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: '700', flexShrink: 0
                      }}>
                        {(user.name || 'U')[0].toUpperCase()}
                      </div>
                      {user.name}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{user.email}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{user.company || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600',
                      background: user.role === 'admin' ? '#f3e8ff' : '#eef2ff',
                      color: user.role === 'admin' ? '#7c3aed' : '#4f46e5'
                    }}>
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600',
                      background: user.setup_fee_paid ? '#ecfdf5' : '#fef3f2',
                      color: user.setup_fee_paid ? '#059669' : '#dc2626'
                    }}>
                      {user.setup_fee_paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600',
                      background: user.subscription_status === 'active' ? '#ecfdf5' : '#f3f4f6',
                      color: user.subscription_status === 'active' ? '#059669' : '#9ca3af'
                    }}>
                      {user.subscription_status === 'active' ? 'Active' : user.subscription_status || 'None'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {user.role !== 'admin' && (
                        <>
                          <button
                            onClick={() => handleRoleChange(user.id, 'admin')}
                            title="Make Admin"
                            style={{
                              background: '#f3e8ff', border: 'none', borderRadius: '6px',
                              padding: '5px', cursor: 'pointer', display: 'flex'
                            }}
                          >
                            <Crown size={14} color="#7c3aed" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.name)}
                            title="Delete User"
                            style={{
                              background: '#fef2f2', border: 'none', borderRadius: '6px',
                              padding: '5px', cursor: 'pointer', display: 'flex'
                            }}
                          >
                            <Trash2 size={14} color="#dc2626" />
                          </button>
                        </>
                      )}
                      {user.role === 'admin' && user.email !== 'admin@estatereach.com' && (
                        <button
                          onClick={() => handleRoleChange(user.id, 'user')}
                          title="Remove Admin"
                          style={{
                            background: '#eef2ff', border: 'none', borderRadius: '6px',
                            padding: '5px', cursor: 'pointer', display: 'flex'
                          }}
                        >
                          <UserCheck size={14} color="#4f46e5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
