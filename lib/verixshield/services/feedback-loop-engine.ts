// ━━━ VerixShield v2.1 — Feedback Loop Engine ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Makes the system self-learning by capturing actual sold prices
// Computes error rates and triggers model retraining when accuracy degrades

import { prisma } from '@/lib/prisma'

export interface FeedbackInput {
  propertyId: string
  entityType: 'MANUAL_PROPERTY' | 'PROJECT'
  actualPrice: number
  actualPriceDate: Date
  source: 'ADMIN_INPUT' | 'DLD_TRANSACTION' | 'AGENT_REPORT'
  city?: string
  community?: string
}

export interface FeedbackResult {
  feedbackId: string
  predictedPrice: number | null
  actualPrice: number
  errorPercentage: number | null
  actionTaken: 'stored' | 'retrain_triggered' | 'no_prediction_found'
}

export async function recordFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  // Step 1: Find the most recent prediction for this property
  let prediction: any = null
  try {
    prediction = await (prisma as any).verixShieldResult.findUnique({
      where: {
        entityType_entityId: {
          entityType: input.entityType,
          entityId: input.propertyId,
        },
      },
    })
  } catch {}

  const predictedPrice = prediction?.estimatedMedian || null
  const errorPercentage =
    predictedPrice && input.actualPrice > 0
      ? Math.round(
          (Math.abs(predictedPrice - input.actualPrice) / input.actualPrice) * 10000,
        ) / 100
      : null

  // Step 2: Store feedback
  const record = await (prisma as any).valuationFeedback.create({
    data: {
      entityType: input.entityType,
      entityId: input.propertyId,
      predictedLow: prediction?.estimatedMin || null,
      predictedFair: prediction?.estimatedMedian || null,
      predictedHigh: prediction?.estimatedMax || null,
      confidence: prediction?.confidence || null,
      actualPrice: input.actualPrice,
      actualPriceDate: input.actualPriceDate,
      errorPercentage,
      source: input.source,
      modelVersion: prediction?.modelVersion || 'unknown',
      city: input.city || null,
      community: input.community || null,
    },
  })

  // Step 3: Check if retraining is needed (MAPE > 12% over last 30 days)
  let actionTaken: FeedbackResult['actionTaken'] = 'stored'

  if (errorPercentage !== null) {
    try {
      const recentErrors = await (prisma as any).valuationFeedback.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          errorPercentage: { not: null },
        },
        select: { errorPercentage: true },
        take: 100,
        orderBy: { createdAt: 'desc' },
      })

      if (recentErrors.length >= 20) {
        const avgError =
          recentErrors.reduce((s: number, r: any) => s + (r.errorPercentage || 0), 0) /
          recentErrors.length

        if (avgError > 12) {
          actionTaken = 'retrain_triggered'
          console.warn(
            `[VerixShield:Feedback] MAPE ${avgError.toFixed(1)}% exceeds 12% threshold — retraining alert`,
          )
        }
      }
    } catch {}
  }

  if (!prediction) {
    actionTaken = 'no_prediction_found'
  }

  return {
    feedbackId: record.id,
    predictedPrice,
    actualPrice: input.actualPrice,
    errorPercentage,
    actionTaken,
  }
}

// ── Scheduled job: Compute accuracy metrics per location ──

export async function computeAccuracyMetrics(): Promise<{ updated: number }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  let updated = 0

  try {
    const feedbacks = await (prisma as any).valuationFeedback.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        errorPercentage: { not: null },
        city: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Aggregate by location
    const byLocation: Record<string, { errors: number[]; city: string; community: string | null }> = {}
    for (const fb of feedbacks) {
      const key = `${fb.city}|${fb.community || ''}`
      if (!byLocation[key]) {
        byLocation[key] = { errors: [], city: fb.city, community: fb.community }
      }
      byLocation[key].errors.push(fb.errorPercentage)
    }

    for (const [locKey, data] of Object.entries(byLocation)) {
      const mape = data.errors.reduce((s, v) => s + v, 0) / data.errors.length

      await (prisma as any).modelPerformanceLog.upsert({
        where: {
          locationKey_modelVersion: { locationKey: locKey, modelVersion: '2.1.0' },
        },
        update: {
          mape: Math.round(mape * 100) / 100,
          sampleSize: data.errors.length,
          calculatedAt: new Date(),
        },
        create: {
          locationKey: locKey,
          city: data.city,
          community: data.community,
          modelVersion: '2.1.0',
          mape: Math.round(mape * 100) / 100,
          sampleSize: data.errors.length,
          calculatedAt: new Date(),
        },
      })
      updated++
    }
  } catch (error) {
    console.error('[VerixShield:Feedback] Accuracy metrics error:', error)
  }

  return { updated }
}
