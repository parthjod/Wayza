import prisma from '../../config/db';
import { redis } from '../../config/redis';
import { createError } from '../../middleware/errorHandler';

export class FareService {
  /**
   * Submit fare split (supports equal or smart destination-based split)
   */
  async submitFare(
    groupId: string,
    userId: string,
    totalFare: number,
    splitBetween: string[],
    splits?: Array<{ userId: string; amount: number }>
  ) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true, fareSplit: true, journey: true },
    });

    if (!group) throw createError('Group not found', 404);
    if (group.status === 'DISBANDED') {
      throw createError('Group has already ended or disbanded', 400);
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

    let participantData: Array<{ userId: string; amount: number; acknowledged: boolean }> = [];

    if (splits && splits.length > 0) {
      // Smart destination/distance-based split
      participantData = group.members.map((m: any) => {
        const custom = splits.find((s) => s.userId === m.userId);
        return {
          userId: m.userId,
          amount: custom ? Math.round(custom.amount * 100) / 100 : 0,
          acknowledged: m.userId === userId, // Submitter is acknowledged by default
        };
      });
    } else {
      // Equal split
      const amountPerPerson = Math.round((totalFare / splitBetween.length) * 100) / 100;
      participantData = group.members.map((m: any) => ({
        userId: m.userId,
        amount: splitBetween.includes(m.userId) ? amountPerPerson : 0,
        acknowledged: m.userId === userId,
      }));
    }

    const fareSplit = await prisma.fareSplit.create({
      data: {
        groupId,
        totalFare,
        submittedBy: userId,
        participants: {
          create: participantData,
        },
      },
      include: {
        participants: true,
      },
    });

    // Update group status to SPLIT_DONE
    await prisma.group.update({
      where: { id: groupId },
      data: { status: 'SPLIT_DONE' },
    });

    // Mark journey ended if active
    if (group.journey) {
      await prisma.journey.update({
        where: { id: group.journey.id },
        data: { allEnded: true, endedAt: new Date() },
      }).catch(() => {});
    }

    // Mark all members as finished with journey & split
    await prisma.groupMember.updateMany({
      where: { groupId },
      data: { endedJourney: true, confirmedSplit: true },
    });

    // Clean up active location sessions for all members so their booking state is reset
    for (const m of group.members) {
      await redis.del(`active:${m.userId}`).catch(() => {});
      await redis.zrem('active:users:index', m.userId).catch(() => {});
    }

    // Get user names for the response
    const users = await prisma.user.findMany({
      where: { id: { in: group.members.map((m: any) => m.userId) } },
      select: { id: true, fullName: true },
    });
    const userMap = new Map(users.map((u: any) => [u.id, u.fullName]));

    const resultSplits = fareSplit.participants.map((p: any) => ({
      userId: p.userId,
      fullName: userMap.get(p.userId) || 'Unknown',
      amount: p.amount,
    }));

    return { splitId: fareSplit.id, splits: resultSplits };
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
