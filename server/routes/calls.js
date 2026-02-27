import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { initiateOutboundCall, startAIConversation, getCallDetails, getAssistantConversations, getCallRecordings, telnyxRequest } from '../services/telnyx.js';
import { broadcast } from '../index.js';

const router = express.Router();

// Get calls for a campaign
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const db = await getDb();
    const { status, outcome, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT cl.*, ct.first_name, ct.last_name, ct.phone, ct.email
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      WHERE cl.campaign_id = ?
    `;
    const params = [req.params.campaignId];
    
    if (status) {
      query += ' AND cl.status = ?';
      params.push(status);
    }
    
    if (outcome) {
      query += ' AND cl.outcome = ?';
      params.push(outcome);
    }
    
    // Get total count
    const countQuery = query.replace('SELECT cl.*, ct.first_name, ct.last_name, ct.phone, ct.email', 'SELECT COUNT(*) as total');
    const countResult = db.prepare(countQuery).get(...params);
    const total = countResult?.total || 0;
    
    query += ' ORDER BY cl.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const calls = db.prepare(query).all(...params);
    
    res.json({
      calls,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

// Get single call with details
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const call = db.prepare(`
      SELECT cl.*, ct.first_name, ct.last_name, ct.phone, ct.email, ct.property_address,
             cp.name as campaign_name, cp.type as campaign_type
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      JOIN campaigns cp ON cl.campaign_id = cp.id
      WHERE cl.id = ?
    `).get(req.params.id);
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    // Get call events
    const events = db.prepare(`
      SELECT * FROM call_events WHERE call_id = ? ORDER BY created_at ASC
    `).all(req.params.id);
    
    res.json({ ...call, events });
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({ error: 'Failed to fetch call' });
  }
});

// Initiate single call
router.post('/initiate', async (req, res) => {
  try {
    const db = await getDb();
    const { contact_id, campaign_id } = req.body;
    
    // Get campaign and contact details
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaign_id);
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contact_id);
    
    if (!campaign || !contact) {
      return res.status(404).json({ error: 'Campaign or contact not found' });
    }
    
    // Create call record
    const callId = uuidv4();
    db.prepare(`
      INSERT INTO calls (id, campaign_id, contact_id, status, created_at)
      VALUES (?, ?, ?, 'initiating', datetime('now'))
    `).run(callId, campaign_id, contact_id);
    
    // Initiate the AI call via Telnyx with contact data for personalization
    try {
      const telnyxCall = await initiateOutboundCall({
        call_id: callId,
        campaign_id: campaign_id,
        contact_id: contact_id,
        to: contact.phone,
        from: campaign.caller_id,
        assistant_id: campaign.telnyx_assistant_id,
        contact: {
          first_name: contact.first_name,
          last_name: contact.last_name,
          phone: contact.phone,
          email: contact.email,
          property_address: contact.property_address,
          notes: contact.notes
        },
        campaign: {
          ai_prompt: campaign.ai_prompt,
          greeting: campaign.greeting,
          voice: campaign.voice,
          background_audio: campaign.background_audio,
          bot_name: campaign.bot_name,
          caller_id: campaign.caller_id
        }
      });
      
      // Update call with Telnyx call ID
      const callSid = telnyxCall.data?.call_control_id || telnyxCall.data?.call_sid || telnyxCall.call_sid || 'initiated';
      db.prepare(`
        UPDATE calls SET telnyx_call_id = ?, status = 'ringing', started_at = datetime('now')
        WHERE id = ?
      `).run(callSid, callId);
      
      // Log event
      db.prepare(`
        INSERT INTO call_events (call_id, event_type, event_data)
        VALUES (?, 'call_initiated', ?)
      `).run(callId, JSON.stringify({ telnyx_call_id: telnyxCall.data?.call_control_id }));
      
    } catch (telnyxError) {
      console.error('Telnyx error:', telnyxError);
      db.prepare(`UPDATE calls SET status = 'failed' WHERE id = ?`).run(callId);
      
      db.prepare(`
        INSERT INTO call_events (call_id, event_type, event_data)
        VALUES (?, 'call_failed', ?)
      `).run(callId, JSON.stringify({ error: telnyxError.message }));
    }
    
    const call = db.prepare(`
      SELECT cl.*, ct.first_name, ct.last_name, ct.phone
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      WHERE cl.id = ?
    `).get(callId);
    
    // Broadcast update
    broadcast({ type: 'call_update', call });
    
    res.status(201).json(call);
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// Start campaign (call all pending contacts)
router.post('/start-campaign/:campaignId', async (req, res) => {
  try {
    const db = await getDb();
    const campaignId = req.params.campaignId;
    const { maxConcurrent = 5, delayBetweenCalls = 5000 } = req.body;
    
    // Get campaign
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Get pending contacts
    const pendingContacts = db.prepare(`
      SELECT * FROM contacts 
      WHERE campaign_id = ? AND status = 'pending'
      LIMIT 100
    `).all(campaignId);
    
    if (pendingContacts.length === 0) {
      return res.status(400).json({ error: 'No pending contacts to call' });
    }
    
    // Filter out DNC numbers
    let dncPhones = new Set();
    try {
      dncPhones = new Set(db.prepare('SELECT phone FROM do_not_call').all().map(r => r.phone));
    } catch (e) { /* DNC table may not exist */ }
    const toCall = pendingContacts.filter(c => !dncPhones.has(c.phone));
    const skippedDnc = pendingContacts.length - toCall.length;
    
    if (toCall.length === 0) {
      return res.status(400).json({ error: `All ${pendingContacts.length} pending contacts are on the Do-Not-Call list` });
    }
    
    // Queue calls
    const queuedCalls = [];
    for (const contact of toCall) {
      const callId = uuidv4();
      db.prepare(`
        INSERT INTO calls (id, campaign_id, contact_id, status)
        VALUES (?, ?, ?, 'queued')
      `).run(callId, campaignId, contact.id);
      
      queuedCalls.push({ id: callId, contact_id: contact.id });
      
      // Update contact status
      db.prepare(`UPDATE contacts SET status = 'queued' WHERE id = ?`).run(contact.id);
    }
    
    // Start processing calls in background (simplified for demo)
    // In production, use a proper job queue like Bull/BullMQ
    processCallQueue(campaignId, maxConcurrent, delayBetweenCalls);
    
    res.json({
      success: true,
      queued: queuedCalls.length,
      skippedDnc,
      message: `Started calling ${queuedCalls.length} contacts${skippedDnc ? ` (${skippedDnc} skipped - DNC)` : ''}`
    });
  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({ error: 'Failed to start campaign' });
  }
});

// Background call processor
async function processCallQueue(campaignId, maxConcurrent, delayBetweenCalls) {
  const db = await getDb();
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  
  if (!campaign) return;
  
  let activeCalls = 0;
  
  const processNext = async () => {
    const camp = db.prepare('SELECT status FROM campaigns WHERE id = ?').get(campaignId);
    if (camp?.status === 'paused') return;
    if (activeCalls >= maxConcurrent) return;
    
    const nextCall = db.prepare(`
      SELECT cl.*, ct.phone 
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      WHERE cl.campaign_id = ? AND cl.status = 'queued'
      LIMIT 1
    `).get(campaignId);
    
    if (!nextCall) return;
    
    activeCalls++;
    
    try {
      db.prepare(`UPDATE calls SET status = 'initiating', started_at = datetime('now') WHERE id = ?`).run(nextCall.id);
      
      // Get full contact details for dynamic variables
      const contactDetails = db.prepare('SELECT * FROM contacts WHERE id = ?').get(nextCall.contact_id);
      
      const telnyxCall = await initiateOutboundCall({
        call_id: nextCall.id,
        campaign_id: campaignId,
        contact_id: nextCall.contact_id,
        to: nextCall.phone,
        from: campaign.caller_id,
        assistant_id: campaign.telnyx_assistant_id,
        contact: contactDetails ? {
          first_name: contactDetails.first_name,
          last_name: contactDetails.last_name,
          phone: contactDetails.phone,
          email: contactDetails.email,
          property_address: contactDetails.property_address,
          notes: contactDetails.notes
        } : null,
        campaign: {
          ai_prompt: campaign.ai_prompt,
          greeting: campaign.greeting,
          voice: campaign.voice,
          background_audio: campaign.background_audio,
          bot_name: campaign.bot_name,
          caller_id: campaign.caller_id
        }
      });
      
      const callSid = telnyxCall.data?.call_control_id || telnyxCall.data?.call_sid || telnyxCall.call_sid || 'initiated';
      db.prepare(`UPDATE calls SET telnyx_call_id = ?, status = 'ringing' WHERE id = ?`)
        .run(callSid, nextCall.id);
      
      broadcast({ 
        type: 'call_update', 
        call: db.prepare('SELECT * FROM calls WHERE id = ?').get(nextCall.id)
      });
      
    } catch (error) {
      console.error('Call failed:', error);
      db.prepare(`UPDATE calls SET status = 'failed' WHERE id = ?`).run(nextCall.id);
      activeCalls--;
    }
    
    // Schedule next call
    setTimeout(processNext, delayBetweenCalls);
  };
  
  // Start initial batch
  for (let i = 0; i < maxConcurrent; i++) {
    setTimeout(() => processNext(), i * 1000);
  }
}

// Resume campaign (restart processing queued calls)
router.post('/resume-campaign/:campaignId', async (req, res) => {
  try {
    const db = await getDb();
    const campaignId = req.params.campaignId;
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run('active', campaignId);
    processCallQueue(campaignId, 5, 5000);
    res.json({ success: true, message: 'Campaign resumed' });
  } catch (error) {
    console.error('Error resuming campaign:', error);
    res.status(500).json({ error: 'Failed to resume campaign' });
  }
});

// Stop campaign
router.post('/stop-campaign/:campaignId', async (req, res) => {
  try {
    const db = await getDb();
    
    // Mark queued calls as cancelled
    db.prepare(`
      UPDATE calls SET status = 'cancelled' 
      WHERE campaign_id = ? AND status IN ('queued', 'initiating')
    `).run(req.params.campaignId);
    
    // Reset contact statuses
    db.prepare(`
      UPDATE contacts SET status = 'pending'
      WHERE campaign_id = ? AND status = 'queued'
    `).run(req.params.campaignId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error stopping campaign:', error);
    res.status(500).json({ error: 'Failed to stop campaign' });
  }
});

// Update call outcome
router.put('/:id/outcome', async (req, res) => {
  try {
    const db = await getDb();
    const { outcome, notes, callback_preferred_at, appointment_at } = req.body;
    
    db.prepare(`
      UPDATE calls SET outcome = ?, summary = COALESCE(?, summary), 
        callback_preferred_at = COALESCE(?, callback_preferred_at),
        appointment_at = COALESCE(?, appointment_at)
      WHERE id = ?
    `).run(outcome, notes, callback_preferred_at || null, appointment_at || null, req.params.id);
    
    const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(req.params.id);
    
    // Update contact status based on outcome
    if (outcome === 'appointment_scheduled') {
      db.prepare(`UPDATE contacts SET status = 'converted' WHERE id = ?`).run(call.contact_id);
    } else if (outcome === 'not_interested') {
      db.prepare(`UPDATE contacts SET status = 'not_interested' WHERE id = ?`).run(call.contact_id);
    } else if (outcome === 'callback_requested') {
      db.prepare(`UPDATE contacts SET status = 'callback' WHERE id = ?`).run(call.contact_id);
    }
    
    res.json(call);
  } catch (error) {
    console.error('Error updating call outcome:', error);
    res.status(500).json({ error: 'Failed to update call outcome' });
  }
});

// Export calls to CSV
router.get('/export', async (req, res) => {
  try {
    const db = await getDb();
    const { status, outcome } = req.query;
    let query = `
      SELECT cl.id, cl.status, cl.outcome, cl.duration_seconds, cl.started_at, cl.ended_at, cl.created_at,
        ct.first_name, ct.last_name, ct.phone, ct.email, ct.property_address,
        cp.name as campaign_name
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      JOIN campaigns cp ON cl.campaign_id = cp.id
    `;
    const params = [];
    if (status) { query += ' WHERE cl.status = ?'; params.push(status); }
    if (outcome) { query += (params.length ? ' AND' : ' WHERE') + ' cl.outcome = ?'; params.push(outcome); }
    query += ' ORDER BY cl.created_at DESC LIMIT 5000';
    const calls = db.prepare(query).all(...params);
    const headers = ['id', 'first_name', 'last_name', 'phone', 'email', 'property_address', 'campaign_name', 'status', 'outcome', 'duration_seconds', 'started_at', 'ended_at', 'created_at'];
    const csv = [headers.join(',')].concat(calls.map(c => 
      headers.map(h => {
        const val = c[h] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    )).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=calls-${new Date().toISOString().slice(0,10)}.csv`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Error exporting calls:', error);
    res.status(500).json({ error: 'Failed to export calls' });
  }
});

