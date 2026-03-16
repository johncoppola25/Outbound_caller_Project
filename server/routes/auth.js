import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/init.js';
import { authenticateToken, getJwtSecret } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, company, username } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required.' });
    }

    const db = await getDb();

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    // Check if username already exists (if provided)
    if (username) {
      const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existingUsername) {
        return res.status(409).json({ error: 'This username is already taken.' });
      }
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);

    db.prepare(
      'INSERT INTO users (id, email, password_hash, name, company, role, username) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, email, password_hash, name, company || null, 'user', username || null);

    const displayName = username || name;
    const token = jwt.sign(
      { userId: id, email, name: displayName, role: 'user' },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id, email, name, username: username || null, company: company || null, role: 'user' }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const loginName = username || email; // support both

    if (!loginName || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const db = await getDb();

    // Look up by email, username, or name
    const user = db.prepare('SELECT * FROM users WHERE email = ? OR name = ? OR username = ?').get(loginName, loginName, loginName);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const validPassword = await bcrypt.compare(password, String(user.password_hash));
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const user = db.prepare('SELECT id, email, name, company, role, created_at FROM users WHERE id = ?').get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user info.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const db = await getDb();

    // Check if email is already taken by another user
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.userId);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, req.user.userId);

    const user = db.prepare('SELECT id, email, name, company, role, created_at FROM users WHERE id = ?').get(req.user.userId);

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.json({ token, user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// PUT /api/auth/password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    const db = await getDb();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const validPassword = await bcrypt.compare(currentPassword, String(user.password_hash));
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, req.user.userId);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

export default router;
