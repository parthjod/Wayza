import prisma from '../../config/db';
import { env } from '../../config/env';
import { createError } from '../../middleware/errorHandler';

export class GroupService {
  /**
   * Create or retrieve a FORMING group between two users
   */
  async initiateGroup(userId: string, targetUserId: string, io?: any) {
    if (userId === targetUserId) {
      throw createError('Cannot create a group with yourself', 400);
    }

    // Sessions are considered active if updated within the last 30 minutes.
    // Anything older than 30 minutes is an abandoned/stale session from the past.
    const activeThreshold = new Date(Date.now() - 30 * 60 * 1000);

    // Disband any stale FORMING groups between these two users (older than 30 min)
    // so they do not see old messages from past sessions/days
    await prisma.group.updateMany({
      where: {
        status: 'FORMING',
        updatedAt: { lt: activeThreshold },
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      data: {
        status: 'DISBANDED',
      },
    });

    // 1. Check if an active FORMING group currently exists between these two users
    const existingGroup = await prisma.group.findFirst({
      where: {
        status: 'FORMING',
        updatedAt: { gte: activeThreshold },
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: { members: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (existingGroup) {
      await this.recordUserJoined(existingGroup.id, userId, io);
      return { groupId: existingGroup.id };
    }

    // 2. Check if targetUserId is waiting in an active FORMING group that still has space
    const targetGroup = await prisma.group.findFirst({
      where: {
        status: 'FORMING',
        updatedAt: { gte: activeThreshold },
        members: { some: { userId: targetUserId } },
      },
      include: { members: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (targetGroup && targetGroup.members.length < env.MAX_GROUP_SIZE) {
      // Add current user to target's existing group
      await prisma.groupMember.create({
        data: { groupId: targetGroup.id, userId },
      });
      await prisma.groupMember.updateMany({
        where: { groupId: targetGroup.id },
        data: { confirmedGoWith: false },
      });
      await this.recordUserJoined(targetGroup.id, userId, io);
      return { groupId: targetGroup.id };
    }

    // 3. Check if userId is waiting in an active FORMING group that still has space
    const userGroup = await prisma.group.findFirst({
      where: {
        status: 'FORMING',
        updatedAt: { gte: activeThreshold },
        members: { some: { userId } },
      },
      include: { members: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (userGroup && userGroup.members.length < env.MAX_GROUP_SIZE) {
      // Add target user to current user's existing group
      await prisma.groupMember.create({
        data: { groupId: userGroup.id, userId: targetUserId },
      });
      await prisma.groupMember.updateMany({
        where: { groupId: userGroup.id },
        data: { confirmedGoWith: false },
      });
      await this.recordUserJoined(userGroup.id, targetUserId, io);
      return { groupId: userGroup.id };
    }

    // 4. Otherwise, create a brand-new group with fresh members and clean chat
    const group = await prisma.group.create({
      data: {
        status: 'FORMING',
        dropLocation: 'To be determined',
        members: {
          create: [
            { userId },
            { userId: targetUserId },
          ],
        },
      },
    });

    // Record initiator joining
    await this.recordUserJoined(group.id, userId, io);

    return { groupId: group.id };
  }

  /**
   * Get full group state
   */
  async getGroup(groupId: string, userId: string, io?: any) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profilePicKey: true,
                phone: true,
              },
            },
          },
        },
        journey: true,
        fareSplit: {
          include: {
            participants: true,
          },
        },
      },
    });

    if (!group) throw createError('Group not found', 404);

    // Check membership
    const isMember = group.members.some((m: any) => m.userId === userId);
    if (!isMember) throw createError('Not a member of this group', 403);

    // If active group, record user joined if not already recorded
    if (group.status !== 'DISBANDED') {
      await this.recordUserJoined(groupId, userId, io);
    }

    // Get the requesting user's membership
    const selfMember = group.members.find((m: any) => m.userId === userId)!;

    // Build member data — conditionally include phone numbers
    const members = group.members.map((m: any) => {
      const memberData: any = {
        userId: m.user.id,
        fullName: m.user.fullName,
        profilePicUrl: m.user.profilePicKey
          ? `https://${env.AWS_CLOUDFRONT_DOMAIN}/${m.user.profilePicKey}`
          : null,
        confirmedGoWith: m.confirmedGoWith,
        sharedPhone: m.sharedPhone,
        startedJourney: m.startedJourney,
        endedJourney: m.endedJourney,
        confirmedSplit: m.confirmedSplit,
      };

      // Include phone immediately if the member has shared their phone
      if (m.sharedPhone && m.userId !== userId) {
        memberData.phone = m.user.phone;
      }

      return memberData;
    });

    return {
      id: group.id,
      status: group.status,
      dropLocation: group.dropLocation,
      dropLat: group.dropLat,
      dropLng: group.dropLng,
      members,
      journey: group.journey,
      fareSplit: group.fareSplit,
    };
  }

  /**
   * Confirm "Go with" for a member
   */
  async confirmGo(groupId: string, userId: string) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) throw createError('Not a member of this group', 403);

    await prisma.groupMember.update({
      where: { id: member.id },
      data: { confirmedGoWith: true },
    });

    // Check if all members have confirmed
    const allMembers = await prisma.groupMember.findMany({
      where: { groupId },
    });

    const allConfirmed = allMembers.every(
      (m: any) => m.userId === userId || m.confirmedGoWith
    );

    if (allConfirmed) {
      await prisma.group.update({
        where: { id: groupId },
        data: { status: 'CONFIRMED' },
      });
    }

    return {
      allConfirmed,
      members: allMembers.map((m: any) => ({
        userId: m.userId,
        confirmedGoWith: m.userId === userId ? true : m.confirmedGoWith,
      })),
    };
  }

  /**
   * Share phone number with group
   */
  async sharePhone(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) throw createError('Group not found', 404);
    if (group.status !== 'CONFIRMED' && group.status !== 'JOURNEY_STARTED' && group.status !== 'JOURNEY_ENDED') {
      throw createError('Group must be confirmed before sharing phone numbers', 400);
    }

    await prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { sharedPhone: true },
    });

    return { ok: true };
  }

  /**
   * Add a member to a group
   */
  async addMember(groupId: string, inviterId: string, inviteeUserId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) throw createError('Group not found', 404);
    if (group.status !== 'FORMING' && group.status !== 'CONFIRMED') {
      throw createError('Can only add members to FORMING or CONFIRMED groups', 400);
    }

    // Check inviter is a member
    const isInviterMember = group.members.some((m: any) => m.userId === inviterId);
    if (!isInviterMember) throw createError('Not a member of this group', 403);

    // Check max group size
    if (group.members.length >= env.MAX_GROUP_SIZE) {
      throw createError(`Group is full (max ${env.MAX_GROUP_SIZE} members)`, 400);
    }

    // Check invitee isn't already in this group
    if (group.members.some((m: any) => m.userId === inviteeUserId)) {
      throw createError('User is already in this group', 400);
    }

    // Check invitee isn't in another CONFIRMED/JOURNEY group
    const existingConfirmedGroup = await prisma.groupMember.findFirst({
      where: {
        userId: inviteeUserId,
        group: {
          status: { in: ['CONFIRMED', 'JOURNEY_STARTED'] },
        },
      },
    });

    if (existingConfirmedGroup) {
      throw createError('User is in another active group', 400, 'user_in_another_group');
    }

    // Add member
    await prisma.groupMember.create({
      data: { groupId, userId: inviteeUserId },
    });

    return { ok: true };
  }

  /**
   * Accept an invite — resets all confirmedGoWith flags
   */
  /**
   * Accept an invite — resets all confirmedGoWith flags
   */
  async acceptInvite(groupId: string, userId: string, io?: any) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) throw createError('No invite found', 404);

    // Reset all confirmedGoWith flags — everyone must re-confirm
    await prisma.groupMember.updateMany({
      where: { groupId },
      data: { confirmedGoWith: false },
    });

    // Reset group status to FORMING
    await prisma.group.update({
      where: { id: groupId },
      data: { status: 'FORMING' },
    });

    await this.recordUserJoined(groupId, userId, io);

    return { ok: true };
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId: string, userId: string, io?: any) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) {
      return { ok: true };
    }

    // 1. Record user left in chat before deleting member
    await this.recordUserLeft(groupId, userId, io);

    // 2. Delete the member
    await prisma.groupMember.delete({
      where: { id: member.id },
    });

    // 3. Check remaining members
    const remaining = await prisma.groupMember.count({ where: { groupId } });

    if (remaining <= 0) {
      // Disband the group wholly only when all persons leave
      await prisma.group.update({
        where: { id: groupId },
        data: { status: 'DISBANDED' },
      });
    } else {
      // Group remains! Reset to FORMING and reset all confirmations
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (group && group.status !== 'DISBANDED') {
        if (group.status !== 'FORMING') {
          await prisma.group.update({
            where: { id: groupId },
            data: { status: 'FORMING' },
          });
        }
        // Reset all confirmedGoWith
        await prisma.groupMember.updateMany({
          where: { groupId },
          data: {
            confirmedGoWith: false,
            startedJourney: false,
            endedJourney: false,
          },
        });
      }
    }

    return { ok: true };
  }

  /**
   * Record a user joining the group in chat messages
   */
  async recordUserJoined(groupId: string, userId: string, io?: any) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true },
    });
    if (!user) return null;

    // Check if the latest join/leave event from this user was already "joined"
    const latestEvent = await prisma.chatMessage.findFirst({
      where: {
        groupId,
        senderId: userId,
        content: {
          in: [`${user.fullName} joined the group`, `${user.fullName} left the group`],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestEvent && latestEvent.content === `${user.fullName} joined the group`) {
      return null;
    }

    const joinContent = `${user.fullName} joined the group`;
    const message = await prisma.chatMessage.create({
      data: {
        groupId,
        senderId: userId,
        content: joinContent,
      },
    });

    const payload = {
      id: message.id,
      messageId: message.id,
      groupId,
      senderId: userId,
      senderName: user.fullName,
      content: joinContent,
      createdAt: message.createdAt.toISOString(),
    };

    if (io) {
      io.to(`group:${groupId}`).emit('chat:message', payload);
      io.to(`group:${groupId}`).emit('group:member-joined', {
        groupId,
        userId,
        userName: user.fullName,
      });
    }

    return payload;
  }

  /**
   * Record a user leaving the group in chat messages
   */
  async recordUserLeft(groupId: string, userId: string, io?: any) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true },
    });
    if (!user) return null;

    const leaveContent = `${user.fullName} left the group`;
    const message = await prisma.chatMessage.create({
      data: {
        groupId,
        senderId: userId,
        content: leaveContent,
      },
    });

    const payload = {
      id: message.id,
      messageId: message.id,
      groupId,
      senderId: userId,
      senderName: user.fullName,
      content: leaveContent,
      createdAt: message.createdAt.toISOString(),
    };

    if (io) {
      io.to(`group:${groupId}`).emit('chat:message', payload);
      io.to(`group:${groupId}`).emit('group:member-left', {
        groupId,
        userId,
        userName: user.fullName,
      });
    }

    return payload;
  }
}

export const groupService = new GroupService();
