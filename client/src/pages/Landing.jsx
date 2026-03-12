import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Phone, BarChart3, Calendar, Shield, Mic, Bot, ArrowRight, Check, Star, Clock, DollarSign, Users, ChevronRight, PhoneCall, MessageSquare, Target, TrendingUp } from 'lucide-react';

export default function Landing() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", color: '#111827' }}>
      <Helmet>
        <title>OutReach AI - AI-Powered Real Estate Outbound Calling Platform</title>
        <meta name="description" content="Automate outbound calls for real estate with AI. Book appointments, detect voicemail, and scale your outreach 10x. 24/7 intelligent calling platform." />
      </Helmet>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 40px', background: '#ffffff'
      }}>
        <img src="/logo.svg" alt="OutReach AI" style={{ height: '50px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link to="/login" style={{
            padding: '9px 20px', fontSize: '14px', fontWeight: '600', color: '#374151',
            textDecoration: 'none', borderRadius: '8px', transition: 'background 0.2s'
          }}>
            Log In
          </Link>
          <Link to="/signup" style={{
            padding: '9px 24px', fontSize: '14px', fontWeight: '600', color: '#fff',
            background: '#4f46e5', textDecoration: 'none', borderRadius: '8px',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            Get Started <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        paddingTop: '40px', paddingBottom: '60px', textAlign: 'center',
        background: '#ffffff'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', background: '#eef2ff', borderRadius: '20px',
            fontSize: '13px', fontWeight: '600', color: '#4f46e5', marginBottom: '24px'
          }}>
            <Bot size={14} /> AI-Powered Outbound Calling Platform
          </div>
          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: '800', lineHeight: '1.1',
            margin: '0 0 20px 0', letterSpacing: '-0.03em', color: '#0f172a'
          }}>
            Your AI Sales Rep That<br />
            <span style={{ color: '#4f46e5' }}>Never Stops Calling</span>
          </h1>
          <p style={{
            fontSize: '18px', color: '#6b7280', maxWidth: '580px', margin: '0 auto 36px',
            lineHeight: '1.7'
          }}>
            OutReach AI makes thousands of intelligent outbound calls, books appointments,
            and follows up with leads — all on autopilot, 24/7.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{
              padding: '14px 32px', fontSize: '16px', fontWeight: '700', color: '#fff',
              background: '#4f46e5', textDecoration: 'none', borderRadius: '10px',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(79,70,229,0.3)'
            }}>
              Start Free Setup <ArrowRight size={18} />
            </Link>
            <a href="#how-it-works" style={{
              padding: '14px 32px', fontSize: '16px', fontWeight: '600', color: '#374151',
              textDecoration: 'none', borderRadius: '10px', border: '1px solid #d1d5db',
              display: 'inline-flex', alignItems: 'center', gap: '8px'
            }}>
              See How It Works
            </a>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '48px', marginTop: '60px',
            flexWrap: 'wrap'
          }}>
            {[
              { value: '24/7', label: 'Always Calling' },
              { value: '10x', label: 'More Calls Than Humans' },
              { value: '$100', label: 'Per Booked Appointment' },
              { value: '< 2s', label: 'Response Time' }
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '28px', fontWeight: '800', color: '#4f46e5', margin: '0' }}>{stat.value}</p>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What It Does */}
      <section style={{ padding: '80px 24px', background: '#ffffff' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>What OutReach AI Does</p>
            <h2 style={{ fontSize: '36px', fontWeight: '800', margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
              One Platform. Unlimited AI Calls.
            </h2>
            <p style={{ fontSize: '16px', color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>
              Replace manual cold calling with an AI that sounds natural, handles objections, and books meetings automatically.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {[
              { icon: PhoneCall, title: 'Intelligent Outbound Calls', desc: 'AI makes natural-sounding calls to your leads, handles conversations, and responds to objections in real-time.', color: '#4f46e5' },
              { icon: Calendar, title: 'Automatic Appointment Booking', desc: 'When a lead is interested, AI schedules the appointment directly — no human intervention needed.', color: '#059669' },
              { icon: Mic, title: 'Call Recording & Transcripts', desc: 'Every call is recorded in dual-channel stereo with full AI-generated transcripts for review.', color: '#d946ef' },
              { icon: MessageSquare, title: 'Voicemail Detection & Drop', desc: 'AI detects voicemail and leaves a professional pre-recorded message automatically.', color: '#f59e0b' },
              { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Track call outcomes, appointment rates, costs, and campaign performance on a live dashboard.', color: '#0ea5e9' },
              { icon: Target, title: 'Smart Lead Scoring', desc: 'AI automatically scores leads based on call outcomes, engagement, and conversion likelihood.', color: '#ef4444' }
            ].map((feature, i) => (
              <div key={i} style={{
                padding: '28px', borderRadius: '16px', border: '1px solid #f3f4f6',
                background: '#fafafa', transition: 'transform 0.2s, box-shadow 0.2s'
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: `${feature.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <feature.icon size={22} color={feature.color} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 8px 0' }}>{feature.title}</h3>
                <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: 0 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ padding: '80px 24px', background: '#f8fafc' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>How It Works</p>
            <h2 style={{ fontSize: '36px', fontWeight: '800', margin: '0', letterSpacing: '-0.02em' }}>
              Up and Running in 3 Steps
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {[
              { step: '1', title: 'Create Your Campaign', desc: 'Set up your AI script, upload your contact list, and configure your caller ID. Our team helps with onboarding.', icon: Users },
              { step: '2', title: 'AI Starts Calling', desc: 'Your AI assistant calls leads one by one, has natural conversations, handles objections, and identifies interest.', icon: Phone },
              { step: '3', title: 'Appointments Booked Automatically', desc: 'When a lead wants to meet, the AI books the appointment, checks for conflicts, and confirms the time — all in real-time on the call.', icon: Calendar }
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '24px',
                padding: '32px', background: '#ffffff', borderRadius: '16px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '14px', flexShrink: 0,
                  background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '22px', fontWeight: '800'
                }}>
                  {item.step}
                </div>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: '1.7', margin: 0 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '80px 24px', background: '#ffffff' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>Pricing</p>
            <h2 style={{ fontSize: '36px', fontWeight: '800', margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
              Simple, Transparent Pricing
            </h2>
            <p style={{ fontSize: '16px', color: '#6b7280', maxWidth: '500px', margin: '0 auto' }}>
              One setup fee, one monthly subscription. Only pay extra when AI books real appointments.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', maxWidth: '700px', margin: '0 auto' }}>
            {/* Setup Fee */}
            <div style={{
              padding: '32px', borderRadius: '16px', border: '1px solid #e5e7eb',
              background: '#ffffff'
            }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>Step 1</p>
              <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px 0' }}>Setup Fee</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
                <span style={{ fontSize: '40px', fontWeight: '800' }}>$1,000</span>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>one-time</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {['Full platform setup', 'Custom AI script configuration', 'Campaign creation', 'Contact import assistance', 'Training & onboarding'].map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '14px', color: '#4b5563' }}>
                    <Check size={16} color="#059669" style={{ flexShrink: 0 }} /> {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Monthly */}
            <div style={{
              padding: '32px', borderRadius: '16px', border: '2px solid #4f46e5',
              background: '#ffffff', position: 'relative',
              boxShadow: '0 4px 20px rgba(79,70,229,0.12)'
            }}>
              <div style={{
                position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)',
                background: '#4f46e5', color: '#fff', padding: '4px 16px',
                borderRadius: '0 0 8px 8px', fontSize: '11px', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                Step 2
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '12px 0 4px 0' }}>Monthly Plan</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                <span style={{ fontSize: '40px', fontWeight: '800' }}>$1,000</span>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>/month</span>
              </div>
              <p style={{ fontSize: '14px', color: '#4f46e5', fontWeight: '600', margin: '0 0 20px 0' }}>+ $100 per booked appointment</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {['Unlimited AI calls', 'Call recording & transcripts', 'Voicemail detection', 'Full analytics dashboard', 'Priority support', 'Custom AI scripts', 'Multiple campaigns'].map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '14px', color: '#4b5563' }}>
                    <Check size={16} color="#059669" style={{ flexShrink: 0 }} /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link to="/signup" style={{
              padding: '14px 40px', fontSize: '16px', fontWeight: '700', color: '#fff',
              background: '#4f46e5', textDecoration: 'none', borderRadius: '10px',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(79,70,229,0.3)'
            }}>
              Get Started Now <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Results / Social Proof */}
      <section style={{ padding: '80px 24px', background: '#0f172a', color: '#ffffff' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>Results</p>
          <h2 style={{ fontSize: '36px', fontWeight: '800', margin: '0 0 48px 0', letterSpacing: '-0.02em' }}>
            Built for Performance
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
            {[
              { icon: TrendingUp, value: '10x', label: 'More Outreach Than Manual Calling', color: '#818cf8' },
              { icon: Clock, value: '24/7', label: 'Your AI Never Sleeps', color: '#34d399' },
              { icon: DollarSign, value: '80%', label: 'Lower Cost Per Lead', color: '#fbbf24' },
              { icon: Star, value: '< 2sec', label: 'AI Response Time', color: '#f472b6' }
            ].map((stat, i) => (
              <div key={i} style={{
                padding: '28px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <stat.icon size={28} color={stat.color} style={{ marginBottom: '12px' }} />
                <p style={{ fontSize: '32px', fontWeight: '800', color: stat.color, margin: '0 0 4px 0' }}>{stat.value}</p>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', background: '#ffffff', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>
            Ready to Scale Your Outreach?
          </h2>
          <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '32px', lineHeight: '1.7' }}>
            Join businesses using OutReach AI to book more appointments, close more deals, and spend less on outbound calling.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{
              padding: '14px 40px', fontSize: '16px', fontWeight: '700', color: '#fff',
              background: '#4f46e5', textDecoration: 'none', borderRadius: '10px',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(79,70,229,0.3)'
            }}>
              Create Your Account <ArrowRight size={18} />
            </Link>
            <Link to="/login" style={{
              padding: '14px 32px', fontSize: '16px', fontWeight: '600', color: '#374151',
              textDecoration: 'none', borderRadius: '10px', border: '1px solid #d1d5db'
            }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 24px', background: '#0f172a', color: '#9ca3af',
        textAlign: 'center', fontSize: '13px'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <img src="/logo.svg" alt="OutReach AI" style={{ width: '220px' }} />
        </div>
        <p style={{ margin: '0 0 8px 0' }}>AI-Powered Outbound Calling Platform</p>
        <p style={{ margin: 0 }}>&copy; 2026 OutReach AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
