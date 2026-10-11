import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  connectTimeout: 5000,
  commandTimeout: 5000,
  retryStrategy(times) {
    return Math.min(times * 100, 2000);
  },
});

// Separate pub/sub clients for Socket.io adapter
export const createRedisPubClient = () => {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    commandTimeout: 5000,
    retryStrategy: (times) => Math.min(times * 100, 2000),
  });
  client.on('error', (err) => console.warn('Redis pub client error:', err.message));
  return client;
};

export const createRedisSubClient = () => {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    commandTimeout: 5000,
    retryStrategy: (times) => Math.min(times * 100, 2000),
  });
  client.on('error', (err) => console.warn('Redis sub client error:', err.message));
  return client;
};

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});
