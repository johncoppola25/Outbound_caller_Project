import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Square, 
  Upload, 
  Users, 
  Phone,
  CheckCircle2,
  TrendingUp,
  Edit3,
  X,
  UserPlus,
  Trash2,
  RotateCcw,
  Eye,
  Mail,
  MapPin,
  FileText
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

// Format phone for display (e.g. 732-402-8535)
function formatCallbackPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  return phone;
}

// Component to show prompt preview with highlighted replaced values
function PreviewPromptWithHighlights({ prompt, contact, botName, campaign }) {
  if (!prompt || !contact) return prompt || 'No prompt configured';
  
  const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
  const aiName = botName || 'Julia';
  const callbackPhone = formatCallbackPhone(campaign?.caller_id || '908-309-1156');
  
  const replacements = [
    { pattern: /\{\{callback_phone\}\}/g, value: callbackPhone },
    { pattern: /\[Callback\s+Phone\]/gi, value: callbackPhone },
    { pattern: /\[Callback\s+Number\]/gi, value: callbackPhone },
    { pattern: /\[Owner\s+Name\]/gi, value: fullName },
    { pattern: /\[Owner\s+First\s+Name\]/gi, value: contact.first_name || '' },
    { pattern: /\[Owner\s+Last\s+Name\]/gi, value: contact.last_name || '' },
    { pattern: /\[First\s+Name\]/gi, value: contact.first_name || '' },
    { pattern: /\[Last\s+Name\]/gi, value: contact.last_name || '' },
    { pattern: /\[Full\s+Name\]/gi, value: fullName },
    { pattern: /\[Property\s+Address\]/gi, value: contact.property_address || '' },
    { pattern: /\{\{contact\.first_name\}\}/g, value: contact.first_name || '' },
    { pattern: /\{\{contact\.last_name\}\}/g, value: contact.last_name || '' },
    { pattern: /\{\{contact\.phone\}\}/g, value: contact.phone || '' },
    { pattern: /\{\{contact\.email\}\}/g, value: contact.email || '' },
    { pattern: /\{\{contact\.property_address\}\}/g, value: contact.property_address || '' },
    { pattern: /\{\{contact\.notes\}\}/g, value: contact.notes || '' },
    { pattern: /\[Your\s+Name\]/gi, value: aiName },
    { pattern: /\[Bot\s+Name\]/gi, value: aiName },
    { pattern: /\[Agent\s+Name\]/gi, value: aiName },
    { pattern: /\[AI\s+Name\]/gi, value: aiName }
  ];
  
  // Create parts array with text and highlighted spans
  let result = prompt;
  const parts = [];
  let lastIndex = 0;
  
  // Find all matches and their positions
  const allMatches = [];
  replacements.forEach(({ pattern, value }) => {
    let match;
    const regex = new RegExp(pattern.source, 'g');
    while ((match = regex.exec(prompt)) !== null) {
      allMatches.push({ index: match.index, length: match[0].length, value });
    }
  });
  
  // Sort by position
  allMatches.sort((a, b) => a.index - b.index);
  
  // Build parts
  allMatches.forEach((match, i) => {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: prompt.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'highlight', content: match.value });
    lastIndex = match.index + match.length;
  });
  
  if (lastIndex < prompt.length) {
    parts.push({ type: 'text', content: prompt.slice(lastIndex) });
  }
  
  return (
    <>
      {parts.map((part, i) => 
        part.type === 'highlight' ? (
          <span key={i} style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '2px 4px', borderRadius: '4px', fontWeight: '600' }}>
            {part.content}
          </span>
        ) : (
          <span key={i}>{part.content}</span>
        )
      )}
    </>
  );
}

