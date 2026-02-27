import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Clock, ArrowUpRight, User } from 'lucide-react';

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
        <div style={{ width: '32px', height: '32px', border: '4px solid #deb040', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '30px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>Callbacks Due</h1>
        <p style={{ color: '#8c735e', marginTop: '4px' }}>Contacts who requested a callback — follow up to convert leads</p>
      </div>

      {callbacks.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
          <Phone style={{ width: '64px', height: '64px', color: '#c4b9a7', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '20px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30', marginBottom: '8px' }}>No callbacks pending</h3>
          <p style={{ color: '#99826a' }}>When contacts request a callback during AI calls, they will appear here.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)', overflow: 'hidden' }}>
          {callbacks.map((cb, idx) => (
            <Link
              key={cb.id}
              to={`/calls/${cb.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                borderBottom: idx < callbacks.length - 1 ? '1px solid #edeae5' : 'none',
                textDecoration: 'none',
                transition: 'background-color 0.2s',
                color: 'inherit'
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone style={{ width: '24px', height: '24px', color: '#2563eb' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: '500', color: '#151c30' }}>{cb.first_name} {cb.last_name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <span style={{ fontSize: '14px', color: '#99826a' }}>{cb.phone}</span>
                  <span style={{ color: '#c4b9a7' }}>•</span>
                  <span style={{ fontSize: '14px', color: '#99826a' }}>{cb.campaign_name}</span>
                </div>
                {cb.callback_preferred_at && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <Clock style={{ width: '14px', height: '14px', color: '#deb040' }} />
                    <span style={{ fontSize: '13px', color: '#a67328' }}>Preferred: {cb.callback_preferred_at}</span>
                  </div>
                )}
              </div>
              <ArrowUpRight style={{ width: '20px', height: '20px', color: '#c4b9a7', flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
