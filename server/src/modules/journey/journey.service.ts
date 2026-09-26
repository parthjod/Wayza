import prisma from '../../config/db';
import { createError } from '../../middleware/errorHandler';

export class JourneyService {
  /**
   * Start journey for a member
   */
  async startJourney(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) throw createError('Group not found', 404);
    if (group.status !== 'CONFIRMED') {
      throw createError('Group must be confirmed to start journey', 400);
    }

    const isMember = group.members.some((m: any) => m.userId === userId);
    if (!isMember) throw createError('Not a member of this group', 403);

    // Create journey if it doesn't exist
    let journey = await prisma.journey.findUnique({
      where: { groupId },
    });

    if (!journey) {
      journey = await prisma.journey.create({
        data: {
          groupId,
          participants: {
            create: group.members.map((m: any) => ({
              userId: m.userId,
            })),
          },
        },
      });
    }

    // Update participant start time
    await prisma.journeyParticipant.updateMany({
      where: { journeyId: journey.id, userId },
      data: { startedAt: new Date() },
    });

    // Update group member
    await prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { startedJourney: true },
    });

    // Check if all have started
    const participants = await prisma.journeyParticipant.findMany({
      where: { journeyId: journey.id },
    });
    const allStarted = participants.every((p: any) => p.startedAt !== null);

    if (allStarted) {
      await prisma.journey.update({
        where: { id: journey.id },
        data: { allStarted: true, startedAt: new Date() },
      });
      await prisma.group.update({
        where: { id: groupId },
        data: { status: 'JOURNEY_STARTED' },
      });
    }

    const memberNames = group.members.map((m: any) => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: memberNames } },
      select: { fullName: true },
    });

    return {
      allStarted,
      memberNames: users.map((u: any) => u.fullName),
    };
  }

  /**
   * End journey for a member
   */
  async endJourney(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) throw createError('Group not found', 404);
    if (group.status !== 'JOURNEY_STARTED') {
      throw createError('Journey must be started first', 400);
    }

    const isMember = group.members.some((m: any) => m.userId === userId);
    if (!isMember) throw createError('Not a member of this group', 403);

    const journey = await prisma.journey.findUnique({
      where: { groupId },
    });

    if (!journey) throw createError('Journey not found', 404);

    // Update participant end time
    await prisma.journeyParticipant.updateMany({
      where: { journeyId: journey.id, userId },
      data: { endedAt: new Date() },
    });

    // Update group member
    await prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { endedJourney: true },
    });

    // Check if all have ended
    const participants = await prisma.journeyParticipant.findMany({
      where: { journeyId: journey.id },
    });
    const allEnded = participants.every((p: any) => p.endedAt !== null);

    if (allEnded) {
      await prisma.journey.update({
        where: { id: journey.id },
        data: { allEnded: true, endedAt: new Date() },
      });
      await prisma.group.update({
        where: { id: groupId },
        data: { status: 'JOURNEY_ENDED' },
      });
    }

    return { allEnded };
  }
}

export const journeyService = new JourneyService();
