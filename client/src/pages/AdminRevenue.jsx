import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Clock, CreditCard, AlertCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function AdminRevenue() {
  const [revenue, setRevenue] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) return <div style={{ padding: '40px', color: '#6b7280' }}>Loading revenue...</div>;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>Revenue & Billing</h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Stripe revenue overview and payment history</p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Revenue cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Available Balance', value: `$${(revenue?.available || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: '#059669' },
          { label: 'Pending', value: `$${(revenue?.pending || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: Clock, color: '#f59e0b' },
          { label: 'Total Calls', value: stats?.totalCalls || 0, icon: TrendingUp, color: '#4f46e5' },
          { label: 'Appointments Booked', value: stats?.totalAppointments || 0, icon: CreditCard, color: '#8b5cf6' },
        ].map((stat, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <stat.icon size={16} color={stat.color} />
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{stat.label}</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Platform stats */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 16px 0' }}>Platform Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Total Users', value: stats?.totalUsers || 0 },
            { label: 'Active Subscriptions', value: stats?.activeSubscriptions || 0 },
            { label: 'Setup Fees Paid', value: stats?.setupFeesPaid || 0 },
            { label: 'Total Campaigns', value: stats?.totalCampaigns || 0 },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ fontSize: '24px', fontWeight: '800', color: '#4f46e5', margin: '0 0 4px 0' }}>{item.value}</p>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent charges */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>Recent Payments</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Date', 'Description', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!revenue?.recentCharges || revenue.recentCharges.length === 0) ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                    No payments yet
                  </td>
                </tr>
              ) : (
                revenue.recentCharges.map(charge => (
                  <tr key={charge.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{charge.date}</td>
                    <td style={{ padding: '10px 14px', color: '#111827' }}>{charge.description}</td>
                    <td style={{ padding: '10px 14px', fontWeight: '600', color: '#059669' }}>
                      ${charge.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600',
                        background: charge.status === 'succeeded' ? '#ecfdf5' : '#fef3f2',
                        color: charge.status === 'succeeded' ? '#059669' : '#dc2626'
                      }}>
                        {charge.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
