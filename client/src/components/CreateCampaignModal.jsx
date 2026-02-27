import { useState, useEffect } from 'react';
import { X, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';

const steps = ['Template', 'Details', 'AI Prompt'];

export default function CreateCampaignModal({ onClose, onCreated }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'pre_foreclosure',
    description: '',
    ai_prompt: '',
    voice: 'astra',
    language: 'en-US',
    caller_id: '+17324028535',
    greeting: 'Hello,',
    time_limit_secs: 1800,
    voicemail_detection: true,
    bot_name: 'Julia'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/campaigns/templates/list');
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  }

  function selectTemplate(template) {
    setSelectedTemplate(template);
    setFormData({
      ...formData,
      name: template.name,
      type: template.type,
      description: template.description,
      ai_prompt: template.ai_prompt
    });
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const campaign = await res.json();
      onCreated(campaign);
    } catch (err) {
      console.error('Error creating campaign:', err);
    } finally {
      setSaving(false);
    }
  }

  const modalStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px'
  };

  const overlayStyle = {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(21, 28, 48, 0.6)',
    backdropFilter: 'blur(4px)'
  };

  const contentStyle = {
    position: 'relative',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '768px',
    maxHeight: '90vh',
    overflow: 'hidden'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #dbd5ca',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none'
  };

  return (
    <div style={modalStyle}>
      <div style={overlayStyle} onClick={onClose} />
      
      <div style={contentStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', borderBottom: '1px solid #edeae5' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>Create Campaign</h2>
            <p style={{ fontSize: '14px', color: '#99826a', marginTop: '4px' }}>Set up a new AI outreach campaign</p>
          </div>
          <button onClick={onClose} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px' }}>
            <X style={{ width: '20px', height: '20px', color: '#99826a' }} />
          </button>
        </div>

        {/* Progress Steps */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #edeae5', backgroundColor: '#f7f6f4' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            {steps.map((step, idx) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: idx <= currentStep ? '#deb040' : '#dbd5ca',
                  color: idx <= currentStep ? '#151c30' : '#99826a'
                }}>
                  {idx + 1}
                </div>
                <span style={{ marginLeft: '8px', fontSize: '14px', fontWeight: '500', color: idx <= currentStep ? '#1e2a45' : '#ab9a82' }}>
                  {step}
                </span>
                {idx < steps.length - 1 && (
                  <ChevronRight style={{ width: '20px', height: '20px', margin: '0 12px', color: '#c4b9a7' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 250px)' }}>
          {/* Step 1: Template Selection */}
          {currentStep === 0 && (
            <div>
              <p style={{ color: '#8c735e', marginBottom: '16px' }}>Choose a template or start from scratch:</p>
              
              <div 
                onClick={() => {
                  setSelectedTemplate(null);
                  setFormData({ ...formData, name: '', type: 'reminder', description: '', ai_prompt: '' });
                }}
                style={{
                  padding: '16px',
                  border: `2px solid ${!selectedTemplate ? '#deb040' : '#dbd5ca'}`,
                  backgroundColor: !selectedTemplate ? '#fbf7e8' : 'white',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  marginBottom: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: '#edeae5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles style={{ width: '20px', height: '20px', color: '#99826a' }} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: '500', color: '#1e2a45' }}>Start from Scratch</h4>
                    <p style={{ fontSize: '14px', color: '#99826a' }}>Create a custom campaign with your own prompt</p>
                  </div>
                </div>
              </div>

              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  style={{
                    padding: '16px',
                    border: `2px solid ${selectedTemplate?.id === template.id ? '#deb040' : '#dbd5ca'}`,
                    backgroundColor: selectedTemplate?.id === template.id ? '#fbf7e8' : 'white',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    marginBottom: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: '#fbf7e8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Sparkles style={{ width: '20px', height: '20px', color: '#deb040' }} />
                    </div>
                    <div>
                      <h4 style={{ fontWeight: '500', color: '#1e2a45' }}>{template.name}</h4>
                      <p style={{ fontSize: '14px', color: '#99826a', marginTop: '4px' }}>{template.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Campaign Details */}
          {currentStep === 1 && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Campaign Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g., Q1 Appointment Reminders"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>
                  AI Caller Name <span style={{ fontWeight: '400', color: '#0284c7', fontSize: '12px' }}>(the name the bot uses on calls)</span>
                </label>
                <input
                  type="text"
                  value={formData.bot_name}
                  onChange={(e) => setFormData({ ...formData, bot_name: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g., Julia, Derek, Sarah..."
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Campaign Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  style={inputStyle}
                >
                  <option value="pre_foreclosure">Pre-Foreclosure Outreach</option>
                  <option value="cash_buyer">Cash Buyer / Quick Close</option>
                  <option value="short_sale">Short Sale / Lender Negotiation</option>
                  <option value="live_verification">Live Call Verification</option>
                  <option value="follow_up">Follow Up / Re-Engagement</option>
                  <option value="voicemail_drop">Voicemail Drop</option>
                  <option value="sms_follow_up">SMS Follow-Up</option>
                  <option value="appointment">Appointment Setting</option>
                  <option value="outreach">General Outreach</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Description (optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                  placeholder="Brief description of this campaign..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>AI Voice (Telnyx NaturalHD)</label>
                  <select value={formData.voice} onChange={(e) => setFormData({ ...formData, voice: e.target.value })} style={inputStyle}>
                    <optgroup label="Female Voices">
                      <option value="astra">Astra (Female, Warm)</option>
                      <option value="andromeda">Andromeda (Female, Professional)</option>
                      <option value="luna">Luna (Female, Friendly)</option>
                      <option value="athena">Athena (Female, Confident)</option>
                    </optgroup>
                    <optgroup label="Male Voices">
                      <option value="orion">Orion (Male, Professional)</option>
                      <option value="perseus">Perseus (Male, Warm)</option>
                      <option value="atlas">Atlas (Male, Deep)</option>
                      <option value="helios">Helios (Male, Energetic)</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Language</label>
                  <select value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })} style={inputStyle}>
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="es-ES">Spanish</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Caller ID (Telnyx Phone Number) *</label>
                  <input
                    type="text"
                    value={formData.caller_id}
                    onChange={(e) => setFormData({ ...formData, caller_id: e.target.value })}
                    style={inputStyle}
                    placeholder="+17324028535"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Call Time Limit</label>
                  <select value={formData.time_limit_secs} onChange={(e) => setFormData({ ...formData, time_limit_secs: parseInt(e.target.value) })} style={inputStyle}>
                    <option value={300}>5 minutes</option>
                    <option value={600}>10 minutes</option>
                    <option value={900}>15 minutes</option>
                    <option value={1800}>30 minutes</option>
                    <option value={3600}>1 hour</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Opening Greeting</label>
                <input
                  type="text"
                  value={formData.greeting}
                  onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                  style={inputStyle}
                  placeholder="Hello,"
                />
                <p style={{ fontSize: '12px', color: '#ab9a82', marginTop: '4px' }}>First words the AI says when call connects (before following the prompt)</p>
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  id="voicemail_detection"
                  checked={formData.voicemail_detection}
                  onChange={(e) => setFormData({ ...formData, voicemail_detection: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="voicemail_detection" style={{ fontSize: '14px', color: '#1e2a45', cursor: 'pointer' }}>
                  <strong>Voicemail Detection</strong> - Automatically detect and leave a voicemail message
                </label>
              </div>
              
              <div style={{ padding: '12px', backgroundColor: '#e0f2fe', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <p style={{ fontSize: '13px', color: '#0369a1', margin: 0 }}>
                  <strong>Telnyx Settings:</strong> Voice: Telnyx NaturalHD | Transcription: Deepgram Flux | Model: Qwen3-235B
                </p>
              </div>
            </div>
          )}

          {/* Step 3: AI Prompt */}
          {currentStep === 2 && (
            <div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>AI Assistant Prompt</label>
                <p style={{ fontSize: '14px', color: '#99826a', marginBottom: '12px' }}>
                  Define how the AI should interact with your contacts.
                </p>
                <textarea
                  value={formData.ai_prompt}
                  onChange={(e) => setFormData({ ...formData, ai_prompt: e.target.value })}
                  style={{ ...inputStyle, minHeight: '300px', fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' }}
                  placeholder={`You are a friendly real estate assistant...`}
                />
              </div>

              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#fbf7e8', border: '1px solid #f6ecc5', borderRadius: '8px' }}>
                <h4 style={{ fontWeight: '500', color: '#a67328', marginBottom: '8px' }}>💡 AI Calling Best Practices:</h4>
                <ul style={{ fontSize: '13px', color: '#a67328', paddingLeft: '20px', margin: 0, lineHeight: '1.6' }}>
                  <li><strong>Identity & Purpose:</strong> Define who the AI is and why they're calling</li>
                  <li><strong>Voice & Tone:</strong> Specify calm, empathetic, professional - not robotic</li>
                  <li><strong>Call Flow:</strong> Structure with Opening → Discovery → Value → Objections → Close</li>
                  <li><strong>Use Variables:</strong> Use {"{{contact.first_name}}"} for personalization</li>
                  <li><strong>Handle Objections:</strong> Include common objections and responses</li>
                  <li><strong>Compliance:</strong> Add opt-out handling and legal disclaimers</li>
                  <li><strong>Keep Concise:</strong> Aim to schedule meetings, not solve everything on call</li>
                </ul>
              </div>
              
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: '#0369a1', margin: 0 }}>
                  <strong>Pro Tip:</strong> Select "Pre-Foreclosure Outreach" template for a complete example with all best practices included!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', borderTop: '1px solid #edeae5', backgroundColor: '#f7f6f4' }}>
          <button
            onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : onClose()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '12px 24px',
              backgroundColor: 'white',
              color: '#1e2a45',
              fontWeight: '500',
              borderRadius: '8px',
              border: '1px solid #dbd5ca',
              cursor: 'pointer'
            }}
          >
            <ChevronLeft style={{ width: '16px', height: '16px', marginRight: '4px' }} />
            {currentStep > 0 ? 'Back' : 'Cancel'}
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 1 && !formData.name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 24px',
                backgroundColor: currentStep === 1 && !formData.name ? '#dbd5ca' : '#1e2a45',
                color: 'white',
                fontWeight: '500',
                borderRadius: '8px',
                border: 'none',
                cursor: currentStep === 1 && !formData.name ? 'not-allowed' : 'pointer'
              }}
            >
              Next
              <ChevronRight style={{ width: '16px', height: '16px', marginLeft: '4px' }} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.name || !formData.ai_prompt}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 24px',
                background: saving || !formData.name || !formData.ai_prompt ? '#dbd5ca' : 'linear-gradient(to right, #deb040, #c8932f)',
                color: '#151c30',
                fontWeight: '600',
                borderRadius: '8px',
                border: 'none',
                cursor: saving || !formData.name || !formData.ai_prompt ? 'not-allowed' : 'pointer'
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
