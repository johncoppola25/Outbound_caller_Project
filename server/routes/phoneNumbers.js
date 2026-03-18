import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { telnyxRequest } from '../services/telnyx.js';
import { getPlanLimits } from './billing.js';

const router = express.Router();

// Search available numbers by area code
router.get('/search', async (req, res) => {
  try {
    const { area_code } = req.query;
    if (!area_code || area_code.length !== 3) {
      return res.status(400).json({ error: 'Please provide a 3-digit area code.' });
    }

    const result = await telnyxRequest(
      `/available_phone_numbers?filter[national_destination_code]=${area_code}&filter[country_code]=US&filter[limit]=20&filter[features][]=voice&filter[best_effort]=true`
    );

    const numbers = (result.data || []).map(n => ({
      phone_number: n.phone_number,
      region: n.region_information?.[0]?.region_name || '',
      rate_center: n.region_information?.[0]?.rate_center || '',
      monthly_cost: 2.00,
      upfront_cost: 1.00
    }));

    res.json(numbers);
  } catch (error) {
    console.error('Error searching numbers:', error.message);
    res.status(500).json({ error: 'Failed to search phone numbers.' });
  }
});

// Get user's purchased numbers
router.get('/my-numbers', async (req, res) => {
  try {
    const db = await getDb();
    const numbers = db.prepare('SELECT * FROM user_phone_numbers WHERE user_id = ? ORDER BY purchased_at DESC').all(req.user.userId);
    res.json(numbers);
  } catch (error) {
    console.error('Error fetching numbers:', error);
    res.status(500).json({ error: 'Failed to fetch phone numbers.' });
  }
});

// Purchase a number (deducts from calling balance)
router.post('/purchase', async (req, res) => {
  try {
    const { phone_number } = req.body;
    if (!phone_number) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);

    // Enforce phone number limit based on subscription plan
    const bypass = user.role === 'admin' || user.email === 'john.coppola25@gmail.com';
    if (!bypass) {
      if (!user.subscription_plan || user.subscription_status !== 'active') {
        return res.status(403).json({ error: 'You need an active subscription to purchase phone numbers. Please subscribe to a plan first.', upgrade: true });
      }
      const limits = getPlanLimits(user.subscription_plan);
      const currentNumbers = db.prepare('SELECT COUNT(*) as cnt FROM user_phone_numbers WHERE user_id = ?').get(user.id);
      if (currentNumbers.cnt >= limits.maxPhoneNumbers) {
        return res.status(403).json({
          error: `Your ${limits.name} plan allows up to ${limits.maxPhoneNumbers} phone number${limits.maxPhoneNumbers === 1 ? '' : 's'}. Please upgrade your plan to purchase more.`,
          upgrade: true,
          currentCount: currentNumbers.cnt,
          limit: limits.maxPhoneNumbers
        });
      }
    }

    // Check balance ($5 to purchase)
    const purchaseCost = 5.00;
    if ((user.calling_balance || 0) < purchaseCost && !bypass) {
      return res.status(402).json({ error: `Insufficient balance. You need at least $${purchaseCost.toFixed(2)} to purchase a number.` });
    }

    // Check if user already owns this number
    const existing = db.prepare('SELECT id FROM user_phone_numbers WHERE phone_number = ?').get(phone_number);
    if (existing) {
      return res.status(409).json({ error: 'This number is already purchased.' });
    }

    // Order the number from Telnyx
    const orderResult = await telnyxRequest('/number_orders', 'POST', {
      phone_numbers: [{ phone_number }]
    });

    const orderedNumber = orderResult.data?.phone_numbers?.[0];
    const telnyxId = orderedNumber?.id || null;

    // Deduct balance
    if (!bypass) {
      const newBalance = (user.calling_balance || 0) - purchaseCost;
      db.prepare('UPDATE users SET calling_balance = ? WHERE id = ?').run(newBalance, user.id);
    }

    // Save to DB
    const id = uuidv4();
    db.prepare(
      'INSERT INTO user_phone_numbers (id, user_id, phone_number, telnyx_id, friendly_name) VALUES (?, ?, ?, ?, ?)'
    ).run(id, user.id, phone_number, telnyxId, phone_number);

    // Configure the number for voice (assign to TeXML app for AI calls)
    const connectionId = process.env.TELNYX_TEXML_APP_ID || process.env.TELNYX_CONNECTION_ID;
    if (connectionId) {
      // Wait a moment for the number order to be provisioned
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        const phoneDetails = await telnyxRequest(`/phone_numbers?filter[phone_number]=${encodeURIComponent(phone_number)}`);
        const phoneId = phoneDetails.data?.[0]?.id;
        if (phoneId) {
          await telnyxRequest(`/phone_numbers/${phoneId}`, 'PATCH', {
            connection_id: connectionId
          });
          console.log(`✅ Number ${phone_number} assigned to connection ${connectionId}`);
        } else {
          console.warn(`⚠️ Could not find phone ${phone_number} to assign to connection. May need manual config.`);
        }
      } catch (configErr) {
        console.error('Error configuring number:', configErr.message);
        // Try again after a longer delay
        try {
          await new Promise(resolve => setTimeout(resolve, 5000));
          const phoneDetails2 = await telnyxRequest(`/phone_numbers?filter[phone_number]=${encodeURIComponent(phone_number)}`);
          const phoneId2 = phoneDetails2.data?.[0]?.id;
          if (phoneId2) {
            await telnyxRequest(`/phone_numbers/${phoneId2}`, 'PATCH', {
              connection_id: connectionId
            });
            console.log(`✅ Number ${phone_number} assigned to connection on retry`);
          }
        } catch (retryErr) {
          console.error('Retry also failed:', retryErr.message);
        }
      }
    }

    res.json({
      success: true,
      number: { id, phone_number, telnyx_id: telnyxId, status: 'active' },
      message: `Successfully purchased ${phone_number}`
    });
  } catch (error) {
    console.error('Error purchasing number:', error.message);
    res.status(500).json({ error: 'Failed to purchase phone number. ' + error.message });
  }
});

// Release a number
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const number = db.prepare('SELECT * FROM user_phone_numbers WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);

    if (!number) {
      return res.status(404).json({ error: 'Phone number not found.' });
    }

    // Release from Telnyx
    try {
      const phoneDetails = await telnyxRequest(`/phone_numbers?filter[phone_number]=${encodeURIComponent(number.phone_number)}`);
      const phoneId = phoneDetails.data?.[0]?.id;
      if (phoneId) {
        await telnyxRequest(`/phone_numbers/${phoneId}`, 'DELETE');
      }
    } catch (releaseErr) {
      console.error('Error releasing from Telnyx:', releaseErr.message);
    }

    db.prepare('DELETE FROM user_phone_numbers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error releasing number:', error);
    res.status(500).json({ error: 'Failed to release phone number.' });
  }
});

export default router;
