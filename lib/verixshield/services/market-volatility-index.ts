// ━━━ VerixShield v2.1 — Market Volatility Index Engine ━━━━━━━━━━━━━━━━━━━
// Computes dynamic anomaly detection thresholds based on market conditions
// Stable market = tighter band, volatile market = wider band

import { prisma } from '@/lib/prisma'
import type { MVIResult } from '../types-v2'

const BASE_THRESHOLD = 15 // base percentage for anomaly detection

export async function computeMarketVolatilityIndex(
  city: string | null,
  community: string | null,
): Promise<MVIResult> {
  if (!city) {
    return defaultMVI()
  }

  const now = new Date()
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

  const locFilter: any = { city: { equals: city, mode: 'insensitive' } }
  if (community) locFilter.community = { equals: community, mode: 'insensitive' }

  // ── Factor 1: Price Variance Trend (0.40) ──
  let priceVarianceTrend = 1.0
  try {
    const trends = await (prisma as any).priceTrend.findMany({
      where: { ...locFilter, year: { gte: sixMonthsAgo.getFullYear() } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 6,
    })

    if (trends.length >= 3) {
      const changes = trends
        .filter((t: any) => t.priceChangePercent !== null)
        .map((t: any) => Math.abs(t.priceChangePercent))

      if (changes.length > 0) {
        const avgAbsChange = changes.reduce((s: number, v: number) => s + v, 0) / changes.length
        if (avgAbsChange < 1) priceVarianceTrend = 0.5
        else if (avgAbsChange < 2) priceVarianceTrend = 0.8
        else if (avgAbsChange < 3) priceVarianceTrend = 1.0
        else if (avgAbsChange < 5) priceVarianceTrend = 1.5
        else priceVarianceTrend = 2.5
      }
    }
  } catch {}

  // ── Factor 2: Demand Fluctuation (0.30) ──
  let demandFluctuation = 1.0
  try {
    const signals = await (prisma as any).marketSignal.findMany({
      where: locFilter,
      orderBy: { calculatedAt: 'desc' },
      take: 3,
    })

    if (signals.length >= 2) {
      const demandChanges: number[] = []
      for (let i = 1; i < signals.length; i++) {
        demandChanges.push(Math.abs(signals[i - 1].demandScore - signals[i].demandScore))
      }
      const avgDemandChange = demandChanges.reduce((s, v) => s + v, 0) / demandChanges.length

      if (avgDemandChange > 20) demandFluctuation = 2.0
      else if (avgDemandChange > 10) demandFluctuation = 1.5
      else if (avgDemandChange > 5) demandFluctuation = 1.0
      else demandFluctuation = 0.7
    }
  } catch {}

  // ── Factor 3: Transaction Velocity Change (0.30) ──
  let transactionVelocityChange = 1.0
  try {
    const [recentTx, olderTx] = await Promise.all([
      (prisma as any).propertyTransaction.count({
        where: { ...locFilter, soldDate: { gte: threeMonthsAgo } },
      }),
      (prisma as any).propertyTransaction.count({
        where: { ...locFilter, soldDate: { gte: sixMonthsAgo, lt: threeMonthsAgo } },
      }),
    ])

    if (olderTx > 0) {
      const velocityRatio = recentTx / olderTx
      if (velocityRatio > 2.0) transactionVelocityChange = 2.0
      else if (velocityRatio > 1.5) transactionVelocityChange = 1.5
      else if (velocityRatio < 0.5) transactionVelocityChange = 1.8
      else transactionVelocityChange = 1.0
    }
  } catch {}

  // ── Composite MVI ──
  const mvi =
    priceVarianceTrend * 0.40 +
    demandFluctuation * 0.30 +
    transactionVelocityChange * 0.30

  const clampedMVI = Math.max(0.5, Math.min(3.0, Math.round(mvi * 100) / 100))

  let classification: MVIResult['classification'] = 'NORMAL'
  if (clampedMVI <= 0.7) classification = 'STABLE'
  else if (clampedMVI <= 1.2) classification = 'NORMAL'
  else if (clampedMVI <= 1.8) classification = 'ELEVATED'
  else classification = 'VOLATILE'

  const effectiveThreshold = Math.round(BASE_THRESHOLD * clampedMVI * 10) / 10

  return {
    index: clampedMVI,
    classification,
    factors: { priceVarianceTrend, demandFluctuation, transactionVelocityChange },
    effectiveThreshold,
  }
}

function defaultMVI(): MVIResult {
  return {
    index: 1.0,
    classification: 'NORMAL',
    factors: { priceVarianceTrend: 1.0, demandFluctuation: 1.0, transactionVelocityChange: 1.0 },
    effectiveThreshold: BASE_THRESHOLD,
  }
}
