import { NextRequest, NextResponse } from 'next/server'
import { analyzeMedia } from '@/lib/ai-core'
import type { EntityType } from '@/lib/ai-core'
import { fetchPublicRemoteAsset, RemoteAssetError } from '@/lib/ai/remoteAssets'
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

export async function POST(req: NextRequest) {
  const identity = await resolveAIRequestIdentity()
  const identityError = identityErrorResponse(identity)
  if (identityError) return identityError

  const limited = await enforceAnonymousAIBudget(req, identity, 'aiview', 5)
  if (limited) return limited

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

  const payload = body.value as {
    entityId?: unknown
    entityType?: unknown
    imageUrls?: unknown
    forceRefresh?: unknown
  }
  const entityId = typeof payload.entityId === 'string' ? payload.entityId.trim() : ''
  if (!entityId || entityId.length > 200 || !isEntityType(payload.entityType)) {
    return NextResponse.json({ success: false, error: 'Valid entityId and entityType are required' }, { status: 400 })
  }
  if (!Array.isArray(payload.imageUrls) || payload.imageUrls.length === 0 || payload.imageUrls.length > 10) {
    return NextResponse.json({ success: false, error: 'Provide between 1 and 10 image URLs' }, { status: 400 })
  }
  if (payload.imageUrls.some((value) => typeof value !== 'string' || value.length > 2048 || !value.trim())) {
    return NextResponse.json({ success: false, error: 'Each image URL must be a valid non-empty string under 2048 characters' }, { status: 400 })
  }

  const imageUrls = Array.from(new Set((payload.imageUrls as string[]).map((value) => value.trim())))
  const isPublic = await isPublicAIEntity(entityId, payload.entityType)
  const hasOwnerAccess = identity.kind === 'authenticated' &&
    await canAccessAIEntity(entityId, payload.entityType, identity)
  if (!isPublic && !hasOwnerAccess) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }
  if (payload.forceRefresh === true && !hasOwnerAccess) {
    return NextResponse.json({ success: false, error: 'forceRefresh requires owner or admin access' }, { status: 400 })
  }

  try {
    const assets = await Promise.all(
      imageUrls.map(async (url) => [url, await fetchPublicRemoteAsset(url, 'image')] as const),
    )
    const safeImageContents = Object.fromEntries(
      assets.map(([url, asset]) => [
        url,
        { contentType: asset.contentType, base64: asset.data.toString('base64') },
      ]),
    )

    const report = await analyzeMedia(entityId, payload.entityType, imageUrls, {
      forceRefresh: payload.forceRefresh === true,
      requestedBy: identity.kind === 'authenticated' ? identity.userId : 'anonymous',
      safeImageContents,
    })
    if (!report) return NextResponse.json({ success: false, error: 'No images to analyze' }, { status: 404 })

    return NextResponse.json(
      { success: true, data: report },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    )
  } catch (error) {
    if (error instanceof RemoteAssetError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }
    console.error('[POST /api/ai/vision] request failed', error instanceof Error ? error.name : 'unknown error')
    return NextResponse.json({ success: false, error: 'AIView service temporarily unavailable' }, { status: 500 })
  }
}
