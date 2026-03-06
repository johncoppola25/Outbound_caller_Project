import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowUpRight, MapPin, Phone } from 'lucide-react';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    try {
      const res = await fetch('/api/calls/appointments');
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setAppointments([]);
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
        <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>Appointments</h1>
        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Contacts who scheduled appointments during AI calls</p>
      </div>

      {appointments.length === 0 ? (
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
            <Calendar style={{ width: '24px', height: '24px', color: '#9ca3af' }} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>No appointments yet</h3>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>When the AI schedules appointments during calls, they will appear here.</p>
        </div>
      ) : (
        <div style={{
          background: '#ffffff', borderRadius: '12px', overflow: 'hidden',
          border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {appointments.map((apt, idx) => (
            <Link
              key={apt.id}
              to={`/calls/${apt.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '16px 20px',
                borderBottom: idx < appointments.length - 1 ? '1px solid #f3f4f6' : 'none',
                textDecoration: 'none', transition: 'background-color 0.15s', color: 'inherit'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: '42px', height: '42px', borderRadius: '10px',
                background: '#f5f3ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Calendar style={{ width: '20px', height: '20px', color: '#7c3aed' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{apt.first_name} {apt.last_name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                  <Phone style={{ width: '13px', height: '13px', color: '#9ca3af' }} />
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{apt.phone}</span>
                  <span style={{ color: '#e5e7eb', fontSize: '10px' }}>|</span>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{apt.campaign_name}</span>
                </div>
                {apt.property_address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px' }}>
                    <MapPin style={{ width: '13px', height: '13px', color: '#9ca3af' }} />
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{apt.property_address}</span>
                  </div>
                )}
                {apt.appointment_at && (
                  <div style={{ marginTop: '5px', fontSize: '12px', fontWeight: '700', color: '#7c3aed' }}>
                    {apt.appointment_at}
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
