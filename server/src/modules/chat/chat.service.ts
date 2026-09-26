import prisma from '../../config/db';
import { createError } from '../../middleware/errorHandler';

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
}

export const chatService = new ChatService();
