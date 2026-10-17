import prisma from '../../config/db';
import { env } from '../../config/env';
import { uploadToS3 } from '../../config/s3';
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
   * Upload an image attachment in chat and broadcast message
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
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .toFormat('jpeg', { quality: 85 })
      .toBuffer();

    const key = `chat/${groupId}/${uuidv4()}.jpg`;
    const contentType = 'image/jpeg';

    let url: string;
    try {
      url = await uploadToS3(key, processedImage, contentType);
    } catch (s3Err: any) {
      console.warn('[ChatImage] S3 upload failed, falling back to data URI:', s3Err?.message || s3Err);
      url = `data:${contentType};base64,${processedImage.toString('base64')}`;
    }

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
