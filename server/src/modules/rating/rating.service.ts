import prisma from '../../config/db';
import { createError } from '../../middleware/errorHandler';

export class RatingService {
  /**
   * Submit a rating for a co-rider after a completed ride.
   * Blind reveal: stored immediately but avgRating is recalculated live.
   */
  async submitRating(
    groupId: string,
    fromUserId: string,
    toUserId: string,
    stars: number,
    tags: string[],
    comment?: string
  ) {
    if (fromUserId === toUserId) {
      throw createError('Cannot rate yourself', 400);
    }

    // Verify the group exists and is in a rateable state
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        status: true,
        members: { select: { userId: true } },
      },
    });

    if (!group) throw createError('Group not found', 404);
    if (!['JOURNEY_ENDED', 'SPLIT_DONE'].includes(group.status)) {
      throw createError('Ride not completed yet', 400);
    }

    const memberIds = group.members.map((m: any) => m.userId);
    if (!memberIds.includes(fromUserId)) {
      throw createError('You were not part of this ride', 403);
    }
    if (!memberIds.includes(toUserId)) {
      throw createError('Rated user was not part of this ride', 403);
    }

    // Upsert: allow re-rating (overwrite) within same ride
    const rating = await prisma.rating.upsert({
      where: {
        groupId_fromUserId_toUserId: { groupId, fromUserId, toUserId },
      },
      update: { stars, tags, comment: comment?.trim() || null },
      create: {
        groupId,
        fromUserId,
        toUserId,
        stars,
        tags,
        comment: comment?.trim() || null,
      },
    });

    // Recalculate avgRating and reviewsCount for the rated user
    const aggregate = await prisma.rating.aggregate({
      where: { toUserId },
      _avg: { stars: true },
      _count: { stars: true },
    });

    await prisma.user.update({
      where: { id: toUserId },
      data: {
        avgRating: Math.round((aggregate._avg.stars ?? 0) * 10) / 10,
        reviewsCount: aggregate._count.stars,
      },
    });

    return { ratingId: rating.id };
  }

  /**
   * Get pending (unrated) co-riders for a given ride.
   * Returns co-riders who haven't been rated by the calling user yet.
   */
  async getPendingRatings(groupId: string, userId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        status: true,
        createdAt: true,
        dropLocation: true,
        members: {
          select: {
            userId: true,
            user: { select: { fullName: true, profilePicKey: true } },
          },
        },
        ratings: {
          where: { fromUserId: userId },
          select: { toUserId: true },
        },
      },
    });

    if (!group) throw createError('Group not found', 404);
    if (!['JOURNEY_ENDED', 'SPLIT_DONE'].includes(group.status)) {
      return { coRiders: [], rideDate: null, dropLocation: null };
    }

    const ratedUserIds = new Set((group.ratings as any[]).map((r) => r.toUserId));

    const coRiders = (group.members as any[])
      .filter((m) => m.userId !== userId)
      .map((m) => ({
        userId: m.userId,
        fullName: m.user.fullName,
        profilePicUrl: m.user.profilePicKey
          ? `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${m.user.profilePicKey}`
          : null,
        rated: ratedUserIds.has(m.userId),
      }));

    return {
      coRiders,
      rideDate: group.createdAt,
      dropLocation: group.dropLocation,
    };
  }

  /**
   * Get all rides with pending ratings for the current user (for "Pending Rating" badges).
   * Returns list of groupIds where there are unrated co-riders.
   */
  async getPendingRideIds(userId: string): Promise<string[]> {
    // Find all completed rides the user was part of
    const completedGroups = await prisma.group.findMany({
      where: {
        members: { some: { userId } },
        status: { in: ['JOURNEY_ENDED', 'SPLIT_DONE'] },
      },
      select: {
        id: true,
        members: { select: { userId: true } },
        ratings: { where: { fromUserId: userId }, select: { toUserId: true } },
      },
    });

    const pendingGroupIds: string[] = [];
    for (const group of completedGroups) {
      const coRiderIds = (group.members as any[])
        .map((m: any) => m.userId)
        .filter((id: string) => id !== userId);
      const ratedIds = new Set((group.ratings as any[]).map((r: any) => r.toUserId));
      const hasUnrated = coRiderIds.some((id: string) => !ratedIds.has(id));
      if (hasUnrated) pendingGroupIds.push(group.id);
    }

    return pendingGroupIds;
  }
}

export const ratingService = new RatingService();
