import type { NextApiRequest, NextApiResponse } from 'next'
import { reellyListProjects } from '@/lib/reelly'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 60
const rateLimitBuckets = new Map<string, number[]>()

function getClientIp(req: NextApiRequest) {
  const xff = req.headers['x-forwarded-for']
  const first = Array.isArray(xff) ? xff[0] : xff
  if (first) return String(first).split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

function isRateLimited(key: string) {
  const now = Date.now()
  const existing = rateLimitBuckets.get(key) || []
  const fresh = existing.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  fresh.push(now)
  rateLimitBuckets.set(key, fresh)
  return fresh.length > RATE_LIMIT_MAX
}

function normalizeListResponse(raw: unknown) {
  if (!raw || typeof raw !== 'object') return { items: [], raw }
  const anyRaw = raw as any
  const items =
    Array.isArray(anyRaw.items)
      ? anyRaw.items
      : Array.isArray(anyRaw.results)
        ? anyRaw.results
        : Array.isArray(anyRaw.data)
          ? anyRaw.data
          : Array.isArray(anyRaw)
            ? anyRaw
            : []
  return { items, raw }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = getClientIp(req)
  if (isRateLimited(`properties:${ip}`)) {
    return res.status(429).json({ error: 'rate_limited' })
  }

  try {
    const filters = {
      country: typeof req.query.country === 'string' ? req.query.country : undefined,
      city:
        typeof req.query.city === 'string'
          ? req.query.city
          : typeof req.query.location === 'string'
            ? req.query.location
            : undefined,
      community: typeof req.query.community === 'string' ? req.query.community : undefined,
      purpose:
        typeof req.query.purpose === 'string'
          ? req.query.purpose
          : typeof req.query.buy === 'string'
            ? 'buy'
            : typeof req.query.rent === 'string'
              ? 'rent'
              : undefined,
      min_price: typeof req.query.minPrice === 'string' ? req.query.minPrice : undefined,
      max_price: typeof req.query.maxPrice === 'string' ? req.query.maxPrice : undefined,
      beds:
        typeof req.query.beds === 'string'
          ? req.query.beds
          : typeof req.query.bedrooms === 'string'
            ? req.query.bedrooms
            : undefined,
      baths:
        typeof req.query.baths === 'string'
          ? req.query.baths
          : typeof req.query.bathrooms === 'string'
            ? req.query.bathrooms
            : undefined,
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
      limit: typeof req.query.limit === 'string' ? req.query.limit : undefined,
      offset: typeof req.query.offset === 'string' ? req.query.offset : undefined,
    }

    const data = await reellyListProjects<any>(filters)
    const normalized = normalizeListResponse(data)
    return res.status(200).json(normalized)
  } catch (error) {
    console.error('Error fetching properties:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(502).json({ error: 'reelly_failed', message })
  }
}

