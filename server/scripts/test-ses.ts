import dotenv from 'dotenv';
dotenv.config();

import { sendOTPByEmail } from '../src/config/ses';
import { env } from '../src/config/env';

async function main() {
  const targetEmail = process.argv[2];

  if (!targetEmail) {
    console.error('\n❌ Please provide an email address to send the test OTP to.');
    console.log('Usage: npx tsx scripts/test-ses.ts your-email@mitwpu.edu.in\n');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('🚀 Testing AWS SES Email Dispatch');
  console.log('======================================================');
  console.log(`Region:           ${env.AWS_REGION}`);
  console.log(`From (Source):    ${env.AWS_SES_FROM_EMAIL}`);
  console.log(`To (Destination): ${targetEmail}`);
  console.log(`Email Provider:   ${process.env.EMAIL_PROVIDER || 'ses'}`);
  console.log('======================================================\n');

  try {
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Generated Test OTP: ${testOtp}`);
    console.log('Sending email now via AWS SES...\n');

    await sendOTPByEmail(targetEmail, testOtp, {
      userName: 'Wayza Tester',
      isNewUser: false,
    });

    console.log('\n✅ Dispatch command completed! Please check your inbox (and spam/junk folder).');
  } catch (err: any) {
    console.error('\n❌ Test failed with error:', err.message || err);
    if (err.name) console.error(`Error Code: ${err.name}`);
  }
}

main();
