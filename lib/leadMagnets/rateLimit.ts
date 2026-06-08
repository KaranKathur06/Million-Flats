const windowMs = 60 * 1000
const maxPerWindow = 8

type Entry = {
  count: number
  startedAt: number
}

const store = new Map<string, Entry>()

export function checkLeadMagnetRateLimit(key: string) {
  const now = Date.now()
  const current = store.get(key)

  if (!current || now - current.startedAt > windowMs) {
    store.set(key, { count: 1, startedAt: now })
    return { ok: true as const, remaining: maxPerWindow - 1, retryAfterSec: 0 }
  }

  if (current.count >= maxPerWindow) {
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000))
    return { ok: false as const, remaining: 0, retryAfterSec }
  }

  current.count += 1
  store.set(key, current)
  return { ok: true as const, remaining: maxPerWindow - current.count, retryAfterSec: 0 }
}
