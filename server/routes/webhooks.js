import express from 'express';
import { getDb } from '../db/init.js';
import { broadcast } from '../index.js';
import { startAIConversation } from '../services/telnyx.js';

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
        
        // Update contact status
        const callRecord = db.prepare('SELECT contact_id FROM calls WHERE id = ?').get(callId);
        if (callRecord) {
          db.prepare(`
            UPDATE contacts SET status = 'called'
            WHERE id = ?
          `).run(callRecord.contact_id);
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

export default router;
