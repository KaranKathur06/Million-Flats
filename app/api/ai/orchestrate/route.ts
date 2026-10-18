import { NextResponse } from 'next/server'
import { orchestrateProperty } from '@/lib/ai-core'
import type { AIModule, EntityType } from '@/lib/ai-core'
import {
  identityErrorResponse,
  isPublicAIEntity,
  readLimitedJson,
  resolveAIRequestIdentity,
  canAccessAIEntity,
} from '@/lib/ai/publicAccess'

export const dynamic = 'force-dynamic'

function isEntityType(value: unknown): value is EntityType {
  return value === 'MANUAL_PROPERTY' || value === 'PROJECT'
}

const validModules: AIModule[] = ['SHIELD', 'INDEX', 'MARKET', 'RISK', 'VIEW', 'TITLE']

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
  const { entityId, entityType, modules, forceRefresh } = body as Record<string, unknown>
  if (typeof entityId !== 'string' || !entityId.trim() || !isEntityType(entityType)) {
    return NextResponse.json({ error: 'Valid entityId and entityType are required' }, { status: 400 })
  }
  if (!(await isPublicAIEntity(entityId, entityType)) &&
      !(await canAccessAIEntity(entityId, entityType, identity))) {
    return NextResponse.json({ error: 'Entity unavailable' }, { status: 404 })
  }

  const requestedModules: AIModule[] = Array.isArray(modules)
    ? modules.filter((module): module is AIModule =>
      typeof module === 'string' && validModules.includes(module as AIModule))
    : ['SHIELD', 'INDEX', 'MARKET', 'RISK']

  try {
    const bundle = await orchestrateProperty(entityId, entityType, {
      modules: requestedModules,
      forceRefresh: forceRefresh === true,
      requestedBy: identity.userId,
    })
    const response = NextResponse.json({ success: true, data: bundle })
    response.headers.set('Cache-Control', 'private, no-store, max-age=0')
    return response
  } catch (error) {
    console.error('[API /ai/orchestrate] orchestration failed', error)
    return NextResponse.json({ error: 'AI service temporarily unavailable' }, { status: 500 })
  }
}
