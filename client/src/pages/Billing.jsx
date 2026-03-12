import { useState, useEffect } from 'react';
import { CreditCard, Check, Zap, ArrowRight, Download, Loader, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function Billing() {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const canceled = urlParams.get('canceled');

  useEffect(() => {
    Promise.all([fetchPlans(), fetchSubscription(), fetchInvoices()])
      .finally(() => setLoading(false));
    // Clean URL params
    if (success || canceled) {
      window.history.replaceState({}, '', '/billing');
    }
  }, []);

  async function fetchPlans() {
    try {
      const res = await apiFetch('/api/billing/plans');
      const data = await res.json();
      setPlans(data);
    } catch (err) { console.error('Error fetching plans:', err); }
  }

  async function fetchSubscription() {
    try {
      const res = await apiFetch('/api/billing/subscription');
      const data = await res.json();
      setSubscription(data.subscription);
      setCurrentPlan(data.plan);
    } catch (err) { console.error('Error fetching subscription:', err); }
  }

  async function fetchInvoices() {
    try {
      const res = await apiFetch('/api/billing/invoices');
      const data = await res.json();
      setInvoices(data);
    } catch (err) { console.error('Error fetching invoices:', err); }
  }

  async function handleSubscribe(planId) {
    setCheckoutLoading(planId);
    try {
      const res = await apiFetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Error creating checkout:', err);
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      const res = await apiFetch('/api/billing/create-portal-session', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Error creating portal:', err);
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <Loader style={{ width: '36px', height: '36px', color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>Billing</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Manage your subscription and payment history</p>
      </div>

      {/* Success/Cancel alerts */}
      {success && (
        <div style={{ padding: '16px 20px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle style={{ width: '20px', height: '20px', color: '#059669' }} />
          <p style={{ color: '#065f46', fontWeight: '600', fontSize: '14px' }}>Payment successful! Your subscription is now active.</p>
        </div>
      )}
      {canceled && (
        <div style={{ padding: '16px 20px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle style={{ width: '20px', height: '20px', color: '#d97706' }} />
          <p style={{ color: '#92400e', fontWeight: '600', fontSize: '14px' }}>Checkout was canceled. No charges were made.</p>
        </div>
      )}

      {/* Current Subscription */}
      {isActive && currentPlan && (
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          borderRadius: '16px', padding: '28px', marginBottom: '24px',
          color: '#ffffff', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap style={{ width: '20px', height: '20px', color: '#fbbf24' }} />
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: '600', textTransform: 'uppercase' }}>Current Plan</p>
                <h2 style={{ fontSize: '22px', fontWeight: '800' }}>{currentPlan.name}</h2>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
              <span style={{ fontSize: '36px', fontWeight: '800' }}>{currentPlan.priceDisplay}</span>
              <span style={{ fontSize: '14px', color: '#a5b4fc' }}>/month</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#a5b4fc' }}>STATUS</p>
                <p style={{ fontWeight: '700', color: '#34d399', textTransform: 'capitalize' }}>{subscription.status}</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#a5b4fc' }}>CALLS</p>
                <p style={{ fontWeight: '700' }}>Unlimited</p>
              </div>
              {subscription.current_period_end && (
                <div>
                  <p style={{ fontSize: '11px', color: '#a5b4fc' }}>RENEWS</p>
                  <p style={{ fontWeight: '700' }}>{new Date(subscription.current_period_end * 1000).toLocaleDateString()}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', background: 'rgba(255,255,255,0.15)',
                color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                cursor: 'pointer', transition: 'background 0.15s'
              }}
            >
              {portalLoading ? <Loader style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> : <ExternalLink style={{ width: '14px', height: '14px' }} />}
              Manage Subscription
            </button>
          </div>
        </div>
      )}

      {/* Plans */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>
          {isActive ? 'Available Plans' : 'Choose Your Plan'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {plans.map(plan => {
            const isCurrent = currentPlan?.id === plan.id && isActive;
            return (
              <div key={plan.id} style={{
                background: '#ffffff', borderRadius: '16px', padding: '28px',
                border: plan.popular ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                position: 'relative', display: 'flex', flexDirection: 'column',
                boxShadow: plan.popular ? '0 4px 20px rgba(79,70,229,0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}>
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)',
                    background: '#4f46e5', color: '#ffffff', padding: '4px 16px',
                    borderRadius: '0 0 8px 8px', fontSize: '11px', fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>
                    Most Popular
                  </div>
                )}
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '4px', marginTop: plan.popular ? '12px' : '0' }}>{plan.name}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '40px', fontWeight: '800', color: '#111827' }}>{plan.priceDisplay}</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {plan.interval ? `/${plan.interval}` : plan.perAppointment ? '/appointment' : ' one-time'}
                  </span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, marginBottom: '24px' }}>
                  {plan.features.map((feature, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '13px', color: '#4b5563' }}>
                      <Check style={{ width: '16px', height: '16px', color: '#059669', flexShrink: 0 }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div style={{
                    padding: '12px', background: '#ecfdf5', borderRadius: '10px',
                    textAlign: 'center', color: '#059669', fontWeight: '700', fontSize: '14px',
                    border: '1px solid #a7f3d0'
                  }}>
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={checkoutLoading === plan.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '14px', width: '100%',
                      background: plan.popular ? '#4f46e5' : '#ffffff',
                      color: plan.popular ? '#ffffff' : '#4f46e5',
                      border: plan.popular ? 'none' : '2px solid #4f46e5',
                      borderRadius: '10px', fontSize: '14px', fontWeight: '700',
                      cursor: checkoutLoading === plan.id ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      opacity: checkoutLoading === plan.id ? 0.7 : 1
                    }}
                  >
                    {checkoutLoading === plan.id ? (
                      <Loader style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <>
                        {plan.oneTime ? 'Pay Setup Fee' : plan.perAppointment ? 'Pay Now' : (isActive ? 'Switch Plan' : 'Subscribe')}
                        <ArrowRight style={{ width: '16px', height: '16px' }} />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History */}
      {invoices.length > 0 && (
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard style={{ width: '18px', height: '18px', color: '#4f46e5' }} />
            Payment History
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#111827', fontWeight: '500' }}>{inv.date}</td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#4b5563' }}>{inv.plan}</td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#111827', fontWeight: '700' }}>${inv.amount}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                        background: inv.status === 'paid' ? '#ecfdf5' : '#fef3c7',
                        color: inv.status === 'paid' ? '#059669' : '#d97706',
                        textTransform: 'capitalize'
                      }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {inv.pdf && (
                        <a href={inv.pdf} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4f46e5', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
                          <Download style={{ width: '12px', height: '12px' }} /> PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No subscription message */}
      {!isActive && invoices.length === 0 && (
        <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '32px', textAlign: 'center', border: '1px dashed #e5e7eb' }}>
          <CreditCard style={{ width: '40px', height: '40px', color: '#9ca3af', margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280', fontSize: '14px' }}>No active subscription. Choose a plan above to get started.</p>
        </div>
      )}
    </div>
  );
}
