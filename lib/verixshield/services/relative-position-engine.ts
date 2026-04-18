// ━━━ VerixShield v2.1 — Relative Market Position Engine ━━━━━━━━━━━━━━━━━━
// "This property is priced higher than 72% of similar listings"

import type { ComparablesResultV2, DistributionResult, RelativePositionResult } from '../types-v2'

export function computeRelativePosition(
  askingPrice: number | null,
  comparables: ComparablesResultV2,
  distribution: DistributionResult,
): RelativePositionResult {
  if (!askingPrice || askingPrice <= 0 || comparables.count === 0) {
    return {
      percentile: 50,
      badge: 'Market Average',
      narrative: 'Insufficient data to determine market position.',
      comparisonBase: 0,
    }
  }

  // Interpolate percentile from distribution bands
  const pricePoints = [
    { p: 0, v: distribution.min },
    { p: 10, v: distribution.p10 },
    { p: 25, v: distribution.p25 },
    { p: 50, v: distribution.median },
    { p: 75, v: distribution.p75 },
    { p: 90, v: distribution.p90 },
    { p: 100, v: distribution.max },
  ]

  let percentile = 50
  if (askingPrice <= pricePoints[0].v) {
    percentile = 1
  } else if (askingPrice >= pricePoints[pricePoints.length - 1].v) {
    percentile = 99
  } else {
    for (let i = 1; i < pricePoints.length; i++) {
      if (askingPrice <= pricePoints[i].v) {
        const lower = pricePoints[i - 1]
        const upper = pricePoints[i]
        const range = upper.v - lower.v
        const ratio = range > 0 ? (askingPrice - lower.v) / range : 0.5
        percentile = Math.round(lower.p + ratio * (upper.p - lower.p))
        break
      }
    }
  }
  percentile = Math.max(1, Math.min(99, percentile))

  // Generate badge
  let badge = 'Market Average'
  if (percentile >= 85) badge = `Top ${100 - percentile}% Most Expensive`
  else if (percentile >= 70) badge = 'Above Average Price'
  else if (percentile >= 40) badge = 'Market Average'
  else if (percentile >= 20) badge = 'Below Average Price'
  else badge = 'Undervalued Opportunity'

  const narrative = `This property is priced higher than ${percentile}% of ${comparables.count} similar listings in this area.`

  return { percentile, badge, narrative, comparisonBase: comparables.count }
}
