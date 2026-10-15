import { z } from 'zod';

export const checkEmailSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(254, 'Email must be at most 254 characters'),
});

export const checkPhoneSchema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required'),
});

export const signupInitiateSchema = z.object({
  collegeEmail: z
    .string()
    .email('Invalid email address')
    .max(254, 'Email must be at most 254 characters'),
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  phone: z
    .string()
    .optional(),
});

export const verifyOTPSchema = z
  .object({
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().optional(),
    otp: z
      .string()
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d{6}$/, 'OTP must be numeric'),
    flow: z.enum(['login', 'signup']),
  })
  .refine((data) => !!(data.email || data.phone), {
    message: 'Either email or phone is required',
  });

export const resendOTPSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(254, 'Email must be at most 254 characters'),
  flow: z.enum(['login', 'signup']).optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const signupCompleteSchema = z.object({
  collegeEmail: z
    .string()
    .email('Invalid email address')
    .max(254, 'Email must be at most 254 characters'),
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  phone: z
    .string()
    .optional(),
  signupToken: z
    .string()
    .optional(),
});

export type CheckEmailInput = z.infer<typeof checkEmailSchema>;
export type CheckPhoneInput = z.infer<typeof checkPhoneSchema>;
export type SignupInitiateInput = z.infer<typeof signupInitiateSchema>;
export type SignupCompleteInput = z.infer<typeof signupCompleteSchema>;
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;
export type ResendOTPInput = z.infer<typeof resendOTPSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

