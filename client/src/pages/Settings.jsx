import { useState, useEffect } from 'react';
import { Phone, CheckCircle, XCircle, RefreshCw, AlertCircle, Sparkles, Settings as SettingsIcon, CreditCard, ShieldOff, UserPlus } from 'lucide-react';

export default function Settings() {
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [dncList, setDncList] = useState([]);
  const [dncPhone, setDncPhone] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    await Promise.all([
      testConnection(),
      fetchPhoneNumbers(),
      fetchAssistants(),
      fetchDnc()
    ]);
    setLoading(false);
  }

  async function fetchDnc() {
    try {
      const res = await fetch('/api/dnc');
      const data = await res.json();
      setDncList(data || []);
    } catch (err) {
      setDncList([]);
    }
  }

  async function addToDnc(e) {
    e.preventDefault();
    if (!dncPhone.trim()) return;
    try {
      await fetch('/api/dnc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: dncPhone.trim() }) });
      setDncPhone('');
      fetchDnc();
    } catch (err) {
      console.error(err);
    }
  }

  async function removeFromDnc(phone) {
    try {
      await fetch(`/api/dnc/${encodeURIComponent(phone)}`, { method: 'DELETE' });
      fetchDnc();
    } catch (err) {
      console.error(err);
    }
  }

  async function testConnection() {
    try {
      const res = await fetch('/api/campaigns/test-connection');
      const data = await res.json();
      setConnectionStatus(data);
      if (data.balance) {
        setBalance(data.balance);
      }
    } catch (err) {
      setConnectionStatus({ success: false, error: err.message });
    }
  }

  async function fetchPhoneNumbers() {
    try {
      const res = await fetch('/api/campaigns/phone-numbers');
      const data = await res.json();
      setPhoneNumbers(data || []);
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
    }
  }

  async function fetchAssistants() {
    try {
      const res = await fetch('/api/campaigns/assistants');
      const data = await res.json();
      setAssistants(data.data || []);
    } catch (err) {
      console.error('Error fetching assistants:', err);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px',
    marginBottom: '24px'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  };

  const iconWrapStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <RefreshCw style={{ width: '32px', height: '32px', color: '#deb040', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: '#8c735e' }}>Loading Telnyx settings...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>
            Telnyx Settings
          </h1>
          <p style={{ color: '#8c735e', marginTop: '4px' }}>Manage your Telnyx configuration without leaving the app</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            backgroundColor: '#1e2a45',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            opacity: refreshing ? 0.7 : 1
          }}
        >
          <RefreshCw style={{ width: '16px', height: '16px', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>

      {/* Connection Status */}
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, backgroundColor: connectionStatus?.success ? '#dcfce7' : '#fee2e2' }}>
            {connectionStatus?.success ? (
              <CheckCircle style={{ width: '20px', height: '20px', color: '#16a34a' }} />
            ) : (
              <XCircle style={{ width: '20px', height: '20px', color: '#dc2626' }} />
            )}
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#151c30' }}>API Connection Status</h2>
            <p style={{ fontSize: '14px', color: connectionStatus?.success ? '#16a34a' : '#dc2626' }}>
              {connectionStatus?.success ? 'Connected to Telnyx API' : 'Connection Failed'}
            </p>
          </div>
        </div>
        
        {connectionStatus?.success && balance && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
            <CreditCard style={{ width: '18px', height: '18px', color: '#16a34a' }} />
            <span style={{ color: '#166534', fontWeight: '500' }}>Account Balance: ${parseFloat(balance).toFixed(2)}</span>
          </div>
        )}

        {connectionStatus?.error && (
          <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#b91c1c' }}>
            <strong>Error:</strong> {connectionStatus.error}
          </div>
        )}
      </div>

      {/* Phone Numbers */}
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, backgroundColor: '#dbeafe' }}>
            <Phone style={{ width: '20px', height: '20px', color: '#2563eb' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#151c30' }}>Phone Numbers</h2>
            <p style={{ fontSize: '14px', color: '#8c735e' }}>
              {phoneNumbers.length} active number{phoneNumbers.length !== 1 ? 's' : ''} on your Telnyx account
            </p>
          </div>
        </div>

        {phoneNumbers.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f7f6f4', borderRadius: '8px' }}>
            <AlertCircle style={{ width: '32px', height: '32px', color: '#deb040', margin: '0 auto' }} />
            <p style={{ marginTop: '12px', color: '#8c735e' }}>No phone numbers found on your Telnyx account.</p>
            <a 
              href="https://portal.telnyx.com/#/app/numbers/search" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#2563eb', textDecoration: 'underline', fontSize: '14px' }}
            >
              Purchase a phone number on Telnyx →
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {phoneNumbers.map((phone) => (
              <div 
                key={phone.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: '#f7f6f4',
                  borderRadius: '8px',
                  border: '1px solid #edeae5'
                }}
              >
                <div>
                  <p style={{ fontWeight: '600', color: '#151c30', fontSize: '16px', fontFamily: 'monospace' }}>
                    {phone.phone_number}
                  </p>
                  <p style={{ fontSize: '13px', color: '#8c735e', marginTop: '4px' }}>
                    {phone.connection_name || 'No connection assigned'} • {phone.status}
                  </p>
                </div>
                <div style={{ 
                  padding: '4px 12px', 
                  backgroundColor: phone.status === 'active' ? '#dcfce7' : '#fee2e2',
                  color: phone.status === 'active' ? '#166534' : '#b91c1c',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {phone.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Assistants */}
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, backgroundColor: '#fbf7e8' }}>
            <Sparkles style={{ width: '20px', height: '20px', color: '#deb040' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#151c30' }}>AI Assistants</h2>
            <p style={{ fontSize: '14px', color: '#8c735e' }}>
              {assistants.length} assistant{assistants.length !== 1 ? 's' : ''} configured on Telnyx
            </p>
          </div>
        </div>

        {assistants.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f7f6f4', borderRadius: '8px' }}>
            <Sparkles style={{ width: '32px', height: '32px', color: '#deb040', margin: '0 auto' }} />
            <p style={{ marginTop: '12px', color: '#8c735e' }}>
              No AI assistants yet. Create a campaign to automatically create an assistant.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {assistants.map((assistant) => (
              <div 
                key={assistant.id} 
                style={{ 
                  padding: '16px',
                  backgroundColor: '#f7f6f4',
                  borderRadius: '8px',
                  border: '1px solid #edeae5'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: '600', color: '#151c30', fontSize: '15px' }}>
                      {assistant.name}
                    </p>
                    <p style={{ fontSize: '12px', color: '#8c735e', marginTop: '4px', fontFamily: 'monospace' }}>
                      ID: {assistant.id}
                    </p>
                  </div>
                </div>
                
                {assistant.voice_settings && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      backgroundColor: '#e0e7ff', 
                      color: '#3730a3',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}>
                      Voice: {assistant.voice_settings.voice?.split('.').pop() || 'default'}
                    </span>
                    {assistant.model && (
                      <span style={{ 
                        padding: '4px 10px', 
                        backgroundColor: '#fef3c7', 
                        color: '#92400e',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}>
                        Model: {assistant.model.split('/').pop()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhook Setup Guide */}
      <div style={{ ...cardStyle, border: '2px solid #deb040', backgroundColor: '#fefce8' }}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, backgroundColor: '#fef3c7' }}>
            <AlertCircle style={{ width: '20px', height: '20px', color: '#d97706' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#151c30' }}>Webhook Setup (Required for Call Data)</h2>
            <p style={{ fontSize: '14px', color: '#92400e' }}>Transcripts, recordings, and outcomes come from Telnyx webhooks. Set this up for local development.</p>
          </div>
        </div>
        <ol style={{ paddingLeft: '20px', margin: '0 0 16px', lineHeight: '1.8', color: '#78350f' }}>
          <li>Download <a href="https://ngrok.com/download" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>ngrok</a> and run: <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>ngrok http 3001</code></li>
          <li>Copy the HTTPS URL (e.g. <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>https://abc123.ngrok.io</code>)</li>
          <li>In Telnyx Portal → Messaging → TeXML Apps → your app, set Webhook URL to: <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>https://YOUR-URL/api/webhooks/telnyx</code></li>
          <li>Restart ngrok when the URL changes (free tier)</li>
        </ol>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/webhooks/test');
                const data = await res.json();
                alert(data.success ? '✓ Webhook URL is reachable!' : '✗ ' + (data.message || 'Unknown error'));
              } catch (e) {
                alert('✗ Could not reach server. Is it running on port 3001?');
              }
            }}
            style={{ padding: '8px 16px', backgroundColor: '#1e2a45', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
          >
            Test Webhook Reachability
          </button>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Tests if your server can receive webhooks</span>
        </div>
      </div>

      {/* Do-Not-Call List */}
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, backgroundColor: '#fee2e2' }}>
            <ShieldOff style={{ width: '20px', height: '20px', color: '#dc2626' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#151c30' }}>Do-Not-Call List</h2>
            <p style={{ fontSize: '14px', color: '#8c735e' }}>{dncList.length} number{dncList.length !== 1 ? 's' : ''} — these are skipped when starting campaigns</p>
          </div>
        </div>
        <form onSubmit={addToDnc} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="+1 555-123-4567"
            value={dncPhone}
            onChange={(e) => setDncPhone(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', border: '1px solid #dbd5ca', borderRadius: '8px' }}
          />
          <button type="submit" style={{ padding: '10px 18px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>Add</button>
        </form>
        {dncList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {dncList.map((row) => (
              <div key={row.phone} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#f7f6f4', borderRadius: '8px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>{row.phone}</span>
                <button onClick={() => removeFromDnc(row.phone)} style={{ padding: '4px 10px', backgroundColor: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Remove</button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#99826a', fontSize: '14px' }}>No numbers on the list. Add numbers that requested no contact.</p>
        )}
      </div>

      {/* Quick Info */}
      <div style={{ ...cardStyle, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, backgroundColor: '#dbeafe' }}>
            <SettingsIcon style={{ width: '20px', height: '20px', color: '#2563eb' }} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e3a8a' }}>Auto-Configured Settings</h2>
        </div>
        <p style={{ color: '#1e40af', marginBottom: '12px', fontSize: '14px' }}>
          These settings are automatically applied to all new campaigns:
        </p>
        <ul style={{ color: '#1e40af', paddingLeft: '20px', margin: 0, fontSize: '14px', lineHeight: '1.8' }}>
          <li><strong>Voice Provider:</strong> Telnyx NaturalHD (highest quality)</li>
          <li><strong>AI Model:</strong> Qwen/Qwen3-235B-A22B (advanced reasoning)</li>
          <li><strong>Transcription:</strong> Deepgram Flux (real-time accuracy)</li>
          <li><strong>Noise Suppression:</strong> DeepFilterNet (background noise removal)</li>
          <li><strong>Interruption Handling:</strong> Enabled with 0.4s wait</li>
        </ul>
      </div>
    </div>
  );
}
