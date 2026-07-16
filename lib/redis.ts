import Redis from 'ioredis'

let client: Redis | null = null

export function getRedis(): Redis | null {
  if (client) return client
  const url = process.env.REDIS_URL || process.env.REDIS
  if (!url) return null
  client = new Redis(url)
  client.on('error', (e) => console.error('[redis] error', e))
  return client
}

export async function incrWithExpiry(key: string, expirySec: number): Promise<number> {
  const r = getRedis()
  if (!r) return Promise.resolve(0)
  const val = await r.incr(key)
  if (val === 1) await r.expire(key, expirySec)
  return Number(val)
}

export async function setWithExpiry(key: string, value: string, expirySec: number) {
  const r = getRedis()
  if (!r) return
  await r.set(key, value, 'EX', expirySec)
}

export async function getValue(key: string): Promise<string | null> {
  const r = getRedis()
  if (!r) return null
  return r.get(key)
}
