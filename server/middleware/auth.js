import jwt from 'jsonwebtoken';

// Read JWT_SECRET lazily so dotenv has time to load
export function getJwtSecret() {
  return process.env.JWT_SECRET || 'outreach-outbound-caller-secret-2026';
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
