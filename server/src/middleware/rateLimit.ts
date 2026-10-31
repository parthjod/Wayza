import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Global rate limit: 2000 requests / 15 min / IP in prod (scaled for campus Wi-Fi / shared IPs), 5000 in dev
 */
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 5000 : 2000,
  skip: () => env.NODE_ENV === 'development',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { error: 'Too many requests, please try again later.' },
});

/**
 * Auth rate limit: 300 requests / 15 min / IP in prod (scaled for campus Wi-Fi), 1000 in dev
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 1000 : 300,
  skip: () => env.NODE_ENV === 'development',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: { error: 'Too many authentication attempts, please try again later.' },
});
