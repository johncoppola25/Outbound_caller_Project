import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Phone,
  BarChart3,
  Settings,
  Menu,
  X,
  PhoneCall,
  Calendar,
  Bell,
  Check,
  CheckCheck,
  ClipboardCheck,
  LogOut,
  BookOpen,
  CreditCard,
  Crown,
  DollarSign,
  Smartphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

const API_BASE = '';

const userNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Calls', href: '/calls', icon: Phone },
  { name: 'Callbacks', href: '/callbacks', icon: PhoneCall },
  { name: 'Appointments', href: '/appointments', icon: Calendar, badge: true },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Meeting History', href: '/meeting-history', icon: ClipboardCheck },
  { name: 'Phone Numbers', href: '/phone-numbers', icon: Smartphone },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'User Manual', href: '/user-manual', icon: BookOpen },
];

const adminNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Revenue', href: '/admin/revenue', icon: DollarSign },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Calls', href: '/calls', icon: Phone },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const { isConnected, subscribe } = useWebSocket();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [callingBalance, setCallingBalance] = useState(null);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [addingFunds, setAddingFunds] = useState(false);
  const [autoFund, setAutoFund] = useState({ enabled: false, amount: 50, threshold: 20 });
  const [showAutoFundSettings, setShowAutoFundSettings] = useState(false);
  const isAdmin = user?.role === 'admin';
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
        apiFetch(`${API_BASE}/api/calls/appointments`),
        apiFetch(`${API_BASE}/api/calls/callbacks`),
        apiFetch(`${API_BASE}/api/calls?limit=20`)
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

  // Fetch calling balance (users only)
  const fetchBalance = useCallback(async () => {
    if (isAdmin) return;
    try {
      const res = await apiFetch('/api/billing/balance');
      if (res.ok) {
        const data = await res.json();
        setCallingBalance(data.balance);
        if (data.autoFund) setAutoFund(data.autoFund);
      }
    } catch (e) { /* ignore */ }
  }, [isAdmin]);

  useEffect(() => { fetchBalance(); }, [fetchBalance, location.pathname]);

  // Check for funds_added in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fundsAdded = params.get('funds_added');
    if (fundsAdded) {
      apiFetch('/api/billing/confirm-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(fundsAdded) })
      }).then(res => res.json()).then(data => {
        if (data.balance !== undefined) setCallingBalance(data.balance);
      }).catch(() => {});
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleAddFunds = async (amount) => {
    setAddingFunds(true);
    try {
      const res = await apiFetch('/api/billing/add-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) { /* ignore */ }
    setAddingFunds(false);
  };

  const saveAutoFund = async (settings) => {
    setAutoFund(settings);
    try {
      await apiFetch('/api/billing/auto-fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    } catch (e) { /* ignore */ }
  };

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
            <svg viewBox="0 0 250 50" style={{ width: '170px' }} xmlns="http://www.w3.org/2000/svg">
              <text x="0" y="34" fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" fontSize="38" fontWeight="700" letterSpacing="-0.5">
                <tspan fill="#ffffff">Out</tspan><tspan fill="#4f46e5">Reach</tspan>
              </text>
              <text x="168" y="34" fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" fontSize="38" fontWeight="300" fill="#4f46e5" letterSpacing="-0.5">AI</text>
              <rect x="0" y="42" width="155" height="3" rx="1.5" fill="#4f46e5"/>
            </svg>
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
                    width: 'min(320px, calc(100vw - 40px))', maxHeight: '440px',
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
          {user?.role === 'admin' && (
            <p style={{ fontSize: '10px', fontWeight: '600', color: '#8b5cf6', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 10px 6px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Crown size={10} /> Admin
            </p>
          )}
          {user?.role !== 'admin' && (
            <p style={{ fontSize: '10px', fontWeight: '600', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 10px 6px', marginBottom: '2px' }}>Menu</p>
          )}
          {(user?.role === 'admin' ? adminNavigation : userNavigation).map((item) => {
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

        {/* User & Sign Out */}
        <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px', height: '32px', background: '#4f46e5', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '700', color: 'white'
              }}>{(user?.name || 'U')[0].toUpperCase()}</div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#e5e7eb' }}>{user?.name || 'User'}</p>
                <p style={{ fontSize: '10px', color: '#6b7280' }}>{isAdmin ? 'Admin' : 'User'}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              title="Sign Out"
              style={{
                background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px',
                padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#f87171', transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            >
              <LogOut style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, marginLeft: isMobile ? '0' : '240px', width: isMobile ? '100%' : 'calc(100% - 240px)' }}>
        {/* Top bar with balance */}
        {!isAdmin && callingBalance !== null && (
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            padding: isMobile ? '12px 16px' : '12px 28px',
            paddingTop: isMobile ? '60px' : '12px',
            position: 'sticky', top: 0, zIndex: 50,
            background: 'rgba(243,244,246,0.95)', backdropFilter: 'blur(8px)'
          }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowAddFunds(!showAddFunds)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 16px', borderRadius: '10px', border: '1px solid #e5e7eb',
                  background: callingBalance < 20 ? '#fef2f2' : callingBalance < 50 ? '#fffbeb' : '#ecfdf5',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                  color: callingBalance < 20 ? '#dc2626' : callingBalance < 50 ? '#b45309' : '#059669',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                }}
              >
                <DollarSign size={15} color={callingBalance < 20 ? '#dc2626' : callingBalance < 50 ? '#d97706' : '#059669'} />
                Balance: ${callingBalance.toFixed(2)}
                {callingBalance < 20 && (
                  <span style={{
                    background: '#dc2626', color: '#fff', fontSize: '9px', fontWeight: '700',
                    padding: '1px 6px', borderRadius: '8px', marginLeft: '4px'
                  }}>LOW</span>
                )}
                {callingBalance >= 20 && callingBalance < 50 && (
                  <span style={{
                    background: '#d97706', color: '#fff', fontSize: '9px', fontWeight: '700',
                    padding: '1px 6px', borderRadius: '8px', marginLeft: '4px'
                  }}>LOW</span>
                )}
              </button>

              {/* Add Funds dropdown */}
              {showAddFunds && (
                <>
                  <div onClick={() => setShowAddFunds(false)} style={{ position: 'fixed', inset: 0, zIndex: 51 }} />
                  <div style={{
                    position: 'absolute', top: '44px', right: 0, zIndex: 52,
                    width: '240px', background: '#fff', borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb',
                    overflow: 'hidden'
                  }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: '#111827', margin: 0 }}>Add Calling Credits</p>
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: '2px 0 0' }}>$0.15/min per call</p>
                    </div>
                    <div style={{ padding: '8px' }}>
                      {[25, 50, 100, 200].map(amount => (
                        <button
                          key={amount}
                          onClick={() => { setShowAddFunds(false); handleAddFunds(amount); }}
                          disabled={addingFunds}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            width: '100%', padding: '10px 12px', borderRadius: '8px',
                            border: 'none', background: 'transparent', cursor: 'pointer',
                            fontSize: '13px', color: '#111827', fontWeight: '500',
                            transition: 'background 0.1s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span>Add ${amount}</span>
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>~{Math.floor(amount / 0.15)} min</span>
                        </button>
                      ))}
                    </div>
                    {/* Auto-fund settings */}
                    <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showAutoFundSettings && autoFund.enabled ? '10px' : '0' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#111827' }}>Auto-fund</span>
                        <button
                          onClick={() => {
                            const newEnabled = !autoFund.enabled;
                            saveAutoFund({ ...autoFund, enabled: newEnabled });
                            if (newEnabled) setShowAutoFundSettings(true);
                          }}
                          style={{
                            width: '36px', height: '20px', borderRadius: '10px', border: 'none',
                            background: autoFund.enabled ? '#4f46e5' : '#d1d5db', cursor: 'pointer',
                            position: 'relative', transition: 'background 0.2s'
                          }}
                        >
                          <div style={{
                            width: '16px', height: '16px', borderRadius: '8px', background: '#fff',
                            position: 'absolute', top: '2px',
                            left: autoFund.enabled ? '18px' : '2px',
                            transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                          }} />
                        </button>
                      </div>
                      {autoFund.enabled && (
                        <>
                          <button
                            onClick={() => setShowAutoFundSettings(!showAutoFundSettings)}
                            style={{ fontSize: '11px', color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: '500' }}
                          >
                            {showAutoFundSettings ? 'Hide settings' : 'Configure'}
                          </button>
                          {showAutoFundSettings && (
                            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div>
                                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>Add this amount:</label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {[25, 50, 100, 200].map(amt => (
                                    <button
                                      key={amt}
                                      onClick={() => saveAutoFund({ ...autoFund, amount: amt })}
                                      style={{
                                        flex: 1, padding: '5px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                                        border: autoFund.amount === amt ? '1.5px solid #4f46e5' : '1px solid #e5e7eb',
                                        background: autoFund.amount === amt ? '#eef2ff' : '#fff',
                                        color: autoFund.amount === amt ? '#4f46e5' : '#6b7280',
                                        cursor: 'pointer'
                                      }}
                                    >${amt}</button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>When balance drops below:</label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {[10, 20, 30, 50].map(thr => (
                                    <button
                                      key={thr}
                                      onClick={() => saveAutoFund({ ...autoFund, threshold: thr })}
                                      style={{
                                        flex: 1, padding: '5px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                                        border: autoFund.threshold === thr ? '1.5px solid #4f46e5' : '1px solid #e5e7eb',
                                        background: autoFund.threshold === thr ? '#eef2ff' : '#fff',
                                        color: autoFund.threshold === thr ? '#4f46e5' : '#6b7280',
                                        cursor: 'pointer'
                                      }}
                                    >${thr}</button>
                                  ))}
                                </div>
                              </div>
                              <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0 }}>
                                Auto-adds ${autoFund.amount} when balance falls below ${autoFund.threshold}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {callingBalance < 50 && (
                      <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', background: callingBalance < 20 ? '#fef2f2' : '#fffbeb' }}>
                        <p style={{ fontSize: '11px', color: callingBalance < 20 ? '#dc2626' : '#b45309', margin: 0, fontWeight: '600' }}>
                          {callingBalance < 1 ? 'No balance! Add funds to make calls.' : callingBalance < 20 ? 'Low balance! Add funds to continue making calls.' : 'Balance getting low. Consider adding funds.'}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div style={{
          minHeight: '100vh',
          padding: isMobile ? '16px' : '24px 28px',
          paddingTop: (!isAdmin && callingBalance !== null) ? '0' : (isMobile ? '68px' : '24px')
        }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
