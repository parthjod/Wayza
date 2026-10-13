import prisma from '../../config/db';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { sendOTPByEmail, sendVerificationEmail } from '../../config/ses';
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

// In-memory fallback map for pending signups
const memoryPendingSignup = new Map<string, { data: any; expiresAt: number }>();

export class AuthService {
  /**
   * Check if email is registered, send OTP to student inbox if so
   */
  async checkEmail(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    console.log(`[AUTH] checkEmail start for: ${cleanEmail}`);

    const emailDomain = cleanEmail.split('@')[1];
    if (!emailDomain || !env.ALLOWED_EMAIL_DOMAINS.includes(emailDomain)) {
      throw createError(
        'Email domain not allowed. Use your @mitwpu.edu.in email address.',
        400,
        'invalid_email_domain'
      );
    }

    const user = await prisma.user.findUnique({
      where: { collegeEmail: cleanEmail },
      select: { fullName: true, blacklisted: true, collegeEmail: true },
    });

    if (user?.blacklisted) {
      throw createError('Account suspended', 403, 'account_suspended');
    }

    if (user) {
      // Check rate limit for this email
      const rateCheck = await checkOTPRateLimit(cleanEmail);
      if (!rateCheck.allowed) {
        throw createError(
          'Too many OTP requests. Please try again later.',
          429,
          'otp_rate_limited'
        );
      }

      // Generate & store OTP
      const otp = generateOTP();
      const otpHash = await hashOTP(otp);
      await storeOTP(cleanEmail, otpHash);

      // Send OTP to student email via Resend / SES
      console.log(`[AUTH] Dispatching login OTP to ${cleanEmail}...`);
      sendOTPByEmail(cleanEmail, otp, user.fullName).catch((err) => {
        console.error('[AUTH] Background sendOTPByEmail error:', err);
      });

      return { registered: true, userName: user.fullName };
    }

    // New user — let client know to show name & contact info modal
    return { registered: false };
  }

