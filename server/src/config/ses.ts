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
