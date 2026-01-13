import 'server-only'

type CacheEntry<T> = {
  expiresAt: number
  value: T
}

function getEnv() {
  const baseUrl = process.env.REELLY_API_BASE_URL?.trim()
  const apiKey = process.env.REELLY_API_KEY?.trim()

  if (!baseUrl) {
    throw new Error('Missing REELLY_API_BASE_URL')
  }

  if (!apiKey) {
    throw new Error('Missing REELLY_API_KEY')
  }

  return { baseUrl, apiKey }
}

const cacheStore = new Map<string, CacheEntry<unknown>>()

function buildUrl(endpoint: string, params: Record<string, unknown>) {
  const { baseUrl } = getEnv()
  const cleaned: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    const s = typeof v === 'string' ? v : String(v)
    if (!s) continue
    cleaned[k] = s
  }

  const query = new URLSearchParams(cleaned).toString()
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${baseUrl.replace(/\/$/, '')}${path}${query ? `?${query}` : ''}`
}

export async function reellyFetch<T>(
  endpoint: string,
  params: Record<string, unknown> = {},
  options: { cacheTtlMs?: number } = {}
): Promise<T> {
  const url = buildUrl(endpoint, params)
  const { apiKey } = getEnv()

  const ttl = options.cacheTtlMs ?? 0
  const cached = ttl > 0 ? (cacheStore.get(url) as CacheEntry<T> | undefined) : undefined
  if (ttl > 0) {
    if (cached && cached.expiresAt > Date.now()) return cached.value
  }

  let data: T
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Reelly API error: ${res.status} ${body}`)
    }

    data = (await res.json()) as T
  } catch (e) {
    if (cached) return cached.value
    throw e
  }

  if (ttl > 0) {
    cacheStore.set(url, { expiresAt: Date.now() + ttl, value: data })
  }

  return data
}

export async function reellyListProjects<T>(params: Record<string, unknown> = {}) {
  return reellyFetch<T>('/api/v2/clients/projects', params, { cacheTtlMs: 5 * 60 * 1000 })
}

export async function reellyGetProject<T>(id: string) {
  return reellyFetch<T>(`/api/v2/clients/projects/${encodeURIComponent(id)}`, {}, { cacheTtlMs: 10 * 60 * 1000 })
}
