import express from 'express';
import Stripe from 'stripe';
import { getDb } from '../db/init.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();
router.use(requireAdmin);

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// GET /api/admin/users - all users
router.get('/users', async (req, res) => {
  try {
    const db = await getDb();
    const users = db.prepare(`
      SELECT id, email, name, company, role, setup_fee_paid,
             stripe_customer_id, subscription_plan, subscription_status, created_at
      FROM users ORDER BY created_at DESC
    `).all();
    res.json(users);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// GET /api/admin/stats - overview stats
router.get('/stats', async (req, res) => {
  try {
    const db = await getDb();

    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role != ?').get('admin');
    const activeSubscriptions = db.prepare('SELECT COUNT(*) as count FROM users WHERE subscription_status = ?').get('active');
    const setupFeesPaid = db.prepare('SELECT COUNT(*) as count FROM users WHERE setup_fee_paid = 1').get();
    const totalCalls = db.prepare('SELECT COUNT(*) as count FROM calls').get();
    const totalAppointments = db.prepare("SELECT COUNT(*) as count FROM calls WHERE outcome = ?").get('appointment_scheduled');
    const totalCampaigns = db.prepare('SELECT COUNT(*) as count FROM campaigns').get();

    res.json({
      totalUsers: totalUsers?.count || 0,
      activeSubscriptions: activeSubscriptions?.count || 0,
      setupFeesPaid: setupFeesPaid?.count || 0,
      totalCalls: totalCalls?.count || 0,
      totalAppointments: totalAppointments?.count || 0,
      totalCampaigns: totalCampaigns?.count || 0
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// GET /api/admin/revenue - revenue from Stripe
router.get('/revenue', async (req, res) => {
  try {
    if (!stripe) {
      return res.json({ monthly: 0, setupFees: 0, appointments: 0, total: 0, recentCharges: [] });
    }

    // Get recent charges
    const charges = await stripe.charges.list({ limit: 50 });

    let monthly = 0;
    let setupFees = 0;
    let appointments = 0;
    const recentCharges = [];

    for (const charge of charges.data) {
      if (charge.status !== 'succeeded') continue;
      const amount = charge.amount / 100;

      recentCharges.push({
        id: charge.id,
        amount,
        description: charge.description || 'Payment',
        customer: charge.customer,
        date: new Date(charge.created * 1000).toLocaleDateString(),
        status: charge.status
      });
    }

    // Get balance
    const balance = await stripe.balance.retrieve();
    const available = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100;
    const pending = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100;

    res.json({
      available,
      pending,
      total: available + pending,
      recentCharges
    });
  } catch (err) {
    console.error('Admin revenue error:', err);
    res.status(500).json({ error: 'Failed to fetch revenue.' });
  }
});

// PUT /api/admin/users/:id/role - change user role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const db = await getDb();
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin role update error:', err);
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

// DELETE /api/admin/users/:id - delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin user.' });

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

export default router;
