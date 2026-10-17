import fs from 'fs';
import path from 'path';
import prisma from '../../config/db';
import { env } from '../../config/env';
import { uploadToS3, s3Client } from '../../config/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { createError } from '../../middleware/errorHandler';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export class ChatService {
  /**
   * Get paginated messages for a group (cursor-based)
   */
  async getMessages(groupId: string, userId: string, cursor?: string, limit: number = 50) {
    // Verify membership
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw createError('Not a member of this group', 403);

    const messages = await prisma.chatMessage.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to determine if there's a next page
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
      }),
      include: {
        sender: {
          select: { id: true, fullName: true },
        },
      },
    });

    const hasMore = messages.length > limit;
    const results = hasMore ? messages.slice(0, limit) : messages;

    return {
      messages: results.map((m: any) => ({
        id: m.id,
        senderId: m.sender.id,
        senderName: m.sender.fullName,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? results[results.length - 1].id : null,
    };
  }

  /**
   * Save a chat message (called from socket handler)
   */
  async saveMessage(groupId: string, senderId: string, content: string) {
    // Verify membership
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: senderId } },
    });
    if (!member) throw createError('Not a member of this group', 403);

    // Check blacklist
    const user = await prisma.user.findUnique({
      where: { id: senderId },
      select: { fullName: true, blacklisted: true },
    });
    if (!user) throw createError('User not found', 404);
    if (user.blacklisted) throw createError('Account suspended', 403);

    // Validate content length
    if (!content || content.length === 0 || content.length > 1000) {
      throw createError('Message must be 1–1000 characters', 400);
    }

    const message = await prisma.chatMessage.create({
      data: {
        groupId,
        senderId,
        content: content.trim(),
      },
    });

    return {
      id: message.id,
      groupId: message.groupId,
      senderId: message.senderId,
      senderName: user.fullName,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    };
  }

  /**
   * Stream a chat image from local disk or S3
   */
  async getImageStream(groupId: string, filename: string) {
    const safeFilename = path.basename(filename);
    const uploadDir = path.join(process.cwd(), 'uploads', 'chat', groupId);
    const localFilePath = path.join(uploadDir, safeFilename);

    // 1. Try serving from local disk
    if (fs.existsSync(localFilePath)) {
      return {
        filePath: localFilePath,
        contentType: 'image/jpeg',
      };
    }

    // 2. Fallback to S3
    try {
      const s3Key = `chat/${groupId}/${safeFilename}`;
      const s3Res = await s3Client.send(
        new GetObjectCommand({
          Bucket: env.AWS_S3_BUCKET,
          Key: s3Key,
        })
      );
      return {
        contentType: s3Res.ContentType || 'image/jpeg',
        stream: s3Res.Body as any,
      };
    } catch (err: any) {
      console.warn('[ChatImage] Failed to retrieve image:', safeFilename, err?.message);
      return null;
    }
  }

  /**
   * Upload an image attachment in chat, store reliably and broadcast message
   */
  async uploadImage(groupId: string, userId: string, file: Express.Multer.File, io?: any) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw createError('Not a member of this group', 403);

    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(file.buffer).metadata();
    } catch {
      throw createError('Invalid or corrupted image file.', 400);
    }

    if (!metadata.format) {
      throw createError('Invalid image format.', 400);
    }

    const processedImage = await sharp(file.buffer)
      .rotate()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .toFormat('jpeg', { quality: 85 })
      .toBuffer();

    const fileId = `${uuidv4()}.jpg`;

    // 1. Always save to local uploads directory for instant, reliable serving
    const uploadDir = path.join(process.cwd(), 'uploads', 'chat', groupId);
    await fs.promises.mkdir(uploadDir, { recursive: true });
    const localFilePath = path.join(uploadDir, fileId);
    await fs.promises.writeFile(localFilePath, processedImage);

    // 2. Also back up to S3 if credentials are configured
    const isS3Configured =
      env.AWS_ACCESS_KEY_ID &&
      !env.AWS_ACCESS_KEY_ID.includes('your-access') &&
      env.AWS_SECRET_ACCESS_KEY &&
      !env.AWS_SECRET_ACCESS_KEY.includes('your-secret') &&
      env.AWS_S3_BUCKET &&
      !env.AWS_S3_BUCKET.includes('your-bucket');

    if (isS3Configured) {
      try {
        await uploadToS3(`chat/${groupId}/${fileId}`, processedImage, 'image/jpeg');
      } catch (s3Err: any) {
        console.warn('[ChatImage] S3 backup failed (local disk backup active):', s3Err?.message || s3Err);
      }
    }

    // 3. Permanent, short URL that fits in VARCHAR(1000) and is always viewable
    const url = `/api/chat/images/${groupId}/${fileId}`;

    const message = await this.saveMessage(groupId, userId, `[IMG]${url}`);

    if (io) {
      io.to(`group:${groupId}`).emit('chat:message', {
        id: message.id,
        messageId: message.id,
        groupId,
        senderId: message.senderId,
        senderName: message.senderName,
        content: message.content,
        createdAt: message.createdAt,
      });
    }

    return { message, imageUrl: url };
  }
}

export const chatService = new ChatService();
