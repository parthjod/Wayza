import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'OTP_HMAC_SECRET',
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET',
  'AWS_CLOUDFRONT_DOMAIN',
  'AWS_SES_FROM_EMAIL',
  'AWS_SNS_SENDER_ID',
  'ALLOWED_EMAIL_DOMAINS',
  'FRONTEND_URL',
] as const;

// Validate all required env vars are present at startup
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),

  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL!,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  OTP_HMAC_SECRET: process.env.OTP_HMAC_SECRET!,

  AWS_REGION: process.env.AWS_REGION!,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET!,
  AWS_CLOUDFRONT_DOMAIN: process.env.AWS_CLOUDFRONT_DOMAIN!,
  AWS_SES_FROM_EMAIL: process.env.AWS_SES_FROM_EMAIL!,
  AWS_SNS_SENDER_ID: process.env.AWS_SNS_SENDER_ID!,

  ALLOWED_EMAIL_DOMAINS: (process.env.ALLOWED_EMAIL_DOMAINS || '').split(',').map((d) => d.trim().toLowerCase()),
  FRONTEND_URL: process.env.FRONTEND_URL!,

  MAX_GROUP_SIZE: parseInt(process.env.MAX_GROUP_SIZE || '4', 10),
  OTP_TTL_SECONDS: parseInt(process.env.OTP_TTL_SECONDS || '300', 10),
  OTP_MAX_ATTEMPTS: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
  OTP_MAX_REQUESTS: parseInt(process.env.OTP_MAX_REQUESTS || '20', 10),
  LOCATION_TTL_SECONDS: parseInt(process.env.LOCATION_TTL_SECONDS || '1800', 10),
  DATA_RETENTION_DAYS: parseInt(process.env.DATA_RETENTION_DAYS || '90', 10),
} as const;
