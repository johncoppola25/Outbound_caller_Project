import { useState, useEffect } from 'react';
import { Phone, CheckCircle, XCircle, RefreshCw, AlertCircle, Sparkles, Settings as SettingsIcon, CreditCard, ShieldOff } from 'lucide-react';
import { apiFetch } from '../utils/api';

export default function Settings() {
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [dncList, setDncList] = useState([]);
  const [dncPhone, setDncPhone] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadAllData(); }, []);

  async function loadAllData() {
    setLoading(true);
    await Promise.all([testConnection(), fetchPhoneNumbers(), fetchAssistants(), fetchDnc()]);
    setLoading(false);
  }

  async function fetchDnc() {
    try { const res = await apiFetch('/api/dnc'); const data = await res.json(); setDncList(data || []); } catch { setDncList([]); }
  }

  async function addToDnc(e) {
    e.preventDefault();
    if (!dncPhone.trim()) return;
    try { await apiFetch('/api/dnc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: dncPhone.trim() }) }); setDncPhone(''); fetchDnc(); } catch (err) { console.error(err); }
  }

  async function removeFromDnc(phone) {
    try { await apiFetch(`/api/dnc/${encodeURIComponent(phone)}`, { method: 'DELETE' }); fetchDnc(); } catch (err) { console.error(err); }
  }

  async function testConnection() {
    try { const res = await apiFetch('/api/campaigns/test-connection'); const data = await res.json(); setConnectionStatus(data); if (data.balance) setBalance(data.balance); } catch (err) { setConnectionStatus({ success: false, error: err.message }); }
  }

  async function fetchPhoneNumbers() {
    try { const res = await apiFetch('/api/campaigns/phone-numbers'); const data = await res.json(); setPhoneNumbers(data || []); } catch (err) { console.error('Error fetching phone numbers:', err); }
  }

  async function fetchAssistants() {
    try { const res = await apiFetch('/api/campaigns/assistants'); const data = await res.json(); setAssistants(data.data || []); } catch (err) { console.error('Error fetching assistants:', err); }
  }

  async function handleRefresh() { setRefreshing(true); await loadAllData(); setRefreshing(false); }

  const cardStyle = {
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    padding: '22px',
    marginBottom: '16px'
  };

  const headerStyle = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' };

  const iconWrapStyle = {
    width: '38px', height: '38px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', background: '#f3f4f6', minHeight: '100vh' }}>
        <RefreshCw style={{ width: '32px', height: '32px', color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: '#4b5563' }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.03em' }}>Settings</h1>
          <p style={{ color: '#4b5563', marginTop: '4px', fontSize: '14px' }}>Manage your Telnyx configuration</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px', background: '#ffffff',
            border: '1px solid #e5e7eb',
            color: '#4b5563', borderRadius: '10px', cursor: refreshing ? 'not-allowed' : 'pointer',
            opacity: refreshing ? 0.6 : 1, fontSize: '13px', fontWeight: '500',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <RefreshCw style={{ width: '15px', height: '15px', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Connection Status */}
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, background: connectionStatus?.success ? '#ecfdf5' : '#fef2f2', border: `1px solid ${connectionStatus?.success ? '#a7f3d0' : '#fecaca'}` }}>
            {connectionStatus?.success ? <CheckCircle style={{ width: '18px', height: '18px', color: '#059669' }} /> : <XCircle style={{ width: '18px', height: '18px', color: '#dc2626' }} />}
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>API Connection</h2>
            <p style={{ fontSize: '13px', color: connectionStatus?.success ? '#059669' : '#dc2626' }}>
              {connectionStatus?.success ? 'Connected to Telnyx API' : 'Connection Failed'}
            </p>
          </div>
        </div>
        {connectionStatus?.success && balance && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px' }}>
            <CreditCard style={{ width: '16px', height: '16px', color: '#059669' }} />
            <span style={{ color: '#059669', fontWeight: '600', fontSize: '14px' }}>Balance: ${parseFloat(balance).toFixed(2)}</span>
          </div>
        )}
        {connectionStatus?.error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626', fontSize: '13px' }}>
            <strong>Error:</strong> {connectionStatus.error}
          </div>
        )}
      </div>

      {/* Phone Numbers */}
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, background: '#eef2ff', border: '1px solid #c7d2fe' }}>
            <Phone style={{ width: '18px', height: '18px', color: '#4f46e5' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>Phone Numbers</h2>
            <p style={{ fontSize: '13px', color: '#4b5563' }}>{phoneNumbers.length} active number{phoneNumbers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {phoneNumbers.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
            <AlertCircle style={{ width: '28px', height: '28px', color: '#9ca3af', margin: '0 auto 8px' }} />
            <p style={{ color: '#4b5563', fontSize: '13px' }}>No phone numbers found.</p>
            <a href="https://portal.telnyx.com/#/app/numbers/search" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', fontSize: '13px' }}>
              Purchase on Telnyx
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {phoneNumbers.map((phone) => (
              <div key={phone.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                <div>
                  <p style={{ fontWeight: '600', color: '#111827', fontSize: '14px', fontFamily: 'monospace' }}>{phone.phone_number}</p>
                  <p style={{ fontSize: '12px', color: '#4b5563', marginTop: '3px' }}>{phone.connection_name || 'No connection'} | {phone.status}</p>
                </div>
                <span className={`status-badge status-${phone.status === 'active' ? 'completed' : 'failed'}`}>{phone.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Assistants */}
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, background: '#fffbeb', border: '1px solid #fde68a' }}>
            <Sparkles style={{ width: '18px', height: '18px', color: '#d97706' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>AI Assistants</h2>
            <p style={{ fontSize: '13px', color: '#4b5563' }}>{assistants.length} configured</p>
          </div>
        </div>
        {assistants.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
            <Sparkles style={{ width: '28px', height: '28px', color: '#9ca3af', margin: '0 auto 8px' }} />
            <p style={{ color: '#4b5563', fontSize: '13px' }}>No AI assistants yet. Create a campaign to auto-create one.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {assistants.map((a) => (
              <div key={a.id} style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                <p style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{a.name}</p>
                <p style={{ fontSize: '11px', color: '#4b5563', marginTop: '3px', fontFamily: 'monospace' }}>ID: {a.id}</p>
                {a.voice_settings && (
                  <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ padding: '3px 8px', background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4f46e5', borderRadius: '6px', fontSize: '11px', fontWeight: '500' }}>
                      Voice: {a.voice_settings.voice?.split('.').pop() || 'default'}
                    </span>
                    {a.model && (
                      <span style={{ padding: '3px 8px', background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', borderRadius: '6px', fontSize: '11px', fontWeight: '500' }}>
                        Model: {a.model.split('/').pop()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhook Setup */}
      <div style={{ ...cardStyle, border: '1px solid #fde68a', background: '#fffbeb' }}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, background: '#fef3c7', border: '1px solid #fde68a' }}>
            <AlertCircle style={{ width: '18px', height: '18px', color: '#d97706' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>Webhook Setup</h2>
            <p style={{ fontSize: '13px', color: '#d97706' }}>Required for call data</p>
          </div>
        </div>
        <ol style={{ paddingLeft: '20px', margin: '0 0 16px', lineHeight: '2', color: '#4b5563', fontSize: '13px' }}>
          <li>Download <a href="https://ngrok.com/download" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5' }}>ngrok</a> and run: <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', color: '#92400e' }}>ngrok http 3001</code></li>
          <li>Copy the HTTPS URL</li>
          <li>Set Webhook URL to: <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', color: '#92400e' }}>https://YOUR-URL/api/webhooks/telnyx</code></li>
          <li>Restart ngrok when the URL changes</li>
        </ol>
        <button
          onClick={async () => {
            try {
              const res = await apiFetch('/api/webhooks/test');
              const data = await res.json();
              alert(data.success ? 'Webhook URL is reachable!' : data.message || 'Unknown error');
            } catch { alert('Could not reach server'); }
          }}
          style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
        >
          Test Webhook
        </button>
      </div>

      {/* DNC List */}
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, background: '#fef2f2', border: '1px solid #fecaca' }}>
            <ShieldOff style={{ width: '18px', height: '18px', color: '#dc2626' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>Do-Not-Call List</h2>
            <p style={{ fontSize: '13px', color: '#4b5563' }}>{dncList.length} number{dncList.length !== 1 ? 's' : ''} blocked</p>
          </div>
        </div>
        <form onSubmit={addToDnc} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text" placeholder="+1 555-123-4567" value={dncPhone}
            onChange={(e) => setDncPhone(e.target.value)}
            style={{ flex: 1, padding: '9px 12px', background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '8px', color: '#111827', fontSize: '13px', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = '#4f46e5'}
            onBlur={e => e.target.style.borderColor = '#d1d5db'}
          />
          <button type="submit" style={{ padding: '9px 16px', background: '#dc2626', border: '1px solid #dc2626', color: '#ffffff', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Add</button>
        </form>
        {dncList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
            {dncList.map((row) => (
              <div key={row.phone} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: '500', color: '#111827', fontSize: '13px' }}>{row.phone}</span>
                <button onClick={() => removeFromDnc(row.phone)} style={{ padding: '3px 10px', background: 'transparent', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '500' }}>Remove</button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#4b5563', fontSize: '13px' }}>No numbers on the list.</p>
        )}
      </div>

      {/* Auto-Configured */}
      <div style={{ ...cardStyle, border: '1px solid #c7d2fe', background: '#eef2ff' }}>
        <div style={headerStyle}>
          <div style={{ ...iconWrapStyle, background: '#e0e7ff', border: '1px solid #c7d2fe' }}>
            <SettingsIcon style={{ width: '18px', height: '18px', color: '#4f46e5' }} />
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>Auto-Configured</h2>
        </div>
        <ul style={{ color: '#4b5563', paddingLeft: '20px', margin: 0, fontSize: '13px', lineHeight: '2' }}>
          <li><strong style={{ color: '#111827' }}>Voice:</strong> Telnyx NaturalHD</li>
          <li><strong style={{ color: '#111827' }}>AI Model:</strong> Qwen/Qwen3-235B-A22B</li>
          <li><strong style={{ color: '#111827' }}>Transcription:</strong> Deepgram Flux</li>
          <li><strong style={{ color: '#111827' }}>Noise Suppression:</strong> DeepFilterNet</li>
          <li><strong style={{ color: '#111827' }}>Interruption:</strong> Enabled (0.4s wait)</li>
        </ul>
      </div>
    </div>
  );
}
