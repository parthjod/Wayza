import prisma from '../../config/db';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { sendOTPByEmail, sendWelcomeEmail } from '../../config/ses';
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
  generateSignupVerificationToken,
  verifySignupVerificationToken,
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
// In-memory fallback map for verified emails pending profile completion
const memoryVerifiedSignup = new Map<string, number>();

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

    // Check rate limit for this email
    const rateCheck = await checkOTPRateLimit(cleanEmail);
    if (!rateCheck.allowed) {
      throw createError(
        'Too many OTP requests. Please try again later.',
        429,
        'otp_rate_limited'
      );
    }

    // Generate & store OTP immediately for both existing and new users
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    await storeOTP(cleanEmail, otpHash);

    if (user) {
      // Send login OTP to student email via Resend / SES
      console.log(`[AUTH] Dispatching login OTP to ${cleanEmail}...`);
      sendOTPByEmail(cleanEmail, otp, { userName: user.fullName, isNewUser: false }).catch((err) => {
        console.error('[AUTH] Background sendOTPByEmail error:', err);
      });

      return { registered: true, userName: user.fullName };
    }

    // New user — send OTP immediately to verify their college email FIRST!
    console.log(`[AUTH] Dispatching new user verification OTP to ${cleanEmail}...`);
    sendOTPByEmail(cleanEmail, otp, { isNewUser: true }).catch((err) => {
      console.error('[AUTH] Background signup sendOTPByEmail error:', err);
    });

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
      // Phone number must be unique per user
      const existingPhoneUser = await prisma.user.findUnique({
        where: { phone: cleanPhone },
      });
      if (existingPhoneUser) {
        throw createError(
          'This phone number is already registered to another account.',
          409,
          'phone_exists'
        );
      }
    } else if (data.phone && data.phone.trim().length > 0) {
      throw createError(
        'Please enter a valid 10-digit mobile number.',
        400,
        'invalid_phone'
      );
    } else {
      // Unique fallback phone if omitted
      cleanPhone = `+91${Math.floor(6000000000 + Math.random() * 3999999999)}`;
      while (await prisma.user.findUnique({ where: { phone: cleanPhone } })) {
        cleanPhone = `+91${Math.floor(6000000000 + Math.random() * 3999999999)}`;
      }
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
    sendOTPByEmail(cleanEmail, otp, { isNewUser: true }).catch((err) => {
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
    const isExistingUser = !!user;
    sendOTPByEmail(cleanEmail, otp, {
      userName: isExistingUser ? user.fullName : undefined,
      isNewUser: !isExistingUser,
    }).catch((err) => {
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
      // Check if user already exists in DB
      const existing = await prisma.user.findFirst({
        where: { OR: [{ collegeEmail: cleanId }, { phone: cleanId }] },
      });

      if (existing) {
        user = existing;
      } else {
        // Check if there was pending data from legacy signupInitiate flow
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

        if (pendingData) {
          // Legacy flow: create user with pre-collected pending data
          let candidatePhone = pendingData.phone;
          const phoneOccupied = await prisma.user.findUnique({ where: { phone: candidatePhone } });
          if (phoneOccupied) {
            throw createError(
              'This phone number is already registered to another account.',
              409,
              'phone_exists'
            );
          }

          user = await prisma.user.create({
            data: {
              fullName: pendingData.fullName,
              collegeEmail: pendingData.collegeEmail,
              phone: candidatePhone,
              emailVerified: true,
            },
          });
        } else {
          // New primary flow: Email OTP is verified!
          // Issue signed signup token & store verification state for 15 minutes
          const signupToken = generateSignupVerificationToken(cleanId);
          memoryVerifiedSignup.set(cleanId, Date.now() + 900 * 1000);
          try {
            await redis.setex(`signup:verified:${cleanId}`, 900, '1');
          } catch (err: any) {
            console.warn('[Redis] signup:verified fallback to memory:', err.message);
          }

          return {
            registered: false,
            emailVerified: true,
            signupToken,
          };
        }
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

  /**
   * Complete signup after email has been verified via OTP
   */
  async signupComplete(data: {
    collegeEmail: string;
    fullName: string;
    phone?: string;
    signupToken?: string;
  }) {
    const cleanEmail = data.collegeEmail.toLowerCase().trim();
    const fullName = data.fullName.trim();

    // 1. Validate domain
    const emailDomain = cleanEmail.split('@')[1];
    if (!emailDomain || !env.ALLOWED_EMAIL_DOMAINS.includes(emailDomain)) {
      throw createError(
        'Email domain not allowed. Use your @mitwpu.edu.in email address.',
        400,
        'invalid_email_domain'
      );
    }

    // 2. Check if already registered
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

    // 3. Verify that email OTP was confirmed
    let isVerified = false;
    if (data.signupToken && verifySignupVerificationToken(data.signupToken, cleanEmail)) {
      isVerified = true;
    }
    if (!isVerified) {
      try {
        const redisVal = await redis.get(`signup:verified:${cleanEmail}`);
        if (redisVal) isVerified = true;
      } catch (err: any) {
        console.warn('[Redis] signup:verified check fallback:', err.message);
      }
    }
    if (!isVerified) {
      const exp = memoryVerifiedSignup.get(cleanEmail);
      if (exp && exp > Date.now()) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      throw createError(
        'Email verification expired or not found. Please verify your email first.',
        400,
        'email_not_verified'
      );
    }

    // Clean up verification state
    memoryVerifiedSignup.delete(cleanEmail);
    redis.del(`signup:verified:${cleanEmail}`).catch(() => {});

    // 4. Format or generate phone number
    let cleanPhone = data.phone?.replace(/\D/g, '') || '';
    if (cleanPhone.length > 10 && cleanPhone.startsWith('91')) cleanPhone = cleanPhone.slice(2);
    if (cleanPhone.length === 10) {
      cleanPhone = `+91${cleanPhone}`;
      // Phone number must be unique per user
      const phoneOccupied = await prisma.user.findUnique({ where: { phone: cleanPhone } });
      if (phoneOccupied) {
        throw createError(
          'This phone number is already registered to another account.',
          409,
          'phone_exists'
        );
      }
    } else if (data.phone && data.phone.trim().length > 0) {
      throw createError(
        'Please enter a valid 10-digit mobile number.',
        400,
        'invalid_phone'
      );
    } else {
      cleanPhone = `+91${Math.floor(6000000000 + Math.random() * 3999999999)}`;
      while (await prisma.user.findUnique({ where: { phone: cleanPhone } })) {
        cleanPhone = `+91${Math.floor(6000000000 + Math.random() * 3999999999)}`;
      }
    }

    // 5. Create user in database with emailVerified = true
    const user = await prisma.user.create({
      data: {
        fullName,
        collegeEmail: cleanEmail,
        phone: cleanPhone,
        emailVerified: true,
      },
    });

    // Send curated Welcome Onboard Email to the new registered student
    console.log(`[AUTH] Dispatching Welcome Onboard email to ${cleanEmail}...`);
    sendWelcomeEmail(cleanEmail, fullName).catch((err) => {
      console.error('[AUTH] Background sendWelcomeEmail error:', err);
    });

    // 6. Generate tokens
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
}

export const authService = new AuthService();

