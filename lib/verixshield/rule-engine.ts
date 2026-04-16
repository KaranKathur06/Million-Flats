// ━━━ VerixShield Rule Engine (Non-AI) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Applies business logic rules for price classification
// Combines valuation + comparables to determine status

import type {
  PropertyInput,
  ValuationResult,
  ComparablesResult,
  RuleEngineResult,
  RentalIntelligence,
  PriceDistribution,
  VerixShieldStatusType,
} from './types'

// ── Thresholds ──
const OVERPRICED_THRESHOLD = 15      // percentage above estimated max
const UNDERPRICED_THRESHOLD = -15    // percentage below estimated min
const SUSPICIOUS_THRESHOLD = -30     // percentage below — likely scam
const FAIR_BAND = 10                 // percentage band around median

// ── Rental yield benchmarks (UAE market) ──
const RENTAL_YIELD_RATES: Record<string, { min: number; max: number }> = {
  'studio': { min: 7.0, max: 9.5 },
  'apartment': { min: 5.5, max: 8.0 },
  'villa': { min: 4.0, max: 6.5 },
  'townhouse': { min: 4.5, max: 7.0 },
  'penthouse': { min: 3.5, max: 5.5 },
  'default': { min: 5.0, max: 7.5 },
}

export function runRuleEngine(
  input: PropertyInput,
  valuation: ValuationResult,
  comparables: ComparablesResult,
): RuleEngineResult {
  const askingPrice = input.price || 0
  const estimatedMedian = valuation.estimatedMedian
  const flags: string[] = []

  // ── Calculate deviation ──
  let deviation = 0
  if (estimatedMedian > 0 && askingPrice > 0) {
    deviation = ((askingPrice - estimatedMedian) / estimatedMedian) * 100
    deviation = Math.round(deviation * 100) / 100
  }

  // ── Determine status ──
  let status: VerixShieldStatusType = 'FAIR'

  if (askingPrice <= 0) {
    status = 'INSUFFICIENT_DATA'
    flags.push('No asking price available for comparison')
  } else if (valuation.confidence < 25) {
    status = 'INSUFFICIENT_DATA'
    flags.push('Low confidence — insufficient market data')
  } else if (deviation <= SUSPICIOUS_THRESHOLD) {
    status = 'SUSPICIOUS'
    flags.push(`Price is ${Math.abs(deviation).toFixed(1)}% below market estimate`)
    flags.push('Unusually low price — verify listing authenticity')
  } else if (deviation < UNDERPRICED_THRESHOLD) {
    status = 'UNDERPRICED'
    flags.push(`Price is ${Math.abs(deviation).toFixed(1)}% below market estimate`)
    flags.push('Potential opportunity — below fair market value')
  } else if (deviation > OVERPRICED_THRESHOLD) {
    status = 'OVERPRICED'
    flags.push(`Price is ${deviation.toFixed(1)}% above market estimate`)
    flags.push('Listed above fair market value for this configuration')
  } else {
    status = 'FAIR'
    if (Math.abs(deviation) < FAIR_BAND / 2) {
      flags.push('Price is well-aligned with market estimates')
    } else {
      flags.push(`Price is within acceptable range (${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%)`)
    }
  }

  // ── Additional flags ──
  if (comparables.count < 3) {
    flags.push('Limited comparable data — estimate may be less accurate')
  }

  if (comparables.count >= 5 && askingPrice > 0) {
    const compPrices = comparables.comparables.map(c => c.price).sort((a, b) => a - b)
    const cheapest = compPrices[0]
    const expensive = compPrices[compPrices.length - 1]

    if (askingPrice > expensive * 1.1) {
      flags.push('Asking price exceeds all comparable listings')
    } else if (askingPrice < cheapest * 0.9) {
      flags.push('Asking price is below all comparable listings')
    }
  }

  // ── Price position (percentile) ──
  let pricePosition = 50
  if (comparables.count > 0 && askingPrice > 0) {
    const allPrices = comparables.comparables.map(c => c.price).sort((a, b) => a - b)
    const belowCount = allPrices.filter(p => p <= askingPrice).length
    pricePosition = Math.round((belowCount / allPrices.length) * 100)
  } else if (askingPrice > 0 && estimatedMedian > 0) {
    // Estimate position from deviation
    pricePosition = Math.max(5, Math.min(95, 50 + deviation * 1.5))
  }
  pricePosition = Math.round(Math.max(0, Math.min(100, pricePosition)))

  // ── Negotiation suggestion ──
  const suggestedMinPrice = Math.round(valuation.estimatedMin * 0.98)
  const suggestedMaxPrice = Math.round(valuation.estimatedMedian * 1.02)

  return {
    status,
    deviation,
    pricePosition,
    flags,
    suggestedMinPrice,
    suggestedMaxPrice,
  }
}

// ── Rental Intelligence ──
export function computeRentalIntelligence(
  input: PropertyInput,
  valuation: ValuationResult,
): RentalIntelligence {
  const propertyType = (input.propertyType || 'apartment').toLowerCase()
  const bhk = input.bhk || 1

  // Get yield rate for property type
  let yieldRate = RENTAL_YIELD_RATES['default']
  for (const [key, value] of Object.entries(RENTAL_YIELD_RATES)) {
    if (propertyType.includes(key)) {
      yieldRate = value
      break
    }
  }

  if (bhk === 0) {
    yieldRate = RENTAL_YIELD_RATES['studio']
  }

  const avgYield = (yieldRate.min + yieldRate.max) / 2
  const estimatedValue = valuation.estimatedMedian || input.price || 0

  // Annual rental = value * yield / 100
  const annualRentalMin = Math.round((estimatedValue * yieldRate.min) / 100)
  const annualRentalMax = Math.round((estimatedValue * yieldRate.max) / 100)

  // Monthly
  const estimatedRentalMin = Math.round(annualRentalMin / 12)
  const estimatedRentalMax = Math.round(annualRentalMax / 12)

  return {
    estimatedRentalMin,
    estimatedRentalMax,
    rentalYield: Math.round(avgYield * 100) / 100,
  }
}

// ── Price Distribution ──
export function computePriceDistribution(
  valuation: ValuationResult,
  comparables: ComparablesResult,
): PriceDistribution {
  const prices = comparables.comparables.map(c => c.price).sort((a, b) => a - b)

  if (prices.length >= 5) {
    return {
      min: prices[0],
      p10: prices[Math.floor(prices.length * 0.1)],
      p25: prices[Math.floor(prices.length * 0.25)],
      median: prices[Math.floor(prices.length * 0.5)],
      p75: prices[Math.floor(prices.length * 0.75)],
      p90: prices[Math.floor(prices.length * 0.9)],
      max: prices[prices.length - 1],
    }
  }

  // Fallback: synthesize from valuation
  const median = valuation.estimatedMedian
  const spread = (valuation.estimatedMax - valuation.estimatedMin) / 2

  return {
    min: Math.round(median - spread * 1.8),
    p10: Math.round(median - spread * 1.3),
    p25: Math.round(median - spread * 0.7),
    median: Math.round(median),
    p75: Math.round(median + spread * 0.7),
    p90: Math.round(median + spread * 1.3),
    max: Math.round(median + spread * 1.8),
  }
}
