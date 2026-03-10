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
import Login from './pages/Login';
import { WebSocketProvider } from './context/WebSocketContext';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
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
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </WebSocketProvider>
    </AuthProvider>
  );
}

export default App;
