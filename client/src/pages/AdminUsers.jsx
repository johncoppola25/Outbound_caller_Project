import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Users, Shield, Trash2, Crown, UserCheck, AlertCircle, ChevronDown, ChevronUp,
  DollarSign, Phone, Clock, CreditCard, Plus, Minus, X, CheckCircle, Smartphone
} from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [userPayments, setUserPayments] = useState({});
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [stats, setStats] = useState(null);

  const fetchUsers = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        apiFetch('/api/admin/users'),
        apiFetch('/api/admin/stats')
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      else setError('Failed to load users.');
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const fetchUserPayments = async (userId) => {
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/payments`);
      if (res.ok) {
        const data = await res.json();
        setUserPayments(prev => ({ ...prev, [userId]: data }));
      }
    } catch (e) { /* ignore */ }
  };

  const toggleExpand = (userId) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      if (!userPayments[userId]) fetchUserPayments(userId);
    }
  };

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

  const handleAdjustBalance = async () => {
    if (!adjustModal || !adjustAmount) return;
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount)) return;
    try {
      const res = await apiFetch(`/api/admin/users/${adjustModal}/balance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason: adjustReason })
      });
      if (res.ok) {
        setAdjustModal(null);
        setAdjustAmount('');
        setAdjustReason('');
        fetchUsers();
      }
    } catch (e) { /* ignore */ }
  };

  const typeLabel = (type) => {
    const labels = {
      setup_fee: 'Setup Fee',
      add_funds: 'Added Funds',
      auto_fund: 'Auto-Fund',
      subscription: 'Subscription',
      admin_adjustment: 'Admin Adjustment'
    };
    return labels[type] || type;
  };

  const typeColor = (type) => {
    const colors = {
      setup_fee: { bg: '#f3e8ff', color: '#7c3aed' },
      add_funds: { bg: '#ecfdf5', color: '#059669' },
      auto_fund: { bg: '#eff6ff', color: '#2563eb' },
      subscription: { bg: '#fefce8', color: '#b45309' },
      admin_adjustment: { bg: '#fef2f2', color: '#dc2626' }
    };
    return colors[type] || { bg: '#f3f4f6', color: '#6b7280' };
  };

  const nonAdminUsers = users.filter(u => u.role !== 'admin');

  if (loading) return <div style={{ padding: '40px', color: '#6b7280' }}>Loading users...</div>;

  return (
    <div>
      <Helmet>
        <title>User Management - EstateReach AI Admin</title>
        <meta name="description" content="Manage users, balances, and account statuses." />
      </Helmet>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>User Management</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Monitor users, payments, balances, and account status</p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', color: '#dc2626', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Users', value: nonAdminUsers.length, icon: Users, color: '#4f46e5' },
          { label: 'Active Subs', value: nonAdminUsers.filter(u => u.subscription_status === 'active').length, icon: CheckCircle, color: '#059669' },
          { label: 'Revenue This Month', value: `$${(stats?.revenueThisMonth || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: '#059669' },
          { label: 'Revenue All Time', value: `$${(stats?.revenueAllTime || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: CreditCard, color: '#8b5cf6' },
          { label: 'Calls This Month', value: stats?.callsThisMonth || 0, icon: Phone, color: '#2563eb' },
          { label: 'Total Minutes', value: (stats?.totalMinutes || 0).toLocaleString(), icon: Clock, color: '#f59e0b' },
        ].map((stat, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <stat.icon size={14} color={stat.color} />
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>{stat.label}</span>
            </div>
            <p style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: 0 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Users list */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>All Users</h2>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>{users.length} total ({nonAdminUsers.length} users, {users.length - nonAdminUsers.length} admins)</span>
        </div>

        {users.map(user => {
          const isExpanded = expandedUser === user.id;
          const payments = userPayments[user.id] || [];
          const balanceColor = (user.calling_balance || 0) < 20 ? '#dc2626' : (user.calling_balance || 0) < 50 ? '#b45309' : '#059669';

          return (
            <div key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              {/* User row */}
              <div
                onClick={() => user.role !== 'admin' && toggleExpand(user.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(180px, 1.5fr) minmax(100px, 1fr) 90px 100px 100px 100px 120px',
                  alignItems: 'center', padding: '12px 20px', gap: '8px',
                  cursor: user.role !== 'admin' ? 'pointer' : 'default',
                  background: isExpanded ? '#f9fafb' : 'transparent',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={e => { if (user.role !== 'admin') e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Name + email */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                    background: user.role === 'admin' ? '#8b5cf6' : '#4f46e5',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: '700'
                  }}>
                    {(user.name || 'U')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{user.name}</span>
                      {user.role === 'admin' && <Crown size={12} color="#8b5cf6" />}
                    </div>
                    <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                  </div>
                </div>

                {/* Balance */}
                <div>
                  {user.role !== 'admin' ? (
                    <span style={{ fontSize: '13px', fontWeight: '700', color: balanceColor }}>
                      ${(user.calling_balance || 0).toFixed(2)}
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>--</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span style={{
                    padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600',
                    background: user.subscription_status === 'active' ? '#ecfdf5' : user.setup_fee_paid ? '#fefce8' : '#fef2f2',
                    color: user.subscription_status === 'active' ? '#059669' : user.setup_fee_paid ? '#b45309' : '#dc2626'
                  }}>
                    {user.subscription_status === 'active' ? 'Active' : user.setup_fee_paid ? 'Setup Paid' : 'Unpaid'}
                  </span>
                </div>

                {/* This month */}
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>
                    ${(user.paid_this_month || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Total paid */}
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#4f46e5' }}>
                    ${(user.total_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Last payment */}
                <div>
                  {user.last_payment_at ? (
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                      {new Date(user.last_payment_at).toLocaleDateString()}
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#d1d5db' }}>Never</span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                  {user.role !== 'admin' && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setAdjustModal(user.id); }}
                        title="Adjust Balance"
                        style={{
                          background: '#ecfdf5', border: 'none', borderRadius: '6px',
                          padding: '5px', cursor: 'pointer', display: 'flex'
                        }}
                      >
                        <DollarSign size={13} color="#059669" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRoleChange(user.id, 'admin'); }}
                        title="Make Admin"
                        style={{
                          background: '#f3e8ff', border: 'none', borderRadius: '6px',
                          padding: '5px', cursor: 'pointer', display: 'flex'
                        }}
                      >
                        <Crown size={13} color="#7c3aed" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(user.id, user.name); }}
                        title="Delete User"
                        style={{
                          background: '#fef2f2', border: 'none', borderRadius: '6px',
                          padding: '5px', cursor: 'pointer', display: 'flex'
                        }}
                      >
                        <Trash2 size={13} color="#dc2626" />
                      </button>
                    </>
                  )}
                  {user.role === 'admin' && user.email !== 'admin@estatereach.com' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRoleChange(user.id, 'user'); }}
                      title="Remove Admin"
                      style={{
                        background: '#eef2ff', border: 'none', borderRadius: '6px',
                        padding: '5px', cursor: 'pointer', display: 'flex'
                      }}
                    >
                      <UserCheck size={13} color="#4f46e5" />
                    </button>
                  )}
                  {user.role !== 'admin' && (
                    isExpanded ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ padding: '0 20px 16px', background: '#f9fafb' }}>
                  {/* Quick stats row */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Balance', value: `$${(user.calling_balance || 0).toFixed(2)}`, color: balanceColor },
                      { label: 'Total Paid', value: `$${(user.total_paid || 0).toFixed(2)}`, color: '#4f46e5' },
                      { label: 'This Month', value: `$${(user.paid_this_month || 0).toFixed(2)}`, color: '#059669' },
                      { label: 'Payments', value: user.payment_count || 0, color: '#6b7280' },
                      { label: 'Phone Numbers', value: user.phone_numbers || 0, color: '#2563eb' },
                      { label: 'Auto-Fund', value: user.auto_fund_enabled ? 'ON' : 'OFF', color: user.auto_fund_enabled ? '#059669' : '#dc2626' },
                    ].map((s, i) => (
                      <div key={i} style={{
                        background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb',
                        padding: '8px 14px', minWidth: '100px'
                      }}>
                        <p style={{ fontSize: '10px', color: '#6b7280', margin: '0 0 2px', fontWeight: '500' }}>{s.label}</p>
                        <p style={{ fontSize: '15px', fontWeight: '700', color: s.color, margin: 0 }}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Payment history */}
                  <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={14} color="#4f46e5" />
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#111827' }}>Payment History</span>
                    </div>
                    {payments.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                        No payments recorded yet
                      </div>
                    ) : (
                      <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                        {payments.map(p => {
                          const tc = typeColor(p.type);
                          return (
                            <div key={p.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '9px 14px', borderBottom: '1px solid #f9fafb'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600',
                                  background: tc.bg, color: tc.color
                                }}>
                                  {typeLabel(p.type)}
                                </span>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>{p.description}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <span style={{
                                  fontSize: '13px', fontWeight: '700',
                                  color: p.amount >= 0 ? '#059669' : '#dc2626'
                                }}>
                                  {p.amount >= 0 ? '+' : ''}${Math.abs(p.amount).toFixed(2)}
                                </span>
                                <span style={{ fontSize: '11px', color: '#9ca3af', minWidth: '80px', textAlign: 'right' }}>
                                  {new Date(p.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Column headers */}
      </div>

      {/* Table column legend */}
      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '0 4px' }}>
        {['Name', 'Balance', 'Status', 'This Month', 'Total Paid', 'Last Payment', 'Actions'].map(h => (
          <span key={h} style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '500' }}>{h}</span>
        ))}
      </div>

      {/* Adjust Balance Modal */}
      {adjustModal && (
        <>
          <div onClick={() => setAdjustModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 1001, background: '#fff', borderRadius: '16px', padding: '24px',
            width: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#111827' }}>Adjust Balance</h3>
              <button onClick={() => setAdjustModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={18} color="#6b7280" />
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
              User: <strong>{users.find(u => u.id === adjustModal)?.name}</strong>
              <br />Current balance: <strong>${(users.find(u => u.id === adjustModal)?.calling_balance || 0).toFixed(2)}</strong>
            </p>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Amount (+ to add, - to deduct)</label>
              <input
                type="number"
                step="0.01"
                value={adjustAmount}
                onChange={e => setAdjustAmount(e.target.value)}
                placeholder="e.g. 50 or -25"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1.5px solid #e5e7eb', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Reason (optional)</label>
              <input
                type="text"
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                placeholder="e.g. Credit for downtime"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1.5px solid #e5e7eb', fontSize: '13px', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setAdjustModal(null)} style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb',
                background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#6b7280'
              }}>Cancel</button>
              <button onClick={handleAdjustBalance} style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                background: '#4f46e5', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#fff'
              }}>Apply</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
