import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage first (remember me), then sessionStorage
    let savedToken = localStorage.getItem('estatereach_token');
    let savedUser = localStorage.getItem('estatereach_user');
    let savedExpiry = localStorage.getItem('estatereach_token_expiry');

    // If remembered, check if the 30-day expiry has passed
    if (savedToken && savedExpiry && Date.now() > Number(savedExpiry)) {
      localStorage.removeItem('estatereach_token');
      localStorage.removeItem('estatereach_user');
      localStorage.removeItem('estatereach_token_expiry');
      savedToken = null;
      savedUser = null;
    }

    // Fall back to session storage
    if (!savedToken) {
      savedToken = sessionStorage.getItem('estatereach_token');
      savedUser = sessionStorage.getItem('estatereach_user');
    }

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('estatereach_token');
        localStorage.removeItem('estatereach_user');
        localStorage.removeItem('estatereach_token_expiry');
        sessionStorage.removeItem('estatereach_token');
        sessionStorage.removeItem('estatereach_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken, newUser, rememberMe = false) => {
    setToken(newToken);
    setUser(newUser);
    if (rememberMe) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem('estatereach_token', newToken);
      localStorage.setItem('estatereach_user', JSON.stringify(newUser));
      localStorage.setItem('estatereach_token_expiry', String(Date.now() + thirtyDays));
      sessionStorage.removeItem('estatereach_token');
      sessionStorage.removeItem('estatereach_user');
    } else {
      sessionStorage.setItem('estatereach_token', newToken);
      sessionStorage.setItem('estatereach_user', JSON.stringify(newUser));
      localStorage.removeItem('estatereach_token');
      localStorage.removeItem('estatereach_user');
      localStorage.removeItem('estatereach_token_expiry');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('estatereach_token');
    localStorage.removeItem('estatereach_user');
    localStorage.removeItem('estatereach_token_expiry');
    sessionStorage.removeItem('estatereach_token');
    sessionStorage.removeItem('estatereach_user');
  };

  const isAuthenticated = !!token && !!user;

  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
