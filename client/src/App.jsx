import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { WebSocketProvider } from './context/WebSocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiFetch } from './utils/api';

// Lazy-loaded routes for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const CampaignDetail = lazy(() => import('./pages/CampaignDetail'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Calls = lazy(() => import('./pages/Calls'));
const CallDetail = lazy(() => import('./pages/CallDetail'));
const Callbacks = lazy(() => import('./pages/Callbacks'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const MeetingHistory = lazy(() => import('./pages/MeetingHistory'));
const UserManual = lazy(() => import('./pages/UserManual'));
const Billing = lazy(() => import('./pages/Billing'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminRevenue = lazy(() => import('./pages/AdminRevenue'));
const AdminOverview = lazy(() => import('./pages/AdminOverview'));
const AdminActivity = lazy(() => import('./pages/AdminActivity'));
const PhoneNumbers = lazy(() => import('./pages/PhoneNumbers'));

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PaidRoute({ children }) {
  const [checked, setChecked] = useState(false);
  const [paid, setPaid] = useState(false);

  // Always check server-side (DB role, not JWT) to prevent stale token bypass
  useEffect(() => {
    apiFetch('/api/billing/subscription').then(res => res.json()).then(data => {
      const hasPaid = data.bypass || (data.setupFeePaid && data.subscription?.status === 'active');
      setPaid(hasPaid);
      setChecked(true);
    }).catch(() => setChecked(true));
  }, []);

  if (!checked) return null;
  if (!paid) return <Navigate to="/billing" replace />;
  return children;
}

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '72px', fontWeight: '800', color: '#4f46e5', letterSpacing: '-2px', marginBottom: '8px' }}>404</div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 8px' }}>Page not found</h1>
        <p style={{ fontSize: '15px', color: '#6b7280', margin: '0 0 28px', lineHeight: 1.6 }}>The page you're looking for doesn't exist or has been moved.</p>
        <a href="/" style={{ display: 'inline-block', padding: '12px 28px', background: '#4f46e5', color: '#fff', borderRadius: '10px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>Go Home</a>
      </div>
    </div>
  );
}

function HomeRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Landing />;
}

function LoginRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Login />;
}

function SignupRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Signup />;
}

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <BrowserRouter>
          <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', color: '#6b7280', fontSize: '14px' }}>Loading...</div>}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/signup" element={<SignupRoute />} />
              {/* Billing is accessible without payment so users can pay */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="billing" element={<Billing />} />
              </Route>
              {/* All other routes require payment */}
              <Route element={<ProtectedRoute><PaidRoute><Layout /></PaidRoute></ProtectedRoute>}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="campaigns" element={<Campaigns />} />
                <Route path="campaigns/:id" element={<CampaignDetail />} />
                <Route path="contacts" element={<Contacts />} />
                <Route path="calls" element={<Calls />} />
                <Route path="calls/:id" element={<CallDetail />} />
                <Route path="callbacks" element={<Callbacks />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="meeting-history" element={<MeetingHistory />} />
                <Route path="phone-numbers" element={<PhoneNumbers />} />
                <Route path="settings" element={<Settings />} />
                <Route path="admin/users" element={<AdminUsers />} />
                <Route path="admin/revenue" element={<AdminRevenue />} />
                <Route path="admin/overview" element={<AdminOverview />} />
                <Route path="admin/activity" element={<AdminActivity />} />
                <Route path="user-manual" element={<UserManual />} />
              </Route>
              {/* 404 catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </WebSocketProvider>
    </AuthProvider>
  );
}

export default App;
