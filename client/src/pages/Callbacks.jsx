import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Clock, ArrowUpRight } from 'lucide-react';

export default function Callbacks() {
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallbacks();
  }, []);

  async function fetchCallbacks() {
    try {
      const res = await fetch('/api/calls/callbacks');
      const data = await res.json();
      setCallbacks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching callbacks:', err);
      setCallbacks([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>Callbacks Due</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Contacts who requested a callback - follow up to convert leads</p>
      </div>

      {callbacks.length === 0 ? (
        <div style={{
          background: '#ffffff', borderRadius: '12px', padding: '60px', textAlign: 'center',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '12px',
            background: '#f9fafb', border: '1px solid #e5e7eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Phone style={{ width: '24px', height: '24px', color: '#9ca3af' }} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>No callbacks pending</h3>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>When contacts request a callback during AI calls, they will appear here.</p>
        </div>
      ) : (
        <div style={{
          background: '#ffffff', borderRadius: '12px', overflow: 'hidden',
          border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {callbacks.map((cb, idx) => (
            <Link
              key={cb.id}
              to={`/calls/${cb.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '16px 20px',
                borderBottom: idx < callbacks.length - 1 ? '1px solid #f3f4f6' : 'none',
                textDecoration: 'none', transition: 'background-color 0.15s', color: 'inherit'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: '42px', height: '42px', borderRadius: '10px',
                background: '#eef2ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Phone style={{ width: '20px', height: '20px', color: '#4f46e5' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{cb.first_name} {cb.last_name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{cb.phone}</span>
                  <span style={{ color: '#e5e7eb', fontSize: '10px' }}>|</span>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{cb.campaign_name}</span>
                </div>
                {cb.callback_preferred_at && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <Clock style={{ width: '13px', height: '13px', color: '#d97706' }} />
                    <span style={{ fontSize: '12px', color: '#d97706', fontWeight: '500' }}>Preferred: {cb.callback_preferred_at}</span>
                  </div>
                )}
              </div>
              <ArrowUpRight style={{ width: '16px', height: '16px', color: '#d1d5db', flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
