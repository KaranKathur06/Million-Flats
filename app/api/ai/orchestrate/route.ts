// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API: POST /api/ai/orchestrate
// Full property intelligence bundle — runs all AI engines in parallel.
//
// Use this endpoint when you want the complete picture:
//   AIShield + AIIndex + AIMarket + AIRisk in one response.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextRequest, NextResponse } from 'next/server'
import { orchestrateProperty } from '@/lib/ai-core'
import type { EntityType, AIModule } from '@/lib/ai-core'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { entityId, entityType, modules, forceRefresh } = body

    if (!entityId || !entityType) {
      return NextResponse.json({ error: 'entityId and entityType required' }, { status: 400 })
    }

    if (!['MANUAL_PROPERTY', 'PROJECT'].includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
    }

    const validModules: AIModule[] = ['SHIELD', 'INDEX', 'MARKET', 'RISK', 'VIEW', 'TITLE']
    const requestedModules: AIModule[] = Array.isArray(modules)
      ? modules.filter((m: string) => validModules.includes(m as AIModule))
      : ['SHIELD', 'INDEX', 'MARKET', 'RISK']

    const bundle = await orchestrateProperty(
      entityId,
      entityType as EntityType,
      {
        modules: requestedModules,
        forceRefresh: forceRefresh === true,
        requestedBy: req.headers.get('x-user-id') ?? 'anonymous',
        requestIp: req.headers.get('x-forwarded-for') ?? undefined,
      }
    )

    return NextResponse.json({ success: true, data: bundle })
  } catch (err: any) {
    console.error('[API /ai/orchestrate]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
