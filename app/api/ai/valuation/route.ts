import { NextResponse } from 'next/server'
import { getValuationReport } from '@/lib/ai-core'
import type { EntityType } from '@/lib/ai-core'
import {
  type AIRequestIdentity,
  canAccessAIEntity,
  identityErrorResponse,
  isAIAdministrator,
  isPublicAIEntity,
  readLimitedJson,
  resolveAIRequestIdentity,
} from '@/lib/ai/publicAccess'

export const dynamic = 'force-dynamic'

function isEntityType(value: unknown): value is EntityType {
  return value === 'MANUAL_PROPERTY' || value === 'PROJECT'
}

async function authorizeEntity(entityId: string, entityType: EntityType, identity: AIRequestIdentity) {
  if (await isPublicAIEntity(entityId, entityType)) return true
  return canAccessAIEntity(entityId, entityType, identity)
}

export async function POST(req: Request) {
  const identity = await resolveAIRequestIdentity()
  const identityError = identityErrorResponse(identity)
  if (identityError) return identityError
  if (identity.kind !== 'authenticated') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const parsed = await readLimitedJson(req)
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.tooLarge ? 'Request body exceeds 1 MB' : 'Invalid JSON body' },
      { status: parsed.tooLarge ? 413 : 400 },
    )
  }
  const body = parsed.value
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { entityId, entityType, forceRefresh } = body as Record<string, unknown>

  if (typeof entityId !== 'string' || !entityId.trim() || !isEntityType(entityType)) {
    return NextResponse.json({ error: 'Valid entityId and entityType are required' }, { status: 400 })
  }
  if (!(await authorizeEntity(entityId, entityType, identity))) {
    return NextResponse.json({ error: 'Entity unavailable' }, { status: 404 })
  }
  if (forceRefresh === true && !isAIAdministrator(identity)) {
    const ownsEntity = await canAccessAIEntity(entityId, entityType, identity)
    if (!ownsEntity) {
      return NextResponse.json({ error: 'Force refresh is restricted to the entity owner or an administrator' }, { status: 403 })
    }
  }

  try {
    const report = await getValuationReport(entityId, entityType, {
      forceRefresh: forceRefresh === true,
      requestedBy: identity.userId,
    })
    if (!report) {
      return NextResponse.json({ error: 'Entity not found or insufficient data for valuation' }, { status: 404 })
    }

    const response = NextResponse.json({ success: true, data: report })
    response.headers.set('Cache-Control', 'private, no-store, max-age=0')
    response.headers.set('X-AI-Model', report.modelName)
    response.headers.set('X-AI-Version', report.modelVersion)
    response.headers.set('X-Cache-Hit', String(report.cacheHit))
    return response
  } catch (error) {
    console.error('[API /ai/valuation] valuation failed', error)
    return NextResponse.json({ error: 'Valuation service temporarily unavailable' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const identity = await resolveAIRequestIdentity()
  const identityError = identityErrorResponse(identity)
  if (identityError) return identityError
  if (identity.kind !== 'authenticated') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const entityId = searchParams.get('entityId')
  const entityType = searchParams.get('entityType')
  const forceRefresh = searchParams.get('forceRefresh') === 'true'
  if (!entityId || !isEntityType(entityType)) {
    return NextResponse.json({ error: 'Valid entityId and entityType query parameters are required' }, { status: 400 })
  }
  if (!(await authorizeEntity(entityId, entityType, identity))) {
    return NextResponse.json({ error: 'Entity unavailable' }, { status: 404 })
  }
  if (forceRefresh === true && !isAIAdministrator(identity)) {
    const ownsEntity = await canAccessAIEntity(entityId, entityType, identity)
    if (!ownsEntity) {
      return NextResponse.json({ error: 'Force refresh is restricted to the entity owner or an administrator' }, { status: 403 })
    }
  }

  try {
    const report = await getValuationReport(entityId, entityType, {
      forceRefresh,
      requestedBy: identity.userId,
    })
    if (!report) {
      return NextResponse.json({ error: 'Entity not found or insufficient data' }, { status: 404 })
    }
    const response = NextResponse.json({ success: true, data: report })
    response.headers.set('Cache-Control', 'private, no-store, max-age=0')
    return response
  } catch (error) {
    console.error('[API /ai/valuation] report lookup failed', error)
    return NextResponse.json({ error: 'Valuation service temporarily unavailable' }, { status: 500 })
  }
}
