// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API: POST /api/ai/valuation
// Returns full ValuationReport for a property or project.
//
// Auth: Public (result is gated by confidence score client-side)
//       Rate limited to prevent scraping.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextRequest, NextResponse } from 'next/server'
import { getValuationReport } from '@/lib/ai-core'
import type { EntityType } from '@/lib/ai-core'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { entityId, entityType, forceRefresh } = body

    // ── Validation ────────────────────────────────────────────────────────
    if (!entityId || typeof entityId !== 'string') {
      return NextResponse.json({ error: 'entityId is required' }, { status: 400 })
    }

    if (!entityType || !['MANUAL_PROPERTY', 'PROJECT'].includes(entityType)) {
      return NextResponse.json(
        { error: 'entityType must be MANUAL_PROPERTY or PROJECT' },
        { status: 400 }
      )
    }

    // ── Run Engine ────────────────────────────────────────────────────────
    const report = await getValuationReport(
      entityId,
      entityType as EntityType,
      {
        forceRefresh: forceRefresh === true,
        requestedBy: req.headers.get('x-user-id') ?? 'anonymous',
        requestIp: req.headers.get('x-forwarded-for') ?? undefined,
      }
    )

    if (!report) {
      return NextResponse.json(
        { error: 'Property not found or insufficient data for valuation' },
        { status: 404 }
      )
    }

    // ── Cache headers ─────────────────────────────────────────────────────
    const response = NextResponse.json({ success: true, data: report })
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200')
    response.headers.set('X-AI-Model', report.modelName)
    response.headers.set('X-AI-Version', report.modelVersion)
    response.headers.set('X-Cache-Hit', String(report.cacheHit))

    return response
  } catch (err: any) {
    console.error('[API /ai/valuation]', err)
    return NextResponse.json(
      { error: 'Valuation service temporarily unavailable', details: err?.message },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const entityId = searchParams.get('entityId')
  const entityType = searchParams.get('entityType')
  const forceRefresh = searchParams.get('forceRefresh') === 'true'

  if (!entityId || !entityType) {
    return NextResponse.json(
      { error: 'entityId and entityType query params required' },
      { status: 400 }
    )
  }

  if (!['MANUAL_PROPERTY', 'PROJECT'].includes(entityType)) {
    return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
  }

  try {
    const report = await getValuationReport(entityId, entityType as EntityType, { forceRefresh })

    if (!report) {
      return NextResponse.json({ error: 'Not found or insufficient data' }, { status: 404 })
    }

    const response = NextResponse.json({ success: true, data: report })
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200')
    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
