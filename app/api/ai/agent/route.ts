// API: GET/POST /api/ai/agent
// Returns AgentIntelligenceReport for an agent (AIPro engine)

import { NextRequest, NextResponse } from 'next/server'
import { orchestrateAgent } from '@/lib/ai-core'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const agentId = new URL(req.url).searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

  try {
    const report = await orchestrateAgent(agentId)
    if (!report) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    const res = NextResponse.json({ success: true, data: report })
    res.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800')
    return res
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, forceRefresh } = await req.json()
    if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

    const report = await orchestrateAgent(agentId, { forceRefresh: forceRefresh === true })
    if (!report) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: report })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
