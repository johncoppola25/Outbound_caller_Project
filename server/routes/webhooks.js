import express from 'express';
import { getDb } from '../db/init.js';
import { broadcast } from '../index.js';
import { startAIConversation, telnyxRequest } from '../services/telnyx.js';
import { calculateLeadScore } from '../services/leadScoring.js';
import { checkConflicts } from './calls.js';
import { findUserForBilling, deductCallCost } from './billing.js';
import { sendAppointmentBookedEmail } from '../services/email.js';

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
        // AI conversation starts automatically via TeXML AI Calls — no need to call startAIConversation here.
        // Doing so would start a SECOND conversation with the campaign's shared assistant, overriding
        // the per-call temp assistant that has the correct contact name and personalized prompt.
        break;
        
      case 'call.hangup':
        const duration = payload.duration_seconds || 0;
        db.prepare(`
          UPDATE calls
          SET status = 'completed', duration_seconds = ?, ended_at = datetime('now')
          WHERE id = ?
        `).run(duration, callId);

        // Deduct from user's calling balance (uses per-plan rate)
        const callForBilling = db.prepare('SELECT campaign_id FROM calls WHERE id = ?').get(callId);
        const campaignForBilling = callForBilling ? db.prepare('SELECT user_id FROM campaigns WHERE id = ?').get(callForBilling.campaign_id) : null;
        const billingUser = campaignForBilling?.user_id || await findUserForBilling();
        if (billingUser) {
          const result = await deductCallCost(billingUser, duration);
          if (result) {
            db.prepare('UPDATE calls SET estimated_cost = ? WHERE id = ?').run(result.cost, callId);
          }
        }

        // Update contact status (only if not already a better status from function calls during the call)
        const callRecord = db.prepare('SELECT * FROM calls WHERE id = ?').get(callId);
        if (callRecord) {
          const contactId = callRecord.contact_id;
          const campaignId = callRecord.campaign_id;

          const currentContact = db.prepare('SELECT status FROM contacts WHERE id = ?').get(contactId);
          const keepStatuses = ['converted', 'not_interested', 'callback'];
          if (!keepStatuses.includes(currentContact?.status)) {
            db.prepare(`
              UPDATE contacts SET status = 'called'
              WHERE id = ?
            `).run(contactId);
          }

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

        // Clean up temporary assistant created for this call
        if (clientState.temp_assistant_id) {
          try {
            await telnyxRequest(`/ai/assistants/${clientState.temp_assistant_id}`, 'DELETE');
            console.log('🗑️ Cleaned up temp assistant:', clientState.temp_assistant_id);
          } catch (cleanupErr) {
            console.error('Temp assistant cleanup error:', cleanupErr.message);
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
        // Handle AI function calls as FALLBACK only
        // The primary handlers are the /ai-tool/* webhook endpoints which run synchronously.
        // This event fires separately and should only update if the tool endpoint didn't already.
        const functionName = payload.function_call?.name;
        const functionArgs = payload.function_call?.arguments;

        // Check if the call already has an outcome set by the tool webhook endpoint
        const existingCallForFn = db.prepare('SELECT outcome FROM calls WHERE id = ?').get(callId);
        if (existingCallForFn?.outcome) {
          console.log(`Function call ${functionName} - outcome already set to "${existingCallForFn.outcome}", skipping duplicate`);
          break;
        }

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
        // Extract transcript from conversation messages (who said what)
        if (payload.messages && Array.isArray(payload.messages)) {
          const msgTranscript = payload.messages
            .filter(m => m.content || m.text)
            .map(m => `${m.role === 'assistant' ? 'AI' : 'Contact'}: ${m.content || m.text}`)
            .join('\n');
          if (msgTranscript) {
            db.prepare(`UPDATE calls SET transcript = ? WHERE id = ?`).run(msgTranscript, callId);
          }
        }
        // Also try transcript field directly
        if (payload.transcript && !payload.messages) {
          const existingForConv = db.prepare('SELECT transcript FROM calls WHERE id = ?').get(callId);
          if (!existingForConv?.transcript) {
            const t = typeof payload.transcript === 'string' ? payload.transcript : JSON.stringify(payload.transcript, null, 2);
            db.prepare(`UPDATE calls SET transcript = ? WHERE id = ?`).run(t, callId);
          }
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
    let call;
    if (contact_name) {
      call = db.prepare(`
        SELECT cl.id, cl.contact_id, cl.campaign_id
        FROM calls cl
        JOIN contacts ct ON cl.contact_id = ct.id
        WHERE cl.status IN ('in_progress', 'ringing')
        AND (ct.first_name || ' ' || ct.last_name) LIKE ?
        ORDER BY cl.created_at DESC LIMIT 1
      `).get(`%${contact_name}%`);
    }
    // Fallback: find any active call
    if (!call) {
      call = db.prepare(`
        SELECT cl.id, cl.contact_id, cl.campaign_id
        FROM calls cl
        WHERE cl.status IN ('in_progress', 'ringing')
        ORDER BY cl.created_at DESC LIMIT 1
      `).get();
    }

    const appointmentStr = `${date} ${time}`;

    // Check for scheduling conflicts
    const { hasConflict, conflicts } = checkConflicts(db, appointmentStr);
    if (hasConflict) {
      const conflictNames = conflicts.map(c => `${c.contact_name} at ${c.appointment_at}`).join(', ');
      console.log('⚠️ Appointment conflict detected:', conflictNames);
      res.json({
        success: false,
        conflict: true,
        message: `That time slot is not available — there's already an appointment at ${conflicts[0].appointment_at}. Please suggest a different time at least 30 minutes before or after.`
      });
      return;
    }

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

      // Send appointment booked email to campaign owner
      try {
        const campaign = db.prepare('SELECT name, user_id FROM campaigns WHERE id = ?').get(call.campaign_id);
        if (campaign?.user_id) {
          const owner = db.prepare('SELECT email, name FROM users WHERE id = ?').get(campaign.user_id);
          if (owner?.email) {
            const contactName = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : (contact_name || 'Unknown');
            sendAppointmentBookedEmail(owner.email, owner.name, contactName, appointmentStr, campaign.name)
              .catch(err => console.error('Appointment email error:', err.message));
          }
        }
      } catch (emailErr) { console.error('Appointment email lookup error:', emailErr.message); }

    } else {
      console.warn('⚠️ schedule_appointment: No active call found to save appointment to');
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
    const { reason, add_to_dnc, contact_name } = req.body;
    console.log('🚫 AI Tool: mark_not_interested', { reason, add_to_dnc, contact_name });

    // Find most recent active call, matching by contact name if provided
    let call;
    if (contact_name) {
      call = db.prepare(`
        SELECT cl.id, cl.contact_id FROM calls cl
        JOIN contacts ct ON cl.contact_id = ct.id
        WHERE cl.status IN ('in_progress', 'ringing')
        AND (ct.first_name || ' ' || ct.last_name) LIKE ?
        ORDER BY cl.created_at DESC LIMIT 1
      `).get(`%${contact_name}%`);
    }
    if (!call) {
      call = db.prepare(`
        SELECT cl.id, cl.contact_id FROM calls cl
        WHERE cl.status IN ('in_progress', 'ringing')
        ORDER BY cl.created_at DESC LIMIT 1
      `).get();
    }

    if (call) {
      db.prepare(`UPDATE calls SET outcome = 'not_interested', summary = ? WHERE id = ?`)
        .run(reason || 'Not interested', call.id);
      db.prepare(`UPDATE contacts SET status = 'not_interested' WHERE id = ?`).run(call.contact_id);

      if (add_to_dnc) {
        const contact = db.prepare('SELECT phone FROM contacts WHERE id = ?').get(call.contact_id);
        if (contact?.phone) {
          db.prepare('INSERT OR IGNORE INTO do_not_call (phone, reason) VALUES (?, ?)')
            .run(contact.phone, reason || 'Requested do not call');
          console.log('🚫 Added to DNC list:', contact.phone, '- Reason:', reason || 'Requested do not call');
        }
      }

      broadcast({ type: 'call_update', call: db.prepare('SELECT * FROM calls WHERE id = ?').get(call.id) });
    } else {
      console.warn('⚠️ mark_not_interested: Could not find active call for contact:', contact_name);
    }

    res.json({ success: true, message: add_to_dnc
      ? 'Done. Their number has been removed from our calling list. Please apologize, let them know they won\'t be called again, and say goodbye.'
      : 'Noted. Thank them for their time and say goodbye politely.' });
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

    // Find most recent active call, matching by contact name if provided
    let call;
    if (contact_name) {
      call = db.prepare(`
        SELECT cl.id, cl.contact_id FROM calls cl
        JOIN contacts ct ON cl.contact_id = ct.id
        WHERE cl.status IN ('in_progress', 'ringing')
        AND (ct.first_name || ' ' || ct.last_name) LIKE ?
        ORDER BY cl.created_at DESC LIMIT 1
      `).get(`%${contact_name}%`);
    }
    if (!call) {
      call = db.prepare(`
        SELECT cl.id, cl.contact_id FROM calls cl
        WHERE cl.status IN ('in_progress', 'ringing')
        ORDER BY cl.created_at DESC LIMIT 1
      `).get();
    }

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
