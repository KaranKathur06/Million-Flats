// ━━━ VerixShield v2.1 — Data Quality Engine ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gates every valuation — prevents garbage data from producing confident wrong prices
// Must run BEFORE any computation in the orchestrator

import { prisma } from '@/lib/prisma'
import type { DataQualityResult, DataQualityFactor } from '../types-v2'

const DQ_THRESHOLDS = {
  HIGH: 65,
  MEDIUM: 35,
  MIN_FOR_VALUATION: 20,
}

export async function runDataQualityEngine(
  city: string | null,
  community: string | null,
  bhk: number,
): Promise<DataQualityResult> {
  const factors: DataQualityFactor[] = []

  if (!city) {
    return {
      score: 10,
      status: 'LOW',
      allowValuation: false,
      factors: [],
      recommendation: 'No city data available — cannot assess market data quality.',
    }
  }

  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const locFilter: any = { city: { equals: city, mode: 'insensitive' } }
  if (community) locFilter.community = { equals: community, mode: 'insensitive' }

  // ══════════════════════════════════════════════════════════════
  // Factor 1: Transaction Density (0.35 weight)
  // ══════════════════════════════════════════════════════════════
  let txCount = 0
  try {
    txCount = await (prisma as any).propertyTransaction.count({
      where: {
        ...locFilter,
        soldDate: { gte: sixMonthsAgo },
        sqft: { gt: 0 },
        soldPrice: { gt: 0 },
      },
    })
  } catch {}

  let txScore = 0
  if (txCount >= 50) txScore = 100
  else if (txCount >= 20) txScore = 80
  else if (txCount >= 10) txScore = 60
  else if (txCount >= 5) txScore = 40
  else if (txCount >= 1) txScore = 20
  else txScore = 5

  factors.push({
    name: 'Transaction Density',
    score: txScore,
    weight: 0.35,
    weighted: Math.round(txScore * 0.35 * 100) / 100,
    detail: `${txCount} transactions in last 6 months`,
  })

  // ══════════════════════════════════════════════════════════════
  // Factor 2: Listing Density (0.25 weight)
  // ══════════════════════════════════════════════════════════════
  let listingCount = 0
  try {
    listingCount = await (prisma as any).marketListing.count({
      where: {
        ...locFilter,
        isActive: true,
        price: { gt: 0 },
        sqft: { gt: 0 },
        bhk: { gte: Math.max(0, bhk - 1), lte: bhk + 1 },
      },
    })
  } catch {}

  let listingScore = 0
  if (listingCount >= 30) listingScore = 100
  else if (listingCount >= 15) listingScore = 75
  else if (listingCount >= 8) listingScore = 55
  else if (listingCount >= 3) listingScore = 30
  else listingScore = 10

  factors.push({
    name: 'Listing Density',
    score: listingScore,
    weight: 0.25,
    weighted: Math.round(listingScore * 0.25 * 100) / 100,
    detail: `${listingCount} active comparable listings`,
  })

  // ══════════════════════════════════════════════════════════════
  // Factor 3: Data Recency (0.20 weight)
  // ══════════════════════════════════════════════════════════════
  let recentCount = 0
  try {
    recentCount = await (prisma as any).marketListing.count({
      where: {
        ...locFilter,
        isActive: true,
        listedAt: { gte: threeMonthsAgo },
        price: { gt: 0 },
      },
    })
  } catch {}

  const recencyRatio = listingCount > 0 ? recentCount / listingCount : 0
  let recencyScore = Math.round(recencyRatio * 100)
  recencyScore = Math.max(5, Math.min(100, recencyScore))

  factors.push({
    name: 'Data Recency',
    score: recencyScore,
    weight: 0.20,
    weighted: Math.round(recencyScore * 0.20 * 100) / 100,
    detail: `${Math.round(recencyRatio * 100)}% of data from last 3 months`,
  })

  // ══════════════════════════════════════════════════════════════
  // Factor 4: Source Diversity (0.20 weight)
  // ══════════════════════════════════════════════════════════════
  let sources: string[] = []
  try {
    const sourceRows = await (prisma as any).marketListing.groupBy({
      by: ['source'],
      where: { ...locFilter, isActive: true },
    })
    sources = sourceRows.map((r: any) => r.source)
  } catch {}

  if (txCount > 0 && !sources.includes('GOVERNMENT')) {
    sources.push('GOVERNMENT')
  }

  let sourceScore = 0
  if (sources.length >= 3) sourceScore = 100
  else if (sources.length === 2) sourceScore = 70
  else if (sources.length === 1) sourceScore = 40
  else sourceScore = 10

  factors.push({
    name: 'Source Diversity',
    score: sourceScore,
    weight: 0.20,
    weighted: Math.round(sourceScore * 0.20 * 100) / 100,
    detail: `${sources.length} data source(s): ${sources.join(', ') || 'none'}`,
  })

  // ══════════════════════════════════════════════════════════════
  // Final Score
  // ══════════════════════════════════════════════════════════════
  const score = Math.round(factors.reduce((s, f) => s + f.weighted, 0))
  const clampedScore = Math.max(0, Math.min(100, score))

  let status: DataQualityResult['status'] = 'LOW'
  if (clampedScore >= DQ_THRESHOLDS.HIGH) status = 'HIGH'
  else if (clampedScore >= DQ_THRESHOLDS.MEDIUM) status = 'MEDIUM'

  const allowValuation = clampedScore >= DQ_THRESHOLDS.MIN_FOR_VALUATION

  let recommendation = ''
  if (!allowValuation) {
    recommendation = 'Insufficient market data for reliable valuation. Showing estimate as reference only.'
  } else if (status === 'LOW') {
    recommendation = 'Limited data available — estimate has higher uncertainty.'
  } else if (status === 'MEDIUM') {
    recommendation = 'Moderate data coverage — estimate is directionally accurate.'
  } else {
    recommendation = 'Strong data foundation — high-confidence estimate.'
  }

  return { score: clampedScore, status, allowValuation, factors, recommendation }
}
