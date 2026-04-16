// ━━━ VerixShield API Route ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/verixshield/[propertyId]
// Query params: ?type=MANUAL_PROPERTY|PROJECT

import { NextResponse } from 'next/server'
import { orchestrate } from '@/lib/verixshield'
import type { EntityType } from '@/lib/verixshield'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(
  request: Request,
  { params }: { params: { propertyId: string } }
) {
  try {
    const { propertyId } = params

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Missing propertyId parameter' },
        { status: 400 }
      )
    }

    // Determine entity type from query params (default to MANUAL_PROPERTY)
    const url = new URL(request.url)
    const entityTypeParam = url.searchParams.get('type') || 'MANUAL_PROPERTY'
    const entityType: EntityType = entityTypeParam === 'PROJECT' ? 'PROJECT' : 'MANUAL_PROPERTY'

    const startTime = Date.now()

    // Run orchestrator
    const result = await orchestrate(propertyId, entityType)

    const duration = Date.now() - startTime

    // Add performance header
    const response = NextResponse.json(result, { status: 200 })
    response.headers.set('X-VerixShield-Duration', `${duration}ms`)
    response.headers.set('X-VerixShield-Version', result.meta.modelVersion)
    response.headers.set('X-VerixShield-Cached', result.meta.cached ? 'true' : 'false')

    // Cache control
    response.headers.set('Cache-Control', 'private, s-maxage=3600, stale-while-revalidate=7200')

    return response
  } catch (error: any) {
    console.error('[VerixShield:API] Error:', error)

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Property not found', propertyId: params.propertyId },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
