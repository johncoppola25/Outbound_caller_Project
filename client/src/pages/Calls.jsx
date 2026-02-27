import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Phone, 
  Search,
  PhoneCall,
  CheckCircle2,
  Clock,
  Calendar,
  ArrowUpRight,
  PlayCircle,
  FileText,
  Download
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export default function Calls() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { subscribe } = useWebSocket();

  useEffect(() => {
    fetchCalls();
    
    const unsubscribe = subscribe((message) => {
      if (message.type === 'call_update') {
        setCalls(prev => {
          const updated = prev.map(c => c.id === message.call.id ? message.call : c);
          if (!prev.find(c => c.id === message.call.id)) {
            return [message.call, ...prev];
          }
          return updated;
        });
      }
    });
    
    return unsubscribe;
  }, [subscribe]);

  async function fetchCalls() {
    try {
      const res = await fetch('/api/calls?limit=200');
      const data = await res.json();
      setCalls(data.calls || []);
    } catch (err) {
      console.error('Error fetching calls:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredCalls = calls.filter(call => {
    const matchesSearch = !searchQuery ||
      `${call.first_name} ${call.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.phone?.includes(searchQuery) ||
      call.campaign_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'all', label: 'All Calls' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'queued', label: 'Queued' },
    { value: 'failed', label: 'Failed' }
  ];

  const outcomeOptions = [
    'appointment_scheduled', 'callback_requested', 'interested', 'voicemail',
    'not_interested', 'no_answer', 'wrong_number', 'do_not_call'
  ];

  async function setOutcomeQuick(callId, outcome, e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await fetch(`/api/calls/${callId}/outcome`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome })
      });
      setCalls(prev => prev.map(c => c.id === callId ? { ...c, outcome } : c));
    } catch (err) {
      console.error('Failed to set outcome:', err);
    }
  }

  const activeCalls = calls.filter(c => c.status === 'in_progress').length;

  function formatDuration(seconds) {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatCallTime(dateStr) {
    if (!dateStr) return '—';
    // SQLite stores UTC without timezone; parse as UTC so display uses local time
    let s = String(dateStr).trim().replace(' ', 'T');
    if (!s.endsWith('Z') && !/[-+]\d{2}:?\d{0,2}$/.test(s)) s += 'Z';
    const d = new Date(s);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (isToday) return `Today ${timeStr}`;
    if (isYesterday) return `Yesterday ${timeStr}`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>Call Activity</h1>
          <p style={{ color: '#8c735e', marginTop: '4px' }}>Monitor and review all outbound calls</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a
            href="/api/calls/export"
            download="calls.csv"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', backgroundColor: '#1e2a45', color: 'white', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}
          >
            <Download style={{ width: '18px', height: '18px' }} />
            Export CSV
          </a>
          {activeCalls > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#fbf7e8', borderRadius: '9999px' }}>
              <PhoneCall style={{ width: '20px', height: '20px', color: '#deb040' }} />
              <span style={{ fontWeight: '600', color: '#a67328' }}>{activeCalls} Active Call{activeCalls !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Calls', value: calls.length, icon: Phone, bg: '#e9ecf5', color: '#1e2a45' },
          { label: 'Active Now', value: activeCalls, icon: PhoneCall, bg: '#fbf7e8', color: '#deb040' },
          { label: 'Completed', value: calls.filter(c => c.status === 'completed').length, icon: CheckCircle2, bg: '#d1fae5', color: '#059669' },
          { label: 'Appointments', value: calls.filter(c => c.outcome === 'appointment_scheduled').length, icon: Calendar, bg: '#ede9fe', color: '#7c3aed' }
        ].map((stat) => (
          <div key={stat.label} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '14px', color: '#99826a' }}>{stat.label}</p>
                <p style={{ fontSize: '24px', fontWeight: '600', color: stat.color }}>{stat.value}</p>
              </div>
              <div style={{ width: '40px', height: '40px', backgroundColor: stat.bg, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon style={{ width: '20px', height: '20px', color: stat.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#ab9a82' }} />
            <input
              type="text"
              placeholder="Search by name, phone, or campaign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 16px 10px 40px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: statusFilter === option.value ? '#1e2a45' : '#edeae5',
                  color: statusFilter === option.value ? 'white' : '#755f4e'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calls List */}
      {filteredCalls.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
          <Phone style={{ width: '64px', height: '64px', color: '#c4b9a7', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '20px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30', marginBottom: '8px' }}>No calls yet</h3>
          <p style={{ color: '#99826a', marginBottom: '24px' }}>Start a campaign to begin making outbound calls.</p>
          <Link to="/campaigns" style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 24px', backgroundColor: '#1e2a45', color: 'white', fontWeight: '500', borderRadius: '8px', textDecoration: 'none' }}>
            View Campaigns
          </Link>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)', overflow: 'hidden' }}>
          {filteredCalls.map((call, idx) => (
            <Link
              key={call.id}
              to={`/calls/${call.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                borderBottom: idx < filteredCalls.length - 1 ? '1px solid #edeae5' : 'none',
                textDecoration: 'none',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                backgroundColor: call.status === 'completed' ? '#d1fae5' : call.status === 'in_progress' ? '#fbf7e8' : '#edeae5'
              }}>
                {call.status === 'completed' ? (
                  <CheckCircle2 style={{ width: '24px', height: '24px', color: '#059669' }} />
                ) : call.status === 'in_progress' ? (
                  <PhoneCall style={{ width: '24px', height: '24px', color: '#deb040' }} />
                ) : (
                  <Clock style={{ width: '24px', height: '24px', color: '#99826a' }} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: '500', color: '#1e2a45' }}>{call.first_name} {call.last_name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <span style={{ fontSize: '14px', color: '#99826a' }}>{call.phone}</span>
                  <span style={{ color: '#c4b9a7' }}>•</span>
                  <span style={{ fontSize: '14px', color: '#99826a' }}>{call.campaign_name}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {call.recording_url && (
                  <div title="Has recording" style={{ width: '28px', height: '28px', backgroundColor: '#dbeafe', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PlayCircle style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                  </div>
                )}
                {call.transcript && (
                  <div title="Has transcript" style={{ width: '28px', height: '28px', backgroundColor: '#f3e8ff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText style={{ width: '16px', height: '16px', color: '#9333ea' }} />
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '140px' }}>
                <div style={{ fontSize: '13px', color: '#99826a', marginBottom: '4px' }}>
                  {formatCallTime(call.started_at || call.created_at)}
                </div>
                <span className={`status-badge status-${call.status}`}>
                  {call.status?.replace('_', ' ')}
                </span>
                <div style={{ marginTop: '4px', minHeight: '20px', fontSize: '13px' }} onClick={e => e.stopPropagation()}>
                  {call.outcome ? (
                    <span style={{ fontWeight: '500', color: '#059669', textTransform: 'capitalize' }}>
                      {call.outcome.replace(/_/g, ' ')}
                    </span>
                  ) : call.status === 'completed' ? (
                    <select
                      value=""
                      onChange={(e) => { const v = e.target.value; if (v) setOutcomeQuick(call.id, v, e); e.target.value = ''; }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #dbd5ca', backgroundColor: 'white', color: '#755f4e' }}
                    >
                      <option value="">Set outcome...</option>
                      {outcomeOptions.map(o => (
                        <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ color: '#99826a', fontStyle: 'italic' }}>No outcome</span>
                  )}
                </div>
                <div style={{ marginTop: '2px', fontSize: '13px', color: '#99826a' }}>
                  {formatDuration(call.duration_seconds)}
                </div>
              </div>

              <ArrowUpRight style={{ width: '20px', height: '20px', color: '#c4b9a7', flexShrink: 0 }} />
            </Link>
          ))}

          <div style={{ padding: '16px 24px', borderTop: '1px solid #edeae5', backgroundColor: '#f7f6f4' }}>
            <p style={{ fontSize: '14px', color: '#99826a' }}>
              Showing {filteredCalls.length} of {calls.length} calls
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
