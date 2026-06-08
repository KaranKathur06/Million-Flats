// ━━━ VerixShield v2.1 — ML Engine Client (Multi-Model) ━━━━━━━━━━━━━━━━━━
// TypeScript client that calls the Python FastAPI microservice
// Handles model routing, retries, timeout (3s), and graceful fallback

import type { MLPrediction, PropertyInput, DataQualityResult } from '../types-v2'

const ML_SERVICE_URL = process.env.VERIXSHIELD_ML_URL || 'http://localhost:8100'
const ML_TIMEOUT_MS = 3000

interface MLFeatureVector {
  sqft: number
  bhk: number
  propertyType: string
  city: string
  community: string
  floor: number | null
  propertyAge: number | null
  normalizedPricePerSqft: number | null
  dataQualityScore: number
  priceHint: number | null
}

export async function callMLService(
  input: PropertyInput,
  dataQuality: DataQualityResult,
  normalizedPSF: number | null,
): Promise<MLPrediction> {
  try {
    const features: MLFeatureVector = {
      sqft: input.sqft || 0,
      bhk: input.bhk || 1,
      propertyType: input.propertyType || 'apartment',
      city: input.city || 'Dubai',
      community: input.community || '',
      floor: input.floor || null,
      propertyAge: input.propertyAge || null,
      normalizedPricePerSqft: normalizedPSF,
      dataQualityScore: dataQuality.score,
      priceHint: input.price || null,
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), ML_TIMEOUT_MS)

    const response = await fetch(`${ML_SERVICE_URL}/v2.1/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`ML service returned ${response.status}`)
    }

    const result = await response.json()

    return {
      predictedPrice: result.predictedPrice || 0,
      predictedPricePerSqft: result.predictedPricePerSqft || 0,
      predictionVariance: result.predictionVariance || 0,
      featureImportances: result.featureImportances || {},
      modelVersion: result.modelVersion || '2.1.0',
      modelSegment: result.modelSegment || 'fallback',
    }
  } catch (error: any) {
    // Graceful fallback — ML is supplementary, never critical
    console.warn('[VerixShield:ML] Service unavailable:', error.message || error)

    return {
      predictedPrice: 0,
      predictedPricePerSqft: 0,
      predictionVariance: 0,
      featureImportances: {},
      modelVersion: 'unavailable',
      modelSegment: 'none',
    }
  }
}
