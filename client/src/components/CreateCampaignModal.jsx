import { useState, useEffect } from 'react';
import { X, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { apiFetch } from '../utils/api';

const steps = ['Template', 'Details', 'AI Prompt'];

const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: '#ffffff', border: '1px solid #d1d5db',
  borderRadius: '8px', fontSize: '14px', outline: 'none', color: '#111827',
  boxSizing: 'border-box'
};

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '6px' };

export default function CreateCampaignModal({ onClose, onCreated }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '', type: 'pre_foreclosure', description: '', ai_prompt: '',
    voice: 'astra', language: 'en-US', caller_id: '+17324028535',
    greeting: 'Hello,', time_limit_secs: 1800, voicemail_detection: true, bot_name: 'Julia'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTemplates(); }, []);

  async function fetchTemplates() {
    try { const res = await apiFetch('/api/campaigns/templates/list'); const data = await res.json(); setTemplates(data); } catch (err) { console.error('Error:', err); }
  }

  function selectTemplate(template) {
    setSelectedTemplate(template);
    setFormData({ ...formData, name: template.name, type: template.type, description: template.description, ai_prompt: template.ai_prompt });
  }

  async function handleSubmit() {
    setSaving(true);
    try { const res = await apiFetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) }); const campaign = await res.json(); onCreated(campaign); }
    catch (err) { console.error('Error:', err); } finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose} />

      <div style={{
        position: 'relative', background: '#ffffff',
        border: '1px solid #e5e7eb', borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '768px', maxHeight: '90vh', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>Create Campaign</h2>
            <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '3px' }}>Set up a new AI outreach campaign</p>
          </div>
          <button onClick={onClose} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '6px', color: '#9ca3af' }}>
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Progress Steps */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            {steps.map((step, idx) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '700',
                  background: idx <= currentStep ? '#4f46e5' : '#f3f4f6',
                  color: idx <= currentStep ? 'white' : '#9ca3af',
                  border: idx <= currentStep ? 'none' : '1px solid #e5e7eb'
                }}>
                  {idx + 1}
                </div>
                <span style={{ marginLeft: '6px', fontSize: '13px', fontWeight: '600', color: idx <= currentStep ? '#111827' : '#9ca3af' }}>{step}</span>
                {idx < steps.length - 1 && <ChevronRight style={{ width: '16px', height: '16px', margin: '0 8px', color: '#9ca3af' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 250px)' }}>
          {/* Step 1: Template */}
          {currentStep === 0 && (
            <div>
              <p style={{ color: '#4b5563', marginBottom: '14px', fontSize: '14px' }}>Choose a template or start from scratch:</p>

              <div
                onClick={() => { setSelectedTemplate(null); setFormData({ ...formData, name: '', type: 'reminder', description: '', ai_prompt: '' }); }}
                style={{
                  padding: '14px', border: `1px solid ${!selectedTemplate ? '#4f46e5' : '#e5e7eb'}`,
                  background: !selectedTemplate ? '#eef2ff' : '#ffffff',
                  borderRadius: '10px', cursor: 'pointer', marginBottom: '8px', transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles style={{ width: '16px', height: '16px', color: '#4b5563' }} />
                  </div>
                  <div><h4 style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>Start from Scratch</h4><p style={{ fontSize: '13px', color: '#4b5563' }}>Create a custom campaign</p></div>
                </div>
              </div>

              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  style={{
                    padding: '14px', border: `1px solid ${selectedTemplate?.id === template.id ? '#4f46e5' : '#e5e7eb'}`,
                    background: selectedTemplate?.id === template.id ? '#eef2ff' : '#ffffff',
                    borderRadius: '10px', cursor: 'pointer', marginBottom: '8px', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Sparkles style={{ width: '16px', height: '16px', color: '#4f46e5' }} />
                    </div>
                    <div><h4 style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{template.name}</h4><p style={{ fontSize: '13px', color: '#4b5563', marginTop: '3px' }}>{template.description}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 1 && (
            <div>
              <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Campaign Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} placeholder="e.g., Q1 Appointment Reminders" /></div>
              <div style={{ marginBottom: '14px' }}><label style={labelStyle}>AI Caller Name <span style={{ fontWeight: '400', color: '#4f46e5', fontSize: '11px' }}>(name used on calls)</span></label><input type="text" value={formData.bot_name} onChange={(e) => setFormData({ ...formData, bot_name: e.target.value })} style={inputStyle} placeholder="e.g., Julia, Derek" /></div>
              <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Campaign Type</label><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ ...inputStyle, backgroundColor: '#ffffff' }}>
                <option value="pre_foreclosure">Pre-Foreclosure Outreach</option><option value="cash_buyer">Cash Buyer / Quick Close</option><option value="short_sale">Short Sale</option>
                <option value="live_verification">Live Verification</option><option value="follow_up">Follow Up</option><option value="voicemail_drop">Voicemail Drop</option>
                <option value="sms_follow_up">SMS Follow-Up</option><option value="appointment">Appointment Setting</option><option value="outreach">General Outreach</option>
              </select></div>
              <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Brief description..." /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div><label style={labelStyle}>AI Voice</label><select value={formData.voice} onChange={(e) => setFormData({ ...formData, voice: e.target.value })} style={{ ...inputStyle, backgroundColor: '#ffffff' }}>
                  <optgroup label="Female"><option value="astra">Astra (Warm)</option><option value="andromeda">Andromeda (Professional)</option><option value="luna">Luna (Friendly)</option><option value="athena">Athena (Confident)</option></optgroup>
                  <optgroup label="Male"><option value="orion">Orion (Professional)</option><option value="perseus">Perseus (Warm)</option><option value="atlas">Atlas (Deep)</option><option value="helios">Helios (Energetic)</option></optgroup>
                </select></div>
                <div><label style={labelStyle}>Language</label><select value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })} style={{ ...inputStyle, backgroundColor: '#ffffff' }}>
                  <option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="es-ES">Spanish</option>
                </select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div><label style={labelStyle}>Caller ID *</label><input type="text" value={formData.caller_id} onChange={(e) => setFormData({ ...formData, caller_id: e.target.value })} style={inputStyle} placeholder="+17324028535" /></div>
                <div><label style={labelStyle}>Time Limit</label><select value={formData.time_limit_secs} onChange={(e) => setFormData({ ...formData, time_limit_secs: parseInt(e.target.value) })} style={{ ...inputStyle, backgroundColor: '#ffffff' }}>
                  <option value={300}>5 min</option><option value={600}>10 min</option><option value={900}>15 min</option><option value={1800}>30 min</option><option value={3600}>1 hr</option>
                </select></div>
              </div>
              <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Opening Greeting</label><input type="text" value={formData.greeting} onChange={(e) => setFormData({ ...formData, greeting: e.target.value })} style={inputStyle} placeholder="Hello," /><p style={{ fontSize: '11px', color: '#4b5563', marginTop: '4px' }}>First words the AI says when call connects</p></div>
              <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="voicemail_detection" checked={formData.voicemail_detection} onChange={(e) => setFormData({ ...formData, voicemail_detection: e.target.checked })} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4f46e5' }} />
                <label htmlFor="voicemail_detection" style={{ fontSize: '13px', color: '#111827', cursor: 'pointer' }}><strong>Voicemail Detection</strong> - Auto detect and leave voicemail</label>
              </div>
              <div style={{ padding: '10px 12px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: '#4f46e5', margin: 0 }}><strong>Telnyx:</strong> NaturalHD Voice | Deepgram Flux | Qwen3-235B</p>
              </div>
            </div>
          )}

          {/* Step 3: AI Prompt */}
          {currentStep === 2 && (
            <div>
              <div>
                <label style={labelStyle}>AI Assistant Prompt</label>
                <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '10px' }}>Define how the AI should interact with contacts.</p>
                <textarea value={formData.ai_prompt} onChange={(e) => setFormData({ ...formData, ai_prompt: e.target.value })}
                  style={{ ...inputStyle, minHeight: '280px', fontFamily: 'monospace', fontSize: '13px', resize: 'vertical', lineHeight: '1.5' }}
                  placeholder="You are a friendly real estate assistant..." />
              </div>
              <div style={{ marginTop: '14px', padding: '14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                <h4 style={{ fontWeight: '600', color: '#b45309', marginBottom: '8px', fontSize: '13px' }}>Best Practices:</h4>
                <ul style={{ fontSize: '12px', color: '#4b5563', paddingLeft: '18px', margin: 0, lineHeight: '1.8' }}>
                  <li><strong style={{ color: '#111827' }}>Identity:</strong> Define who the AI is and why they're calling</li>
                  <li><strong style={{ color: '#111827' }}>Flow:</strong> Opening - Discovery - Value - Objections - Close</li>
                  <li><strong style={{ color: '#111827' }}>Variables:</strong> Use {"{{contact.first_name}}"} for personalization</li>
                  <li><strong style={{ color: '#111827' }}>Objections:</strong> Include common objections and responses</li>
                  <li><strong style={{ color: '#111827' }}>Compliance:</strong> Add opt-out handling</li>
                </ul>
              </div>
              <div style={{ marginTop: '10px', padding: '10px 12px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: '#4f46e5', margin: 0 }}><strong>Tip:</strong> Select "Pre-Foreclosure" template for a complete example!</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
          <button
            onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : onClose()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '10px 18px', background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827', fontWeight: '500', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
          >
            <ChevronLeft style={{ width: '14px', height: '14px' }} />
            {currentStep > 0 ? 'Back' : 'Cancel'}
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 1 && !formData.name}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '10px 18px',
                background: currentStep === 1 && !formData.name ? '#f3f4f6' : '#4f46e5',
                color: currentStep === 1 && !formData.name ? '#9ca3af' : 'white',
                fontWeight: '600', borderRadius: '8px', border: 'none',
                cursor: currentStep === 1 && !formData.name ? 'not-allowed' : 'pointer', fontSize: '13px',
                boxShadow: currentStep === 1 && !formData.name ? 'none' : '0 4px 12px rgba(79,70,229,0.3)'
              }}
            >
              Next <ChevronRight style={{ width: '14px', height: '14px' }} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.name || !formData.ai_prompt}
              style={{
                display: 'inline-flex', alignItems: 'center', padding: '10px 20px',
                background: saving || !formData.name || !formData.ai_prompt ? '#f3f4f6' : '#4f46e5',
                color: saving || !formData.name || !formData.ai_prompt ? '#9ca3af' : 'white',
                fontWeight: '600', borderRadius: '8px', border: 'none',
                cursor: saving || !formData.name || !formData.ai_prompt ? 'not-allowed' : 'pointer', fontSize: '13px',
                boxShadow: saving || !formData.name || !formData.ai_prompt ? 'none' : '0 4px 12px rgba(79,70,229,0.3)'
              }}
            >
              {saving ? 'Creating...' : 'Create Campaign'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
