import prisma from '../../config/db';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { resolveProfilePicUrl } from '../../utils/initials';
import { createError } from '../../middleware/errorHandler';
import { journeyService } from '../journey/journey.service';
import { haversineDistance } from '../../utils/haversine';

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
    }).catch(() => {});

    const notifyTarget = async (grpId: string) => {
      if (!io) return;
      try {
        const initiator = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, fullName: true, profilePicKey: true },
        });
        const initiatorPicUrl = resolveProfilePicUrl(initiator?.profilePicKey, initiator?.id);

        let dropLocationLabel = '';
        try {
          const raw = await redis.get(`active:${userId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            dropLocationLabel = parsed.dropLocationLabel || '';
          }
        } catch {}

        io.to(`user:${targetUserId}`).emit('group:invite-received', {
          groupId: grpId,
          inviterId: userId,
          inviterName: initiator?.fullName || 'A rider',
          inviterPicUrl: initiatorPicUrl,
          dropLocationLabel,
        });
      } catch (e) {
        console.warn('Failed to emit group:invite-received:', e);
      }
    };

    // 1. Check if an active group currently exists between these two users
    const existingGroup = await prisma.group.findFirst({
      where: {
        status: { in: ['FORMING', 'CONFIRMED', 'JOURNEY_STARTED'] },
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
      await notifyTarget(existingGroup.id);
      return { groupId: existingGroup.id };
    }

    try {
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
        }).catch((err: any) => {
          if (err.code !== 'P2002') throw err;
        });
        await prisma.groupMember.updateMany({
          where: { groupId: targetGroup.id },
          data: { confirmedGoWith: false },
        });
        await this.recordUserJoined(targetGroup.id, userId, io);
        await notifyTarget(targetGroup.id);
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
        }).catch((err: any) => {
          if (err.code !== 'P2002') throw err;
        });
        await prisma.groupMember.updateMany({
          where: { groupId: userGroup.id },
          data: { confirmedGoWith: false },
        });
        await this.recordUserJoined(userGroup.id, targetUserId, io);
        await notifyTarget(userGroup.id);
        return { groupId: userGroup.id };
      }

      // 4. Otherwise, create a brand-new group with fresh members and clean chat
      let resolvedDropLocation = 'MIT-WPU Campus';
      try {
        const rawInit = await redis.get(`active:${userId}`);
        const rawTarget = await redis.get(`active:${targetUserId}`);
        const parsedInit = rawInit ? JSON.parse(rawInit) : null;
        const parsedTarget = rawTarget ? JSON.parse(rawTarget) : null;
        resolvedDropLocation = parsedInit?.dropLocationLabel || parsedTarget?.dropLocationLabel || 'MIT-WPU Campus';
      } catch {}

      const group = await prisma.group.create({
        data: {
          status: 'FORMING',
          dropLocation: resolvedDropLocation,
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
      await notifyTarget(group.id);

      return { groupId: group.id };
    } catch (err: any) {
      if (err.code === 'P2002') {
        // Handle race condition: simultaneous creation by both devices
        const fallbackGroup = await prisma.group.findFirst({
          where: {
            status: { in: ['FORMING', 'CONFIRMED', 'JOURNEY_STARTED'] },
            AND: [
              { members: { some: { userId } } },
              { members: { some: { userId: targetUserId } } },
            ],
          },
          orderBy: { updatedAt: 'desc' },
        });
        if (fallbackGroup) {
          await notifyTarget(fallbackGroup.id);
          return { groupId: fallbackGroup.id };
        }
      }
      throw err;
    }
  }

  /**
   * Get full group state
   */
  async getGroup(groupId: string, userId: string, io?: any) {
    let group = await prisma.group.findUnique({
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

    // Auto-disband FORMING group if unfinalized for 30 minutes or more
    if (group.status === 'FORMING') {
      const THIRTY_MINS_MS = 30 * 60 * 1000;
      if (Date.now() - new Date(group.createdAt).getTime() >= THIRTY_MINS_MS) {
        await prisma.group.update({
          where: { id: groupId },
          data: { status: 'DISBANDED' },
        });
        if (io) {
          io.to(`group:${groupId}`).emit('group:member-left', {
            groupId,
            userId: 'system',
          });
        }
        group.status = 'DISBANDED';
      }
    }

    // Auto-end journey if ongoing for 2 hours or more
    if (group.status === 'JOURNEY_STARTED') {
      const journeyStart = group.journey?.startedAt || group.updatedAt;
      const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
      if (journeyStart && (Date.now() - new Date(journeyStart).getTime() >= TWO_HOURS_MS)) {
        await journeyService.autoEndJourney(groupId, io);
        const refreshedGroup = await prisma.group.findUnique({
          where: { id: groupId },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    profilePicKey: true,
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
        if (refreshedGroup) {
          group = refreshedGroup;
        }
      }
    }

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
        profilePicUrl: resolveProfilePicUrl(m.user.profilePicKey, m.user.id),
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

    let pickupSequence: any = null;
    if (allConfirmed) {
      await prisma.group.update({
        where: { id: groupId },
        data: { status: 'CONFIRMED' },
      });
      // Compute pickup sequence dynamically from live locations for session
      try {
        pickupSequence = await this.getPickupSequence(groupId);
      } catch (err) {
        console.error('Failed to compute pickup sequence on confirm:', err);
      }
    }

    return {
      allConfirmed,
      members: allMembers.map((m: any) => ({
        userId: m.userId,
        confirmedGoWith: m.userId === userId ? true : m.confirmedGoWith,
      })),
      pickupSequence,
    };
  }

  /**
   * Dynamically calculate the optimal pickup sequence for the confirmed group session.
   * Does NOT persist coordinates or order to DB. Evaluates live location from ephemeral Redis session.
   * Algorithm: Optimal TSP-style permutation search with exact Haversine metric.
   * Finds the path P_1 -> P_2 -> ... -> P_k -> Destination minimizing total transit distance & cost.
   * First user in sequence is recommended to book the ride.
   */
  async getPickupSequence(groupId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                profilePicKey: true,
              },
            },
          },
        },
      },
    });

    if (!group) throw createError('Group not found', 404);

    // Destination coordinates fallback to MIT-WPU Front Gate if none specified
    const destLat = group.dropLat ?? 18.5191;
    const destLng = group.dropLng ?? 73.8553;
    const destLabel = group.dropLocation || 'Campus';

    // Retrieve ephemeral live location for each member from Redis
    const memberLocations: Array<{
      userId: string;
      fullName: string;
      profilePicUrl: string | null;
      lat: number;
      lng: number;
      hasLiveCoords: boolean;
    }> = [];

    for (const m of group.members) {
      const u = m.user;
      let lat = destLat;
      let lng = destLng;
      let hasLiveCoords = false;

      try {
        const raw = await redis.get(`active:${u.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
            lat = parsed.lat;
            lng = parsed.lng;
            hasLiveCoords = true;
          }
        }
      } catch {}

      memberLocations.push({
        userId: u.id,
        fullName: u.fullName,
        profilePicUrl: resolveProfilePicUrl(u.profilePicKey, u.id),
        lat,
        lng,
        hasLiveCoords,
      });
    }

    const n = memberLocations.length;
    if (n === 0) {
      return {
        sequence: [],
        suggestedBooker: null,
        destination: { label: destLabel, lat: destLat, lng: destLng },
        totalDistanceMeters: 0,
      };
    }

    if (n === 1) {
      const distToDest = haversineDistance(memberLocations[0].lat, memberLocations[0].lng, destLat, destLng);
      const seqItem = {
        order: 1,
        userId: memberLocations[0].userId,
        fullName: memberLocations[0].fullName,
        profilePicUrl: memberLocations[0].profilePicUrl,
        lat: memberLocations[0].lat,
        lng: memberLocations[0].lng,
        hasLiveCoords: memberLocations[0].hasLiveCoords,
        distanceToNextMeters: distToDest,
      };
      return {
        sequence: [seqItem],
        suggestedBooker: {
          userId: memberLocations[0].userId,
          fullName: memberLocations[0].fullName,
          profilePicUrl: memberLocations[0].profilePicUrl,
        },
        destination: { label: destLabel, lat: destLat, lng: destLng },
        totalDistanceMeters: distToDest,
      };
    }

    // Exact TSP permutation search (Group size max 4, permutations <= 24, complexity O(k! * k), < 1ms execution)
    const indices = memberLocations.map((_, i) => i);
    let bestPermutation: number[] = [...indices];
    let minTotalDistance = Infinity;

    const permute = (arr: number[], m: number[] = []) => {
      if (arr.length === 0) {
        // Calculate total route distance for this sequence: m[0] -> m[1] -> ... -> m[k-1] -> Destination
        let dist = 0;
        for (let i = 0; i < m.length - 1; i++) {
          const u1 = memberLocations[m[i]];
          const u2 = memberLocations[m[i + 1]];
          dist += haversineDistance(u1.lat, u1.lng, u2.lat, u2.lng);
        }
        const lastUser = memberLocations[m[m.length - 1]];
        dist += haversineDistance(lastUser.lat, lastUser.lng, destLat, destLng);

        if (dist < minTotalDistance) {
          minTotalDistance = dist;
          bestPermutation = [...m];
        }
      } else {
        for (let i = 0; i < arr.length; i++) {
          const curr = arr.slice();
          const next = curr.splice(i, 1);
          permute(curr.slice(), m.concat(next));
        }
      }
    };

    permute(indices);

    // Build the ordered sequence with distances
    const sequence = bestPermutation.map((idx, rank) => {
      const member = memberLocations[idx];
      let distanceToNextMeters = 0;
      if (rank < bestPermutation.length - 1) {
        const nextMember = memberLocations[bestPermutation[rank + 1]];
        distanceToNextMeters = haversineDistance(member.lat, member.lng, nextMember.lat, nextMember.lng);
      } else {
        // Last member to destination
        distanceToNextMeters = haversineDistance(member.lat, member.lng, destLat, destLng);
      }

      return {
        order: rank + 1,
        userId: member.userId,
        fullName: member.fullName,
        profilePicUrl: member.profilePicUrl,
        lat: member.lat,
        lng: member.lng,
        hasLiveCoords: member.hasLiveCoords,
        distanceToNextMeters,
      };
    });

    const first = sequence[0];

    return {
      sequence,
      suggestedBooker: {
        userId: first.userId,
        fullName: first.fullName,
        profilePicUrl: first.profilePicUrl,
      },
      destination: {
        label: destLabel,
        lat: destLat,
        lng: destLng,
      },
      totalDistanceMeters: minTotalDistance === Infinity ? 0 : minTotalDistance,
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

  /**
   * Get user's current active group if any (to resume ride)
   */
  async getActiveGroup(userId: string) {
    const activeThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours
    const activeGroup = await prisma.group.findFirst({
      where: {
        status: { in: ['FORMING', 'CONFIRMED', 'JOURNEY_STARTED'] },
        updatedAt: { gte: activeThreshold },
        members: { some: { userId } },
      },
      include: {
        journey: true,
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, profilePicKey: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!activeGroup) return { activeGroup: null };

    // If group is FORMING and has been unfinalized for 30 minutes or more, auto-disband it
    if (activeGroup.status === 'FORMING') {
      const THIRTY_MINS_MS = 30 * 60 * 1000;
      if (Date.now() - new Date(activeGroup.createdAt).getTime() >= THIRTY_MINS_MS) {
        await prisma.group.update({
          where: { id: activeGroup.id },
          data: { status: 'DISBANDED' },
        });
        return { activeGroup: null };
      }
    }

    // If journey has been ongoing for 2 hours or more, auto-end it
    if (activeGroup.status === 'JOURNEY_STARTED') {
      const journeyStart = activeGroup.journey?.startedAt || activeGroup.updatedAt;
      const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
      if (journeyStart && (Date.now() - new Date(journeyStart).getTime() >= TWO_HOURS_MS)) {
        await journeyService.autoEndJourney(activeGroup.id);
        return { activeGroup: null };
      }
    }

    return {
      activeGroup: {
        id: activeGroup.id,
        status: activeGroup.status,
        dropLocation: activeGroup.dropLocation,
        members: activeGroup.members.map((m: any) => ({
          userId: m.userId,
          fullName: m.user.fullName,
          profilePicUrl: resolveProfilePicUrl(m.user.profilePicKey, m.user.id),
          confirmedGoWith: m.confirmedGoWith,
        })),
      },
    };
  }

  /**
   * Get ride history (past completed/ended rides)
   */
  async getRideHistory(userId: string) {
    const rides = await prisma.group.findMany({
      where: {
        members: { some: { userId } },
        status: { in: ['JOURNEY_ENDED', 'SPLIT_DONE', 'DISBANDED'] },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, fullName: true, profilePicKey: true },
            },
          },
        },
        fareSplit: true,
        journey: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      rides: rides.map((g: any) => ({
        id: g.id,
        status: g.status,
        dropLocation: g.dropLocation,
        createdAt: g.createdAt,
        totalFare: g.fareSplit?.totalFare || null,
        members: g.members.map((m: any) => ({
          userId: m.userId,
          fullName: m.user.fullName,
          profilePicUrl: resolveProfilePicUrl(m.user.profilePicKey, m.user.id),
        })),
      })),
    };
  }
  /**
   * Auto-disband FORMING groups where "Go with" has not been finalized within 30 minutes
   */
  async autoDisbandExpiredFormingGroups(io?: any) {
    const THIRTY_MINS_MS = 30 * 60 * 1000;
    const expiryThreshold = new Date(Date.now() - THIRTY_MINS_MS);

    const expiredGroups = await prisma.group.findMany({
      where: {
        status: 'FORMING',
        createdAt: { lte: expiryThreshold },
      },
      include: {
        members: true,
      },
    });

    for (const group of expiredGroups) {
      try {
        await prisma.group.update({
          where: { id: group.id },
          data: { status: 'DISBANDED' },
        });

        if (io) {
          io.to(`group:${group.id}`).emit('group:member-left', {
            groupId: group.id,
            userId: 'system',
          });
        }
        console.log(`[GroupService] Auto-disbanded unfinalized FORMING group ${group.id} after 30 minutes timeout`);
      } catch (err) {
        console.error(`[GroupService] Failed to auto-disband group ${group.id}:`, err);
      }
    }
  }
}

export const groupService = new GroupService();