// Get callbacks (callback_requested) - for follow-up list
router.get('/callbacks', async (req, res) => {
  try {
    const db = await getDb();
    const callbacks = db.prepare(`
      SELECT cl.*, ct.first_name, ct.last_name, ct.phone, ct.email, cp.name as campaign_name
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      JOIN campaigns cp ON cl.campaign_id = cp.id
      WHERE cl.outcome = 'callback_requested'
      ORDER BY cl.callback_preferred_at ASC, cl.created_at DESC
    `).all();
    res.json(callbacks);
  } catch (error) {
    console.error('Error fetching callbacks:', error);
    res.status(500).json({ error: 'Failed to fetch callbacks' });
  }
});

// Get appointments (appointment_scheduled)
router.get('/appointments', async (req, res) => {
  try {
    const db = await getDb();
    const appointments = db.prepare(`
      SELECT cl.*, ct.first_name, ct.last_name, ct.phone, ct.email, ct.property_address, cp.name as campaign_name
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      JOIN campaigns cp ON cl.campaign_id = cp.id
      WHERE cl.outcome = 'appointment_scheduled'
      ORDER BY cl.appointment_at ASC, cl.created_at DESC
    `).all();
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get all calls (across campaigns)
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT cl.*, ct.first_name, ct.last_name, ct.phone, cp.name as campaign_name
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      JOIN campaigns cp ON cl.campaign_id = cp.id
    `;
    const params = [];
    
    if (status) {
      query += ' WHERE cl.status = ?';
      params.push(status);
    }
    
    const countQuery = query.replace(
      'SELECT cl.*, ct.first_name, ct.last_name, ct.phone, cp.name as campaign_name',
      'SELECT COUNT(*) as total'
    );
    const countResult = db.prepare(countQuery).get(...params);
    const total = countResult?.total || 0;
    
    query += ' ORDER BY cl.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const calls = db.prepare(query).all(...params);
    
    res.json({
      calls,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

// Sync call data from Telnyx - fetches latest outcomes, transcripts, recordings
router.post('/:id/sync', async (req, res) => {
  try {
    const db = await getDb();
    const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(req.params.id);
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    const updates = {};
    const debugInfo = [];

    // 1) Fetch call details from Telnyx - log everything we get back
    if (call.telnyx_call_id) {
      try {
        const callDetails = await getCallDetails(call.telnyx_call_id);
        if (callDetails?.data) {
          const d = callDetails.data;
          console.log('📋 Full call details from Telnyx:', JSON.stringify(d, null, 2));
          debugInfo.push(`Call state: ${d.state || d.status || 'unknown'}, is_alive: ${d.is_alive}`);
          
          // Get duration from call_duration or duration_seconds
          const dur = d.call_duration || d.duration_seconds;
          if (dur && !call.duration_seconds) {
            updates.duration_seconds = dur;
            debugInfo.push(`Duration from Telnyx: ${dur}s`);
          }
          
          if (d.state === 'hangup' || d.is_alive === false) {
            if (call.status !== 'completed' && call.status !== 'voicemail') {
              updates.status = 'completed';
              updates.ended_at = d.end_time || new Date().toISOString();
            }
          }
        }
      } catch (e) {
        debugInfo.push(`Call details error: ${e.message}`);
      }
    }

    // 2) List ALL recent recordings from Telnyx account and match by time
    if (!call.recording_url) {
      try {
        const allRecs = await telnyxRequest('/recordings', 'GET');
        console.log('🎙️ All recordings count:', allRecs?.data?.length || 0);
        if (allRecs?.data?.length > 0) {
          const callTimeStr = call.started_at || call.created_at;
          const callTime = callTimeStr ? (() => {
            let s = String(callTimeStr).trim().replace(' ', 'T');
            if (!s.endsWith('Z') && !/[-+]\d{2}:?\d{0,2}$/.test(s)) s += 'Z';
            return new Date(s).getTime();
          })() : 0;
          // Find recording within 20 minutes (recordings can take a few min to process)
          const matchRec = allRecs.data.find(r => {
            const recTime = new Date(r.created_at).getTime();
            return callTime && Math.abs(recTime - callTime) < 1200000;
          });
          if (matchRec) {
            const url = matchRec.download_urls?.mp3 || matchRec.public_recording_urls?.mp3 || matchRec.recording_urls?.mp3;
            if (url) {
              updates.recording_url = url;
              debugInfo.push('Found recording by time match');
            }
          } else {
            debugInfo.push(`${allRecs.data.length} recordings found but none match call time`);
          }
        } else {
          debugInfo.push('No recordings in Telnyx account');
        }
      } catch (e) {
        debugInfo.push(`Recordings list error: ${e.message}`);
      }
    }

    // 3) Check call_events table for locally stored webhook data
    const events = db.prepare('SELECT * FROM call_events WHERE call_id = ? ORDER BY created_at ASC').all(req.params.id);
    debugInfo.push(`Local call events: ${events.length}`);
    
    if (events.length > 0) {
      const transcriptParts = [];
      let summaryFromEvents = '';
      let outcomeFromEvents = '';

      for (const evt of events) {
        let evtData;
        try { evtData = JSON.parse(evt.event_data); } catch { continue; }

        if (evt.event_type === 'call.transcription' && evtData.transcription_data?.transcript) {
          transcriptParts.push(evtData.transcription_data.transcript);
        }
        if (evt.event_type === 'ai.assistant.conversation.ended' && evtData.conversation_summary) {
          summaryFromEvents = evtData.conversation_summary;
        }
        if (evt.event_type === 'ai.assistant.function_call') {
          const fn = evtData.function_call?.name;
          if (fn === 'schedule_appointment') outcomeFromEvents = 'appointment_scheduled';
          else if (fn === 'mark_not_interested') outcomeFromEvents = 'not_interested';
          else if (fn === 'request_callback') outcomeFromEvents = 'callback_requested';
        }
        if (evt.event_type === 'call.recording.saved') {
          const recUrl = evtData.recording_urls?.mp3 || evtData.public_recording_urls?.mp3;
          if (recUrl && !call.recording_url) updates.recording_url = recUrl;
        }
      }

      if (transcriptParts.length > 0 && !call.transcript) {
        updates.transcript = transcriptParts.join('\n');
      }
      if (summaryFromEvents && !call.summary) {
        updates.summary = summaryFromEvents;
      }
      if (outcomeFromEvents && !call.outcome) {
        updates.outcome = outcomeFromEvents;
      }
    }

    // 4) Fetch Telnyx call events - filter by call_leg_id (UUID format) for accuracy
    if (call.telnyx_call_id) {
      try {
        // First get the call_leg_id from call details (already fetched above)
        const callDetails = await getCallDetails(call.telnyx_call_id);
        const legId = callDetails?.data?.call_leg_id;
        const sessionId = callDetails?.data?.call_session_id;
        
        // Filter by call_leg_id and add date filter for recent events
        let allTelnyxEvents = [];
        const callDate = call.created_at ? new Date(call.created_at).toISOString().split('T')[0] : '';
        const filterParam = legId 
          ? `filter[call_leg_id]=${legId}` 
          : `filter[call_session_id]=${sessionId || call.telnyx_call_id}`;
        const dateFilter = callDate ? `&filter[occurred_at][gte]=${callDate}T00:00:00Z` : '';
        
        let page = 1;
        let hasMore = true;
        while (hasMore && page <= 5) {
          const callEvents = await telnyxRequest(
            `/call_events?${filterParam}${dateFilter}&page[size]=50&page[number]=${page}`, 
            'GET'
          );
          if (callEvents?.data?.length > 0) {
            allTelnyxEvents = allTelnyxEvents.concat(callEvents.data);
            hasMore = callEvents.data.length === 50;
            page++;
          } else {
            hasMore = false;
          }
        }
        
        // If no events found with leg_id, try with call_session_id  
        if (allTelnyxEvents.length === 0 && sessionId) {
          page = 1;
          hasMore = true;
          while (hasMore && page <= 5) {
            const callEvents = await telnyxRequest(
              `/call_events?filter[call_session_id]=${sessionId}${dateFilter}&page[size]=50&page[number]=${page}`, 
              'GET'
            );
            if (callEvents?.data?.length > 0) {
              allTelnyxEvents = allTelnyxEvents.concat(callEvents.data);
              hasMore = callEvents.data.length === 50;
              page++;
            } else {
              hasMore = false;
            }
          }
        }
        
        console.log(`📡 Telnyx call events total: ${allTelnyxEvents.length}`);
        
        if (allTelnyxEvents.length > 0) {
          // The API returns events for ALL calls on the connection.
          // Filter to only events for THIS specific call by matching IDs in the payload.
          const targetCallControlId = call.telnyx_call_id;
          const targetLegId = legId;
          const targetSessionId = sessionId;

          // Log some events to see what IDs they have
          if (allTelnyxEvents.length > 0) {
            const sample = allTelnyxEvents[allTelnyxEvents.length - 1]; // newest
            const sp = sample.payload?.payload || sample.payload || {};
            console.log(`  📋 Sample event leg_id: ${sample.leg_id}, payload.call_leg_id: ${sp.call_leg_id}, app_session: ${sample.application_session_id}`);
            console.log(`  🎯 Target leg: ${targetLegId}, session: ${targetSessionId}, ctrl: ${targetCallControlId}`);
          }

          const matchingEvents = allTelnyxEvents.filter(evt => {
            const p = evt.payload?.payload || evt.payload || {};
            return (
              p.call_control_id === targetCallControlId ||
              p.call_leg_id === targetLegId ||
              p.call_session_id === targetSessionId ||
              evt.leg_id === targetLegId ||
              evt.application_session_id === targetSessionId
            );
          });

          console.log(`📋 Events matching this call: ${matchingEvents.length} of ${allTelnyxEvents.length}`);
          
          const eventNames = matchingEvents.map(e => e.name || 'unknown');
          console.log('📋 Matching event names:', JSON.stringify([...new Set(eventNames)]));
          debugInfo.push(`Telnyx events: ${matchingEvents.length} matching (${allTelnyxEvents.length} total)`);

          // Log each matching event
          for (const evt of matchingEvents) {
            const innerData = evt.payload?.payload || evt.payload || {};
            console.log(`  📝 ${evt.name}: ${JSON.stringify(innerData).substring(0, 500)}`);
          }

          const transcriptParts = [];
          let bestSummary = '';
          let bestOutcome = '';
          let bestRecordingUrl = '';
          let callDuration = null;

          for (const evt of matchingEvents) {
            const evtName = evt.name;
            const innerPayload = evt.payload?.payload || evt.payload || {};

            // conversation_ended - contains transcript and summary from AI conversation
            if (evtName === 'conversation_ended') {
              if (innerPayload.transcript) {
                const t = typeof innerPayload.transcript === 'string' 
                  ? innerPayload.transcript 
                  : JSON.stringify(innerPayload.transcript, null, 2);
                if (t.length > 10) transcriptParts.push(t);
              }
              if (innerPayload.messages && Array.isArray(innerPayload.messages)) {
                const msgT = innerPayload.messages.map(m => 
                  `${m.role === 'assistant' ? 'AI' : 'Contact'}: ${m.content}`
                ).join('\n');
                if (msgT) transcriptParts.push(msgT);
              }
              if (innerPayload.conversation_summary) bestSummary = innerPayload.conversation_summary;
              if (innerPayload.summary) bestSummary = innerPayload.summary;
            }

            // conversation_insights_generated - contains AI analysis of the call
            if (evtName === 'conversation_insights_generated') {
              if (innerPayload.summary && !bestSummary) bestSummary = innerPayload.summary;
              if (innerPayload.sentiment) {
                debugInfo.push(`Sentiment: ${innerPayload.sentiment}`);
              }
              if (innerPayload.categories?.length > 0) {
                debugInfo.push(`Categories: ${innerPayload.categories.join(', ')}`);
              }
              // Insights may contain outcome-like data
              if (innerPayload.outcome) bestOutcome = innerPayload.outcome;
              if (innerPayload.disposition) bestOutcome = innerPayload.disposition;
              // Full insights as summary fallback
              if (!bestSummary && innerPayload.insights) {
                bestSummary = typeof innerPayload.insights === 'string' 
                  ? innerPayload.insights 
                  : JSON.stringify(innerPayload.insights);
              }
            }

            // call_hangup - duration
            if (evtName === 'call_hangup' || evtName === 'call.hangup') {
              const dur = innerPayload.duration_secs || innerPayload.duration_seconds || innerPayload.call_duration;
              if (dur) callDuration = dur;
              // Calculate from answered_time to hangup time
              if (!dur && innerPayload.answered_time) {
                const hangupTime = innerPayload.hangup_cause_time || evt.occurred_at;
                if (hangupTime) {
                  const diff = (new Date(hangupTime) - new Date(innerPayload.answered_time)) / 1000;
                  if (diff > 0) callDuration = Math.round(diff);
                }
              }
            }

            // call_analyzed - contains AI analysis like sentiment, summary
            if (evtName === 'call_analyzed') {
              if (innerPayload.summary && !bestSummary) bestSummary = innerPayload.summary;
              if (innerPayload.analysis_summary && !bestSummary) bestSummary = innerPayload.analysis_summary;
              if (innerPayload.sentiment) debugInfo.push(`Sentiment: ${innerPayload.sentiment}`);
              if (innerPayload.outcome && !bestOutcome) bestOutcome = innerPayload.outcome;
              if (innerPayload.disposition && !bestOutcome) bestOutcome = innerPayload.disposition;
            }

            // call.machine.detection.ended
            if (evtName === 'call.machine.detection.ended') {
              if (innerPayload.result === 'machine') bestOutcome = 'voicemail';
            }

            // call.recording.saved
            if (evtName === 'call.recording.saved') {
              bestRecordingUrl = innerPayload.recording_urls?.mp3 || innerPayload.public_recording_urls?.mp3 || '';
            }

            // Transcription events
            if (evtName === 'call.transcription') {
              const t = innerPayload.transcription_data?.transcript || innerPayload.transcript;
              if (t) transcriptParts.push(t);
            }

            // playback_started/ended - AI speaking
            if (evtName === 'playback_started' || evtName === 'playback_ended') {
              if (innerPayload.text) transcriptParts.push(`AI: ${innerPayload.text}`);
            }
          }

          // Apply extracted data
          if (transcriptParts.length > 0 && !call.transcript && !updates.transcript) {
            updates.transcript = transcriptParts.join('\n');
            debugInfo.push(`Extracted transcript (${transcriptParts.length} parts)`);
          }
          if (bestSummary && !call.summary && !updates.summary) {
            updates.summary = bestSummary;
            debugInfo.push('Extracted AI summary');
          }
          if (bestOutcome && !call.outcome && !updates.outcome) {
            updates.outcome = bestOutcome;
            debugInfo.push(`Extracted outcome: ${bestOutcome}`);
          }
          if (bestRecordingUrl && !call.recording_url && !updates.recording_url) {
            updates.recording_url = bestRecordingUrl;
            debugInfo.push('Extracted recording URL');
          }
          if (callDuration && !call.duration_seconds && !updates.duration_seconds) {
            updates.duration_seconds = callDuration;
          }
        } else {
          debugInfo.push('No call events found');
        }
      } catch (e) {
        debugInfo.push(`Telnyx call events error: ${e.message}`);
        console.log('❌ Call events error:', e.message);
      }
    }

    // 5) Try to get call recording directly - call_control_id, then call_sid (TeXML AI uses call_sid)
    if (call.telnyx_call_id && !call.recording_url && !updates.recording_url) {
      for (const filter of ['call_control_id', 'call_sid', 'call_leg_id']) {
        try {
          const recRes = await telnyxRequest(`/recordings?filter[${filter}]=${encodeURIComponent(call.telnyx_call_id)}`, 'GET');
          if (recRes?.data?.length > 0) {
            const rec = recRes.data[0];
            const url = rec.download_urls?.mp3 || rec.public_recording_urls?.mp3 || rec.recording_urls?.mp3;
            if (url) {
              updates.recording_url = url;
              debugInfo.push(`Found recording by ${filter}`);
              break;
            }
          }
        } catch (e) { /* try next filter */ }
      }
    }

    // Apply updates to database
    const updateKeys = Object.keys(updates);
    if (updateKeys.length > 0) {
      const setClause = updateKeys.map(k => `${k} = ?`).join(', ');
      const values = updateKeys.map(k => updates[k]);
      values.push(req.params.id);
      db.prepare(`UPDATE calls SET ${setClause} WHERE id = ?`).run(...values);
      console.log('✅ Call synced from Telnyx:', updateKeys);

      // Update contact status if call completed
      if (updates.status === 'completed' || updates.outcome) {
        const contactStatus = updates.outcome === 'appointment_scheduled' ? 'completed' 
          : updates.outcome === 'not_interested' ? 'completed'
          : 'called';
        db.prepare('UPDATE contacts SET status = ? WHERE id = ?').run(contactStatus, call.contact_id);
      }

      // Broadcast update
      const updatedCall = db.prepare(`
        SELECT cl.*, ct.first_name, ct.last_name, ct.phone, ct.email,
               cp.name as campaign_name, cp.type as campaign_type
        FROM calls cl
        LEFT JOIN contacts ct ON cl.contact_id = ct.id
        LEFT JOIN campaigns cp ON cl.campaign_id = cp.id
        WHERE cl.id = ?
      `).get(req.params.id);
      
      broadcast({ type: 'call_update', call: updatedCall });
      res.json({ synced: true, updates: updateKeys, call: updatedCall, debug: debugInfo });
    } else {
      const currentCall = db.prepare(`
        SELECT cl.*, ct.first_name, ct.last_name, ct.phone, ct.email,
               cp.name as campaign_name, cp.type as campaign_type
        FROM calls cl
        LEFT JOIN contacts ct ON cl.contact_id = ct.id
        LEFT JOIN campaigns cp ON cl.campaign_id = cp.id
        WHERE cl.id = ?
      `).get(req.params.id);
      
      const reason = debugInfo.length > 0 
        ? `Checked Telnyx but no new data found. Details: ${debugInfo.join('; ')}`
        : 'No new data from Telnyx. Webhooks may not have reached localhost.';
      res.json({ synced: false, message: reason, call: currentCall, debug: debugInfo });
    }
  } catch (error) {
    console.error('Error syncing call from Telnyx:', error);
    res.status(500).json({ error: 'Failed to sync call data' });
  }
});

export default router;
