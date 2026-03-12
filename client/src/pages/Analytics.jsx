import { useState, useEffect } from 'react';
import {
  BarChart3,
  Phone,
  Calendar,
  Clock,
  Target,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  Voicemail,
  UserCheck,
  Users,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  XCircle,
  PhoneForwarded
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Analytics() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [period, setPeriod] = useState('7d');
  const [analytics, setAnalytics] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const [analyticsRes, statsRes] = await Promise.all([
        apiFetch(`/api/stats/analytics?period=${period}`),
        apiFetch('/api/stats/dashboard')
      ]);
      const analyticsData = await analyticsRes.json();
      const statsData = await statsRes.json();
      setAnalytics(analyticsData);
      setDashboardStats(statsData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  async function syncStaleCalls() {
    setSyncing(true);
    try {
      await apiFetch('/api/calls/sync-all-stale', { method: 'POST' });
      await fetchAnalytics();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  }

  const periodOptions = [
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const totalCalls = dashboardStats?.calls?.total_calls || 0;
  const completedCalls = dashboardStats?.calls?.completed_calls || 0;
  const activeCalls = dashboardStats?.calls?.active_calls || 0;
  const avgDuration = Math.round(dashboardStats?.calls?.avg_duration || 0);

  const outcomes = dashboardStats?.outcomes || [];
  const getOutcomeCount = (name) => outcomes.find(o => o.outcome === name)?.count || 0;

  const appointmentsSet = getOutcomeCount('appointment_scheduled');
  const callbackRequested = getOutcomeCount('callback_requested');
  const notInterested = getOutcomeCount('not_interested');
  const voicemails = getOutcomeCount('voicemail');
  const interested = getOutcomeCount('interested');
  const noAnswer = getOutcomeCount('no_answer');

  const answeredCalls = completedCalls - voicemails - noAnswer;
  const answerRate = totalCalls > 0 ? ((answeredCalls > 0 ? answeredCalls : completedCalls) / totalCalls * 100).toFixed(1) : 0;
  const conversionRate = totalCalls > 0 ? (appointmentsSet / totalCalls * 100).toFixed(1) : 0;

  const totalContacts = dashboardStats?.contacts?.total_contacts || 0;
  const pendingContacts = dashboardStats?.contacts?.pending_contacts || 0;
  const convertedContacts = dashboardStats?.contacts?.converted_contacts || 0;

  const todayCalls = dashboardStats?.today?.calls_today || 0;
  const todayCompleted = dashboardStats?.today?.completed_today || 0;
  const todayAppts = dashboardStats?.today?.appointments_today || 0;

  const weekCalls = dashboardStats?.thisWeek?.calls_this_week || 0;
  const weekCompleted = dashboardStats?.thisWeek?.completed_this_week || 0;
  const weekAppts = dashboardStats?.thisWeek?.appointments_this_week || 0;

  const hotLeads = dashboardStats?.leadScores?.hot || 0;
  const warmLeads = dashboardStats?.leadScores?.warm || 0;
  const coldLeads = dashboardStats?.leadScores?.cold || 0;

  const totalCost = dashboardStats?.costs?.total || 0;
  const todayCost = dashboardStats?.costs?.today || 0;

  const cardStyle = {
    background: '#ffffff', borderRadius: '12px', padding: '22px',
    border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
  };

  const formatDuration = (s) => {
    if (!s) return '0s';
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>Analytics</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Track your outreach performance and insights</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={syncStaleCalls}
            disabled={syncing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
              background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px',
              cursor: syncing ? 'default' : 'pointer', fontSize: '13px', fontWeight: '600',
              color: '#4b5563', opacity: syncing ? 0.6 : 1
            }}
          >
            <RefreshCw style={{ width: '14px', height: '14px', animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Syncing...' : 'Sync Calls'}
          </button>
          <div style={{
            display: 'flex', gap: '2px', background: '#ffffff',
            borderRadius: '10px', padding: '3px', border: '1px solid #e5e7eb'
          }}>
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                style={{
                  padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                  border: 'none', cursor: 'pointer',
                  backgroundColor: period === option.value ? '#4f46e5' : 'transparent',
                  color: period === option.value ? '#ffffff' : '#6b7280',
                  transition: 'all 0.2s'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Total Calls', value: totalCalls, icon: Phone, color: '#4f46e5', bg: '#eef2ff' },
          { label: 'Answer Rate', value: `${answerRate}%`, icon: PhoneCall, color: '#059669', bg: '#ecfdf5' },
          { label: 'Appointments', value: appointmentsSet, icon: Calendar, color: '#d97706', bg: '#fffbeb' },
          { label: 'Avg Duration', value: formatDuration(avgDuration), icon: Clock, color: '#7c3aed', bg: '#f5f3ff' }
        ].map((stat) => (
          <div key={stat.label} style={cardStyle}>
            <div style={{
              width: '40px', height: '40px', background: stat.bg,
              borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '14px'
            }}>
              <stat.icon style={{ width: '20px', height: '20px', color: stat.color }} />
            </div>
            <p style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>{stat.value}</p>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Call Outcomes Breakdown + Today/This Week */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        {/* Call Outcomes */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Call Outcomes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Answered & Completed', count: completedCalls, icon: CheckCircle, color: '#059669', bg: '#ecfdf5' },
              { label: 'Appointments Set', count: appointmentsSet, icon: Calendar, color: '#d97706', bg: '#fffbeb' },
              { label: 'Callbacks Requested', count: callbackRequested, icon: PhoneForwarded, color: '#4f46e5', bg: '#eef2ff' },
              { label: 'Interested', count: interested, icon: UserCheck, color: '#0891b2', bg: '#ecfeff' },
              { label: 'Not Interested', count: notInterested, icon: XCircle, color: '#dc2626', bg: '#fef2f2' },
              { label: 'Voicemail', count: voicemails, icon: Voicemail, color: '#7c3aed', bg: '#f5f3ff' },
              { label: 'No Answer', count: noAnswer, icon: PhoneMissed, color: '#9ca3af', bg: '#f9fafb' },
            ].map(({ label, count, icon: Icon, color, bg }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: '10px', background: bg
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon style={{ width: '16px', height: '16px', color }} />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{label}</span>
                </div>
                <span style={{ fontSize: '16px', fontWeight: '800', color }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Today */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '14px' }}>Today</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: '#eef2ff', borderRadius: '10px' }}>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#4f46e5' }}>{todayCalls}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500', marginTop: '2px' }}>Calls</p>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#ecfdf5', borderRadius: '10px' }}>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#059669' }}>{todayCompleted}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500', marginTop: '2px' }}>Completed</p>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#fffbeb', borderRadius: '10px' }}>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#d97706' }}>{todayAppts}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500', marginTop: '2px' }}>Appts</p>
              </div>
            </div>
            {isAdmin && todayCost > 0 && (
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px' }}>Est. cost today: ${todayCost.toFixed(2)}</p>
            )}
          </div>

          {/* This Week */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '14px' }}>This Week</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: '#eef2ff', borderRadius: '10px' }}>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#4f46e5' }}>{weekCalls}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500', marginTop: '2px' }}>Calls</p>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#ecfdf5', borderRadius: '10px' }}>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#059669' }}>{weekCompleted}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500', marginTop: '2px' }}>Completed</p>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#fffbeb', borderRadius: '10px' }}>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#d97706' }}>{weekAppts}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500', marginTop: '2px' }}>Appts</p>
              </div>
            </div>
          </div>

          {/* Lead Scores */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '14px' }}>Lead Score Breakdown</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '14px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
                <p style={{ fontSize: '24px', fontWeight: '800', color: '#dc2626' }}>{hotLeads}</p>
                <p style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600', marginTop: '2px' }}>Hot (80+)</p>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '14px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                <p style={{ fontSize: '24px', fontWeight: '800', color: '#d97706' }}>{warmLeads}</p>
                <p style={{ fontSize: '11px', color: '#d97706', fontWeight: '600', marginTop: '2px' }}>Warm (50-79)</p>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '14px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '24px', fontWeight: '800', color: '#6b7280' }}>{coldLeads}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', marginTop: '2px' }}>Cold (&lt;50)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Pipeline + Cost */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Contact Pipeline</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '32px', fontWeight: '800', color: '#111827' }}>{totalContacts}</span>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>total contacts</span>
              </div>
            </div>
          </div>
          {/* Pipeline bar */}
          {totalContacts > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', background: '#f3f4f6' }}>
                {convertedContacts > 0 && (
                  <div style={{ width: `${convertedContacts / totalContacts * 100}%`, background: '#059669', transition: 'width 0.3s' }} />
                )}
                {(totalContacts - pendingContacts - convertedContacts) > 0 && (
                  <div style={{ width: `${(totalContacts - pendingContacts - convertedContacts) / totalContacts * 100}%`, background: '#4f46e5', transition: 'width 0.3s' }} />
                )}
                {pendingContacts > 0 && (
                  <div style={{ width: `${pendingContacts / totalContacts * 100}%`, background: '#e5e7eb', transition: 'width 0.3s' }} />
                )}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Converted ({convertedContacts})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4f46e5' }} />
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>In Progress ({totalContacts - pendingContacts - convertedContacts})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e5e7eb' }} />
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Pending ({pendingContacts})</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cost Tracking - Admin only */}
        {isAdmin ? (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Cost Tracking</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '28px', fontWeight: '800', color: '#111827' }}>${totalCost.toFixed(2)}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500', marginTop: '4px' }}>Total Spend</p>
              </div>
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '28px', fontWeight: '800', color: '#111827' }}>
                  ${totalCalls > 0 ? (totalCost / totalCalls).toFixed(2) : '0.00'}
                </p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500', marginTop: '4px' }}>Cost Per Call</p>
              </div>
              <div style={{ padding: '16px', background: '#ecfdf5', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '28px', fontWeight: '800', color: '#059669' }}>
                  ${appointmentsSet > 0 ? (totalCost / appointmentsSet).toFixed(2) : '--'}
                </p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500', marginTop: '4px' }}>Cost Per Appointment</p>
              </div>
              <div style={{ padding: '16px', background: '#eef2ff', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '28px', fontWeight: '800', color: '#4f46e5' }}>{conversionRate}%</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500', marginTop: '4px' }}>Conversion Rate</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Performance</h2>
            <div style={{ padding: '16px', background: '#eef2ff', borderRadius: '10px', textAlign: 'center' }}>
              <p style={{ fontSize: '28px', fontWeight: '800', color: '#4f46e5' }}>{conversionRate}%</p>
              <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500', marginTop: '4px' }}>Conversion Rate</p>
            </div>
          </div>
        )}
      </div>

      {/* Campaign Performance */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>Campaign Performance</h2>
        {analytics?.campaignPerformance?.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr>
                  {['Campaign', 'Calls', 'Completed', 'Appts', 'Callbacks', 'Voicemail', 'Avg Dur', 'Conversion'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: h === 'Campaign' ? 'left' : 'center',
                      fontSize: '11px', fontWeight: '600', color: '#6b7280',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      borderBottom: '1px solid #e5e7eb',
                      background: '#f9fafb'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.campaignPerformance.map((campaign, idx) => {
                  const conversion = campaign.total_calls > 0 ? (campaign.appointments / campaign.total_calls * 100).toFixed(1) : 0;
                  return (
                    <tr key={campaign.id} style={{ borderBottom: idx < analytics.campaignPerformance.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <td style={{ padding: '14px' }}>
                        <p style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{campaign.name}</p>
                        <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'capitalize', marginTop: '2px' }}>{campaign.type}</p>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center', fontWeight: '700', color: '#111827', fontSize: '14px' }}>{campaign.total_calls}</td>
                      <td style={{ padding: '14px', textAlign: 'center', fontWeight: '700', color: '#059669', fontSize: '14px' }}>{campaign.completed_calls}</td>
                      <td style={{ padding: '14px', textAlign: 'center', fontWeight: '700', color: '#d97706', fontSize: '14px' }}>{campaign.appointments}</td>
                      <td style={{ padding: '14px', textAlign: 'center', fontWeight: '700', color: '#4f46e5', fontSize: '14px' }}>{campaign.callbacks || 0}</td>
                      <td style={{ padding: '14px', textAlign: 'center', fontWeight: '700', color: '#7c3aed', fontSize: '14px' }}>{campaign.voicemails || 0}</td>
                      <td style={{ padding: '14px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>{campaign.avg_duration ? formatDuration(Math.round(campaign.avg_duration)) : '--'}</td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '4px 10px',
                          borderRadius: '6px', fontSize: '12px', fontWeight: '700',
                          backgroundColor: conversion >= 10 ? '#ecfdf5' : conversion >= 5 ? '#fffbeb' : '#f3f4f6',
                          color: conversion >= 10 ? '#059669' : conversion >= 5 ? '#d97706' : '#6b7280'
                        }}>
                          {conversion}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <BarChart3 style={{ width: '40px', height: '40px', color: '#d1d5db', margin: '0 auto 12px' }} />
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>No campaign data yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
