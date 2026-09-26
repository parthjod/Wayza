import prisma from '../../config/db';
import { env } from '../../config/env';
import { uploadToS3, deleteFromS3 } from '../../config/s3';
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

    return {
      ...user,
      profilePicUrl: user.profilePicKey
        ? `https://${env.AWS_CLOUDFRONT_DOMAIN}/${user.profilePicKey}`
        : null,
    };
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
    // Validate MIME type via sharp (reads actual bytes, not just Content-Type)
    const metadata = await sharp(file.buffer).metadata();
    const allowedFormats = ['jpeg', 'png', 'webp'];
    if (!metadata.format || !allowedFormats.includes(metadata.format)) {
      throw createError('Invalid image format. Use JPEG, PNG, or WebP.', 400);
    }

    // Resize and strip EXIF (sharp strips metadata by default, rotate normalizes orientation)
    const processedImage = await sharp(file.buffer)
      .rotate()
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .toFormat(metadata.format as any)
      .toBuffer();

    const ext = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
    const key = `avatars/${userId}/${uuidv4()}.${ext}`;
    const contentType = `image/${metadata.format}`;

    // Delete old avatar if exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicKey: true },
    });
    if (user?.profilePicKey) {
      try {
        await deleteFromS3(user.profilePicKey);
      } catch {
        // Non-critical: old avatar delete failure
      }
    }

    // Upload new avatar
    const url = await uploadToS3(key, processedImage, contentType);

    // Update DB
    await prisma.user.update({
      where: { id: userId },
      data: { profilePicKey: key },
    });

    return { profilePicUrl: url };
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
