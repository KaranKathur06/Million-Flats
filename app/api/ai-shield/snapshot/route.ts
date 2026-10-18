import { NextResponse } from 'next/server'
import { getAiShieldSnapshot } from '@/lib/aishield/projects'
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
    const { searchParams } = new URL(req.url)
    const projectId = (searchParams.get('projectId') || '').trim()
    if (!projectId) {
      return NextResponse.json({ success: false, message: 'Missing projectId' }, { status: 400 })
    }

    const snapshot = await getAiShieldSnapshot(projectId)
    if (!snapshot) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(
      { success: true, snapshot },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    )
  } catch (err) {
    console.error('[GET /api/ai-shield/snapshot]', err)
    return NextResponse.json({ success: false, message: 'Unable to load snapshot' }, { status: 500 })
  }
}
