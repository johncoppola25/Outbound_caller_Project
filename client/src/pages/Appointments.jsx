import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Phone, Mail, MapPin, User, Clock, FileText, CheckCircle, Copy, ExternalLink, X, ClipboardCheck } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [completingApt, setCompletingApt] = useState(null);
  const [outcomeText, setOutcomeText] = useState('');
  const [notesText, setNotesText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    try {
      const res = await apiFetch('/api/calls/appointments');
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function formatDateTime(ds) {
    if (!ds) return null;
    try {
      let s = String(ds).trim().replace(' ', 'T');
      if (!s.endsWith('Z') && !/[-+]\d{2}:?\d{0,2}$/.test(s)) s += 'Z';
      const d = new Date(s);
      if (isNaN(d.getTime())) return ds;
      return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return ds;
    }
  }

  function getContactInfo(apt) {
    const lines = [];
    lines.push(`Name: ${apt.first_name} ${apt.last_name}`);
    lines.push(`Phone: ${apt.phone}`);
    if (apt.email) lines.push(`Email: ${apt.email}`);
    if (apt.property_address) lines.push(`Property: ${apt.property_address}`);
    if (apt.appointment_at) lines.push(`Appointment: ${apt.appointment_at}`);
    if (apt.summary) lines.push(`Notes: ${apt.summary}`);
    lines.push(`Campaign: ${apt.campaign_name}`);
    return lines.join('\n');
  }

  async function handleCompleteMeeting() {
    if (!completingApt) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/meetings/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: completingApt.id,
          outcome: outcomeText || 'completed',
          notes: notesText
        })
      });
      if (res.ok) {
        setCompletingApt(null);
        setOutcomeText('');
        setNotesText('');
        fetchAppointments();
      }
    } catch (err) {
      console.error('Error completing meeting:', err);
    } finally {
      setSubmitting(false);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>Appointments</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
            {appointments.length > 0
              ? `${appointments.length} scheduled meeting${appointments.length !== 1 ? 's' : ''} with Kenny`
              : 'Contacts who scheduled appointments during AI calls'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/meeting-history" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', background: '#f9fafb', border: '1px solid #e5e7eb',
            borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '500', color: '#4b5563'
          }}>
            <ClipboardCheck style={{ width: '14px', height: '14px' }} /> Meeting History
          </Link>
          {appointments.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', background: '#ecfdf5',
              border: '1px solid #a7f3d0', borderRadius: '9999px'
            }}>
              <CheckCircle style={{ width: '16px', height: '16px', color: '#059669' }} />
              <span style={{ fontWeight: '700', color: '#059669', fontSize: '14px' }}>{appointments.length}</span>
            </div>
          )}
        </div>
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
          <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '400px', margin: '0 auto 16px' }}>
            When the AI schedules 15-minute consultations with Kenny during calls, they will appear here with all the contact details.
          </p>
          <Link to="/meeting-history" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', background: '#eef2ff', border: '1px solid #c7d2fe',
            borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '500', color: '#4f46e5'
          }}>
            <ClipboardCheck style={{ width: '14px', height: '14px' }} /> View Meeting History
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {appointments.map((apt) => (
            <div
              key={apt.id}
              style={{
                background: '#ffffff', borderRadius: '12px', overflow: 'hidden',
                border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'box-shadow 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'}
            >
              {/* Green header bar */}
              <div style={{
                background: 'linear-gradient(135deg, #059669, #047857)',
                padding: '14px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar style={{ width: '18px', height: '18px', color: '#ffffff' }} />
                  <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '15px' }}>
                    15-Minute Meeting with Kenny
                  </span>
                </div>
                {apt.appointment_at && (
                  <span style={{
                    background: 'rgba(255,255,255,0.2)', color: '#ffffff',
                    padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600'
                  }}>
                    {apt.appointment_at}
                  </span>
                )}
              </div>

              {/* Content */}
              <div style={{ padding: '18px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User style={{ width: '18px', height: '18px', color: '#4f46e5' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Name</p>
                        <p style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>{apt.first_name} {apt.last_name}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Phone style={{ width: '18px', height: '18px', color: '#059669' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</p>
                        <p style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>{apt.phone}</p>
                      </div>
                    </div>
                    {apt.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Mail style={{ width: '18px', height: '18px', color: '#7c3aed' }} />
                        </div>
                        <div>
                          <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</p>
                          <p style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>{apt.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {apt.property_address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <MapPin style={{ width: '18px', height: '18px', color: '#d97706' }} />
                        </div>
                        <div>
                          <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Property Address</p>
                          <p style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>{apt.property_address}</p>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Clock style={{ width: '18px', height: '18px', color: '#6b7280' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Call Date</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#4b5563' }}>{formatDateTime(apt.created_at)}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText style={{ width: '18px', height: '18px', color: '#6b7280' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campaign</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#4b5563' }}>{apt.campaign_name}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {apt.summary && (
                  <div style={{ marginTop: '14px', padding: '12px 14px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', textTransform: 'uppercase', marginBottom: '4px' }}>Notes</p>
                    <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>{apt.summary}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '14px', borderTop: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => { setCompletingApt(apt); setOutcomeText(''); setNotesText(''); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px', background: '#4f46e5',
                      border: 'none', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '13px', fontWeight: '600', color: '#ffffff', transition: 'all 0.2s'
                    }}
                  >
                    <CheckCircle style={{ width: '14px', height: '14px' }} /> Complete Meeting
                  </button>

                  <button
                    onClick={() => copyToClipboard(getContactInfo(apt), apt.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px', background: copiedId === apt.id ? '#ecfdf5' : '#f9fafb',
                      border: `1px solid ${copiedId === apt.id ? '#a7f3d0' : '#e5e7eb'}`,
                      borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                      color: copiedId === apt.id ? '#059669' : '#4b5563', transition: 'all 0.2s'
                    }}
                  >
                    {copiedId === apt.id ? <><CheckCircle style={{ width: '14px', height: '14px' }} /> Copied!</> : <><Copy style={{ width: '14px', height: '14px' }} /> Copy Info</>}
                  </button>

                  <Link to={`/calls/${apt.id}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', background: '#eef2ff', border: '1px solid #c7d2fe',
                    borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '500', color: '#4f46e5'
                  }}>
                    <ExternalLink style={{ width: '14px', height: '14px' }} /> View Call & Transcript
                  </Link>

                  <a href={`tel:${apt.phone}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', background: '#059669', border: 'none',
                    borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '600', color: '#ffffff'
                  }}>
                    <Phone style={{ width: '14px', height: '14px' }} /> Call Back
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complete Meeting Modal */}
      {completingApt && (
        <>
          <div onClick={() => setCompletingApt(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 2001, width: '480px', maxWidth: '90vw',
            background: 'white', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            {/* Modal header */}
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
              padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '16px' }}>Complete Meeting</span>
              </div>
              <button onClick={() => setCompletingApt(null)} style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px',
                padding: '4px', cursor: 'pointer', display: 'flex'
              }}>
                <X style={{ width: '16px', height: '16px', color: '#ffffff' }} />
              </button>
            </div>

            {/* Contact summary */}
            <div style={{ padding: '16px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Meeting with</p>
              <p style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>{completingApt.first_name} {completingApt.last_name}</p>
              <p style={{ fontSize: '13px', color: '#6b7280' }}>{completingApt.phone} {completingApt.appointment_at ? `- ${completingApt.appointment_at}` : ''}</p>
            </div>

            {/* Form */}
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Meeting Outcome</label>
                <select
                  value={outcomeText}
                  onChange={e => setOutcomeText(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #d1d5db', fontSize: '13px', color: '#111827',
                    background: 'white', outline: 'none'
                  }}
                >
                  <option value="">Select outcome...</option>
                  <option value="successful">Successful - Deal Moving Forward</option>
                  <option value="follow_up_needed">Follow-Up Needed</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="rescheduled">Rescheduled</option>
                  <option value="no_show">No Show</option>
                  <option value="completed">Completed - General</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Notes</label>
                <textarea
                  value={notesText}
                  onChange={e => setNotesText(e.target.value)}
                  placeholder="What happened in the meeting? Key takeaways, next steps..."
                  rows={4}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #d1d5db', fontSize: '13px', color: '#111827',
                    resize: 'vertical', outline: 'none', fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setCompletingApt(null)} style={{
                  padding: '10px 18px', background: '#f9fafb', border: '1px solid #e5e7eb',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#4b5563'
                }}>Cancel</button>
                <button
                  onClick={handleCompleteMeeting}
                  disabled={submitting}
                  style={{
                    padding: '10px 18px', background: submitting ? '#9ca3af' : '#4f46e5',
                    border: 'none', borderRadius: '8px', cursor: submitting ? 'default' : 'pointer',
                    fontSize: '13px', fontWeight: '600', color: '#ffffff'
                  }}
                >{submitting ? 'Saving...' : 'Complete Meeting'}</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
