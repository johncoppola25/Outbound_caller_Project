import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Building2, Lock, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNext = () => {
    setError('');
    if (!name.trim()) return setError('Full name is required.');
    if (!email.trim()) return setError('Email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please enter a valid email.');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) return setError('Password is required.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, company: company || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      login(data.token, data.user, true);
      navigate('/dashboard');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'AI-powered outbound calling',
    'Automated appointment booking',
    'Call recording & transcripts',
    'Voicemail detection & drop',
    'Real-time analytics dashboard',
    'Smart lead scoring'
  ];

  return (
    <div style={styles.page}>
      <Helmet>
        <title>Sign Up - OutReach AI</title>
        <meta name="description" content="Create your OutReach AI account and start automating outbound calls with AI-powered technology." />
      </Helmet>
      {/* Left Panel */}
      {!isMobile && (
        <div style={styles.leftPanel}>
          <div style={styles.brandingContent}>
            <svg viewBox="0 0 250 50" style={{ width: '380px', maxWidth: '100%', marginBottom: '24px' }} xmlns="http://www.w3.org/2000/svg">
              <text x="0" y="34" fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" fontSize="38" fontWeight="700" letterSpacing="-0.5">
                <tspan fill="#ffffff">Out</tspan><tspan fill="#4f46e5">Reach</tspan>
              </text>
              <text x="168" y="34" fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" fontSize="38" fontWeight="300" fill="#4f46e5" letterSpacing="-0.5">AI</text>
              <rect x="3" y="42" width="76" height="3" rx="1.5" fill="#4f46e5"/>
            </svg>
            <h2 style={styles.portalTitle}>AI Outbound Caller</h2>
            <p style={styles.portalSubtitle}>Scale your outreach with intelligent AI calls</p>

            <div style={styles.featureList}>
              {features.map((feature, i) => (
                <div key={i} style={styles.featureItem}>
                  <div style={styles.featureCheck}>
                    <Check size={14} color="#4f46e5" />
                  </div>
                  <span style={styles.featureText}>{feature}</span>
                </div>
              ))}
            </div>

          </div>
          <p style={styles.poweredBy}>Powered by OutReach</p>
        </div>
      )}

      {/* Right Panel - Sign Up Form */}
      <div style={{
        ...styles.rightPanel,
        ...(isMobile ? { flex: '1 1 100%', padding: '24px 16px' } : {})
      }}>
        <div style={{
          ...styles.formContainer,
          ...(isMobile ? { maxWidth: 'calc(100vw - 32px)', width: '100%' } : {})
        }}>
          {/* Mobile logo */}
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <img src="/logo.svg" alt="OutReach AI" style={{ width: '220px' }} />
            </div>
          )}

          <h1 style={styles.welcomeHeading}>Create your account</h1>
          <p style={styles.welcomeSubtext}>Get started with OutReach AI</p>

          {/* Progress steps */}
          <div style={styles.progressBar}>
            <div style={styles.progressStep}>
              <div style={{ ...styles.stepCircle, background: '#4f46e5', color: '#fff' }}>
                {step > 1 ? <Check size={14} /> : '1'}
              </div>
              <span style={{ ...styles.stepLabel, color: '#4f46e5', fontWeight: '600' }}>Your Info</span>
            </div>
            <div style={styles.progressLine(step >= 2)} />
            <div style={styles.progressStep}>
              <div style={{ ...styles.stepCircle, background: step >= 2 ? '#4f46e5' : '#e5e7eb', color: step >= 2 ? '#fff' : '#9ca3af' }}>
                2
              </div>
              <span style={{ ...styles.stepLabel, color: step >= 2 ? '#4f46e5' : '#9ca3af', fontWeight: step >= 2 ? '600' : '400' }}>Password</span>
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          {step === 1 ? (
            <div style={styles.form}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Full Name *</label>
                <div style={styles.inputWrapper}>
                  <User size={16} color="#9ca3af" style={styles.inputIcon} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Smith"
                    required
                    style={styles.inputWithIcon}
                    autoComplete="name"
                    autoFocus
                  />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Email Address *</label>
                <div style={styles.inputWrapper}>
                  <Mail size={16} color="#9ca3af" style={styles.inputIcon} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@company.com"
                    required
                    style={styles.inputWithIcon}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Company Name</label>
                <div style={styles.inputWrapper}>
                  <Building2 size={16} color="#9ca3af" style={styles.inputIcon} />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Your company (optional)"
                    style={styles.inputWithIcon}
                    autoComplete="organization"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleNext}
                style={styles.button}
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.userPreview}>
                <div style={styles.userAvatar}>{name.charAt(0).toUpperCase()}</div>
                <div>
                  <p style={styles.userName}>{name}</p>
                  <p style={styles.userEmail}>{email}</p>
                </div>
                <button type="button" onClick={() => { setStep(1); setError(''); }} style={styles.editButton}>Edit</button>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Password *</label>
                <div style={styles.inputWrapper}>
                  <Lock size={16} color="#9ca3af" style={styles.inputIcon} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    style={{ ...styles.inputWithIcon, paddingRight: '44px' }}
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
                  </button>
                </div>
                {password && (
                  <div style={styles.strengthBar}>
                    <div style={{
                      ...styles.strengthFill,
                      width: password.length < 6 ? '33%' : password.length < 10 ? '66%' : '100%',
                      background: password.length < 6 ? '#ef4444' : password.length < 10 ? '#f59e0b' : '#059669'
                    }} />
                  </div>
                )}
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Confirm Password *</label>
                <div style={styles.inputWrapper}>
                  <Lock size={16} color="#9ca3af" style={styles.inputIcon} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    style={styles.inputWithIcon}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} style={{
                ...styles.button,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'default' : 'pointer'
              }}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}

          <p style={styles.switchText}>
            Already have an account?{' '}
            <Link to="/login" style={styles.switchLink}>Sign in</Link>
          </p>

          <p style={styles.copyright}>OutReach AI &copy; 2026</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },

  /* Left Panel */
  leftPanel: {
    flex: '0 0 50%',
    background: 'linear-gradient(180deg, #0f1623 0%, #111827 50%, #1a2332 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: '40px',
  },
  brandingContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '380px',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '24px',
  },
  logoIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    backgroundColor: '#4f46e5',
  },
  logoText: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: '2px',
  },
  divider: {
    width: '60px',
    height: '3px',
    backgroundColor: '#4f46e5',
    borderRadius: '2px',
    marginBottom: '24px',
  },
  portalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 8px 0',
    textAlign: 'center',
  },
  portalSubtitle: {
    fontSize: '15px',
    color: '#6b7280',
    margin: '0 0 32px 0',
    textAlign: 'center',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    marginBottom: '32px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  featureCheck: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    background: 'rgba(79, 70, 229, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    fontSize: '14px',
    color: '#d1d5db',
  },
  pricingPreview: {
    background: 'rgba(79, 70, 229, 0.1)',
    border: '1px solid rgba(79, 70, 229, 0.2)',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    width: '100%',
  },
  pricingLabel: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '0 0 4px 0',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.05em',
  },
  pricingRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '4px',
  },
  pricingAmount: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#ffffff',
  },
  pricingInterval: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  pricingNote: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '6px 0 0 0',
  },
  poweredBy: {
    position: 'absolute',
    bottom: '24px',
    fontSize: '13px',
    color: '#4b5563',
    margin: 0,
  },

  /* Right Panel */
  rightPanel: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    padding: '40px',
    overflowY: 'auto',
  },
  formContainer: {
    width: '100%',
    maxWidth: '420px',
  },
  welcomeHeading: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 6px 0',
  },
  welcomeSubtext: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 24px 0',
  },

  /* Progress */
  progressBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    marginBottom: '24px',
  },
  progressStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  stepCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    flexShrink: 0,
  },
  stepLabel: {
    fontSize: '13px',
  },
  progressLine: (active) => ({
    flex: 1,
    height: '2px',
    background: active ? '#4f46e5' : '#e5e7eb',
    margin: '0 12px',
    borderRadius: '1px',
    transition: 'background 0.3s',
  }),

  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  inputWithIcon: {
    padding: '12px 14px 12px 40px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    width: '100%',
    boxSizing: 'border-box',
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strengthBar: {
    height: '4px',
    borderRadius: '2px',
    background: '#e5e7eb',
    marginTop: '4px',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s, background 0.3s',
  },

  /* User preview (step 2) */
  userPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    background: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: '#4f46e5',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '700',
    flexShrink: 0,
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  userEmail: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
  },
  editButton: {
    marginLeft: 'auto',
    fontSize: '12px',
    fontWeight: '600',
    color: '#4f46e5',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
  },

  button: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    marginTop: '4px',
    transition: 'background-color 0.2s',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  switchText: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '24px',
  },
  switchLink: {
    color: '#4f46e5',
    fontWeight: '600',
    textDecoration: 'none',
  },
  copyright: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#9ca3af',
    marginTop: '24px',
  },
};
