import express from 'express';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/init.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { getJwtSecret } from '../middleware/auth.js';
import { sendEmail } from '../services/email.js';
import { logActivity } from '../services/activityLog.js';

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
             calling_balance, auto_fund_enabled, secondary_emails, created_at
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

    logActivity(req.user.userId, 'role_changed', { targetUserId: req.params.id, role }, req.ip);

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

    logActivity(req.user.userId, 'balance_adjusted', { targetUserId: req.params.id, amount, reason: reason || null, newBalance }, req.ip);

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

    logActivity(req.user.userId, 'user_deleted', { targetUserId: req.params.id, email: user.email, name: user.name }, req.ip);

    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// PUT /api/admin/users/:id/profile - admin edit user name/email/password/secondary emails
router.put('/users/:id/profile', async (req, res) => {
  try {
    const { name, email, password, secondary_emails } = req.body;
    const db = await getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.params.id);
    }
    if (email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.params.id);
      if (existing) return res.status(409).json({ error: 'Email already taken by another user.' });
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, req.params.id);
    }
    if (password) {
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.default.hash(password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.params.id);
    }
    if (secondary_emails !== undefined) {
      db.prepare('UPDATE users SET secondary_emails = ? WHERE id = ?').run(secondary_emails, req.params.id);
    }

    logActivity(req.user.userId, 'admin_profile_edit', { targetUserId: req.params.id, name: name || undefined, email: email || undefined }, req.ip);

    const updated = db.prepare('SELECT id, name, email, role, calling_balance, subscription_status, setup_fee_paid, secondary_emails FROM users WHERE id = ?').get(req.params.id);
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Admin profile update error:', err);
    res.status(500).json({ error: 'Failed to update user profile.' });
  }
});

