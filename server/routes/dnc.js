import express from 'express';
import { getDb } from '../db/init.js';

const router = express.Router();

// Get all DNC numbers
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const list = db.prepare('SELECT * FROM do_not_call ORDER BY created_at DESC').all();
    res.json(list);
  } catch (error) {
    console.error('Error fetching DNC list:', error);
    res.status(500).json({ error: 'Failed to fetch DNC list' });
  }
});

// Add number to DNC
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { phone, reason } = req.body;
    const normalized = String(phone || '').replace(/\D/g, '');
    if (normalized.length < 10) {
      return res.status(400).json({ error: 'Valid phone number required' });
    }
    const fullPhone = normalized.length === 10 ? `+1${normalized}` : `+${normalized}`;
    db.prepare('INSERT OR IGNORE INTO do_not_call (phone, reason) VALUES (?, ?)').run(fullPhone, reason || 'Manual');
    const row = db.prepare('SELECT * FROM do_not_call WHERE phone = ?').get(fullPhone);
    res.json(row);
  } catch (error) {
    console.error('Error adding to DNC:', error);
    res.status(500).json({ error: 'Failed to add to DNC' });
  }
});

// Remove from DNC
router.delete('/:phone', async (req, res) => {
  try {
    const db = await getDb();
    const phone = decodeURIComponent(req.params.phone);
    db.prepare('DELETE FROM do_not_call WHERE phone = ?').run(phone);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing from DNC:', error);
    res.status(500).json({ error: 'Failed to remove from DNC' });
  }
});

// Check if phone is on DNC
router.get('/check/:phone', async (req, res) => {
  try {
    const db = await getDb();
    const phone = decodeURIComponent(req.params.phone).replace(/\D/g, '');
    const digits = phone.length >= 10 ? phone.slice(-10) : phone;
    const fullPhone = `+1${digits}`;
    const row = db.prepare('SELECT * FROM do_not_call WHERE phone = ? OR phone = ?').get(fullPhone, `+${digits}`);
    res.json({ onDnc: !!row, record: row });
  } catch (error) {
    console.error('Error checking DNC:', error);
    res.status(500).json({ error: 'Failed to check DNC' });
  }
});

export default router;
