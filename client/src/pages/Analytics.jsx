import { useState, useEffect } from 'react';
import {
  BarChart3,
  Phone,
  Calendar,
  Clock,
  Target
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const COLORS = ['#4f46e5', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

export default function Analytics() {
  const [period, setPeriod] = useState('7d');
  const [analytics, setAnalytics] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const [analyticsRes, statsRes] = await Promise.all([
        fetch(`/api/stats/analytics?period=${period}`),
        fetch('/api/stats/dashboard')
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
  const appointmentsSet = dashboardStats?.outcomes?.find(o => o.outcome === 'appointment_scheduled')?.count || 0;
  const conversionRate = totalCalls > 0 ? (appointmentsSet / totalCalls * 100).toFixed(1) : 0;
  const avgDuration = Math.round(dashboardStats?.calls?.avg_duration || 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '10px', padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '6px' }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontSize: '13px', fontWeight: '600' }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>Analytics</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Track your outreach performance and insights</p>
        </div>
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

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Calls', value: totalCalls, icon: Phone, color: '#4f46e5', bg: '#eef2ff' },
          { label: 'Conversion Rate', value: `${conversionRate}%`, icon: Target, color: '#059669', bg: '#ecfdf5' },
          { label: 'Appointments', value: appointmentsSet, icon: Calendar, color: '#d97706', bg: '#fffbeb' },
          { label: 'Avg Duration', value: `${avgDuration}s`, icon: Clock, color: '#7c3aed', bg: '#f5f3ff' }
        ].map((stat) => (
          <div key={stat.label} style={{
            background: '#ffffff',
            borderRadius: '12px', padding: '22px',
            border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
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

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Calls Over Time */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px', padding: '22px',
          border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>Calls Over Time</h2>
          <div style={{ height: '280px' }}>
            {analytics?.callsOverTime?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.callsOverTime}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} fill="url(#colorTotal)" name="Total Calls" />
                  <Area type="monotone" dataKey="completed" stroke="#059669" strokeWidth={2} fill="url(#colorCompleted)" name="Completed" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: '14px' }}>
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Outcome Distribution */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px', padding: '22px',
          border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>Outcome Distribution</h2>
          <div style={{ height: '280px', display: 'flex', alignItems: 'center' }}>
            {analytics?.outcomeDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.outcomeDistribution}
                    cx="50%" cy="50%"
                    innerRadius={70} outerRadius={105}
                    paddingAngle={3} dataKey="count" nameKey="outcome"
                    stroke="transparent"
                  >
                    {analytics.outcomeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} formatter={(value, name) => [value, name.replace('_', ' ')]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: '#9ca3af', fontSize: '14px' }}>
                No outcomes recorded yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Campaign Performance */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px', padding: '22px',
        border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>Campaign Performance</h2>
        {analytics?.campaignPerformance?.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                    <td style={{ padding: '14px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>{campaign.avg_duration ? Math.round(campaign.avg_duration) + 's' : '--'}</td>
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