// GET /api/admin/activity - activity log
router.get('/activity', async (req, res) => {
  try {
    const db = await getDb();
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    let where = [];
    let params = [];

    if (req.query.user_id) {
      where.push('a.user_id = ?');
      params.push(req.query.user_id);
    }
    if (req.query.action) {
      where.push('a.action = ?');
      params.push(req.query.action);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const total = db.prepare(
      `SELECT COUNT(*) as count FROM activity_log a ${whereClause}`
    ).get(...params);

    const logs = db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM activity_log a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({ logs, total: total?.count || 0 });
  } catch (err) {
    console.error('Admin activity log error:', err);
    res.status(500).json({ error: 'Failed to fetch activity log.' });
  }
});

// GET /api/admin/platform-stats - live platform stats
router.get('/platform-stats', async (req, res) => {
  try {
    const db = await getDb();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const activeCampaigns = db.prepare(
      "SELECT COUNT(*) as count FROM campaigns WHERE status = 'active'"
    ).get();

    const callsInProgress = db.prepare(
      "SELECT COUNT(*) as count FROM calls WHERE status IN ('in_progress', 'ringing')"
    ).get();

    const callsToday = db.prepare(
      'SELECT COUNT(*) as count FROM calls WHERE created_at >= ?'
    ).get(todayISO);

    const appointmentsToday = db.prepare(
      "SELECT COUNT(*) as count FROM calls WHERE outcome = 'appointment_scheduled' AND created_at >= ?"
    ).get(todayISO);

    const totalContacts = db.prepare(
      'SELECT COUNT(*) as count FROM contacts'
    ).get();

    const totalPhoneNumbers = db.prepare(
      'SELECT COUNT(*) as count FROM user_phone_numbers'
    ).get();

    const campaignCount = db.prepare(
      'SELECT COUNT(*) as count FROM campaigns'
    ).get();
    const totalCalls = db.prepare(
      'SELECT COUNT(*) as count FROM calls'
    ).get();
    const avgCallsPerCampaign = campaignCount?.count > 0
      ? Math.round((totalCalls?.count || 0) / campaignCount.count * 100) / 100
      : 0;

    res.json({
      activeCampaigns: activeCampaigns?.count || 0,
      callsInProgress: callsInProgress?.count || 0,
      callsToday: callsToday?.count || 0,
      appointmentsToday: appointmentsToday?.count || 0,
      totalContacts: totalContacts?.count || 0,
      totalPhoneNumbers: totalPhoneNumbers?.count || 0,
      avgCallsPerCampaign
    });
  } catch (err) {
    console.error('Admin platform stats error:', err);
    res.status(500).json({ error: 'Failed to fetch platform stats.' });
  }
});

// GET /api/admin/call-quality - call quality metrics
router.get('/call-quality', async (req, res) => {
  try {
    const db = await getDb();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const avgDuration = db.prepare(
      "SELECT AVG(duration_seconds) as avg FROM calls WHERE status = 'completed' AND duration_seconds > 0"
    ).get();

    const totalCalls = db.prepare(
      'SELECT COUNT(*) as count FROM calls'
    ).get();

    const voicemailCount = db.prepare(
      "SELECT COUNT(*) as count FROM calls WHERE outcome = 'voicemail'"
    ).get();

    const completedCalls = db.prepare(
      "SELECT COUNT(*) as count FROM calls WHERE status = 'completed'"
    ).get();

    const appointmentCount = db.prepare(
      "SELECT COUNT(*) as count FROM calls WHERE outcome = 'appointment_scheduled'"
    ).get();

    const notInterestedCount = db.prepare(
      "SELECT COUNT(*) as count FROM calls WHERE outcome = 'not_interested'"
    ).get();

    const callbackCount = db.prepare(
      "SELECT COUNT(*) as count FROM calls WHERE outcome = 'callback_requested'"
    ).get();

    const totalCallsCount = totalCalls?.count || 0;
    const completedCount = completedCalls?.count || 0;

    const voicemailRate = totalCallsCount > 0
      ? Math.round((voicemailCount?.count || 0) / totalCallsCount * 10000) / 100
      : 0;
    const appointmentRate = completedCount > 0
      ? Math.round((appointmentCount?.count || 0) / completedCount * 10000) / 100
      : 0;
    const notInterestedRate = totalCallsCount > 0
      ? Math.round((notInterestedCount?.count || 0) / totalCallsCount * 10000) / 100
      : 0;
    const callbackRate = totalCallsCount > 0
      ? Math.round((callbackCount?.count || 0) / totalCallsCount * 10000) / 100
      : 0;

    // Average calls per contact
    const contactsWithCalls = db.prepare(
      'SELECT COUNT(DISTINCT contact_id) as count FROM calls'
    ).get();
    const avgCallsPerContact = (contactsWithCalls?.count || 0) > 0
      ? Math.round(totalCallsCount / contactsWithCalls.count * 100) / 100
      : 0;

    // Calls by hour of day (last 30 days)
    const callsByHour = db.prepare(`
      SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
             COUNT(*) as count
      FROM calls
      WHERE created_at >= ?
      GROUP BY hour
      ORDER BY hour ASC
    `).all(thirtyDaysAgo);

    res.json({
      avgDuration: Math.round(avgDuration?.avg || 0),
      voicemailRate,
      appointmentRate,
      notInterestedRate,
      callbackRate,
      avgCallsPerContact,
      callsByHour
    });
  } catch (err) {
    console.error('Admin call quality error:', err);
    res.status(500).json({ error: 'Failed to fetch call quality metrics.' });
  }
});

// GET /api/admin/churn - churn tracking
router.get('/churn', async (req, res) => {
  try {
    const db = await getDb();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Users with canceled or past_due subscriptions
    const canceled = db.prepare(`
      SELECT id, email, name, subscription_status, subscription_plan, created_at
      FROM users
      WHERE subscription_status IN ('canceled', 'past_due') AND role != 'admin'
      ORDER BY created_at DESC
    `).all();

    // Active subscribers with no calls in last 30 days
    const inactive = db.prepare(`
      SELECT u.id, u.email, u.name, u.subscription_status, u.subscription_plan, u.created_at
      FROM users u
      WHERE u.subscription_status = 'active' AND u.role != 'admin'
        AND u.id NOT IN (
          SELECT DISTINCT cp.user_id
          FROM calls cl
          JOIN campaigns cp ON cl.campaign_id = cp.id
          WHERE cl.created_at >= ?
        )
      ORDER BY u.created_at DESC
    `).all(thirtyDaysAgo);

    // Users who signed up but never paid setup fee (account older than 7 days)
    const neverPaid = db.prepare(`
      SELECT id, email, name, subscription_status, created_at
      FROM users
      WHERE setup_fee_paid = 0 AND role != 'admin' AND created_at <= ?
      ORDER BY created_at DESC
    `).all(sevenDaysAgo);

    res.json({ canceled, inactive, neverPaid });
  } catch (err) {
    console.error('Admin churn error:', err);
    res.status(500).json({ error: 'Failed to fetch churn data.' });
  }
});

// POST /api/admin/users/:id/impersonate - impersonate a user
router.post('/users/:id/impersonate', async (req, res) => {
  try {
    const db = await getDb();
    const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot impersonate admin users.' });

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Admin impersonate error:', err);
    res.status(500).json({ error: 'Failed to impersonate user.' });
  }
});

// POST /api/admin/bulk-email - send bulk email to users
router.post('/bulk-email', async (req, res) => {
  try {
    const { subject, message, filter } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required.' });
    }
    if (!['all', 'active', 'inactive'].includes(filter)) {
      return res.status(400).json({ error: 'Filter must be all, active, or inactive.' });
    }

    const db = await getDb();
    let users;
    if (filter === 'active') {
      users = db.prepare("SELECT email, name FROM users WHERE subscription_status = 'active' AND role != 'admin'").all();
    } else if (filter === 'inactive') {
      users = db.prepare("SELECT email, name FROM users WHERE (subscription_status IS NULL OR subscription_status != 'active') AND role != 'admin'").all();
    } else {
      users = db.prepare("SELECT email, name FROM users WHERE role != 'admin'").all();
    }

    let sent = 0;
    for (const user of users) {
      const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h1 style="font-size:20px;color:#111827;margin:0 0 16px;">${subject}</h1>
    <div style="font-size:15px;color:#374151;line-height:1.6;">${message}</div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">OutReach AI - AI-Powered Outbound Calling Platform</p>
  </div>
</body></html>`;
      const result = await sendEmail(user.email, subject, htmlBody);
      if (result) sent++;
    }

    res.json({ sent });
  } catch (err) {
    console.error('Admin bulk email error:', err);
    res.status(500).json({ error: 'Failed to send bulk emails.' });
  }
});

// POST /api/admin/users/:id/pause-campaigns - pause all active campaigns for a user
router.post('/users/:id/pause-campaigns', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.prepare(
      "UPDATE campaigns SET status = 'paused' WHERE user_id = ? AND status = 'active'"
    ).run(req.params.id);

    res.json({ paused: result.changes });
  } catch (err) {
    console.error('Admin pause campaigns error:', err);
    res.status(500).json({ error: 'Failed to pause campaigns.' });
  }
});

// POST /api/admin/users/:id/resume-campaigns - resume all paused campaigns for a user
router.post('/users/:id/resume-campaigns', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.prepare(
      "UPDATE campaigns SET status = 'active' WHERE user_id = ? AND status = 'paused'"
    ).run(req.params.id);

    res.json({ resumed: result.changes });
  } catch (err) {
    console.error('Admin resume campaigns error:', err);
    res.status(500).json({ error: 'Failed to resume campaigns.' });
  }
});

export default router;
