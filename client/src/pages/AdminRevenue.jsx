import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  DollarSign, TrendingUp, Clock, CreditCard, AlertCircle, Users,
  ArrowUpRight, ArrowDownRight, Calendar, Wallet
} from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function AdminRevenue() {
  const [revenue, setRevenue] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('payments');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [revRes, statsRes] = await Promise.all([
          apiFetch('/api/admin/revenue'),
          apiFetch('/api/admin/stats')
        ]);
        if (revRes.ok) setRevenue(await revRes.json());
        if (statsRes.ok) setStats(await statsRes.json());
      } catch (err) {
        setError('Failed to load revenue data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const typeLabel = (type) => {
    const labels = {
      setup_fee: 'Setup Fee',
      add_funds: 'Added Funds',
      auto_fund: 'Auto-Fund',
      subscription: 'Subscription',
      admin_adjustment: 'Admin Adj.'
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

  const monthName = (ym) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const revenueChange = stats ? (stats.revenueThisMonth - stats.revenueLastMonth) : 0;
  const changePercent = stats?.revenueLastMonth > 0
    ? ((revenueChange / stats.revenueLastMonth) * 100).toFixed(0)
    : stats?.revenueThisMonth > 0 ? 100 : 0;

  if (loading) return <div style={{ padding: '40px', color: '#6b7280' }}>Loading revenue...</div>;

  return (
    <div>
      <Helmet>
        <title>Revenue - EstateReach AI Admin</title>
        <meta name="description" content="Track platform revenue, payments, and Stripe balance." />
      </Helmet>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>Revenue & Payments</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Track all payments, revenue trends, and Stripe balance</p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', color: '#dc2626', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {/* Revenue this month - big card */}
        <div style={{ background: '#4f46e5', borderRadius: '14px', padding: '20px', color: '#fff', gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', opacity: 0.8 }}>
            <DollarSign size={14} />
            <span style={{ fontSize: '12px', fontWeight: '500' }}>Revenue This Month</span>
          </div>
          <p style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 4px' }}>
            ${(stats?.revenueThisMonth || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {revenueChange >= 0
              ? <ArrowUpRight size={14} color="#86efac" />
              : <ArrowDownRight size={14} color="#fca5a5" />}
            <span style={{ fontSize: '12px', color: revenueChange >= 0 ? '#86efac' : '#fca5a5', fontWeight: '600' }}>
              {changePercent > 0 ? '+' : ''}{changePercent}% vs last month
            </span>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Calendar size={14} color="#6b7280" />
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Last Month</span>
          </div>
          <p style={{ fontSize: '26px', fontWeight: '800', color: '#111827', margin: 0 }}>
            ${(stats?.revenueLastMonth || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <TrendingUp size={14} color="#6b7280" />
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>All-Time Revenue</span>
          </div>
          <p style={{ fontSize: '26px', fontWeight: '800', color: '#111827', margin: 0 }}>
            ${(stats?.revenueAllTime || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Wallet size={14} color="#6b7280" />
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Stripe Balance</span>
          </div>
          <p style={{ fontSize: '26px', fontWeight: '800', color: '#059669', margin: 0 }}>
            ${(revenue?.available || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {(revenue?.pending || 0) > 0 && (
            <p style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px', fontWeight: '500' }}>
              + ${revenue.pending.toFixed(2)} pending
            </p>
          )}
        </div>
      </div>

      {/* Revenue by type */}
      {revenue?.byType && revenue.byType.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb',
          padding: '20px', marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: '0 0 14px' }}>Revenue Breakdown</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {revenue.byType.map(item => {
              const tc = typeColor(item.type);
              return (
                <div key={item.type} style={{
                  flex: '1 1 140px', background: '#f9fafb', borderRadius: '10px',
                  padding: '14px', border: '1px solid #f3f4f6'
                }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600',
                    background: tc.bg, color: tc.color
                  }}>{typeLabel(item.type)}</span>
                  <p style={{ fontSize: '22px', fontWeight: '800', color: '#111827', margin: '8px 0 2px' }}>
                    ${(item.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{item.count} payments</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly trend */}
      {revenue?.monthlyRevenue && revenue.monthlyRevenue.length > 0 && (
        <div style={{
          background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb',
          padding: '20px', marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: '0 0 14px' }}>Monthly Revenue</h2>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '140px' }}>
            {revenue.monthlyRevenue.slice().reverse().map(m => {
              const maxVal = Math.max(...revenue.monthlyRevenue.map(x => x.total || 1));
              const height = Math.max(8, ((m.total || 0) / maxVal) * 120);
              return (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: '#111827' }}>
                    ${(m.total || 0) >= 1000 ? `${(m.total / 1000).toFixed(1)}k` : (m.total || 0).toFixed(0)}
                  </span>
                  <div style={{
                    width: '100%', maxWidth: '40px', height: `${height}px`,
                    background: 'linear-gradient(180deg, #4f46e5, #818cf8)',
                    borderRadius: '6px 6px 2px 2px', transition: 'height 0.3s'
                  }} />
                  <span style={{ fontSize: '9px', color: '#6b7280', whiteSpace: 'nowrap' }}>{monthName(m.month)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent payments table */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', margin: 0 }}>All Payments</h2>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            {revenue?.recentPayments?.length || 0} recent transactions
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Date', 'User', 'Type', 'Description', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!revenue?.recentPayments || revenue.recentPayments.length === 0) ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                    No payments recorded yet
                  </td>
                </tr>
              ) : (
                revenue.recentPayments.map(p => {
                  const tc = typeColor(p.type);
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div>
                          <span style={{ fontWeight: '600', color: '#111827' }}>{p.user_name || '—'}</span>
                          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{p.user_email || ''}</p>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '600',
                          background: tc.bg, color: tc.color
                        }}>{typeLabel(p.type)}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6b7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.description || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: '700', color: p.amount >= 0 ? '#059669' : '#dc2626' }}>
                        {p.amount >= 0 ? '+' : ''}${Math.abs(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600',
                          background: p.status === 'succeeded' ? '#ecfdf5' : '#fef2f2',
                          color: p.status === 'succeeded' ? '#059669' : '#dc2626'
                        }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
