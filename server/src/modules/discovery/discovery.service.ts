import { redis } from '../../config/redis';
import { env } from '../../config/env';
import prisma from '../../config/db';
import { haversineDistance } from '../../utils/haversine';
import { resolveProfilePicUrl } from '../../utils/initials';
import { createError } from '../../middleware/errorHandler';

interface ActiveUserData {
  userId: string;
  fullName: string;
  profilePicKey: string | null;
  lat: number;
  lng: number;
  dropLocationLabel: string;
  dropLat: number | null;
  dropLng: number | null;
  searchRadiusMeters: number;
  publishedAt: string;
}

const ACTIVE_INDEX_KEY = 'active:users:index';

/**
 * Check if two destination labels share common keywords or are identical
 */
function areLabelsSimilar(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const cleanA = a.toLowerCase().trim();
  const cleanB = b.toLowerCase().trim();
  if (cleanA === cleanB) return true;
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;

  // Compare significant words (>= 3 chars) excluding common noise words
  const stopWords = new Set(['the', 'and', 'for', 'near', 'gate', 'road', 'stand', 'stop', 'circle', 'chowk', 'opp', 'opposite', 'pune']);
  const wordsA = cleanA.split(/[\s,.-]+/).filter((w) => w.length >= 3 && !stopWords.has(w));
  const wordsB = cleanB.split(/[\s,.-]+/).filter((w) => w.length >= 3 && !stopWords.has(w));
  return wordsA.some((w) => wordsB.includes(w));
}

