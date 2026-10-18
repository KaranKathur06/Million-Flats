import { NextRequest, NextResponse } from 'next/server'
import { analyzeDocument } from '@/lib/ai-core'
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

const DOCUMENT_TYPES = new Set([
  'TITLE_DEED',
  'RERA_CERTIFICATE',
  'NOC',
  'OQOOD_CONTRACT',
  'SALE_DEED',
  'ENCUMBRANCE_CERTIFICATE',
  'TAX_RECEIPT',
])

function isEntityType(value: unknown): value is EntityType {
  return value === 'MANUAL_PROPERTY' || value === 'PROJECT'
}

export async function POST(req: NextRequest) {
  const identity = await resolveAIRequestIdentity()
  const identityError = identityErrorResponse(identity)
  if (identityError) return identityError

  const limited = await enforceAnonymousAIBudget(req, identity, 'aititle', 5)
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
    documentUrl?: unknown
    documentType?: unknown
    forceRefresh?: unknown
  }
  const entityId = typeof payload.entityId === 'string' ? payload.entityId.trim() : ''
  const documentUrl = typeof payload.documentUrl === 'string' ? payload.documentUrl.trim() : ''
  const documentType = typeof payload.documentType === 'string' ? payload.documentType.trim().toUpperCase() : ''
  if (!entityId || entityId.length > 200 || !isEntityType(payload.entityType)) {
    return NextResponse.json({ success: false, error: 'Valid entityId and entityType are required' }, { status: 400 })
  }
  if (!documentUrl || documentUrl.length > 2048 || !DOCUMENT_TYPES.has(documentType)) {
    return NextResponse.json({ success: false, error: 'A supported document URL and document type are required' }, { status: 400 })
  }

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
    const asset = await fetchPublicRemoteAsset(documentUrl, 'document')
    if (!asset.data.byteLength) {
      return NextResponse.json({ success: false, error: 'The document is empty' }, { status: 400 })
    }

    const report = await analyzeDocument(
      entityId,
      payload.entityType,
      documentUrl,
      documentType,
      {
        requestedBy: identity.kind === 'authenticated' ? identity.userId : 'anonymous',
      },
    )
    if (!report) return NextResponse.json({ success: false, error: 'Analysis failed' }, { status: 500 })

    return NextResponse.json(
      { success: true, data: report },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    )
  } catch (error) {
    if (error instanceof RemoteAssetError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }
    console.error('[POST /api/ai/legal] request failed', error instanceof Error ? error.name : 'unknown error')
    return NextResponse.json({ success: false, error: 'AITitle service temporarily unavailable' }, { status: 500 })
  }
}
