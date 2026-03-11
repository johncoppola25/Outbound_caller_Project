import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Phone, Mail, MapPin, Calendar, FileText, ChevronLeft, ChevronDown, ChevronRight, Trash2, CheckCircle, XCircle, Clock, RotateCcw, UserX, Filter } from 'lucide-react';

const outcomeLabels = {
  follow_up_needed: { label: 'Follow-Up Needed', color: '#d97706', bg: '#fefce8', border: '#fde68a', icon: Clock, order: 1 },
  rescheduled: { label: 'Rescheduled', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', icon: RotateCcw, order: 2 },
  successful: { label: 'Successful', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: CheckCircle, order: 3 },
  completed: { label: 'Completed', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: CheckCircle, order: 4 },
  not_interested: { label: 'Not Interested', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: XCircle, order: 5 },
  no_show: { label: 'No Show', color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb', icon: UserX, order: 6 },
};

export default function MeetingHistory() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [collapsedSections, setCollapsedSections] = useState({});

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

  function toggleSection(key) {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
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

  // Group meetings by outcome
  function getGroupedMeetings() {
    const filtered = activeFilter === 'all' ? meetings : meetings.filter(m => (m.outcome || 'completed') === activeFilter);

    const groups = {};
    for (const m of filtered) {
      const key = m.outcome || 'completed';
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }

    // Sort groups by priority order
    return Object.entries(groups).sort((a, b) => {
      const orderA = outcomeLabels[a[0]]?.order || 99;
      const orderB = outcomeLabels[b[0]]?.order || 99;
      return orderA - orderB;
    });
  }

  // Get counts per category for filter tabs
  function getCategoryCounts() {
    const counts = {};
    for (const m of meetings) {
      const key = m.outcome || 'completed';
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const grouped = getGroupedMeetings();
  const counts = getCategoryCounts();
  const activeCategories = Object.keys(counts);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Link to="/appointments" style={{ color: '#6b7280', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <ChevronLeft style={{ width: '18px', height: '18px' }} />
            </Link>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>Meeting History</h1>
          </div>
          <p style={{ color: '#6b7280', fontSize: '14px', marginLeft: '28px' }}>
            {meetings.length > 0
              ? `${meetings.length} meeting${meetings.length !== 1 ? 's' : ''} across ${activeCategories.length} categor${activeCategories.length !== 1 ? 'ies' : 'y'}`
              : 'Completed meetings will appear here'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      {meetings.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <Filter style={{ width: '14px', height: '14px', color: '#9ca3af' }} />
          <button
            onClick={() => setActiveFilter('all')}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
              border: activeFilter === 'all' ? '1px solid #4f46e5' : '1px solid #e5e7eb',
              background: activeFilter === 'all' ? '#4f46e5' : '#ffffff',
              color: activeFilter === 'all' ? '#ffffff' : '#4b5563',
              cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            All ({meetings.length})
          </button>
          {activeCategories.sort((a, b) => (outcomeLabels[a]?.order || 99) - (outcomeLabels[b]?.order || 99)).map(key => {
            const oc = outcomeLabels[key] || outcomeLabels.completed;
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                  border: isActive ? `1px solid ${oc.color}` : '1px solid #e5e7eb',
                  background: isActive ? oc.bg : '#ffffff',
                  color: isActive ? oc.color : '#4b5563',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {oc.label} ({counts[key]})
              </button>
            );
          })}
        </div>
      )}

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
      ) : grouped.length === 0 ? (
        <div style={{
          background: '#ffffff', borderRadius: '12px', padding: '40px', textAlign: 'center',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>No meetings match this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {grouped.map(([outcomeKey, groupMeetings]) => {
            const oc = outcomeLabels[outcomeKey] || outcomeLabels.completed;
            const OutcomeIcon = oc.icon;
            const isCollapsed = collapsedSections[outcomeKey];

            return (
              <div key={outcomeKey} style={{
                background: '#ffffff', borderRadius: '12px', overflow: 'hidden',
                border: `1px solid ${oc.border || '#e5e7eb'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                {/* Category Header */}
                <button
                  onClick={() => toggleSection(outcomeKey)}
                  style={{
                    width: '100%', padding: '14px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: oc.bg, border: 'none', cursor: 'pointer',
                    borderBottom: isCollapsed ? 'none' : `1px solid ${oc.border || '#e5e7eb'}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: '#ffffff', border: `1px solid ${oc.border || '#e5e7eb'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <OutcomeIcon style={{ width: '18px', height: '18px', color: oc.color }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: oc.color }}>{oc.label}</span>
                      <span style={{
                        marginLeft: '10px', padding: '2px 8px', borderRadius: '10px',
                        fontSize: '11px', fontWeight: '700', color: oc.color,
                        background: '#ffffff', border: `1px solid ${oc.border || '#e5e7eb'}`
                      }}>
                        {groupMeetings.length}
                      </span>
                    </div>
                  </div>
                  {isCollapsed
                    ? <ChevronRight style={{ width: '18px', height: '18px', color: oc.color }} />
                    : <ChevronDown style={{ width: '18px', height: '18px', color: oc.color }} />
                  }
                </button>

                {/* Meeting Cards */}
                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {groupMeetings.map((m, idx) => (
                      <div key={m.id} style={{
                        padding: '16px 20px',
                        borderBottom: idx < groupMeetings.length - 1 ? '1px solid #f3f4f6' : 'none'
                      }}>
                        {/* Meeting Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>
                            {m.contact_name || 'Unknown'}
                          </span>
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

                        {/* Meeting Details */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: m.notes ? '12px' : '0' }}>
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
                          <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                            <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', textTransform: 'uppercase', marginBottom: '4px' }}>Meeting Notes</p>
                            <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{m.notes}</p>
                          </div>
                        )}

                        {m.call_id && (
                          <div style={{ marginTop: '10px' }}>
                            <Link to={`/calls/${m.call_id}`} style={{
                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                              fontSize: '12px', color: '#4f46e5', textDecoration: 'none', fontWeight: '500'
                            }}>
                              View Original Call & Transcript
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
