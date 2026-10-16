import { redis } from '../../config/redis';
import { env } from '../../config/env';
import prisma from '../../config/db';
import { haversineDistance } from '../../utils/haversine';
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

    // Get active user IDs without blocking redis.keys
    const candidateUserIds = await this.getActiveCandidateUserIds();
    const nearbyUsers: Array<{
      userId: string;
      fullName: string;
      profilePicUrl: string | null;
      distanceMeters: number;
      dropLocationLabel: string;
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

      if (distance <= self.searchRadiusMeters) {
        nearbyUsers.push({
          userId: other.userId,
          fullName: other.fullName,
          profilePicUrl: other.profilePicKey
            ? `https://${env.AWS_CLOUDFRONT_DOMAIN}/${other.profilePicKey}`
            : null,
          distanceMeters: distance,
          dropLocationLabel: other.dropLocationLabel,
        });
      }
    }

    // Sort by distance
    nearbyUsers.sort((a, b) => a.distanceMeters - b.distanceMeters);

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
