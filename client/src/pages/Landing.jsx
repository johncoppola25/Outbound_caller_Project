import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Phone, BarChart3, Calendar, Mic, Bot, ArrowRight, Check, Star, Clock, DollarSign, Users, PhoneCall, MessageSquare, Target, TrendingUp, Menu, X, Play, CheckCircle, Zap } from 'lucide-react';

export default function Landing() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", color: '#111827' }}>
      <Helmet>
        <title>OutReach AI - AI That Calls Your Leads and Books Appointments</title>
        <meta name="description" content="AI that calls your leads and books appointments automatically. Upload contacts, launch a campaign, and watch appointments fill your calendar. $1,000/mo." />
      </Helmet>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '12px 16px' : '16px 40px', background: '#ffffff',
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: '1px solid #f3f4f6'
      }}>
        <img src="/logo.svg" alt="OutReach AI" style={{ height: isMobile ? '34px' : '50px' }} />
        {isMobile ? (
          <>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {menuOpen ? <X size={24} color="#374151" /> : <Menu size={24} color="#374151" />}
            </button>
            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99, background: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <a href="#see-it-work" onClick={() => setMenuOpen(false)} style={{ padding: '12px 16px', fontSize: '15px', fontWeight: '500', color: '#374151', textDecoration: 'none', borderRadius: '8px' }}>See It Work</a>
                  <a href="#pricing" onClick={() => setMenuOpen(false)} style={{ padding: '12px 16px', fontSize: '15px', fontWeight: '500', color: '#374151', textDecoration: 'none', borderRadius: '8px' }}>Pricing</a>
                  <a href="#how-it-works" onClick={() => setMenuOpen(false)} style={{ padding: '12px 16px', fontSize: '15px', fontWeight: '500', color: '#374151', textDecoration: 'none', borderRadius: '8px' }}>How It Works</a>
                  <Link to="/login" onClick={() => setMenuOpen(false)} style={{ padding: '12px 16px', fontSize: '15px', fontWeight: '600', color: '#374151', textDecoration: 'none', borderRadius: '8px' }}>Log In</Link>
                  <Link to="/signup" onClick={() => setMenuOpen(false)} style={{ padding: '12px 16px', fontSize: '15px', fontWeight: '700', color: '#fff', background: '#4f46e5', textDecoration: 'none', borderRadius: '10px', textAlign: 'center' }}>Get Started</Link>
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <a href="#see-it-work" style={{ padding: '9px 16px', fontSize: '14px', fontWeight: '500', color: '#374151', textDecoration: 'none' }}>See It Work</a>
            <a href="#pricing" style={{ padding: '9px 16px', fontSize: '14px', fontWeight: '500', color: '#374151', textDecoration: 'none' }}>Pricing</a>
            <a href="#how-it-works" style={{ padding: '9px 16px', fontSize: '14px', fontWeight: '500', color: '#374151', textDecoration: 'none' }}>How It Works</a>
            <Link to="/login" style={{ padding: '9px 20px', fontSize: '14px', fontWeight: '600', color: '#374151', textDecoration: 'none' }}>Log In</Link>
            <Link to="/signup" style={{ padding: '9px 24px', fontSize: '14px', fontWeight: '600', color: '#fff', background: '#4f46e5', textDecoration: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>Get Started <ArrowRight size={14} /></Link>
          </div>
        )}
      </nav>

      {/* ============ HERO ============ */}
      <section style={{
        paddingTop: isMobile ? '36px' : '56px',
        paddingBottom: isMobile ? '40px' : '64px',
        textAlign: 'center', background: '#ffffff'
      }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: isMobile ? '0 16px' : '0 24px' }}>
          <h1 style={{
            fontSize: isMobile ? '30px' : 'clamp(38px, 5vw, 54px)', fontWeight: '800', lineHeight: '1.12',
            margin: '0 0 20px 0', letterSpacing: '-0.03em', color: '#0f172a'
          }}>
            AI That Calls Your Leads<br />
            and <span style={{ color: '#4f46e5' }}>Books Appointments</span><br />
            Automatically
          </h1>
          <p style={{
            fontSize: isMobile ? '16px' : '19px', color: '#6b7280', maxWidth: '560px',
            margin: '0 auto 32px', lineHeight: '1.7'
          }}>
            Upload your contacts. Launch a campaign. Watch appointments fill your calendar — while AI handles every call.
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '12px', flexDirection: isMobile ? 'column' : 'row'
          }}>
            <Link to="/signup" style={{
              padding: isMobile ? '14px 24px' : '15px 36px',
              fontSize: '16px', fontWeight: '700', color: '#fff',
              background: '#4f46e5', textDecoration: 'none', borderRadius: '10px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
              width: isMobile ? '100%' : 'auto'
            }}>
              Get Started <ArrowRight size={18} />
            </Link>
            <a href="#see-it-work" style={{
              padding: isMobile ? '14px 24px' : '15px 36px',
              fontSize: '16px', fontWeight: '600', color: '#374151',
              textDecoration: 'none', borderRadius: '10px', border: '1px solid #d1d5db',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              width: isMobile ? '100%' : 'auto'
            }}>
              <Play size={16} fill="#374151" /> See It In Action
            </a>
          </div>
        </div>
      </section>

      {/* ============ SEE IT IN ACTION ============ */}
      <section id="see-it-work" style={{ padding: isMobile ? '48px 16px' : '80px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? '32px' : '48px' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>See It In Action</p>
            <h2 style={{ fontSize: isMobile ? '26px' : '36px', fontWeight: '800', margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
              This Is What Your Dashboard Looks Like
            </h2>
            <p style={{ fontSize: isMobile ? '14px' : '16px', color: '#6b7280', maxWidth: '550px', margin: '0 auto' }}>
              Real campaigns. Real calls. Real appointments booked by AI.
            </p>
          </div>

          {/* Dashboard Mockup */}
          <div style={{
            background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb',
            padding: isMobile ? '16px' : '28px', marginBottom: '32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
          }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px 0' }}>Live Dashboard</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '10px' : '16px' }}>
              {[
                { label: 'Active Campaigns', value: '5', sub: 'Running now', color: '#4f46e5', bg: '#eef2ff' },
                { label: 'Total Contacts', value: '50', sub: '10 pending', color: '#059669', bg: '#ecfdf5' },
                { label: 'Calls Today', value: '15', sub: '13 completed', color: '#0ea5e9', bg: '#f0f9ff' },
                { label: 'Appointments', value: '6', sub: 'Booked today', color: '#d946ef', bg: '#fdf4ff' },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: isMobile ? '14px' : '20px', borderRadius: '12px',
                  background: s.bg, border: `1px solid ${s.bg}`
                }}>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px 0' }}>{s.label}</p>
                  <p style={{ fontSize: isMobile ? '26px' : '32px', fontWeight: '800', color: s.color, margin: '0' }}>{s.value}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Lead scores row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? '8px' : '12px', marginTop: isMobile ? '10px' : '16px' }}>
              {[
                { icon: '🔥', label: 'Hot Leads', value: '8', color: '#dc2626' },
                { icon: '🟡', label: 'Warm Leads', value: '14', color: '#d97706' },
                { icon: '❄️', label: 'Cold Leads', value: '28', color: '#6b7280' },
              ].map((l, i) => (
                <div key={i} style={{
                  padding: isMobile ? '12px' : '16px', borderRadius: '10px',
                  border: '1px solid #f3f4f6', textAlign: 'center'
                }}>
                  <span style={{ fontSize: isMobile ? '16px' : '20px' }}>{l.icon}</span>
                  <p style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '800', color: l.color, margin: '4px 0 0 0' }}>{l.value}</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0 0' }}>{l.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Two columns: Transcript + Appointment */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
            {/* AI Call Transcript */}
            <div style={{
              background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb',
              padding: isMobile ? '20px' : '28px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mic size={16} color="#4f46e5" />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>AI Call Transcript</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Live conversation example</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { speaker: 'Julia (AI)', text: 'Hi, is this Sarah? This is Julia from APB Security. We\'re offering free home security assessments in your area.', isAI: true },
                  { speaker: 'Sarah', text: 'Sure, what\'s this about?', isAI: false },
                  { speaker: 'Julia (AI)', text: 'We help homeowners protect their property with smart security systems. Would you be open to a quick 15-minute consultation?', isAI: true },
                  { speaker: 'Sarah', text: 'Yeah, I\'ve been thinking about that actually.', isAI: false },
                  { speaker: 'Julia (AI)', text: 'Great! I have availability this week. Would Thursday at 10 AM work?', isAI: true },
                  { speaker: 'Sarah', text: 'That works for me.', isAI: false },
                  { speaker: 'Julia (AI)', text: 'Perfect, you\'re all set! A specialist will reach out Thursday at 10 AM. Thanks Sarah!', isAI: true },
                ].map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '8px',
                    flexDirection: msg.isAI ? 'row' : 'row-reverse'
                  }}>
                    <div style={{
                      padding: '8px 12px', borderRadius: '10px', maxWidth: '85%',
                      background: msg.isAI ? '#eef2ff' : '#f3f4f6',
                      border: msg.isAI ? '1px solid #c7d2fe' : '1px solid #e5e7eb'
                    }}>
                      <p style={{ fontSize: '9px', fontWeight: '700', color: msg.isAI ? '#4f46e5' : '#6b7280', margin: '0 0 2px 0' }}>{msg.speaker}</p>
                      <p style={{ fontSize: '12px', color: '#374151', margin: 0, lineHeight: '1.5' }}>{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Appointment Booked Card */}
            <div style={{
              background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb',
              padding: isMobile ? '20px' : '28px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={16} color="#059669" />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>Appointments Booked</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Automatically by AI</p>
                </div>
              </div>

              {/* Appointment cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                {[
                  { name: 'Sarah Williams', time: 'Thu, Mar 14 at 10:00 AM', campaign: 'Home Security Leads' },
                  { name: 'James Brown', time: 'Fri, Mar 15 at 2:00 PM', campaign: 'Home Security Leads' },
                  { name: 'Ashley Walker', time: 'Mon, Mar 17 at 11:00 AM', campaign: 'Commercial Follow-ups' },
                  { name: 'Chris Lopez', time: 'Tue, Mar 18 at 3:00 PM', campaign: 'Home Security Leads' },
                ].map((appt, i) => (
                  <div key={i} style={{
                    padding: '12px 14px', borderRadius: '10px',
                    border: '1px solid #d1fae5', background: '#f0fdf4'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: '700', color: '#111827', margin: 0 }}>{appt.name}</p>
                        <p style={{ fontSize: '11px', color: '#059669', fontWeight: '600', margin: '2px 0 0 0' }}>{appt.time}</p>
                      </div>
                      <CheckCircle size={18} color="#059669" />
                    </div>
                    <p style={{ fontSize: '10px', color: '#6b7280', margin: '4px 0 0 0' }}>{appt.campaign}</p>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: '16px', padding: '12px', borderRadius: '10px',
                background: '#ecfdf5', textAlign: 'center'
              }}>
                <p style={{ fontSize: '20px', fontWeight: '800', color: '#059669', margin: 0 }}>46 appointments</p>
                <p style={{ fontSize: '12px', color: '#047857', margin: '2px 0 0 0' }}>booked this month by AI</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how-it-works" style={{ padding: isMobile ? '48px 16px' : '80px 24px', background: '#ffffff' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? '32px' : '48px' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>How It Works</p>
            <h2 style={{ fontSize: isMobile ? '26px' : '36px', fontWeight: '800', margin: '0', letterSpacing: '-0.02em' }}>
              3 Steps to Automated Appointments
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px' }}>
            {[
              { step: '1', title: 'Upload Your Contacts', desc: 'Import your lead list — CSV, manual entry, or CRM sync. Add as many contacts as you want.', icon: Users },
              { step: '2', title: 'Launch Your Campaign', desc: 'Set your AI script, choose a caller ID, and hit start. AI calls each lead with a natural, human-like conversation.', icon: Phone },
              { step: '3', title: 'Appointments Appear on Your Calendar', desc: 'When a lead is interested, AI books the appointment right on the call. You get a notification with the details instantly.', icon: Calendar }
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start',
                gap: isMobile ? '14px' : '24px',
                padding: isMobile ? '18px' : '28px', background: '#f8fafc',
                borderRadius: isMobile ? '12px' : '16px', border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  width: isMobile ? '40px' : '52px', height: isMobile ? '40px' : '52px',
                  borderRadius: isMobile ? '10px' : '14px', flexShrink: 0,
                  background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: isMobile ? '16px' : '20px', fontWeight: '800'
                }}>{item.step}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', margin: '0 0 6px 0' }}>{item.title}</h3>
                  <p style={{ fontSize: isMobile ? '13px' : '15px', color: '#6b7280', lineHeight: '1.7', margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES GRID ============ */}
      <section style={{ padding: isMobile ? '48px 16px' : '80px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? '32px' : '48px' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>Everything You Need</p>
            <h2 style={{ fontSize: isMobile ? '26px' : '36px', fontWeight: '800', margin: '0', letterSpacing: '-0.02em' }}>
              One Platform. Unlimited AI Calls.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? '12px' : '20px' }}>
            {[
              { icon: PhoneCall, title: 'Natural AI Conversations', desc: 'AI sounds human, handles objections, and responds in real-time — leads don\'t know it\'s AI.', color: '#4f46e5' },
              { icon: Calendar, title: 'Automatic Appointment Booking', desc: 'When a lead says yes, AI books the appointment on the spot. No human needed.', color: '#059669' },
              { icon: Mic, title: 'Call Recording & Transcripts', desc: 'Every call recorded with full AI-generated transcripts you can review anytime.', color: '#d946ef' },
              { icon: MessageSquare, title: 'Voicemail Detection', desc: 'AI detects voicemail and leaves a professional message automatically.', color: '#f59e0b' },
              { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Track call outcomes, appointment rates, costs, and lead scores on a live dashboard.', color: '#0ea5e9' },
              { icon: Target, title: 'Smart Lead Scoring', desc: 'AI scores leads automatically based on call outcomes and engagement level.', color: '#ef4444' }
            ].map((feature, i) => (
              <div key={i} style={{
                padding: isMobile ? '20px' : '28px', borderRadius: isMobile ? '12px' : '16px',
                border: '1px solid #e5e7eb', background: '#ffffff'
              }}>
                <div style={{
                  width: isMobile ? '40px' : '44px', height: isMobile ? '40px' : '44px',
                  borderRadius: isMobile ? '10px' : '12px',
                  background: `${feature.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '12px'
                }}>
                  <feature.icon size={isMobile ? 20 : 22} color={feature.color} />
                </div>
                <h3 style={{ fontSize: isMobile ? '15px' : '17px', fontWeight: '700', margin: '0 0 8px 0' }}>{feature.title}</h3>
                <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: 0 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" style={{ padding: isMobile ? '48px 16px' : '80px 24px', background: '#ffffff' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? '32px' : '48px' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>Pricing</p>
            <h2 style={{ fontSize: isMobile ? '26px' : '36px', fontWeight: '800', margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
              Simple Pricing. No Surprises.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px', maxWidth: '700px', margin: '0 auto' }}>
            {/* Setup Fee */}
            <div style={{
              padding: isMobile ? '24px' : '32px', borderRadius: '16px', border: '2px solid #4f46e5',
              background: '#ffffff', textAlign: 'center', position: 'relative',
              boxShadow: '0 4px 20px rgba(79,70,229,0.15)'
            }}>
              <div style={{
                position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                background: '#4f46e5', color: '#fff', padding: '4px 16px',
                borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>Required First</div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px auto 16px' }}>
                <Zap size={22} color="#4f46e5" />
              </div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', margin: '0 0 4px 0' }}>One-Time</p>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0' }}>Setup Fee</h3>
              <p style={{ fontSize: isMobile ? '36px' : '42px', fontWeight: '800', margin: '0 0 16px 0', color: '#0f172a' }}>$1,000</p>
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', textAlign: 'left' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {[
                    'Full platform setup & configuration',
                    'Custom AI script written for your business',
                    'Campaign creation & optimization',
                    'Contact list import assistance',
                    'Training & onboarding session',
                    'Dedicated onboarding specialist'
                  ].map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '13px', color: '#374151' }}>
                      <Check size={15} color="#059669" style={{ flexShrink: 0 }} /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Monthly */}
            <div style={{
              padding: isMobile ? '24px' : '32px', borderRadius: '16px', border: '1px solid #e5e7eb',
              background: '#ffffff', textAlign: 'center'
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Phone size={22} color="#4f46e5" />
              </div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', margin: '0 0 4px 0' }}>Monthly</p>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0' }}>Subscription</h3>
              <p style={{ fontSize: isMobile ? '36px' : '42px', fontWeight: '800', margin: '0', color: '#0f172a' }}>$1,000</p>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0' }}>/month</p>
              <p style={{ fontSize: '14px', color: '#4f46e5', fontWeight: '600', margin: '0 0 16px 0' }}>+ $100 per booked appointment</p>
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', textAlign: 'left' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {[
                    'Unlimited AI outbound calls',
                    'Call recording & full transcripts',
                    'Automatic appointment booking',
                    'Voicemail detection & drop',
                    'Real-time analytics dashboard',
                    'Smart lead scoring',
                    'Multiple campaigns',
                    'Custom AI scripts',
                    'Priority support'
                  ].map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '13px', color: '#374151' }}>
                      <Check size={15} color="#059669" style={{ flexShrink: 0 }} /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Comparison callout */}
          <div style={{
            marginTop: '32px', padding: isMobile ? '20px' : '24px 32px',
            background: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb',
            display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? '12px' : '20px',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'center', textAlign: isMobile ? 'center' : 'left'
          }}>
            <DollarSign size={24} color="#4f46e5" style={{ flexShrink: 0, ...(isMobile ? { margin: '0 auto' } : {}) }} />
            <p style={{ fontSize: '15px', color: '#374151', margin: 0, lineHeight: '1.6' }}>
              <strong>Compare:</strong> Hiring a sales rep costs $4,000–$6,000/month + benefits. Lead gen agencies charge $3,000–$10,000/month. OutReach AI does it for <strong style={{ color: '#4f46e5' }}>$1,000/month</strong> — and works 24/7.
            </p>
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link to="/signup" style={{
              padding: isMobile ? '14px 24px' : '15px 40px',
              fontSize: '16px', fontWeight: '700', color: '#fff',
              background: '#4f46e5', textDecoration: 'none', borderRadius: '10px',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
              width: isMobile ? '100%' : 'auto', justifyContent: 'center'
            }}>
              Get Started Now <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ============ RESULTS ============ */}
      <section style={{ padding: isMobile ? '48px 16px' : '80px 24px', background: '#0f172a', color: '#ffffff' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>Why AI Outperforms Humans</p>
          <h2 style={{ fontSize: isMobile ? '26px' : '36px', fontWeight: '800', margin: '0 0 36px 0', letterSpacing: '-0.02em' }}>
            The Numbers Speak for Themselves
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '12px' : '24px' }}>
            {[
              { icon: TrendingUp, value: '10x', label: 'More Calls Than a Human Rep', color: '#818cf8' },
              { icon: Clock, value: '24/7', label: 'Never Misses a Shift', color: '#34d399' },
              { icon: DollarSign, value: '80%', label: 'Lower Cost Per Lead', color: '#fbbf24' },
              { icon: Star, value: '< 2sec', label: 'AI Response Time', color: '#f472b6' }
            ].map((stat, i) => (
              <div key={i} style={{
                padding: isMobile ? '20px 12px' : '28px', borderRadius: isMobile ? '12px' : '16px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <stat.icon size={isMobile ? 22 : 28} color={stat.color} style={{ marginBottom: '8px' }} />
                <p style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: '800', color: stat.color, margin: '0 0 4px 0' }}>{stat.value}</p>
                <p style={{ fontSize: isMobile ? '11px' : '13px', color: '#9ca3af', margin: 0 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section style={{ padding: isMobile ? '48px 16px' : '80px 24px', background: '#ffffff', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: isMobile ? '26px' : '36px', fontWeight: '800', margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>
            Ready to Let AI Book Your Appointments?
          </h2>
          <p style={{ fontSize: isMobile ? '14px' : '16px', color: '#6b7280', marginBottom: '32px', lineHeight: '1.7' }}>
            Stop cold calling manually. Let OutReach AI handle every call, every lead, every appointment — automatically.
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '12px', flexDirection: isMobile ? 'column' : 'row'
          }}>
            <Link to="/signup" style={{
              padding: '15px 40px', fontSize: '16px', fontWeight: '700', color: '#fff',
              background: '#4f46e5', textDecoration: 'none', borderRadius: '10px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
              width: isMobile ? '100%' : 'auto'
            }}>
              Create Your Account <ArrowRight size={18} />
            </Link>
            <Link to="/login" style={{
              padding: '15px 32px', fontSize: '16px', fontWeight: '600', color: '#374151',
              textDecoration: 'none', borderRadius: '10px', border: '1px solid #d1d5db',
              width: isMobile ? '100%' : 'auto', textAlign: 'center'
            }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: isMobile ? '32px 16px' : '40px 24px', background: '#0f172a', color: '#9ca3af',
        textAlign: 'center', fontSize: '13px'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <svg viewBox="0 0 250 50" style={{ width: isMobile ? '160px' : '220px' }} xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="34" fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" fontSize="38" fontWeight="700" letterSpacing="-0.5">
              <tspan fill="#ffffff">Out</tspan><tspan fill="#4f46e5">Reach</tspan>
            </text>
            <text x="168" y="34" fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" fontSize="38" fontWeight="300" fill="#4f46e5" letterSpacing="-0.5">AI</text>
            <rect x="3" y="42" width="76" height="3" rx="1.5" fill="#4f46e5"/>
          </svg>
        </div>
        <p style={{ margin: '0 0 8px 0' }}>AI-Powered Outbound Calling Platform</p>
        <p style={{ margin: 0 }}>&copy; 2026 OutReach AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
