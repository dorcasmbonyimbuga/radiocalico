import { HttpError } from './errors.js';

// Fixed-window, in-memory rate limiter. State is per process, which fits a single-instance deployment.
export function rateLimit({
  windowMs,
  max,
  keyGenerator = (req) => req.ip ?? 'unknown',
  message = 'Too many requests, please try again later',
}) {
  const hits = new Map(); // key -> { count, resetAt }
  let lastSweep = 0;

  // Drop expired entries at most once per window so memory stays bounded
  function sweep(now) {
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }

  function middleware(req, res, next) {
    const now = Date.now();
    sweep(now);

    const key = keyGenerator(req);
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;

    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);
    res.set({
      'RateLimit-Limit': String(max),
      'RateLimit-Remaining': String(Math.max(0, max - entry.count)),
      'RateLimit-Reset': String(resetSeconds),
    });

    if (entry.count > max) {
      res.set('Retry-After', String(resetSeconds));
      return next(new HttpError(429, message));
    }
    next();
  }

  middleware.reset = () => hits.clear();
  return middleware;
}
