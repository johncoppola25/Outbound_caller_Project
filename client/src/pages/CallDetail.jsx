import { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Phone, User, Calendar, Clock, Mail, Volume2, RefreshCw,
  CheckCircle, XCircle, AlertCircle, PhoneOff, Voicemail, MessageSquare,
  FileText, Activity, Loader, DollarSign, Download, Mic
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

const outcomeConfig = {
  appointment_scheduled: { label: 'Appointment Scheduled', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: CheckCircle },
  not_interested: { label: 'Not Interested', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: XCircle },
  callback_requested: { label: 'Callback Requested', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: Phone },
  voicemail: { label: 'Voicemail', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: Voicemail },
  no_answer: { label: 'No Answer', color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb', icon: PhoneOff },
  busy: { label: 'Busy', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: AlertCircle },
  completed: { label: 'Completed', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: CheckCircle },
  interested: { label: 'Interested', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', icon: CheckCircle },
  wrong_number: { label: 'Wrong Number', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: XCircle },
  do_not_call: { label: 'Do Not Call', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: XCircle },
};
const defaultOutcome = { label: 'Unknown', color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb', icon: AlertCircle };

const cardStyle = { background: '#ffffff', borderRadius: '12px', padding: '22px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' };

export default function CallDetail() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { id } = useParams();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [autoSynced, setAutoSynced] = useState(false);
  const [showOutcomeSelector, setShowOutcomeSelector] = useState(false);
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [lastSyncDebug, setLastSyncDebug] = useState(null);
  const { subscribe } = useWebSocket();
  const pollRef = useRef(null);
  const hasSyncedRef = useRef(false);

  const fetchCall = useCallback(async () => {
    try { const res = await apiFetch(`/api/calls/${id}`); const data = await res.json(); setCall(data); return data; }
    catch (err) { console.error('Error:', err); return null; } finally { setLoading(false); }
  }, [id]);

  const syncFromTelnyx = useCallback(async () => {
    setSyncing(true); setLastSyncDebug(null);
    try {
      const res = await apiFetch(`/api/calls/${id}/sync`, { method: 'POST' }); const data = await res.json();
      if (data.call) setCall(prev => ({ ...prev, ...data.call }));
      setAutoSynced(true); setLastSyncDebug(data.debug || (data.message ? [data.message] : null)); return data;
    } catch (err) { setAutoSynced(true); setLastSyncDebug(['Sync failed: ' + err.message]); return null; }
    finally { setSyncing(false); }
  }, [id]);

  useEffect(() => {
    fetchCall().then(data => {
      if (!data) return;
      const isActive = data.status === 'ringing' || data.status === 'in_progress' || data.status === 'queued';
      // If call already has data from DB, show it immediately and mark as synced
      const hasExistingData = data.transcript || data.summary || data.outcome || data.estimated_cost;
      if (hasExistingData) setAutoSynced(true);
      if (isActive) {
        pollRef.current = setInterval(async () => { const res = await apiFetch(`/api/calls/${id}/sync`, { method: 'POST' }); const sd = await res.json(); if (sd.call) setCall(prev => ({ ...prev, ...sd.call })); }, 5000);
      } else if (!hasSyncedRef.current) {
        hasSyncedRef.current = true;
        // Sync in background - don't block if we already have data
        syncFromTelnyx().then(sd => {
          const noTranscript = !sd?.call?.transcript;
          if (noTranscript && !data.transcript) {
            [10000, 30000, 60000, 120000, 300000].forEach(d => setTimeout(() => syncFromTelnyx(), d));
          }
        });
      } else { setAutoSynced(true); }
    });
    const unsubscribe = subscribe((message) => {
      if (message.type === 'call_update' && message.call.id === id) {
        setCall(prev => {
          const updated = { ...prev, ...message.call };
          if (prev?.status !== 'completed' && updated.status === 'completed' && !hasSyncedRef.current) {
            hasSyncedRef.current = true;
            const doRetries = () => syncFromTelnyx().then(d => { const noTranscript = !d?.call?.transcript; if (noTranscript) [10000, 30000, 60000, 120000, 300000].forEach(delay => setTimeout(() => syncFromTelnyx(), delay)); });
            setTimeout(() => doRetries(), 3000);
          }
          return updated;
        });
      }
    });
    return () => { unsubscribe(); if (pollRef.current) clearInterval(pollRef.current); };
  }, [id, subscribe, fetchCall, syncFromTelnyx]);

  useEffect(() => {
    if (call && (call.status === 'completed' || call.status === 'voicemail' || call.status === 'failed')) { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } }
  }, [call?.status]);

  async function handleSetOutcome(outcome) {
    setSavingOutcome(true);
    try { const res = await apiFetch(`/api/calls/${id}/outcome`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome }) }); if (res.ok) { const data = await res.json(); setCall(prev => ({ ...prev, outcome, ...data })); setShowOutcomeSelector(false); } }
    catch (err) { console.error('Error:', err); } finally { setSavingOutcome(false); }
  }

  function formatDuration(seconds) { if (!seconds) return 'N/A'; const m = Math.floor(seconds / 60); const s = Math.round(seconds % 60); return m === 0 ? `${s}s` : `${m}m ${s}s`; }
  function formatDateTime(ds) { if (!ds) return 'N/A'; return new Date(ds).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }); }

  function formatTranscript(transcript) {
    if (!transcript) return null;
    const lines = transcript.split('\n').filter(l => l.trim());
    if (lines.length <= 1 && !transcript.includes(':')) return <p style={{ color: '#4b5563', whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
      <Helmet>
        <title>Call Details - OutReach AI</title>
        <meta name="description" content="Review call recording, transcript, and AI conversation details." />
      </Helmet>{transcript}</p>;
    return lines.map((line, i) => {
      const ci = line.indexOf(':');
      if (ci > 0 && ci < 30) {
        const speaker = line.substring(0, ci).trim();
        const text = line.substring(ci + 1).trim();
        const isAI = speaker.toLowerCase().includes('ai') || speaker.toLowerCase().includes('assistant') || speaker.toLowerCase().includes('bot');
        return (
          <div key={i} style={{ marginBottom: '8px', padding: '10px 12px', borderRadius: '10px', background: isAI ? '#eef2ff' : '#f9fafb', borderLeft: `3px solid ${isAI ? '#4f46e5' : '#d97706'}` }}>
            <span style={{ fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', color: isAI ? '#4f46e5' : '#d97706', letterSpacing: '0.05em' }}>{speaker}</span>
            <p style={{ color: '#111827', marginTop: '4px', lineHeight: '1.6', fontSize: '14px' }}>{text}</p>
          </div>
        );
      }
      return <p key={i} style={{ color: '#4b5563', marginBottom: '6px', lineHeight: '1.6', fontSize: '14px' }}>{line}</p>;
    });
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}><div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>;
  if (!call) return <div style={{ color: '#4b5563' }}>Call not found</div>;

  const outcomeInfo = call.outcome ? (outcomeConfig[call.outcome] || { ...defaultOutcome, label: call.outcome.replace(/_/g, ' ') }) : null;
  const isActive = call.status === 'ringing' || call.status === 'in_progress' || call.status === 'queued';
  const hasCallData = call.recording_url || call.transcript || call.summary;
  const isLoadingData = syncing || (!autoSynced && !hasCallData && !isActive);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/calls" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '13px', color: '#4b5563', textDecoration: 'none', marginBottom: '14px', gap: '4px' }}>
          <ArrowLeft style={{ width: '14px', height: '14px' }} /> Back to Calls
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isActive ? '#fffbeb' : call.status === 'completed' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${isActive ? '#fde68a' : call.status === 'completed' ? '#a7f3d0' : '#fecaca'}`
          }}>
            <Phone style={{ width: '24px', height: '24px', color: isActive ? '#d97706' : call.status === 'completed' ? '#059669' : '#dc2626' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>{call.first_name} {call.last_name}</h1>
            <p style={{ color: '#4b5563', marginTop: '2px', fontSize: '14px' }}>{call.phone}</p>
          </div>
          <span className={`status-badge status-${call.status}`} style={{ fontSize: '13px', padding: '6px 14px' }}>
            {isActive && <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d97706', marginRight: '6px', animation: 'pulse 1.5s infinite' }} />}
            {call.status?.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isLoadingData && (
            <div style={{ ...cardStyle, padding: '48px', textAlign: 'center' }}>
              <Loader style={{ width: '32px', height: '32px', color: '#4f46e5', margin: '0 auto 14px', animation: 'spin 1.5s linear infinite' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>Loading Call Data...</h3>
              <p style={{ color: '#4b5563', fontSize: '13px' }}>Fetching from Telnyx</p>
            </div>
          )}

          {!isLoadingData && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '700', color: '#111827' }}>
                  <Activity style={{ width: '16px', height: '16px', color: '#4f46e5' }} /> Call Outcome
                </h2>
                {!showOutcomeSelector && (
                  <button onClick={() => setShowOutcomeSelector(true)} style={{ fontSize: '12px', color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}>{call.outcome ? 'Change' : 'Set Outcome'}</button>
                )}
              </div>
              {outcomeInfo ? (
                <div style={{ padding: '16px', backgroundColor: outcomeInfo.bg, borderRadius: '10px', border: `1px solid ${outcomeInfo.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <outcomeInfo.icon style={{ width: '22px', height: '22px', color: outcomeInfo.color }} />
                  <div>
                    <p style={{ fontWeight: '700', color: outcomeInfo.color, fontSize: '16px' }}>{outcomeInfo.label}</p>
                    {call.ended_at && <p style={{ fontSize: '12px', color: outcomeInfo.color, opacity: 0.7, marginTop: '2px' }}>Ended: {formatDateTime(call.ended_at)}</p>}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '10px', border: '1px dashed #e5e7eb' }}>
                  <p style={{ color: '#4b5563', textAlign: 'center', fontSize: '14px' }}>{isActive ? 'Call in progress...' : 'No outcome recorded.'}</p>
                </div>
              )}
              {showOutcomeSelector && (
                <div style={{ marginTop: '12px', padding: '14px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '10px' }}>Select Outcome:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {Object.entries(outcomeConfig).map(([key, cfg]) => (
                      <button key={key} onClick={() => handleSetOutcome(key)} disabled={savingOutcome}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', backgroundColor: call.outcome === key ? cfg.bg : '#ffffff', border: `1px solid ${call.outcome === key ? cfg.border : '#e5e7eb'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                        <cfg.icon style={{ width: '14px', height: '14px', color: cfg.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', fontWeight: '600', color: cfg.color }}>{cfg.label}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowOutcomeSelector(false)} style={{ marginTop: '8px', fontSize: '12px', color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                </div>
              )}
            </div>
          )}

          {/* Appointment Info - prominent display when scheduled */}
          {call.outcome === 'appointment_scheduled' && (
            <div style={{
              ...cardStyle,
              background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)',
              border: '2px solid #059669',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(5,150,105,0.08)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar style={{ width: '22px', height: '22px', color: '#ffffff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#059669', margin: 0 }}>Meeting Scheduled!</h2>
                  <p style={{ fontSize: '12px', color: '#065f46', margin: 0 }}>15-minute consultation with Kenny</p>
                </div>
              </div>
              <div style={{ background: '#ffffff', borderRadius: '10px', padding: '16px', border: '1px solid #a7f3d0' }}>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  {call.appointment_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar style={{ width: '16px', height: '16px', color: '#059669' }} />
                      <div>
                        <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>DATE & TIME</p>
                        <p style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>{call.appointment_at}</p>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User style={{ width: '16px', height: '16px', color: '#059669' }} />
                    <div>
                      <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>CONTACT</p>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>{call.first_name} {call.last_name}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone style={{ width: '16px', height: '16px', color: '#059669' }} />
                    <div>
                      <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: '500' }}>PHONE</p>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>{call.phone}</p>
                    </div>
                  </div>
                </div>
                {call.property_address && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Property:</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{call.property_address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Callback Info */}
          {call.outcome === 'callback_requested' && (
            <div style={{
              ...cardStyle,
              background: '#fffbeb',
              border: '2px solid #d97706'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#d97706', margin: 0 }}>Callback Requested</h2>
                  {call.callback_preferred_at && <p style={{ fontSize: '13px', color: '#92400e', margin: 0, fontWeight: '600' }}>Preferred: {call.callback_preferred_at}</p>}
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#78350f' }}>{call.first_name} {call.last_name} wants to be called back. {call.summary}</p>
            </div>
          )}

          {call.summary && (
            <div style={cardStyle}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '14px' }}>
                <FileText style={{ width: '16px', height: '16px', color: '#d97706' }} /> AI Summary
              </h2>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px' }}>
                <p style={{ color: '#111827', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '14px' }}>{call.summary}</p>
              </div>
            </div>
          )}

          {/* Always show transcript section for completed calls */}
          {(call.transcript || (!isActive && (call.status === 'completed' || call.status === 'voicemail'))) && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '700', color: '#111827' }}>
                  <MessageSquare style={{ width: '16px', height: '16px', color: '#7c3aed' }} /> Transcript
                </h2>
                <button onClick={syncFromTelnyx} disabled={syncing}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'none', color: '#4f46e5', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: syncing ? 'default' : 'pointer', fontSize: '11px', fontWeight: '600', opacity: syncing ? 0.6 : 1 }}>
                  <RefreshCw style={{ width: '12px', height: '12px', animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                  {syncing ? 'Syncing...' : 'Refresh'}
                </button>
              </div>
              {call.transcript ? (
                <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '14px', maxHeight: '500px', overflowY: 'auto', border: '1px solid #e5e7eb' }}>
                  {formatTranscript(call.transcript)}
                </div>
              ) : (
                <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '14px', border: '1px solid #e5e7eb' }}>
                  {/* Skeleton loading transcript bubbles */}
                  {[
                    { isAI: true, w1: '30%', w2: '80%' },
                    { isAI: false, w1: '40%', w2: '55%' },
                    { isAI: true, w1: '25%', w2: '70%' },
                    { isAI: false, w1: '35%', w2: '45%' },
                    { isAI: true, w1: '30%', w2: '90%' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      marginBottom: '8px', padding: '10px 12px', borderRadius: '10px',
                      background: s.isAI ? '#eef2ff' : '#f9fafb',
                      borderLeft: `3px solid ${s.isAI ? '#c7d2fe' : '#fde68a'}`,
                      animation: 'pulse 1.5s ease-in-out infinite',
                      animationDelay: `${i * 0.15}s`
                    }}>
                      <div style={{ height: '10px', width: s.w1, borderRadius: '4px', background: s.isAI ? '#c7d2fe' : '#fde68a', marginBottom: '8px', opacity: 0.6 }} />
                      <div style={{ height: '12px', width: s.w2, borderRadius: '4px', background: s.isAI ? '#ddd6fe' : '#fef3c7', opacity: 0.5 }} />
                    </div>
                  ))}
                  <div style={{ textAlign: 'center', marginTop: '14px' }}>
                    <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '10px' }}>Loading transcript...</p>
                    <button onClick={syncFromTelnyx} disabled={syncing}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: syncing ? 'default' : 'pointer', fontSize: '12px', fontWeight: '600', opacity: syncing ? 0.7 : 1 }}>
                      <RefreshCw style={{ width: '12px', height: '12px', animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                      {syncing ? 'Fetching...' : 'Fetch Transcript'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isLoadingData && !hasCallData && !isActive && (
            <div style={{ ...cardStyle, padding: '40px', textAlign: 'center' }}>
              <PhoneOff style={{ width: '40px', height: '40px', color: '#9ca3af', margin: '0 auto 14px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>No Call Data</h3>
              <p style={{ color: '#4b5563', maxWidth: '400px', margin: '0 auto 10px', lineHeight: '1.5', fontSize: '13px' }}>No transcript, recording, or summary found. Set up webhooks (ngrok) for local dev.</p>
              {lastSyncDebug?.length > 0 && (
                <div style={{ maxWidth: '400px', margin: '0 auto 14px', padding: '10px 12px', background: '#f9fafb', borderRadius: '8px', textAlign: 'left', fontSize: '12px', color: '#4b5563', border: '1px solid #e5e7eb' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: '#9ca3af' }}>Last sync:</strong>
                  {lastSyncDebug.map((msg, i) => <div key={i} style={{ marginBottom: i < lastSyncDebug.length - 1 ? '3px' : 0 }}>{msg}</div>)}
                </div>
              )}
              <button onClick={syncFromTelnyx} disabled={syncing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '10px', cursor: syncing ? 'default' : 'pointer', fontSize: '13px', fontWeight: '600', opacity: syncing ? 0.7 : 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <RefreshCw style={{ width: '14px', height: '14px', animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                {syncing ? 'Syncing...' : 'Sync from Telnyx'}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '14px' }}>Contact</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { icon: User, label: 'Name', value: `${call.first_name} ${call.last_name}` },
                { icon: Phone, label: 'Phone', value: call.phone },
                ...(call.email ? [{ icon: Mail, label: 'Email', value: call.email }] : [])
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <Icon style={{ width: '16px', height: '16px', color: '#9ca3af', marginTop: '2px' }} />
                  <div><p style={{ fontSize: '11px', color: '#9ca3af' }}>{label}</p><p style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{value}</p></div>
                </div>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '14px' }}>Call Info</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { icon: Calendar, label: 'Started', value: formatDateTime(call.started_at || call.created_at) },
                { icon: Clock, label: 'Duration', value: formatDuration(call.duration_seconds) },
                ...(isAdmin && call.estimated_cost ? [{ icon: DollarSign, label: 'Call Cost', value: `$${parseFloat(call.estimated_cost).toFixed(4)}`, highlight: true }] : []),
                ...(call.ended_at ? [{ icon: PhoneOff, label: 'Ended', value: formatDateTime(call.ended_at) }] : []),
                ...(call.telnyx_call_id ? [{ icon: Activity, label: 'Telnyx ID', value: call.telnyx_call_id, mono: true }] : [])
              ].map(({ icon: Icon, label, value, mono, highlight }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <Icon style={{ width: '16px', height: '16px', color: highlight ? '#059669' : '#9ca3af', marginTop: '2px' }} />
                  <div><p style={{ fontSize: '11px', color: highlight ? '#059669' : '#9ca3af' }}>{label}</p><p style={{ fontWeight: '700', color: highlight ? '#059669' : '#111827', fontSize: mono ? '11px' : '14px', wordBreak: mono ? 'break-all' : 'normal', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</p></div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: '#eef2ff',
            borderRadius: '12px', padding: '22px',
            border: '1px solid #c7d2fe',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '10px' }}>Campaign</h2>
            <p style={{ fontWeight: '700', fontSize: '16px', color: '#111827' }}>{call.campaign_name}</p>
            <p style={{ color: '#4b5563', marginTop: '3px', textTransform: 'capitalize', fontSize: '13px' }}>{call.campaign_type?.replace(/_/g, ' ')}</p>
            <Link to={`/campaigns/${call.campaign_id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '14px', color: '#4f46e5', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
              View Campaign <ArrowLeft style={{ width: '14px', height: '14px', transform: 'rotate(180deg)' }} />
            </Link>
          </div>

          {/* Recording Section - under Campaign */}
          {call.recording_url && (
            <div style={{
              background: 'linear-gradient(135deg, #faf5ff, #f5f3ff)',
              borderRadius: '12px', padding: '22px',
              border: '1px solid #ddd6fe',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mic style={{ width: '16px', height: '16px', color: '#ffffff' }} />
                </div>
                <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>Recording</h2>
              </div>
              <div style={{ background: '#ffffff', borderRadius: '10px', padding: '12px', border: '1px solid #e5e7eb' }}>
                <audio controls style={{ width: '100%', height: '36px' }} src={call.recording_url}>
                  Your browser does not support audio.
                </audio>
              </div>
              <a
                href={call.recording_url}
                download={`call-${call.first_name}-${call.last_name}-${(call.started_at || call.created_at || '').slice(0, 10)}.mp3`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  marginTop: '12px', padding: '8px 16px',
                  background: '#7c3aed', color: '#ffffff',
                  borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                  textDecoration: 'none', cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
                onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}
              >
                <Download style={{ width: '14px', height: '14px' }} />
                Download MP3
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
