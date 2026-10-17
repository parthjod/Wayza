import prisma from '../../config/db';
import { env } from '../../config/env';
import { uploadToS3, deleteFromS3, s3Client } from '../../config/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { revokeAllUserTokens } from '../../utils/jwt';
import { createError } from '../../middleware/errorHandler';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

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

    const isCloudFrontValid = env.AWS_CLOUDFRONT_DOMAIN && !env.AWS_CLOUDFRONT_DOMAIN.includes('your-cloudfront');
    let profilePicUrl: string | null = null;
    if (user.profilePicKey) {
      if (user.profilePicKey.startsWith('http') || user.profilePicKey.startsWith('data:')) {
        profilePicUrl = user.profilePicKey;
      } else if (isCloudFrontValid) {
        profilePicUrl = `https://${env.AWS_CLOUDFRONT_DOMAIN}/${user.profilePicKey}`;
      } else {
        profilePicUrl = `/api/user/avatar/${user.id}`;
      }
    }

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

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    // Validate that sharp can decode the file
    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(file.buffer).metadata();
    } catch {
      throw createError('Invalid or corrupted image file.', 400);
    }

    if (!metadata.format) {
      throw createError('Invalid image format.', 400);
    }

    // Resize and normalize orientation, convert to JPEG for universal compatibility
    const processedImage = await sharp(file.buffer)
      .rotate()
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .toFormat('jpeg', { quality: 85 })
      .toBuffer();

    const key = `avatars/${userId}/${uuidv4()}.jpg`;
    const contentType = 'image/jpeg';

    // Delete old avatar if exists and not a data URI
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

    // Check if real AWS S3 credentials are provided
    const isS3Configured =
      env.AWS_ACCESS_KEY_ID &&
      !env.AWS_ACCESS_KEY_ID.includes('your-access') &&
      env.AWS_SECRET_ACCESS_KEY &&
      !env.AWS_SECRET_ACCESS_KEY.includes('your-secret') &&
      env.AWS_S3_BUCKET &&
      !env.AWS_S3_BUCKET.includes('your-bucket');

    let finalUrl: string;
    let dbKey: string;

    if (isS3Configured) {
      try {
        finalUrl = await uploadToS3(key, processedImage, contentType);
        dbKey = key;
      } catch (s3Err: any) {
        console.warn('[Avatar] S3 upload failed, falling back to data URI:', s3Err?.message || s3Err);
        finalUrl = `data:${contentType};base64,${processedImage.toString('base64')}`;
        dbKey = finalUrl;
      }
    } else {
      // Store processed JPEG data URI directly in database
      finalUrl = `data:${contentType};base64,${processedImage.toString('base64')}`;
      dbKey = finalUrl;
    }

    // Update DB
    await prisma.user.update({
      where: { id: userId },
      data: { profilePicKey: dbKey },
    });

    const isCloudFrontValid = env.AWS_CLOUDFRONT_DOMAIN && !env.AWS_CLOUDFRONT_DOMAIN.includes('your-cloudfront');
    if (!isCloudFrontValid && !dbKey.startsWith('data:')) {
      finalUrl = `/api/user/avatar/${userId}`;
    }

    return { profilePicUrl: finalUrl };
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
