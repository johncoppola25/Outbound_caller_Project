import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Megaphone, 
  Users, 
  Phone, 
  BarChart3, 
  Settings,
  Home,
  Wifi,
  WifiOff,
  Menu,
  X,
  PhoneCall,
  Calendar,
  Moon,
  Sun
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
  { name: 'Telnyx Settings', href: '/settings', icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const { isConnected } = useWebSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', position: 'relative' }}>
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 1001,
            padding: '12px',
            backgroundColor: '#151c30',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999,
            transition: 'opacity 0.3s'
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{ 
        width: isMobile ? '280px' : '272px', 
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        color: 'white', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'fixed',
        height: '100%',
        zIndex: 1000,
        transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        transition: 'transform 0.3s ease-in-out',
        boxShadow: '4px 0 40px rgba(0,0,0,0.15)'
      }}>
        {/* Logo */}
        <div style={{ padding: '28px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ 
              width: '44px', 
              height: '44px', 
              background: 'linear-gradient(135deg, #f0d78c 0%, #d4a84b 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(212,168,75,0.3)'
            }}>
              <Home style={{ width: '22px', height: '22px', color: '#0f172a', strokeWidth: 2.5 }} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '600', fontFamily: 'Playfair Display, serif', letterSpacing: '-0.02em' }}>EstateReach</h1>
              <p style={{ fontSize: '11px', color: 'rgba(148,163,184,0.9)', marginTop: '2px', fontWeight: '500' }}>AI-Powered Outreach</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '20px 16px', overflowY: 'auto' }}>
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <NavLink
                key={item.name}
                to={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  marginBottom: '6px',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  backgroundColor: isActive ? 'rgba(245,223,138,0.15)' : 'transparent',
                  color: isActive ? '#fcd34d' : 'rgba(226,232,240,0.85)',
                  borderLeft: isActive ? '3px solid #f0d78c' : '3px solid transparent'
                }}
              >
                <item.icon style={{ width: '20px', height: '20px', opacity: isActive ? 1 : 0.9 }} />
                <span style={{ fontWeight: '500', fontSize: '15px' }}>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Connection Status */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '8px 16px', 
            borderRadius: '8px',
            backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'
          }}>
            {isConnected ? (
              <>
                <Wifi style={{ width: '16px', height: '16px', color: '#10b981' }} />
                <span style={{ fontSize: '14px', color: '#10b981' }}>Live Connected</span>
              </>
            ) : (
              <>
                <WifiOff style={{ width: '16px', height: '16px', color: '#ef4444' }} />
                <span style={{ fontSize: '14px', color: '#ef4444' }}>Disconnected</span>
              </>
            )}
          </div>
        </div>

        {/* Dark mode toggle */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 16px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', color: '#a3b4d5', cursor: 'pointer', fontSize: '14px' }}
          >
            {darkMode ? <Sun style={{ width: '18px', height: '18px' }} /> : <Moon style={{ width: '18px', height: '18px' }} />}
            {darkMode ? 'Light mode' : 'Dark mode'}
          </button>
        </div>

        {/* User section */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: 'linear-gradient(to bottom right, #ab9a82, #8c735e)', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ color: 'white', fontWeight: '600' }}>RE</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'white' }}>Real Estate Agent</p>
              <p style={{ fontSize: '12px', color: '#718bbd' }}>Professional Plan</p>
            </div>
            <button style={{ 
              padding: '8px', 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              borderRadius: '8px'
            }}>
              <Settings style={{ width: '20px', height: '20px', color: '#718bbd' }} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ 
        flex: 1, 
        marginLeft: isMobile ? '0' : '272px',
        width: isMobile ? '100%' : 'calc(100% - 272px)'
      }}>
        <div className="layout-main" style={{ 
          minHeight: '100vh', 
          padding: isMobile ? '16px' : '32px',
          paddingTop: isMobile ? '72px' : '32px',
          background: 'linear-gradient(135deg, #f7f6f4 0%, #edeae5 100%)' 
        }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
