import express from 'express';
import { getDb } from '../db/init.js';
import { broadcast } from '../index.js';
import { startAIConversation } from '../services/telnyx.js';
import { calculateLeadScore } from '../services/leadScoring.js';

const router = express.Router();

// Telnyx webhook handler
router.post('/telnyx', async (req, res) => {
  try {
    const event = req.body;
    const eventType = event.data?.event_type;
    const payload = event.data?.payload;
    
    console.log('Telnyx webhook received:', eventType);
    
    // Decode client state if present
    let clientState = {};
    if (payload?.client_state) {
      try {
        clientState = JSON.parse(Buffer.from(payload.client_state, 'base64').toString());
      } catch (e) {
        console.warn('Could not decode client state');
      }
    }
    
    const db = await getDb();
    let callId = clientState.call_id;
    
    // If no call_id in client state, try to find by telnyx_call_id
    if (!callId && payload?.call_control_id) {
      const existingCall = db.prepare('SELECT id FROM calls WHERE telnyx_call_id = ?').get(payload.call_control_id);
      if (existingCall) {
        callId = existingCall.id;
        console.log('Found call by telnyx_call_id:', callId);
      }
    }
    
    // Also try matching by call_sid for TeXML calls
    if (!callId && payload?.call_sid) {
      const existingCall = db.prepare('SELECT id FROM calls WHERE telnyx_call_id = ?').get(payload.call_sid);
      if (existingCall) {
        callId = existingCall.id;
        console.log('Found call by call_sid:', callId);
      }
    }
    
    if (!callId) {
      console.log('No matching call found for webhook event:', eventType);
      return res.status(200).json({ received: true });
    }
    
    // Log event
    db.prepare(`
      INSERT INTO call_events (call_id, event_type, event_data)
      VALUES (?, ?, ?)
    `).run(callId, eventType, JSON.stringify(payload));
    
    switch (eventType) {
      case 'call.initiated':
        db.prepare(`UPDATE calls SET status = 'ringing' WHERE id = ?`).run(callId);
        break;
        
      case 'call.answered':
        db.prepare(`UPDATE calls SET status = 'in_progress' WHERE id = ?`).run(callId);
        
        // Start AI conversation
        const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(callId);
        const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(call?.campaign_id);
        const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(call?.contact_id);
        
        if (campaign?.telnyx_assistant_id) {
          try {
            await startAIConversation(
              payload.call_control_id,
              campaign.telnyx_assistant_id,
              {
                contact_name: `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim(),
                property_address: contact?.property_address,
                campaign_type: campaign.type
              }
            );
          } catch (err) {
            console.error('Error starting AI conversation:', err);
          }
        }
        break;
        
      case 'call.hangup':
        const duration = payload.duration_seconds || 0;
        db.prepare(`
          UPDATE calls
          SET status = 'completed', duration_seconds = ?, ended_at = datetime('now')
          WHERE id = ?
        `).run(duration, callId);

        // Estimate cost: ~$0.02/min for Telnyx outbound calls
        const durationMins = Math.ceil(duration / 60);
        const estimatedCost = durationMins * 0.02;
        db.prepare('UPDATE calls SET estimated_cost = ? WHERE id = ?').run(estimatedCost, callId);

        // Update contact status
        const callRecord = db.prepare('SELECT * FROM calls WHERE id = ?').get(callId);
        if (callRecord) {
          const contactId = callRecord.contact_id;
          const campaignId = callRecord.campaign_id;

          db.prepare(`
            UPDATE contacts SET status = 'called'
            WHERE id = ?
          `).run(contactId);

          // Determine outcome for retry logic
          const outcome = callRecord.outcome;

          // Handle retries for no-answer/voicemail
          if (['voicemail', 'no_answer'].includes(outcome)) {
            const hangupCampaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
            const hangupContact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
            if (hangupCampaign && hangupContact) {
              const attempts = (hangupContact.call_attempts || 0) + 1;
              const maxRetries = hangupCampaign.max_retries || 1;
              if (attempts < maxRetries) {
                const retryHours = hangupCampaign.retry_delay_hours || 48;
                const nextRetry = new Date(Date.now() + retryHours * 3600 * 1000).toISOString();
                db.prepare('UPDATE contacts SET call_attempts = ?, next_retry_at = ?, status = ? WHERE id = ?')
                  .run(attempts, nextRetry, 'pending', contactId);
              }
              db.prepare('UPDATE contacts SET call_attempts = ?, last_called_at = ? WHERE id = ?')
                .run(attempts, new Date().toISOString(), contactId);
            }
          }

          // Recalculate lead score after call hangup
          try {
            const hangupContactForScore = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
            const contactCallsForScore = db.prepare('SELECT * FROM calls WHERE contact_id = ? ORDER BY created_at DESC').all(contactId);
            const newScore = calculateLeadScore(hangupContactForScore, contactCallsForScore);
            db.prepare('UPDATE contacts SET lead_score = ? WHERE id = ?').run(newScore, contactId);
          } catch (scoreErr) {
            console.error('Lead score update error:', scoreErr.message);
          }

          // Send SMS follow-up if enabled
          try {
            const smsCampaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
            const smsContact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId);
            if (smsCampaign && smsCampaign.sms_follow_up && smsCampaign.sms_template && smsContact) {
              const { sendSMS, personalizeTemplate } = await import('../services/sms.js');
              const message = personalizeTemplate(smsCampaign.sms_template, smsContact, smsCampaign);
              if (message) {
                await sendSMS(smsCampaign.caller_id, smsContact.phone, message);
              }
            }
          } catch (smsErr) {
            console.error('SMS follow-up error:', smsErr.message);
          }
        }
        break;
        
      case 'call.machine.detection.ended':
        const machineResult = payload.result;
        if (machineResult === 'machine') {
          db.prepare(`
            UPDATE calls SET status = 'voicemail', outcome = 'voicemail'
            WHERE id = ?
          `).run(callId);
        }
        break;
        
      case 'call.recording.saved':
        db.prepare(`
          UPDATE calls SET recording_url = ?
          WHERE id = ?
        `).run(payload.recording_urls?.mp3 || payload.public_recording_urls?.mp3, callId);
        break;
        
      case 'call.transcription':
        const existingCall = db.prepare('SELECT transcript FROM calls WHERE id = ?').get(callId);
        const newTranscript = existingCall?.transcript 
          ? existingCall.transcript + '\n' + payload.transcription_data?.transcript
          : payload.transcription_data?.transcript;
        
        db.prepare(`UPDATE calls SET transcript = ? WHERE id = ?`).run(newTranscript, callId);
        break;
        
      case 'ai.assistant.function_call':
        // Handle AI function calls
        const functionName = payload.function_call?.name;
        const functionArgs = payload.function_call?.arguments;
        
        if (functionName === 'schedule_appointment') {
          const apptTime = typeof functionArgs === 'object' ? (functionArgs?.date || functionArgs?.time || JSON.stringify(functionArgs)) : functionArgs;
          db.prepare(`
            UPDATE calls SET outcome = 'appointment_scheduled', summary = ?, appointment_at = ?
            WHERE id = ?
          `).run(JSON.stringify(functionArgs), apptTime, callId);
          
          const apptCall = db.prepare('SELECT contact_id FROM calls WHERE id = ?').get(callId);
          if (apptCall) {
            db.prepare(`
              UPDATE contacts SET status = 'converted'
              WHERE id = ?
            `).run(apptCall.contact_id);
          }
        } else if (functionName === 'mark_not_interested') {
          db.prepare(`
            UPDATE calls SET outcome = 'not_interested', summary = ?
            WHERE id = ?
          `).run(functionArgs?.reason, callId);
          
          const niCall = db.prepare('SELECT contact_id FROM calls WHERE id = ?').get(callId);
          if (niCall) {
            db.prepare(`
              UPDATE contacts SET status = 'not_interested'
              WHERE id = ?
            `).run(niCall.contact_id);
          }
          // Add to DNC if requested
          const contactForDnc = db.prepare('SELECT c.phone FROM calls cl JOIN contacts c ON cl.contact_id = c.id WHERE cl.id = ?').get(callId);
          if (contactForDnc?.phone) {
            try {
              db.prepare(`INSERT OR IGNORE INTO do_not_call (phone, reason) VALUES (?, ?)`).run(contactForDnc.phone, 'Not interested');
            } catch (e) { /* ignore */ }
          }
        } else if (functionName === 'request_callback') {
          const cbTime = typeof functionArgs === 'object' ? (functionArgs?.preferred_time || functionArgs?.time || JSON.stringify(functionArgs)) : functionArgs;
          db.prepare(`
            UPDATE calls SET outcome = 'callback_requested', summary = ?, callback_preferred_at = ?
            WHERE id = ?
          `).run(JSON.stringify(functionArgs), cbTime, callId);

          const cbCall = db.prepare('SELECT contact_id FROM calls WHERE id = ?').get(callId);
          if (cbCall) {
            db.prepare(`
              UPDATE contacts SET status = 'callback'
              WHERE id = ?
            `).run(cbCall.contact_id);
          }
        }

        // Recalculate lead score after function call outcome
        {
          const fnCallRecord = db.prepare('SELECT contact_id FROM calls WHERE id = ?').get(callId);
          if (fnCallRecord?.contact_id) {
            try {
              const fnContact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(fnCallRecord.contact_id);
              const fnContactCalls = db.prepare('SELECT * FROM calls WHERE contact_id = ? ORDER BY created_at DESC').all(fnCallRecord.contact_id);
              const fnScore = calculateLeadScore(fnContact, fnContactCalls);
              db.prepare('UPDATE contacts SET lead_score = ? WHERE id = ?').run(fnScore, fnCallRecord.contact_id);
            } catch (scoreErr) {
              console.error('Lead score update error:', scoreErr.message);
            }
          }
        }
        break;
        
      case 'ai.assistant.conversation.ended':
        // AI conversation summary
        if (payload.conversation_summary) {
          db.prepare(`
            UPDATE calls SET summary = COALESCE(summary, '') || ?
            WHERE id = ?
          `).run('\n\n' + payload.conversation_summary, callId);
        }
        break;
    }
    
    // Broadcast update to connected clients
    const updatedCall = db.prepare(`
      SELECT cl.*, ct.first_name, ct.last_name, ct.phone
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      WHERE cl.id = ?
    `).get(callId);
    
    if (updatedCall) {
      broadcast({ type: 'call_update', call: updatedCall });
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Test webhook endpoint - returns success if request reaches server
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Webhook URL is reachable', timestamp: new Date().toISOString() });
});

// ── AI Tool Webhook Endpoints ──────────────────────────────
// These are called directly by Telnyx AI Assistant during a live call
// when the AI decides to invoke a tool (schedule_appointment, etc.)

// Schedule appointment - AI collected date/time from the contact
router.post('/ai-tool/schedule_appointment', async (req, res) => {
  try {
    const db = await getDb();
    const { date, time, contact_name, notes } = req.body;
    console.log('📅 AI Tool: schedule_appointment', { date, time, contact_name, notes });

    // Find the most recent active call for this contact name
    const call = db.prepare(`
      SELECT cl.id, cl.contact_id, cl.campaign_id
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      WHERE cl.status IN ('in_progress', 'ringing')
      AND (ct.first_name || ' ' || ct.last_name) LIKE ?
      ORDER BY cl.created_at DESC LIMIT 1
    `).get(`%${contact_name}%`);

    const appointmentStr = `${date} ${time}`;

    if (call) {
      db.prepare(`
        UPDATE calls SET outcome = 'appointment_scheduled', appointment_at = ?, summary = ?
        WHERE id = ?
      `).run(appointmentStr, `Appointment: ${date} at ${time}. ${notes || ''}`.trim(), call.id);

      db.prepare(`UPDATE contacts SET status = 'converted' WHERE id = ?`).run(call.contact_id);

      // Recalculate lead score
      const contactCalls = db.prepare('SELECT * FROM calls WHERE contact_id = ? ORDER BY created_at DESC').all(call.contact_id);
      const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(call.contact_id);
      const newScore = calculateLeadScore(contact, contactCalls);
      db.prepare('UPDATE contacts SET lead_score = ? WHERE id = ?').run(newScore, call.contact_id);

      broadcast({ type: 'call_update', call: db.prepare('SELECT * FROM calls WHERE id = ?').get(call.id) });
      console.log('✅ Appointment saved for call:', call.id);
    }

    // Return success to AI so it can confirm to the contact
    res.json({ success: true, message: `Appointment confirmed for ${date} at ${time} with Kenny.` });
  } catch (error) {
    console.error('AI tool schedule_appointment error:', error);
    res.json({ success: true, message: 'Appointment noted. Kenny will follow up to confirm.' });
  }
});

// Mark not interested
router.post('/ai-tool/mark_not_interested', async (req, res) => {
  try {
    const db = await getDb();
    const { reason, add_to_dnc } = req.body;
    console.log('🚫 AI Tool: mark_not_interested', { reason, add_to_dnc });

    // Find most recent active call
    const call = db.prepare(`
      SELECT cl.id, cl.contact_id FROM calls cl
      WHERE cl.status IN ('in_progress', 'ringing')
      ORDER BY cl.created_at DESC LIMIT 1
    `).get();

    if (call) {
      db.prepare(`UPDATE calls SET outcome = 'not_interested', summary = ? WHERE id = ?`)
        .run(reason || 'Not interested', call.id);
      db.prepare(`UPDATE contacts SET status = 'not_interested' WHERE id = ?`).run(call.contact_id);

      if (add_to_dnc) {
        const contact = db.prepare('SELECT phone FROM contacts WHERE id = ?').get(call.contact_id);
        if (contact?.phone) {
          db.prepare('INSERT OR IGNORE INTO do_not_call (phone, reason) VALUES (?, ?)').run(contact.phone, reason || 'Not interested');
        }
      }

      broadcast({ type: 'call_update', call: db.prepare('SELECT * FROM calls WHERE id = ?').get(call.id) });
    }

    res.json({ success: true, message: 'Noted. Thank them and say goodbye.' });
  } catch (error) {
    console.error('AI tool mark_not_interested error:', error);
    res.json({ success: true, message: 'Noted.' });
  }
});

// Request callback
router.post('/ai-tool/request_callback', async (req, res) => {
  try {
    const db = await getDb();
    const { preferred_time, contact_name } = req.body;
    console.log('📞 AI Tool: request_callback', { preferred_time, contact_name });

    const call = db.prepare(`
      SELECT cl.id, cl.contact_id FROM calls cl
      WHERE cl.status IN ('in_progress', 'ringing')
      ORDER BY cl.created_at DESC LIMIT 1
    `).get();

    if (call) {
      db.prepare(`UPDATE calls SET outcome = 'callback_requested', callback_preferred_at = ?, summary = ? WHERE id = ?`)
        .run(preferred_time, `Callback requested: ${preferred_time}`, call.id);
      db.prepare(`UPDATE contacts SET status = 'callback' WHERE id = ?`).run(call.contact_id);

      broadcast({ type: 'call_update', call: db.prepare('SELECT * FROM calls WHERE id = ?').get(call.id) });
    }

    res.json({ success: true, message: `Callback noted for ${preferred_time}. Confirm with the contact and say goodbye.` });
  } catch (error) {
    console.error('AI tool request_callback error:', error);
    res.json({ success: true, message: 'Callback noted.' });
  }
});

export default router;
