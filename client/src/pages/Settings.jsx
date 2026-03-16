import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  User, Lock, CreditCard, ShieldOff, Save, Eye, EyeOff,
  CheckCircle, AlertCircle, RefreshCw, ExternalLink
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, login } = useAuth();

  // Account info editing
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  // Billing
  const [subscription, setSubscription] = useState(null);
  const [billingPlan, setBillingPlan] = useState(null);
  const [setupFeePaid, setSetupFeePaid] = useState(false);
  const [billingLoading, setBillingLoading] = useState(true);
  const [cancelingPlan, setCancelingPlan] = useState(false);
  const [cancelMsg, setCancelMsg] = useState(null);

  // DNC list
  const [dncList, setDncList] = useState([]);
  const [dncPhone, setDncPhone] = useState('');
  const [dncLoading, setDncLoading] = useState(true);

  // Full user data from /me (includes created_at)
  const [fullUser, setFullUser] = useState(null);

  useEffect(() => {
    fetchMe();
    fetchSubscription();
    fetchDnc();
  }, []);

  async function fetchMe() {
    try {
      const res = await apiFetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        setFullUser(data.user);
        setEditName(data.user.name || '');
        setEditEmail(data.user.email || '');
      }
    } catch { /* ignore */ }
  }

  async function fetchSubscription() {
    setBillingLoading(true);
    try {
      const res = await apiFetch('/api/billing/subscription');
      const data = await res.json();
      setSubscription(data.subscription);
      setBillingPlan(data.plan);
      if (data.setupFeePaid) setSetupFeePaid(true);
    } catch { /* ignore */ }
    setBillingLoading(false);
  }

  async function cancelSubscription() {
    if (!confirm('Are you sure you want to cancel your subscription? Your access will continue until the end of your current billing period.')) return;
    setCancelingPlan(true);
    setCancelMsg(null);
    try {
      const res = await apiFetch('/api/billing/cancel-subscription', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setCancelMsg({ type: 'success', text: data.message || 'Subscription canceled.' });
        fetchSubscription();
      } else {
        setCancelMsg({ type: 'error', text: data.error || 'Failed to cancel.' });
      }
    } catch {
      setCancelMsg({ type: 'error', text: 'Failed to cancel subscription.' });
    }
    setCancelingPlan(false);
  }

  async function fetchDnc() {
    setDncLoading(true);
    try {
      const res = await apiFetch('/api/dnc');
      const data = await res.json();
      setDncList(data || []);
    } catch { setDncList([]); }
    setDncLoading(false);
  }

  async function addToDnc(e) {
    e.preventDefault();
    if (!dncPhone.trim()) return;
    try {
      await apiFetch('/api/dnc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: dncPhone.trim() })
      });
      setDncPhone('');
      fetchDnc();
    } catch (err) { console.error(err); }
  }

  async function removeFromDnc(phone) {
    try {
      await apiFetch(`/api/dnc/${encodeURIComponent(phone)}`, { method: 'DELETE' });
      fetchDnc();
    } catch (err) { console.error(err); }
  }

  async function handleProfileSave() {
    if (!editName.trim() || !editEmail.trim()) {
      setProfileMsg({ type: 'error', text: 'Name and email are required.' });
      return;
    }
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: editName.trim(), email: editEmail.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileMsg({ type: 'error', text: data.error || 'Failed to update profile.' });
      } else {
        // Determine if user was remembered (localStorage has token)
        const wasRemembered = !!localStorage.getItem('outreach_token');
        login(data.token, data.user, wasRemembered);
        setFullUser(data.user);
        setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Failed to update profile.' });
    }
    setProfileLoading(false);
  }

  async function handlePasswordChange() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'All fields are required.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg(null);
    try {
      const res = await apiFetch('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMsg({ type: 'error', text: data.error || 'Failed to change password.' });
      } else {
        setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Failed to change password.' });
    }
    setPasswordLoading(false);
  }

  const profileChanged = editName !== (fullUser?.name || user?.name || '') || editEmail !== (fullUser?.email || user?.email || '');

  const cardStyle = {
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    padding: '22px',
    marginBottom: '16px'
  };

  const headerStyle = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' };

  const iconWrapStyle = {
    width: '38px', height: '38px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  };

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    background: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    color: '#111827',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '4px'
  };

  const readOnlyFieldStyle = {
    padding: '9px 12px',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    color: '#4b5563',
    fontSize: '13px'
  };

  function StatusMessage({ msg }) {
    if (!msg) return null;
    const isError = msg.type === 'error';
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 14px',
        background: isError ? '#fef2f2' : '#ecfdf5',
        border: `1px solid ${isError ? '#fecaca' : '#a7f3d0'}`,
        borderRadius: '10px',
        color: isError ? '#dc2626' : '#059669',
        fontSize: '13px',
        marginTop: '12px'
      }}>
        {isError
          ? <AlertCircle style={{ width: '15px', height: '15px', flexShrink: 0 }} />
          : <CheckCircle style={{ width: '15px', height: '15px', flexShrink: 0 }} />
        }
        {msg.text}
      </div>
    );
  }

  const displayUser = fullUser || user;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      <Helmet>
        <title>Settings - OutReach AI</title>
        <meta name="description" content="Manage your account settings, profile, and preferences." />
      </Helmet>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>Settings</h1>
        <p style={{ color: '#4b5563', marginTop: '4px', fontSize: '14px' }}>Manage your account and preferences</p>
      </div>

      {/* Account Information */}
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, background: '#eef2ff', border: '1px solid #c7d2fe' }}>
            <User style={{ width: '18px', height: '18px', color: '#4f46e5' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>Account Information</h2>
            <p style={{ fontSize: '13px', color: '#4b5563' }}>Your profile details</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
          <div>
            <label style={labelStyle}>Company</label>
            <div style={readOnlyFieldStyle}>{displayUser?.company || 'Not set'}</div>
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <div style={readOnlyFieldStyle}>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                background: displayUser?.role === 'admin' ? '#f5f3ff' : '#eef2ff',
                border: `1px solid ${displayUser?.role === 'admin' ? '#ddd6fe' : '#c7d2fe'}`,
                color: displayUser?.role === 'admin' ? '#7c3aed' : '#4f46e5',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                {displayUser?.role || 'user'}
              </span>
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Member Since</label>
            <div style={readOnlyFieldStyle}>
              {displayUser?.created_at
                ? new Date(displayUser.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : 'Unknown'
              }
            </div>
          </div>
        </div>

        {profileChanged && (
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleProfileSave}
              disabled={profileLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 20px',
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: profileLoading ? 'not-allowed' : 'pointer',
                opacity: profileLoading ? 0.7 : 1,
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              <Save style={{ width: '14px', height: '14px' }} />
              {profileLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        <StatusMessage msg={profileMsg} />
      </div>

      {/* Change Password */}
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, background: '#fefce8', border: '1px solid #fde68a' }}>
            <Lock style={{ width: '18px', height: '18px', color: '#ca8a04' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>Change Password</h2>
            <p style={{ fontSize: '13px', color: '#4b5563' }}>Update your account password</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '14px', maxWidth: '400px' }}>
          <div>
            <label style={labelStyle}>Current Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                style={{ ...inputStyle, paddingRight: '36px' }}
                onFocus={e => e.target.style.borderColor = '#4f46e5'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#9ca3af'
                }}
              >
                {showCurrentPw
                  ? <EyeOff style={{ width: '15px', height: '15px' }} />
                  : <Eye style={{ width: '15px', height: '15px' }} />
                }
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                style={{ ...inputStyle, paddingRight: '36px' }}
                onFocus={e => e.target.style.borderColor = '#4f46e5'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#9ca3af'
                }}
              >
                {showNewPw
                  ? <EyeOff style={{ width: '15px', height: '15px' }} />
                  : <Eye style={{ width: '15px', height: '15px' }} />
                }
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
          <div>
            <button
              onClick={handlePasswordChange}
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 20px',
                background: '#ca8a04',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: (passwordLoading || !currentPassword || !newPassword || !confirmPassword) ? 'not-allowed' : 'pointer',
                opacity: (passwordLoading || !currentPassword || !newPassword || !confirmPassword) ? 0.6 : 1,
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              <Lock style={{ width: '14px', height: '14px' }} />
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>

        <StatusMessage msg={passwordMsg} />
      </div>

      {/* Billing Plan */}
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <CreditCard style={{ width: '18px', height: '18px', color: '#059669' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>Billing Plan</h2>
            <p style={{ fontSize: '13px', color: '#4b5563' }}>Your current subscription</p>
          </div>
        </div>

        {billingLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', color: '#4b5563', fontSize: '13px' }}>
            <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} />
            Loading billing info...
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '14px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plan</p>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                  {billingPlan || 'No plan'}
                </p>
              </div>
              <div style={{ padding: '14px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</p>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: subscription?.status === 'active' ? '#ecfdf5' : '#fef2f2',
                  color: subscription?.status === 'active' ? '#059669' : '#dc2626',
                  border: `1px solid ${subscription?.status === 'active' ? '#a7f3d0' : '#fecaca'}`
                }}>
                  {subscription?.status ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1) : 'None'}
                </span>
              </div>
              <div style={{ padding: '14px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Setup Fee</p>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: setupFeePaid ? '#ecfdf5' : '#fefce8',
                  color: setupFeePaid ? '#059669' : '#b45309',
                  border: `1px solid ${setupFeePaid ? '#a7f3d0' : '#fde68a'}`
                }}>
                  {setupFeePaid ? 'Paid' : 'Unpaid'}
                </span>
              </div>
            </div>
            {cancelMsg && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
                background: cancelMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                borderRadius: '8px', marginBottom: '8px',
                border: `1px solid ${cancelMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`
              }}>
                {cancelMsg.type === 'success' ? <CheckCircle style={{ width: '14px', height: '14px', color: '#059669' }} /> : <AlertCircle style={{ width: '14px', height: '14px', color: '#dc2626' }} />}
                <span style={{ fontSize: '12px', fontWeight: '500', color: cancelMsg.type === 'success' ? '#059669' : '#dc2626' }}>{cancelMsg.text}</span>
              </div>
            )}
            <div style={{ marginTop: '4px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link
                to="/billing"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '9px 18px',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  color: '#059669',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                <ExternalLink style={{ width: '14px', height: '14px' }} />
                Manage Billing
              </Link>
              {subscription?.status === 'active' && !subscription?.cancel_at_period_end && (
                <button
                  onClick={cancelSubscription}
                  disabled={cancelingPlan}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '9px 18px',
                    background: '#ffffff',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: cancelingPlan ? 'not-allowed' : 'pointer',
                    opacity: cancelingPlan ? 0.6 : 1,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  {cancelingPlan ? 'Canceling...' : 'Cancel Plan'}
                </button>
              )}
              {subscription?.cancel_at_period_end && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '9px 18px',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#b45309',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  Cancels at end of billing period
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DNC List */}
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, background: '#fef2f2', border: '1px solid #fecaca' }}>
            <ShieldOff style={{ width: '18px', height: '18px', color: '#dc2626' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>Do-Not-Call List</h2>
            <p style={{ fontSize: '13px', color: '#4b5563' }}>{dncList.length} number{dncList.length !== 1 ? 's' : ''} blocked</p>
          </div>
        </div>
        <form onSubmit={addToDnc} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text" placeholder="+1 555-123-4567" value={dncPhone}
            onChange={(e) => setDncPhone(e.target.value)}
            style={{ flex: 1, ...inputStyle }}
            onFocus={e => e.target.style.borderColor = '#4f46e5'}
            onBlur={e => e.target.style.borderColor = '#d1d5db'}
          />
          <button type="submit" style={{
            padding: '9px 16px', background: '#dc2626', border: '1px solid #dc2626',
            color: '#ffffff', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px'
          }}>Add</button>
        </form>
        {dncLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', color: '#4b5563', fontSize: '13px' }}>
            <RefreshCw style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} />
            Loading...
          </div>
        ) : dncList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
            {dncList.map((row) => (
              <div key={row.phone} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb'
              }}>
                <span style={{ fontFamily: 'monospace', fontWeight: '500', color: '#111827', fontSize: '13px' }}>{row.phone}</span>
                <button onClick={() => removeFromDnc(row.phone)} style={{
                  padding: '3px 10px', background: 'transparent', color: '#dc2626',
                  border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500'
                }}>Remove</button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#4b5563', fontSize: '13px' }}>No numbers on the list.</p>
        )}
      </div>
    </div>
  );
}
