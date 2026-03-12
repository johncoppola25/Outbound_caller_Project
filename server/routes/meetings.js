import { Router } from 'express';
import { getDb } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/meetings - get all completed meetings
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const isAdmin = req.user.role === 'admin';
    const meetings = db.prepare(`
      SELECT * FROM meeting_history
      ${isAdmin ? '' : 'WHERE user_id = ?'}
      ORDER BY completed_at DESC
    `).all(...(isAdmin ? [] : [req.user.userId]));
    res.json(meetings);
  } catch (err) {
    console.error('Error fetching meetings:', err);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// POST /api/meetings/complete - complete an appointment
router.post('/complete', async (req, res) => {
  try {
    const db = await getDb();
    const { call_id, outcome, notes } = req.body;

    if (!call_id) {
      return res.status(400).json({ error: 'call_id is required' });
    }

    // Get call + contact + campaign info
    const call = db.prepare(`
      SELECT c.*,
        ct.first_name, ct.last_name, ct.phone, ct.email, ct.property_address,
        camp.name as campaign_name
      FROM calls c
      LEFT JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN campaigns camp ON c.campaign_id = camp.id
      WHERE c.id = ?
    `).get(call_id);

    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO meeting_history (id, call_id, contact_name, phone, email, property_address, campaign_name, appointment_at, outcome, notes, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, call_id,
      `${call.first_name || ''} ${call.last_name || ''}`.trim(),
      call.phone || '',
      call.email || '',
      call.property_address || '',
      call.campaign_name || '',
      call.appointment_at || '',
      outcome || 'completed',
      notes || '',
      req.user.userId
    );

    // Update call outcome to meeting_completed so it no longer shows in appointments
    db.prepare('UPDATE calls SET outcome = ? WHERE id = ?').run('meeting_completed', call_id);

    // Update contact status
    db.prepare('UPDATE contacts SET status = ? WHERE id = ?').run('meeting_completed', call.contact_id);

    res.json({ success: true, id, message: 'Meeting completed successfully' });
  } catch (err) {
    console.error('Error completing meeting:', err);
    res.status(500).json({ error: 'Failed to complete meeting' });
  }
});

// DELETE /api/meetings/:id - delete a meeting from history
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const isAdmin = req.user.role === 'admin';
    db.prepare(`DELETE FROM meeting_history WHERE id = ?${isAdmin ? '' : ' AND user_id = ?'}`)
      .run(...[req.params.id, ...(isAdmin ? [] : [req.user.userId])]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting meeting:', err);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

export default router;
