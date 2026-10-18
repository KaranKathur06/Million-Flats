import { NextRequest, NextResponse } from 'next/server'
import { getInvestmentReport } from '@/lib/ai-core'
import type { EntityType } from '@/lib/ai-core'
import {
  canAccessAIEntity,
  enforceAnonymousAIBudget,
  identityErrorResponse,
  isPublicAIEntity,
  readLimitedJson,
  resolveAIRequestIdentity,
} from '@/lib/ai/publicAccess'

export const dynamic = 'force-dynamic'

function isEntityType(value: unknown): value is EntityType {
  return value === 'MANUAL_PROPERTY' || value === 'PROJECT'
}

export async function GET(req: NextRequest) {
  const identity = await resolveAIRequestIdentity()
  const identityError = identityErrorResponse(identity)
  if (identityError) return identityError

  const limited = await enforceAnonymousAIBudget(req, identity, 'aiindex', 5)
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const entityId = searchParams.get('entityId')?.trim()
  const entityType = searchParams.get('entityType')
  if (!entityId || !isEntityType(entityType)) {
    return NextResponse.json({ success: false, error: 'Valid entityId and entityType are required' }, { status: 400 })
  }

  const isPublic = await isPublicAIEntity(entityId, entityType)
  const hasOwnerAccess = identity.kind === 'authenticated' &&
    await canAccessAIEntity(entityId, entityType, identity)
  if (!isPublic && !hasOwnerAccess) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  const forceRefresh = searchParams.get('forceRefresh') === 'true'
  if (forceRefresh && !hasOwnerAccess) {
    return NextResponse.json({ success: false, error: 'forceRefresh requires owner or admin access' }, { status: 400 })
  }

  try {
    const report = await getInvestmentReport(entityId, entityType, {
      forceRefresh,
      requestedBy: identity.kind === 'authenticated' ? identity.userId : 'anonymous',
    })
    if (!report) {
      return NextResponse.json({ success: false, error: 'Not found or insufficient data' }, { status: 404 })
    }

    return NextResponse.json(
      { success: true, data: report },
      {
        headers: { 'Cache-Control': 'private, no-store, max-age=0' },
      },
    )
  } catch (error) {
    console.error('[GET /api/ai/investment] request failed', error)
    return NextResponse.json({ success: false, error: 'AIIndex service temporarily unavailable' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const identity = await resolveAIRequestIdentity()
  const identityError = identityErrorResponse(identity)
  if (identityError) return identityError
  if (identity.kind !== 'authenticated') {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const body = await readLimitedJson(req)
  if (!body.ok) {
    return NextResponse.json(
      { success: false, error: body.tooLarge ? 'Request body exceeds 1 MB' : 'Invalid JSON body' },
      { status: body.tooLarge ? 413 : 400 },
    )
  }
  if (!body.value || typeof body.value !== 'object') {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }
  const payload = body.value as { entityId?: unknown; entityType?: unknown; forceRefresh?: unknown }
  const entityId = typeof payload.entityId === 'string' ? payload.entityId.trim() : ''
  if (!entityId || !isEntityType(payload.entityType)) {
    return NextResponse.json({ success: false, error: 'Valid entityId and entityType are required' }, { status: 400 })
  }

  const isPublic = await isPublicAIEntity(entityId, payload.entityType)
  const hasOwnerAccess = await canAccessAIEntity(entityId, payload.entityType, identity)
  if (!isPublic && !hasOwnerAccess) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  try {
    const report = await getInvestmentReport(entityId, payload.entityType, {
      forceRefresh: payload.forceRefresh === true,
      requestedBy: identity.userId,
    })
    if (!report) {
      return NextResponse.json({ success: false, error: 'Not found or insufficient data' }, { status: 404 })
    }
    return NextResponse.json(
      { success: true, data: report },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    )
  } catch (error) {
    console.error('[POST /api/ai/investment] request failed', error)
    return NextResponse.json({ success: false, error: 'AIIndex service temporarily unavailable' }, { status: 500 })
  }
}
