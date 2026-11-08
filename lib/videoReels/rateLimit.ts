import { getRedis } from '@/lib/redis'

export async function consumeVideoRateLimit(key: string, limit: number, windowSeconds: number) {
  const redis = getRedis()
  if (!redis) throw new Error('Video feature rate limiting is unavailable')

  const count = Number(await redis.eval(
    "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n",
    1,
    `video-rate:${key}`,
    String(windowSeconds),
  ))
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
}
