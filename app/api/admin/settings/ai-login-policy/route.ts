import { isIP } from 'node:net'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { getServerSession, type Session } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveAiLoginRequired } from '@/lib/auth/ai-login-policy'

const SETTING_ID = 'AI_SYSTEM_LOGIN_REQUIRED'
const EXPECTED_SCOPE = 'SIX_APPROVED_AI_INFORMATION_PAGES'

const updateSchema = z
  .object({
    loginRequired: z.boolean(),
    expectedVersion: z.number().int().nonnegative(),
  })
  .strict()

class PolicyVersionConflict extends Error {}

type PolicyTransaction = Prisma.TransactionClient

function isPrismaConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  const code = error.code
  return code === 'P2002' || code === 'P2034'
}

function isAdminRole(role: string): boolean {
  return ['ADMIN', 'SUPERADMIN', 'MODERATOR', 'VERIFIER'].includes(role)
}

function getActor(session: Session | null) {
  const user = session?.user as
    | { id?: unknown; role?: unknown }
    | undefined
  const role = typeof user?.role === 'string' ? user.role.toUpperCase() : ''
  const id = typeof user?.id === 'string' ? user.id : ''

  return { id, role }
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false

  try {
    const requestUrl = new URL(request.url)
    const host =
      request.headers.get('x-forwarded-host') ??
      request.headers.get('host')
    const forwardedProtocol = request.headers.get('x-forwarded-proto')?.trim()
    const protocol = forwardedProtocol || requestUrl.protocol.slice(0, -1)

    if (
      !host ||
      host.includes(',') ||
      protocol.includes(',') ||
      !['http', 'https'].includes(protocol)
    ) {
      return false
    }

    return new URL(origin).origin === new URL(`${protocol}://${host}`).origin
  } catch {
    return false
  }
}

function getClientIp(request: Request): string | null {
  const candidate = request.headers.get('x-real-ip')?.trim()
  return candidate && isIP(candidate) ? candidate : null
}

function getCorrelationId(request: Request): string | null {
  const id = request.headers.get('x-correlation-id') ?? request.headers.get('x-request-id')
  return id?.trim().slice(0, 128) || null
}

