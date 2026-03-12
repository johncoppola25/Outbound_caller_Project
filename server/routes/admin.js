import express from 'express';
import Stripe from 'stripe';
import { getDb } from '../db/init.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();
router.use(requireAdmin);

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// GET /api/admin/users - all users with payment + call stats
router.get('/users', async (req, res) => {
  try {
    const db = await getDb();
    const users = db.prepare(`
      SELECT id, email, name, company, role, setup_fee_paid,
             stripe_customer_id, subscription_plan, subscription_status,
             calling_balance, auto_fund_enabled, created_at
      FROM users ORDER BY created_at DESC
    `).all();

    // Get current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const enriched = users.map(user => {
      // Per-user call stats via campaigns they own
      const userCalls = db.prepare(`
        SELECT COUNT(*) as total_calls,
               COALESCE(SUM(cl.duration_seconds), 0) as total_seconds,
               COALESCE(SUM(cl.estimated_cost), 0) as total_cost
        FROM calls cl
        JOIN campaigns cp ON cl.campaign_id = cp.id
        WHERE cp.user_id = ?
      `).get(user.id);

      // Payment stats from local payments table
      const totalPaid = db.prepare(
        'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE user_id = ? AND status = ?'
      ).get(user.id, 'succeeded');

      const paidThisMonth = db.prepare(
        'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE user_id = ? AND status = ? AND created_at >= ? AND created_at <= ?'
      ).get(user.id, 'succeeded', monthStart, monthEnd);

      const lastPayment = db.prepare(
        'SELECT amount, type, created_at FROM payments WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
      ).get(user.id, 'succeeded');

      const paymentCount = db.prepare(
        'SELECT COUNT(*) as count FROM payments WHERE user_id = ? AND status = ?'
      ).get(user.id, 'succeeded');

      // Phone numbers count
      const phoneCount = db.prepare(
        'SELECT COUNT(*) as count FROM user_phone_numbers WHERE user_id = ?'
      ).get(user.id);

      return {
        ...user,
        calling_balance: user.calling_balance || 0,
        total_paid: totalPaid?.total || 0,
        paid_this_month: paidThisMonth?.total || 0,
        last_payment_at: lastPayment?.created_at || null,
        last_payment_amount: lastPayment?.amount || 0,
        last_payment_type: lastPayment?.type || null,
        payment_count: paymentCount?.count || 0,
        phone_numbers: phoneCount?.count || 0
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// GET /api/admin/users/:id/data - full user data (campaigns, calls, contacts, stats)
router.get('/users/:id/data', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.params.id;

    const user = db.prepare('SELECT id, email, name, company, role, calling_balance, created_at FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // User's campaigns
    const campaigns = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM contacts WHERE campaign_id = c.id) as contact_count,
        (SELECT COUNT(*) FROM calls WHERE campaign_id = c.id) as call_count,
        (SELECT COUNT(*) FROM calls WHERE campaign_id = c.id AND status = 'completed') as completed_calls,
        (SELECT COUNT(*) FROM calls WHERE campaign_id = c.id AND outcome = 'appointment_scheduled') as appointments
      FROM campaigns c
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `).all(userId);

    // Call stats
    const callStats = db.prepare(`
      SELECT
        COUNT(*) as total_calls,
        SUM(CASE WHEN cl.status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
        SUM(CASE WHEN cl.outcome = 'appointment_scheduled' THEN 1 ELSE 0 END) as appointments,
        SUM(CASE WHEN cl.outcome = 'callback_requested' THEN 1 ELSE 0 END) as callbacks,
        SUM(CASE WHEN cl.outcome = 'not_interested' THEN 1 ELSE 0 END) as not_interested,
        AVG(CASE WHEN cl.duration_seconds > 0 THEN cl.duration_seconds END) as avg_duration,
        COALESCE(SUM(cl.estimated_cost), 0) as total_cost
      FROM calls cl
      JOIN campaigns cp ON cl.campaign_id = cp.id
      WHERE cp.user_id = ?
    `).get(userId);

    // Contact stats
    const contactStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN ct.status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN ct.status = 'converted' THEN 1 ELSE 0 END) as converted,
        SUM(CASE WHEN ct.status = 'not_interested' THEN 1 ELSE 0 END) as not_interested
      FROM contacts ct
      JOIN campaigns cp ON ct.campaign_id = cp.id
      WHERE cp.user_id = ?
    `).get(userId);

    // Recent calls
    const recentCalls = db.prepare(`
      SELECT cl.id, cl.status, cl.outcome, cl.duration_seconds, cl.estimated_cost, cl.created_at,
        ct.first_name, ct.last_name, ct.phone,
        cp.name as campaign_name
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      JOIN campaigns cp ON cl.campaign_id = cp.id
      WHERE cp.user_id = ?
      ORDER BY cl.created_at DESC
      LIMIT 25
    `).all(userId);

    // Upcoming appointments
    const appointments = db.prepare(`
      SELECT cl.id, cl.appointment_at, ct.first_name, ct.last_name, ct.phone, cp.name as campaign_name
      FROM calls cl
      JOIN contacts ct ON cl.contact_id = ct.id
      JOIN campaigns cp ON cl.campaign_id = cp.id
      WHERE cp.user_id = ? AND cl.outcome = 'appointment_scheduled'
      ORDER BY cl.appointment_at ASC
    `).all(userId);

    // Phone numbers
    const phoneNumbers = db.prepare('SELECT * FROM user_phone_numbers WHERE user_id = ?').all(userId);

    res.json({ user, campaigns, callStats, contactStats, recentCalls, appointments, phoneNumbers });
  } catch (err) {
    console.error('Admin user data error:', err);
    res.status(500).json({ error: 'Failed to fetch user data.' });
  }
});

// GET /api/admin/users/:id/payments - payment history for one user
router.get('/users/:id/payments', async (req, res) => {
  try {
    const db = await getDb();
    const payments = db.prepare(
      'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
    ).all(req.params.id);
    res.json(payments);
  } catch (err) {
    console.error('Admin user payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments.' });
  }
});

// GET /api/admin/stats - overview stats
router.get('/stats', async (req, res) => {
  try {
    const db = await getDb();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role != ?').get('admin');
    const activeSubscriptions = db.prepare('SELECT COUNT(*) as count FROM users WHERE subscription_status = ?').get('active');
    const setupFeesPaid = db.prepare('SELECT COUNT(*) as count FROM users WHERE setup_fee_paid = 1').get();
    const totalCalls = db.prepare('SELECT COUNT(*) as count FROM calls').get();
    const totalAppointments = db.prepare("SELECT COUNT(*) as count FROM calls WHERE outcome = ?").get('appointment_scheduled');
    const totalCampaigns = db.prepare('SELECT COUNT(*) as count FROM campaigns').get();

    // Revenue stats
    const revenueThisMonth = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = ? AND created_at >= ?'
    ).get('succeeded', monthStart);
    const revenueLastMonth = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = ? AND created_at >= ? AND created_at <= ?'
    ).get('succeeded', lastMonthStart, lastMonthEnd);
    const revenueAllTime = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = ?'
    ).get('succeeded');

    // Calls this month
    const callsThisMonth = db.prepare(
      'SELECT COUNT(*) as count FROM calls WHERE created_at >= ?'
    ).get(monthStart);

    // Total call minutes
    const totalMinutes = db.prepare(
      'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM calls WHERE status = ?'
    ).get('completed');

    res.json({
      totalUsers: totalUsers?.count || 0,
      activeSubscriptions: activeSubscriptions?.count || 0,
      setupFeesPaid: setupFeesPaid?.count || 0,
      totalCalls: totalCalls?.count || 0,
      callsThisMonth: callsThisMonth?.count || 0,
      totalAppointments: totalAppointments?.count || 0,
      totalCampaigns: totalCampaigns?.count || 0,
      totalMinutes: Math.round((totalMinutes?.total || 0) / 60),
      revenueThisMonth: revenueThisMonth?.total || 0,
      revenueLastMonth: revenueLastMonth?.total || 0,
      revenueAllTime: revenueAllTime?.total || 0
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// GET /api/admin/revenue - revenue from Stripe + local
router.get('/revenue', async (req, res) => {
  try {
    const db = await getDb();

    // Get all payments from local DB grouped by month
    const monthlyRevenue = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month,
             SUM(amount) as total,
             COUNT(*) as count
      FROM payments WHERE status = 'succeeded'
      GROUP BY month ORDER BY month DESC LIMIT 12
    `).all();

    // Revenue by type
    const byType = db.prepare(`
      SELECT type, SUM(amount) as total, COUNT(*) as count
      FROM payments WHERE status = 'succeeded'
      GROUP BY type
    `).all();

    // Recent payments with user info
    const recentPayments = db.prepare(`
      SELECT p.*, u.name as user_name, u.email as user_email
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC LIMIT 50
    `).all();

    // Stripe balance
    let available = 0, pending = 0;
    if (stripe) {
      try {
        const balance = await stripe.balance.retrieve();
        available = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100;
        pending = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100;
      } catch (e) { /* ignore */ }
    }

    res.json({
      available,
      pending,
      monthlyRevenue,
      byType,
      recentPayments
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

// PUT /api/admin/users/:id/balance - adjust user balance
router.put('/users/:id/balance', async (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (typeof amount !== 'number') {
      return res.status(400).json({ error: 'Invalid amount.' });
    }

    const db = await getDb();
    const user = db.prepare('SELECT calling_balance FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const newBalance = Math.max(0, (user.calling_balance || 0) + amount);
    db.prepare('UPDATE users SET calling_balance = ? WHERE id = ?').run(newBalance, req.params.id);

    // Record as admin adjustment
    const { v4: uuidv4 } = await import('uuid');
    db.prepare('INSERT INTO payments (id, user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), req.params.id, 'admin_adjustment', amount, 'succeeded', reason || `Admin balance adjustment: ${amount >= 0 ? '+' : ''}$${amount.toFixed(2)}`);

    res.json({ success: true, newBalance });
  } catch (err) {
    console.error('Admin balance update error:', err);
    res.status(500).json({ error: 'Failed to update balance.' });
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
