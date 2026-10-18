// ━━━ AIShield v2.1 API Route ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/AIshield/v2/[propertyId]?type=MANUAL_PROPERTY|PROJECT
// Returns the full v2.1 intelligence engine response

import { NextResponse } from 'next/server'
import { orchestrateV2 } from '@/lib/verixshield/services'
import type { EntityType } from '@/lib/verixshield/types-v2'
import {
  canAccessAIEntity,
  identityErrorResponse,
  isPublicAIEntity,
  resolveAIRequestIdentity,
} from '@/lib/ai/publicAccess'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(
  request: Request,
  { params }: { params: { propertyId: string } },
) {
  const identity = await resolveAIRequestIdentity()
  const identityError = identityErrorResponse(identity)
  if (identityError) return identityError
  if (identity.kind !== 'authenticated') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { propertyId } = params
  if (!propertyId) {
    return NextResponse.json({ error: 'Missing propertyId parameter' }, { status: 400 })
  }

  const url = new URL(request.url)
  const entityTypeParam = url.searchParams.get('type') || 'MANUAL_PROPERTY'
  if (entityTypeParam !== 'PROJECT' && entityTypeParam !== 'MANUAL_PROPERTY') {
    return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
  }
  const entityType: EntityType = entityTypeParam
  if (!(await isPublicAIEntity(propertyId, entityType)) &&
      !(await canAccessAIEntity(propertyId, entityType, identity))) {
    return NextResponse.json({ error: 'Entity unavailable' }, { status: 404 })
  }

  try {
    const startTime = Date.now()
    const result = await orchestrateV2(propertyId, entityType)
    const duration = Date.now() - startTime

    const response = NextResponse.json(result, { status: 200 })
    // Legacy headers (backward compat)
    response.headers.set('X-AIShield-Duration', `${duration}ms`)
    response.headers.set('X-AIShield-Version', result.meta.modelVersion)
    response.headers.set('X-AIShield-Cached', result.meta.cached ? 'true' : 'false')
    // New AI-branded headers
    response.headers.set('X-AIShield-Duration', `${duration}ms`)
    response.headers.set('X-AIShield-Version', result.meta.modelVersion)
    response.headers.set('X-AIShield-Cached', result.meta.cached ? 'true' : 'false')
    response.headers.set(
      'Cache-Control',
      'private, no-store, max-age=0',
    )

    return response
  } catch (error: any) {
    console.error('[AIShield:v2.1:API] Error:', error)

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Property not found', propertyId: params.propertyId },
        { status: 404 },
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
