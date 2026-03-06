import { useState, useEffect } from 'react';
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
  Calendar
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Calls', href: '/calls', icon: Phone },
  { name: 'Callbacks', href: '/callbacks', icon: PhoneCall },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const { isConnected } = useWebSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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
        {/* Logo */}
        <div style={{ padding: '22px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
            <div style={{
              width: '36px', height: '36px',
              background: '#4f46e5', borderRadius: '9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Zap style={{ width: '18px', height: '18px', color: 'white', strokeWidth: 2.5 }} />
            </div>
            <div>
              <h1 style={{ fontSize: '16px', fontWeight: '700', color: '#f9fafb', letterSpacing: '-0.01em' }}>EstateReach</h1>
              <p style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '1px' }}>AI Outreach</p>
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
                <span>{item.name}</span>
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
