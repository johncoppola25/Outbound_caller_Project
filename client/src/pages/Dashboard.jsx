import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Phone, 
  Users, 
  Megaphone, 
  TrendingUp, 
  Calendar,
  PhoneCall,
  PhoneOff,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  BarChart3,
  Upload
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    fetchDashboardData();
    
    // Subscribe to real-time updates
    const unsubscribe = subscribe((message) => {
      if (message.type === 'call_update') {
        setRecentCalls(prev => {
          const updated = [message.call, ...prev.filter(c => c.id !== message.call.id)];
          return updated.slice(0, 10);
        });
        // Refresh stats when a call updates
        fetchStats();
      }
    });
    
    return unsubscribe;
  }, [subscribe]);

  async function fetchDashboardData() {
    try {
      await Promise.all([fetchStats(), fetchRecentCalls()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/stats/dashboard');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }

  async function fetchRecentCalls() {
    try {
      const res = await fetch('/api/calls?limit=10');
      if (!res.ok) throw new Error('Failed to fetch calls');
      const data = await res.json();
      setRecentCalls(data.calls || []);
    } catch (err) {
      console.error('Error fetching calls:', err);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          border: '4px solid #deb040',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        Error: {error}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Active Campaigns',
      value: stats?.campaigns?.active_campaigns || 0,
      total: stats?.campaigns?.total_campaigns || 0,
      icon: Megaphone,
      color: '#deb040',
      bgColor: '#fbf7e8',
      link: '/campaigns'
    },
    {
      title: 'Total Contacts',
      value: stats?.contacts?.total_contacts || 0,
      subtitle: `${stats?.contacts?.pending_contacts || 0} pending`,
      icon: Users,
      color: '#1e2a45',
      bgColor: '#e9ecf5',
      link: '/contacts'
    },
    {
      title: 'Calls Today',
      value: stats?.today?.calls_today || 0,
      subtitle: `${stats?.today?.completed_today || 0} completed`,
      icon: Phone,
      color: '#10b981',
      bgColor: '#d1fae5',
      link: '/calls'
    },
    {
      title: 'Appointments',
      value: stats?.today?.appointments_today || 0,
      subtitle: 'Scheduled today',
      icon: Calendar,
      color: '#8b5cf6',
      bgColor: '#ede9fe',
      link: '/analytics'
    }
  ];

  return (
    <div>
      <style>{`
        .dash-stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px -12px rgba(30,42,69,0.18) !important; }
        .dash-call-row:hover { background: rgba(245,223,138,0.06); }
        .dash-quick-action:hover { background: white !important; color: #1e2a45 !important; }
        .dash-quick-action:hover span { color: #1e2a45 !important; }
        .dash-quick-action:hover .dash-qa-icon { color: #c8932f !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#0f172a', letterSpacing: '-0.02em' }}>
          Welcome back
        </h1>
        <p style={{ color: '#64748b', marginTop: '6px', fontSize: '16px' }}>
          Here's what's happening with your outreach campaigns today.
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
        gap: '20px', 
        marginBottom: '36px' 
      }}>
        {statCards.map((card) => (
          <Link
            key={card.title}
            to={card.link}
            className="dash-stat-card"
            style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 4px 24px -4px rgba(15,23,42,0.08), 0 2px 8px -2px rgba(15,23,42,0.04)',
              textDecoration: 'none',
              transition: 'all 0.25s ease',
              display: 'block',
              border: '1px solid rgba(15,23,42,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', letterSpacing: '0.02em' }}>{card.title}</p>
                <p style={{ fontSize: '34px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#0f172a', marginTop: '10px', letterSpacing: '-0.02em' }}>
                  {card.value}
                </p>
                {(card.subtitle || card.total !== undefined) && (
                  <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
                    {card.subtitle || (card.total !== undefined && `of ${card.total} total`)}
                  </p>
                )}
              </div>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: card.bgColor,
                boxShadow: '0 2px 8px -2px rgba(0,0,0,0.06)'
              }}>
                <card.icon style={{ width: '26px', height: '26px', color: card.color }} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div 
        className="dashboard-grid"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(0, 2fr) minmax(220px, 1fr)', 
          gap: '24px',
          alignItems: 'start'
        }}
      >
        {/* Recent Activity */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '20px', 
          boxShadow: '0 4px 24px -4px rgba(15,23,42,0.08), 0 2px 8px -2px rgba(15,23,42,0.04)',
          overflow: 'hidden',
          border: '1px solid rgba(15,23,42,0.04)'
        }}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#0f172a' }}>Recent Calls</h2>
              <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>Live call activity feed</p>
            </div>
            <Link to="/calls" style={{ fontSize: '14px', color: '#c8932f', fontWeight: '600', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }}>
              View all <ArrowUpRight style={{ width: '16px', height: '16px' }} />
            </Link>
          </div>
          
          <div>
            {recentCalls.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Phone style={{ width: '32px', height: '32px', color: '#cbd5e1' }} />
                </div>
                <p style={{ color: '#64748b', fontWeight: '500' }}>No calls yet</p>
                <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>Start a campaign to see call activity</p>
              </div>
            ) : (
              recentCalls.map((call) => (
                <Link 
                  key={call.id} 
                  to={`/calls/${call.id}`}
                  className="dash-call-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '18px',
                    padding: '18px 28px',
                    borderBottom: '1px solid #f8fafc',
                    textDecoration: 'none',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: call.status === 'completed' ? '#dcfce7' : '#fef9c3'
                  }}>
                    {call.status === 'completed' ? (
                      <CheckCircle2 style={{ width: '22px', height: '22px', color: '#16a34a' }} />
                    ) : (
                      <Phone style={{ width: '22px', height: '22px', color: '#c8932f' }} />
                    )}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: '600', color: '#1e293b', fontSize: '15px' }}>
                      {call.first_name} {call.last_name}
                    </p>
                    <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>{call.phone}</p>
                  </div>
                  
                  <span style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: call.status === 'completed' ? '#dcfce7' : '#fef9c3',
                    color: call.status === 'completed' ? '#16a34a' : '#c8932f',
                    flexShrink: 0
                  }}>
                    {call.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ 
          background: 'linear-gradient(165deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '20px', 
          padding: '28px',
          color: 'white',
          boxShadow: '0 8px 32px -8px rgba(15,23,42,0.2)'
        }}>
          <h3 style={{ fontSize: '20px', fontFamily: 'Playfair Display, serif', fontWeight: '600', marginBottom: '20px', color: 'white' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { to: '/campaigns', icon: Megaphone, label: 'Create Campaign' },
              { to: '/contacts', icon: Upload, label: 'Upload Contacts' },
              { to: '/analytics', icon: BarChart3, label: 'View Reports' }
            ].map(({ to, icon: Icon, label }) => (
              <Link 
                key={to}
                to={to}
                className="dash-quick-action"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 18px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  color: 'white',
                  transition: 'all 0.25s ease'
                }}
              >
                <Icon className="dash-qa-icon" style={{ width: '20px', height: '20px', color: '#f0d78c', flexShrink: 0 }} />
                <span style={{ fontSize: '15px', fontWeight: '500', color: 'rgba(255,255,255,0.95)' }}>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