export class DiscoveryService {
  /**
   * Publish user's location for discovery
   */
  async publishLocation(
    userId: string,
    data: {
      lat: number;
      lng: number;
      dropLocationId: string | null;
      dropLocationCustom: string | null;
      dropLat: number | null;
      dropLng: number | null;
      searchRadiusMeters: number;
    }
  ) {
    // Check user exists and isn't blacklisted
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, profilePicKey: true, blacklisted: true },
    });

    if (!user) throw createError('User not found', 404);
    if (user.blacklisted) throw createError('Account suspended', 403, 'account_suspended');

    // Resolve drop location label
    let dropLocationLabel = data.dropLocationCustom || '';
    if (data.dropLocationId) {
      const poi = await prisma.campusPOI.findUnique({
        where: { id: data.dropLocationId },
      });
      if (poi) {
        dropLocationLabel = poi.label;
        data.dropLat = poi.lat;
        data.dropLng = poi.lng;
      }
    }

    const activeData: ActiveUserData = {
      userId,
      fullName: user.fullName,
      profilePicKey: user.profilePicKey,
      lat: data.lat,
      lng: data.lng,
      dropLocationLabel,
      dropLat: data.dropLat,
      dropLng: data.dropLng,
      searchRadiusMeters: data.searchRadiusMeters,
      publishedAt: new Date().toISOString(),
    };

    // Store in Redis with TTL
    await redis.setex(
      `active:${userId}`,
      env.LOCATION_TTL_SECONDS,
      JSON.stringify(activeData)
    );

    // Keep active user index up to date (sorted set scored by expiry timestamp)
    await redis.zadd(ACTIVE_INDEX_KEY, Date.now() + env.LOCATION_TTL_SECONDS * 1000, userId).catch(() => {});

    return { ok: true };
  }

  /**
   * Helper to fetch candidate active user IDs safely without using blocking KEYS command
   */
  private async getActiveCandidateUserIds(): Promise<string[]> {
    try {
      // Prune expired entries from index
      await redis.zremrangebyscore(ACTIVE_INDEX_KEY, '-inf', Date.now());
      const ids = await redis.zrange(ACTIVE_INDEX_KEY, 0, -1);
      if (ids && ids.length > 0) {
        return ids;
      }
    } catch {
      // fallback to SCAN
    }

    // Non-blocking SCAN fallback (allowed on AWS ElastiCache, unlike KEYS)
    try {
      let cursor = '0';
      const userIds: string[] = [];
      do {
        const [nextCursor, matchedKeys] = await redis.scan(cursor, 'MATCH', 'active:*', 'COUNT', 100);
        cursor = nextCursor;
        for (const key of matchedKeys) {
          if (key !== ACTIVE_INDEX_KEY) {
            userIds.push(key.replace('active:', ''));
          }
        }
      } while (cursor !== '0');
      return userIds;
    } catch {
      return [];
    }
  }

  /**
   * Find nearby active users within radius
   */
  async getNearby(userId: string) {
    // Get requester's active entry
    const selfRaw = await redis.get(`active:${userId}`);
    if (!selfRaw) {
      throw createError('Publish your location first', 400, 'no_active_location');
    }

    const self: ActiveUserData = JSON.parse(selfRaw);

    // Refresh requester's presence TTL while app is open and polling radar
    await redis.expire(`active:${userId}`, env.LOCATION_TTL_SECONDS);
    await redis.zadd(ACTIVE_INDEX_KEY, Date.now() + env.LOCATION_TTL_SECONDS * 1000, userId).catch(() => {});

    // Get active user IDs without blocking redis.keys
    const candidateUserIds = await this.getActiveCandidateUserIds();
    const nearbyUsers: Array<{
      userId: string;
      fullName: string;
      profilePicUrl: string | null;
      distanceMeters: number;
      dropLocationLabel: string;
      rating?: number;
      reviewsCount?: number;
      sameDestination?: boolean;
      destinationDistanceMeters?: number;
    }> = [];

    // Get blacklisted user IDs to exclude
    const blacklistedUsers = await prisma.user.findMany({
      where: { blacklisted: true },
      select: { id: true },
    });
    const blacklistedIds = new Set(blacklistedUsers.map((u: any) => u.id));

    // Get groups where user is in CONFIRMED or JOURNEY_STARTED status
    const activeGroups = await prisma.groupMember.findMany({
      where: {
        userId,
        group: {
          status: { in: ['CONFIRMED', 'JOURNEY_STARTED'] },
        },
      },
      include: {
        group: {
          include: {
            members: { select: { userId: true } },
          },
        },
      },
    });
    const groupedUserIds = new Set<string>();
    activeGroups.forEach((gm: any) => {
      gm.group.members.forEach((m: any) => groupedUserIds.add(m.userId));
    });

    // Query candidate user metadata to calculate reputation, rating, and review count
    const candidateUsers = await prisma.user.findMany({
      where: { id: { in: candidateUserIds } },
      select: {
        id: true,
        warningCount: true,
        avgRating: true,
        reviewsCount: true,
        _count: {
          select: {
            groupMemberships: {
              where: {
                group: { status: { in: ['SPLIT_DONE', 'JOURNEY_ENDED', 'CONFIRMED'] } },
              },
            },
          },
        },
      },
    });
    const userMetaMap = new Map<string, { warningCount: number; ridesCount: number; avgRating: number; reviewsCount: number }>();
    candidateUsers.forEach((u: any) => {
      userMetaMap.set(u.id, {
        warningCount: u.warningCount || 0,
        ridesCount: u._count?.groupMemberships || 0,
        avgRating: u.avgRating || 0,
        reviewsCount: u.reviewsCount || 0,
      });
    });

    // Threshold for destination proximity (3.5 km covers same neighborhood or campus gates)
    const MAX_DESTINATION_PROXIMITY_METERS = 3500;
    const hasSelfDropCoords = typeof self.dropLat === 'number' && typeof self.dropLng === 'number';

    for (const otherUserId of candidateUserIds) {
      if (otherUserId === userId) continue;
      if (blacklistedIds.has(otherUserId)) continue;
      if (groupedUserIds.has(otherUserId)) continue;

      const raw = await redis.get(`active:${otherUserId}`);
      if (!raw) {
        // Stale or expired index entry, prune
        redis.zrem(ACTIVE_INDEX_KEY, otherUserId).catch(() => {});
        continue;
      }

      const other: ActiveUserData = JSON.parse(raw);
      const distance = haversineDistance(self.lat, self.lng, other.lat, other.lng);

      // 1. Pickup proximity check: must be within search radius
      if (distance > self.searchRadiusMeters) {
        continue;
      }

      // 2. Destination proximity check
      const hasOtherDropCoords = typeof other.dropLat === 'number' && typeof other.dropLng === 'number';
      let dropDistanceMeters: number | null = null;
      if (hasSelfDropCoords && hasOtherDropCoords) {
        dropDistanceMeters = haversineDistance(self.dropLat!, self.dropLng!, other.dropLat!, other.dropLng!);
      }

      const labelMatch = areLabelsSimilar(self.dropLocationLabel, other.dropLocationLabel);

      // Same destination if within 3.5 km or labels share common keywords
      const isSameDestination = (dropDistanceMeters !== null && dropDistanceMeters <= MAX_DESTINATION_PROXIMITY_METERS) || labelMatch;

      // Filter out completely opposite destinations:
      // If both have coordinates and drop points are > 5 km apart AND labels don't match,
      // they are going in different directions and cannot share a ride.
      if (dropDistanceMeters !== null && dropDistanceMeters > 5000 && !labelMatch) {
        continue;
      }

      const meta = userMetaMap.get(other.userId);
      const ridesCount = meta?.ridesCount ?? 0;
      const warnings = meta?.warningCount ?? 0;
      const storedAvg = meta?.avgRating ?? 0;
      const storedCount = meta?.reviewsCount ?? 0;
      // Use real rating if available; fall back to a ride-based estimate for new users
      let rating: number;
      let reviewsCount: number;
      if (storedCount > 0) {
        rating = storedAvg;
        reviewsCount = storedCount;
      } else {
        const calcRating = Math.min(5.0, Math.max(3.8, 4.8 + ridesCount * 0.05 - warnings * 0.4));
        rating = Math.round(calcRating * 10) / 10;
        reviewsCount = Math.max(1, ridesCount);
      }

      nearbyUsers.push({
        userId: other.userId,
        fullName: other.fullName || 'Rider',
        profilePicUrl: resolveProfilePicUrl(other.profilePicKey, other.userId),
        distanceMeters: Math.round(distance),
        dropLocationLabel: other.dropLocationLabel || 'Campus',
        rating,
        reviewsCount,
        sameDestination: isSameDestination,
        destinationDistanceMeters: dropDistanceMeters !== null ? Math.round(dropDistanceMeters) : undefined,
      });
    }

    // Sort:
    // 1. Same destination / route matches first
    // 2. Highest rating
    // 3. Highest reviews
    // 4. Closest distance
    nearbyUsers.sort((a: any, b: any) => {
      if (a.sameDestination !== b.sameDestination) {
        return a.sameDestination ? -1 : 1;
      }
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.reviewsCount !== a.reviewsCount) return b.reviewsCount - a.reviewsCount;
      return a.distanceMeters - b.distanceMeters;
    });

    return { users: nearbyUsers };
  }

  /**
   * Remove user from active discovery
   */
  async unpublish(userId: string) {
    await redis.del(`active:${userId}`);
    await redis.zrem(ACTIVE_INDEX_KEY, userId).catch(() => {});
    return { ok: true };
  }

  /**
   * Update location heartbeat (from socket)
   */
  async heartbeat(userId: string, lat: number, lng: number) {
    const raw = await redis.get(`active:${userId}`);
    if (!raw) return;

    const data: ActiveUserData = JSON.parse(raw);
    data.lat = lat;
    data.lng = lng;

    await redis.setex(`active:${userId}`, env.LOCATION_TTL_SECONDS, JSON.stringify(data));
    await redis.zadd(ACTIVE_INDEX_KEY, Date.now() + env.LOCATION_TTL_SECONDS * 1000, userId).catch(() => {});
  }
}

export const discoveryService = new DiscoveryService();
