import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Phone, 
  Calendar, 
  Clock,
  Target
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
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

const COLORS = ['#deb040', '#1e2a45', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4'];

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
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ width: '32px', height: '32px', border: '4px solid #deb040', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  const totalCalls = dashboardStats?.calls?.total_calls || 0;
  const appointmentsSet = dashboardStats?.outcomes?.find(o => o.outcome === 'appointment_scheduled')?.count || 0;
  const conversionRate = totalCalls > 0 ? (appointmentsSet / totalCalls * 100).toFixed(1) : 0;
  const avgDuration = Math.round(dashboardStats?.calls?.avg_duration || 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>Analytics</h1>
          <p style={{ color: '#8c735e', marginTop: '4px' }}>Track your outreach performance and insights</p>
        </div>
        
        <div style={{ display: 'flex', gap: '4px', backgroundColor: 'white', borderRadius: '12px', padding: '4px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: period === option.value ? '#1e2a45' : 'transparent',
                color: period === option.value ? 'white' : '#755f4e'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
        {[
          { label: 'Total Calls', value: totalCalls, icon: Phone, bg: '#e9ecf5', color: '#1e2a45' },
          { label: 'Conversion Rate', value: `${conversionRate}%`, icon: Target, bg: '#d1fae5', color: '#059669' },
          { label: 'Appointments Set', value: appointmentsSet, icon: Calendar, bg: '#fbf7e8', color: '#deb040' },
          { label: 'Avg. Duration', value: `${avgDuration}s`, icon: Clock, bg: '#ede9fe', color: '#7c3aed' }
        ].map((stat) => (
          <div key={stat.label} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: stat.bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon style={{ width: '24px', height: '24px', color: stat.color }} />
              </div>
            </div>
            <p style={{ fontSize: '30px', fontFamily: 'Playfair Display, serif', fontWeight: '700', color: '#151c30' }}>{stat.value}</p>
            <p style={{ fontSize: '14px', color: '#99826a', marginTop: '4px' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Calls Over Time */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
          <h2 style={{ fontSize: '18px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30', marginBottom: '24px' }}>Calls Over Time</h2>
          <div style={{ height: '288px' }}>
            {analytics?.callsOverTime?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.callsOverTime}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e2a45" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#1e2a45" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edeae5" />
                  <XAxis dataKey="date" stroke="#755f4e" fontSize={12} tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis stroke="#755f4e" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #edeae5', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="total" stroke="#1e2a45" strokeWidth={2} fill="url(#colorTotal)" name="Total Calls" />
                  <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fill="url(#colorCompleted)" name="Completed" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#99826a' }}>
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Outcome Distribution */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
          <h2 style={{ fontSize: '18px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30', marginBottom: '24px' }}>Outcome Distribution</h2>
          <div style={{ height: '288px', display: 'flex', alignItems: 'center' }}>
            {analytics?.outcomeDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.outcomeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="outcome"
                  >
                    {analytics.outcomeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #edeae5', borderRadius: '8px' }} formatter={(value, name) => [value, name.replace('_', ' ')]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: '#99826a' }}>
                No outcomes recorded yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Campaign Performance */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
        <h2 style={{ fontSize: '18px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30', marginBottom: '24px' }}>Campaign Performance</h2>
        {analytics?.campaignPerformance?.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7f6f4' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Campaign</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Calls</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Completed</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Appts</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Callbacks</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Voicemail</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Avg Dur</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Conversion</th>
              </tr>
            </thead>
            <tbody>
              {analytics.campaignPerformance.map((campaign, idx) => {
                const conversion = campaign.total_calls > 0 ? (campaign.appointments / campaign.total_calls * 100).toFixed(1) : 0;
                return (
                  <tr key={campaign.id} style={{ borderBottom: idx < analytics.campaignPerformance.length - 1 ? '1px solid #edeae5' : 'none' }}>
                    <td style={{ padding: '16px' }}>
                      <p style={{ fontWeight: '500', color: '#1e2a45' }}>{campaign.name}</p>
                      <p style={{ fontSize: '12px', color: '#ab9a82', textTransform: 'capitalize' }}>{campaign.type}</p>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#1e2a45' }}>{campaign.total_calls}</td>
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#059669' }}>{campaign.completed_calls}</td>
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#deb040' }}>{campaign.appointments}</td>
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#2563eb' }}>{campaign.callbacks || 0}</td>
                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#d97706' }}>{campaign.voicemails || 0}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>{campaign.avg_duration ? Math.round(campaign.avg_duration) + 's' : '—'}</td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: conversion >= 10 ? '#d1fae5' : conversion >= 5 ? '#fbf7e8' : '#edeae5',
                        color: conversion >= 10 ? '#059669' : conversion >= 5 ? '#a67328' : '#755f4e'
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
            <BarChart3 style={{ width: '48px', height: '48px', color: '#c4b9a7', margin: '0 auto 12px' }} />
            <p style={{ color: '#99826a' }}>No campaign data yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
