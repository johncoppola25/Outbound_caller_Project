import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Activity, LogIn, UserPlus, CreditCard, Shield, Trash2, Edit3,
  Key, ChevronLeft, ChevronRight, Search, Filter
} from 'lucide-react';
import { apiFetch } from '../utils/api';

const ACTION_META = {
  login: { icon: LogIn, color: '#2563eb', bg: '#eff6ff', label: 'Login' },
  register: { icon: UserPlus, color: '#059669', bg: '#ecfdf5', label: 'Register' },
  password_changed: { icon: Key, color: '#d97706', bg: '#fffbeb', label: 'Password Changed' },
  profile_updated: { icon: Edit3, color: '#7c3aed', bg: '#f5f3ff', label: 'Profile Updated' },
  role_changed: { icon: Shield, color: '#dc2626', bg: '#fef2f2', label: 'Role Changed' },
  balance_adjusted: { icon: CreditCard, color: '#059669', bg: '#ecfdf5', label: 'Balance Adjusted' },
  user_deleted: { icon: Trash2, color: '#dc2626', bg: '#fef2f2', label: 'User Deleted' },
  admin_profile_edit: { icon: Edit3, color: '#4f46e5', bg: '#eef2ff', label: 'Admin Edit' }
};

export default function AdminActivity() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const limit = 30;

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit, offset: (page - 1) * limit });
      if (actionFilter) params.set('action', actionFilter);
      const res = await apiFetch(`/api/admin/activity?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / limit);

  const filteredLogs = search
    ? logs.filter(l =>
        (l.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.action || '').toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const formatTime = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const now = new Date();
    const diff = now - dt;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const actions = ['login', 'register', 'password_changed', 'profile_updated', 'role_changed', 'balance_adjusted', 'user_deleted', 'admin_profile_edit'];

  return (
    <div>
      <Helmet>
        <title>Activity Log - OutReach AI Admin</title>
        <meta name="description" content="View user activity and system events." />
      </Helmet>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>Activity Log</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Track user logins, actions, and admin operations</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '300px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px 8px 32px', borderRadius: '8px',
              border: '1px solid #e5e7eb', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          style={{
            padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb',
            fontSize: '13px', color: '#374151', background: '#fff', cursor: 'pointer'
          }}
        >
          <option value="">All Actions</option>
          {actions.map(a => (
            <option key={a} value={a}>{ACTION_META[a]?.label || a}</option>
          ))}
        </select>
      </div>

      {/* Log Table */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No activity found</div>
        ) : (
          <div>
            {filteredLogs.map((log, i) => {
              const meta = ACTION_META[log.action] || { icon: Activity, color: '#6b7280', bg: '#f3f4f6', label: log.action };
              const Icon = meta.icon;
              let details = '';
              try {
                const d = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                if (d) {
                  if (log.action === 'balance_adjusted') details = `Amount: $${d.amount}, Reason: ${d.reason || 'N/A'}`;
                  else if (log.action === 'role_changed') details = `New role: ${d.newRole}`;
                  else if (log.action === 'login') details = d.email || '';
                  else if (log.action === 'register') details = d.email || '';
                  else details = Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ');
                }
              } catch (e) { details = log.details || ''; }

              return (
                <div key={log.id || i} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 18px', borderBottom: i < filteredLogs.length - 1 ? '1px solid #f3f4f6' : 'none'
                }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', background: meta.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Icon size={15} color={meta.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>
                        {log.user_name || 'System'}
                      </span>
                      <span style={{
                        padding: '1px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: '600',
                        background: meta.bg, color: meta.color
                      }}>{meta.label}</span>
                    </div>
                    {details && (
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {details}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{formatTime(log.created_at)}</p>
                    {log.ip && <p style={{ fontSize: '10px', color: '#9ca3af', margin: '2px 0 0' }}>{log.ip}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '6px 12px', borderRadius: '8px', border: '1px solid #e5e7eb',
              background: '#fff', cursor: page === 1 ? 'default' : 'pointer',
              opacity: page === 1 ? 0.5 : 1, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '6px 12px', borderRadius: '8px', border: '1px solid #e5e7eb',
              background: '#fff', cursor: page === totalPages ? 'default' : 'pointer',
              opacity: page === totalPages ? 0.5 : 1, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
