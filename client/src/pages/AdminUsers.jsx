import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Users, Shield, Trash2, Crown, UserCheck, AlertCircle, ChevronDown, ChevronUp,
  DollarSign, Phone, Clock, CreditCard, Plus, Minus, X, CheckCircle, Smartphone,
  BarChart3, Target, PhoneCall, Calendar, MapPin, ArrowLeft, Edit3, Save, Eye, EyeOff,
  Search, LogIn, Pause, Play, Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

export default function AdminUsers() {
  const { login: authLogin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [userPayments, setUserPayments] = useState({});
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [stats, setStats] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSecondaryEmails, setEditSecondaryEmails] = useState([]);
  const [newSecondaryEmail, setNewSecondaryEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPw, setShowEditPw] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionMsg, setActionMsg] = useState(null);

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

  const viewUserDetails = async (user) => {
    setSelectedUser(user);
    setUserDataLoading(true);
    try {
      const [dataRes, payRes] = await Promise.all([
        apiFetch(`/api/admin/users/${user.id}/data`),
        apiFetch(`/api/admin/users/${user.id}/payments`)
      ]);
      if (dataRes.ok) setUserData(await dataRes.json());
      if (payRes.ok) {
        const payData = await payRes.json();
        setUserPayments(prev => ({ ...prev, [user.id]: payData }));
      }
    } catch (e) { /* ignore */ }
    setUserDataLoading(false);
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

  const openEditModal = (user) => {
    setEditModal(user.id);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditSecondaryEmails(user.secondary_emails ? user.secondary_emails.split(',').filter(e => e.trim()) : []);
    setNewSecondaryEmail('');
    setEditPassword('');
    setEditMsg(null);
  };

  const handleEditProfile = async () => {
    if (!editModal) return;
    setEditSaving(true);
    setEditMsg(null);
    try {
      const body = {};
      if (editName) body.name = editName;
      if (editEmail) body.email = editEmail;
      if (editPassword) body.password = editPassword;
      body.secondary_emails = editSecondaryEmails.join(',');
      const res = await apiFetch(`/api/admin/users/${editModal}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setEditMsg({ type: 'success', text: 'Profile updated!' });
        fetchUsers();
        if (selectedUser?.id === editModal) {
          setSelectedUser(prev => ({ ...prev, name: editName || prev.name, email: editEmail || prev.email }));
        }
        setTimeout(() => { setEditModal(null); setEditMsg(null); }, 1000);
      } else {
        setEditMsg({ type: 'error', text: data.error || 'Failed to update.' });
      }
    } catch {
      setEditMsg({ type: 'error', text: 'Failed to update profile.' });
    }
    setEditSaving(false);
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

  const handleImpersonate = async (user) => {
    if (!confirm(`Impersonate "${user.name}"? You'll be logged in as this user for 1 hour.`)) return;
    try {
      const res = await apiFetch(`/api/admin/users/${user.id}/impersonate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        authLogin(data.token, data.user, true);
        window.location.href = '/dashboard';
      } else {
        const data = await res.json();
        setActionMsg({ type: 'error', text: data.error || 'Failed to impersonate.' });
      }
    } catch { setActionMsg({ type: 'error', text: 'Failed to impersonate.' }); }
  };

  const handlePauseCampaigns = async (userId, name) => {
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/pause-campaigns`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActionMsg({ type: 'success', text: `Paused ${data.paused} campaigns for ${name}` });
      }
    } catch { setActionMsg({ type: 'error', text: 'Failed to pause campaigns.' }); }
  };

  const handleResumeCampaigns = async (userId, name) => {
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/resume-campaigns`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActionMsg({ type: 'success', text: `Resumed ${data.resumed} campaigns for ${name}` });
      }
    } catch { setActionMsg({ type: 'error', text: 'Failed to resume campaigns.' }); }
  };

  // Filter users
  const nonAdminUsers = users.filter(u => {
    if (u.role === 'admin') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(u.name || '').toLowerCase().includes(q) && !(u.email || '').toLowerCase().includes(q)) return false;
    }
    if (planFilter && (u.subscription_plan || '') !== planFilter) return false;
    if (statusFilter === 'active' && u.subscription_status !== 'active') return false;
    if (statusFilter === 'inactive' && u.subscription_status === 'active') return false;
    if (statusFilter === 'setup_pending' && u.setup_fee_paid) return false;
    return true;
  });

  if (loading) return <div style={{ padding: '40px', color: '#6b7280' }}>Loading users...</div>;

  // User detail view
  if (selectedUser) {
    const payments = userPayments[selectedUser.id] || [];
    const d = userData;
    const cs = d?.callStats || {};
    const cts = d?.contactStats || {};

    return (
      <div>
        <Helmet><title>{selectedUser.name} - Admin</title></Helmet>

        {/* Back button + header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => { setSelectedUser(null); setUserData(null); }} style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
            padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}>
            <ArrowLeft size={16} color="#6b7280" />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px', background: '#4f46e5',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: '700'
              }}>
                {(selectedUser.name || 'U')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>{selectedUser.name}</h1>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{selectedUser.email}</p>
              </div>
              <button
                onClick={() => openEditModal(selectedUser)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', background: '#eef2ff', border: '1px solid #c7d2fe',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#4f46e5'
                }}
              >
                <Edit3 size={14} /> Edit User
              </button>
            </div>
          </div>
        </div>

        {userDataLoading ? (
          <div style={{ padding: '40px', color: '#6b7280', textAlign: 'center' }}>Loading user data...</div>
        ) : d ? (
          <>
            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Balance', value: `$${(selectedUser.calling_balance || 0).toFixed(2)}`, icon: DollarSign, color: (selectedUser.calling_balance || 0) < 20 ? '#dc2626' : '#059669' },
                { label: 'Campaigns', value: d.campaigns?.length || 0, icon: Target, color: '#4f46e5' },
                { label: 'Total Contacts', value: cts.total || 0, icon: Users, color: '#2563eb' },
                { label: 'Total Calls', value: cs.total_calls || 0, icon: PhoneCall, color: '#8b5cf6' },
                { label: 'Appointments', value: cs.appointments || 0, icon: Calendar, color: '#059669' },
                { label: 'Avg Duration', value: cs.avg_duration ? `${Math.round(cs.avg_duration)}s` : '--', icon: Clock, color: '#f59e0b' },
                { label: 'Call Cost', value: `$${(cs.total_cost || 0).toFixed(2)}`, icon: BarChart3, color: '#dc2626' },
                { label: 'Phone Numbers', value: d.phoneNumbers?.length || 0, icon: Smartphone, color: '#0ea5e9' },
              ].map((s, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <s.icon size={13} color={s.color} />
                    <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>{s.label}</span>
                  </div>
                  <p style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: 0 }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Campaigns */}
            <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', marginBottom: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={15} color="#4f46e5" />
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Campaigns ({d.campaigns?.length || 0})</span>
              </div>
              {(!d.campaigns || d.campaigns.length === 0) ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No campaigns yet</div>
              ) : d.campaigns.map(c => (
                <div key={c.id} style={{ padding: '12px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{c.name}</span>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '2px' }}>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>{c.contact_count} contacts</span>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>{c.call_count} calls</span>
                      <span style={{ fontSize: '11px', color: '#059669' }}>{c.appointments || 0} appts</span>
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600',
                    background: c.status === 'active' ? '#ecfdf5' : '#fef3c7',
                    color: c.status === 'active' ? '#059669' : '#b45309'
                  }}>{c.status}</span>
                </div>
              ))}
            </div>

            {/* Recent Calls + Appointments side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              {/* Recent Calls */}
              <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PhoneCall size={15} color="#8b5cf6" />
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Recent Calls</span>
                </div>
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {(!d.recentCalls || d.recentCalls.length === 0) ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No calls yet</div>
                  ) : d.recentCalls.map(cl => (
                    <div key={cl.id} style={{ padding: '10px 18px', borderBottom: '1px solid #f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#111827' }}>
                          {cl.first_name} {cl.last_name}
                        </span>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{cl.campaign_name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          padding: '1px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: '600',
                          background: cl.outcome === 'appointment_scheduled' ? '#ecfdf5' : cl.outcome === 'not_interested' ? '#fef2f2' : '#f3f4f6',
                          color: cl.outcome === 'appointment_scheduled' ? '#059669' : cl.outcome === 'not_interested' ? '#dc2626' : '#6b7280'
                        }}>
                          {(cl.outcome || cl.status || '').replace(/_/g, ' ')}
                        </span>
                        <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                          {cl.duration_seconds ? `${Math.round(cl.duration_seconds / 60)}m` : ''} {cl.created_at ? new Date(cl.created_at).toLocaleDateString() : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Appointments */}
              <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={15} color="#059669" />
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Appointments ({d.appointments?.length || 0})</span>
                </div>
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {(!d.appointments || d.appointments.length === 0) ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No appointments</div>
                  ) : d.appointments.map(apt => (
                    <div key={apt.id} style={{ padding: '10px 18px', borderBottom: '1px solid #f9fafb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#111827' }}>
                          {apt.first_name} {apt.last_name}
                        </span>
                        <span style={{ fontSize: '11px', color: '#4f46e5', fontWeight: '600' }}>
                          {apt.appointment_at || 'TBD'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{apt.campaign_name} - {apt.phone}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={15} color="#4f46e5" />
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Payment History ({payments.length})</span>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {payments.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No payments</div>
                ) : payments.map(p => {
                  const tc = typeColor(p.type);
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 18px', borderBottom: '1px solid #f9fafb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600', background: tc.bg, color: tc.color }}>
                          {typeLabel(p.type)}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{p.description}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: p.amount >= 0 ? '#059669' : '#dc2626' }}>
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
            </div>
          </>
        ) : (
          <div style={{ padding: '40px', color: '#dc2626', textAlign: 'center' }}>Failed to load user data</div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Helmet>
        <title>User Management - OutReach AI Admin</title>
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

      {/* Action message */}
      {actionMsg && (
        <div style={{
          background: actionMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${actionMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          borderRadius: '10px', padding: '10px 16px', marginBottom: '16px',
          color: actionMsg.type === 'success' ? '#059669' : '#dc2626',
          fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
            <X size={14} color={actionMsg.type === 'success' ? '#059669' : '#dc2626'} />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '300px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text" placeholder="Search by name or email..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', background: '#fff', cursor: 'pointer' }}>
          <option value="">All Plans</option>
          <option value="starter">Starter</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px', background: '#fff', cursor: 'pointer' }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="setup_pending">Setup Pending</option>
        </select>
      </div>

      {/* Users list */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>All Users</h2>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>{nonAdminUsers.length} shown of {users.length} total</span>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(150px, 1.3fr) 70px 90px 80px 70px 80px 80px 90px 120px',
          alignItems: 'center', padding: '8px 20px', gap: '8px',
          background: '#f9fafb', borderBottom: '1px solid #e5e7eb'
        }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</span>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Setup Fee</span>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plan</span>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Balance</span>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>This Month</span>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Paid</span>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Payment</span>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</span>
        </div>

        {users.map(user => {
          const isExpanded = expandedUser === user.id;
          const payments = userPayments[user.id] || [];
          const balanceColor = (user.calling_balance || 0) < 20 ? '#dc2626' : (user.calling_balance || 0) < 50 ? '#b45309' : '#059669';

          return (
            <div key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              {/* User row */}
              <div
                onClick={() => user.role !== 'admin' && viewUserDetails(user)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(150px, 1.3fr) 70px 90px 80px 70px 80px 80px 90px 120px',
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
                    <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.email}
                      {user.secondary_emails && <span style={{ color: '#9ca3af' }}> +{user.secondary_emails.split(',').filter(e => e.trim()).length}</span>}
                    </p>
                  </div>
                </div>

                {/* Setup Fee */}
                <div>
                  {user.role !== 'admin' ? (
                    <span style={{
                      padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600',
                      background: user.setup_fee_paid ? '#ecfdf5' : '#fef2f2',
                      color: user.setup_fee_paid ? '#059669' : '#dc2626'
                    }}>
                      {user.setup_fee_paid ? 'Paid' : 'Unpaid'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>--</span>
                  )}
                </div>

                {/* Plan */}
                <div>
                  {user.role !== 'admin' ? (
                    <span style={{
                      fontSize: '11px', fontWeight: '600',
                      color: user.subscription_plan ? '#4f46e5' : '#9ca3af'
                    }}>
                      {user.subscription_plan ? ({ starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise', monthly: 'Professional' }[user.subscription_plan] || user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1)) : 'None'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>--</span>
                  )}
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
                        onClick={(e) => { e.stopPropagation(); openEditModal(user); }}
                        title="Edit User"
                        style={{
                          background: '#eef2ff', border: 'none', borderRadius: '6px',
                          padding: '5px', cursor: 'pointer', display: 'flex'
                        }}
                      >
                        <Edit3 size={13} color="#4f46e5" />
                      </button>
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
                        onClick={(e) => { e.stopPropagation(); handleImpersonate(user); }}
                        title="Impersonate User"
                        style={{
                          background: '#fffbeb', border: 'none', borderRadius: '6px',
                          padding: '5px', cursor: 'pointer', display: 'flex'
                        }}
                      >
                        <LogIn size={13} color="#d97706" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePauseCampaigns(user.id, user.name); }}
                        title="Pause All Campaigns"
                        style={{
                          background: '#fef2f2', border: 'none', borderRadius: '6px',
                          padding: '5px', cursor: 'pointer', display: 'flex'
                        }}
                      >
                        <Pause size={13} color="#dc2626" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResumeCampaigns(user.id, user.name); }}
                        title="Resume All Campaigns"
                        style={{
                          background: '#ecfdf5', border: 'none', borderRadius: '6px',
                          padding: '5px', cursor: 'pointer', display: 'flex'
                        }}
                      >
                        <Play size={13} color="#059669" />
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
                  {user.role === 'admin' && user.email !== 'admin@outreach.com' && (
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
      {/* Edit User Modal */}
      {editModal && (
        <>
          <div onClick={() => setEditModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 1001, background: '#fff', borderRadius: '16px', padding: '24px',
            width: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#111827' }}>Edit User</h3>
              <button onClick={() => setEditModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={18} color="#6b7280" />
              </button>
            </div>

            {editMsg && (
              <div style={{
                padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', fontWeight: '500',
                background: editMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: editMsg.type === 'success' ? '#059669' : '#dc2626',
                border: `1px solid ${editMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`
              }}>
                {editMsg.text}
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Username</label>
              <input
                type="text" value={editName} onChange={e => setEditName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Primary Email <span style={{ fontWeight: '400', color: '#9ca3af' }}>(used for login)</span></label>
              <input
                type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Additional Emails</label>
              {editSecondaryEmails.map((em, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <input
                    type="email" value={em}
                    onChange={e => {
                      const updated = [...editSecondaryEmails];
                      updated[i] = e.target.value;
                      setEditSecondaryEmails(updated);
                    }}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={() => setEditSecondaryEmails(editSecondaryEmails.filter((_, idx) => idx !== i))}
                    style={{ background: '#fef2f2', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex' }}
                  >
                    <X size={14} color="#dc2626" />
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="email" value={newSecondaryEmail}
                  onChange={e => setNewSecondaryEmail(e.target.value)}
                  placeholder="Add another email"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newSecondaryEmail.trim()) {
                      e.preventDefault();
                      setEditSecondaryEmails([...editSecondaryEmails, newSecondaryEmail.trim()]);
                      setNewSecondaryEmail('');
                    }
                  }}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
                <button
                  onClick={() => {
                    if (newSecondaryEmail.trim()) {
                      setEditSecondaryEmails([...editSecondaryEmails, newSecondaryEmail.trim()]);
                      setNewSecondaryEmail('');
                    }
                  }}
                  style={{
                    background: '#ecfdf5', border: 'none', borderRadius: '6px',
                    padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '12px', fontWeight: '600', color: '#059669'
                  }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>New Password <span style={{ fontWeight: '400', color: '#9ca3af' }}>(leave blank to keep current)</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showEditPw ? 'text' : 'password'} value={editPassword} onChange={e => setEditPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
                <button onClick={() => setShowEditPw(!showEditPw)} style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px'
                }}>
                  {showEditPw ? <EyeOff size={16} color="#9ca3af" /> : <Eye size={16} color="#9ca3af" />}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setEditModal(null)} style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb',
                background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#6b7280'
              }}>Cancel</button>
              <button onClick={handleEditProfile} disabled={editSaving} style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                background: '#4f46e5', cursor: editSaving ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: '600', color: '#fff', opacity: editSaving ? 0.6 : 1
              }}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
