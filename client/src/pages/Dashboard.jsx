import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, Users, Megaphone, Calendar, CheckCircle2,
  ArrowUpRight, BarChart3, Upload, Activity, TrendingUp, Flame, Thermometer, Snowflake, DollarSign
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { apiFetch } from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const unsubscribe = subscribe((message) => {
      if (message.type === 'call_update') {
        setRecentCalls(prev => {
          const updated = [message.call, ...prev.filter(c => c.id !== message.call.id)];
          return updated.slice(0, 10);
        });
        fetchStats();
      }
    });
    return unsubscribe;
  }, [subscribe]);

  async function fetchDashboardData() {
    try { await Promise.all([fetchStats(), fetchRecentCalls()]); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function fetchStats() {
    try {
      const res = await apiFetch('/api/stats/dashboard');
      if (!res.ok) throw new Error('Failed to fetch stats');
      setStats(await res.json());
    } catch (err) { console.error('Error fetching stats:', err); }
  }

  async function fetchRecentCalls() {
    try {
      const res = await apiFetch('/api/calls?limit=10');
      if (!res.ok) throw new Error('Failed to fetch calls');
      const data = await res.json();
      setRecentCalls(data.calls || []);
    } catch (err) { console.error('Error fetching calls:', err); }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: '16px', color: '#b91c1c', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca', fontSize: '14px' }}>Error: {error}</div>;
  }

  const statCards = [
    { title: 'Active Campaigns', value: stats?.campaigns?.active_campaigns || 0, sub: `of ${stats?.campaigns?.total_campaigns || 0} total`, icon: Megaphone, color: '#4f46e5', bg: '#eef2ff', link: '/campaigns' },
    { title: 'Total Contacts', value: stats?.contacts?.total_contacts || 0, sub: `${stats?.contacts?.pending_contacts || 0} pending`, icon: Users, color: '#7c3aed', bg: '#f5f3ff', link: '/contacts' },
    { title: 'Calls Today', value: stats?.today?.calls_today || 0, sub: `${stats?.today?.completed_today || 0} completed`, icon: Phone, color: '#059669', bg: '#ecfdf5', link: '/calls' },
    { title: 'Appointments', value: stats?.today?.appointments_today || 0, sub: 'Scheduled today', icon: Calendar, color: '#d97706', bg: '#fffbeb', link: '/appointments' }
  ];

  const leadScores = stats?.leadScores;
  const costs = stats?.costs;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827' }}>Dashboard</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Here's what's happening with your outreach campaigns today.</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {statCards.map((card, i) => (
          <Link key={card.title} to={card.link} style={{
            background: '#fff', borderRadius: '12px', padding: '20px',
            textDecoration: 'none', border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease',
            animation: `fadeIn 0.3s ease-out ${i * 0.04}s both`
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>{card.title}</p>
                <p style={{ fontSize: '28px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em', lineHeight: 1 }}>{card.value}</p>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>{card.sub}</p>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: card.bg }}>
                <card.icon style={{ width: '20px', height: '20px', color: card.color }} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Lead Scores + Cost Row */}
      {(leadScores || costs) && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
          {leadScores && <>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame style={{ width: '18px', height: '18px', color: '#dc2626' }} />
              </div>
              <div>
                <p style={{ fontSize: '20px', fontWeight: '800', color: '#111827' }}>{leadScores.hot}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>Hot Leads</p>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Thermometer style={{ width: '18px', height: '18px', color: '#d97706' }} />
              </div>
              <div>
                <p style={{ fontSize: '20px', fontWeight: '800', color: '#111827' }}>{leadScores.warm}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>Warm Leads</p>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Snowflake style={{ width: '18px', height: '18px', color: '#4f46e5' }} />
              </div>
              <div>
                <p style={{ fontSize: '20px', fontWeight: '800', color: '#111827' }}>{leadScores.cold}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>Cold Leads</p>
              </div>
            </div>
          </>}
          {costs && (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign style={{ width: '18px', height: '18px', color: '#059669' }} />
              </div>
              <div>
                <p style={{ fontSize: '20px', fontWeight: '800', color: '#111827' }}>${(costs.total || 0).toFixed(2)}</p>
                <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>Total Spend</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(200px, 1fr)', gap: '14px', alignItems: 'start' }}>
        {/* Recent Calls */}
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity style={{ width: '17px', height: '17px', color: '#4f46e5' }} />
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>Recent Calls</h2>
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>Live activity feed</p>
              </div>
            </div>
            <Link to="/calls" style={{
              fontSize: '12px', color: '#4f46e5', fontWeight: '600', textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: '3px',
              padding: '5px 10px', borderRadius: '7px', background: '#eef2ff'
            }}>
              View all <ArrowUpRight style={{ width: '13px', height: '13px' }} />
            </Link>
          </div>

          <div>
            {recentCalls.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f9fafb', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Phone style={{ width: '22px', height: '22px', color: '#9ca3af' }} />
                </div>
                <p style={{ color: '#6b7280', fontWeight: '500', fontSize: '14px' }}>No calls yet</p>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>Start a campaign to see call activity</p>
              </div>
            ) : (
              recentCalls.map((call, idx) => (
                <Link key={call.id} to={`/calls/${call.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px',
                  borderBottom: idx < recentCalls.length - 1 ? '1px solid #f3f4f6' : 'none',
                  textDecoration: 'none', transition: 'background 0.1s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '9px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: call.status === 'completed' ? '#ecfdf5' : '#fffbeb'
                  }}>
                    {call.status === 'completed'
                      ? <CheckCircle2 style={{ width: '16px', height: '16px', color: '#059669' }} />
                      : <Phone style={{ width: '16px', height: '16px', color: '#d97706' }} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: '600', color: '#111827', fontSize: '13px' }}>{call.first_name} {call.last_name}</p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '1px' }}>{call.phone}</p>
                  </div>
                  <span className={`status-badge status-${call.status}`}>{call.status}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <TrendingUp style={{ width: '17px', height: '17px', color: '#4f46e5' }} />
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>Quick Actions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { to: '/campaigns', icon: Megaphone, label: 'Create Campaign', color: '#4f46e5', bg: '#eef2ff' },
              { to: '/contacts', icon: Upload, label: 'Upload Contacts', color: '#7c3aed', bg: '#f5f3ff' },
              { to: '/analytics', icon: BarChart3, label: 'View Reports', color: '#059669', bg: '#ecfdf5' }
            ].map(({ to, icon: Icon, label, color, bg }) => (
              <Link key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: '9px', textDecoration: 'none', color: '#111827',
                transition: 'all 0.12s ease', fontSize: '13px', fontWeight: '500'
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                <div style={{ width: '30px', height: '30px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
                  <Icon style={{ width: '15px', height: '15px', color }} />
                </div>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
