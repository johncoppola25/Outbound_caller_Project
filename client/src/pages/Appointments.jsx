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
        <div style={{ width: '32px', height: '32px', border: '4px solid #deb040', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '30px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>Appointments</h1>
        <p style={{ color: '#8c735e', marginTop: '4px' }}>Contacts who scheduled appointments during AI calls</p>
      </div>

      {appointments.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
          <Calendar style={{ width: '64px', height: '64px', color: '#c4b9a7', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '20px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30', marginBottom: '8px' }}>No appointments yet</h3>
          <p style={{ color: '#99826a' }}>When the AI schedules appointments during calls, they will appear here.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)', overflow: 'hidden' }}>
          {appointments.map((apt, idx) => (
            <Link
              key={apt.id}
              to={`/calls/${apt.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                borderBottom: idx < appointments.length - 1 ? '1px solid #edeae5' : 'none',
                textDecoration: 'none',
                transition: 'background-color 0.2s',
                color: 'inherit'
              }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar style={{ width: '24px', height: '24px', color: '#7c3aed' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: '500', color: '#151c30' }}>{apt.first_name} {apt.last_name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <Phone style={{ width: '14px', height: '14px', color: '#99826a' }} />
                  <span style={{ fontSize: '14px', color: '#99826a' }}>{apt.phone}</span>
                  <span style={{ color: '#c4b9a7' }}>•</span>
                  <span style={{ fontSize: '14px', color: '#99826a' }}>{apt.campaign_name}</span>
                </div>
                {apt.property_address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <MapPin style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{apt.property_address}</span>
                  </div>
                )}
                {apt.appointment_at && (
                  <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: '600', color: '#7c3aed' }}>
                    {apt.appointment_at}
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
