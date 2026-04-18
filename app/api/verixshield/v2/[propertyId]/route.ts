// ━━━ VerixShield v2.1 API Route ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/verixshield/v2/[propertyId]?type=MANUAL_PROPERTY|PROJECT
// Returns the full v2.1 intelligence engine response

import { NextResponse } from 'next/server'
import { orchestrateV2 } from '@/lib/verixshield/services'
import type { EntityType } from '@/lib/verixshield/types-v2'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(
  request: Request,
  { params }: { params: { propertyId: string } },
) {
  try {
    const { propertyId } = params

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Missing propertyId parameter' },
        { status: 400 },
      )
    }

    const url = new URL(request.url)
    const entityTypeParam = url.searchParams.get('type') || 'MANUAL_PROPERTY'
    const entityType: EntityType =
      entityTypeParam === 'PROJECT' ? 'PROJECT' : 'MANUAL_PROPERTY'

    const startTime = Date.now()
    const result = await orchestrateV2(propertyId, entityType)
    const duration = Date.now() - startTime

    const response = NextResponse.json(result, { status: 200 })
    response.headers.set('X-VerixShield-Duration', `${duration}ms`)
    response.headers.set('X-VerixShield-Version', result.meta.modelVersion)
    response.headers.set('X-VerixShield-Cached', result.meta.cached ? 'true' : 'false')
    response.headers.set(
      'Cache-Control',
      'private, s-maxage=300, stale-while-revalidate=600',
    )

    return response
  } catch (error: any) {
    console.error('[VerixShield:v2.1:API] Error:', error)

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Property not found', propertyId: params.propertyId },
        { status: 404 },
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message || 'Unknown error' },
      { status: 500 },
    )
  }
}
