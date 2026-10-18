// ━━━ AIShield API Route ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/AIshield/[propertyId]
// Query params: ?type=MANUAL_PROPERTY|PROJECT

import { NextResponse } from 'next/server'
import { orchestrate } from '@/lib/verixshield'
import type { EntityType } from '@/lib/verixshield'
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
  { params }: { params: { propertyId: string } }
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

    // Run orchestrator
    const result = await orchestrate(propertyId, entityType)

    const duration = Date.now() - startTime

    // Add performance header
    const response = NextResponse.json(result, { status: 200 })
    // Legacy headers (backward compat)
    response.headers.set('X-AIShield-Duration', `${duration}ms`)
    response.headers.set('X-AIShield-Version', result.meta.modelVersion)
    response.headers.set('X-AIShield-Cached', result.meta.cached ? 'true' : 'false')
    // New AI-branded headers
    response.headers.set('X-AIShield-Duration', `${duration}ms`)
    response.headers.set('X-AIShield-Version', result.meta.modelVersion)
    response.headers.set('X-AIShield-Cached', result.meta.cached ? 'true' : 'false')

    // Cache control
    response.headers.set('Cache-Control', 'private, no-store, max-age=0')

    return response
  } catch (error: any) {
    console.error('[AIShield:API] Error:', error)

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Property not found', propertyId: params.propertyId },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
