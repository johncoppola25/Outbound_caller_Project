import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

let cachedUsers = null;

export default function AdminUserFilter({ selectedUserId, onUserChange }) {
  const [users, setUsers] = useState(cachedUsers || []);

  useEffect(() => {
    if (cachedUsers) return;
    apiFetch('/api/admin/users').then(res => res.json()).then(data => {
      const list = Array.isArray(data) ? data.filter(u => u.role !== 'admin') : [];
      cachedUsers = list;
      setUsers(list);
    }).catch(() => {});
  }, []);

  return (
    <select
      value={selectedUserId}
      onChange={e => onUserChange(e.target.value)}
      style={{
        padding: '8px 14px', background: '#ffffff', border: '1px solid #e5e7eb',
        borderRadius: '10px', fontSize: '13px', fontWeight: '600', color: '#4b5563',
        cursor: 'pointer', outline: 'none', maxWidth: '220px'
      }}
    >
      <option value="">All Users</option>
      {users.map(u => (
        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
      ))}
    </select>
  );
}