export default function CampaignDetail() {
  const { id } = useParams();
  const fileInputRef = useRef(null);
  const promptTextareaRef = useRef(null);
  const [campaign, setCampaign] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [contacts, setContacts] = useState([]);
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('contacts');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [callingInProgress, setCallingInProgress] = useState(false);
  const { subscribe } = useWebSocket();

  // Edit Campaign Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    type: '',
    description: '',
    ai_prompt: '',
    voice: 'female',
    language: 'en-US',
    caller_id: '',
    greeting: '',
    time_limit_secs: 1800,
    voicemail_detection: true
  });
  const [saving, setSaving] = useState(false);

  // Add Contact Modal State
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    property_address: '',
    notes: ''
  });
  const [addingContact, setAddingContact] = useState(false);

  // Preview contact selector
  const [previewContactId, setPreviewContactId] = useState('');

  // Add from Contacts Modal State
  const [showAddFromContactsModal, setShowAddFromContactsModal] = useState(false);
  const [allContacts, setAllContacts] = useState([]);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [loadingAllContacts, setLoadingAllContacts] = useState(false);
  const [addingFromContacts, setAddingFromContacts] = useState(false);

  // View Contact Modal State
  const [showViewContactModal, setShowViewContactModal] = useState(false);
  const [viewingContact, setViewingContact] = useState(null);

  // Track which contact is currently being called (for loading state)
  const [callingContactId, setCallingContactId] = useState(null);
  const [callingAllContacts, setCallingAllContacts] = useState(false);

  // Inline prompt editing
  const [inlinePrompt, setInlinePrompt] = useState('');
  const [inlineGreeting, setInlineGreeting] = useState('');
  const [inlineBotName, setInlineBotName] = useState('Julia');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);

  // Voice settings
  const [inlineVoice, setInlineVoice] = useState('astra');
  const [inlineVoiceSpeed, setInlineVoiceSpeed] = useState(1.0);
  const [inlineLanguage, setInlineLanguage] = useState('en-US');
  const [inlineTimeLimitSecs, setInlineTimeLimitSecs] = useState(1800);
  const [inlineVoicemailDetection, setInlineVoicemailDetection] = useState(true);

  useEffect(() => {
    fetchCampaignData();
    
    const unsubscribe = subscribe((message) => {
      if (message.type === 'call_update' && message.call.campaign_id === id) {
        setCalls(prev => {
          const exists = prev.find(c => c.id === message.call.id);
          if (exists) {
            return prev.map(c => c.id === message.call.id ? message.call : c);
          }
          return [message.call, ...prev];
        });
        fetchStats();
      }
    });
    
    return unsubscribe;
  }, [id, subscribe]);

  useEffect(() => {
    if (campaign) {
      setEditForm({
        name: campaign.name || '',
        type: campaign.type || 'appointment',
        description: campaign.description || '',
        ai_prompt: campaign.ai_prompt || '',
        voice: campaign.voice || 'female',
        language: campaign.language || 'en-US',
        caller_id: campaign.caller_id || '',
        greeting: campaign.greeting || 'Hello,',
        time_limit_secs: campaign.time_limit_secs || 1800,
        voicemail_detection: campaign.voicemail_detection !== false,
        background_audio: campaign.background_audio || 'silence',
        bot_name: campaign.bot_name || 'Julia'
      });
      // Also set inline prompt, greeting, bot name, and voice settings for direct editing
      setInlinePrompt(campaign.ai_prompt || '');
      setInlineGreeting(campaign.greeting || 'Hello,');
      setInlineBotName(campaign.bot_name || 'Julia');
      setInlineVoice(campaign.voice || 'astra');
      setInlineVoiceSpeed(campaign.voice_speed || 1.0);
      setInlineLanguage(campaign.language || 'en-US');
      setInlineTimeLimitSecs(campaign.time_limit_secs || 1800);
      setInlineVoicemailDetection(campaign.voicemail_detection !== undefined ? !!campaign.voicemail_detection : true);
    }
  }, [campaign]);

  async function fetchCampaignData() {
    try {
      await Promise.all([fetchCampaign(), fetchContacts(), fetchCalls(), fetchStats()]);
    } catch (err) {
      console.error('Failed to load campaign data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCampaign() {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setCampaign(null);
        return;
      }
      setCampaign(data);
    } catch (err) {
      console.error('Failed to fetch campaign:', err);
      setCampaign(null);
    }
  }

  async function fetchContacts() {
    try {
      const res = await fetch(`/api/contacts/campaign/${id}?limit=100`);
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (err) {
      setContacts([]);
    }
  }

  async function fetchCalls() {
    try {
      const res = await fetch(`/api/calls/campaign/${id}?limit=100`);
      const data = await res.json();
      setCalls(data.calls || []);
    } catch (err) {
      setCalls([]);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch(`/api/stats/campaign/${id}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setStats(null);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/contacts/upload/${id}`, {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      setUploadResult(result);
      if (result.imported > 0) {
        fetchContacts();
        fetchStats();
      }
    } catch (err) {
      setUploadResult({ error: 'Upload failed' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function startCampaign() {
    if (!confirm('Start calling all pending contacts?')) return;
    setCallingInProgress(true);
    try {
      const res = await fetch(`/api/calls/start-campaign/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxConcurrent: 3 })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Campaign started! ${data.queued} contacts queued for calling.${data.skippedDnc ? ` (${data.skippedDnc} skipped - DNC list)` : ''}`);
        fetchContacts();
        fetchCalls();
        fetchStats();
      } else {
        alert(data.error || 'Failed to start campaign');
        setCallingInProgress(false);
      }
    } catch (err) {
      console.error('Error starting campaign:', err);
      alert('Error starting campaign');
      setCallingInProgress(false);
    }
  }

  async function stopCampaign() {
    try {
      await fetch(`/api/calls/stop-campaign/${id}`, { method: 'POST' });
      setCallingInProgress(false);
      fetchContacts();
      fetchCalls();
    } catch (err) {
      console.error('Error stopping campaign:', err);
    }
  }

  async function pauseCampaign() {
    try {
      await fetch(`/api/campaigns/${id}/pause`, { method: 'POST' });
      fetchCampaign();
    } catch (err) {
      console.error('Error pausing campaign:', err);
    }
  }

  async function resumeCampaign() {
    try {
      await fetch(`/api/calls/resume-campaign/${id}`, { method: 'POST' });
      fetchCampaign();
      setCallingInProgress(true);
    } catch (err) {
      console.error('Error resuming campaign:', err);
    }
  }

  async function callSingleContact(contactId) {
    if (callingContactId) return; // Prevent double-clicks
    setCallingContactId(contactId);
    try {
      await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: id, contact_id: contactId })
      });
      // Refresh contacts after initiating call
      fetchContacts();
    } catch (err) {
      console.error('Error initiating call:', err);
    } finally {
      setCallingContactId(null);
    }
  }

  async function callAllContacts() {
    const pendingContacts = contacts.filter(c => c.status === 'pending');
    if (pendingContacts.length === 0) {
      alert('No pending contacts to call');
      return;
    }
    
    if (!confirm(`Call all ${pendingContacts.length} pending contact(s)?`)) return;
    
    setCallingAllContacts(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      
      // Call each pending contact with a small delay between calls
      for (let i = 0; i < pendingContacts.length; i++) {
        const contact = pendingContacts[i];
        try {
          await fetch('/api/calls/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaign_id: id, contact_id: contact.id })
          });
          successCount++;
          
          // Small delay between calls to avoid overwhelming the API
          if (i < pendingContacts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err) {
          console.error(`Error calling contact ${contact.id}:`, err);
          errorCount++;
        }
      }
      
      // Refresh contacts after all calls initiated
      fetchContacts();
      fetchCalls();
      fetchStats();
      
      alert(`Initiated calls for ${successCount} contact(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
    } catch (err) {
      console.error('Error calling all contacts:', err);
      alert('Error calling contacts');
    } finally {
      setCallingAllContacts(false);
    }
  }

  // Save Campaign Edits
  async function handleSaveEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        const updated = await res.json();
        setCampaign(updated);
        setShowEditModal(false);
      } else {
        alert('Failed to update campaign');
      }
    } catch (err) {
      console.error('Error updating campaign:', err);
      alert('Error updating campaign');
    } finally {
      setSaving(false);
    }
  }

  // Save Prompt Directly (from Prompt tab)
  async function handleSavePrompt() {
    // Check if in preview mode
    if (previewContactId) {
      alert('Please click "Clear Preview" first, then edit the prompt, then save.');
      return;
    }
    
    // Check if there are changes
    const promptChanged = inlinePrompt !== (campaign.ai_prompt || '');
    const greetingChanged = inlineGreeting !== (campaign.greeting || 'Hello,');
    const botNameChanged = inlineBotName !== (campaign.bot_name || 'Julia');
    const voiceChanged = inlineVoice !== (campaign.voice || 'astra');
    const speedChanged = Math.abs(parseFloat(inlineVoiceSpeed) - parseFloat(campaign.voice_speed || 1.0)) > 0.01;
    const languageChanged = inlineLanguage !== (campaign.language || 'en-US');
    const timeLimitChanged = parseInt(inlineTimeLimitSecs) !== parseInt(campaign.time_limit_secs || 1800);
    const voicemailChanged = inlineVoicemailDetection !== !!campaign.voicemail_detection;
    
    const hasChanges = promptChanged || greetingChanged || botNameChanged || voiceChanged || speedChanged || languageChanged || timeLimitChanged || voicemailChanged;
    
    if (!hasChanges && activeTab !== 'voice') {
      alert('No changes to save.');
      return;
    }
    
    setSavingPrompt(true);
    setPromptSaved(false);
    
    console.log('Saving prompt, voice settings, and greeting to server...');
    
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ai_prompt: inlinePrompt, 
          greeting: inlineGreeting, 
          bot_name: inlineBotName,
          voice: inlineVoice,
          voice_speed: parseFloat(inlineVoiceSpeed),
          language: inlineLanguage,
          time_limit_secs: parseInt(inlineTimeLimitSecs),
          voicemail_detection: inlineVoicemailDetection
        })
      });
      
      console.log('Server response status:', res.status);
      
      if (res.ok) {
        const updated = await res.json();
        console.log('Prompt saved successfully:', updated);
        setCampaign(updated);
        setPromptSaved(true);
        alert('✅ Prompt saved and synced to Telnyx!');
        // Reset the saved indicator after 5 seconds
        setTimeout(() => setPromptSaved(false), 5000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Save failed:', errorData);
        alert('Failed to save prompt: ' + (errorData.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error saving prompt:', err);
      alert('Error saving prompt: ' + err.message);
    } finally {
      setSavingPrompt(false);
    }
  }

  // Add Single Contact
  async function handleAddContact(e) {
    e.preventDefault();
    if (!contactForm.first_name || !contactForm.phone) {
      alert('First name and phone are required');
      return;
    }
    setAddingContact(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactForm,
          campaign_id: id
        })
      });
      if (res.ok) {
        setContactForm({
          first_name: '',
          last_name: '',
          phone: '',
          email: '',
          property_address: '',
          notes: ''
        });
        setShowAddContactModal(false);
        fetchContacts();
        fetchStats();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to add contact');
      }
    } catch (err) {
      console.error('Error adding contact:', err);
      alert('Error adding contact');
    } finally {
      setAddingContact(false);
    }
  }

  // Delete Contact
  async function handleDeleteContact(contactId) {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchContacts();
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting contact:', err);
    }
  }

  // Fetch all contacts from all campaigns (for Add from Contacts)
  async function fetchAllContacts() {
    setLoadingAllContacts(true);
    try {
      // Get all campaigns first
      const campaignsRes = await fetch('/api/campaigns');
      const campaigns = await campaignsRes.json();
      
      // Get contacts from each campaign
      const allContactsData = [];
      for (const campaign of campaigns) {
        if (campaign.id !== id) { // Exclude current campaign
          const res = await fetch(`/api/contacts/campaign/${campaign.id}?limit=200`);
          const data = await res.json();
          const contactsWithCampaign = (data.contacts || []).map(c => ({
            ...c,
            campaign_name: campaign.name
          }));
          allContactsData.push(...contactsWithCampaign);
        }
      }
      setAllContacts(allContactsData);
    } catch (err) {
      console.error('Error fetching all contacts:', err);
    } finally {
      setLoadingAllContacts(false);
    }
  }

  // Open Add from Contacts modal
  function openAddFromContactsModal() {
    setSelectedContactIds([]);
    setShowAddFromContactsModal(true);
    fetchAllContacts();
  }

  // Toggle contact selection
  function toggleContactSelection(contactId) {
    setSelectedContactIds(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  }

  // Add selected contacts to this campaign
  async function handleAddFromContacts() {
    if (selectedContactIds.length === 0) {
      alert('Please select at least one contact');
      return;
    }
    
    setAddingFromContacts(true);
    try {
      let added = 0;
      for (const contactId of selectedContactIds) {
        const contact = allContacts.find(c => c.id === contactId);
        if (contact) {
          const res = await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaign_id: id,
              first_name: contact.first_name,
              last_name: contact.last_name,
              phone: contact.phone,
              email: contact.email,
              property_address: contact.property_address,
              notes: contact.notes
            })
          });
          if (res.ok) added++;
        }
      }
      
      alert(`Added ${added} contact(s) to this campaign!`);
      setShowAddFromContactsModal(false);
      setSelectedContactIds([]);
      fetchContacts();
      fetchStats();
    } catch (err) {
      console.error('Error adding contacts:', err);
      alert('Error adding contacts');
    } finally {
      setAddingFromContacts(false);
    }
  }

  // Insert variable at cursor position in prompt textarea
  function insertVariable(variable) {
    const textarea = promptTextareaRef.current;
    if (!textarea) {
      // Fallback: just append to end
      setEditForm({ ...editForm, ai_prompt: editForm.ai_prompt + variable });
      return;
    }
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = editForm.ai_prompt;
    const newText = text.substring(0, start) + variable + text.substring(end);
    
    setEditForm({ ...editForm, ai_prompt: newText });
    
    // Restore cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    }, 0);
  }

  // Get preview of prompt with contact data filled in
  function getPreviewPrompt(prompt) {
    if (!previewContactId || !prompt) return prompt;
    
    const contact = contacts.find(c => c.id === previewContactId);
    if (!contact) return prompt;
    
    return prompt
      .replace(/\{\{contact\.first_name\}\}/g, contact.first_name || '')
      .replace(/\{\{contact\.last_name\}\}/g, contact.last_name || '')
      .replace(/\{\{contact\.phone\}\}/g, contact.phone || '')
      .replace(/\{\{contact\.email\}\}/g, contact.email || '')
      .replace(/\{\{contact\.property_address\}\}/g, contact.property_address || '')
      .replace(/\{\{contact\.notes\}\}/g, contact.notes || '');
  }

  // Reset Campaign
  async function handleResetCampaign() {
    if (!confirm('Are you sure you want to reset this campaign?\n\nThis will:\n• Delete all call records\n• Reset all contacts to "pending" status\n\nThis action cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/campaigns/${id}/reset`, { method: 'POST' });
      if (res.ok) {
        fetchContacts();
        fetchCalls();
        fetchStats();
        alert('Campaign has been reset successfully!');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to reset campaign');
      }
    } catch (err) {
      console.error('Error resetting campaign:', err);
      alert('Error resetting campaign');
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ width: '32px', height: '32px', border: '4px solid #deb040', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (!campaign || campaign.error) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontFamily: 'Playfair Display, serif', color: '#151c30', marginBottom: '12px' }}>Campaign not found</h2>
        <p style={{ color: '#99826a', marginBottom: '24px' }}>The campaign may have been deleted or the server may be unreachable.</p>
        <Link to="/campaigns" style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 24px', backgroundColor: '#1e2a45', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '500' }}>
          <ArrowLeft style={{ width: '18px', height: '18px', marginRight: '8px' }} /> Back to Campaigns
        </Link>
      </div>
    );
  }

  const pendingContacts = contacts.filter(c => c.status === 'pending').length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link to="/campaigns" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '14px', color: '#99826a', textDecoration: 'none', marginBottom: '16px' }}>
          <ArrowLeft style={{ width: '16px', height: '16px', marginRight: '4px' }} /> Back to Campaigns
        </Link>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'flex-start', 
          justifyContent: 'space-between',
          gap: isMobile ? '16px' : '0'
        }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ 
              fontSize: isMobile ? '24px' : '30px', 
              fontFamily: 'Playfair Display, serif', 
              fontWeight: '600', 
              color: '#151c30',
              wordBreak: 'break-word'
            }}>{campaign.name}</h1>
            <p style={{ color: '#8c735e', marginTop: '4px' }}>{campaign.description || `${campaign.type?.replace('_', ' ')} campaign`}</p>
            {campaign.telnyx_assistant_id && (
              <p style={{ fontSize: '12px', color: '#059669', marginTop: '4px', wordBreak: 'break-all' }}>✓ Telnyx Assistant: {campaign.telnyx_assistant_id}</p>
            )}
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'stretch',
            gap: '12px',
            width: isMobile ? '100%' : 'auto'
          }}>
            <button 
              onClick={() => setShowEditModal(true)}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: isMobile ? '14px 20px' : '12px 20px', 
                backgroundColor: 'white', 
                color: '#1e2a45', 
                fontWeight: '500', 
                borderRadius: '8px', 
                border: '1px solid #dbd5ca', 
                cursor: 'pointer',
                width: isMobile ? '100%' : 'auto',
                minHeight: '44px'
              }}
            >
              <Edit3 style={{ width: '18px', height: '18px', marginRight: '8px' }} /> Edit
            </button>
            
            <button 
              onClick={handleResetCampaign}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: isMobile ? '14px 20px' : '12px 20px', 
                backgroundColor: 'white', 
                color: '#dc2626', 
                fontWeight: '500', 
                borderRadius: '8px', 
                border: '1px solid #fecaca', 
                cursor: 'pointer',
                width: isMobile ? '100%' : 'auto',
                minHeight: '44px'
              }}
            >
              <RotateCcw style={{ width: '18px', height: '18px', marginRight: '8px' }} /> Reset
            </button>
            
            {callingInProgress ? (
              <>
                {campaign?.status === 'paused' ? (
                  <button 
                    onClick={resumeCampaign} 
                    style={{ 
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      padding: '12px 24px', backgroundColor: '#059669', color: 'white', 
                      fontWeight: '500', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      width: isMobile ? '100%' : 'auto', minHeight: '44px', marginRight: '8px'
                    }}
                  >
                    <Play style={{ width: '20px', height: '20px', marginRight: '8px' }} /> Resume
                  </button>
                ) : (
                  <button 
                    onClick={pauseCampaign} 
                    style={{ 
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      padding: '12px 24px', backgroundColor: '#d97706', color: 'white', 
                      fontWeight: '500', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      width: isMobile ? '100%' : 'auto', minHeight: '44px', marginRight: '8px'
                    }}
                  >
                    <Square style={{ width: '20px', height: '20px', marginRight: '8px' }} /> Pause
                  </button>
                )}
              <button 
                onClick={stopCampaign} 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: window.innerWidth < 768 ? '14px 24px' : '12px 24px', 
                  backgroundColor: '#dc2626', 
                  color: 'white', 
                  fontWeight: '500', 
                  borderRadius: '8px', 
                  border: 'none', 
                  cursor: 'pointer',
                  width: isMobile ? '100%' : 'auto',
                  minHeight: '44px'
                }}
              >
                <Square style={{ width: '20px', height: '20px', marginRight: '8px' }} /> Stop Calling
              </button>
              </>
            ) : (
              <button 
                onClick={startCampaign} 
                disabled={pendingContacts === 0}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: window.innerWidth < 768 ? '14px 24px' : '12px 24px', 
                  background: pendingContacts === 0 ? '#dbd5ca' : 'linear-gradient(to right, #deb040, #c8932f)', 
                  color: '#151c30', 
                  fontWeight: '600', 
                  borderRadius: '8px', 
                  border: 'none', 
                  cursor: pendingContacts === 0 ? 'not-allowed' : 'pointer',
                  width: isMobile ? '100%' : 'auto',
                  minHeight: '44px'
                }}
              >
                <Play style={{ width: '20px', height: '20px', marginRight: '8px' }} /> Start Campaign
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : window.innerWidth < 1024 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        {[
          { label: 'Contacts', value: stats?.basic?.total_contacts || 0, icon: Users, bg: '#e9ecf5', color: '#1e2a45' },
          { label: 'Total Calls', value: stats?.basic?.total_calls || 0, icon: Phone, bg: '#fbf7e8', color: '#deb040' },
          { label: 'Completed', value: stats?.basic?.completed_calls || 0, icon: CheckCircle2, bg: '#d1fae5', color: '#059669' },
          { label: 'Conversion', value: `${(stats?.conversionRate || 0).toFixed(1)}%`, icon: TrendingUp, bg: '#ede9fe', color: '#7c3aed' }
        ].map((stat) => (
          <div key={stat.label} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: stat.bg, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon style={{ width: '20px', height: '20px', color: stat.color }} />
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: '600', color: '#1e2a45' }}>{stat.value}</p>
                <p style={{ fontSize: '12px', color: '#99826a' }}>{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(30, 42, 69, 0.08)', overflow: 'hidden' }}>
        <div style={{ borderBottom: '1px solid #edeae5', display: 'flex' }}>
          {['contacts', 'calls', 'prompt', 'voice'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '16px 24px',
                fontSize: '14px',
                fontWeight: '500',
                textTransform: 'capitalize',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #deb040' : '2px solid transparent',
                color: activeTab === tab ? '#deb040' : '#99826a',
                cursor: 'pointer'
              }}
            >
              {tab === 'voice' ? 'Voice Settings' : tab}
            </button>
          ))}
        </div>

        <div style={{ padding: '24px' }}>
          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div>
              {/* Upload & Add Section */}
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f7f6f4', borderRadius: '12px', border: '1px solid #edeae5' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontWeight: '500', color: '#1e2a45' }}>Add Contacts</h3>
                    <p style={{ fontSize: '14px', color: '#99826a' }}>Upload CSV or add contacts manually</p>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: '12px',
                    width: isMobile ? '100%' : 'auto'
                  }}>
                    <button
                      onClick={() => setShowAddContactModal(true)}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: window.innerWidth < 768 ? '14px 20px' : '10px 20px', 
                        background: 'linear-gradient(to right, #deb040, #c8932f)', 
                        color: '#151c30', 
                        fontWeight: '600', 
                        borderRadius: '8px', 
                        border: 'none', 
                        cursor: 'pointer',
                        width: isMobile ? '100%' : 'auto',
                        minHeight: '44px'
                      }}
                    >
                      <UserPlus style={{ width: '16px', height: '16px', marginRight: '8px' }} /> Add Contact
                    </button>
                    <button
                      onClick={openAddFromContactsModal}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: window.innerWidth < 768 ? '14px 20px' : '10px 20px', 
                        backgroundColor: '#e9ecf5', 
                        color: '#1e2a45', 
                        fontWeight: '500', 
                        borderRadius: '8px', 
                        border: '1px solid #c4cee0', 
                        cursor: 'pointer',
                        width: isMobile ? '100%' : 'auto',
                        minHeight: '44px'
                      }}
                    >
                      <Users style={{ width: '16px', height: '16px', marginRight: '8px' }} /> Add from Contacts
                    </button>
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: window.innerWidth < 768 ? '14px 20px' : '10px 20px', 
                        backgroundColor: 'white', 
                        color: '#1e2a45', 
                        fontWeight: '500', 
                        borderRadius: '8px', 
                        border: '1px solid #dbd5ca', 
                        cursor: 'pointer',
                        width: isMobile ? '100%' : 'auto',
                        minHeight: '44px'
                      }}
                    >
                      {uploading ? 'Uploading...' : <><Upload style={{ width: '16px', height: '16px', marginRight: '8px' }} /> Upload CSV</>}
                    </button>
                  </div>
                </div>
                
                {/* Call All Contacts Button */}
                {contacts.length > 0 && pendingContacts > 0 && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #edeae5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ fontWeight: '500', color: '#1e2a45', marginBottom: '4px' }}>Call All Contacts</h4>
                        <p style={{ fontSize: '12px', color: '#99826a' }}>Initiate calls for all {pendingContacts} pending contact(s)</p>
                      </div>
                      <button
                        onClick={callAllContacts}
                        disabled={callingAllContacts || pendingContacts === 0}
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          padding: window.innerWidth < 768 ? '14px 20px' : '10px 20px', 
                          background: callingAllContacts || pendingContacts === 0 
                            ? '#dbd5ca' 
                            : 'linear-gradient(to right, #059669, #047857)', 
                          color: callingAllContacts || pendingContacts === 0 ? '#99826a' : 'white', 
                          fontWeight: '600', 
                          borderRadius: '8px', 
                          border: 'none', 
                          cursor: callingAllContacts || pendingContacts === 0 ? 'not-allowed' : 'pointer',
                          width: isMobile ? '100%' : 'auto',
                          minHeight: '44px'
                        }}
                      >
                        {callingAllContacts ? (
                          <>
                            <div style={{ 
                              width: '16px', 
                              height: '16px', 
                              border: '2px solid white', 
                              borderTopColor: 'transparent', 
                              borderRadius: '50%', 
                              animation: 'spin 1s linear infinite',
                              marginRight: '8px'
                            }}></div>
                            Calling...
                          </>
                        ) : (
                          <>
                            <Phone style={{ width: '16px', height: '16px', marginRight: '8px' }} /> Call All Contacts
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                {uploadResult && (
                  <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', backgroundColor: uploadResult.error ? '#fee2e2' : '#d1fae5', color: uploadResult.error ? '#dc2626' : '#059669' }}>
                    {uploadResult.error ? uploadResult.error : `✓ Imported ${uploadResult.imported} contacts${uploadResult.errors > 0 ? ` (${uploadResult.errors} errors)` : ''}`}
                  </div>
                )}

                <p style={{ fontSize: '12px', color: '#ab9a82', marginTop: '12px' }}>
                  CSV columns: first_name, last_name, phone, email (optional), property_address (optional)
                </p>
              </div>

              {/* Contacts Table */}
              {contacts.length > 0 ? (
                <div style={{ 
                  overflowX: 'auto', 
                  WebkitOverflowScrolling: 'touch',
                  width: '100%'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f7f6f4' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Name</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Phone</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Email</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact, idx) => (
                      <tr key={contact.id} style={{ borderBottom: idx < contacts.length - 1 ? '1px solid #edeae5' : 'none' }}>
                        <td style={{ padding: '16px', fontWeight: '500', color: '#1e2a45' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button 
                              onClick={() => { setViewingContact(contact); setShowViewContactModal(true); }}
                              style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '6px', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="View contact details"
                            >
                              <Eye style={{ width: '16px', height: '16px' }} />
                            </button>
                            {contact.first_name} {contact.last_name}
                          </div>
                        </td>
                        <td style={{ padding: '16px', color: '#755f4e' }}>{contact.phone}</td>
                        <td style={{ padding: '16px', color: '#755f4e' }}>{contact.email || '-'}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: contact.status === 'pending' ? '#fef3c7' : contact.status === 'called' ? '#d1fae5' : '#e0e7ff',
                            color: contact.status === 'pending' ? '#92400e' : contact.status === 'called' ? '#065f46' : '#3730a3'
                          }}>
                            {contact.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            {contact.status === 'pending' && (
                              <button 
                                onClick={() => callSingleContact(contact.id)} 
                                disabled={callingContactId === contact.id}
                                style={{ 
                                  color: callingContactId === contact.id ? '#99826a' : '#deb040', 
                                  background: 'transparent', 
                                  border: 'none', 
                                  cursor: callingContactId === contact.id ? 'not-allowed' : 'pointer', 
                                  fontWeight: '500', 
                                  fontSize: '14px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  minWidth: '80px'
                                }}
                              >
                                {callingContactId === contact.id ? (
                                  <>
                                    <div style={{ 
                                      width: '14px', 
                                      height: '14px', 
                                      border: '2px solid #deb040', 
                                      borderTopColor: 'transparent', 
                                      borderRadius: '50%', 
                                      animation: 'spin 1s linear infinite'
                                    }}></div>
                                    Calling...
                                  </>
                                ) : (
                                  'Call Now'
                                )}
                              </button>
                            )}
                            <button onClick={() => handleDeleteContact(contact.id)} style={{ color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                              <Trash2 style={{ width: '16px', height: '16px' }} />
                            </button>
                            {contact.status !== 'pending' && (
                              <button
                                onClick={() => callSingleContact(contact.id)}
                                disabled={!!callingContactId}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  padding: '4px 10px', borderRadius: '6px', border: '1px solid #2563eb',
                                  backgroundColor: callingContactId === contact.id ? '#dbeafe' : 'transparent',
                                  color: '#2563eb', cursor: callingContactId === contact.id ? 'not-allowed' : 'pointer',
                                  fontSize: '12px', fontWeight: '500'
                                }}
                              >
                                <Phone style={{ width: '14px', height: '14px' }} />
                                {callingContactId === contact.id ? 'Calling...' : 'Call Again'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  <Users style={{ width: '48px', height: '48px', color: '#c4b9a7', margin: '0 auto 12px' }} />
                  <p style={{ color: '#99826a' }}>No contacts yet</p>
                  <p style={{ fontSize: '14px', color: '#ab9a82', marginTop: '4px' }}>Add contacts manually or upload a CSV to get started</p>
                </div>
              )}
            </div>
          )}

          {/* Calls Tab */}
          {activeTab === 'calls' && (
            <div>
              {calls.length > 0 ? (
                <div style={{ 
                  overflowX: 'auto', 
                  WebkitOverflowScrolling: 'touch',
                  width: '100%'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f7f6f4' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Contact</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Outcome</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Duration</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map((call, idx) => (
                      <tr key={call.id} style={{ borderBottom: idx < calls.length - 1 ? '1px solid #edeae5' : 'none' }}>
                        <td style={{ padding: '16px', fontWeight: '500', color: '#1e2a45' }}>{call.first_name} {call.last_name}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: call.status === 'completed' ? '#d1fae5' : call.status === 'in_progress' ? '#fef3c7' : '#e0e7ff',
                            color: call.status === 'completed' ? '#065f46' : call.status === 'in_progress' ? '#92400e' : '#3730a3'
                          }}>
                            {call.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '16px', color: '#755f4e', textTransform: 'capitalize' }}>{call.outcome?.replace('_', ' ') || '-'}</td>
                        <td style={{ padding: '16px', color: '#755f4e' }}>{call.duration_seconds ? `${call.duration_seconds}s` : '-'}</td>
                        <td style={{ padding: '16px' }}>
                          <Link to={`/calls/${call.id}`} style={{ color: '#deb040', fontWeight: '500', fontSize: '14px', textDecoration: 'none' }}>View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  <Phone style={{ width: '48px', height: '48px', color: '#c4b9a7', margin: '0 auto 12px' }} />
                  <p style={{ color: '#99826a' }}>No calls yet</p>
                  <p style={{ fontSize: '14px', color: '#ab9a82', marginTop: '4px' }}>Start the campaign to begin calling</p>
                </div>
              )}
            </div>
          )}

          {/* Prompt Tab */}
          {activeTab === 'prompt' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>AI Assistant Prompt</h3>
                  <p style={{ fontSize: '14px', color: '#99826a' }}>Edit your prompt below and click Save to sync with Telnyx.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {promptSaved && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', color: '#059669', fontSize: '14px', fontWeight: '500' }}>
                      <CheckCircle2 style={{ width: '16px', height: '16px', marginRight: '6px' }} />
                      Saved!
                    </span>
                  )}
                  <button 
                    onClick={handleSavePrompt}
                    disabled={savingPrompt}
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      padding: '10px 20px', 
                      background: savingPrompt 
                        ? '#dbd5ca' 
                        : 'linear-gradient(to right, #deb040, #c8932f)', 
                      color: savingPrompt ? '#99826a' : '#151c30', 
                      fontWeight: '600', 
                      borderRadius: '8px', 
                      border: 'none', 
                      cursor: savingPrompt ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      minWidth: '140px',
                      justifyContent: 'center'
                    }}
                  >
                    {savingPrompt ? (
                      <>
                        <div style={{ 
                          width: '16px', 
                          height: '16px', 
                          border: '2px solid #151c30', 
                          borderTopColor: 'transparent', 
                          borderRadius: '50%', 
                          animation: 'spin 1s linear infinite',
                          marginRight: '8px'
                        }}></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                        Save Prompt
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Variable Insert Buttons */}
              <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f7f6f4', borderRadius: '8px', border: '1px solid #edeae5' }}>
                <p style={{ fontSize: '12px', color: '#755f4e', marginBottom: '8px', fontWeight: '500' }}>Click to insert contact variables:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { label: 'Owner Name', value: '[Owner Name]' },
                    { label: 'First Name', value: '[First Name]' },
                    { label: 'Last Name', value: '[Last Name]' },
                    { label: 'Phone', value: '{{contact.phone}}' },
                    { label: 'Callback Phone', value: '{{callback_phone}}' },
                    { label: 'Email', value: '{{contact.email}}' },
                    { label: 'Property Address', value: '[Property Address]' },
                    { label: 'Notes', value: '{{contact.notes}}' },
                    { label: `Bot Name (${campaign.bot_name || 'Julia'})`, value: '[Bot Name]' }
                  ].map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => setInlinePrompt(prev => prev + v.value)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: v.value === '[Bot Name]' ? '#e0f2fe' : 'white',
                        border: `1px solid ${v.value === '[Bot Name]' ? '#7dd3fc' : '#dbd5ca'}`,
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#1e2a45',
                        cursor: 'pointer',
                        fontFamily: 'monospace'
                      }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Preview Selector */}
              <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#e8f4f0', borderRadius: '12px', border: '1px solid #a7d7c5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users style={{ width: '18px', height: '18px', color: '#059669' }} />
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#065f46' }}>Preview with contact:</label>
                  </div>
                  <select
                    value={previewContactId}
                    onChange={(e) => setPreviewContactId(e.target.value)}
                    style={{ 
                      padding: '10px 16px', 
                      border: '1px solid #a7d7c5', 
                      borderRadius: '8px', 
                      fontSize: '14px', 
                      outline: 'none', 
                      backgroundColor: 'white',
                      minWidth: '200px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- Select a contact to preview --</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name} ({contact.phone})
                      </option>
                    ))}
                  </select>
                  {previewContactId && (
                    <button
                      onClick={() => setPreviewContactId('')}
                      style={{ 
                        padding: '8px 12px', 
                        backgroundColor: '#fee2e2', 
                        color: '#dc2626', 
                        border: '1px solid #fecaca', 
                        borderRadius: '6px', 
                        fontSize: '12px', 
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Clear Preview
                    </button>
                  )}
                </div>
                {previewContactId && (
                  <p style={{ fontSize: '12px', color: '#059669', marginTop: '8px' }}>
                    Showing how the script will look for this contact. Variables are highlighted in green.
                  </p>
                )}
              </div>

              {/* Prompt Editor or Preview */}
              {previewContactId ? (
                <div>
                  <div style={{ backgroundColor: '#fef3c7', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#92400e' }}>
                      📖 <strong>Preview Mode</strong> - Click "Clear Preview" above to edit the prompt
                    </span>
                  </div>
                  <div style={{ backgroundColor: '#f7f6f4', borderRadius: '12px', padding: '24px', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap', color: '#755f4e', maxHeight: '400px', overflowY: 'auto' }}>
                    <PreviewPromptWithHighlights prompt={inlinePrompt} contact={contacts.find(c => c.id === previewContactId)} botName={inlineBotName} campaign={campaign} />
                  </div>
                </div>
              ) : (
                <textarea
                  value={inlinePrompt}
                  onChange={(e) => setInlinePrompt(e.target.value)}
                  rows={15}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    border: '1px solid #dbd5ca', 
                    borderRadius: '12px', 
                    fontSize: '13px', 
                    fontFamily: 'monospace',
                    outline: 'none', 
                    resize: 'vertical', 
                    boxSizing: 'border-box',
                    backgroundColor: inlinePrompt !== campaign.ai_prompt ? '#fffbeb' : 'white',
                    color: '#755f4e'
                  }}
                  placeholder="Enter your AI prompt here..."
                />
              )}
              
              {(inlinePrompt !== campaign.ai_prompt || inlineGreeting !== campaign.greeting || inlineBotName !== (campaign.bot_name || 'Julia')) && !previewContactId && (
                <p style={{ fontSize: '12px', color: '#b45309', marginTop: '8px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: '8px', height: '8px', backgroundColor: '#f59e0b', borderRadius: '50%', marginRight: '8px' }}></span>
                  You have unsaved changes. Click "Save Prompt" to sync with Telnyx.
                </p>
              )}

              {/* Bot Name */}
              <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1e2a45', marginBottom: '6px' }}>
                  AI Caller Name <span style={{ fontWeight: '400', color: '#0284c7' }}>(replaces [Bot Name], [Your Name] in prompt)</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={inlineBotName}
                    onChange={(e) => setInlineBotName(e.target.value)}
                    placeholder="Julia"
                    style={{ 
                      flex: 1, 
                      padding: '10px 14px', 
                      border: '1px solid #bae6fd', 
                      borderRadius: '8px', 
                      fontSize: '14px', 
                      outline: 'none', 
                      boxSizing: 'border-box',
                      backgroundColor: inlineBotName !== (campaign.bot_name || 'Julia') ? '#fffbeb' : 'white',
                      color: '#1e2a45',
                      fontWeight: '500'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#99826a', marginBottom: '4px' }}>Voice</label>
                  <p style={{ color: '#1e2a45', textTransform: 'capitalize' }}>{campaign.voice}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#99826a', marginBottom: '4px' }}>Language</label>
                  <p style={{ color: '#1e2a45' }}>{campaign.language}</p>
                </div>
              </div>
            </div>
          )}

          {/* Voice Settings Tab */}
          {activeTab === 'voice' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Voice & Call Settings</h3>
                  <p style={{ fontSize: '14px', color: '#99826a' }}>Configure the AI voice, speed, language, and call behavior. Changes sync to Telnyx when saved.</p>
                </div>
                <button 
                  onClick={handleSavePrompt}
                  disabled={savingPrompt}
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    padding: '10px 20px', 
                    background: savingPrompt ? '#dbd5ca' : 'linear-gradient(to right, #deb040, #c8932f)', 
                    color: savingPrompt ? '#99826a' : '#151c30', 
                    fontWeight: '600', 
                    borderRadius: '8px', 
                    border: 'none', 
                    cursor: savingPrompt ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    minWidth: '160px',
                    justifyContent: 'center'
                  }}
                >
                  {savingPrompt ? 'Saving...' : 'Save & Sync to Telnyx'}
                </button>
              </div>

              {/* Voice Selection */}
              <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f7f6f4', borderRadius: '12px', border: '1px solid #edeae5' }}>
                <h4 style={{ fontWeight: '600', color: '#1e2a45', marginBottom: '16px', fontSize: '15px' }}>AI Voice</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { value: 'astra', label: 'Astra', desc: 'Female, Warm & Friendly', gender: 'female' },
                    { value: 'andromeda', label: 'Andromeda', desc: 'Female, Professional', gender: 'female' },
                    { value: 'luna', label: 'Luna', desc: 'Female, Friendly & Upbeat', gender: 'female' },
                    { value: 'athena', label: 'Athena', desc: 'Female, Confident & Clear', gender: 'female' },
                    { value: 'orion', label: 'Orion', desc: 'Male, Professional', gender: 'male' },
                    { value: 'perseus', label: 'Perseus', desc: 'Male, Warm & Reassuring', gender: 'male' },
                    { value: 'atlas', label: 'Atlas', desc: 'Male, Deep & Authoritative', gender: 'male' },
                    { value: 'helios', label: 'Helios', desc: 'Male, Energetic', gender: 'male' }
                  ].map((v) => (
                    <div
                      key={v.value}
                      onClick={() => setInlineVoice(v.value)}
                      style={{
                        padding: '14px 16px',
                        border: `2px solid ${inlineVoice === v.value ? '#deb040' : '#dbd5ca'}`,
                        backgroundColor: inlineVoice === v.value ? '#fbf7e8' : 'white',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: inlineVoice === v.value 
                          ? 'linear-gradient(135deg, #deb040, #c8932f)' 
                          : v.gender === 'female' ? '#fce7f3' : '#dbeafe',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', flexShrink: 0
                      }}>
                        {v.gender === 'female' ? '♀' : '♂'}
                      </div>
                      <div>
                        <p style={{ fontWeight: '600', color: '#1e2a45', fontSize: '14px' }}>{v.label}</p>
                        <p style={{ fontSize: '12px', color: '#99826a' }}>{v.desc}</p>
                      </div>
                      {inlineVoice === v.value && (
                        <CheckCircle2 style={{ width: '20px', height: '20px', color: '#deb040', marginLeft: 'auto' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Voice Speed */}
              <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f7f6f4', borderRadius: '12px', border: '1px solid #edeae5' }}>
                <h4 style={{ fontWeight: '600', color: '#1e2a45', marginBottom: '16px', fontSize: '15px' }}>
                  Voice Speed: <span style={{ color: '#deb040' }}>{inlineVoiceSpeed}x</span>
                </h4>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={inlineVoiceSpeed}
                  onChange={(e) => setInlineVoiceSpeed(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#deb040', cursor: 'pointer', height: '8px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#ab9a82', marginTop: '8px' }}>
                  <span>0.5x Slow</span>
                  <span>0.8x</span>
                  <span>1.0x Normal</span>
                  <span>1.2x</span>
                  <span>1.5x</span>
                  <span>2.0x Fast</span>
                </div>
              </div>

              {/* Language, Time Limit, Bot Name, Voicemail */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '20px', backgroundColor: '#f7f6f4', borderRadius: '12px', border: '1px solid #edeae5' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#755f4e', marginBottom: '8px', textTransform: 'uppercase' }}>Language</label>
                  <select
                    value={inlineLanguage}
                    onChange={(e) => setInlineLanguage(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="en-AU">English (AU)</option>
                    <option value="es-ES">Spanish (Spain)</option>
                    <option value="es-MX">Spanish (Mexico)</option>
                    <option value="fr-FR">French</option>
                    <option value="de-DE">German</option>
                    <option value="it-IT">Italian</option>
                    <option value="pt-BR">Portuguese (Brazil)</option>
                  </select>
                </div>

                <div style={{ padding: '20px', backgroundColor: '#f7f6f4', borderRadius: '12px', border: '1px solid #edeae5' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#755f4e', marginBottom: '8px', textTransform: 'uppercase' }}>Call Time Limit</label>
                  <select
                    value={inlineTimeLimitSecs}
                    onChange={(e) => setInlineTimeLimitSecs(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}
                  >
                    <option value={120}>2 minutes</option>
                    <option value={300}>5 minutes</option>
                    <option value={600}>10 minutes</option>
                    <option value={900}>15 minutes</option>
                    <option value={1800}>30 minutes</option>
                    <option value={3600}>1 hour</option>
                  </select>
                </div>

                <div style={{ padding: '20px', backgroundColor: '#f7f6f4', borderRadius: '12px', border: '1px solid #edeae5' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#755f4e', marginBottom: '8px', textTransform: 'uppercase' }}>AI Caller Name</label>
                  <input
                    type="text"
                    value={inlineBotName}
                    onChange={(e) => setInlineBotName(e.target.value)}
                    placeholder="Julia"
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <p style={{ fontSize: '12px', color: '#ab9a82', marginTop: '6px' }}>The name the AI uses when speaking on calls</p>
                </div>

                <div style={{ padding: '20px', backgroundColor: '#f7f6f4', borderRadius: '12px', border: '1px solid #edeae5' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#755f4e', marginBottom: '8px', textTransform: 'uppercase' }}>Voicemail Detection</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                    <input
                      type="checkbox"
                      id="vm-detection-tab"
                      checked={inlineVoicemailDetection}
                      onChange={(e) => setInlineVoicemailDetection(e.target.checked)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#deb040' }}
                    />
                    <label htmlFor="vm-detection-tab" style={{ fontSize: '14px', color: '#1e2a45', cursor: 'pointer', fontWeight: '500' }}>
                      {inlineVoicemailDetection ? 'Enabled — will detect and leave voicemail' : 'Disabled — will hang up on voicemail'}
                    </label>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div style={{ padding: '16px 20px', backgroundColor: '#e0f2fe', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                <p style={{ fontSize: '13px', color: '#0369a1', margin: 0 }}>
                  <strong>Telnyx Config:</strong> Voice: Telnyx.NaturalHD.{inlineVoice} | Speed: {inlineVoiceSpeed}x | Lang: {inlineLanguage} | Limit: {Math.floor(inlineTimeLimitSecs / 60)}min | VM: {inlineVoicemailDetection ? 'On' : 'Off'} | Bot: {inlineBotName}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Campaign Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: isMobile ? '16px' : '0' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: isMobile ? '24px' : '32px', width: isMobile ? '100%' : '600px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>Edit Campaign</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X style={{ width: '24px', height: '24px', color: '#99826a' }} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Campaign Name *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>
                    AI Caller Name
                  </label>
                  <input
                    type="text"
                    value={editForm.bot_name}
                    onChange={(e) => setEditForm({ ...editForm, bot_name: e.target.value })}
                    placeholder="Julia"
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Type</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}
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
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Voice (Telnyx NaturalHD)</label>
                  <select
                    value={editForm.voice}
                    onChange={(e) => setEditForm({ ...editForm, voice: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}
                  >
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Background Audio</label>
                  <select
                    value={editForm.background_audio}
                    onChange={(e) => setEditForm({ ...editForm, background_audio: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}
                  >
                    <option value="silence">Silence (No Background)</option>
                    <option value="office">Office Environment</option>
                    <option value="cafe">Cafe / Coffee Shop</option>
                    <option value="outdoors">Outdoors / Nature</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Description</label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Brief description of this campaign"
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Caller ID (Telnyx Phone Number) *</label>
                  <input
                    type="tel"
                    value={editForm.caller_id}
                    onChange={(e) => setEditForm({ ...editForm, caller_id: e.target.value })}
                    placeholder="+17324028535"
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Call Time Limit</label>
                  <select
                    value={editForm.time_limit_secs}
                    onChange={(e) => setEditForm({ ...editForm, time_limit_secs: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' }}
                  >
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
                  value={editForm.greeting}
                  onChange={(e) => setEditForm({ ...editForm, greeting: e.target.value })}
                  placeholder="Hello,"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: '12px', color: '#99826a', marginTop: '4px' }}>
                  First words the AI says when the call connects (before following the prompt)
                </p>
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  id="voicemail_detection"
                  checked={editForm.voicemail_detection}
                  onChange={(e) => setEditForm({ ...editForm, voicemail_detection: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="voicemail_detection" style={{ fontSize: '14px', color: '#1e2a45', cursor: 'pointer' }}>
                  <strong>Voicemail Detection</strong> - Automatically detect voicemail and leave a message
                </label>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>AI Prompt *</label>
                
                {/* Variable Insert Buttons */}
                <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f7f6f4', borderRadius: '8px', border: '1px solid #edeae5' }}>
                  <p style={{ fontSize: '12px', color: '#755f4e', marginBottom: '8px', fontWeight: '500' }}>Click to insert contact variables:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      { label: 'First Name', value: '[First Name]' },
                      { label: 'Last Name', value: '[Last Name]' },
                      { label: 'Phone', value: '{{contact.phone}}' },
                      { label: 'Email', value: '{{contact.email}}' },
                      { label: 'Property Address', value: '[Property Address]' },
                      { label: 'Notes', value: '{{contact.notes}}' },
                      { label: 'Bot Name', value: '[Bot Name]' }
                    ].map((v) => (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() => insertVariable(v.value)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'white',
                          border: '1px solid #dbd5ca',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: '#1e2a45',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.backgroundColor = '#deb040';
                          e.target.style.borderColor = '#deb040';
                          e.target.style.color = '#151c30';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.backgroundColor = 'white';
                          e.target.style.borderColor = '#dbd5ca';
                          e.target.style.color = '#1e2a45';
                        }}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  ref={promptTextareaRef}
                  value={editForm.ai_prompt}
                  onChange={(e) => setEditForm({ ...editForm, ai_prompt: e.target.value })}
                  required
                  rows={8}
                  placeholder="Enter instructions for the AI assistant..."
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: '12px', color: '#99826a', marginTop: '8px' }}>
                  Note: Updating the prompt will sync with Telnyx to update your AI assistant.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ padding: '12px 24px', backgroundColor: '#f7f6f4', color: '#1e2a45', fontWeight: '500', borderRadius: '8px', border: '1px solid #dbd5ca', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '12px 24px', background: 'linear-gradient(to right, #deb040, #c8932f)', color: '#151c30', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: isMobile ? '16px' : '0' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: isMobile ? '24px' : '32px', width: isMobile ? '100%' : '500px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>Add Contact</h2>
              <button onClick={() => setShowAddContactModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X style={{ width: '24px', height: '24px', color: '#99826a' }} />
              </button>
            </div>

            <form onSubmit={handleAddContact}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>First Name *</label>
                  <input
                    type="text"
                    value={contactForm.first_name}
                    onChange={(e) => setContactForm({ ...contactForm, first_name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Last Name</label>
                  <input
                    type="text"
                    value={contactForm.last_name}
                    onChange={(e) => setContactForm({ ...contactForm, last_name: e.target.value })}
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Phone Number *</label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  required
                  placeholder="+1234567890"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Email</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="email@example.com"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Property Address</label>
                <input
                  type="text"
                  value={contactForm.property_address}
                  onChange={(e) => setContactForm({ ...contactForm, property_address: e.target.value })}
                  placeholder="123 Main St, City, State"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#1e2a45', marginBottom: '8px' }}>Notes</label>
                <textarea
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Any additional notes about this contact..."
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #dbd5ca', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  style={{ padding: '12px 24px', backgroundColor: '#f7f6f4', color: '#1e2a45', fontWeight: '500', borderRadius: '8px', border: '1px solid #dbd5ca', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingContact}
                  style={{ padding: '12px 24px', background: 'linear-gradient(to right, #deb040, #c8932f)', color: '#151c30', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  {addingContact ? 'Adding...' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add from Contacts Modal */}
      {showAddFromContactsModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: isMobile ? '16px' : '0' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: isMobile ? '24px' : '32px', width: isMobile ? '100%' : '700px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>Add from Contacts</h2>
                <p style={{ fontSize: '14px', color: '#99826a', marginTop: '4px' }}>Select contacts from other campaigns to add to this one</p>
              </div>
              <button onClick={() => setShowAddFromContactsModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X style={{ width: '24px', height: '24px', color: '#99826a' }} />
              </button>
            </div>

            {loadingAllContacts ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
                <div style={{ width: '32px', height: '32px', border: '4px solid #deb040', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              </div>
            ) : allContacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <Users style={{ width: '48px', height: '48px', color: '#c4b9a7', margin: '0 auto 12px' }} />
                <p style={{ color: '#99826a' }}>No contacts found in other campaigns</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#e8f4f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', color: '#065f46' }}>
                    {selectedContactIds.length} contact(s) selected
                  </span>
                  {selectedContactIds.length > 0 && (
                    <button 
                      onClick={() => setSelectedContactIds([])}
                      style={{ fontSize: '12px', color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      Clear selection
                    </button>
                  )}
                </div>

                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #edeae5', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f7f6f4', position: 'sticky', top: 0 }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', width: '40px' }}></th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Name</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Phone</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#755f4e', textTransform: 'uppercase' }}>Campaign</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allContacts.map((contact, idx) => (
                        <tr 
                          key={contact.id} 
                          onClick={() => toggleContactSelection(contact.id)}
                          style={{ 
                            borderBottom: idx < allContacts.length - 1 ? '1px solid #edeae5' : 'none',
                            backgroundColor: selectedContactIds.includes(contact.id) ? '#fef3c7' : 'white',
                            cursor: 'pointer'
                          }}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedContactIds.includes(contact.id)}
                              onChange={() => toggleContactSelection(contact.id)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: '500', color: '#1e2a45' }}>
                            {contact.first_name} {contact.last_name}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#755f4e' }}>{contact.phone}</td>
                          <td style={{ padding: '12px 16px', color: '#755f4e', fontSize: '13px' }}>{contact.campaign_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddFromContactsModal(false)}
                    style={{ padding: '12px 24px', backgroundColor: '#f7f6f4', color: '#1e2a45', fontWeight: '500', borderRadius: '8px', border: '1px solid #dbd5ca', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddFromContacts}
                    disabled={addingFromContacts || selectedContactIds.length === 0}
                    style={{ 
                      padding: '12px 24px', 
                      background: addingFromContacts || selectedContactIds.length === 0 ? '#dbd5ca' : 'linear-gradient(to right, #deb040, #c8932f)', 
                      color: addingFromContacts || selectedContactIds.length === 0 ? '#99826a' : '#151c30', 
                      fontWeight: '600', 
                      borderRadius: '8px', 
                      border: 'none', 
                      cursor: addingFromContacts || selectedContactIds.length === 0 ? 'not-allowed' : 'pointer',
                      minWidth: '180px'
                    }}
                  >
                    {addingFromContacts ? 'Adding...' : `Add ${selectedContactIds.length} Contact(s)`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* View Contact Modal */}
      {showViewContactModal && viewingContact && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: isMobile ? '16px' : '0' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: isMobile ? '24px' : '32px', width: isMobile ? '100%' : '500px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontFamily: 'Playfair Display, serif', fontWeight: '600', color: '#151c30' }}>Contact Details</h2>
              <button onClick={() => { setShowViewContactModal(false); setViewingContact(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X style={{ width: '24px', height: '24px', color: '#99826a' }} />
              </button>
            </div>

            {/* Contact Name Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px', padding: '20px', backgroundColor: '#f7f6f4', borderRadius: '12px' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #deb040, #c8932f)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 12px',
                fontSize: '24px',
                fontWeight: '600',
                color: 'white'
              }}>
                {viewingContact.first_name?.[0]?.toUpperCase()}{viewingContact.last_name?.[0]?.toUpperCase()}
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#151c30', marginBottom: '4px' }}>
                {viewingContact.first_name} {viewingContact.last_name}
              </h3>
              <span style={{ 
                display: 'inline-block',
                padding: '4px 12px', 
                backgroundColor: viewingContact.status === 'completed' ? '#d1fae5' : viewingContact.status === 'called' ? '#fef3c7' : '#e9ecf5',
                color: viewingContact.status === 'completed' ? '#059669' : viewingContact.status === 'called' ? '#d97706' : '#1e2a45',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {viewingContact.status?.replace('_', ' ')}
              </span>
            </div>

            {/* Contact Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#f7f6f4', borderRadius: '8px' }}>
                <Phone style={{ width: '20px', height: '20px', color: '#deb040' }} />
                <div>
                  <p style={{ fontSize: '12px', color: '#99826a', marginBottom: '2px' }}>Phone</p>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#1e2a45' }}>{viewingContact.phone || '-'}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#f7f6f4', borderRadius: '8px' }}>
                <Mail style={{ width: '20px', height: '20px', color: '#deb040' }} />
                <div>
                  <p style={{ fontSize: '12px', color: '#99826a', marginBottom: '2px' }}>Email</p>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#1e2a45' }}>{viewingContact.email || '-'}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', backgroundColor: '#f7f6f4', borderRadius: '8px' }}>
                <MapPin style={{ width: '20px', height: '20px', color: '#deb040', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '12px', color: '#99826a', marginBottom: '2px' }}>Property Address</p>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#1e2a45' }}>{viewingContact.property_address || '-'}</p>
                </div>
              </div>

              {viewingContact.notes && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                  <FileText style={{ width: '20px', height: '20px', color: '#d97706', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '12px', color: '#92400e', marginBottom: '2px' }}>Notes</p>
                    <p style={{ fontSize: '14px', color: '#78350f', whiteSpace: 'pre-wrap' }}>{viewingContact.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => { setShowViewContactModal(false); setViewingContact(null); }}
                style={{ flex: 1, padding: '12px 24px', backgroundColor: '#f7f6f4', color: '#1e2a45', fontWeight: '500', borderRadius: '8px', border: '1px solid #dbd5ca', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
