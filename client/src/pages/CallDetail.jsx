import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Phone, 
  User, 
  Calendar, 
  Clock,
  Mail,
  Volume2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  PhoneOff,
  Voicemail,
  MessageSquare,
  FileText,
  Activity,
  Loader
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

const outcomeConfig = {
  appointment_scheduled: { label: 'Appointment Scheduled', color: '#059669', bg: '#d1fae5', icon: CheckCircle },
  not_interested: { label: 'Not Interested', color: '#dc2626', bg: '#fee2e2', icon: XCircle },
  callback_requested: { label: 'Callback Requested', color: '#2563eb', bg: '#dbeafe', icon: Phone },
  voicemail: { label: 'Voicemail', color: '#d97706', bg: '#fef3c7', icon: Voicemail },
  no_answer: { label: 'No Answer', color: '#6b7280', bg: '#f3f4f6', icon: PhoneOff },
  busy: { label: 'Busy', color: '#9333ea', bg: '#f3e8ff', icon: AlertCircle },
  completed: { label: 'Completed', color: '#059669', bg: '#d1fae5', icon: CheckCircle },
  interested: { label: 'Interested', color: '#059669', bg: '#d1fae5', icon: CheckCircle },
  wrong_number: { label: 'Wrong Number', color: '#dc2626', bg: '#fee2e2', icon: XCircle },
  do_not_call: { label: 'Do Not Call', color: '#dc2626', bg: '#fee2e2', icon: XCircle },
};

const defaultOutcome = { label: 'Unknown', color: '#6b7280', bg: '#f3f4f6', icon: AlertCircle };

