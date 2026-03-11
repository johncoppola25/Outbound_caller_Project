// Simple in-memory rate limiter middleware
// Tracks request counts per IP with sliding window

const stores = {};

function createRateLimiter(name, maxRequests, windowMs) {
  if (!stores[name]) {
    stores[name] = new Map();
  }
  const store = stores[name];

  // Cleanup old entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart > windowMs * 2) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || now - entry.windowStart > windowMs) {
      entry = { count: 1, windowStart: now };
      store.set(ip, entry);
      return next();
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter
      });
    }

    next();
  };
}

// General API: 100 requests per minute per IP
export const generalLimiter = createRateLimiter('general', 100, 60 * 1000);

// Auth endpoints: 10 requests per minute per IP
export const authLimiter = createRateLimiter('auth', 10, 60 * 1000);

// Call initiation: 30 requests per minute per IP
export const callLimiter = createRateLimiter('call', 30, 60 * 1000);
