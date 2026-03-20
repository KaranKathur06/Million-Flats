/**
 * Subscription Middleware
 * 
 * Enforces plan-based feature access control for agents.
 * Used to gate features like listings, leads, analytics, etc.
 */

import { prisma } from '@/lib/prisma'
import { PLAN_LIMITS, normalizePlan, normalizeSubscriptionStatus, SubscriptionPlan, SubscriptionStatus } from '@/lib/subscriptionPlans'

export interface SubscriptionCheck {
  hasActiveSubscription: boolean
  plan: SubscriptionPlan
  status: SubscriptionStatus
  listingsLimit: number | null
  listingsUsed: number
  featuredLimit: number | null
  featuredUsed: number
  canCreateListing: boolean
  canFeatureListing: boolean
  hasAnalyticsAccess: boolean
  verixAccessLevel: number
  daysRemaining: number | null
  endDate: Date | null
}

/**
 * Get subscription status for an agent
 * 
 * @param agentId Agent ID
 * @returns Subscription check result
 */
export async function getSubscriptionStatus(agentId: string): Promise<SubscriptionCheck> {
  // Get subscription and usage counts
  const [subscription, listingCount, featuredCount] = await Promise.all([
    (prisma as any).agentSubscription.findUnique({
      where: { agentId },
      select: {
        id: true,
        plan: true,
        status: true,
        endDate: true,
        listingsLimit: true,
        featuredLimit: true,
        verixAccessLevel: true,
      },
    }),
    (prisma as any).manualProperty.count({
      where: {
        agentId,
        status: { in: ['DRAFT', 'PENDING_REVIEW', 'APPROVED'] },
      },
    }),
    (prisma as any).manualProperty.count({
      where: {
        agentId,
        isFeatured: true,
        status: 'APPROVED',
      },
    }),
  ])

  const plan = normalizePlan(subscription?.plan)
  const status = normalizeSubscriptionStatus(subscription?.status)
  const planLimits = PLAN_LIMITS[plan]

  // Calculate days remaining
  let daysRemaining: number | null = null
  if (subscription?.endDate) {
    const now = new Date()
    const end = new Date(subscription.endDate)
    const diff = end.getTime() - now.getTime()
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  // Check if subscription is active
  const hasActiveSubscription = status === 'ACTIVE' || status === 'TRIAL'

  // Determine limits (use subscription overrides or plan defaults)
  const listingsLimit = subscription?.listingsLimit ?? planLimits.listingLimit
  const featuredLimit = subscription?.featuredLimit ?? planLimits.featuredLimit

  // Check if can create/feature listings
  const canCreateListing = hasActiveSubscription && 
    (listingsLimit === null || listingCount < listingsLimit)

  const canFeatureListing = hasActiveSubscription &&
    (featuredLimit === null || featuredCount < featuredLimit)

  return {
    hasActiveSubscription,
    plan,
    status,
    listingsLimit,
    listingsUsed: listingCount,
    featuredLimit,
    featuredUsed: featuredCount,
    canCreateListing,
    canFeatureListing,
    hasAnalyticsAccess: planLimits.analyticsAccess,
    verixAccessLevel: subscription?.verixAccessLevel ?? planLimits.verixAccessLevel,
    daysRemaining,
    endDate: subscription?.endDate || null,
  }
}

/**
 * Check if agent can create a new listing
 * 
 * @param agentId Agent ID
 * @returns { allowed: boolean, reason?: string }
 */
export async function checkListingLimit(agentId: string): Promise<{ allowed: boolean; reason?: string; currentCount?: number; limit?: number | null }> {
  const status = await getSubscriptionStatus(agentId)

  if (!status.hasActiveSubscription) {
    return {
      allowed: false,
      reason: 'Your subscription has expired. Please renew to create listings.',
    }
  }

  if (!status.canCreateListing) {
    return {
      allowed: false,
      reason: `You have reached the listing limit of ${status.listingsLimit} for your ${status.plan} plan. Upgrade to list more properties.`,
      currentCount: status.listingsUsed,
      limit: status.listingsLimit,
    }
  }

  return { allowed: true }
}

/**
 * Check if agent can feature a listing
 * 
 * @param agentId Agent ID
 * @returns { allowed: boolean, reason?: string }
 */
export async function checkFeaturedLimit(agentId: string): Promise<{ allowed: boolean; reason?: string; currentCount?: number; limit?: number | null }> {
  const status = await getSubscriptionStatus(agentId)

  if (!status.hasActiveSubscription) {
    return {
      allowed: false,
      reason: 'Your subscription has expired. Please renew to feature listings.',
    }
  }

  if (!status.canFeatureListing) {
    return {
      allowed: false,
      reason: `You have reached the featured listing limit of ${status.featuredLimit} for your ${status.plan} plan. Upgrade for more featured slots.`,
      currentCount: status.featuredUsed,
      limit: status.featuredLimit,
    }
  }

  return { allowed: true }
}

/**
 * Check if agent has analytics access
 * 
 * @param agentId Agent ID
 * @returns boolean
 */
export async function hasAnalyticsAccess(agentId: string): Promise<boolean> {
  const status = await getSubscriptionStatus(agentId)
  return status.hasActiveSubscription && status.hasAnalyticsAccess
}

/**
 * Check if agent has Verix access at required level
 * 
 * @param agentId Agent ID
 * @param requiredLevel Minimum required level (0=none, 1=basic, 2=full)
 * @returns boolean
 */
export async function hasVerixAccess(agentId: string, requiredLevel: number): Promise<boolean> {
  const status = await getSubscriptionStatus(agentId)
  return status.hasActiveSubscription && status.verixAccessLevel >= requiredLevel
}

/**
 * Get subscription summary for display
 * 
 * @param agentId Agent ID
 * @returns Formatted subscription summary
 */
export async function getSubscriptionSummary(agentId: string): Promise<{
  plan: string
  status: string
  listings: { used: number; limit: number | null }
  featured: { used: number; limit: number | null }
  daysRemaining: number | null
  features: {
    analytics: boolean
    verixLevel: number
    leadPriority: string
  }
}> {
  const status = await getSubscriptionStatus(agentId)
  const planLimits = PLAN_LIMITS[status.plan]

  return {
    plan: status.plan,
    status: status.status,
    listings: {
      used: status.listingsUsed,
      limit: status.listingsLimit,
    },
    featured: {
      used: status.featuredUsed,
      limit: status.featuredLimit,
    },
    daysRemaining: status.daysRemaining,
    features: {
      analytics: status.hasAnalyticsAccess,
      verixLevel: status.verixAccessLevel,
      leadPriority: planLimits.leadPriority,
    },
  }
}

/**
 * Expire subscriptions that have passed their end date
 * Called by cron job or scheduled task
 */
export async function expireSubscriptions(): Promise<number> {
  const now = new Date()

  const result = await (prisma as any).agentSubscription.updateMany({
    where: {
      status: { in: ['ACTIVE', 'TRIAL'] },
      endDate: { lt: now },
    },
    data: {
      status: 'EXPIRED',
    },
  })

  return result.count
}

/**
 * Send expiry notifications for subscriptions expiring soon
 * Called by cron job
 */
export async function getExpiringSubscriptions(daysThreshold: number = 7): Promise<Array<{
  agentId: string
  email: string
  plan: string
  endDate: Date
  daysRemaining: number
}>> {
  const now = new Date()
  const threshold = new Date(now)
  threshold.setDate(threshold.getDate() + daysThreshold)

  const subscriptions = await (prisma as any).agentSubscription.findMany({
    where: {
      status: { in: ['ACTIVE', 'TRIAL'] },
      endDate: {
        gte: now,
        lte: threshold,
      },
    },
    include: {
      agent: {
        include: {
          user: {
            select: { email: true },
          },
        },
      },
    },
  })

  return subscriptions.map((sub: any) => {
    const endDate = new Date(sub.endDate)
    const diff = endDate.getTime() - now.getTime()
    const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24))

    return {
      agentId: sub.agentId,
      email: sub.agent.user.email,
      plan: sub.plan,
      endDate,
      daysRemaining,
    }
  })
}
