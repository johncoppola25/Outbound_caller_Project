import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Phone, Users, Megaphone, Calendar, CheckCircle2,
  ArrowUpRight, BarChart3, Upload, Activity, TrendingUp, Flame, Thermometer, Snowflake, DollarSign, Wallet, Clock,
  X, CreditCard, Smartphone, Zap
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [stats, setStats] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [telnyxCosts, setTelnyxCosts] = useState(null);
  const [callingBalance, setCallingBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showGettingStarted, setShowGettingStarted] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
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
    try { await Promise.all([fetchStats(), fetchRecentCalls(), fetchTelnyxCosts(), fetchBalance(), checkOnboarding()]); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function checkOnboarding() {
    try {
      const dismissed = sessionStorage.getItem('gettingStartedDismissed');
      if (dismissed) return;
      const [phoneRes, subRes] = await Promise.all([
        apiFetch('/api/phone-numbers/my-numbers'),
        apiFetch('/api/billing/subscription')
      ]);
      const phones = phoneRes.ok ? await phoneRes.json() : [];
      const sub = subRes.ok ? await subRes.json() : {};
      const status = {
        setupFeePaid: !!sub.setupFeePaid,
        hasSubscription: !!sub.subscription,
        hasPhoneNumber: Array.isArray(phones) && phones.length > 0
      };
      setOnboardingStatus(status);
      // Show popup if they haven't completed all steps
      if (!status.setupFeePaid || !status.hasSubscription || !status.hasPhoneNumber) {
        setShowGettingStarted(true);
      }
    } catch (err) { console.error('Onboarding check error:', err); }
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

  async function fetchTelnyxCosts() {
    try {
      const res = await apiFetch('/api/stats/telnyx-costs');
      if (res.ok) setTelnyxCosts(await res.json());
    } catch (err) { console.error('Error fetching Telnyx costs:', err); }
  }

  async function fetchBalance() {
    try {
      const res = await apiFetch('/api/billing/balance');
      if (res.ok) {
        const data = await res.json();
        setCallingBalance(data);
      }
    } catch (err) { console.error('Error fetching balance:', err); }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
      <Helmet>
        <title>Dashboard - OutReach AI</title>
        <meta name="description" content="Monitor your AI calling campaigns, track performance, and view real-time analytics." />
      </Helmet>
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

      {/* Calling Balance - visible to all users */}
      {callingBalance && (
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '14px', padding: isMobile ? '18px' : '22px 28px',
          marginBottom: '14px', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px', width: '150px', height: '150px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', borderRadius: '50%'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '9px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
              }}>
                <Wallet style={{ width: '17px', height: '17px', color: 'white' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#f9fafb', margin: 0 }}>Calling Balance</h2>
              </div>
            </div>
            <Link to="/billing" style={{
              padding: '6px 14px', background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px',
              color: '#6ee7b7', fontSize: '12px', fontWeight: '600', textDecoration: 'none'
            }}>
              Add Funds
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '12px', position: 'relative' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '22px', fontWeight: '800', color: callingBalance.balance < 5 ? '#f87171' : callingBalance.balance < 20 ? '#fbbf24' : '#6ee7b7', letterSpacing: '-0.02em' }}>
                ${(callingBalance.balance || 0).toFixed(2)}
              </p>
              <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', marginTop: '2px' }}>Current Balance</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '22px', fontWeight: '800', color: '#f9fafb', letterSpacing: '-0.02em' }}>
                {Math.floor((callingBalance.balance || 0) / (callingBalance.costPerMin || 0.25))}
              </p>
              <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', marginTop: '2px' }}>Minutes Remaining</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '14px', fontWeight: '700', color: callingBalance.autoFund?.enabled ? '#6ee7b7' : '#6b7280', letterSpacing: '-0.02em' }}>
                {callingBalance.autoFund?.enabled ? `ON - $${callingBalance.autoFund.amount}` : 'OFF'}
              </p>
              <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', marginTop: '2px' }}>Auto-Fund</p>
            </div>
          </div>
        </div>
      )}

      {/* Lead Scores Row */}
      {leadScores && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? '8px' : '14px', marginBottom: '14px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: isMobile ? '12px' : '16px 20px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '14px' }}>
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
        </div>
      )}

      {/* Telnyx Cost Tracker - Admin only */}
      {isAdmin && telnyxCosts && (
        <div style={{
          background: 'linear-gradient(135deg, #111827 0%, #1e293b 100%)',
          borderRadius: '14px', padding: isMobile ? '18px' : '22px 28px',
          marginBottom: '24px', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px', width: '150px', height: '150px',
            background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)', borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute', bottom: '-30px', left: '30%', width: '100px', height: '100px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', borderRadius: '50%'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '9px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
              }}>
                <DollarSign style={{ width: '17px', height: '17px', color: 'white' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#f9fafb', margin: 0 }}>Call Cost Tracker</h2>
                <p style={{ fontSize: '11px', color: '#6b7280', margin: '1px 0 0' }}>Last 30 days from Telnyx</p>
              </div>
            </div>
            {telnyxCosts.balance !== null && (
              <div style={{
                padding: '6px 14px', background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.25)', borderRadius: '20px',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '3px', background: '#10b981' }} />
                <span style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: '600' }}>Telnyx Balance: ${telnyxCosts.balance}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px', position: 'relative' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '22px', fontWeight: '800', color: '#f9fafb', letterSpacing: '-0.02em' }}>${telnyxCosts.totalCost}</p>
              <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', marginTop: '2px' }}>Total Spent</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '22px', fontWeight: '800', color: '#f9fafb', letterSpacing: '-0.02em' }}>{telnyxCosts.totalCalls}</p>
              <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', marginTop: '2px' }}>Calls Made</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '22px', fontWeight: '800', color: '#f9fafb', letterSpacing: '-0.02em' }}>${telnyxCosts.avgCostPerCall}</p>
              <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', marginTop: '2px' }}>Avg Cost/Call</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '22px', fontWeight: '800', color: '#f9fafb', letterSpacing: '-0.02em' }}>{telnyxCosts.totalDurationMin}m</p>
              <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', marginTop: '2px' }}>Total Talk Time</p>
            </div>
          </div>

          {/* Today's mini stats */}
          <div style={{
            display: 'flex', gap: '16px', marginTop: '14px', paddingTop: '14px',
            borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', position: 'relative'
          }}>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              Today: <span style={{ color: '#6ee7b7', fontWeight: '600' }}>${telnyxCosts.todayCost}</span> spent
            </span>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              <span style={{ color: '#a5b4fc', fontWeight: '600' }}>{telnyxCosts.todayCalls}</span> calls today
            </span>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              Avg call: <span style={{ color: '#fbbf24', fontWeight: '600' }}>{telnyxCosts.avgDurationSec}s</span>
            </span>
          </div>
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

      {/* Getting Started Popup */}
      {showGettingStarted && onboardingStatus && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
        }} onClick={() => { setShowGettingStarted(false); sessionStorage.setItem('gettingStartedDismissed', '1'); }}>
          <div style={{
            background: '#fff', borderRadius: '20px', maxWidth: '440px', width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.15)', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              padding: '28px 24px 24px', textAlign: 'center', position: 'relative'
            }}>
              <button onClick={() => { setShowGettingStarted(false); sessionStorage.setItem('gettingStartedDismissed', '1'); }} style={{
                position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.15)',
                border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <X style={{ width: '16px', height: '16px', color: '#fff' }} />
              </button>
              <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px'
              }}>
                <Zap style={{ width: '26px', height: '26px', color: '#a5b4fc' }} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: '0 0 6px' }}>Get Started with OutReach AI</h2>
              <p style={{ fontSize: '13px', color: '#a5b4fc', margin: 0 }}>Complete these steps to start making AI calls</p>
            </div>

            {/* Steps */}
            <div style={{ padding: '20px 24px 24px' }}>
              {[
                {
                  done: onboardingStatus.setupFeePaid,
                  icon: CreditCard,
                  title: 'Pay Setup Fee',
                  desc: 'One-time $500 setup to activate your account',
                  link: '/billing',
                  linkLabel: 'Go to Billing'
                },
                {
                  done: onboardingStatus.hasSubscription,
                  icon: Megaphone,
                  title: 'Choose a Plan',
                  desc: 'Pick Starter, Professional, or Enterprise',
                  link: '/billing',
                  linkLabel: 'Choose Plan'
                },
                {
                  done: onboardingStatus.hasPhoneNumber,
                  icon: Smartphone,
                  title: 'Buy a Phone Number',
                  desc: 'You need a number before you can make calls',
                  link: '/phone-numbers',
                  linkLabel: 'Buy Number'
                }
              ].map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px', borderRadius: '12px', marginBottom: i < 2 ? '8px' : '16px',
                  background: s.done ? '#f0fdf4' : '#f9fafb',
                  border: `1px solid ${s.done ? '#bbf7d0' : '#e5e7eb'}`
                }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                    background: s.done ? '#dcfce7' : '#eef2ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {s.done
                      ? <CheckCircle2 style={{ width: '20px', height: '20px', color: '#16a34a' }} />
                      : <s.icon style={{ width: '18px', height: '18px', color: '#4f46e5' }} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '14px', fontWeight: '700', margin: '0 0 2px',
                      color: s.done ? '#16a34a' : '#111827',
                      textDecoration: s.done ? 'line-through' : 'none'
                    }}>{s.title}</p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{s.desc}</p>
                  </div>
                  {!s.done && (
                    <Link to={s.link} onClick={() => { setShowGettingStarted(false); sessionStorage.setItem('gettingStartedDismissed', '1'); }} style={{
                      padding: '6px 14px', background: '#4f46e5', color: '#fff', borderRadius: '8px',
                      fontSize: '12px', fontWeight: '600', textDecoration: 'none', whiteSpace: 'nowrap'
                    }}>{s.linkLabel}</Link>
                  )}
                </div>
              ))}

              <button onClick={() => { setShowGettingStarted(false); sessionStorage.setItem('gettingStartedDismissed', '1'); }} style={{
                width: '100%', padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: '10px',
                fontSize: '13px', fontWeight: '600', color: '#6b7280', cursor: 'pointer'
              }}>
                I'll do this later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
