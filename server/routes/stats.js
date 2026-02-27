import express from 'express';
import { getDb } from '../db/init.js';

const router = express.Router();

// Get overall dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const db = await getDb();
    
    // Campaign stats
    const campaignStats = db.prepare(`
      SELECT 
        COUNT(*) as total_campaigns,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_campaigns
      FROM campaigns
    `).get();
    
    // Contact stats
    const contactStats = db.prepare(`
      SELECT 
        COUNT(*) as total_contacts,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_contacts,
        SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted_contacts,
        SUM(CASE WHEN status = 'not_interested' THEN 1 ELSE 0 END) as not_interested_contacts
      FROM contacts
    `).get();
    
    // Call stats
    const callStats = db.prepare(`
      SELECT 
        COUNT(*) as total_calls,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as active_calls,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_calls,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued_calls,
        AVG(CASE WHEN duration_seconds > 0 THEN duration_seconds END) as avg_duration
      FROM calls
    `).get();
    
    // Outcome stats
    const outcomeStats = db.prepare(`
      SELECT 
        outcome,
        COUNT(*) as count
      FROM calls
      WHERE outcome IS NOT NULL
      GROUP BY outcome
    `).all();
    
    // Today's stats
    const todayStats = db.prepare(`
      SELECT 
        COUNT(*) as calls_today,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_today,
        SUM(CASE WHEN outcome = 'appointment_scheduled' THEN 1 ELSE 0 END) as appointments_today
      FROM calls
      WHERE DATE(created_at) = DATE('now')
    `).get();
    
    // This week's stats
    const weekStats = db.prepare(`
      SELECT 
        COUNT(*) as calls_this_week,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_this_week,
        SUM(CASE WHEN outcome = 'appointment_scheduled' THEN 1 ELSE 0 END) as appointments_this_week
      FROM calls
      WHERE DATE(created_at) >= DATE('now', '-7 days')
    `).get();
    
    res.json({
      campaigns: campaignStats,
      contacts: contactStats,
      calls: callStats,
      outcomes: outcomeStats,
      today: todayStats,
      thisWeek: weekStats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get campaign-specific stats
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const db = await getDb();
    const campaignId = req.params.campaignId;
    
    // Basic stats
    const basicStats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM contacts WHERE campaign_id = ?) as total_contacts,
        (SELECT COUNT(*) FROM calls WHERE campaign_id = ?) as total_calls,
        (SELECT COUNT(*) FROM calls WHERE campaign_id = ? AND status = 'completed') as completed_calls,
        (SELECT AVG(duration_seconds) FROM calls WHERE campaign_id = ? AND duration_seconds > 0) as avg_duration
      FROM campaigns WHERE id = ?
    `).get(campaignId, campaignId, campaignId, campaignId, campaignId);
    
    // Contact status breakdown
    const contactBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM contacts
      WHERE campaign_id = ?
      GROUP BY status
    `).all(campaignId);
    
    // Call status breakdown
    const callBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM calls
      WHERE campaign_id = ?
      GROUP BY status
    `).all(campaignId);
    
    // Outcome breakdown
    const outcomeBreakdown = db.prepare(`
      SELECT outcome, COUNT(*) as count
      FROM calls
      WHERE campaign_id = ? AND outcome IS NOT NULL
      GROUP BY outcome
    `).all(campaignId);
    
    // Calls over time (last 7 days)
    const callsOverTime = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN outcome = 'appointment_scheduled' THEN 1 ELSE 0 END) as appointments
      FROM calls
      WHERE campaign_id = ? AND DATE(created_at) >= DATE('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all(campaignId);
    
    // Hourly distribution
    const hourlyDistribution = db.prepare(`
      SELECT 
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as calls,
        SUM(CASE WHEN outcome = 'appointment_scheduled' THEN 1 ELSE 0 END) as appointments
      FROM calls
      WHERE campaign_id = ?
      GROUP BY hour
      ORDER BY hour
    `).all(campaignId);
    
    res.json({
      basic: basicStats,
      contactBreakdown,
      callBreakdown,
      outcomeBreakdown,
      callsOverTime,
      hourlyDistribution,
      conversionRate: basicStats?.total_calls > 0 
        ? (outcomeBreakdown.find(o => o.outcome === 'appointment_scheduled')?.count || 0) / basicStats.total_calls * 100 
        : 0
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ error: 'Failed to fetch campaign stats' });
  }
});

// Get call analytics
router.get('/analytics', async (req, res) => {
  try {
    const db = await getDb();
    const { period = '7d' } = req.query;
    
    let dateFilter;
    switch (period) {
      case '24h':
        dateFilter = "DATE(created_at) >= DATE('now', '-1 day')";
        break;
      case '7d':
        dateFilter = "DATE(created_at) >= DATE('now', '-7 days')";
        break;
      case '30d':
        dateFilter = "DATE(created_at) >= DATE('now', '-30 days')";
        break;
      case '90d':
        dateFilter = "DATE(created_at) >= DATE('now', '-90 days')";
        break;
      default:
        dateFilter = "1=1";
    }
    
    // Calls over time
    const callsOverTime = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN outcome = 'appointment_scheduled' THEN 1 ELSE 0 END) as appointments
      FROM calls
      WHERE ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all();
    
    // Campaign performance (completion rate, appointment %, callback %, voicemail %, avg duration)
    const campaignPerformance = db.prepare(`
      SELECT 
        cp.id,
        cp.name,
        cp.type,
        COUNT(cl.id) as total_calls,
        SUM(CASE WHEN cl.status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
        SUM(CASE WHEN cl.outcome = 'appointment_scheduled' THEN 1 ELSE 0 END) as appointments,
        SUM(CASE WHEN cl.outcome = 'callback_requested' THEN 1 ELSE 0 END) as callbacks,
        SUM(CASE WHEN cl.outcome = 'voicemail' THEN 1 ELSE 0 END) as voicemails,
        AVG(CASE WHEN cl.duration_seconds > 0 THEN cl.duration_seconds END) as avg_duration
      FROM campaigns cp
      LEFT JOIN calls cl ON cp.id = cl.campaign_id
      GROUP BY cp.id
      ORDER BY total_calls DESC
    `).all();
    
    // Best performing hours
    const bestHours = db.prepare(`
      SELECT 
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as total_calls,
        SUM(CASE WHEN outcome = 'appointment_scheduled' THEN 1 ELSE 0 END) as appointments,
        ROUND(CAST(SUM(CASE WHEN outcome = 'appointment_scheduled' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 2) as conversion_rate
      FROM calls
      WHERE ${dateFilter}
      GROUP BY hour
      ORDER BY conversion_rate DESC
      LIMIT 5
    `).all();
    
    // Outcome distribution
    const outcomeDistribution = db.prepare(`
      SELECT 
        COALESCE(outcome, 'no_outcome') as outcome,
        COUNT(*) as count,
        ROUND(CAST(COUNT(*) AS FLOAT) * 100.0 / (SELECT COUNT(*) FROM calls WHERE ${dateFilter}), 2) as percentage
      FROM calls
      WHERE ${dateFilter}
      GROUP BY outcome
      ORDER BY count DESC
    `).all();
    
    res.json({
      callsOverTime,
      campaignPerformance,
      bestHours,
      outcomeDistribution
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
