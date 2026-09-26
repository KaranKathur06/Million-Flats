import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MANUAL_PROPERTY_PUBLIC_STATUS } from '@/lib/manualPropertyLifecycle'
import { buildAgentPropertyGuardPayload } from '@/lib/agentPropertyGuard'

/**
 * POST /api/agent/properties/guard
 *
 * Pre-flight check before property creation. The frontend calls this to get a clear
 * allow/deny decision with a user-facing reason before rendering the form.
 *
 * Returns:
 *   { allowed: true }  — agent may proceed to create a property
 *   { allowed: false, reason: string, code: string }  — show a gate UI
 */

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ allowed: false, reason: 'Not authenticated.', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  const user: any = await (prisma as any).user.findUnique({
    where: { email: session.user.email },
    select: {
      agent: {
        select: {
          id: true,
          status: true,
          approved: true,
          profileStatus: true,
          verificationStatus: true,
          documentsRequiredAt: true,
          subscription: {
            select: { plan: true, status: true },
          },
          _count: {
            select: {
              manualProperties: {
                where: { status: { in: ['DRAFT', 'PENDING_REVIEW', MANUAL_PROPERTY_PUBLIC_STATUS] as any[] } },
              },
            },
          },
        },
      },
    },
  })

  if (!user?.agent) {
    return NextResponse.json({ allowed: false, reason: 'Agent profile not found.', code: 'NO_AGENT' }, { status: 403 })
  }

  const result = buildAgentPropertyGuardPayload({ agent: user.agent })
  if (result.allowed) {
    return NextResponse.json(result)
  }

  return NextResponse.json(result, { status: 403 })
}
