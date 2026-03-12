import { getDb } from '../db/init.js';

export async function requireAdmin(req, res, next) {
  try {
    const db = await getDb();
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.userId);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    next();
  } catch (err) {
    console.error('Admin auth error:', err);
    res.status(500).json({ error: 'Authorization failed.' });
  }
}
