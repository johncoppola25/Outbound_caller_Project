import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { v4 as uuidv4 } from 'uuid';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Get contacts for a campaign
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const db = await getDb();
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM contacts WHERE campaign_id = ?';
    const params = [req.params.campaignId];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (search) {
      query += ' AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = db.prepare(countQuery).get(...params);
    const total = countResult?.total || 0;
    
    // Get paginated results
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const contacts = db.prepare(query).all(...params);
    
    res.json({
      contacts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Get single contact
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const contact = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM calls WHERE contact_id = c.id) as call_count,
        (SELECT status FROM calls WHERE contact_id = c.id ORDER BY created_at DESC LIMIT 1) as last_call_status
      FROM contacts c
      WHERE c.id = ?
    `).get(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Get call history for contact
    const calls = db.prepare(`
      SELECT * FROM calls WHERE contact_id = ? ORDER BY created_at DESC
    `).all(req.params.id);
    
    res.json({ ...contact, calls });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// Upload CSV contacts
router.post('/upload/:campaignId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const db = await getDb();
    const campaignId = req.params.campaignId;
    const results = [];
    const errors = [];
    
    // Verify campaign exists
    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const parser = createReadStream(req.file.path).pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      })
    );
    
    let dncSet = new Set();
    try {
      dncSet = new Set(db.prepare('SELECT phone FROM do_not_call').all().map(r => r.phone));
    } catch (e) { /* DNC table may not exist */ }
    
    let rowNumber = 1;
    for await (const record of parser) {
      rowNumber++;
      
      // Normalize column names (handle various CSV formats)
      const firstName = record.first_name || record.firstName || record['First Name'] || record.name?.split(' ')[0] || '';
      const lastName = record.last_name || record.lastName || record['Last Name'] || record.name?.split(' ').slice(1).join(' ') || '';
      const phone = record.phone || record.Phone || record.phone_number || record['Phone Number'] || '';
      const email = record.email || record.Email || record['Email Address'] || '';
      const propertyAddress = record.property_address || record.address || record.Address || record['Property Address'] || '';
      const notes = record.notes || record.Notes || '';
      
      // Validate phone number
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        errors.push({ row: rowNumber, error: 'Invalid or missing phone number', data: record });
        continue;
      }
      
      // Format phone number
      const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;
      
      // Skip DNC numbers
      if (dncSet.has(formattedPhone) || dncSet.has('+1' + cleanPhone.slice(-10))) {
        errors.push({ row: rowNumber, error: 'On Do-Not-Call list', data: record });
        continue;
      }
      
      try {
        const id = uuidv4();
        db.prepare(`
          INSERT INTO contacts (id, campaign_id, first_name, last_name, phone, email, property_address, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, campaignId, firstName, lastName, formattedPhone, email, propertyAddress, notes);
        results.push({ id, firstName, lastName, phone: formattedPhone });
      } catch (err) {
        errors.push({ row: rowNumber, error: err.message, data: record });
      }
    }
    
    res.json({
      success: true,
      imported: results.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 10) // Only return first 10 errors
    });
  } catch (error) {
    console.error('Error uploading contacts:', error);
    res.status(500).json({ error: 'Failed to upload contacts' });
  }
});

// Add single contact
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { campaign_id, first_name, last_name, phone, email, property_address, notes } = req.body;
    
    // Validate phone
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;
    const id = uuidv4();
    
    db.prepare(`
      INSERT INTO contacts (id, campaign_id, first_name, last_name, phone, email, property_address, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, campaign_id, first_name, last_name, formattedPhone, email, property_address, notes);
    
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    
    res.status(201).json(contact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Update contact
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { first_name, last_name, phone, email, property_address, notes, status } = req.body;
    
    let formattedPhone = phone ? phone : null;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;
    }
    
    // Convert undefined to null for sql.js compatibility
    const safeValue = (val) => val !== undefined ? val : null;
    
    db.prepare(`
      UPDATE contacts 
      SET first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          property_address = COALESCE(?, property_address),
          notes = COALESCE(?, notes),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      safeValue(first_name), 
      safeValue(last_name), 
      safeValue(formattedPhone), 
      safeValue(email), 
      safeValue(property_address), 
      safeValue(notes), 
      safeValue(status), 
      req.params.id
    );
    
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
    
    res.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete contact
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Bulk delete contacts
router.post('/bulk-delete', async (req, res) => {
  try {
    const db = await getDb();
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM contacts WHERE id IN (${placeholders})`).run(...ids);
    
    res.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error('Error deleting contacts:', error);
    res.status(500).json({ error: 'Failed to delete contacts' });
  }
});

export default router;
