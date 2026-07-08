// API: POST /api/ai/vision
// Analyzes property media for AIView engine

import { NextRequest, NextResponse } from 'next/server'
import { analyzeMedia } from '@/lib/ai-core'
import type { EntityType } from '@/lib/ai-core'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { entityId, entityType, imageUrls, forceRefresh } = await req.json()

    if (!entityId || !entityType) {
      return NextResponse.json({ error: 'entityId and entityType required' }, { status: 400 })
    }
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'imageUrls array required' }, { status: 400 })
    }
    if (!['MANUAL_PROPERTY', 'PROJECT'].includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
    }

    const report = await analyzeMedia(entityId, entityType as EntityType, imageUrls, {
      forceRefresh: forceRefresh === true,
      requestedBy: req.headers.get('x-user-id') ?? 'anonymous',
    })

    if (!report) return NextResponse.json({ error: 'No images to analyze' }, { status: 404 })

    return NextResponse.json({ success: true, data: report })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
