import { createHash } from 'node:crypto'
import { isIP } from 'node:net'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRedis } from '@/lib/redis'
import type { EntityType } from '@/lib/ai-core/types'

export type AIRequestIdentity =
  | { kind: 'anonymous' }
  | { kind: 'authenticated'; userId: string; email: string; role: string }
  | { kind: 'error'; status: number; message: string }

export async function resolveAIRequestIdentity(): Promise<AIRequestIdentity> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return { kind: 'anonymous' }

    const email = String((session.user as { email?: string }).email || '').trim().toLowerCase()
    if (!email) return { kind: 'error', status: 401, message: 'Unauthorized' }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, status: true },
    })
    if (!user) return { kind: 'error', status: 401, message: 'Unauthorized' }
    if (user.status !== 'ACTIVE') {
      return { kind: 'error', status: 403, message: 'Account unavailable' }
    }

    return {
      kind: 'authenticated',
      userId: user.id,
      email: user.email,
      role: String(user.role).toUpperCase(),
    }
  } catch (error) {
    console.error('[ai-access] failed to resolve request identity', error)
    return { kind: 'error', status: 503, message: 'Authentication service unavailable' }
  }
}

export function isAIAdministrator(identity: AIRequestIdentity): boolean {
  return identity.kind === 'authenticated' &&
    (identity.role === 'ADMIN' || identity.role === 'SUPERADMIN')
}

export function identityErrorResponse(identity: AIRequestIdentity): NextResponse | null {
  if (identity.kind !== 'error') return null
  return NextResponse.json({ success: false, error: identity.message }, { status: identity.status })
}

function getTrustedClientIp(req: Request): string | null {
  const value = req.headers.get('x-real-ip')?.trim()
  if (!value || value.includes(',') || !isIP(value)) return null
  return value
}

export async function enforceAnonymousAIBudget(
  req: Request,
  identity: AIRequestIdentity,
  engine: string,
  limit: number,
): Promise<NextResponse | null> {
  if (identity.kind === 'authenticated') return null
  if (identity.kind === 'error') return identityErrorResponse(identity)

  const ip = getTrustedClientIp(req)
  if (!ip) {
    return NextResponse.json(
      { success: false, error: 'Trusted client IP unavailable' },
      { status: 503 },
    )
  }

  const redis = getRedis()
  if (!redis) {
    if (process.env.NODE_ENV !== 'production') return null
    return NextResponse.json(
      { success: false, error: 'Rate-limit service unavailable' },
      { status: 503 },
    )
  }

  const ipHash = createHash('sha256').update(ip).digest('hex')
  const key = `public-ai:${engine}:${ipHash}`
  try {
    const count = Number(await redis.eval(
      "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return n",
      1,
      key,
      60,
    ))
    if (count <= limit) return null

    return NextResponse.json(
      { success: false, error: 'Request limit exceeded' },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  } catch (error) {
    console.error(`[ai-access] ${engine} rate-limit check failed`, error)
    return NextResponse.json(
      { success: false, error: 'Rate-limit service unavailable' },
      { status: 503 },
    )
  }
}

export async function canAccessAIEntity(
  entityId: string,
  entityType: EntityType,
  identity: AIRequestIdentity,
): Promise<boolean> {
  if (identity.kind !== 'authenticated') return false
  if (isAIAdministrator(identity)) return true

  if (entityType === 'PROJECT') {
    const project = await prisma.project.findUnique({
      where: { id: entityId },
      select: {
        status: true,
        isDeleted: true,
        ownedByProfile: { select: { userId: true } },
      },
    })
    return project?.ownedByProfile?.userId === identity.userId
  }

  const property = await prisma.manualProperty.findUnique({
    where: { id: entityId },
    select: { agent: { select: { userId: true } } },
  })
  return property?.agent.userId === identity.userId
}

export async function isPublicAIEntity(
  entityId: string,
  entityType: EntityType,
): Promise<boolean> {
  if (entityType === 'PROJECT') {
    const project = await prisma.project.findUnique({
      where: { id: entityId },
      select: { status: true, isDeleted: true },
    })
    return Boolean(project && project.status === 'PUBLISHED' && !project.isDeleted)
  }

  const property = await prisma.manualProperty.findUnique({
    where: { id: entityId },
    select: {
      sourceType: true,
      status: true,
      archivedAt: true,
      agent: {
        select: {
          approved: true,
          archivedAt: true,
          user: { select: { status: true } },
        },
      },
    },
  })
  return Boolean(
    property &&
    property.sourceType === 'MANUAL' &&
    property.status === 'PUBLISHED' &&
    !property.archivedAt &&
    property.agent.approved &&
    !property.agent.archivedAt &&
    property.agent.user.status === 'ACTIVE',
  )
}

export function canAccessPrivateAIEntity(identity: AIRequestIdentity, isOwner: boolean): boolean {
  return isAIAdministrator(identity) || (identity.kind === 'authenticated' && isOwner)
}

export async function readLimitedJson(
  req: Request,
  maxBytes = 1_048_576,
): Promise<{ ok: true; value: unknown } | { ok: false; tooLarge: boolean }> {
  const declaredLength = Number(req.headers.get('content-length') || 0)
  if (declaredLength > maxBytes) return { ok: false, tooLarge: true }

  const reader = req.body?.getReader()
  if (!reader) return { ok: false, tooLarge: false }

  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      return { ok: false, tooLarge: true }
    }
    chunks.push(value)
  }

  try {
    const text = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8')
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false, tooLarge: false }
  }
}

export async function requirePublicOrAuthorizedAIEntity(
  entityId: string,
  entityType: EntityType,
  identity: AIRequestIdentity,
): Promise<boolean> {
  if (await isPublicAIEntity(entityId, entityType)) return true
  return canAccessPrivateAIEntity(
    identity,
    await canAccessAIEntity(entityId, entityType, identity),
  )
}