  /**
   * Legacy phone check compatibility
   */
  async checkPhone(phone: string) {
    console.log(`[AUTH] checkPhone start for: ${phone}`);
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { fullName: true, blacklisted: true, collegeEmail: true },
    });

    if (user?.blacklisted) {
      throw createError('Account suspended', 403, 'account_suspended');
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    await storeOTP(phone, otpHash);

    if (user?.collegeEmail) {
      await storeOTP(user.collegeEmail, otpHash);
      sendOTPByEmail(user.collegeEmail, otp, user.fullName).catch(() => {});
    }

    if (user) {
      return { registered: true, userName: user.fullName };
    }
    return { registered: false };
  }

  /**
   * Initiate signup flow — store pending signup and send OTP to student email
   */
  async signupInitiate(data: {
    collegeEmail: string;
    fullName: string;
    phone?: string;
  }) {
    const cleanEmail = data.collegeEmail.toLowerCase().trim();
    const fullName = data.fullName.trim();

    // Validate email domain
    const emailDomain = cleanEmail.split('@')[1];
    if (!emailDomain || !env.ALLOWED_EMAIL_DOMAINS.includes(emailDomain)) {
      throw createError(
        'Email domain not allowed. Use your @mitwpu.edu.in email address.',
        400,
        'invalid_email_domain'
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { collegeEmail: cleanEmail },
    });
    if (existingUser) {
      throw createError(
        'An account with this email already exists. Please sign in.',
        409,
        'account_exists'
      );
    }

    // Rate limit OTP requests
    const rateCheck = await checkOTPRateLimit(cleanEmail);
    if (!rateCheck.allowed) {
      throw createError(
        'Too many OTP requests. Please try again later.',
        429,
        'otp_rate_limited'
      );
    }

    // Format phone or generate fallback
    let cleanPhone = data.phone?.replace(/\D/g, '') || '';
    if (cleanPhone.length > 10 && cleanPhone.startsWith('91')) cleanPhone = cleanPhone.slice(2);
    if (cleanPhone.length === 10) {
      cleanPhone = `+91${cleanPhone}`;
    } else {
      // Unique fallback phone if omitted
      cleanPhone = `+91${Math.floor(6000000000 + Math.random() * 3999999999)}`;
    }

    // Store pending signup in memory + Redis (15 min TTL)
    const pendingObj = {
      phone: cleanPhone,
      fullName,
      collegeEmail: cleanEmail,
    };
    memoryPendingSignup.set(cleanEmail, {
      data: pendingObj,
      expiresAt: Date.now() + 900 * 1000,
    });
    try {
      await redis.setex(`signup:pending:${cleanEmail}`, 900, JSON.stringify(pendingObj));
    } catch (err: any) {
      console.warn('[Redis] signup pending store fallback to memory:', err.message);
    }

    // Generate and store OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    await storeOTP(cleanEmail, otpHash);

    // Send OTP via Email directly to their college email!
    console.log(`[AUTH] Dispatching Signup OTP Email to ${cleanEmail}...`);
    sendOTPByEmail(cleanEmail, otp, fullName).catch((err) => {
      console.error('[AUTH] Background signup sendOTPByEmail error:', err);
    });

    return { message: 'OTP sent' };
  }

  /**
   * Resend OTP directly to student college email
   */
  async resendOTP(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    const rateCheck = await checkOTPRateLimit(cleanEmail);
    if (!rateCheck.allowed) {
      throw createError(
        'Too many OTP requests. Please wait a few moments before trying again.',
        429,
        'otp_rate_limited'
      );
    }

    const user = await prisma.user.findUnique({
      where: { collegeEmail: cleanEmail },
      select: { fullName: true },
    });

    const pending = memoryPendingSignup.get(cleanEmail);
    const userName = user?.fullName || pending?.data?.fullName || undefined;

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    await storeOTP(cleanEmail, otpHash);

    console.log(`[AUTH] Resending OTP Email to ${cleanEmail}...`);
    sendOTPByEmail(cleanEmail, otp, userName).catch((err) => {
      console.error('[AUTH] Background resendOTP error:', err);
    });

    return { message: 'OTP resent successfully' };
  }

  /**
   * Verify OTP for email login or signup
   */
  async verifyOTP(
    identifier: { email?: string; phone?: string } | string,
    otp: string,
    flow: 'login' | 'signup'
  ) {
    let cleanId = '';
    if (typeof identifier === 'string') {
      cleanId = identifier.toLowerCase().trim();
    } else {
      cleanId = (identifier.email?.toLowerCase().trim() || identifier.phone?.trim()) ?? '';
    }

    if (!cleanId) {
      throw createError('Email or phone identifier required', 400, 'missing_identifier');
    }

    // Get stored OTP hash
    const storedHash = await getStoredOTP(cleanId);
    if (!storedHash) {
      throw createError('OTP expired or not found. Please request a new code.', 400, 'otp_expired');
    }

    // Verify OTP
    const isValid = await verifyOTPHash(otp, storedHash);
    if (!isValid) {
      const attempts = await incrementOTPAttempts(cleanId);
      if (attempts >= env.OTP_MAX_ATTEMPTS) {
        throw createError('Too many failed attempts. Please request a new OTP.', 429, 'otp_locked');
      }
      throw createError(`Invalid OTP. ${env.OTP_MAX_ATTEMPTS - attempts} attempts remaining.`, 400, 'invalid_otp');
    }

    // OTP valid — delete it
    await deleteOTP(cleanId);

    let user;

    if (flow === 'signup') {
      let pendingData: any = null;
      try {
        const pendingRaw = await redis.get(`signup:pending:${cleanId}`);
        if (pendingRaw) {
          pendingData = JSON.parse(pendingRaw);
          redis.del(`signup:pending:${cleanId}`).catch(() => {});
        }
      } catch (err: any) {
        console.warn('[Redis] get pending signup fallback:', err.message);
      }

      if (!pendingData) {
        const mem = memoryPendingSignup.get(cleanId);
        if (mem && mem.expiresAt > Date.now()) {
          pendingData = mem.data;
          memoryPendingSignup.delete(cleanId);
        }
      }

      if (!pendingData) {
        // Fallback: check if user already exists
        const existing = await prisma.user.findFirst({
          where: { OR: [{ collegeEmail: cleanId }, { phone: cleanId }] },
        });
        if (existing) {
          user = existing;
        } else {
          throw createError('Signup session expired. Please start over.', 400, 'signup_expired');
        }
      } else {
        // Ensure phone is unique in database
        let candidatePhone = pendingData.phone;
        const phoneOccupied = await prisma.user.findUnique({ where: { phone: candidatePhone } });
        if (phoneOccupied) {
          candidatePhone = `+91${Math.floor(6000000000 + Math.random() * 3999999999)}`;
        }

        // Create user with emailVerified = true (since they entered the email OTP!)
        user = await prisma.user.create({
          data: {
            fullName: pendingData.fullName,
            collegeEmail: pendingData.collegeEmail,
            phone: candidatePhone,
            emailVerified: true,
          },
        });
      }
    } else {
      // Login flow
      user = await prisma.user.findFirst({
        where: {
          OR: [{ collegeEmail: cleanId }, { phone: cleanId }],
        },
      });

      if (!user) {
        throw createError('User not found. Please sign up.', 404, 'user_not_found');
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
        collegeEmail: user.collegeEmail,
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

    if (await isRefreshTokenRevoked(currentHash)) {
      await revokeAllUserTokens(payload.userId);
      throw createError('Token reuse detected. All sessions revoked.', 401, 'token_reuse');
    }

    await revokeRefreshToken(currentHash);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, blacklisted: true },
    });

    if (!user || user.blacklisted) {
      throw createError('Account not found or suspended', 401, 'account_invalid');
    }

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
