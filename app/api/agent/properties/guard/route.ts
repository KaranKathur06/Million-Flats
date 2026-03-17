import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canCreateListing, normalizePlan, normalizeSubscriptionStatus } from '@/lib/subscriptionPlans'

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

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      agent: {
        select: {
          id: true,
          status: true,
          subscription: {
            select: { plan: true, status: true },
          },
          _count: {
            select: {
              manualProperties: {
                where: { status: { in: ['DRAFT', 'PENDING_REVIEW', 'APPROVED'] as any[] } },
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

  const { agent } = user

  // ── Gate 1: Agent must be APPROVED ──
  if (agent.status !== 'APPROVED') {
    const statusMessages: Record<string, string> = {
      REGISTERED: 'Please verify your email to continue.',
      EMAIL_VERIFIED: 'Please complete your onboarding.',
      PROFILE_INCOMPLETE: 'Please complete your agent profile before listing properties.',
      PROFILE_COMPLETED: 'Please upload your verification documents.',
      DOCUMENTS_UPLOADED: 'Your documents are awaiting review. You can list properties once approved.',
      UNDER_REVIEW: 'Your profile is under review. You can list properties once approved.',
      REJECTED: 'Your application was rejected. Contact support to resolve this.',
      SUSPENDED: 'Your account is suspended. Contact support.',
    }
    return NextResponse.json({
      allowed: false,
      reason: statusMessages[agent.status as string] ?? 'Account not approved.',
      code: 'NOT_APPROVED',
      agentStatus: agent.status,
    }, { status: 403 })
  }

  // ── Gate 2: Subscription check ──
  const plan = normalizePlan(agent.subscription?.plan)
  const subStatus = normalizeSubscriptionStatus(agent.subscription?.status)
  const currentCount = agent._count.manualProperties

  const { allowed, reason } = canCreateListing(plan, subStatus, currentCount)

  if (!allowed) {
    return NextResponse.json({
      allowed: false,
      reason,
      code: 'SUBSCRIPTION_LIMIT',
      plan,
      currentCount,
    }, { status: 403 })
  }

  return NextResponse.json({ allowed: true, plan, currentCount })
}