export default function CallDetail() {
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
    try {
      const res = await fetch(`/api/calls/${id}`);
      const data = await res.json();
      setCall(data);
      return data;
    } catch (err) {
      console.error('Error fetching call:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  const syncFromTelnyx = useCallback(async () => {
    setSyncing(true);
    setLastSyncDebug(null);
    try {
      const res = await fetch(`/api/calls/${id}/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.call) {
        setCall(prev => ({ ...prev, ...data.call }));
      }
      setAutoSynced(true);
      setLastSyncDebug(data.debug || (data.message ? [data.message] : null));
      return data;
    } catch (err) {
      console.error('Sync error:', err);
      setAutoSynced(true);
      setLastSyncDebug(['Sync failed: ' + err.message]);
      return null;
    } finally {
      setSyncing(false);
    }
  }, [id]);

  // On mount: fetch call, then auto-sync if call is done and missing data
  useEffect(() => {
    fetchCall().then(data => {
      if (!data) return;
      const isActive = data.status === 'ringing' || data.status === 'in_progress' || data.status === 'queued';
      const missingData = !data.transcript && !data.summary && !data.outcome;

      if (isActive) {
        // Poll while call is active
        pollRef.current = setInterval(async () => {
          const res = await fetch(`/api/calls/${id}/sync`, { method: 'POST' });
          const syncData = await res.json();
          if (syncData.call) {
            setCall(prev => ({ ...prev, ...syncData.call }));
          }
        }, 5000);
      } else if (missingData && !hasSyncedRef.current) {
        // Call is done but missing data — auto-sync, then retry at 1, 3, 5 min if still missing
        hasSyncedRef.current = true;
        syncFromTelnyx().then(syncData => {
          const stillMissing = syncData && !syncData.call?.transcript && !syncData.call?.summary && !syncData.call?.recording_url;
          if (stillMissing) {
            [60000, 180000, 300000].forEach((delay, i) => {
              setTimeout(() => syncFromTelnyx(), delay);
            });
          }
        });
      } else {
        setAutoSynced(true);
      }
    });

    const unsubscribe = subscribe((message) => {
      if (message.type === 'call_update' && message.call.id === id) {
        setCall(prev => {
          const updated = { ...prev, ...message.call };
          // If call just completed, auto-sync after a short delay
          if (prev?.status !== 'completed' && updated.status === 'completed' && !hasSyncedRef.current) {
            hasSyncedRef.current = true;
            const doRetries = () => syncFromTelnyx().then(d => {
              const stillMissing = d && !d.call?.transcript && !d.call?.summary && !d.call?.recording_url;
              if (stillMissing) [60000, 180000, 300000].forEach(delay => setTimeout(() => syncFromTelnyx(), delay));
            });
            setTimeout(() => doRetries(), 3000);
          }
          return updated;
        });
      }
    });

    return () => {
      unsubscribe();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id, subscribe, fetchCall, syncFromTelnyx]);

  // Stop polling when call completes
  useEffect(() => {
    if (call && (call.status === 'completed' || call.status === 'voicemail' || call.status === 'failed')) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [call?.status]);

  async function handleSetOutcome(outcome) {
    setSavingOutcome(true);
    try {
      const res = await fetch(`/api/calls/${id}/outcome`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome })
      });
      if (res.ok) {
        const data = await res.json();
        setCall(prev => ({ ...prev, outcome, ...data }));
        setShowOutcomeSelector(false);
      }
    } catch (err) {
      console.error('Error setting outcome:', err);
    } finally {
      setSavingOutcome(false);
    }
  }

  function formatDuration(seconds) {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  }

  function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  }

  function formatTranscript(transcript) {
    if (!transcript) return null;
    const lines = transcript.split('\n').filter(l => l.trim());
    if (lines.length <= 1 && !transcript.includes(':')) {
      return <p style={{ color: '#755f4e', whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>{transcript}</p>;
    }
    return lines.map((line, i) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0 && colonIdx < 30) {
        const speaker = line.substring(0, colonIdx).trim();
        const text = line.substring(colonIdx + 1).trim();
        const isAI = speaker.toLowerCase().includes('ai') || speaker.toLowerCase().includes('assistant') || speaker.toLowerCase().includes('bot');
        return (
          <div key={i} style={{ 
            marginBottom: '12px', padding: '10px 14px', borderRadius: '12px',
            backgroundColor: isAI ? '#f0f7ff' : '#f7f6f4',
            borderLeft: `3px solid ${isAI ? '#2563eb' : '#deb040'}`
          }}>
            <span style={{ fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', color: isAI ? '#2563eb' : '#deb040', letterSpacing: '0.5px' }}>
              {speaker}
            </span>
            <p style={{ color: '#1e2a45', marginTop: '4px', lineHeight: '1.6' }}>{text}</p>
          </div>
        );
      }
      return <p key={i} style={{ color: '#755f4e', marginBottom: '8px', lineHeight: '1.6' }}>{line}</p>;
    });
  }

  const statusColors = {
    ringing: { bg: '#fef3c7', color: '#d97706', label: 'Ringing' },
    queued: { bg: '#e0e7ff', color: '#4f46e5', label: 'Queued' },
    in_progress: { bg: '#dbeafe', color: '#2563eb', label: 'In Progress' },
    completed: { bg: '#d1fae5', color: '#059669', label: 'Completed' },
    voicemail: { bg: '#fef3c7', color: '#d97706', label: 'Voicemail' },
    failed: { bg: '#fee2e2', color: '#dc2626', label: 'Failed' },
    no_answer: { bg: '#f3f4f6', color: '#6b7280', label: 'No Answer' },
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ width: '32px', height: '32px', border: '4px solid #deb040', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (!call) return <div>Call not found</div>;

  const outcomeInfo = call.outcome ? (outcomeConfig[call.outcome] || { ...defaultOutcome, label: call.outcome.replace(/_/g, ' ') }) : null;
  const statusInfo = statusColors[call.status] || { bg: '#edeae5', color: '#99826a', label: call.status };
  const isActive = call.status === 'ringing' || call.status === 'in_progress' || call.status === 'queued';
  const hasCallData = call.recording_url || call.transcript || call.summary;
  const isLoadingData = syncing || (!autoSynced && !hasCallData && !isActive);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link to="/calls" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '14px', color: '#99826a', textDecoration: 'none', marginBottom: '16px' }}>
          <ArrowLeft style={{ width: '16px', height: '16px', marginRight: '4px' }} /> Back to Calls
        </Link>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: statusInfo.bg
          }}>
            <Phone style={{ width: '32px', height: '32px', color: statusInfo.color }} />
          </div>
          <div>
            <h1 style={{ fontSize: '30px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>
              {call.first_name} {call.last_name}
            </h1>
            <p style={{ color: '#8c735e', marginTop: '4px' }}>{call.phone}</p>
          </div>
          
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              padding: '8px 16px', fontSize: '14px', fontWeight: '600', borderRadius: '10px',
              backgroundColor: statusInfo.bg, color: statusInfo.color
            }}>
              {isActive && <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusInfo.color, marginRight: '6px', animation: 'pulse 1.5s infinite' }} />}
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Loading state while auto-syncing */}
          {isLoadingData && (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)', textAlign: 'center' }}>
              <Loader style={{ width: '40px', height: '40px', color: '#deb040', margin: '0 auto 16px', animation: 'spin 1.5s linear infinite' }} />
              <h3 style={{ fontSize: '18px', fontFamily: 'Playfair Display, serif', color: '#151c30', marginBottom: '8px' }}>
                Loading Call Data...
              </h3>
              <p style={{ color: '#99826a', fontSize: '14px' }}>
                Fetching transcript, outcome, and recording from Telnyx
              </p>
            </div>
          )}

          {/* Call Outcome - show once we have data or finished syncing */}
          {!isLoadingData && (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>
                  <Activity style={{ width: '20px', height: '20px', color: '#deb040' }} />
                  Call Outcome
                </h2>
                {!showOutcomeSelector && (
                  <button
                    onClick={() => setShowOutcomeSelector(true)}
                    style={{ fontSize: '13px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {call.outcome ? 'Change Outcome' : 'Set Outcome'}
                  </button>
                )}
              </div>
              
              {outcomeInfo ? (
                <div style={{ 
                  padding: '20px', backgroundColor: outcomeInfo.bg, borderRadius: '12px', 
                  border: `2px solid ${outcomeInfo.color}`, display: 'flex', alignItems: 'center', gap: '12px'
                }}>
                  <outcomeInfo.icon style={{ width: '28px', height: '28px', color: outcomeInfo.color }} />
                  <div>
                    <p style={{ fontWeight: '600', color: outcomeInfo.color, fontSize: '18px' }}>
                      {outcomeInfo.label}
                    </p>
                    {call.ended_at && (
                      <p style={{ fontSize: '13px', color: outcomeInfo.color, opacity: 0.7, marginTop: '2px' }}>
                        Ended: {formatDateTime(call.ended_at)}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', backgroundColor: '#f7f6f4', borderRadius: '12px', border: '2px dashed #d1cdc7' }}>
                  <p style={{ color: '#99826a', textAlign: 'center' }}>
                    {isActive ? 'Call is in progress...' : 'No outcome recorded. Set one manually below.'}
                  </p>
                </div>
              )}

              {showOutcomeSelector && (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f7f6f4', borderRadius: '12px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '12px' }}>Select Outcome:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {Object.entries(outcomeConfig).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => handleSetOutcome(key)}
                        disabled={savingOutcome}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
                          backgroundColor: call.outcome === key ? cfg.bg : 'white',
                          border: `1px solid ${call.outcome === key ? cfg.color : '#e5e2dd'}`,
                          borderRadius: '10px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                        }}
                      >
                        <cfg.icon style={{ width: '16px', height: '16px', color: cfg.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', fontWeight: '500', color: cfg.color }}>{cfg.label}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowOutcomeSelector(false)}
                    style={{ marginTop: '10px', fontSize: '13px', color: '#99826a', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Recording Player */}
          {call.recording_url && (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30', marginBottom: '16px' }}>
                <Volume2 style={{ width: '20px', height: '20px', color: '#deb040' }} />
                Call Recording
              </h2>
              <div style={{ background: 'linear-gradient(to right, #edeae5, #f7f6f4)', borderRadius: '12px', padding: '16px' }}>
                <audio controls style={{ width: '100%' }} src={call.recording_url}>
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          )}

          {/* AI Summary */}
          {call.summary && (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30', marginBottom: '16px' }}>
                <FileText style={{ width: '20px', height: '20px', color: '#deb040' }} />
                AI Summary
              </h2>
              <div style={{ backgroundColor: '#fbf7e8', border: '1px solid #f6ecc5', borderRadius: '12px', padding: '16px' }}>
                <p style={{ color: '#755f4e', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{call.summary}</p>
              </div>
            </div>
          )}

          {/* Transcript */}
          {call.transcript && (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30', marginBottom: '16px' }}>
                <MessageSquare style={{ width: '20px', height: '20px', color: '#deb040' }} />
                Call Transcript
              </h2>
              <div style={{ backgroundColor: '#f7f6f4', borderRadius: '12px', padding: '16px', maxHeight: '500px', overflowY: 'auto' }}>
                {formatTranscript(call.transcript)}
              </div>
            </div>
          )}

          {/* No data found after auto-sync — show retry button */}
          {!isLoadingData && !hasCallData && !isActive && (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)', textAlign: 'center' }}>
              <PhoneOff style={{ width: '48px', height: '48px', color: '#d1cdc7', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontFamily: 'Playfair Display, serif', color: '#151c30', marginBottom: '8px' }}>
                No Call Data Available
              </h3>
              <p style={{ color: '#99826a', maxWidth: '420px', margin: '0 auto 12px', lineHeight: '1.5' }}>
                No transcript, recording, or summary was found for this call.
              </p>
              <p style={{ color: '#ab9a82', maxWidth: '420px', margin: '0 auto 20px', lineHeight: '1.5', fontSize: '13px' }}>
                Call data usually arrives via Telnyx webhooks. If you are running locally, webhooks may not reach your server—use a tunnel (e.g. ngrok) with your webhook URL in the Telnyx dashboard. You can also try Sync from Telnyx or set the outcome manually above.
              </p>
              {lastSyncDebug && lastSyncDebug.length > 0 && (
                <div style={{ maxWidth: '420px', margin: '0 auto 20px', padding: '12px 16px', backgroundColor: '#f7f6f4', borderRadius: '10px', textAlign: 'left', fontSize: '13px', color: '#6b5b4a' }}>
                  <strong style={{ display: 'block', marginBottom: '6px' }}>Last sync:</strong>
                  {lastSyncDebug.map((msg, i) => (
                    <div key={i} style={{ marginBottom: i < lastSyncDebug.length - 1 ? '4px' : 0 }}>{msg}</div>
                  ))}
                </div>
              )}
              <button
                onClick={syncFromTelnyx}
                disabled={syncing}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                  backgroundColor: '#1e2a45', color: 'white', border: 'none', borderRadius: '10px',
                  cursor: syncing ? 'default' : 'pointer', fontSize: '14px', fontWeight: '500',
                  opacity: syncing ? 0.7 : 1
                }}
              >
                <RefreshCw style={{ width: '16px', height: '16px', animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                {syncing ? 'Syncing...' : 'Sync from Telnyx'}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Contact Info */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
            <h2 style={{ fontSize: '18px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30', marginBottom: '16px' }}>
              Contact Details
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <User style={{ width: '20px', height: '20px', color: '#ab9a82', marginTop: '2px' }} />
                <div>
                  <p style={{ fontSize: '14px', color: '#99826a' }}>Name</p>
                  <p style={{ fontWeight: '500', color: '#1e2a45' }}>{call.first_name} {call.last_name}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Phone style={{ width: '20px', height: '20px', color: '#ab9a82', marginTop: '2px' }} />
                <div>
                  <p style={{ fontSize: '14px', color: '#99826a' }}>Phone</p>
                  <p style={{ fontWeight: '500', color: '#1e2a45' }}>{call.phone}</p>
                </div>
              </div>
              
              {call.email && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <Mail style={{ width: '20px', height: '20px', color: '#ab9a82', marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '14px', color: '#99826a' }}>Email</p>
                    <p style={{ fontWeight: '500', color: '#1e2a45' }}>{call.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Call Info */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
            <h2 style={{ fontSize: '18px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30', marginBottom: '16px' }}>
              Call Information
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Calendar style={{ width: '20px', height: '20px', color: '#ab9a82', marginTop: '2px' }} />
                <div>
                  <p style={{ fontSize: '14px', color: '#99826a' }}>Started</p>
                  <p style={{ fontWeight: '500', color: '#1e2a45' }}>{formatDateTime(call.started_at || call.created_at)}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Clock style={{ width: '20px', height: '20px', color: '#ab9a82', marginTop: '2px' }} />
                <div>
                  <p style={{ fontSize: '14px', color: '#99826a' }}>Duration</p>
                  <p style={{ fontWeight: '500', color: '#1e2a45' }}>{formatDuration(call.duration_seconds)}</p>
                </div>
              </div>

              {call.ended_at && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <PhoneOff style={{ width: '20px', height: '20px', color: '#ab9a82', marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '14px', color: '#99826a' }}>Ended</p>
                    <p style={{ fontWeight: '500', color: '#1e2a45' }}>{formatDateTime(call.ended_at)}</p>
                  </div>
                </div>
              )}

              {call.telnyx_call_id && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <Activity style={{ width: '20px', height: '20px', color: '#ab9a82', marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '14px', color: '#99826a' }}>Telnyx Call ID</p>
                    <p style={{ fontWeight: '500', color: '#1e2a45', fontSize: '12px', wordBreak: 'break-all' }}>{call.telnyx_call_id}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Campaign Info */}
          <div style={{ background: 'linear-gradient(to bottom right, #1e2a45, #151c30)', borderRadius: '16px', padding: '24px', color: 'white' }}>
            <h2 style={{ fontSize: '18px', fontFamily: 'Playfair Display, serif', fontWeight: '600', marginBottom: '16px' }}>
              Campaign
            </h2>
            <p style={{ fontWeight: '500', fontSize: '18px' }}>{call.campaign_name}</p>
            <p style={{ color: '#a3b4d5', marginTop: '4px', textTransform: 'capitalize' }}>{call.campaign_type?.replace(/_/g, ' ')}</p>
            <Link 
              to={`/campaigns/${call.campaign_id}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '16px', color: '#e7c663', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}
            >
              View Campaign <ArrowLeft style={{ width: '16px', height: '16px', transform: 'rotate(180deg)' }} />
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
