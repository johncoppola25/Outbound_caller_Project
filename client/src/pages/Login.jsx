import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Login() {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister
      ? { email, password, name, company }
      : { email, password };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setLoading(false);
        return;
      }

      login(data.token, data.user);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>
            <Zap size={28} color="#ffffff" />
          </div>
          <h1 style={styles.brandName}>EstateReach</h1>
          <p style={styles.tagline}>AI-Powered Outbound Calling Platform</p>
        </div>

        <h2 style={styles.heading}>{isRegister ? 'Create Account' : 'Sign In'}</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {isRegister && (
            <>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name (optional)"
                  style={styles.input}
                />
              </div>
            </>
          )}

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading
              ? (isRegister ? 'Creating Account...' : 'Signing In...')
              : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <p style={styles.toggleText}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <span onClick={toggleMode} style={styles.toggleLink}>
            {isRegister ? 'Sign in' : 'Sign up'}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    padding: '40px',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: '#4f46e5',
    marginBottom: '12px',
  },
  brandName: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  tagline: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  heading: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 20px 0',
    textAlign: 'center',
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
    gap: '16px',
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
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: '#ffffff',
    color: '#1e293b',
  },
  button: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '4px',
    transition: 'background-color 0.2s',
  },
  toggleText: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
    color: '#64748b',
  },
  toggleLink: {
    color: '#4f46e5',
    fontWeight: '500',
    cursor: 'pointer',
  },
};
