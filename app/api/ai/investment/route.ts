// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API: POST /api/ai/investment
// Returns full InvestmentIntelligence report for a property or project.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextRequest, NextResponse } from 'next/server'
import { getInvestmentReport } from '@/lib/ai-core'
import type { EntityType } from '@/lib/ai-core'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const entityId = searchParams.get('entityId')
  const entityType = searchParams.get('entityType')

  if (!entityId || !entityType) {
    return NextResponse.json({ error: 'entityId and entityType required' }, { status: 400 })
  }

  if (!['MANUAL_PROPERTY', 'PROJECT'].includes(entityType)) {
    return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
  }

  try {
    const report = await getInvestmentReport(entityId, entityType as EntityType)

    if (!report) {
      return NextResponse.json({ error: 'Not found or insufficient data' }, { status: 404 })
    }

    const response = NextResponse.json({ success: true, data: report })
    response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800')
    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { entityId, entityType, forceRefresh } = await req.json()

    if (!entityId || !entityType) {
      return NextResponse.json({ error: 'entityId and entityType required' }, { status: 400 })
    }

    const report = await getInvestmentReport(
      entityId,
      entityType as EntityType,
      { forceRefresh: forceRefresh === true }
    )

    if (!report) {
      return NextResponse.json({ error: 'Not found or insufficient data' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: report })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
