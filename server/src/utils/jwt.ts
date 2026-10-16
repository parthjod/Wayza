import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { redis } from '../config/redis';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  role: string;
}

/**
 * Generate a short-lived access token (15 min)
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

/**
 * Generate a long-lived refresh token (7 days)
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload & TokenPayload;
    return { userId: decoded.userId, role: decoded.role };
  } catch {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload & TokenPayload;
    return { userId: decoded.userId, role: decoded.role };
  } catch {
    return null;
  }
}

/**
 * Hash a token for storage (used for refresh token revocation)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Store refresh token hash in Redis (for rotation tracking)
 */
export async function storeRefreshToken(
  userId: string,
  tokenHash: string,
  ttlSeconds: number = 7 * 24 * 3600
): Promise<void> {
  await redis.setex(`rt:${userId}:${tokenHash}`, ttlSeconds, '1');
}

/**
 * Check if a refresh token has been revoked
 */
export async function isRefreshTokenRevoked(tokenHash: string): Promise<boolean> {
  const result = await redis.get(`rt:revoked:${tokenHash}`);
  return result !== null;
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(
  tokenHash: string,
  ttlSeconds: number = 7 * 24 * 3600
): Promise<void> {
  await redis.setex(`rt:revoked:${tokenHash}`, ttlSeconds, '1');
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  const keys: string[] = [];
  try {
    let cursor = '0';
    do {
      const [nextCursor, matchedKeys] = await redis.scan(cursor, 'MATCH', `rt:${userId}:*`, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== '0');
  } catch (err) {
    console.warn('Failed to scan refresh token keys for user:', userId, err);
  }

  if (keys.length > 0) {
    // Mark each as revoked
    const pipeline = redis.pipeline();
    for (const key of keys) {
      const tokenHash = key.split(':').pop()!;
      pipeline.setex(`rt:revoked:${tokenHash}`, 7 * 24 * 3600, '1');
      pipeline.del(key);
    }
    await pipeline.exec();
  }
}

/**
 * Set auth cookies on response
 */
export function setAuthCookies(
  res: any,
  accessToken: string,
  refreshToken: string
): void {
  const isProduction = env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 min
    path: '/',
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Clear auth cookies
 */
export function clearAuthCookies(res: any): void {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
}
