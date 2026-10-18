import { NextResponse } from 'next/server'
import { getAiShieldPlatformStats } from '@/lib/aishield/projects'
import {
  enforceAnonymousAIBudget,
  identityErrorResponse,
  resolveAIRequestIdentity,
} from '@/lib/ai/publicAccess'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const identity = await resolveAIRequestIdentity()
  const identityError = identityErrorResponse(identity)
  if (identityError) return identityError
  const limited = await enforceAnonymousAIBudget(req, identity, 'aishield', 30)
  if (limited) return limited

  try {
    const stats = await getAiShieldPlatformStats()
    return NextResponse.json(
      { success: true, stats },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
    )
  } catch (err) {
    console.error('[GET /api/ai-shield/stats]', err)
    return NextResponse.json({ success: false, message: 'Unable to load stats' }, { status: 500 })
  }
}
