import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Activity, Phone, Users, Megaphone, Calendar, BarChart3, Clock,
  TrendingUp, Target, PhoneCall, Voicemail, UserX, AlertTriangle,
  CreditCard, XCircle
} from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function AdminOverview() {
  const [platform, setPlatform] = useState(null);
  const [quality, setQuality] = useState(null);
  const [churn, setChurn] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/admin/platform-stats').then(r => r.ok ? r.json() : null),
      apiFetch('/api/admin/call-quality').then(r => r.ok ? r.json() : null),
      apiFetch('/api/admin/churn').then(r => r.ok ? r.json() : null)
    ]).then(([p, q, c]) => {
      setPlatform(p);
      setQuality(q);
      setChurn(c);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '40px', color: '#6b7280' }}>Loading overview...</div>;

  const statCard = (icon, label, value, color, bg) => (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{label}</span>
      </div>
      <p style={{ fontSize: '26px', fontWeight: '800', color: '#111827', margin: 0 }}>{value}</p>
    </div>
  );

  const pct = (val) => val != null ? `${val.toFixed(1)}%` : '0%';

  return (
    <div>
      <Helmet>
        <title>Platform Overview - OutReach AI Admin</title>
        <meta name="description" content="Live platform statistics and health monitoring." />
      </Helmet>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>Platform Overview</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Live stats, call quality, and churn tracking</p>
      </div>

      {/* Live Platform Stats */}
      <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 12px' }}>Live Platform Stats</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {statCard(<Megaphone size={17} color="#4f46e5" />, 'Active Campaigns', platform?.activeCampaigns || 0, '#4f46e5', '#eef2ff')}
        {statCard(<Phone size={17} color="#059669" />, 'Calls In Progress', platform?.callsInProgress || 0, '#059669', '#ecfdf5')}
        {statCard(<PhoneCall size={17} color="#7c3aed" />, 'Calls Today', platform?.callsToday || 0, '#7c3aed', '#f5f3ff')}
        {statCard(<Calendar size={17} color="#d97706" />, 'Appointments Today', platform?.appointmentsToday || 0, '#d97706', '#fffbeb')}
        {statCard(<Users size={17} color="#2563eb" />, 'Total Contacts', platform?.totalContacts || 0, '#2563eb', '#eff6ff')}
        {statCard(<Phone size={17} color="#0891b2" />, 'Phone Numbers', platform?.totalPhoneNumbers || 0, '#0891b2', '#ecfeff')}
        {statCard(<BarChart3 size={17} color="#4f46e5" />, 'Avg Calls/Campaign', platform?.avgCallsPerCampaign || 0, '#4f46e5', '#eef2ff')}
      </div>

      {/* Call Quality Metrics */}
      <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 12px' }}>Call Quality</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {statCard(<Clock size={17} color="#4f46e5" />, 'Avg Duration', quality?.avgDuration ? `${Math.round(quality.avgDuration)}s` : '0s', '#4f46e5', '#eef2ff')}
        {statCard(<Target size={17} color="#059669" />, 'Appointment Rate', pct(quality?.appointmentRate), '#059669', '#ecfdf5')}
        {statCard(<Voicemail size={17} color="#d97706" />, 'Voicemail Rate', pct(quality?.voicemailRate), '#d97706', '#fffbeb')}
        {statCard(<XCircle size={17} color="#dc2626" />, 'Not Interested', pct(quality?.notInterestedRate), '#dc2626', '#fef2f2')}
        {statCard(<PhoneCall size={17} color="#7c3aed" />, 'Callback Rate', pct(quality?.callbackRate), '#7c3aed', '#f5f3ff')}
        {statCard(<TrendingUp size={17} color="#0891b2" />, 'Avg Calls/Contact', quality?.avgCallsPerContact?.toFixed(1) || '0', '#0891b2', '#ecfeff')}
      </div>

      {/* Calls by Hour */}
      {quality?.callsByHour && quality.callsByHour.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: '0 0 14px' }}>Calls by Hour (Last 30 Days)</h2>
          <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '120px' }}>
            {Array.from({ length: 24 }, (_, h) => {
              const data = quality.callsByHour.find(c => c.hour === h);
              const count = data?.count || 0;
              const max = Math.max(...quality.callsByHour.map(c => c.count || 1));
              const height = Math.max(4, (count / max) * 100);
              return (
                <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600' }}>{count > 0 ? count : ''}</span>
                  <div style={{
                    width: '100%', height: `${height}px`,
                    background: count > 0 ? 'linear-gradient(180deg, #4f46e5, #818cf8)' : '#f3f4f6',
                    borderRadius: '3px 3px 1px 1px'
                  }} />
                  <span style={{ fontSize: '8px', color: '#9ca3af' }}>{h}h</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Churn Tracking */}
      <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 12px' }}>Churn & At-Risk Users</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
        {/* Canceled */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <XCircle size={16} color="#dc2626" />
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Canceled / Past Due</span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: '600', color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: '10px' }}>
              {churn?.canceled?.length || 0}
            </span>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {(!churn?.canceled || churn.canceled.length === 0) ? (
              <p style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>None</p>
            ) : churn.canceled.map(u => (
              <div key={u.id} style={{ padding: '10px 18px', borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
                <span style={{ fontWeight: '600', color: '#111827' }}>{u.name}</span>
                <span style={{ color: '#6b7280', marginLeft: '8px' }}>{u.email}</span>
                <span style={{ float: 'right', fontSize: '11px', color: '#dc2626', fontWeight: '500' }}>{u.subscription_status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inactive */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="#d97706" />
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Inactive (No Calls 30d)</span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: '600', color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: '10px' }}>
              {churn?.inactive?.length || 0}
            </span>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {(!churn?.inactive || churn.inactive.length === 0) ? (
              <p style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>None</p>
            ) : churn.inactive.map(u => (
              <div key={u.id} style={{ padding: '10px 18px', borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
                <span style={{ fontWeight: '600', color: '#111827' }}>{u.name}</span>
                <span style={{ color: '#6b7280', marginLeft: '8px' }}>{u.email}</span>
                <span style={{ float: 'right', fontSize: '11px', color: '#d97706', fontWeight: '500' }}>{u.subscription_plan || 'active'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Never Paid */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={16} color="#6b7280" />
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Never Paid Setup (7d+)</span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: '600', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '10px' }}>
              {churn?.neverPaid?.length || 0}
            </span>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {(!churn?.neverPaid || churn.neverPaid.length === 0) ? (
              <p style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>None</p>
            ) : churn.neverPaid.map(u => (
              <div key={u.id} style={{ padding: '10px 18px', borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
                <span style={{ fontWeight: '600', color: '#111827' }}>{u.name}</span>
                <span style={{ color: '#6b7280', marginLeft: '8px' }}>{u.email}</span>
                <span style={{ float: 'right', fontSize: '11px', color: '#9ca3af' }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
