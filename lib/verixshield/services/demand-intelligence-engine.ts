// ━━━ VerixShield v2.1 — Demand Intelligence Engine ━━━━━━━━━━━━━━━━━━━━━━━
// Captures real user behavioral signals beyond listing count proxies
// Uses analytics events for views, property leads for enquiries

import { prisma } from '@/lib/prisma'
import type { DemandIntelligenceResult } from '../types-v2'

export async function computeDemandIntelligence(
  propertyId: string,
  city: string | null,
  community: string | null,
): Promise<DemandIntelligenceResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  let viewCount = 0
  let saveCount = 0
  let enquiryCount = 0

  // ── Property-level signals ──
  try {
    viewCount = await (prisma as any).analyticsEvent.count({
      where: {
        name: 'property_view',
        path: { contains: propertyId },
        createdAt: { gte: thirtyDaysAgo },
      },
    })
  } catch {}

  try {
    enquiryCount = await (prisma as any).propertyLead.count({
      where: {
        externalId: propertyId,
        createdAt: { gte: thirtyDaysAgo },
      },
    })
  } catch {}

  // ── Area-level context ──
  let areaAvgViews = 10
  try {
    if (city) {
      const locFilter: any = { city: { equals: city, mode: 'insensitive' } }
      if (community) locFilter.community = { equals: community, mode: 'insensitive' }

      const totalListings = await (prisma as any).marketListing.count({
        where: { ...locFilter, isActive: true },
      })

      if (totalListings > 0) {
        const totalAreaViews = await (prisma as any).analyticsEvent.count({
          where: {
            name: 'property_view',
            createdAt: { gte: thirtyDaysAgo },
          },
        })
        areaAvgViews = Math.max(1, totalAreaViews / totalListings)
      }
    }
  } catch {}

  // ── Score computation ──
  const viewFactor = areaAvgViews > 0
    ? Math.min(100, (viewCount / areaAvgViews) * 50)
    : Math.min(100, viewCount * 5)

  const saveFactor = Math.min(100, saveCount * 15)
  const enquiryFactor = Math.min(100, enquiryCount * 20)

  const score = Math.round(
    viewFactor * 0.30 +
    saveFactor * 0.25 +
    enquiryFactor * 0.45,
  )
  const clampedScore = Math.max(5, Math.min(100, score))

  let level: DemandIntelligenceResult['level'] = 'NORMAL'
  if (clampedScore >= 75) level = 'HOT'
  else if (clampedScore >= 50) level = 'WARM'
  else if (clampedScore >= 25) level = 'NORMAL'
  else level = 'COLD'

  let narrative = ''
  if (level === 'HOT') {
    narrative = `High demand — this property has ${viewCount} views and ${enquiryCount} enquiries in the last 30 days, well above area average.`
  } else if (level === 'WARM') {
    narrative = `Active interest — ${viewCount} views and ${enquiryCount} enquiries indicate growing demand.`
  } else if (level === 'COLD') {
    narrative = `Low activity — this listing has received limited interest. Consider reviewing pricing.`
  } else {
    narrative = `Normal market activity for this area.`
  }

  return {
    score: clampedScore,
    level,
    signals: { viewCount, saveCount, enquiryCount },
    narrative,
  }
}
