import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { CreditCard, Check, Zap, ArrowRight, Download, Loader, AlertCircle, CheckCircle, ExternalLink, Lock, Shield } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function Billing() {
  const [plans, setPlans] = useState([]);
  const [setupFeePaid, setSetupFeePaid] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const successPlan = urlParams.get('plan');
  const canceled = urlParams.get('canceled');

  useEffect(() => {
    async function loadData() {
      await Promise.all([fetchPlans(), fetchSubscription(), fetchInvoices()]);

      // If returning from successful setup fee payment, confirm it
      if (success && successPlan === 'setup') {
        try {
          await apiFetch('/api/billing/confirm-setup', { method: 'POST' });
          setSetupFeePaid(true);
        } catch (err) { console.error('Error confirming setup:', err); }
      }

      setLoading(false);
    }
    loadData();

    if (success || canceled) {
      window.history.replaceState({}, '', '/billing');
    }
  }, []);

  async function fetchPlans() {
    try {
      const res = await apiFetch('/api/billing/plans');
      const data = await res.json();
      setPlans(data.plans || []);
      setSetupFeePaid(data.setupFeePaid || false);
    } catch (err) { console.error('Error fetching plans:', err); }
  }

  async function fetchSubscription() {
    try {
      const res = await apiFetch('/api/billing/subscription');
      const data = await res.json();
      setSubscription(data.subscription);
      setCurrentPlan(data.plan);
      if (data.setupFeePaid) setSetupFeePaid(true);
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
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout. Please try again.');
      }
    } catch (err) {
      console.error('Error creating checkout:', err);
      alert('Failed to connect to billing. Please try again.');
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
      <Helmet>
        <title>Billing - OutReach AI</title>
        <meta name="description" content="Manage your subscription, setup fee, and payment methods." />
      </Helmet>
        <Loader style={{ width: '36px', height: '36px', color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const setupPlan = plans.find(p => p.id === 'setup');
  const monthlyPlan = plans.find(p => p.id === 'monthly');

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>Billing</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Manage your subscription and payment history</p>
      </div>

      {/* Success/Cancel alerts */}
      {success && (
        <div style={{ padding: '16px 20px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle style={{ width: '20px', height: '20px', color: '#059669' }} />
          <p style={{ color: '#065f46', fontWeight: '600', fontSize: '14px' }}>
            {successPlan === 'setup' ? 'Setup fee paid successfully! You can now subscribe to the monthly plan.' : 'Payment successful! Your subscription is now active.'}
          </p>
        </div>
      )}
      {canceled && (
        <div style={{ padding: '16px 20px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle style={{ width: '20px', height: '20px', color: '#d97706' }} />
          <p style={{ color: '#92400e', fontWeight: '600', fontSize: '14px' }}>Checkout was canceled. No charges were made.</p>
        </div>
      )}

      {/* Active Subscription Banner */}
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
                <p style={{ fontSize: '11px', color: '#a5b4fc' }}>USAGE</p>
                <p style={{ fontWeight: '700' }}>$0.15/min</p>
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

      {/* Step-by-step flow if not fully subscribed */}
      {!isActive && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>Get Started</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* STEP 1: Setup Fee */}
            <div style={{
              background: '#ffffff', borderRadius: '16px', padding: '28px',
              border: setupFeePaid ? '2px solid #059669' : '2px solid #4f46e5',
              position: 'relative', overflow: 'hidden',
              boxShadow: !setupFeePaid ? '0 4px 20px rgba(79,70,229,0.12)' : '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                {/* Step number */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                  background: setupFeePaid ? '#059669' : '#4f46e5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#ffffff', fontWeight: '800', fontSize: '18px'
                }}>
                  {setupFeePaid ? <Check style={{ width: '22px', height: '22px' }} /> : '1'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
                      {setupPlan?.name || 'Setup Fee'}
                    </h3>
                    <span style={{
                      padding: '2px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                      background: setupFeePaid ? '#ecfdf5' : '#eef2ff',
                      color: setupFeePaid ? '#059669' : '#4f46e5',
                      textTransform: 'uppercase'
                    }}>
                      {setupFeePaid ? 'Paid' : 'Required'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '36px', fontWeight: '800', color: '#111827' }}>{setupPlan?.priceDisplay || '$1,000'}</span>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>one-time</span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '20px' }}>
                    {(setupPlan?.features || []).map((feature, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '13px', color: '#4b5563' }}>
                        <Check style={{ width: '16px', height: '16px', color: '#059669', flexShrink: 0 }} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {setupFeePaid ? (
                    <div style={{
                      padding: '12px 20px', background: '#ecfdf5', borderRadius: '10px',
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      color: '#059669', fontWeight: '700', fontSize: '14px',
                      border: '1px solid #a7f3d0'
                    }}>
                      <CheckCircle style={{ width: '16px', height: '16px' }} />
                      Setup Fee Paid
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSubscribe('setup')}
                      disabled={checkoutLoading === 'setup'}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '14px 32px',
                        background: '#4f46e5', color: '#ffffff', border: 'none',
                        borderRadius: '10px', fontSize: '15px', fontWeight: '700',
                        cursor: checkoutLoading === 'setup' ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                        opacity: checkoutLoading === 'setup' ? 0.7 : 1
                      }}
                    >
                      {checkoutLoading === 'setup' ? (
                        <Loader style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <>
                          Pay Setup Fee
                          <ArrowRight style={{ width: '16px', height: '16px' }} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 2: Monthly Subscription */}
            <div style={{
              background: '#ffffff', borderRadius: '16px', padding: '28px',
              border: setupFeePaid ? '2px solid #4f46e5' : '1px solid #e5e7eb',
              position: 'relative', overflow: 'hidden',
              opacity: setupFeePaid ? 1 : 0.5,
              boxShadow: setupFeePaid ? '0 4px 20px rgba(79,70,229,0.12)' : '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              {!setupFeePaid && (
                <div style={{
                  position: 'absolute', top: '0', left: '0', right: '0', bottom: '0',
                  background: 'rgba(255,255,255,0.3)', zIndex: 2, borderRadius: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{
                    background: '#ffffff', padding: '12px 24px', borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px',
                    color: '#6b7280', fontWeight: '600', fontSize: '14px'
                  }}>
                    <Lock style={{ width: '16px', height: '16px' }} />
                    Complete Step 1 first
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                  background: setupFeePaid ? '#4f46e5' : '#9ca3af',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#ffffff', fontWeight: '800', fontSize: '18px'
                }}>
                  2
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
                      {monthlyPlan?.name || 'Monthly Subscription'}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '36px', fontWeight: '800', color: '#111827' }}>{monthlyPlan?.priceDisplay || '$1,000'}</span>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>/month</span>
                    <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '8px' }}>+ $0.15/min usage</span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '20px' }}>
                    {(monthlyPlan?.features || []).map((feature, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '13px', color: '#4b5563' }}>
                        <Check style={{ width: '16px', height: '16px', color: '#059669', flexShrink: 0 }} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe('monthly')}
                    disabled={!setupFeePaid || checkoutLoading === 'monthly'}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      padding: '14px 32px',
                      background: setupFeePaid ? '#4f46e5' : '#9ca3af',
                      color: '#ffffff', border: 'none',
                      borderRadius: '10px', fontSize: '15px', fontWeight: '700',
                      cursor: (!setupFeePaid || checkoutLoading === 'monthly') ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      opacity: checkoutLoading === 'monthly' ? 0.7 : 1
                    }}
                  >
                    {checkoutLoading === 'monthly' ? (
                      <Loader style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <>
                        Subscribe Now
                        <ArrowRight style={{ width: '16px', height: '16px' }} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Secure payment note */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '24px', color: '#9ca3af', fontSize: '12px' }}>
        <Shield style={{ width: '14px', height: '14px' }} />
        Payments are securely processed by Stripe
      </div>
    </div>
  );
}
