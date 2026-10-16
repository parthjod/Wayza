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

export async function sendOTPByEmail(
  to: string,
  otp: string,
  options?: { userName?: string; isNewUser?: boolean } | string
): Promise<void> {
  const isNewUser = typeof options === 'object' ? !!options.isNewUser : false;
  const userName = typeof options === 'string' ? options : options?.userName;

  const title = isNewUser
    ? 'Verify your college email'
    : (userName ? `Welcome back, ${userName}!` : 'Welcome back!');

  const introText = isNewUser
    ? 'Welcome to Wayza! Here is your 6-digit verification code to create your account and get started:'
    : 'Here is your 6-digit Wayza verification code to sign in:';

  const subject = isNewUser
    ? `${otp} is your Wayza verification code`
    : `${otp} is your Wayza sign-in code`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0c10; margin: 0; padding: 24px 12px; }
        .card { max-width: 480px; margin: 20px auto; background: #15161e; border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 38px 28px; text-align: center; color: #ffffff; }
        .logo { font-size: 30px; font-weight: 800; letter-spacing: 0.16em; font-style: italic; color: #ffffff; margin-bottom: 4px; }
        .sub { font-size: 13px; color: #5bbef7; margin-bottom: 26px; font-weight: 500; }
        .title { font-size: 21px; font-weight: 700; margin-bottom: 10px; color: #ffffff; }
        .desc { font-size: 14px; color: rgba(255,255,255,0.72); line-height: 1.55; margin-bottom: 22px; }
        .otp-box { display: inline-block; font-size: 38px; font-weight: 700; letter-spacing: 10px; color: #5bbef7; background: rgba(91,190,247,0.08); border: 1px solid rgba(91,190,247,0.32); padding: 14px 28px; border-radius: 14px; margin: 8px 0 22px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .expiry { font-size: 13px; color: rgba(255,255,255,0.55); margin-bottom: 8px; }
        .footer { font-size: 12px; color: rgba(255,255,255,0.38); margin-top: 24px; line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 18px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">WAYZA</div>
        <div class="sub">MIT-WPU Campus Rides</div>
        <div class="title">${title}</div>
        <div class="desc">${introText}</div>
        <div class="otp-box">${otp}</div>
        <div class="expiry">This code will expire in <strong>5 minutes</strong>.</div>
        <div class="footer">If you didn't request this code, you can safely ignore this email.</div>
      </div>
    </body>
    </html>
  `;

  console.log(`\n========================================\n📧 [EMAIL OTP] Sending to ${to}: ${otp} (isNewUser: ${isNewUser})\n========================================\n`);

  try {
    await sendEmail(to, subject, html);
    console.log(`[AUTH] Verification email delivered to ${to}`);
  } catch (err: any) {
    console.error(`[AUTH] Failed to send email to ${to}:`, err.message);
  }
}

/**
 * Curated Welcome Onboard Email sent after email is verified and profile is registered
 */
export async function sendWelcomeEmail(
  to: string,
  fullName: string
): Promise<void> {
  const firstName = fullName.split(' ')[0] || fullName;
  const appUrl = env.FRONTEND_URL || 'https://wayza.co.in';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0c10; margin: 0; padding: 24px 12px; }
        .card { max-width: 520px; margin: 20px auto; background: #15161e; border: 1px solid rgba(255,255,255,0.12); border-radius: 22px; padding: 40px 32px; color: #ffffff; text-align: left; }
        .header { text-align: center; margin-bottom: 28px; }
        .logo { font-size: 32px; font-weight: 800; letter-spacing: 0.16em; font-style: italic; color: #ffffff; margin-bottom: 4px; }
        .sub { font-size: 13px; color: #5bbef7; font-weight: 500; }
        .greeting { font-size: 23px; font-weight: 700; margin-bottom: 12px; color: #ffffff; line-height: 1.3; }
        .lead { font-size: 15px; color: rgba(255,255,255,0.78); line-height: 1.6; margin-bottom: 24px; }
        .features { margin: 20px 0; }
        .feature-item { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
        .feature-title { font-size: 14px; font-weight: 600; color: #5bbef7; margin-bottom: 3px; }
        .feature-desc { font-size: 13px; color: rgba(255,255,255,0.68); line-height: 1.45; margin: 0; }
        .cta-wrap { text-align: center; margin: 30px 0 16px; }
        .cta-btn { display: inline-block; background: linear-gradient(90deg, #31A8FF, #1555FF); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 9999px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 18px rgba(21, 85, 255, 0.4); }
        .footer { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 28px; line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 18px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">WAYZA</div>
          <div class="sub">MIT-WPU Campus Rides</div>
        </div>

        <div class="greeting">Welcome onboard, ${firstName}! 🚗</div>
        <div class="lead">
          Your college email has been verified and your profile is all set. You are now part of the exclusive MIT-WPU ride-sharing community!
        </div>

        <div class="features">
          <div class="feature-item">
            <div class="feature-title">📍 Discover Nearby Campus Peers</div>
            <p class="feature-desc">Check in with your destination (Baner, Wakad, Viman Nagar, Hinjewadi, and more) to match with fellow students heading your way.</p>
          </div>

          <div class="feature-item">
            <div class="feature-title">💬 Real-Time Group Chat</div>
            <p class="feature-desc">Coordinate meet-up points, ride timings, and cab bookings instantly with low-latency messaging.</p>
          </div>

          <div class="feature-item">
            <div class="feature-title">⚡ Instant Fare Splitting</div>
            <p class="feature-desc">Slash commute expenses by up to 75%. Enter your trip fare at drop-off and Wayza calculates each member's exact share automatically.</p>
          </div>

          <div class="feature-item">
            <div class="feature-title">🛡️ Verified Student Community</div>
            <p class="feature-desc">Safe, reliable, and restricted exclusively to verified students with official college credentials.</p>
          </div>
        </div>

        <div class="cta-wrap">
          <a href="${appUrl}" class="cta-btn">Find Your Next Ride →</a>
        </div>

        <div class="footer">
          This email was sent to ${to} because you joined Wayza.<br>
          Built by students, for students • MIT-WPU Pune
        </div>
      </div>
    </body>
    </html>
  `;

  console.log(`\n========================================\n📧 [WELCOME EMAIL] Sending to ${to} for ${fullName}\n========================================\n`);

  try {
    await sendEmail(to, `Welcome to the Wayza crew, ${firstName}! 🚗`, html);
    console.log(`[AUTH] Welcome email delivered to ${to}`);
  } catch (err: any) {
    console.error(`[AUTH] Failed to send welcome email to ${to}:`, err.message);
  }
}

/**
 * Legacy stub kept for backward compatibility (no longer used in active flows)
 */
export async function sendVerificationEmail(
  to: string,
  _token: string
): Promise<void> {
  console.log(`[AUTH] sendVerificationEmail is deprecated and bypassed for ${to}`);
}


