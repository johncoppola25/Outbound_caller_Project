import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials.');
        setLoading(false);
        return;
      }

      login(data.token, data.user, rememberMe);
      navigate('/dashboard');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Left Panel - Blue Gradient Branding (hidden on mobile) */}
      {!isMobile && (
        <div style={styles.leftPanel}>
          <div style={styles.brandingContent}>
            <img src="/logo.png" alt="EstateReach AI" style={{ height: '52px', marginBottom: '24px' }} />
            <div style={styles.divider} />
            <h2 style={styles.portalTitle}>Outbound Caller</h2>
            <p style={styles.portalSubtitle}>AI-Powered Calling Platform</p>
          </div>
          <p style={styles.poweredBy}>Powered by EstateReach</p>
        </div>
      )}

      {/* Right Panel - Login Form */}
      <div style={{
        ...styles.rightPanel,
        ...(isMobile ? { flex: '1 1 100%', padding: '16px' } : {})
      }}>
        <div style={{
          ...styles.formContainer,
          ...(isMobile ? { maxWidth: 'calc(100vw - 32px)', width: '100%' } : {})
        }}>
          <h1 style={styles.welcomeHeading}>Welcome back</h1>
          <p style={styles.welcomeSubtext}>Sign in to your account to continue</p>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                style={styles.input}
                autoComplete="username"
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{ ...styles.input, paddingRight: '44px' }}
                  autoComplete="current-password"
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
            </div>

            <label style={styles.rememberRow}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={styles.rememberText}>Remember this desktop for 30 days</span>
            </label>

            <button type="submit" disabled={loading} style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'default' : 'pointer'
            }}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p style={styles.switchText}>
            Don't have an account?{' '}
            <Link to="/signup" style={styles.switchLink}>Sign up</Link>
          </p>

          <p style={styles.copyright}>EstateReach AI &copy; 2026</p>
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
    flex: '0 0 55%',
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
  },
  portalSubtitle: {
    fontSize: '15px',
    color: '#6b7280',
    margin: 0,
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
  },
  formContainer: {
    width: '100%',
    maxWidth: '380px',
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
    margin: '0 0 32px 0',
  },
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
    gap: '20px',
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
  input: {
    padding: '12px 14px',
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
  passwordWrapper: {
    position: 'relative',
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
  rememberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    marginTop: '-4px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#4f46e5',
    cursor: 'pointer',
  },
  rememberText: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '400',
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
