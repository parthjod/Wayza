import { z } from 'zod';

export const checkPhoneSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number in E.164 format'),
});

export const signupInitiateSchema = z.object({
  phone: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number in E.164 format'),
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .regex(/^[a-zA-Z\s\-']+$/, 'Name may only contain letters, spaces, hyphens, and apostrophes'),
  collegeEmail: z
    .string()
    .email('Invalid email address')
    .max(254, 'Email must be at most 254 characters'),
});

export const verifyOTPSchema = z.object({
  phone: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number in E.164 format'),
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must be numeric'),
  flow: z.enum(['login', 'signup']),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type CheckPhoneInput = z.infer<typeof checkPhoneSchema>;
export type SignupInitiateInput = z.infer<typeof signupInitiateSchema>;
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
