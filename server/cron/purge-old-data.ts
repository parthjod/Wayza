/**
 * Nightly cron job to purge old data (rides, chats) beyond retention period.
 * Run with PM2: pm2 start cron/purge-old-data.js --cron "0 3 * * *"
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '90', 10);

async function purge() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  console.log(`Purging records older than ${cutoff.toISOString()} (${retentionDays} days)...`);

  // Delete old chat messages
  const deletedMessages = await prisma.chatMessage.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  console.log(`Deleted ${deletedMessages.count} old chat messages`);

  // Delete old disbanded/split-done groups and their related data (cascading)
  const deletedGroups = await prisma.group.deleteMany({
    where: {
      status: { in: ['DISBANDED', 'SPLIT_DONE'] },
      updatedAt: { lt: cutoff },
    },
  });
  console.log(`Deleted ${deletedGroups.count} old groups`);

  // Delete old reports
  const deletedReports = await prisma.report.deleteMany({
    where: {
      status: { in: ['DISMISSED', 'WARNING_ISSUED', 'BLACKLISTED'] },
      createdAt: { lt: cutoff },
    },
  });
  console.log(`Deleted ${deletedReports.count} old reports`);

  console.log('Purge complete.');
}

purge()
  .catch((e) => {
    console.error('Purge failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
