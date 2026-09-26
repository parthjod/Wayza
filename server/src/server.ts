import http from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import app from './app';
import { env } from './config/env';
import { createRedisPubClient, createRedisSubClient } from './config/redis';
import { setupSocket } from './socket/socket';

const server = http.createServer(app);

// Socket.io setup with Redis adapter
const io = new Server(server, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

// Redis adapter for multi-instance support (production)
if (env.NODE_ENV === 'production') {
  try {
    const pubClient = createRedisPubClient();
    const subClient = createRedisSubClient();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.io Redis adapter enabled');
  } catch (err: any) {
    console.warn('Socket.io Redis adapter fallback to in-memory:', err.message);
  }
}

// Setup socket handlers
setupSocket(io);

// Make io accessible from request context (for emitting events from API controllers)
app.set('io', io);

// Start server
server.listen(env.PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║       🚗 Wayza Server Started        ║
  ║                                       ║
  ║   Port: ${env.PORT}                        ║
  ║   Env:  ${env.NODE_ENV.padEnd(26)}║
  ║                                       ║
  ╚═══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});
