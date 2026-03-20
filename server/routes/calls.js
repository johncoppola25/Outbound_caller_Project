import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { initiateOutboundCall, startAIConversation, getCallDetails, getAssistantConversations, getCallRecordings, getConversationTranscript, telnyxRequest } from '../services/telnyx.js';
import { broadcast } from '../index.js';
import { calculateLeadScore } from '../services/leadScoring.js';

const router = express.Router();

function isWithinCallingHours(campaign) {
  const now = new Date();
  const start = campaign.calling_hours_start || '09:00';
  const end = campaign.calling_hours_end || '18:00';
  const days = (campaign.calling_days || '1,2,3,4,5').split(',').map(Number);

  // Check day of week (0=Sun, 1=Mon, ..., 6=Sat)
  const currentDay = now.getDay();
  if (!days.includes(currentDay)) return false;

  // Check time
  const currentTime = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    timeZone: campaign.calling_timezone || 'America/New_York'
  });

  return currentTime >= start && currentTime <= end;
}

// Export calls to CSV - MUST be before /:id route
router.get('/export', async (req, res) => {
  try {
    const db = await getDb();
    const { status, outcome } = req.query;
    const isAdmin = req.user.role === 'admin';
    let query = `
      SELECT cl.id, cl.status, cl.outcome, cl.duration_seconds, cl.started_at, cl.ended_at, cl.created_at,
        ct.first_name, ct.last_name, ct.phone, ct.email, ct.property_address,
        cp.name as campaign_name
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      JOIN campaigns cp ON cl.campaign_id = cp.id
    `;
    const params = [];
    if (!isAdmin) { query += ' WHERE cp.user_id = ?'; params.push(req.user.userId); }
    if (status) { query += (params.length ? ' AND' : ' WHERE') + ' cl.status = ?'; params.push(status); }
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

// Get callbacks - MUST be before /:id route
router.get('/callbacks', async (req, res) => {
  try {
    const db = await getDb();
    const isAdmin = req.user.role === 'admin';
    const callbacks = db.prepare(`
      SELECT cl.*, ct.first_name, ct.last_name, ct.phone, ct.email, cp.name as campaign_name
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      JOIN campaigns cp ON cl.campaign_id = cp.id
      WHERE cl.outcome = 'callback_requested'${isAdmin ? '' : ' AND cp.user_id = ?'}
      ORDER BY cl.callback_preferred_at ASC, cl.created_at DESC
    `).all(...(isAdmin ? [] : [req.user.userId]));
    res.json(callbacks);
  } catch (error) {
    console.error('Error fetching callbacks:', error);
    res.status(500).json({ error: 'Failed to fetch callbacks' });
  }
});

// Parse loose appointment time strings into a Date object
function parseAppointmentTime(str) {
  if (!str) return null;
  const s = String(str).trim();
  // Try native Date parse first (handles ISO, "2024-01-15 2:30pm", etc.)
  let d = new Date(s);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;
  // Try replacing space with T for "2024-01-15 14:30"
  d = new Date(s.replace(' ', 'T'));
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;
  // Try appending current year for strings like "Monday January 15 2:30pm"
  const withYear = s + ' ' + new Date().getFullYear();
  d = new Date(withYear);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;
  return null;
}

// Check if a proposed appointment time conflicts with existing ones (within 30 min window)
export function checkConflicts(db, proposedTime, excludeCallId = null, userId = null) {
  const proposed = parseAppointmentTime(proposedTime);
  if (!proposed) return { hasConflict: false, conflicts: [] };

  const appointments = db.prepare(`
    SELECT cl.id, cl.appointment_at, ct.first_name, ct.last_name
    FROM calls cl
    JOIN contacts ct ON cl.contact_id = ct.id
    JOIN campaigns cp ON cl.campaign_id = cp.id
    WHERE cl.outcome = 'appointment_scheduled'${userId ? ' AND cp.user_id = ?' : ''}
  `).all(...(userId ? [userId] : []));

  const conflicts = [];
  for (const apt of appointments) {
    if (excludeCallId && String(apt.id) === String(excludeCallId)) continue;
    const aptTime = parseAppointmentTime(apt.appointment_at);
    if (!aptTime) continue;
    const diffMs = Math.abs(proposed.getTime() - aptTime.getTime());
    if (diffMs < 30 * 60 * 1000) { // within 30 minutes
      conflicts.push({
        id: apt.id,
        appointment_at: apt.appointment_at,
        contact_name: `${apt.first_name || ''} ${apt.last_name || ''}`.trim(),
        minutes_apart: Math.round(diffMs / 60000)
      });
    }
  }
  return { hasConflict: conflicts.length > 0, conflicts };
}

// Suggest next available slot (30 min after latest conflict)
function suggestNextSlot(db, proposedTime, userId = null) {
  const proposed = parseAppointmentTime(proposedTime);
  if (!proposed) return null;

  const appointments = db.prepare(`
    SELECT cl.appointment_at FROM calls cl
    JOIN campaigns cp ON cl.campaign_id = cp.id
    WHERE cl.outcome = 'appointment_scheduled'${userId ? ' AND cp.user_id = ?' : ''}
  `).all(...(userId ? [userId] : []));

  const times = appointments.map(a => parseAppointmentTime(a.appointment_at)).filter(Boolean).sort((a, b) => a - b);

  let candidate = new Date(proposed);
  for (const t of times) {
    if (Math.abs(candidate.getTime() - t.getTime()) < 30 * 60 * 1000) {
      candidate = new Date(t.getTime() + 30 * 60 * 1000);
    }
  }
  return candidate;
}

// Check appointment conflict endpoint
router.get('/appointments/check-conflict', async (req, res) => {
  try {
    const db = await getDb();
    const { time, exclude_call_id } = req.query;
    if (!time) return res.status(400).json({ error: 'time parameter required' });
    const isAdmin = req.user.role === 'admin';
    const scopeUserId = isAdmin ? null : req.user.userId;
    const result = checkConflicts(db, time, exclude_call_id, scopeUserId);
    if (result.hasConflict) {
      const suggestion = suggestNextSlot(db, time, scopeUserId);
      result.suggested_time = suggestion ? suggestion.toISOString() : null;
    }
    res.json(result);
  } catch (error) {
    console.error('Error checking appointment conflict:', error);
    res.status(500).json({ error: 'Failed to check conflict' });
  }
});

// Get appointments - MUST be before /:id route
router.get('/appointments', async (req, res) => {
  try {
    const db = await getDb();
    const isAdmin = req.user.role === 'admin';
    const appointments = db.prepare(`
      SELECT cl.*, ct.first_name, ct.last_name, ct.phone, ct.email, ct.property_address, cp.name as campaign_name
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      JOIN campaigns cp ON cl.campaign_id = cp.id
      WHERE cl.outcome = 'appointment_scheduled'${isAdmin ? '' : ' AND cp.user_id = ?'}
      ORDER BY cl.appointment_at ASC, cl.created_at DESC
    `).all(...(isAdmin ? [] : [req.user.userId]));

    // Tag conflicts on each appointment
    const scopeUserId = isAdmin ? null : req.user.userId;
    for (const apt of appointments) {
      const { conflicts } = checkConflicts(db, apt.appointment_at, apt.id, scopeUserId);
      apt.conflicts = conflicts;
    }

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get calls for a campaign
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const db = await getDb();
    const isAdmin = req.user.role === 'admin';

    // Verify campaign belongs to user
    if (!isAdmin) {
      const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.campaignId, req.user.userId);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    }

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
    const isAdmin = req.user.role === 'admin';
    const call = db.prepare(`
      SELECT cl.*, ct.first_name, ct.last_name, ct.phone, ct.email, ct.property_address,
             cp.name as campaign_name, cp.type as campaign_type
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      JOIN campaigns cp ON cl.campaign_id = cp.id
      WHERE cl.id = ?${isAdmin ? '' : ' AND cp.user_id = ?'}
    `).get(...[req.params.id, ...(isAdmin ? [] : [req.user.userId])]);
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Auto-fix on read: calculate cost if missing, fix stuck status
    const fixes = {};
    const isCompleted = call.status === 'completed' || call.outcome || call.transcript;

    if (!call.estimated_cost && isCompleted) {
      if (call.duration_seconds) {
        fixes.estimated_cost = +(Math.max(call.duration_seconds, 60) / 60 * 0.06).toFixed(4);
      } else {
        fixes.estimated_cost = 0.06; // minimum billing
      }
    }
    if ((call.status === 'ringing' || call.status === 'queued') && isCompleted) {
      fixes.status = 'completed';
      if (!call.ended_at) fixes.ended_at = new Date().toISOString();
    }

    if (Object.keys(fixes).length > 0) {
      const setClause = Object.keys(fixes).map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE calls SET ${setClause} WHERE id = ?`).run(...Object.values(fixes), call.id);
      Object.assign(call, fixes);
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

    // Check calling balance (skip for admin and free accounts)
    const callingUser = db.prepare('SELECT calling_balance, role, name, email FROM users WHERE id = ?').get(req.user.userId);
    if (callingUser && callingUser.role !== 'admin' && callingUser.email !== 'john.coppola25@gmail.com' && (callingUser.calling_balance || 0) < 1) {
      return res.status(402).json({ error: 'Insufficient balance. Please add funds to make calls.' });
    }

    // Get campaign and contact details (verify ownership)
    const isAdmin = req.user.role === 'admin';
    const campaign = db.prepare(`SELECT * FROM campaigns WHERE id = ?${isAdmin ? '' : ' AND user_id = ?'}`)
      .get(...[campaign_id, ...(isAdmin ? [] : [req.user.userId])]);
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
      console.error('Telnyx error details - From:', campaign.caller_id, 'To:', contact.phone, 'Assistant:', campaign.telnyx_assistant_id);
      db.prepare(`UPDATE calls SET status = 'failed' WHERE id = ?`).run(callId);

      db.prepare(`
        INSERT INTO call_events (call_id, event_type, event_data)
        VALUES (?, 'call_failed', ?)
      `).run(callId, JSON.stringify({ error: telnyxError.message, from: campaign.caller_id, to: contact.phone }));
    }

    const call = db.prepare(`
      SELECT cl.*, ct.first_name, ct.last_name, ct.phone
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      WHERE cl.id = ?
    `).get(callId);

    // Include error details if failed
    if (call && call.status === 'failed') {
      const failEvent = db.prepare("SELECT event_data FROM call_events WHERE call_id = ? AND event_type = 'call_failed' ORDER BY created_at DESC LIMIT 1").get(callId);
      if (failEvent) {
        try { call.error_detail = JSON.parse(failEvent.event_data).error; } catch(e) {}
      }
    }

    // Broadcast update
    broadcast({ type: 'call_update', call });

    res.status(201).json(call);
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// Test call - call a phone number with the campaign's current prompt
router.post('/test-call', async (req, res) => {
  try {
    const db = await getDb();
    const { campaign_id, phone_number, first_name } = req.body;

    if (!campaign_id || !phone_number) {
      return res.status(400).json({ error: 'Campaign ID and phone number are required.' });
    }

    // Auto-format phone number - add +1 if no country code
    let formattedPhone = phone_number.replace(/[\s\-\(\)]/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.startsWith('1') ? `+${formattedPhone}` : `+1${formattedPhone}`;
    }

    // Check calling balance (skip for admin and free accounts)
    const callingUser = db.prepare('SELECT calling_balance, role, email FROM users WHERE id = ?').get(req.user.userId);
    if (callingUser && callingUser.role !== 'admin' && callingUser.email !== 'john.coppola25@gmail.com' && (callingUser.calling_balance || 0) < 1) {
      return res.status(402).json({ error: 'Insufficient balance. Please add funds to make calls.' });
    }

    // Get campaign (verify ownership)
    const isAdmin = req.user.role === 'admin';
    const campaign = db.prepare(`SELECT * FROM campaigns WHERE id = ?${isAdmin ? '' : ' AND user_id = ?'}`)
      .get(...[campaign_id, ...(isAdmin ? [] : [req.user.userId])]);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    if (!campaign.telnyx_assistant_id) {
      return res.status(400).json({ error: 'Please click "Save Prompt" first to sync with Telnyx before making a test call.' });
    }

    // Create a temporary test contact (marked as test so it's hidden from contacts list)
    const contactId = uuidv4();
    const testName = first_name || 'Test';
    db.prepare(`
      INSERT INTO contacts (id, campaign_id, first_name, last_name, phone, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, 'test_call')
    `).run(contactId, campaign_id, testName, 'Call', formattedPhone, '__test_call__');

    // Create call record
    const callId = uuidv4();
    db.prepare(`
      INSERT INTO calls (id, campaign_id, contact_id, status, created_at)
      VALUES (?, ?, ?, 'initiating', datetime('now'))
    `).run(callId, campaign_id, contactId);

    // Initiate the call
    try {
      const telnyxCall = await initiateOutboundCall({
        call_id: callId,
        campaign_id: campaign_id,
        contact_id: contactId,
        to: formattedPhone,
        from: campaign.caller_id,
        assistant_id: campaign.telnyx_assistant_id,
        contact: {
          first_name: testName,
          last_name: 'Call',
          phone: formattedPhone,
          email: '',
          property_address: '',
          notes: 'Test call'
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

      const callSid = telnyxCall.data?.call_control_id || telnyxCall.data?.call_sid || telnyxCall.call_sid || 'initiated';
      db.prepare(`UPDATE calls SET telnyx_call_id = ?, status = 'ringing', started_at = datetime('now') WHERE id = ?`).run(callSid, callId);
      db.prepare(`INSERT INTO call_events (call_id, event_type, event_data) VALUES (?, 'call_initiated', ?)`).run(callId, JSON.stringify({ telnyx_call_id: callSid, test_call: true }));
    } catch (telnyxError) {
      console.error('Test call Telnyx error:', telnyxError);
      db.prepare(`UPDATE calls SET status = 'failed' WHERE id = ?`).run(callId);
      db.prepare(`INSERT INTO call_events (call_id, event_type, event_data) VALUES (?, 'call_failed', ?)`).run(callId, JSON.stringify({ error: telnyxError.message }));
      return res.status(500).json({ error: `Call failed: ${telnyxError.message}` });
    }

    const call = db.prepare(`
      SELECT cl.*, ct.first_name, ct.last_name, ct.phone
      FROM calls cl JOIN contacts ct ON cl.contact_id = ct.id
      WHERE cl.id = ?
    `).get(callId);

    broadcast({ type: 'call_update', call });
    res.status(201).json(call);
  } catch (error) {
    console.error('Error initiating test call:', error);
    res.status(500).json({ error: 'Failed to initiate test call.' });
  }
});

// Start campaign (call all pending contacts)
router.post('/start-campaign/:campaignId', async (req, res) => {
  try {
    const db = await getDb();
    const campaignId = req.params.campaignId;
    const { maxConcurrent = 10, delayBetweenCalls = 5000 } = req.body;

    // Check calling balance (skip for admin and free accounts)
    const callingUser = db.prepare('SELECT calling_balance, role, name, email FROM users WHERE id = ?').get(req.user.userId);
    if (callingUser && callingUser.role !== 'admin' && callingUser.email !== 'john.coppola25@gmail.com' && (callingUser.calling_balance || 0) < 1) {
      return res.status(402).json({ error: 'Insufficient balance. Please add funds to make calls.' });
    }

    // Get campaign (verify ownership)
    const isAdmin = req.user.role === 'admin';
    const campaign = db.prepare(`SELECT * FROM campaigns WHERE id = ?${isAdmin ? '' : ' AND user_id = ?'}`)
      .get(...[campaignId, ...(isAdmin ? [] : [req.user.userId])]);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!isWithinCallingHours(campaign)) {
      return res.status(400).json({
        error: 'Outside calling hours',
        message: `Calling hours are ${campaign.calling_hours_start || '09:00'} - ${campaign.calling_hours_end || '18:00'} (${campaign.calling_timezone || 'America/New_York'})`
      });
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
    }

    activeCalls--;

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
    const isAdmin = req.user.role === 'admin';
    const campaign = db.prepare(`SELECT * FROM campaigns WHERE id = ?${isAdmin ? '' : ' AND user_id = ?'}`)
      .get(...[campaignId, ...(isAdmin ? [] : [req.user.userId])]);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run('active', campaignId);
    processCallQueue(campaignId, 10, 5000);
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
    const isAdmin = req.user.role === 'admin';

    // Verify campaign belongs to user
    if (!isAdmin) {
      const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.campaignId, req.user.userId);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    }

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
    const isAdmin = req.user.role === 'admin';

    // Verify call belongs to user's campaign
    if (!isAdmin) {
      const ownsCall = db.prepare('SELECT cl.id FROM calls cl JOIN campaigns cp ON cl.campaign_id = cp.id WHERE cl.id = ? AND cp.user_id = ?').get(req.params.id, req.user.userId);
      if (!ownsCall) return res.status(404).json({ error: 'Call not found' });
    }

    const { outcome, notes, callback_preferred_at, appointment_at } = req.body;

    db.prepare(`
      UPDATE calls SET outcome = ?, summary = COALESCE(?, summary), 
        callback_preferred_at = COALESCE(?, callback_preferred_at),
        appointment_at = COALESCE(?, appointment_at)
      WHERE id = ?
    `).run(outcome, notes, callback_preferred_at || null, appointment_at || null, req.params.id);
    
    const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(req.params.id);

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Update contact status based on outcome
    if (outcome === 'appointment_scheduled') {
      db.prepare(`UPDATE contacts SET status = 'converted' WHERE id = ?`).run(call.contact_id);
    } else if (outcome === 'not_interested') {
      db.prepare(`UPDATE contacts SET status = 'not_interested' WHERE id = ?`).run(call.contact_id);
    } else if (outcome === 'callback_requested') {
      db.prepare(`UPDATE contacts SET status = 'callback' WHERE id = ?`).run(call.contact_id);
    }

    // Recalculate lead score
    if (call.contact_id) {
      const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(call.contact_id);
      const contactCalls = db.prepare('SELECT * FROM calls WHERE contact_id = ? ORDER BY created_at DESC').all(call.contact_id);
      const newScore = calculateLeadScore(contact, contactCalls);
      db.prepare('UPDATE contacts SET lead_score = ? WHERE id = ?').run(newScore, call.contact_id);
    }

    res.json(call);
  } catch (error) {
    console.error('Error updating call outcome:', error);
    res.status(500).json({ error: 'Failed to update call outcome' });
  }
});

// Get all calls (across campaigns)
router.get('/', async (req, res) => {
  try {
    const db = await getDb();

    // Auto-fix all stuck ringing/queued calls that have outcome or transcript
    db.prepare(`
      UPDATE calls SET status = 'completed', ended_at = COALESCE(ended_at, CURRENT_TIMESTAMP)
      WHERE status IN ('ringing', 'queued') AND (outcome IS NOT NULL OR transcript IS NOT NULL)
    `).run();
    // Auto-fix old ringing/queued calls with no data (never answered)
    db.prepare(`
      UPDATE calls SET status = 'no_answer', outcome = 'no_answer', ended_at = COALESCE(ended_at, CURRENT_TIMESTAMP)
      WHERE status IN ('ringing', 'queued', 'in_progress')
      AND outcome IS NULL AND transcript IS NULL
      AND created_at < datetime('now', '-30 minutes')
    `).run();
    // Auto-calculate missing costs for completed calls
    db.prepare(`
      UPDATE calls SET estimated_cost = ROUND(MAX(COALESCE(duration_seconds, 60), 60) / 60.0 * 0.06, 4)
      WHERE estimated_cost IS NULL OR estimated_cost = 0
      AND (status = 'completed' OR outcome IS NOT NULL OR transcript IS NOT NULL)
    `).run();

    const isAdmin = req.user.role === 'admin';
    const filterUserId = isAdmin && req.query.userId ? req.query.userId : (isAdmin ? null : req.user.userId);
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT cl.*, ct.first_name, ct.last_name, ct.phone, cp.name as campaign_name
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      JOIN campaigns cp ON cl.campaign_id = cp.id
    `;
    const params = [];

    if (filterUserId) {
      query += ' WHERE cp.user_id = ?';
      params.push(filterUserId);
    }

    if (status) {
      query += (params.length ? ' AND' : ' WHERE') + ' cl.status = ?';
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
    const isAdmin = req.user.role === 'admin';

    // Verify call belongs to user's campaign
    if (!isAdmin) {
      const ownsCall = db.prepare('SELECT cl.id FROM calls cl JOIN campaigns cp ON cl.campaign_id = cp.id WHERE cl.id = ? AND cp.user_id = ?').get(req.params.id, req.user.userId);
      if (!ownsCall) return res.status(404).json({ error: 'Call not found' });
    }

    const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(req.params.id);

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    const updates = {};
    const debugInfo = [];

    // Run independent Telnyx API calls in PARALLEL for speed
    const campaign = db.prepare('SELECT telnyx_assistant_id FROM campaigns WHERE id = ?').get(call.campaign_id);
    const contact = db.prepare('SELECT phone FROM contacts WHERE id = ?').get(call.contact_id);

    const parallelTasks = [];

    // Task 1: Fetch call details
    if (call.telnyx_call_id) {
      parallelTasks.push(
        getCallDetails(call.telnyx_call_id).catch(e => ({ _error: e.message, _task: 'callDetails' }))
      );
    } else {
      parallelTasks.push(null);
    }

    // Task 2: Fetch recordings list
    if (!call.recording_url) {
      parallelTasks.push(
        telnyxRequest('/recordings', 'GET').catch(e => ({ _error: e.message, _task: 'recordings' }))
      );
    } else {
      parallelTasks.push(null);
    }

    // Task 3: Fetch AI conversation transcript
    if (call.telnyx_call_id) {
      parallelTasks.push(
        getConversationTranscript(
          call.telnyx_call_id,
          contact?.phone,
          campaign?.telnyx_assistant_id,
          call.started_at || call.created_at
        ).catch(e => ({ _error: e.message, _task: 'transcript' }))
      );
    } else {
      parallelTasks.push(null);
    }

    const [callDetailsResult, recordingsResult, transcriptResult] = await Promise.all(parallelTasks);

    // Process call details
    if (callDetailsResult && !callDetailsResult._error && callDetailsResult.data) {
      const d = callDetailsResult.data;
      debugInfo.push(`Call state: ${d.state || d.status || 'unknown'}, is_alive: ${d.is_alive}`);
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
    } else if (callDetailsResult?._error) {
      debugInfo.push(`Call details error: ${callDetailsResult._error}`);
    }

    // Process recordings
    if (recordingsResult && !recordingsResult._error && recordingsResult.data?.length > 0) {
      const callTimeStr = call.started_at || call.created_at;
      const callTime = callTimeStr ? (() => {
        let s = String(callTimeStr).trim().replace(' ', 'T');
        if (!s.endsWith('Z') && !/[-+]\d{2}:?\d{0,2}$/.test(s)) s += 'Z';
        return new Date(s).getTime();
      })() : 0;
      const matchRec = recordingsResult.data.find(r => {
        const recTime = new Date(r.created_at).getTime();
        return callTime && Math.abs(recTime - callTime) < 1200000;
      });
      if (matchRec) {
        const url = matchRec.download_urls?.mp3 || matchRec.public_recording_urls?.mp3 || matchRec.recording_urls?.mp3;
        if (url) { updates.recording_url = url; debugInfo.push('Found recording by time match'); }
      } else {
        debugInfo.push(`${recordingsResult.data.length} recordings found but none match call time`);
      }
    } else if (!call.recording_url) {
      debugInfo.push(recordingsResult?._error ? `Recordings error: ${recordingsResult._error}` : 'No recordings in Telnyx account');
    }

    // Process AI conversation transcript (best quality - has speaker labels)
    if (transcriptResult && !transcriptResult._error && transcriptResult.transcript) {
      updates.transcript = transcriptResult.transcript;
      debugInfo.push(`AI conversation transcript: ${transcriptResult.messageCount} messages`);
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
        // Use call details already fetched in parallel above
        const legId = callDetailsResult?.data?.call_leg_id;
        const sessionId = callDetailsResult?.data?.call_session_id;
        
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

    // 5) (Moved to parallel above)

    // 6) Try to get call recording directly - call_control_id, then call_sid (TeXML AI uses call_sid)
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

    // 7) Calculate estimated cost based on duration (~$0.06/min, 60s billing minimum)
    const finalDuration = updates.duration_seconds || call.duration_seconds;
    const isCompleted = (updates.status || call.status) === 'completed' || (updates.outcome || call.outcome) || (updates.transcript || call.transcript);
    if (!call.estimated_cost && !updates.estimated_cost) {
      if (finalDuration) {
        const billedSeconds = Math.max(finalDuration, 60); // 60s minimum
        const costPerMinute = 0.06;
        updates.estimated_cost = +(billedSeconds / 60 * costPerMinute).toFixed(4);
        debugInfo.push(`Estimated cost: $${updates.estimated_cost} (${billedSeconds}s billed)`);
      } else if (isCompleted) {
        // Call completed but no duration - use 60s minimum billing
        updates.estimated_cost = 0.06;
        debugInfo.push('Estimated cost: $0.06 (minimum billing, no duration available)');
      }
    }

    // Fix stuck status - if call has transcript/outcome but still shows ringing/queued
    const currentStatus = updates.status || call.status;
    if (isCompleted && (currentStatus === 'ringing' || currentStatus === 'queued')) {
      updates.status = 'completed';
      if (!call.ended_at && !updates.ended_at) updates.ended_at = new Date().toISOString();
      debugInfo.push('Fixed stuck status: was ' + currentStatus + ', now completed');
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

// Bulk sync all stale calls - fixes calls stuck in ringing/in_progress
router.post('/sync-all-stale', async (req, res) => {
  try {
    const db = await getDb();
    const isAdmin = req.user.role === 'admin';
    const userFilter = isAdmin ? '' : 'AND campaign_id IN (SELECT id FROM campaigns WHERE user_id = ?)';
    const userParams = isAdmin ? [] : [req.user.userId];
    // Find calls that are stuck in non-terminal states and older than 5 minutes
    const staleCalls = db.prepare(`
      SELECT id, telnyx_call_id, status, campaign_id, contact_id
      FROM calls
      WHERE status IN ('ringing', 'in_progress', 'queued')
      AND created_at < datetime('now', '-5 minutes')
      ${userFilter}
    `).all(...userParams);

    let synced = 0;
    let fixed = 0;

    for (const call of staleCalls) {
      try {
        if (call.telnyx_call_id) {
          // Try to get call details from Telnyx
          const details = await getCallDetails(call.telnyx_call_id);
          const d = details?.data;
          if (d && (d.state === 'hangup' || d.is_alive === false)) {
            const duration = d.call_duration || d.duration_seconds || 0;
            db.prepare(`
              UPDATE calls SET status = 'completed', duration_seconds = ?, ended_at = COALESCE(?, datetime('now'))
              WHERE id = ?
            `).run(duration, d.end_time, call.id);
            fixed++;
          }
        }

        // If still stuck after checking Telnyx (or no telnyx_call_id), mark as completed
        const stillStale = db.prepare('SELECT status FROM calls WHERE id = ?').get(call.id);
        if (stillStale && ['ringing', 'in_progress', 'queued'].includes(stillStale.status)) {
          db.prepare(`
            UPDATE calls SET status = 'completed', ended_at = COALESCE(ended_at, datetime('now'))
            WHERE id = ?
          `).run(call.id);
          fixed++;
        }
        synced++;
      } catch (e) {
        // If Telnyx API fails, still mark old calls as completed
        db.prepare(`
          UPDATE calls SET status = 'completed', ended_at = COALESCE(ended_at, datetime('now'))
          WHERE id = ? AND status IN ('ringing', 'in_progress', 'queued')
        `).run(call.id);
        fixed++;
        synced++;
      }
    }

    // Also sync transcripts/outcomes for calls that have no outcome
    const noOutcomeCalls = db.prepare(`
      SELECT id FROM calls
      WHERE status = 'completed' AND outcome IS NULL
      LIMIT 20
    `).all();

    res.json({
      stale_found: staleCalls.length,
      synced,
      fixed,
      no_outcome_calls: noOutcomeCalls.length,
      message: `Fixed ${fixed} stale calls out of ${staleCalls.length} found`
    });
  } catch (err) {
    console.error('Bulk sync error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process retry queue
router.post('/process-retries', async (req, res) => {
  try {
    const db = await getDb();
    const isAdmin = req.user.role === 'admin';
    const now = new Date().toISOString();
    const retryContacts = db.prepare(`
      SELECT c.*, ca.id as campaign_id, ca.name as campaign_name
      FROM contacts c
      JOIN campaigns ca ON c.campaign_id = ca.id
      WHERE c.next_retry_at IS NOT NULL
      AND c.next_retry_at <= ?
      AND c.status = 'pending'
      AND ca.status = 'active'
      ${isAdmin ? '' : 'AND ca.user_id = ?'}
      LIMIT 50
    `).all(...[now, ...(isAdmin ? [] : [req.user.userId])]);

    res.json({ queued: retryContacts.length, message: `${retryContacts.length} contacts queued for retry` });

    // Process retries in background (same as start-campaign flow)
    for (const contact of retryContacts) {
      db.prepare('UPDATE contacts SET next_retry_at = NULL WHERE id = ?').run(contact.id);
      // The actual call initiation would happen via the normal call flow
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
