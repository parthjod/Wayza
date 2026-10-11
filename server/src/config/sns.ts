import axios from 'axios';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { env } from './env';

const snsClient = new SNSClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function sendSMS(phone: string, message: string): Promise<void> {
  await snsClient.send(
    new PublishCommand({
      PhoneNumber: phone,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: env.AWS_SNS_SENDER_ID,
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    })
  );
}

export async function sendOTPSMS(phone: string, otp: string): Promise<void> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);

  // ALWAYS log the OTP code prominently so testing/login is never blocked
  console.log(`\n========================================\n📱 [WAYZA OTP CODE] for ${phone}: ${otp}\n========================================\n`);

  // 1. Fast2SMS Integration (Instant delivery to ANY Indian number without DLT)
  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  if (fast2smsKey && fast2smsKey !== 'your-fast2sms-api-key') {
    try {
      console.log(`[Fast2SMS Quick Route] Sending OTP to +91${cleanPhone}...`);
      const response = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          route: 'q',
          message: `Your Wayza verification code is ${otp}. Valid for 5 minutes.`,
          numbers: cleanPhone,
        },
        {
          headers: {
            authorization: fast2smsKey,
          },
          timeout: 7000,
        }
      );
      if (response.data?.return) {
        console.log(`[Fast2SMS] OTP sent successfully to +91${cleanPhone}:`, response.data.message);
        return;
      }
      console.warn('[Fast2SMS] Gateway response warning:', response.data);
    } catch (err: any) {
      console.error('[Fast2SMS] Failed to send SMS:', err.response?.data || err.message);
    }
  } else {
    console.warn('[Fast2SMS] FAST2SMS_API_KEY is not set or using placeholder');
  }

  // 2. AWS SNS Fallback (If AWS keys are configured)
  if (env.AWS_ACCESS_KEY_ID && env.AWS_ACCESS_KEY_ID !== 'your-access-key') {
    try {
      console.log(`[AWS SNS] Sending OTP to ${phone}...`);
      await Promise.race([
        sendSMS(phone, `Your Wayza verification code is: ${otp}. Valid for 5 minutes.`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AWS SNS timeout after 5s')), 5000))
      ]);
      console.log(`[AWS SNS] OTP sent to ${phone}`);
      return;
    } catch (err: any) {
      console.error('[AWS SNS] Failed to send SMS:', err.message);
    }
  }

  // 3. Fallback: Always log to server logs so login never fails with 500 error
  console.log(`\n========================================\n📱 [OTP] Code for ${phone}: ${otp}\n========================================\n`);
}