async function loadPolicySnapshot(transaction: PolicyTransaction) {
  const settings = await transaction.authSettings.findUnique({
    where: { id: 'singleton' },
    select: {
      aiInformationLoginRequired: true,
      aiInformationPolicyVersion: true,
    },
  })

  const loginRequired = resolveAiLoginRequired(
    settings?.aiInformationLoginRequired,
  )
  const version = settings?.aiInformationPolicyVersion ?? 0

  if (version === 0) {
    return {
      loginRequired,
      version,
      updatedAt: null,
      updatedBy: null,
    }
  }

  const audit = await transaction.auditLog.findFirst({
    where: {
      entityType: 'SYSTEM_SETTING',
      entityId: SETTING_ID,
      action: 'AI_LOGIN_POLICY_UPDATED',
      meta: {
        path: ['policyVersion'],
        equals: version,
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      performedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  if (!audit) {
    throw new Error('AI login policy audit record is missing')
  }

  const auditMeta =
    audit.meta && typeof audit.meta === 'object' && !Array.isArray(audit.meta)
      ? (audit.meta as Record<string, unknown>)
      : {}

  return {
    loginRequired,
    version,
    updatedAt: audit.createdAt.toISOString(),
    updatedBy: audit.performedBy
      ? {
          id: audit.performedBy.id,
          name: audit.performedBy.name,
          email: audit.performedBy.email,
          role:
            typeof auditMeta.actorRole === 'string'
              ? auditMeta.actorRole
              : null,
        }
      : null,
  }
}

async function getAdminSession() {
  const session = await getServerSession(authOptions)
  const actor = getActor(session)

  if (!session?.user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!isAdminRole(actor.role)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { actor }
}

export async function GET() {
  try {
    const auth = await getAdminSession()
    if ('response' in auth) return auth.response

    const data = await prisma.$transaction(
      (transaction) => loadPolicySnapshot(transaction),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    )

    return NextResponse.json({
      success: true,
      data: { ...data, scope: EXPECTED_SCOPE },
    })
  } catch (error) {
    console.error('[admin/ai-login-policy] GET failed:', error)
    return NextResponse.json(
      { success: false, error: 'Unable to load the AI login policy.' },
      { status: 503 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getAdminSession()
    if ('response' in auth) return auth.response

    if (auth.actor.role !== 'SUPERADMIN') {
      console.warn(
        `[admin/ai-login-policy] Unauthorized policy update attempt by role ${auth.actor.role || 'UNKNOWN'}`,
      )
      return NextResponse.json(
        { success: false, error: 'Only Super Admins can update this policy.' },
        { status: 403 },
      )
    }

    if (!auth.actor.id) {
      return NextResponse.json(
        { success: false, error: 'Unable to identify the administrator.' },
        { status: 401 },
      )
    }

    if (!isSameOrigin(request)) {
      return NextResponse.json(
        { success: false, error: 'Cross-origin requests are not allowed.' },
        { status: 403 },
      )
    }

    const contentLength = Number(request.headers.get('content-length') ?? 0)
    if (Number.isFinite(contentLength) && contentLength > 1024) {
      return NextResponse.json(
        { success: false, error: 'Request body is too large.' },
        { status: 413 },
      )
    }

    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > 1024) {
      return NextResponse.json(
        { success: false, error: 'Request body is too large.' },
        { status: 413 },
      )
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body.' },
        { status: 400 },
      )
    }

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid AI login policy request.' },
        { status: 400 },
      )
    }

    const { loginRequired, expectedVersion } = parsed.data
    const clientIp = getClientIp(request)
    const correlationId = getCorrelationId(request)

    const data = await prisma.$transaction(
      async (transaction) => {
        const current = await transaction.authSettings.findUnique({
          where: { id: 'singleton' },
          select: {
            aiInformationLoginRequired: true,
            aiInformationPolicyVersion: true,
          },
        })
        const currentLoginRequired = resolveAiLoginRequired(
          current?.aiInformationLoginRequired,
        )
        const currentVersion = current?.aiInformationPolicyVersion ?? 0

        if (currentVersion !== expectedVersion) {
          throw new PolicyVersionConflict()
        }

        if (currentLoginRequired === loginRequired) {
          return loadPolicySnapshot(transaction)
        }

        const nextVersion = currentVersion + 1
        if (current) {
          const updated = await transaction.authSettings.updateMany({
            where: {
              id: 'singleton',
              aiInformationPolicyVersion: expectedVersion,
            },
            data: {
              aiInformationLoginRequired: loginRequired,
              aiInformationPolicyVersion: { increment: 1 },
              updatedByUserId: auth.actor.id,
            },
          })

          if (updated.count !== 1) throw new PolicyVersionConflict()
        } else {
          await transaction.authSettings.create({
            data: {
              id: 'singleton',
              aiInformationLoginRequired: loginRequired,
              aiInformationPolicyVersion: nextVersion,
              updatedByUserId: auth.actor.id,
            },
          })
        }

        await transaction.auditLog.create({
          data: {
            entityType: 'SYSTEM_SETTING',
            entityId: SETTING_ID,
            action: 'AI_LOGIN_POLICY_UPDATED',
            performedByUserId: auth.actor.id,
            ipAddress: clientIp,
            beforeState: { loginRequired: currentLoginRequired },
            afterState: { loginRequired, policyVersion: nextVersion },
            meta: {
              settingId: SETTING_ID,
              previousValue: currentLoginRequired,
              newValue: loginRequired,
              policyVersion: nextVersion,
              actorRole: auth.actor.role,
              correlationId,
            },
          },
        })

        return loadPolicySnapshot(transaction)
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )

    return NextResponse.json({
      success: true,
      data: { ...data, scope: EXPECTED_SCOPE },
    })
  } catch (error) {
    if (error instanceof PolicyVersionConflict) {
      return NextResponse.json(
        {
          success: false,
          error: 'The AI login policy changed. Reload the latest setting before retrying.',
        },
        { status: 409 },
      )
    }

    if (isPrismaConflict(error)) {
      return NextResponse.json(
        {
          success: false,
          error: 'The AI login policy changed. Reload the latest setting before retrying.',
        },
        { status: 409 },
      )
    }

    console.error('[admin/ai-login-policy] PATCH failed:', error)
    return NextResponse.json(
      { success: false, error: 'Unable to save the AI login policy.' },
      { status: 500 },
    )
  }
}
