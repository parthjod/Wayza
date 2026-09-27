import { Server, Socket } from 'socket.io';
import cookie from 'cookie-parser';
import { verifyAccessToken, verifyRefreshToken } from '../utils/jwt';
import { chatService } from '../modules/chat/chat.service';
import { discoveryService } from '../modules/discovery/discovery.service';
import { groupService } from '../modules/group/group.service';
import { journeyService } from '../modules/journey/journey.service';
import { fareService } from '../modules/fare/fare.service';
import prisma from '../config/db';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function setupSocket(io: Server) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      let token: string | undefined;

      // Try cookie first
      const cookieHeader = socket.handshake.headers.cookie;
      let cookies: Record<string, string> = {};
      if (cookieHeader) {
        cookies = parseCookies(cookieHeader);
        token = cookies['accessToken'];
      }

      // Fallback to auth param
      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token.replace('Bearer ', '');
      }

      let payload = token ? verifyAccessToken(token) : null;

      // Fallback to refreshToken if accessToken expired
      if (!payload && cookies['refreshToken']) {
        payload = verifyRefreshToken(cookies['refreshToken']);
      }

      if (!payload) {
        return next(new Error('Authentication required'));
      }

      socket.userId = payload.userId;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`Socket connected: ${userId}`);

    // Join personal room
    socket.join(`user:${userId}`);

    // Join all group rooms the user belongs to
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    memberships.forEach((m: any) => {
      socket.join(`group:${m.groupId}`);
    });

    // --- Chat: Send Message ---
    socket.on('chat:send-message', async (data: { groupId: string; content: string }) => {
      try {
        if (!data.content || data.content.length > 1000) return;

        const message = await chatService.saveMessage(data.groupId, userId, data.content);

        // Broadcast to group room
        io.to(`group:${data.groupId}`).emit('chat:message', {
          id: message.id,
          messageId: message.id,
          groupId: data.groupId,
          senderId: message.senderId,
          senderName: message.senderName,
          content: message.content,
          createdAt: message.createdAt,
        });
      } catch (err: any) {
        console.error('Chat send error:', err);
        socket.emit('error', { message: err.message || 'Failed to send message' });
      }
    });

    // --- Location: Heartbeat ---
    socket.on('location:heartbeat', async (data: { lat: number; lng: number }) => {
      try {
        if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return;
        await discoveryService.heartbeat(userId, data.lat, data.lng);
      } catch {
        // Silent fail for heartbeats
      }
    });

    // --- Dynamic Room Management ---
    socket.on('join-room', (groupId: string) => {
      if (typeof groupId === 'string' && groupId.length > 0) {
        socket.join(`group:${groupId}`);
      }
    });

    socket.on('leave-room', (groupId: string) => {
      if (typeof groupId === 'string' && groupId.length > 0) {
        socket.leave(`group:${groupId}`);
      }
    });

    // --- Group Events (emitted by the server, triggered by API calls) ---
    // These are helper methods called from API controllers via the io instance

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${userId}`);
    });
  });

  return io;
}

/**
 * Emit group events from API controllers
 */
export function emitGroupEvent(io: Server, groupId: string, event: string, payload: any) {
  io.to(`group:${groupId}`).emit(event, payload);
}

export function emitUserEvent(io: Server, userId: string, event: string, payload: any) {
  io.to(`user:${userId}`).emit(event, payload);
}

/**
 * Simple cookie parser for socket handshake
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.split('=');
    cookies[name.trim()] = rest.join('=').trim();
  });
  return cookies;
}
