/**
 * Lightweight fixed-window rate limiter middleware (zero external dependencies).
 * Keys by authenticated user ID when available, falling back to client IP.
 */
export function createRateLimiter({
  windowMs = 60 * 1000,
  maxRequests = 12,
  message = "Too many receipt scan requests. Please wait a minute before trying again.",
  keyGenerator = null,
} = {}) {
  const hits = new Map();

  const middleware = (req, res, next) => {
    const now = Date.now();
    const key =
      (typeof keyGenerator === "function" ? keyGenerator(req) : null) ||
      (req.user?._id ? `user:${String(req.user._id)}` : null) ||
      `ip:${req.ip || "unknown"}`;

    let record = hits.get(key);
    if (!record || now >= record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
      hits.set(key, record);
    }

    record.count += 1;

    // Periodically prune expired entries to prevent unbounded memory growth
    if (hits.size > 1000) {
      for (const [entryKey, entry] of hits.entries()) {
        if (now >= entry.resetAt) {
          hits.delete(entryKey);
        }
      }
    }

    if (record.count > maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.set("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds: retryAfterSec,
      });
    }

    next();
  };

  middleware.reset = () => hits.clear();
  return middleware;
}

