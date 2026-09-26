import prisma from '../../config/db';
import { env } from '../../config/env';
import { createError } from '../../middleware/errorHandler';

export class GroupService {
  /**
   * Create or retrieve a FORMING group between two users
   */
  async initiateGroup(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw createError('Cannot create a group with yourself', 400);
    }

    // Check if a FORMING group already exists between these two
    const existingGroup = await prisma.group.findFirst({
      where: {
        status: 'FORMING',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: { members: true },
    });

    if (existingGroup) {
      return { groupId: existingGroup.id };
    }

    // Get drop info from the active user's Redis data (pass through the group for now)
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

    return { groupId: group.id };
  }

  /**
   * Get full group state
   */
  async getGroup(groupId: string, userId: string) {
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
  async acceptInvite(groupId: string, userId: string) {
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

    return { ok: true };
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId: string, userId: string) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) throw createError('Not a member of this group', 403);

    // Delete the member
    await prisma.groupMember.delete({
      where: { id: member.id },
    });

    // Check remaining members
    const remaining = await prisma.groupMember.count({ where: { groupId } });

    if (remaining < 2) {
      // Disband the group
      await prisma.group.update({
        where: { id: groupId },
        data: { status: 'DISBANDED' },
      });
    } else {
      // If was CONFIRMED or later, drop back to FORMING
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (group && group.status !== 'FORMING' && group.status !== 'DISBANDED') {
        await prisma.group.update({
          where: { id: groupId },
          data: { status: 'FORMING' },
        });
        // Reset all confirmedGoWith
        await prisma.groupMember.updateMany({
          where: { groupId },
          data: { confirmedGoWith: false },
        });
      }
    }

    return { ok: true };
  }
}

export const groupService = new GroupService();
