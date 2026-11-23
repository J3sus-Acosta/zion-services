import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests, message } = options;
  const store = new Map<string, RateLimitRecord>();

  // Limpieza periódica para evitar fugas de memoria
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) {
        store.delete(key);
      }
    }
  }, Math.max(windowMs, 60000)).unref();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.user?.userId || req.ip || req.socket.remoteAddress || 'unknown';

    let record = store.get(key);

    if (!record || record.resetAt <= now) {
      record = {
        count: 1,
        resetAt: now + windowMs
      };
      store.set(key, record);
      return next();
    }

    record.count++;

    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message:
            message ||
            `Límite de solicitudes superado (${maxRequests} req/min). Por favor, reintente en ${retryAfterSeconds} segundos.`
        }
      });
      return;
    }

    next();
  };
}

// D14: Flota Rate Limiters
export const flotaGetRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: 'Límite de consultas a flota superado (máximo 120 req/min).'
});

export const flotaMutationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Límite de operaciones sobre flota superado (máximo 30 req/min).'
});
