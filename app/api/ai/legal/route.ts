// API: POST /api/ai/legal
// Analyzes uploaded legal documents for AITitle engine

import { NextRequest, NextResponse } from 'next/server'
import { analyzeDocument } from '@/lib/ai-core'
import type { EntityType } from '@/lib/ai-core'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { entityId, entityType, documentUrl, documentType } = await req.json()

    if (!entityId || !entityType) {
      return NextResponse.json({ error: 'entityId and entityType required' }, { status: 400 })
    }
    if (!documentUrl || !documentType) {
      return NextResponse.json({ error: 'documentUrl and documentType required' }, { status: 400 })
    }
    if (!['MANUAL_PROPERTY', 'PROJECT'].includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
    }

    const report = await analyzeDocument(
      entityId,
      entityType as EntityType,
      documentUrl,
      documentType,
      { requestedBy: req.headers.get('x-user-id') ?? 'anonymous' }
    )

    if (!report) return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })

    return NextResponse.json({ success: true, data: report })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
