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

/**
 * Store OTP hash in Redis with TTL
 */
export async function storeOTP(phone: string, otpHash: string): Promise<void> {
  const key = `otp:phone:${phone}`;
  const attemptsKey = `otp:attempts:${phone}`;

  // Store the hash
  await redis.setex(key, env.OTP_TTL_SECONDS, otpHash);
  // Reset attempts counter
  await redis.setex(attemptsKey, env.OTP_TTL_SECONDS, '0');
}

/**
 * Retrieve OTP hash from Redis
 */
export async function getStoredOTP(phone: string): Promise<string | null> {
  return redis.get(`otp:phone:${phone}`);
}

/**
 * Increment and check OTP attempt counter.
 * Returns the current attempt count after incrementing.
 * Locks on max attempts.
 */
export async function incrementOTPAttempts(phone: string): Promise<number> {
  const attemptsKey = `otp:attempts:${phone}`;
  const attempts = await redis.incr(attemptsKey);

  if (attempts >= env.OTP_MAX_ATTEMPTS) {
    // Lock: delete the OTP so it can't be used
    await redis.del(`otp:phone:${phone}`);
  }

  return attempts;
}

/**
 * Delete OTP data from Redis
 */
export async function deleteOTP(phone: string): Promise<void> {
  await redis.del(`otp:phone:${phone}`, `otp:attempts:${phone}`);
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
