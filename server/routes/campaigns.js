import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { createAIAssistant, updateAIAssistant, listPhoneNumbers, testConnection, listAIAssistants, createCallControlApp, listCallControlApps, assignPhoneNumberToApp } from '../services/telnyx.js';

const router = express.Router();

// Test Telnyx API connection - MUST be before /:id route
router.get('/test-telnyx', async (req, res) => {
  try {
    console.log('🧪 Testing Telnyx API...');
    const result = await testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List existing AI Assistants from Telnyx
router.get('/telnyx-assistants', async (req, res) => {
  try {
    console.log('📋 Fetching Telnyx AI Assistants...');
    const result = await listAIAssistants();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test Telnyx connection (for Settings page)
router.get('/test-connection', async (req, res) => {
  try {
    const result = await testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get phone numbers from Telnyx (for Settings page)
router.get('/phone-numbers', async (req, res) => {
  try {
    const numbers = await listPhoneNumbers();
    res.json(numbers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI assistants from Telnyx (for Settings page)
router.get('/assistants', async (req, res) => {
  try {
    const result = await listAIAssistants();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const campaigns = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM contacts WHERE campaign_id = c.id) as contact_count,
        (SELECT COUNT(*) FROM calls WHERE campaign_id = c.id) as call_count,
        (SELECT COUNT(*) FROM calls WHERE campaign_id = c.id AND status = 'completed') as completed_calls
      FROM campaigns c
      ORDER BY c.created_at DESC
    `).all();
    
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get single campaign
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const campaign = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM contacts WHERE campaign_id = c.id) as contact_count,
        (SELECT COUNT(*) FROM calls WHERE campaign_id = c.id) as call_count,
        (SELECT COUNT(*) FROM calls WHERE campaign_id = c.id AND status = 'completed') as completed_calls
      FROM campaigns c
      WHERE c.id = ?
    `).get(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// Create new campaign
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { name, type, description, ai_prompt, voice, language, caller_id, greeting, time_limit_secs, voicemail_detection, background_audio, bot_name } = req.body;
    
    console.log('📝 Creating campaign:', name);
    
    const id = uuidv4();
    
    // Create AI Assistant in Telnyx
    let telnyx_assistant_id = null;
    let telnyx_error = null;
    
    try {
      console.log('🤖 Attempting to create Telnyx AI Assistant...');
      const assistant = await createAIAssistant({ 
        name, 
        description,
        ai_prompt, 
        voice, 
        language 
      });
      // Try multiple ways to get the ID
      telnyx_assistant_id = assistant.extractedId || assistant.data?.id || assistant.id || null;
      console.log('✅ Telnyx Assistant ID:', telnyx_assistant_id);
    } catch (err) {
      telnyx_error = err.message;
      console.error('⚠️ Could not create Telnyx assistant:', err.message);
      console.error('   Campaign will be created locally without Telnyx assistant');
    }
    
    db.prepare(`
      INSERT INTO campaigns (id, name, type, description, ai_prompt, voice, language, telnyx_assistant_id, caller_id, greeting, time_limit_secs, voicemail_detection, background_audio, bot_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, type || 'general', description || '', ai_prompt || '', voice || 'astra', language || 'en-US', telnyx_assistant_id, caller_id || null, greeting || 'Hello,', time_limit_secs || 1800, voicemail_detection !== false ? 1 : 0, background_audio || 'silence', bot_name || 'Julia');
    
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    
    // Include warning if Telnyx failed
    const response = { ...campaign };
    if (telnyx_error) {
      response.telnyx_warning = `Telnyx assistant not created: ${telnyx_error}`;
    }
    
    res.status(201).json(response);
  } catch (error) {
    console.error('❌ Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign: ' + error.message });
  }
});

// Update campaign
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { name, type, description, ai_prompt, voice, language, caller_id, status, greeting, time_limit_secs, voicemail_detection, background_audio, bot_name, voice_speed } = req.body;
    
    // Get current campaign to check if we need to update Telnyx
    const currentCampaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    
    if (!currentCampaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Convert undefined to null for SQL compatibility
    const safeValue = (val) => val === undefined ? null : val;
    
    // Update local database
    db.prepare(`
      UPDATE campaigns 
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          description = COALESCE(?, description),
          ai_prompt = COALESCE(?, ai_prompt),
          voice = COALESCE(?, voice),
          language = COALESCE(?, language),
          caller_id = COALESCE(?, caller_id),
          status = COALESCE(?, status),
          greeting = COALESCE(?, greeting),
          time_limit_secs = COALESCE(?, time_limit_secs),
          voicemail_detection = COALESCE(?, voicemail_detection),
          background_audio = COALESCE(?, background_audio),
          bot_name = COALESCE(?, bot_name),
          voice_speed = COALESCE(?, voice_speed),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      safeValue(name), 
      safeValue(type), 
      safeValue(description), 
      safeValue(ai_prompt), 
      safeValue(voice), 
      safeValue(language), 
      safeValue(caller_id), 
      safeValue(status),
      safeValue(greeting),
      safeValue(time_limit_secs),
      voicemail_detection !== undefined ? (voicemail_detection ? 1 : 0) : null,
      safeValue(background_audio),
      safeValue(bot_name),
      safeValue(voice_speed),
      req.params.id
    );
    
    // If campaign has a Telnyx assistant, always sync changes to Telnyx
    let telnyxUpdateError = null;
    let newAssistantId = null;
    
    if (currentCampaign.telnyx_assistant_id) {
      // Check if any relevant field changed
      const shouldUpdate = (name && name !== currentCampaign.name) || 
                          (ai_prompt && ai_prompt !== currentCampaign.ai_prompt) ||
                          (voice && voice !== currentCampaign.voice) ||
                          (voice_speed !== undefined && voice_speed !== currentCampaign.voice_speed) ||
                          (greeting && greeting !== currentCampaign.greeting) ||
                          (time_limit_secs && time_limit_secs !== currentCampaign.time_limit_secs) ||
                          (voicemail_detection !== undefined && voicemail_detection !== !!currentCampaign.voicemail_detection);
      
      if (shouldUpdate) {
        try {
          console.log('🔄 Syncing changes to Telnyx assistant...');
          // Pass ALL campaign settings to Telnyx (use new values or fall back to current)
          const result = await updateAIAssistant(currentCampaign.telnyx_assistant_id, {
            name: name || currentCampaign.name,
            ai_prompt: ai_prompt || currentCampaign.ai_prompt,
            voice: voice || currentCampaign.voice,
            voice_speed: voice_speed || currentCampaign.voice_speed || 1.0,
            greeting: greeting || currentCampaign.greeting,
            time_limit_secs: time_limit_secs || currentCampaign.time_limit_secs,
            voicemail_detection: voicemail_detection !== undefined ? voicemail_detection : !!currentCampaign.voicemail_detection,
            caller_id: caller_id || currentCampaign.caller_id
          });
          newAssistantId = result.extractedId || result.data?.id;
          console.log('✅ Telnyx assistant updated, new ID:', newAssistantId);
          
          // Update the assistant ID in the database if it changed
          if (newAssistantId && newAssistantId !== currentCampaign.telnyx_assistant_id) {
            db.prepare('UPDATE campaigns SET telnyx_assistant_id = ? WHERE id = ?')
              .run(newAssistantId, req.params.id);
          }
        } catch (err) {
          telnyxUpdateError = err.message;
          console.error('⚠️ Failed to update Telnyx assistant:', err.message);
        }
      }
    }
    
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    
    // Include warning if Telnyx update failed
    const response = { ...campaign };
    if (telnyxUpdateError) {
      response.telnyx_warning = `Local changes saved, but Telnyx update failed: ${telnyxUpdateError}`;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Delete campaign
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Reset campaign (delete calls, reset contacts to pending)
router.post('/:id/reset', async (req, res) => {
  try {
    const db = await getDb();
    const campaignId = req.params.id;
    
    // Verify campaign exists
    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    console.log('🔄 Resetting campaign:', campaignId);
    
    // Delete all calls for this campaign
    db.prepare('DELETE FROM calls WHERE campaign_id = ?').run(campaignId);
    console.log('   Deleted calls');
    
    // Reset all contacts to pending status
    db.prepare('UPDATE contacts SET status = ? WHERE campaign_id = ?').run('pending', campaignId);
    console.log('   Reset contacts to pending');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error resetting campaign:', error);
    res.status(500).json({ error: 'Failed to reset campaign: ' + error.message });
  }
});

// Pause campaign
router.post('/:id/pause', async (req, res) => {
  try {
    const db = await getDb();
    db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run('paused', req.params.id);
    res.json({ success: true, status: 'paused' });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({ error: 'Failed to pause campaign' });
  }
});

// Resume campaign
router.post('/:id/resume', async (req, res) => {
  try {
    const db = await getDb();
    db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run('active', req.params.id);
    res.json({ success: true, status: 'active' });
  } catch (error) {
    console.error('Error resuming campaign:', error);
    res.status(500).json({ error: 'Failed to resume campaign' });
  }
});

// Get available phone numbers
router.get('/phone-numbers/available', async (req, res) => {
  try {
    const numbers = await listPhoneNumbers();
    res.json(numbers);
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    res.status(500).json({ error: 'Failed to fetch phone numbers' });
  }
});

// Setup Telnyx - create Call Control App and assign phone number
router.post('/setup-telnyx', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    
    console.log('🔧 Setting up Telnyx Call Control...');
    
    // Check for existing Call Control Apps
    let apps = await listCallControlApps();
    let appId = null;
    
    // Find existing EstateReach app or create new one
    const existingApp = apps.find(app => app.application_name?.includes('EstateReach'));
    
    if (existingApp) {
      appId = existingApp.id;
      console.log('✅ Found existing Call Control App:', appId);
    } else {
      // Create new Call Control App
      const newApp = await createCallControlApp('EstateReach Outbound', webhookUrl || 'https://example.com/webhook');
      appId = newApp.data?.id;
      console.log('✅ Created new Call Control App:', appId);
    }
    
    // Get phone numbers and assign to app
    const phoneNumbers = await listPhoneNumbers();
    let assignedNumber = null;
    
    if (phoneNumbers.length > 0) {
      const phoneNumber = phoneNumbers[0];
      try {
        await assignPhoneNumberToApp(phoneNumber.id, appId);
        assignedNumber = phoneNumber.phone_number;
        console.log('✅ Assigned phone number:', assignedNumber);
      } catch (assignError) {
        console.log('⚠️ Phone number may already be assigned');
        assignedNumber = phoneNumber.phone_number;
      }
    }
    
    res.json({
      success: true,
      connectionId: appId,
      phoneNumber: assignedNumber,
      message: 'Telnyx setup complete! Add these to your .env file.'
    });
  } catch (error) {
    console.error('Error setting up Telnyx:', error);
    res.status(500).json({ error: 'Failed to setup Telnyx: ' + error.message });
  }
});

// Get current Telnyx setup status
router.get('/telnyx-status', async (req, res) => {
  try {
    const apps = await listCallControlApps();
    const phoneNumbers = await listPhoneNumbers();
    const connectionId = process.env.TELNYX_CONNECTION_ID;
    
    res.json({
      hasCallControlApp: apps.length > 0,
      callControlApps: apps.map(app => ({ id: app.id, name: app.application_name })),
      phoneNumbers: phoneNumbers.map(p => ({ id: p.id, number: p.phone_number, connectionId: p.connection_id })),
      configuredConnectionId: connectionId || null,
      isConfigured: !!connectionId && apps.some(app => app.id === connectionId)
    });
  } catch (error) {
    console.error('Error checking Telnyx status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Campaign templates for quick creation
router.get('/templates/list', (req, res) => {
  const templates = [
    {
      id: 'pre_foreclosure_full',
      name: 'Pre-Foreclosure Outreach (Full Script)',
      type: 'pre_foreclosure',
      description: 'Complete outbound script for homeowners in pre-foreclosure — discovery, value, objections, and close',
      ai_prompt: `## IDENTITY & PURPOSE
You are a compassionate and professional AI assistant calling on behalf of Ken LePosa with Coldwell Banker Realty. You help homeowners facing pre-foreclosure or foreclosure explore their options with respect and empathy.

## VOICE & TONE
- Speak in a calm, warm, and empathetic tone
- Be professional but human — not robotic or scripted-sounding
- Listen more than you talk
- Never be pushy or salesy
- Use natural pauses and conversational language
- Show genuine understanding of their stressful situation

## CALL FLOW

### 1. OPENING (First 10–15 Seconds)
"Hello, may I speak with {{contact.first_name}} please? My name is {{bot_name}} with Coldwell Banker Realty. I work with homeowners in situations like yours to find fast, respectful solutions. Do you have two minutes to talk?"

### 2. BRIEF RAPPORT + PERMISSION
"Thank you. I know this can be a stressful time — I'll be brief. I'm not calling to sell anything; I help homeowners explore options so they can stop foreclosure and move forward."

### 3. DISCOVERY QUESTIONS (Ask 2–3)
- "Can I ask if you're currently working with your lender or an attorney about the notice?"
- "Are you behind by about how many months?"
- "Is the property occupied, and do you need to move quickly if a solution is found?"

### 4. VALUE STATEMENT
"Depending on your situation, there are a few realistic options that may help avoid foreclosure: arranging a short sale, negotiating a deed-in-lieu, connecting you with a cash buyer for a quick closing, or listing the home for a fast sale. Ken's role is to present the options, handle the paperwork and lender communication, and help you move forward quickly and cleanly with minimal hassle."

### 5. TAILORED OFFER
If they need to move fast:
"Ken works with qualified cash buyers who can close in as little as 7–14 days, which may help you avoid the long foreclosure process."

If lender negotiation is needed:
"Ken can prepare a short sale package and negotiate with the lender to pursue approval, which often pauses foreclosure proceedings while we work through it."

### 6. HANDLE OBJECTIONS

If "I don't have money / I can't pay you":
"You won't owe anything out-of-pocket for the process; the fee is typically paid at closing from sale proceeds. The goal is to create a workable outcome, not add costs today."

If "I'm not ready to sell":
"I understand. Even if you aren't ready, it might help to know your options so you can make an informed choice. Would you be open to a short 15-minute appointment to review them?"

If "I already have someone":
"That's good to hear. Would you mind if Ken checks in later? If anything falls through, he'd be happy to help."

If "Don't call again / Do Not Call":
"I apologize for the disturbance. I'll remove your number immediately and you won't receive further calls."

### 7. CALL TO ACTION
"If you're open, Ken can put together a no-obligation plan and possible timelines. What's the best time to meet for 15 minutes — today or tomorrow?"

If yes: Confirm date and time, confirm phone/email, ask for property access details if needed, explain next steps, reassure confidentiality.

### 8. COMPLIANCE CLOSE
"Ken is not your attorney or financial advisor; he recommends consulting your lender or attorney about any agreements. His job is to provide solutions and manage the sale process if you choose one. Thank you for your time — he'll follow up at [agreed time]."

## COMPLIANCE RULES
- Never promise specific outcomes like "guaranteed to stop foreclosure"
- Use phrases like "may help" or "options that could help avoid foreclosure"
- Always offer to remove from call list if requested
- Log any opt-out requests immediately
- Keep calls concise — aim to secure a 15-minute meeting, not solve everything on the call

## IF VOICEMAIL
"Hello — this is {{bot_name}} calling on behalf of Ken LePosa with Coldwell Banker Realty regarding the property at {{contact.property_address}}. We offer a no-cost, no-obligation consultation to discuss options that may help in your situation. Please call {{callback_phone}} to schedule a convenient time. If you prefer not to receive calls, reply STOP or call to opt out. Thank you."

## CONTACT INFO
Agent: Ken LePosa
Company: Coldwell Banker Realty
Phone: {{callback_phone}}`
    },
    {
      id: 'cash_buyer_quick',
      name: 'Cash Buyer / Quick Close Pitch',
      type: 'cash_buyer',
      description: 'Short, direct pitch for homeowners who need to sell fast — 7 to 14 day cash close',
      ai_prompt: `## IDENTITY & PURPOSE
You are a professional AI assistant calling on behalf of Ken LePosa with Coldwell Banker Realty. You specialize in connecting homeowners with qualified cash buyers for quick closings.

## VOICE & TONE
- Calm, confident, and empathetic
- Direct but not pushy
- Emphasize speed and simplicity

## CALL FLOW

### OPENING
"Hi {{contact.first_name}}, I'm {{bot_name}} with Coldwell Banker Realty. I help homeowners in pre-foreclosure sell quickly — sometimes for cash in 7–14 days — to help avoid foreclosure. Would you be open to a short, no-obligation plan to see if that could work for you?"

### IF INTERESTED
"Great. Ken works with qualified cash buyers who can close quickly with no repairs needed. He handles all the paperwork, lender communication, and logistics. There's no cost to you out-of-pocket — any fee comes from the sale proceeds at closing."

### DISCOVERY
- "Is the property currently occupied?"
- "Are you behind on payments, and roughly how many months?"
- "Have you received any formal notices from the lender?"

### CLOSE
"Ken can put together a cash offer timeline within 24–48 hours. What's the best time for a 15-minute call — today or tomorrow?"

### OBJECTIONS
If "I'm not ready": "No pressure at all. Would it help just to know what a cash offer might look like, so you have options?"
If "Sounds too good to be true": "I understand the skepticism. Ken can walk you through recent closings and references. It's a straightforward process."

### COMPLIANCE
- Never guarantee specific dollar amounts or timelines
- Always offer opt-out: "If you'd prefer not to be contacted, just say the word and I'll remove you immediately."

## IF VOICEMAIL
"Hello — this is {{bot_name}} calling on behalf of Ken LePosa with Coldwell Banker Realty. We work with cash buyers who can close in as little as 7–14 days. Call {{callback_phone}} for a free, no-obligation consultation. Reply STOP to opt out. Thank you."

## CONTACT INFO
Agent: Ken LePosa | Phone: {{callback_phone}}`
    },
    {
      id: 'short_sale_negotiation',
      name: 'Short Sale / Lender Negotiation',
      type: 'short_sale',
      description: 'For homeowners who need lender negotiation, short sale packages, or deed-in-lieu options',
      ai_prompt: `## IDENTITY & PURPOSE
You are a professional AI assistant calling on behalf of Ken LePosa with Coldwell Banker Realty. You help homeowners explore short sale and lender negotiation options to avoid foreclosure.

## VOICE & TONE
- Calm, knowledgeable, and reassuring
- Emphasize that this process can pause foreclosure proceedings
- Be patient — these homeowners are often overwhelmed

## CALL FLOW

### OPENING
"Hello, may I speak with {{contact.first_name}}? This is {{bot_name}} calling on behalf of Ken LePosa with Coldwell Banker Realty. I'm reaching out because we help homeowners negotiate with lenders to explore alternatives to foreclosure. Do you have two minutes?"

### IF THEY AGREE
"Thank you. Ken specializes in preparing short sale packages and negotiating with lenders. This process often pauses foreclosure proceedings while we work through approval — giving you time and options."

### DISCOVERY
- "Are you currently in communication with your lender about the situation?"
- "Have you received a notice of default or lis pendens?"
- "Do you owe more on the mortgage than the property is currently worth?"
- "Are you working with an attorney?"

### VALUE
"Ken can prepare a complete short sale package, submit it to your lender, and negotiate on your behalf. Many lenders prefer a short sale over foreclosure — it's less costly for them too. This process typically pauses proceedings and gives you a clean resolution."

### OBJECTIONS
If "I can't afford anything": "There's no out-of-pocket cost. Ken's fee is paid from the sale proceeds at closing."
If "My lender won't work with me": "Lenders often respond differently to a professional short sale package than to individual homeowner requests. Ken has experience navigating this."
If "I already have an attorney": "That's great — Ken works alongside attorneys regularly. Would it be helpful to have Ken review the situation as a second opinion?"

### CLOSE
"Would you be open to a 15-minute call with Ken to review your specific situation and see if a short sale or lender negotiation could work? What time works best?"

## COMPLIANCE
- Never guarantee lender approval or specific outcomes
- Recommend consulting their attorney for legal advice
- Always offer opt-out

## IF VOICEMAIL
"Hello — this is {{bot_name}} calling on behalf of Ken LePosa with Coldwell Banker Realty regarding {{contact.property_address}}. Ken helps homeowners negotiate with lenders to explore short sale options and alternatives to foreclosure. Call {{callback_phone}} for a free consultation. Reply STOP to opt out."

## CONTACT INFO
Agent: Ken LePosa | Phone: {{callback_phone}}`
    },
    {
      id: 'live_verification',
      name: 'Live Call Verification',
      type: 'live_verification',
      description: 'Verify identity, confirm property status, and schedule an appointment with the agent',
      ai_prompt: `## IDENTITY & PURPOSE
You are a professional AI assistant calling on behalf of Ken LePosa with Coldwell Banker Realty. Your job is to verify the homeowner's identity, confirm property status, and schedule a consultation.

## VOICE & TONE
- Polite, clear, and efficient
- Respectful of their time
- Professional and structured

## CALL FLOW

### 1. GREETING & IDENTITY VERIFICATION
"Hello — may I speak with {{contact.first_name}} {{contact.last_name}}, please? This is {{bot_name}} calling on behalf of Ken LePosa with Coldwell Banker Realty. Is this a good time to speak for a minute?"

### 2. CONFIRM PROPERTY & PURPOSE
"Thank you. I'm calling because public records indicate your property at {{contact.property_address}} is in pre-foreclosure or foreclosure status. We're reaching out to offer a no-cost, no-obligation conversation about sale or options that may ease your situation. Is this something you'd be open to discussing briefly now?"

### 3. IF THEY AGREE
"I understand this is stressful — we aim to be helpful and respectful. May I ask a couple quick questions so Ken can provide the most useful information when following up?"

### 4. QUALIFYING QUESTIONS
- "Is this still your primary residence?"
- "Are you currently working with an attorney or real estate agent on this matter?"
- "Would you prefer an in-person appointment or a phone consultation with Ken?"

### 5. SCHEDULE APPOINTMENT
"Ken is available [Option 1] or [Option 2]. Which works better for you?"
- Repeat date and time to confirm
- Confirm contact details (phone and email)
- Provide Ken's phone number: {{callback_phone}}

### 6. FINAL CLOSE
"Thank you. We'll send a confirmation by phone or text. If you'd prefer not to receive further calls, say STOP or tell me now and we'll remove you from our list. We appreciate your time."

## OBJECTIONS
If "Not interested": "I understand — this is simply a no-cost option if you ever want help. If you change your mind, you can call {{callback_phone}}. Would you like me to remove you from our call list?"
If "Wrong number": "Thank you for letting me know. I'll update our records and stop calls to this number immediately."
If "Working with someone already": "That's good to hear — we don't want to interfere. Would you like me to note that and stop follow-ups?"
If "Call me later": "Of course. When would be a better time, or would you prefer a text to set it up?"
If "Don't call again": "I apologize for the disturbance. I'll remove your number immediately."

## CONTACT INFO
Agent: Ken LePosa | Phone: {{callback_phone}}`
    },
    {
      id: 'follow_up_reengagement',
      name: 'Follow Up / Re-Engagement',
      type: 'follow_up',
      description: 'Check back with homeowners who said "call me later" or had a previous conversation',
      ai_prompt: `## IDENTITY & PURPOSE
You are a professional AI assistant following up on behalf of Ken LePosa with Coldwell Banker Realty. You're reconnecting with a homeowner who previously spoke with us or requested a callback.

## VOICE & TONE
- Warm, friendly, and non-pressuring
- Reference the previous conversation naturally
- Respect that circumstances may have changed

## CALL FLOW

### OPENING
"Hi {{contact.first_name}}, this is {{bot_name}} calling on behalf of Ken LePosa with Coldwell Banker Realty. We spoke previously about your property situation, and Ken asked me to follow up and see how things are going. Do you have a minute?"

### IF THEY REMEMBER
"Great. Ken wanted me to check in — has anything changed with your situation since we last spoke? Are you still exploring options?"

### IF THEY DON'T REMEMBER
"No problem. Ken LePosa works with homeowners facing foreclosure to explore solutions — things like short sales, cash buyers, or lender negotiation. He wanted to make sure you knew the offer to help still stands."

### DISCOVERY
- "Have you made any progress with your lender?"
- "Is there anything new with your situation?"
- "Would you be open to scheduling that 15-minute consultation we discussed?"

### CLOSE
"Ken is still happy to put together a no-obligation plan if you're interested. Would [time option 1] or [time option 2] work for a quick call?"

### OBJECTIONS
If "I already handled it": "That's great to hear! Glad things worked out. If anything comes up in the future, Ken's always available at {{callback_phone}}."
If "Still not ready": "No rush at all. Would you like Ken to check in again in a couple weeks, or would you prefer to reach out when you're ready?"

## CONTACT INFO
Agent: Ken LePosa | Phone: {{callback_phone}}`
    },
    {
      id: 'voicemail_drop',
      name: 'Voicemail Drop',
      type: 'voicemail_drop',
      description: 'Pre-recorded voicemail message for homeowners who don\'t answer',
      ai_prompt: `## IDENTITY & PURPOSE
You are an AI assistant leaving a voicemail on behalf of Ken LePosa with Coldwell Banker Realty.

## VOICEMAIL SCRIPT
"Hello — this is {{bot_name}} calling on behalf of Ken LePosa with Coldwell Banker Realty regarding the property at {{contact.property_address}}. We offer a no-cost, no-obligation consultation to discuss options that may help in your situation. Please call {{callback_phone}} to schedule a convenient time. If you prefer not to receive calls, reply STOP or call to opt out. Thank you."

## RULES
- Keep the message under 30 seconds
- Speak clearly and at a moderate pace
- State the callback number twice if time allows
- Always include the opt-out instruction
- Do not leave detailed property or financial information in voicemail

## CONTACT INFO
Agent: Ken LePosa | Phone: {{callback_phone}}`
    },
    {
      id: 'sms_follow_up',
      name: 'SMS Follow-Up',
      type: 'sms_follow_up',
      description: 'Text message template for follow-up after call or as initial outreach',
      ai_prompt: `## IDENTITY & PURPOSE
You are sending an SMS follow-up on behalf of Ken LePosa with Coldwell Banker Realty.

## SMS TEMPLATES

### Initial Outreach SMS
"This is Ken LePosa with Coldwell Banker Realty. We received public record notice for {{contact.property_address}}. Call {{callback_phone}} to schedule a free, confidential consult or reply STOP to opt out."

### Post-Call Follow-Up SMS
"Hi {{contact.first_name}}, this is Ken LePosa following up on our call. I'm available to discuss your options at your convenience. Call or text {{callback_phone}}. Reply STOP to opt out."

### Appointment Confirmation SMS
"Hi {{contact.first_name}}, confirming your appointment with Ken LePosa on [DATE] at [TIME]. Call {{callback_phone}} if you need to reschedule. Reply STOP to opt out."

## RULES
- Keep messages under 160 characters when possible
- Always include STOP opt-out language
- Never include sensitive financial details in text
- Include callback number in every message

## CONTACT INFO
Agent: Ken LePosa | Phone: {{callback_phone}}`
    },
    {
      id: 'quick_empathy',
      name: 'Quick Empathy Intro',
      type: 'pre_foreclosure',
      description: 'Short, empathetic version of the pre-foreclosure outreach — great for high-volume dialing',
      ai_prompt: `## IDENTITY & PURPOSE
You are a compassionate AI assistant calling on behalf of Ken LePosa with Coldwell Banker Realty. This is a shorter, empathy-first version of the outreach script for high-volume campaigns.

## VOICE & TONE
- Warm, empathetic, and brief
- Lead with understanding, not a pitch
- Respect their time

## CALL FLOW

### OPENING
"Hi {{contact.first_name}}, I know this is stressful. I'm {{bot_name}} calling on behalf of Ken LePosa with Coldwell Banker Realty. Ken helps people explore options to stop foreclosure and move on quickly. Can we schedule 15 minutes to review options that might help you move forward fast and cleanly?"

### IF YES
"Great. Ken is available [option 1] or [option 2]. Which works better?"
- Confirm date, time, phone, and email
- "Ken will call you at that time. If anything comes up, reach him at {{callback_phone}}."

### IF HESITANT
"No pressure at all. Even a quick 15-minute call could give you clarity on what's possible. Would tomorrow work better?"

### IF NO
"I completely understand. If you change your mind, Ken can be reached at {{callback_phone}}. Would you like me to remove you from our list?"

### OBJECTIONS
If "I don't have money": "There's no out-of-pocket cost — Ken's fee comes from sale proceeds at closing."
If "Already have someone": "That's good to hear. Would you mind if Ken checks in later as a backup?"
If "Don't call again": "I'll remove your number right away. Thank you for letting me know."

## CONTACT INFO
Agent: Ken LePosa | Phone: {{callback_phone}}`
    }
  ];
  
  res.json(templates);
});

export default router;
