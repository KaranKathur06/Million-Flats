// ━━━ VerixShield v2.1 — Historical Accuracy Engine ━━━━━━━━━━━━━━━━━━━━━━━
// Calibrates confidence using real backtested MAPE from feedback data
// If model is wrong 40% of the time, confidence MUST NOT show 85%

import { prisma } from '@/lib/prisma'
import type { HistoricalAccuracyResult } from '../types-v2'

const MODEL_VERSION = '2.1.0'

export async function computeHistoricalAccuracy(
  city: string | null,
  community: string | null,
): Promise<HistoricalAccuracyResult> {
  if (!city) {
    return {
      score: 50,
      mape: null,
      sampleSize: 0,
      hasData: false,
      detail: 'No location data — accuracy unknown',
    }
  }

  const locationKey = `${city}|${community || ''}`

  try {
    // Check pre-computed accuracy metrics
    const perf = await (prisma as any).modelPerformanceLog.findFirst({
      where: { locationKey, modelVersion: MODEL_VERSION },
      orderBy: { calculatedAt: 'desc' },
    })

    if (perf && perf.sampleSize >= 10) {
      // Score = 100 - (MAPE × 5), clamped to [10, 95]
      const rawScore = 100 - (perf.mape * 5)
      const score = Math.max(10, Math.min(95, Math.round(rawScore)))

      let detail = ''
      if (perf.mape <= 5) {
        detail = `Historically accurate: ${perf.mape.toFixed(1)}% avg error (${perf.sampleSize} verified sales)`
      } else if (perf.mape <= 10) {
        detail = `Good accuracy: ${perf.mape.toFixed(1)}% avg error (${perf.sampleSize} verified sales)`
      } else if (perf.mape <= 15) {
        detail = `Moderate accuracy: ${perf.mape.toFixed(1)}% avg error in this area`
      } else {
        detail = `Lower accuracy area: ${perf.mape.toFixed(1)}% avg error — use estimate cautiously`
      }

      return { score, mape: perf.mape, sampleSize: perf.sampleSize, hasData: true, detail }
    }

    // Fallback: compute from raw feedback data
    const feedbacks = await (prisma as any).valuationFeedback.findMany({
      where: {
        city: { equals: city, mode: 'insensitive' },
        ...(community ? { community: { equals: community, mode: 'insensitive' } } : {}),
        errorPercentage: { not: null },
      },
      select: { errorPercentage: true },
      take: 100,
      orderBy: { createdAt: 'desc' },
    })

    if (feedbacks.length >= 5) {
      const errors = feedbacks.map((f: any) => f.errorPercentage as number)
      const mape = errors.reduce((s: number, v: number) => s + v, 0) / errors.length
      const rawScore = 100 - (mape * 5)
      const score = Math.max(10, Math.min(95, Math.round(rawScore)))

      return {
        score,
        mape: Math.round(mape * 100) / 100,
        sampleSize: feedbacks.length,
        hasData: true,
        detail: `Based on ${feedbacks.length} verified sales: ${mape.toFixed(1)}% avg error`,
      }
    }

    return {
      score: 50,
      mape: null,
      sampleSize: feedbacks.length,
      hasData: false,
      detail: 'Insufficient sold-price data to assess accuracy',
    }
  } catch {
    return {
      score: 50,
      mape: null,
      sampleSize: 0,
      hasData: false,
      detail: 'Accuracy data unavailable',
    }
  }
}
