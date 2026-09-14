import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;       // Window duration in milliseconds
  maxRequests: number;    // Maximum allowed requests within windowMs
  message?: string;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

/**
 * Creates an in-memory sliding window rate limiter middleware.
 * Complies with OWASP API Security best practices.
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  const clients = new Map<string, ClientRecord>();
  const { windowMs, maxRequests, message = 'Too many requests. Please try again later.' } = options;

  // Periodic cleanup of expired clients every 2 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of clients.entries()) {
      if (now > record.resetTime) {
        clients.delete(ip);
      }
    }
  }, 120000);

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = clients.get(clientIp);

    if (!record || now > record.resetTime) {
      // Initialize or reset window
      clients.set(clientIp, {
        count: 1,
        resetTime: now + windowMs,
      });

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      return next();
    }

    record.count += 1;
    const remaining = Math.max(0, maxRequests - record.count);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: message,
        retryAfter: retryAfterSeconds,
      });
    }

    next();
  };
};

/**
 * Pre-configured rate limiters for security tiers
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 15,     // 15 login/registration attempts per minute
  message: 'Authentication rate limit exceeded. Please wait 1 minute before retrying.',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 200,    // 200 general API requests per minute
  message: 'API rate limit exceeded. Please throttle your requests.',
});
