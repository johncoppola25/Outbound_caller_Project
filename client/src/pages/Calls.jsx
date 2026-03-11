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
import { apiFetch } from '../utils/api';

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
      const res = await apiFetch('/api/calls?limit=200');
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
    { value: 'all', label: 'All' },
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
      await apiFetch(`/api/calls/${callId}/outcome`, {
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
    if (!dateStr) return '--';
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
        <div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>Call Activity</h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Monitor and review all outbound calls</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a
            href="/api/calls/export"
            download="calls.csv"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', background: '#ffffff',
              border: '1px solid #e5e7eb',
              color: '#4b5563', borderRadius: '10px', textDecoration: 'none',
              fontSize: '13px', fontWeight: '500', transition: 'all 0.2s'
            }}
          >
            <Download style={{ width: '16px', height: '16px' }} />
            Export
          </a>
          {activeCalls > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '9999px'
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706', animation: 'pulse 2s infinite' }} />
              <span style={{ fontWeight: '600', color: '#d97706', fontSize: '13px' }}>{activeCalls} Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Calls', value: calls.length, icon: Phone, color: '#4f46e5', bg: '#eef2ff' },
          { label: 'Active Now', value: activeCalls, icon: PhoneCall, color: '#d97706', bg: '#fffbeb' },
          { label: 'Completed', value: calls.filter(c => c.status === 'completed').length, icon: CheckCircle2, color: '#059669', bg: '#ecfdf5' },
          { label: 'Appointments', value: calls.filter(c => c.outcome === 'appointment_scheduled').length, icon: Calendar, color: '#7c3aed', bg: '#f5f3ff' }
        ].map((stat) => (
          <div key={stat.label} style={{
            background: '#ffffff',
            borderRadius: '12px', padding: '16px',
            border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
                <p style={{ fontSize: '24px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>{stat.value}</p>
              </div>
              <div style={{
                width: '36px', height: '36px', background: stat.bg,
                borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <stat.icon style={{ width: '18px', height: '18px', color: stat.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px', padding: '14px',
        border: '1px solid #e5e7eb', marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search by name, phone, or campaign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '9px 14px 9px 36px',
                background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: '8px', fontSize: '13px', outline: 'none', color: '#111827'
              }}
              onFocus={e => e.target.style.borderColor = '#4f46e5'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          <div style={{ display: 'flex', gap: '4px', background: '#f9fafb', borderRadius: '8px', padding: '3px', border: '1px solid #e5e7eb' }}>
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                style={{
                  padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '500',
                  border: 'none', cursor: 'pointer',
                  backgroundColor: statusFilter === option.value ? '#4f46e5' : 'transparent',
                  color: statusFilter === option.value ? '#ffffff' : '#6b7280',
                  transition: 'all 0.2s'
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
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>No calls yet</h3>
          <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>Start a campaign to begin making outbound calls.</p>
          <Link to="/campaigns" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', background: '#4f46e5',
            color: 'white', fontWeight: '600', borderRadius: '10px', textDecoration: 'none', fontSize: '14px'
          }}>
            View Campaigns
          </Link>
        </div>
      ) : (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px', overflow: 'hidden',
          border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {filteredCalls.map((call, idx) => (
            <Link
              key={call.id}
              to={`/calls/${call.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 20px',
                borderBottom: idx < filteredCalls.length - 1 ? '1px solid #f3f4f6' : 'none',
                textDecoration: 'none', transition: 'background-color 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: '42px', height: '42px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: call.status === 'completed' ? '#ecfdf5' : call.status === 'in_progress' ? '#fffbeb' : '#f3f4f6'
              }}>
                {call.status === 'completed' ? (
                  <CheckCircle2 style={{ width: '20px', height: '20px', color: '#059669' }} />
                ) : call.status === 'in_progress' ? (
                  <PhoneCall style={{ width: '20px', height: '20px', color: '#d97706' }} />
                ) : (
                  <Clock style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{call.first_name} {call.last_name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{call.phone}</span>
                  <span style={{ color: '#e5e7eb', fontSize: '10px' }}>|</span>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{call.campaign_name}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {call.recording_url && (
                  <div title="Has recording" style={{
                    width: '26px', height: '26px', background: '#eef2ff',
                    borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <PlayCircle style={{ width: '14px', height: '14px', color: '#4f46e5' }} />
                  </div>
                )}
                {call.transcript && (
                  <div title="Has transcript" style={{
                    width: '26px', height: '26px', background: '#f5f3ff',
                    borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <FileText style={{ width: '14px', height: '14px', color: '#7c3aed' }} />
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '130px' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                  {formatCallTime(call.started_at || call.created_at)}
                </div>
                <span className={`status-badge status-${call.status}`}>
                  {call.status?.replace('_', ' ')}
                </span>
                <div style={{ marginTop: '4px', minHeight: '18px', fontSize: '12px' }} onClick={e => e.stopPropagation()}>
                  {call.outcome ? (
                    <span style={{ fontWeight: '600', color: '#059669', textTransform: 'capitalize' }}>
                      {call.outcome.replace(/_/g, ' ')}
                    </span>
                  ) : call.status === 'completed' ? (
                    <select
                      value=""
                      onChange={(e) => { const v = e.target.value; if (v) setOutcomeQuick(call.id, v, e); e.target.value = ''; }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#f9fafb', color: '#6b7280'
                      }}
                    >
                      <option value="">Set outcome...</option>
                      {outcomeOptions.map(o => (
                        <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>No outcome</span>
                  )}
                </div>
                <div style={{ marginTop: '2px', fontSize: '12px', color: '#9ca3af' }}>
                  {formatDuration(call.duration_seconds)}
                </div>
              </div>

              <ArrowUpRight style={{ width: '16px', height: '16px', color: '#d1d5db', flexShrink: 0 }} />
            </Link>
          ))}

          <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', background: '#f9fafb' }}>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>
              Showing {filteredCalls.length} of {calls.length} calls
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
