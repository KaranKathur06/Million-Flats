// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Canonical Developer Model
// Phase 0: Intelligence Foundation
//
// Every developer is normalized into:
//   Developer → Projects → Properties → Units
//
// Developer intelligence feeds into: Investment Engine, Risk Engine,
// Confidence Engine, Comparable Engine, and Report Generator.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Brand Tier ──────────────────────────────────────────────────────────────

export type DeveloperBrandTier =
  | 'TIER_1'      // Top-tier national/international brand (Emaar, DLF, Godrej)
  | 'TIER_2'      // Established regional brand
  | 'TIER_3'      // Mid-size builder with track record
  | 'TIER_4'      // Small/local builder
  | 'UNRATED'     // Not enough data to classify

// ─── Canonical Developer ─────────────────────────────────────────────────────

export interface CanonicalDeveloper {
  // ── Identity ───────────────────────────────────────────────────────────────
  id: string
  name: string
  slug?: string
  source: string                    // "MILLIONFLATS" | external source

  // ── Brand & Classification ─────────────────────────────────────────────────
  brandTier: DeveloperBrandTier
  foundedYear?: number
  headquarters?: string
  countryIso2?: string
  operatingCities: string[]         // Cities where developer has projects

  // ── Delivery Track Record ──────────────────────────────────────────────────
  totalDelivered: number            // Total projects delivered
  activeProjectCount: number        // Currently active projects
  completionRate: number            // % of projects delivered on time (0-100)
  avgDeliveryDelayMonths: number    // Average delay in months
  deliveryTimelineAccuracy: number  // 0-100, how accurate their timelines are

  // ── Quality & Reputation ───────────────────────────────────────────────────
  customerRating?: number           // 0-5 (from reviews)
  customerReviewCount: number
  qualityRating?: number            // 0-100 (construction quality assessment)
  reputationScore: number           // 0-100 composite reputation

  // ── Legal & Risk ───────────────────────────────────────────────────────────
  litigationCount: number           // Active/historical legal cases
  reraCompliance: boolean           // Is RERA compliant (India) / DLD registered (UAE)
  regulatoryIssues: number          // Count of regulatory issues

  // ── Financial ──────────────────────────────────────────────────────────────
  estimatedPortfolioValue?: number  // Total portfolio value estimate
  avgProjectSize?: number           // Average project size (units)

  // ── Project Summary ────────────────────────────────────────────────────────
  projectSummary: DeveloperProjectSummary[]

  // ── Metadata ───────────────────────────────────────────────────────────────
  lastUpdated: string               // ISO date
  confidence: number                // 0-100 how much we trust this data
}

// ─── Developer Project Summary ───────────────────────────────────────────────

export interface DeveloperProjectSummary {
  projectId: string
  name: string
  city: string
  status: 'COMPLETED' | 'UNDER_CONSTRUCTION' | 'LAUNCHED' | 'UPCOMING'
  completionYear?: number
  totalUnits?: number
  deliveredOnTime: boolean | null    // null = not yet delivered
}

// ─── Brand Tier Classification ───────────────────────────────────────────────

/**
 * Classify a developer's brand tier based on track record metrics.
 * 
 * Tier 1: 50+ delivered, 80%+ completion rate, 4+ customer rating
 * Tier 2: 20+ delivered, 70%+ completion rate
 * Tier 3: 5+ delivered
 * Tier 4: < 5 delivered
 * Unrated: No delivery data
 */
export function classifyBrandTier(
  totalDelivered: number,
  completionRate: number,
  customerRating?: number
): DeveloperBrandTier {
  if (totalDelivered === 0) return 'UNRATED'

  if (totalDelivered >= 50 && completionRate >= 80 && (customerRating ?? 0) >= 4) {
    return 'TIER_1'
  }
  if (totalDelivered >= 20 && completionRate >= 70) {
    return 'TIER_2'
  }
  if (totalDelivered >= 5) {
    return 'TIER_3'
  }
  return 'TIER_4'
}

/**
 * Compute a composite reputation score from multiple developer signals.
 * Weighted formula balancing delivery track record, customer satisfaction, and legal standing.
 */
export function computeReputationScore(params: {
  completionRate: number          // 0-100
  customerRating?: number         // 0-5
  totalDelivered: number
  litigationCount: number
  avgDelayMonths: number
}): number {
  const {
    completionRate,
    customerRating,
    totalDelivered,
    litigationCount,
    avgDelayMonths,
  } = params

  // Normalize customer rating to 0-100
  const ratingScore = customerRating ? (customerRating / 5) * 100 : 50

  // Scale factor: more projects = more reliable data
  const scaleFactor = Math.min(1, totalDelivered / 20) // Max reliability at 20+ projects

  // Delay penalty (each month of avg delay reduces score)
  const delayPenalty = Math.min(30, avgDelayMonths * 3)

  // Litigation penalty
  const litigationPenalty = Math.min(25, litigationCount * 5)

  const raw =
    completionRate * 0.35 +
    ratingScore * 0.25 +
    (scaleFactor * 100) * 0.15 +
    (100 - delayPenalty) * 0.15 +
    (100 - litigationPenalty) * 0.10

  return Math.round(Math.min(100, Math.max(0, raw)))
}

/**
 * Compute delivery timeline accuracy from historical delivery data.
 * 100 = perfect on-time delivery, 0 = always delayed significantly.
 */
export function computeDeliveryAccuracy(
  projects: Array<{ deliveredOnTime: boolean | null }>
): number {
  const delivered = projects.filter(p => p.deliveredOnTime !== null)
  if (delivered.length === 0) return 50 // No data — neutral

  const onTime = delivered.filter(p => p.deliveredOnTime === true).length
  return Math.round((onTime / delivered.length) * 100)
}
