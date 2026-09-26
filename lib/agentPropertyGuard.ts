import { canCreateListing, normalizePlan, normalizeSubscriptionStatus } from '@/lib/subscriptionPlans'
import { getAgentVerificationPolicy } from '@/lib/verification/verificationPolicy'
import { resolveAgentStatus } from '@/lib/agentLifecycle'

export function buildAgentPropertyGuardPayload(args: {
  agent: {
    status?: unknown
    approved?: unknown
    profileStatus?: unknown
    verificationStatus?: string | null | undefined
    documentsRequiredAt?: Date | null
    subscription?: { plan?: unknown; status?: unknown } | null
    _count?: { manualProperties?: number } | null
  }
}) {
  const { agent } = args
  const effectiveStatus = resolveAgentStatus(agent)
  const normalizedVerificationStatus = typeof agent.verificationStatus === 'string' && agent.verificationStatus.trim().length > 0 ? agent.verificationStatus : null
  const verificationPolicy = getAgentVerificationPolicy({
    status: effectiveStatus,
    verificationStatus: normalizedVerificationStatus,
    documentsRequiredAt: agent.documentsRequiredAt ?? null,
  })

  const statusMessages: Record<string, string> = {
    REGISTERED: 'Please verify your email to continue.',
    EMAIL_VERIFIED: 'Your email is verified. You can create and publish properties.',
    PROFILE_INCOMPLETE: 'Please complete your agent profile before listing properties.',
    PROFILE_COMPLETED: 'Your email is verified. You can create and publish properties.',
    DOCUMENTS_UPLOADED: 'Your documents are under review. Listing remains available.',
    UNDER_REVIEW: 'Your documents are under review. Listing remains available.',
    REJECTED: 'Your application was rejected. Contact support to resolve this.',
    SUSPENDED: 'Your account is suspended. Contact support.',
  }

  if (effectiveStatus === 'SUSPENDED' || effectiveStatus === 'REJECTED' || effectiveStatus === 'REGISTERED') {
    return {
      allowed: false,
      reason: statusMessages[effectiveStatus] ?? 'Account not approved.',
      code: 'NOT_APPROVED',
      agentStatus: effectiveStatus,
      verificationPolicy,
    }
  }

  const plan = normalizePlan(agent.subscription?.plan)
  const subStatus = normalizeSubscriptionStatus(agent.subscription?.status)
  const currentCount = agent._count?.manualProperties ?? 0

  const listingCheck = canCreateListing(plan, subStatus, currentCount)
  if (!listingCheck.allowed) {
    return {
      allowed: false,
      reason: listingCheck.reason,
      code: 'SUBSCRIPTION_LIMIT',
      plan,
      currentCount,
      agentStatus: effectiveStatus,
      verificationPolicy,
    }
  }

  return {
    allowed: true,
    plan,
    currentCount,
    agentStatus: effectiveStatus,
    verificationPolicy,
  }
}
