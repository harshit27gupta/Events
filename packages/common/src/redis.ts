import Redis from 'ioredis';
import { getLogger } from './logger';

let redisSingleton: Redis | null = null;

export function getRedis(url: string): Redis {
  if (redisSingleton) return redisSingleton;
  redisSingleton = new Redis(url);
  redisSingleton.on('connect', () => getLogger().info('Redis connected'));
  redisSingleton.on('error', (err) => getLogger().error({ err }, 'Redis error'));
  return redisSingleton;
}


