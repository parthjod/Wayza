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
  if (env.AWS_ACCESS_KEY_ID === 'your-access-key' || env.NODE_ENV === 'development') {
    console.log(`\n========================================\n📱 [DEV OTP] Code for ${phone}: ${otp}\n========================================\n`);
    return;
  }
  await sendSMS(phone, `Your Wayza verification code is: ${otp}. Valid for 5 minutes.`);
}
