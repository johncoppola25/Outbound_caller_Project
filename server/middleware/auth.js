import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Read JWT_SECRET lazily so dotenv has time to load
// Generate a random fallback so the app doesn't use a guessable default
let _randomFallback;
export function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!_randomFallback) {
    _randomFallback = crypto.randomBytes(64).toString('hex');
    console.warn('⚠️ JWT_SECRET not set — using random secret (tokens will not survive restarts)');
  }
  return _randomFallback;
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export default authenticateToken;
