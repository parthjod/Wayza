import prisma from '../../config/db';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { sendOTPSMS } from '../../config/sns';
import { sendVerificationEmail } from '../../config/ses';
import {
  generateOTP,
  hashOTP,
  storeOTP,
  getStoredOTP,
  verifyOTP as verifyOTPHash,
  incrementOTPAttempts,
  deleteOTP,
  checkOTPRateLimit,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
} from '../../utils/otp';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  storeRefreshToken,
  isRefreshTokenRevoked,
  revokeRefreshToken,
  revokeAllUserTokens,
} from '../../utils/jwt';
import { createError } from '../../middleware/errorHandler';

export class AuthService {
  /**
   * Check if phone is registered, send OTP if so
   */
  async checkPhone(phone: string) {
    // Rate limit OTP sends
    const rateCheck = await checkOTPRateLimit(phone);
    if (!rateCheck.allowed) {
      throw createError(
        'Too many OTP requests. Please try again later.',
        429,
        'otp_rate_limited'
      );
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { fullName: true, blacklisted: true },
    });

    if (user?.blacklisted) {
      throw createError('Account suspended', 403, 'account_suspended');
    }

    // Generate and send OTP regardless (to not reveal existence to attackers)
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    await storeOTP(phone, otpHash);

    // Send OTP via SMS (in dev mode, log to console)
    if (env.NODE_ENV === 'development') {
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
    } else {
      await sendOTPSMS(phone, otp);
    }

    if (user) {
      return { registered: true, userName: user.fullName };
    }
    return { registered: false };
  }

  /**
   * Initiate signup flow — store pending signup in Redis, send OTP + email verification
   */
  async signupInitiate(phone: string, fullName: string, collegeEmail: string) {
    // Validate email domain
    const emailDomain = collegeEmail.split('@')[1]?.toLowerCase();
    if (!env.ALLOWED_EMAIL_DOMAINS.includes(emailDomain)) {
      throw createError('Email domain not allowed. Use your college email.', 400, 'invalid_email_domain');
    }

    // Check if phone or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ phone }, { collegeEmail: collegeEmail.toLowerCase() }],
      },
    });

    if (existingUser) {
      throw createError('An account with this phone or email already exists', 409, 'account_exists');
    }

    // Rate limit OTP sends
    const rateCheck = await checkOTPRateLimit(phone);
    if (!rateCheck.allowed) {
      throw createError(
        'Too many OTP requests. Please try again later.',
        429,
        'otp_rate_limited'
      );
    }

    // Store pending signup in Redis (15 min TTL)
    const pendingData = JSON.stringify({
      phone,
      fullName: fullName.trim(),
      collegeEmail: collegeEmail.toLowerCase().trim(),
    });
    await redis.setex(`signup:pending:${phone}`, 900, pendingData);

    // Generate and send OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    await storeOTP(phone, otpHash);

    if (env.NODE_ENV === 'development') {
      console.log(`[DEV] Signup OTP for ${phone}: ${otp}`);
    } else {
      await sendOTPSMS(phone, otp);
    }

    return { message: 'OTP sent' };
  }

  /**
   * Verify OTP for login or signup flow
   */
  async verifyOTP(phone: string, otp: string, flow: 'login' | 'signup') {
    // Get stored OTP hash
    const storedHash = await getStoredOTP(phone);
    if (!storedHash) {
      throw createError('OTP expired or not found. Please request a new one.', 400, 'otp_expired');
    }

    // Verify OTP
    const isValid = await verifyOTPHash(otp, storedHash);
    if (!isValid) {
      const attempts = await incrementOTPAttempts(phone);
      if (attempts >= env.OTP_MAX_ATTEMPTS) {
        throw createError('Too many failed attempts. Please request a new OTP.', 429, 'otp_locked');
      }
      throw createError(`Invalid OTP. ${env.OTP_MAX_ATTEMPTS - attempts} attempts remaining.`, 400, 'invalid_otp');
    }

    // OTP valid — delete it
    await deleteOTP(phone);

    let user;

    if (flow === 'signup') {
      // Read pending signup from Redis
      const pendingRaw = await redis.get(`signup:pending:${phone}`);
      if (!pendingRaw) {
        throw createError('Signup session expired. Please start over.', 400, 'signup_expired');
      }

      const pendingData = JSON.parse(pendingRaw);
      await redis.del(`signup:pending:${phone}`);

      // Create user
      user = await prisma.user.create({
        data: {
          phone: pendingData.phone,
          fullName: pendingData.fullName,
          collegeEmail: pendingData.collegeEmail,
          emailVerified: false,
        },
      });

      // Send email verification link
      const emailToken = generateEmailVerificationToken(user.id, user.collegeEmail);
      if (env.NODE_ENV === 'development') {
        console.log(`[DEV] Email verification link: ${env.FRONTEND_URL}/verify-email?token=${emailToken}`);
      } else {
        await sendVerificationEmail(user.collegeEmail, emailToken);
      }
    } else {
      // Login flow
      user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        throw createError('User not found', 404, 'user_not_found');
      }
      if (user.blacklisted) {
        throw createError('Account suspended', 403, 'account_suspended');
      }
    }

    // Generate tokens
    const tokenPayload = { userId: user.id, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token hash
    const rtHash = hashToken(refreshToken);
    await storeRefreshToken(user.id, rtHash);

    const profilePicUrl = user.profilePicKey
      ? `https://${env.AWS_CLOUDFRONT_DOMAIN}/${user.profilePicKey}`
      : null;

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        profilePicUrl,
      },
    };
  }

  /**
   * Refresh tokens — rotate refresh token
   */
  async refresh(currentRefreshToken: string) {
    const payload = verifyRefreshToken(currentRefreshToken);
    if (!payload) {
      throw createError('Invalid refresh token', 401, 'invalid_refresh');
    }

    const currentHash = hashToken(currentRefreshToken);

    // Check if revoked
    if (await isRefreshTokenRevoked(currentHash)) {
      // Token reuse detected — revoke all tokens for this user (security measure)
      await revokeAllUserTokens(payload.userId);
      throw createError('Token reuse detected. All sessions revoked.', 401, 'token_reuse');
    }

    // Revoke the current refresh token
    await revokeRefreshToken(currentHash);

    // Check user still exists and isn't blacklisted
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, blacklisted: true },
    });

    if (!user || user.blacklisted) {
      throw createError('Account not found or suspended', 401, 'account_invalid');
    }

    // Issue new token pair
    const newPayload = { userId: user.id, role: user.role };
    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    const newRtHash = hashToken(newRefreshToken);
    await storeRefreshToken(user.id, newRtHash);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout — revoke refresh token
   */
  async logout(refreshToken: string) {
    if (refreshToken) {
      const rtHash = hashToken(refreshToken);
      await revokeRefreshToken(rtHash);
    }
  }

  /**
   * Verify email from signed token
   */
  async verifyEmail(token: string) {
    const data = verifyEmailVerificationToken(token);
    if (!data) {
      throw createError('Invalid or expired verification link', 400, 'invalid_token');
    }

    await prisma.user.update({
      where: { id: data.userId },
      data: { emailVerified: true },
    });

    return { message: 'Email verified successfully' };
  }
}

export const authService = new AuthService();
