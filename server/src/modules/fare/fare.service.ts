import prisma from '../../config/db';
import { createError } from '../../middleware/errorHandler';

export class FareService {
  /**
   * Submit fare split
   */
  async submitFare(groupId: string, userId: string, totalFare: number, splitBetween: string[]) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true, fareSplit: true },
    });

    if (!group) throw createError('Group not found', 404);
    if (group.status !== 'JOURNEY_ENDED') {
      throw createError('Journey must be ended before splitting fare', 400);
    }
    if (group.fareSplit) {
      throw createError('Fare has already been submitted for this group', 400);
    }

    // Verify submitter is a member
    const isMember = group.members.some((m: any) => m.userId === userId);
    if (!isMember) throw createError('Not a member of this group', 403);

    // Verify all splitBetween are actual members
    const memberIds = new Set(group.members.map((m: any) => m.userId));
    for (const uid of splitBetween) {
      if (!memberIds.has(uid)) {
        throw createError('Split includes non-member user', 400);
      }
    }

    const amountPerPerson = Math.round((totalFare / splitBetween.length) * 100) / 100;

    const fareSplit = await prisma.fareSplit.create({
      data: {
        groupId,
        totalFare,
        submittedBy: userId,
        participants: {
          create: group.members.map((m: any) => ({
            userId: m.userId,
            amount: splitBetween.includes(m.userId) ? amountPerPerson : 0,
            acknowledged: false,
          })),
        },
      },
      include: {
        participants: true,
      },
    });

    // Update group status
    await prisma.group.update({
      where: { id: groupId },
      data: { status: 'SPLIT_DONE' },
    });

    // Get user names for the response
    const users = await prisma.user.findMany({
      where: { id: { in: group.members.map((m: any) => m.userId) } },
      select: { id: true, fullName: true },
    });
    const userMap = new Map(users.map((u: any) => [u.id, u.fullName]));

    const splits = fareSplit.participants.map((p: any) => ({
      userId: p.userId,
      fullName: userMap.get(p.userId) || 'Unknown',
      amount: p.amount,
    }));

    return { splitId: fareSplit.id, splits };
  }

  /**
   * Acknowledge fare split
   */
  async acknowledge(groupId: string, userId: string) {
    const fareSplit = await prisma.fareSplit.findUnique({
      where: { groupId },
      include: { participants: true },
    });

    if (!fareSplit) throw createError('No fare split found', 404);

    const participant = fareSplit.participants.find((p: any) => p.userId === userId);
    if (!participant) throw createError('Not part of this fare split', 403);

    await prisma.splitParticipant.update({
      where: { id: participant.id },
      data: { acknowledged: true },
    });

    // Check if all acknowledged
    const updated = await prisma.splitParticipant.findMany({
      where: { fareSplitId: fareSplit.id },
    });
    const allAcknowledged = updated.every((p: any) => p.acknowledged);

    return { allAcknowledged };
  }
}

export const fareService = new FareService();
