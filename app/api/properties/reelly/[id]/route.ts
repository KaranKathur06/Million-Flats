import { NextResponse } from 'next/server'
import { reellyGetProject } from '@/lib/reelly'

type RateEntry = { count: number; resetAt: number }

const rate = new Map<string, RateEntry>()

function getClientIp(req: Request) {
  const xf = req.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0]?.trim() || 'unknown'
  return 'unknown'
}

function rateLimit(ip: string) {
  const now = Date.now()
  const windowMs = 60 * 1000
  const max = 120

  const cur = rate.get(ip)
  if (!cur || cur.resetAt <= now) {
    rate.set(ip, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  if (cur.count >= max) {
    return { ok: false, retryAfterSeconds: Math.ceil((cur.resetAt - now) / 1000) }
  }

  cur.count += 1
  return { ok: true }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ip = getClientIp(req)
  const rl = rateLimit(ip)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds ?? 60) } }
    )
  }

  const id = params.id
  if (!id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 })
  }

  try {
    const data = await reellyGetProject<any>(id)
    return NextResponse.json({ item: data, raw: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: 'reelly_failed', message }, { status: 502 })
  }
}
