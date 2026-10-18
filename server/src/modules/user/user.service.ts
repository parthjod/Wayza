import prisma from '../../config/db';
import { env } from '../../config/env';
import { uploadToS3, deleteFromS3, s3Client } from '../../config/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { revokeAllUserTokens } from '../../utils/jwt';
import { createError } from '../../middleware/errorHandler';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { resolveProfilePicUrl } from '../../utils/initials';

export class UserService {
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        collegeEmail: true,
        emailVerified: true,
        profilePicKey: true,
      },
    });

    if (!user) throw createError('User not found', 404);

    const profilePicUrl = resolveProfilePicUrl(user.profilePicKey, user.id);

    return {
      ...user,
      profilePicUrl,
    };
  }

  async getAvatarStream(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicKey: true },
    });
    if (!user || !user.profilePicKey) return null;

    if (user.profilePicKey.startsWith('data:')) {
      const match = user.profilePicKey.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return {
          contentType: match[1],
          buffer: Buffer.from(match[2], 'base64'),
        };
      }
      return null;
    }

    if (user.profilePicKey.startsWith('http://') || user.profilePicKey.startsWith('https://')) {
      return {
        contentType: 'image/jpeg',
        redirectUrl: user.profilePicKey,
      };
    }

    // Check disk cache first
    const diskPath = path.join(process.cwd(), 'uploads', 'avatars', `${userId}.jpg`);
    if (fs.existsSync(diskPath)) {
      return {
        contentType: 'image/jpeg',
        filePath: diskPath,
      };
    }

    // Try fetching from S3
    try {
      const s3Res = await s3Client.send(new GetObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: user.profilePicKey,
      }));
      return {
        contentType: s3Res.ContentType || 'image/jpeg',
        stream: s3Res.Body as any,
      };
    } catch (err: any) {
      console.warn('[Avatar] Failed to fetch avatar from S3 for user', userId, err?.message);
      return null;
    }
  }

  async updateMe(userId: string, fullName: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { fullName: fullName.trim() },
      select: { id: true, fullName: true },
    });
    return user;
  }

  async uploadAvatar(userId: string, input: Express.Multer.File | Buffer) {
    const rawBuffer = Buffer.isBuffer(input) ? input : input.buffer;
    // Validate that sharp can decode the file
    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(rawBuffer).metadata();
    } catch {
      throw createError('Invalid or corrupted image file.', 400);
    }

    if (!metadata.format) {
      throw createError('Invalid image format.', 400);
    }

    // Resize and normalize orientation, convert to compact JPEG for universal compatibility
    const processedImage = await sharp(rawBuffer)
      .rotate()
      .resize(256, 256, { fit: 'cover', position: 'center' })
      .toFormat('jpeg', { quality: 80 })
      .toBuffer();

    const contentType = 'image/jpeg';
    const dataUri = `data:${contentType};base64,${processedImage.toString('base64')}`;

    // Delete old avatar from S3 if it was an S3 key
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicKey: true },
    });
    if (user?.profilePicKey && !user.profilePicKey.startsWith('data:')) {
      try {
        await deleteFromS3(user.profilePicKey);
      } catch {
        // Non-critical: old avatar delete failure
      }
    }

    // Always persist the data URI directly into Postgres database so it NEVER fails,
    // NEVER produces 404s or S3/CloudFront mismatches, and works 100% reliably everywhere!
    await prisma.user.update({
      where: { id: userId },
      data: { profilePicKey: dataUri },
    });

    // Also write to local disk cache as backup
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadsDir, `${userId}.jpg`), processedImage);
    } catch (diskErr: any) {
      console.warn('[Avatar] Disk write error:', diskErr?.message);
    }

    return { profilePicUrl: dataUri };
  }

  async deleteAvatar(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicKey: true },
    });
    if (user?.profilePicKey && !user.profilePicKey.startsWith('data:')) {
      try {
        await deleteFromS3(user.profilePicKey);
      } catch {
        // Non-critical
      }
    }
    const diskPath = path.join(process.cwd(), 'uploads', 'avatars', `${userId}.jpg`);
    if (fs.existsSync(diskPath)) {
      try {
        fs.unlinkSync(diskPath);
      } catch {}
    }
    await prisma.user.update({
      where: { id: userId },
      data: { profilePicKey: null },
    });
    return { ok: true, profilePicUrl: null };
  }

  async deleteAccount(userId: string) {
    // Delete avatar from S3
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicKey: true },
    });
    if (user?.profilePicKey) {
      try {
        await deleteFromS3(user.profilePicKey);
      } catch {
        // Non-critical
      }
    }

    // Revoke all tokens
    await revokeAllUserTokens(userId);

    // Clean up reports where user is reporter or reported (to satisfy foreign keys)
    await prisma.report.deleteMany({
      where: {
        OR: [{ reporterId: userId }, { reportedId: userId }],
      },
    });

    // Clean up fare splits submitted by user
    await prisma.fareSplit.deleteMany({
      where: { submittedBy: userId },
    });

    // Hard delete user (cascades to group memberships, journey participants, messages)
    await prisma.user.delete({ where: { id: userId } });

    return { ok: true };
  }
}

export const userService = new UserService();
