// ━━━ VerixShield v2.1 — Feedback API ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/verixshield/feedback
// Records actual sold prices for self-learning calibration

import { NextResponse } from 'next/server'
import { recordFeedback, computeAccuracyMetrics } from '@/lib/verixshield/services'

export const dynamic = 'force-dynamic'

// POST — Record a sold price
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { propertyId, entityType, actualPrice, actualPriceDate, source, city, community } = body

    if (!propertyId || !actualPrice || !entityType) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, entityType, actualPrice' },
        { status: 400 },
      )
    }

    const result = await recordFeedback({
      propertyId,
      entityType,
      actualPrice: Number(actualPrice),
      actualPriceDate: actualPriceDate ? new Date(actualPriceDate) : new Date(),
      source: source || 'ADMIN_INPUT',
      city,
      community,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('[VerixShield:Feedback] Error:', error)
    return NextResponse.json(
      { error: 'Failed to record feedback', message: error.message },
      { status: 500 },
    )
  }
}

// PUT — Trigger accuracy metrics recomputation (CRON job)
export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await computeAccuracyMetrics()
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('[VerixShield:Feedback] Accuracy compute error:', error)
    return NextResponse.json(
      { error: 'Failed to compute accuracy metrics', message: error.message },
      { status: 500 },
    )
  }
}
