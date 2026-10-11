import Redis, { RedisOptions } from 'ioredis';
import { env } from './env';

// Normalize Redis URL for AWS ElastiCache Serverless (TLS is mandatory)
let rawUrl = (env.REDIS_URL || '').trim();
if (!rawUrl.startsWith('redis://') && !rawUrl.startsWith('rediss://')) {
  if (rawUrl.includes('cache.amazonaws.com')) {
    rawUrl = `rediss://${rawUrl}`;
  } else {
    rawUrl = `redis://${rawUrl}`;
  }
}

const isAwsElastiCache = rawUrl.includes('cache.amazonaws.com') || rawUrl.startsWith('rediss://');

const getClientOptions = (): RedisOptions => {
  const options: RedisOptions = {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    commandTimeout: 5000,
    retryStrategy(times) {
      return Math.min(times * 100, 2000);
    },
  };

  if (isAwsElastiCache) {
    options.tls = {};
  }

  return options;
};

export const redis = new Redis(rawUrl, getClientOptions());

// Separate pub/sub clients for Socket.io adapter
export const createRedisPubClient = () => {
  const client = new Redis(rawUrl, getClientOptions());
  client.on('error', (err) => console.warn('Redis pub client error:', err.message));
  return client;
};

export const createRedisSubClient = () => {
  const client = new Redis(rawUrl, getClientOptions());
  client.on('error', (err) => console.warn('Redis sub client error:', err.message));
  return client;
};

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

