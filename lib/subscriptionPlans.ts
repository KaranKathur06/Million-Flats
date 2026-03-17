/**
 * Subscription plan limits and feature gates.
 * All limits are enforced at both the API and UI layers.
 */

export type SubscriptionPlan = 'BASIC' | 'PROFESSIONAL' | 'PREMIUM'
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface PlanLimits {
  plan: SubscriptionPlan
  price: number // in INR per month
  listingLimit: number | null // null = unlimited
  featuredLimit: number | null
  leadPriority: LeadPriority
  analyticsAccess: boolean
  verixAccessLevel: number // 0=none, 1=basic, 2=full
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  BASIC: {
    plan: 'BASIC',
    price: 9999,
    listingLimit: 10,
    featuredLimit: 0,
    leadPriority: 'LOW',
    analyticsAccess: false,
    verixAccessLevel: 0,
  },
  PROFESSIONAL: {
    plan: 'PROFESSIONAL',
    price: 24999,
    listingLimit: 50,
    featuredLimit: 10,
    leadPriority: 'MEDIUM',
    analyticsAccess: true,
    verixAccessLevel: 1,
  },
  PREMIUM: {
    plan: 'PREMIUM',
    price: 49999,
    listingLimit: null, // unlimited
    featuredLimit: null, // unlimited
    leadPriority: 'HIGH',
    analyticsAccess: true,
    verixAccessLevel: 2,
  },
}

export function normalizePlan(input: unknown): SubscriptionPlan {
  const s = String(input || 'BASIC').toUpperCase()
  if (s === 'PREMIUM') return 'PREMIUM'
  if (s === 'PROFESSIONAL') return 'PROFESSIONAL'
  return 'BASIC'
}

export function normalizeSubscriptionStatus(input: unknown): SubscriptionStatus {
  const s = String(input || 'ACTIVE').toUpperCase()
  if (s === 'TRIAL') return 'TRIAL'
  if (s === 'CANCELLED') return 'CANCELLED'
  if (s === 'EXPIRED') return 'EXPIRED'
  return 'ACTIVE'
}

/**
 * Checks if an agent can create a new listing given their current count.
 */
export function canCreateListing(
  plan: SubscriptionPlan,
  status: SubscriptionStatus,
  currentListingCount: number
): { allowed: boolean; reason?: string } {
  if (status === 'EXPIRED') {
    return { allowed: false, reason: 'Your subscription has expired. Please renew to create listings.' }
  }
  if (status === 'CANCELLED') {
    return { allowed: false, reason: 'Your subscription has been cancelled. Please subscribe to create listings.' }
  }
  const limits = PLAN_LIMITS[plan]
  if (limits.listingLimit !== null && currentListingCount >= limits.listingLimit) {
    return {
      allowed: false,
      reason: `You have reached the listing limit of ${limits.listingLimit} for your ${plan} plan. Upgrade to list more properties.`,
    }
  }
  return { allowed: true }
}

/**
 * Returns the listing priority score used for lead routing.
 * Higher = more likely to receive leads.
 */
export function getLeadRoutingScore(plan: SubscriptionPlan, status: SubscriptionStatus): number {
  if (status !== 'ACTIVE' && status !== 'TRIAL') return 0
  if (plan === 'PREMIUM') return 100
  if (plan === 'PROFESSIONAL') return 60
  return 20
}
