import { getDb } from '../db/init.js';

/**
 * Log an activity event to the activity_log table.
 * Catches all errors silently so it never breaks calling code.
 *
 * @param {string|null} userId - The user who performed the action (null for system events)
 * @param {string} action - Action identifier (e.g. 'login', 'register', 'payment')
 * @param {object|string|null} details - Extra context (will be JSON-stringified if object)
 * @param {string|null} ip - The request IP address
 */
export async function logActivity(userId, action, details, ip) {
  try {
    const db = await getDb();
    const detailsStr = details && typeof details === 'object' ? JSON.stringify(details) : details || null;
    db.prepare(
      'INSERT INTO activity_log (user_id, action, details, ip) VALUES (?, ?, ?, ?)'
    ).run(userId || null, action, detailsStr, ip || null);
  } catch (err) {
    // Silently ignore - activity logging should never break the calling code
  }
}
