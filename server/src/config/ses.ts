import axios from 'axios';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from './env';

const sesClient = new SESClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  // 1. Resend Integration (Zero-wait instant delivery)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && resendKey !== 'your-resend-api-key') {
    try {
      console.log(`[Resend] Sending email to ${to}...`);
      const fromEmail = process.env.RESEND_FROM_EMAIL || (
        env.AWS_SES_FROM_EMAIL && !env.AWS_SES_FROM_EMAIL.includes('yourdomain.com')
          ? `Wayza <${env.AWS_SES_FROM_EMAIL}>`
          : 'Wayza <onboarding@resend.dev>'
      );

      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from: fromEmail,
          to: [to],
          subject,
          html: htmlBody,
        },
        {
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 7000,
        }
      );
      if (response.data?.id) {
        console.log(`[Resend] Email sent successfully (id: ${response.data.id}) to ${to}`);
        return;
      }
      console.warn(`[Resend] Response warning:`, response.data);
    } catch (err: any) {
      console.error(`[Resend] Failed to send email to ${to}:`, err.response?.data || err.message);
    }
  }

  // 2. AWS SES Fallback
  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: env.AWS_SES_FROM_EMAIL,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: { Html: { Data: htmlBody } },
        },
      })
    );
    console.log(`[AWS SES] Email sent successfully to ${to}`);
  } catch (err: any) {
    console.error(`[AWS SES] Failed to send email to ${to}:`, err.message);
  }
}

export async function sendVerificationEmail(
  to: string,
  token: string
): Promise<void> {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
  if (env.AWS_ACCESS_KEY_ID === 'your-access-key' || env.NODE_ENV === 'development') {
    console.log(`\n========================================\n📧 [DEV EMAIL] Verification link for ${to}:\n${verifyUrl}\n========================================\n`);
    return;
  }
  const html = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="font-size: 28px; color: #111;">Welcome to Wayza 🚗</h1>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Thanks for signing up! Please verify your college email to start using Wayza.
      </p>
      <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background: #111; color: #fff; text-decoration: none; border-radius: 8px; font-size: 16px; margin: 20px 0;">
        Verify Email
      </a>
      <p style="font-size: 13px; color: #999;">
        This link expires in 24 hours. If you didn't sign up for Wayza, please ignore this email.
      </p>
    </div>
  `;
  await sendEmail(to, 'Verify your Wayza email', html);
}

export async function sendOTPByEmail(
  to: string,
  otp: string,
  userName?: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0c10; margin: 0; padding: 20px; }
        .card { max-width: 500px; margin: 30px auto; background: #181920; border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 40px 32px; text-align: center; color: #ffffff; }
        .logo { font-size: 32px; font-weight: 700; letter-spacing: 0.15em; font-style: italic; color: #ffffff; margin-bottom: 4px; }
        .sub { font-size: 13px; color: #5bbef7; margin-bottom: 28px; }
        .title { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
        .desc { font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.5; margin-bottom: 24px; }
        .otp-box { display: inline-block; font-size: 38px; font-weight: 700; letter-spacing: 8px; color: #5bbef7; background: rgba(91,190,247,0.08); border: 1px solid rgba(91,190,247,0.3); padding: 14px 28px; border-radius: 12px; margin: 10px 0 24px; }
        .footer { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">WAYZA</div>
        <div class="sub">MIT-WPU Campus Rides</div>
        <div class="title">${userName ? `Welcome back, ${userName}!` : 'Verify your email'}</div>
        <div class="desc">Here is your 6-digit Wayza verification code. Enter it in the app to continue:</div>
        <div class="otp-box">${otp}</div>
        <div class="desc">This code will expire in 5 minutes.</div>
        <div class="footer">If you didn't request this code, you can safely ignore this email.</div>
      </div>
    </body>
    </html>
  `;

  console.log(`\n========================================\n📧 [EMAIL OTP] Sending to ${to}: ${otp}\n========================================\n`);

  try {
    await sendEmail(to, `${otp} is your Wayza verification code`, html);
    console.log(`[AWS SES] Verification email delivered to ${to}`);
  } catch (err: any) {
    console.error(`[AWS SES] Failed to send email to ${to}:`, err.message);
  }
}

