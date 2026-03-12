import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import Contacts from './pages/Contacts';
import Calls from './pages/Calls';
import CallDetail from './pages/CallDetail';
import Callbacks from './pages/Callbacks';
import Appointments from './pages/Appointments';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import MeetingHistory from './pages/MeetingHistory';
import UserManual from './pages/UserManual';
import Billing from './pages/Billing';
import AdminUsers from './pages/AdminUsers';
import AdminRevenue from './pages/AdminRevenue';
import PhoneNumbers from './pages/PhoneNumbers';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { WebSocketProvider } from './context/WebSocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiFetch } from './utils/api';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PaidRoute({ children }) {
  const { user } = useAuth();
  const [checked, setChecked] = useState(false);
  const [paid, setPaid] = useState(false);

  // Admin and KENNYL bypass payment check
  const bypass = user?.role === 'admin' || user?.name === 'KENNYL';

  useEffect(() => {
    if (bypass) { setPaid(true); setChecked(true); return; }
    apiFetch('/api/billing/subscription').then(res => res.json()).then(data => {
      const hasPaid = data.setupFeePaid && data.subscription?.status === 'active';
      setPaid(hasPaid);
      setChecked(true);
    }).catch(() => setChecked(true));
  }, [bypass]);

  if (!checked) return null;
  if (!paid) return <Navigate to="/billing" replace />;
  return children;
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
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/signup" element={<SignupRoute />} />
            {/* Billing is accessible without payment so users can pay */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="billing" element={<Billing />} />
            </Route>
            {/* All other routes require payment (admin + KENNYL bypass) */}
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
              <Route path="user-manual" element={<UserManual />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </WebSocketProvider>
    </AuthProvider>
  );
}

export default App;
