import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Phone,
  BarChart3,
  Settings,
  Zap,
  Menu,
  X,
  PhoneCall,
  Calendar,
  Bell,
  Check,
  CheckCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';

const API_BASE = '';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Calls', href: '/calls', icon: Phone },
  { name: 'Callbacks', href: '/callbacks', icon: PhoneCall },
  { name: 'Appointments', href: '/appointments', icon: Calendar, badge: true },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const { isConnected, subscribe } = useWebSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('readNotifications') || '[]'); }
    catch { return []; }
  });
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const [apptRes, callbackRes, callsRes] = await Promise.all([
        fetch(`${API_BASE}/api/calls/appointments`),
        fetch(`${API_BASE}/api/calls/callbacks`),
        fetch(`${API_BASE}/api/calls?limit=20`)
      ]);
      const notifs = [];
      if (apptRes.ok) {
        const appts = await apptRes.json();
        setAppointmentCount(Array.isArray(appts) ? appts.length : 0);
        (Array.isArray(appts) ? appts : []).forEach(a => {
          notifs.push({
            id: `appt-${a.id}`,
            type: 'appointment',
            title: 'New Appointment',
            message: `${a.contact_first_name || ''} ${a.contact_last_name || ''} - ${a.appointment_at || 'Time TBD'}`.trim(),
            time: a.ended_at || a.created_at,
            link: `/calls/${a.id}`
          });
        });
      }
      if (callbackRes.ok) {
        const callbacks = await callbackRes.json();
        (Array.isArray(callbacks) ? callbacks : []).forEach(c => {
          notifs.push({
            id: `callback-${c.id}`,
            type: 'callback',
            title: 'Callback Requested',
            message: `${c.contact_first_name || ''} ${c.contact_last_name || ''} - ${c.callback_preferred_at || 'Time TBD'}`.trim(),
            time: c.ended_at || c.created_at,
            link: `/calls/${c.id}`
          });
        });
      }
      if (callsRes.ok) {
        const callsData = await callsRes.json();
        const calls = Array.isArray(callsData) ? callsData : callsData.calls || [];
        calls.filter(c => c.status === 'completed' && c.outcome).forEach(c => {
          if (c.outcome !== 'appointment_scheduled' && c.outcome !== 'callback_requested') {
            notifs.push({
              id: `call-${c.id}`,
              type: 'call',
              title: 'Call Completed',
              message: `${c.contact_first_name || ''} ${c.contact_last_name || ''} - ${(c.outcome || '').replace(/_/g, ' ')}`.trim(),
              time: c.ended_at || c.created_at,
              link: `/calls/${c.id}`
            });
          }
        });
      }
      notifs.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
      setNotifications(notifs.slice(0, 30));
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, location.pathname]);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === 'call_update' || msg.type === 'call_ended') {
        fetchNotifications();
      }
    });
  }, [subscribe, fetchNotifications]);

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    localStorage.setItem('readNotifications', JSON.stringify(allIds));
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f3f4f6' }}>
      {/* Mobile Menu */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'fixed', top: '14px', left: '14px', zIndex: 1001,
            padding: '10px', background: '#111827', color: 'white',
            border: 'none', borderRadius: '10px', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      )}

      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }} />
      )}

      {/* Sidebar */}
      <aside style={{
        width: isMobile ? '264px' : '240px',
        background: '#111827',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', height: '100vh', zIndex: 1000,
        transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        transition: 'transform 0.25s ease'
      }}>
        {/* Logo + Bell */}
        <div style={{ padding: '22px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{
              width: '36px', height: '36px',
              background: '#4f46e5', borderRadius: '9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Zap style={{ width: '18px', height: '18px', color: 'white', strokeWidth: 2.5 }} />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '16px', fontWeight: '700', color: '#f9fafb', letterSpacing: '-0.01em' }}>EstateReach</h1>
              <p style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '1px' }}>AI Outreach</p>
            </div>
            {/* Bell icon */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  position: 'relative', background: 'rgba(255,255,255,0.08)',
                  border: 'none', borderRadius: '8px', padding: '7px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Bell size={16} color="#9ca3af" />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-3px', right: '-3px',
                    background: '#ef4444', color: 'white',
                    fontSize: '8px', fontWeight: '700',
                    minWidth: '14px', height: '14px', borderRadius: '7px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', border: '2px solid #111827'
                  }}>{unreadCount}</span>
                )}
              </button>

              {/* Notification dropdown */}
              {showNotifications && (
                <>
                  <div onClick={() => setShowNotifications(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 1001 }} />
                  <div style={{
                    position: 'absolute', top: '40px', left: 0, zIndex: 1002,
                    width: '320px', maxHeight: '440px',
                    background: 'white', borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.25)', border: '1px solid #e5e7eb',
                    overflow: 'hidden', display: 'flex', flexDirection: 'column'
                  }}>
                    {/* Header */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 14px', borderBottom: '1px solid #f3f4f6'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>Notifications</span>
                        {unreadCount > 0 && (
                          <span style={{
                            background: '#ef4444', color: 'white', fontSize: '9px', fontWeight: '700',
                            padding: '1px 6px', borderRadius: '10px'
                          }}>{unreadCount}</span>
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <button onClick={markAllRead} style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '11px', color: '#4f46e5', fontWeight: '600'
                        }}>
                          <CheckCheck size={13} />
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* Notification list */}
                    <div style={{ overflowY: 'auto', maxHeight: '380px' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '28px 14px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map(n => {
                          const isRead = readIds.includes(n.id);
                          const typeColors = {
                            appointment: { bg: '#ecfdf5', icon: '#059669' },
                            callback: { bg: '#fefce8', icon: '#d97706' },
                            call: { bg: '#eff6ff', icon: '#3b82f6' }
                          };
                          const tc = typeColors[n.type] || typeColors.call;
                          return (
                            <div
                              key={n.id}
                              onClick={() => { setShowNotifications(false); navigate(n.link); }}
                              style={{
                                display: 'flex', gap: '10px', padding: '10px 14px',
                                cursor: 'pointer', borderBottom: '1px solid #f9fafb',
                                background: isRead ? 'white' : '#f8faff',
                                transition: 'background 0.1s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                              onMouseLeave={e => e.currentTarget.style.background = isRead ? 'white' : '#f8faff'}
                            >
                              <div style={{
                                width: '28px', height: '28px', borderRadius: '7px',
                                background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {n.type === 'appointment' && <Calendar size={13} color={tc.icon} />}
                                {n.type === 'callback' && <PhoneCall size={13} color={tc.icon} />}
                                {n.type === 'call' && <Phone size={13} color={tc.icon} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#111827' }}>{n.title}</span>
                                  {!isRead && <div style={{ width: '6px', height: '6px', borderRadius: '3px', background: '#4f46e5', flexShrink: 0 }} />}
                                </div>
                                <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</p>
                                <p style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px' }}>
                                  {n.time ? new Date(n.time).toLocaleString() : ''}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          <p style={{ fontSize: '10px', fontWeight: '600', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 10px 6px', marginBottom: '2px' }}>Menu</p>
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => isMobile && setSidebarOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '8px', marginBottom: '1px',
                  textDecoration: 'none', fontSize: '13px',
                  transition: 'all 0.12s ease',
                  background: isActive ? 'rgba(79,70,229,0.12)' : 'transparent',
                  color: isActive ? '#a5b4fc' : '#9ca3af',
                  fontWeight: isActive ? '600' : '400'
                }}
              >
                <item.icon style={{ width: '17px', height: '17px', opacity: isActive ? 1 : 0.6 }} />
                <span style={{ flex: 1 }}>{item.name}</span>
                {item.badge && appointmentCount > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: '700',
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 5px'
                  }}>{appointmentCount}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Connection */}
        <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 12px', borderRadius: '8px',
            background: isConnected ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'
          }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: isConnected ? '#10b981' : '#ef4444',
              animation: isConnected ? 'pulse 2s infinite' : 'none'
            }} />
            <span style={{ fontSize: '12px', color: isConnected ? '#6ee7b7' : '#fca5a5', fontWeight: '500' }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* User */}
        <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px' }}>
            <div style={{
              width: '32px', height: '32px', background: '#4f46e5', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: '700', color: 'white'
            }}>RE</div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#e5e7eb' }}>Agent</p>
              <p style={{ fontSize: '10px', color: '#6b7280' }}>Professional</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, marginLeft: isMobile ? '0' : '240px', width: isMobile ? '100%' : 'calc(100% - 240px)' }}>
        <div style={{
          minHeight: '100vh',
          padding: isMobile ? '16px' : '24px 28px',
          paddingTop: isMobile ? '68px' : '24px'
        }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
