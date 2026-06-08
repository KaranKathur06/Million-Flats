// ━━━ VerixShield v2.1 — Normalized Price Engine ━━━━━━━━━━━━━━━━━━━━━━━━━━
// Adjusts raw price/sqft for floor, view, developer, furnishing, building quality
// Makes comparables truly comparable by normalizing to a baseline

import type { NormalizationResult, NormalizationFactors } from '../types-v2'

// ── Floor Factor ──
// Ground floor = 0.96 (slight discount), mid = 1.00 (baseline), top = 1.10
export function getFloorFactor(floor: number | null, totalFloors: number | null): number {
  if (!floor || floor <= 0) return 1.00
  const maxFloor = totalFloors || 40
  const ratio = floor / maxFloor

  if (ratio <= 0.15) return 0.96
  if (ratio <= 0.30) return 0.98
  if (ratio <= 0.50) return 1.00
  if (ratio <= 0.70) return 1.03
  if (ratio <= 0.85) return 1.06
  return 1.10
}

// ── View Factor ──
export function getViewFactor(view: string | null): number {
  if (!view) return 1.00
  const v = view.toLowerCase()

  if (v.includes('sea') || v.includes('ocean') || v.includes('beach')) return 1.25
  if (v.includes('marina') || v.includes('canal') || v.includes('creek')) return 1.18
  if (v.includes('skyline') || v.includes('burj') || v.includes('landmark')) return 1.20
  if (v.includes('golf') || v.includes('park') || v.includes('garden')) return 1.12
  if (v.includes('pool') || v.includes('community')) return 1.06
  if (v.includes('road') || v.includes('parking') || v.includes('construction')) return 0.92
  return 1.00
}

// ── Developer Premium ──
const DEVELOPER_PREMIUMS: Record<string, number> = {
  'emaar': 1.20,
  'meraas': 1.18,
  'nakheel': 1.12,
  'damac': 1.05,
  'sobha': 1.10,
  'omniyat': 1.22,
  'select group': 1.08,
  'azizi': 0.95,
  'danube': 0.93,
  'samana': 0.92,
  'mag': 0.90,
}

export function getDeveloperPremium(developerName: string | null): number {
  if (!developerName) return 1.00
  const normalized = developerName.toLowerCase().trim()
  for (const [key, value] of Object.entries(DEVELOPER_PREMIUMS)) {
    if (normalized.includes(key)) return value
  }
  return 1.00
}

// ── Furnishing Factor ──
export function getFurnishingFactor(furnished: string | null): number {
  if (!furnished) return 1.00
  const f = furnished.toLowerCase()
  if (f.includes('fully') || f === 'furnished') return 1.12
  if (f.includes('semi') || f.includes('partial')) return 1.05
  return 1.00
}

// ── Building Quality Factor ──
export function getBuildingQualityFactor(
  propertyAge: number | null,
  amenityCount: number,
): number {
  let factor = 1.00

  if (propertyAge !== null) {
    if (propertyAge <= 2) factor += 0.05
    else if (propertyAge <= 5) factor += 0.02
    else if (propertyAge >= 15) factor -= 0.05
    else if (propertyAge >= 25) factor -= 0.10
  }

  if (amenityCount >= 15) factor += 0.05
  else if (amenityCount >= 8) factor += 0.02
  else if (amenityCount <= 3) factor -= 0.03

  return Math.max(0.85, Math.min(1.15, factor))
}

// ══════════════════════════════════════════════════════════════════
// Main: normalize raw price/sqft down to baseline
// ══════════════════════════════════════════════════════════════════

export function normalizePrice(
  rawPricePerSqft: number,
  floor: number | null,
  totalFloors: number | null,
  view: string | null,
  developerName: string | null,
  furnished: string | null,
  propertyAge: number | null,
  amenityCount: number,
): NormalizationResult {
  const floorF = getFloorFactor(floor, totalFloors)
  const viewF = getViewFactor(view)
  const devF = getDeveloperPremium(developerName)
  const furnF = getFurnishingFactor(furnished)
  const qualF = getBuildingQualityFactor(propertyAge, amenityCount)

  const compositeFactor = floorF * viewF * devF * furnF * qualF
  const normalizedPricePerSqft = rawPricePerSqft / compositeFactor

  return {
    rawPricePerSqft,
    normalizedPricePerSqft: Math.round(normalizedPricePerSqft),
    adjustmentFactors: {
      floor: Math.round(floorF * 1000) / 1000,
      view: Math.round(viewF * 1000) / 1000,
      developer: Math.round(devF * 1000) / 1000,
      furnishing: Math.round(furnF * 1000) / 1000,
      buildingQuality: Math.round(qualF * 1000) / 1000,
      compositeFactor: Math.round(compositeFactor * 1000) / 1000,
    },
  }
}

// ══════════════════════════════════════════════════════════════════
// Re-inflate: apply subject property's factors to get final price
// ══════════════════════════════════════════════════════════════════

export function denormalizePrice(
  normalizedPricePerSqft: number,
  factors: NormalizationFactors,
): number {
  return Math.round(normalizedPricePerSqft * factors.compositeFactor)
}

// ── Helper: count amenities from JSON field ──
export function countAmenities(amenities: any): number {
  if (!amenities) return 5
  if (Array.isArray(amenities)) return amenities.length
  if (typeof amenities === 'object') return Object.keys(amenities).length
  return 5
}
