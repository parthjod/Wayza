import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { redis } from '../config/redis';
import { env } from '../config/env';

/**
 * Generate a 6-digit cryptographically random OTP
 */
export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash OTP with bcrypt (cost 10)
 */
export async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

/**
 * Compare plain OTP with bcrypt hash
 */
export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

// In-memory fallback map for OTPs if Redis is offline or timing out
const memoryOtpStore = new Map<string, { hash: string; expiresAt: number; attempts: number }>();

/**
 * Store OTP hash in Redis with TTL (with in-memory fallback)
 */
export async function storeOTP(phone: string, otpHash: string): Promise<void> {
  const ttl = env.OTP_TTL_SECONDS;
  memoryOtpStore.set(phone, {
    hash: otpHash,
    expiresAt: Date.now() + ttl * 1000,
    attempts: 0,
  });

  try {
    const key = `otp:phone:${phone}`;
    const attemptsKey = `otp:attempts:${phone}`;
    await redis.setex(key, ttl, otpHash);
    await redis.setex(attemptsKey, ttl, '0');
  } catch (err: any) {
    console.warn('[Redis] storeOTP fallback to memory store:', err.message);
  }
}

/**
 * Retrieve OTP hash from Redis (with in-memory fallback)
 */
export async function getStoredOTP(phone: string): Promise<string | null> {
  try {
    const redisVal = await redis.get(`otp:phone:${phone}`);
    if (redisVal) return redisVal;
  } catch (err: any) {
    console.warn('[Redis] getStoredOTP fallback to memory store:', err.message);
  }

  const mem = memoryOtpStore.get(phone);
  if (mem && mem.expiresAt > Date.now()) {
    return mem.hash;
  }
  return null;
}

/**
 * Increment and check OTP attempt counter.
 */
export async function incrementOTPAttempts(phone: string): Promise<number> {
  const mem = memoryOtpStore.get(phone);
  if (mem) {
    mem.attempts += 1;
    if (mem.attempts >= env.OTP_MAX_ATTEMPTS) {
      memoryOtpStore.delete(phone);
    }
  }

  try {
    const attemptsKey = `otp:attempts:${phone}`;
    const attempts = await redis.incr(attemptsKey);
    if (attempts >= env.OTP_MAX_ATTEMPTS) {
      await redis.del(`otp:phone:${phone}`);
    }
    return attempts;
  } catch (err: any) {
    console.warn('[Redis] incrementOTPAttempts fallback:', err.message);
    return mem ? mem.attempts : 1;
  }
}

/**
 * Delete OTP data from Redis
 */
export async function deleteOTP(phone: string): Promise<void> {
  memoryOtpStore.delete(phone);
  try {
    await redis.del(`otp:phone:${phone}`, `otp:attempts:${phone}`);
  } catch (err: any) {
    console.warn('[Redis] deleteOTP fallback:', err.message);
  }
}

/**
 * Check OTP send rate limit (max 3 per 10 min per phone in production, bypassed in dev)
 */
export async function checkOTPRateLimit(phone: string): Promise<{
  allowed: boolean;
  retryAfterSeconds?: number;
}> {
  // In development, allow unlimited OTP generation for easy testing and debugging
  if (env.NODE_ENV === 'development') {
    return { allowed: true };
  }

  const key = `otp:rate:${phone}`;
  const windowSeconds = 600; // 10 minutes

  try {
    const current = await redis.get(key);
    if (current && parseInt(current, 10) >= 3) {
      const ttl = await redis.ttl(key);
      return { allowed: false, retryAfterSeconds: ttl > 0 ? ttl : windowSeconds };
    }

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    return { allowed: true };
  } catch (err: any) {
    console.warn('[Redis] checkOTPRateLimit skipped due to Redis timeout:', err.message);
    return { allowed: true };
  }
}

/**
 * Generate HMAC-SHA256 signed email verification token
 */
export function generateEmailVerificationToken(userId: string, email: string): string {
  const payload = JSON.stringify({
    userId,
    email,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  const signature = crypto
    .createHmac('sha256', env.OTP_HMAC_SECRET)
    .update(payload)
    .digest('hex');
  const token = Buffer.from(`${payload}.${signature}`).toString('base64url');
  return token;
}

/**
 * Verify email verification token
 */
export function verifyEmailVerificationToken(
  token: string
): { userId: string; email: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const lastDotIndex = decoded.lastIndexOf('.');
    if (lastDotIndex === -1) return null;

    const payload = decoded.substring(0, lastDotIndex);
    const signature = decoded.substring(lastDotIndex + 1);

    const expectedSignature = crypto
      .createHmac('sha256', env.OTP_HMAC_SECRET)
      .update(payload)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const data = JSON.parse(payload);
    if (data.exp < Date.now()) return null;

    return { userId: data.userId, email: data.email };
  } catch {
    return null;
  }
}
