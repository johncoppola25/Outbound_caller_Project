import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, User, Phone, Mail, MapPin, Calendar, FileText, ChevronLeft, Trash2, CheckCircle, XCircle, Clock, RotateCcw, UserX } from 'lucide-react';

const outcomeLabels = {
  successful: { label: 'Successful', color: '#059669', bg: '#ecfdf5', icon: CheckCircle },
  follow_up_needed: { label: 'Follow-Up Needed', color: '#d97706', bg: '#fefce8', icon: Clock },
  not_interested: { label: 'Not Interested', color: '#dc2626', bg: '#fef2f2', icon: XCircle },
  rescheduled: { label: 'Rescheduled', color: '#4f46e5', bg: '#eef2ff', icon: RotateCcw },
  no_show: { label: 'No Show', color: '#9ca3af', bg: '#f9fafb', icon: UserX },
  completed: { label: 'Completed', color: '#3b82f6', bg: '#eff6ff', icon: CheckCircle }
};

export default function MeetingHistory() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetings();
  }, []);

  async function fetchMeetings() {
    try {
      const res = await fetch('/api/meetings');
      const data = await res.json();
      setMeetings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteMeeting(id) {
    if (!confirm('Remove this meeting from history?')) return;
    try {
      await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
      setMeetings(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Error deleting meeting:', err);
    }
  }

  function formatDate(ds) {
    if (!ds) return '';
    try {
      let s = String(ds).trim().replace(' ', 'T');
      if (!s.endsWith('Z') && !/[-+]\d{2}:?\d{0,2}$/.test(s)) s += 'Z';
      const d = new Date(s);
      if (isNaN(d.getTime())) return ds;
      return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return ds; }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Link to="/appointments" style={{ color: '#6b7280', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <ChevronLeft style={{ width: '18px', height: '18px' }} />
            </Link>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>Meeting History</h1>
          </div>
          <p style={{ color: '#6b7280', fontSize: '14px', marginLeft: '28px' }}>
            {meetings.length > 0
              ? `${meetings.length} completed meeting${meetings.length !== 1 ? 's' : ''}`
              : 'Completed meetings will appear here'}
          </p>
        </div>
      </div>

      {meetings.length === 0 ? (
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
            <ClipboardCheck style={{ width: '24px', height: '24px', color: '#9ca3af' }} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>No completed meetings yet</h3>
          <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
            When you complete meetings from the Appointments page, they will appear here with your notes and outcome.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {meetings.map((m) => {
            const oc = outcomeLabels[m.outcome] || outcomeLabels.completed;
            const OutcomeIcon = oc.icon;
            return (
              <div key={m.id} style={{
                background: '#ffffff', borderRadius: '12px', overflow: 'hidden',
                border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                {/* Header */}
                <div style={{
                  padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderBottom: '1px solid #f3f4f6'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px', background: oc.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <OutcomeIcon style={{ width: '16px', height: '16px', color: oc.color }} />
                    </div>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>{m.contact_name || 'Unknown'}</span>
                      <span style={{
                        marginLeft: '10px', padding: '2px 8px', borderRadius: '6px',
                        fontSize: '11px', fontWeight: '600', color: oc.color, background: oc.bg
                      }}>{oc.label}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{formatDate(m.completed_at)}</span>
                    <button onClick={() => deleteMeeting(m.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                      color: '#d1d5db', display: 'flex'
                    }}>
                      <Trash2 style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: m.notes ? '14px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone style={{ width: '14px', height: '14px', color: '#9ca3af' }} />
                      <span style={{ fontSize: '13px', color: '#4b5563' }}>{m.phone}</span>
                    </div>
                    {m.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail style={{ width: '14px', height: '14px', color: '#9ca3af' }} />
                        <span style={{ fontSize: '13px', color: '#4b5563' }}>{m.email}</span>
                      </div>
                    )}
                    {m.property_address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin style={{ width: '14px', height: '14px', color: '#9ca3af' }} />
                        <span style={{ fontSize: '13px', color: '#4b5563' }}>{m.property_address}</span>
                      </div>
                    )}
                    {m.campaign_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText style={{ width: '14px', height: '14px', color: '#9ca3af' }} />
                        <span style={{ fontSize: '13px', color: '#4b5563' }}>{m.campaign_name}</span>
                      </div>
                    )}
                    {m.appointment_at && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar style={{ width: '14px', height: '14px', color: '#9ca3af' }} />
                        <span style={{ fontSize: '13px', color: '#4b5563' }}>Appt: {m.appointment_at}</span>
                      </div>
                    )}
                  </div>

                  {m.notes && (
                    <div style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', textTransform: 'uppercase', marginBottom: '4px' }}>Meeting Notes</p>
                      <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{m.notes}</p>
                    </div>
                  )}

                  {m.call_id && (
                    <div style={{ marginTop: '12px' }}>
                      <Link to={`/calls/${m.call_id}`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontSize: '12px', color: '#4f46e5', textDecoration: 'none', fontWeight: '500'
                      }}>
                        View Original Call & Transcript
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
