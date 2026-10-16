import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Global rate limit: 100 requests / 15 min / IP (bypassed in dev)
 */
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 5000 : 100,
  skip: () => env.NODE_ENV === 'development',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { error: 'Too many requests, please try again later.' },
});

/**
 * Auth rate limit: 60 requests / 15 min / IP (stricter for auth endpoints in prod, bypassed in dev)
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 1000 : 60,
  skip: () => env.NODE_ENV === 'development',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { error: 'Too many authentication attempts, please try again later.' },
});

