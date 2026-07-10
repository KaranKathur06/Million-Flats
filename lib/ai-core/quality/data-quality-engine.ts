// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Data Quality Engine
// Phase 3: Data Quality Engine
//
// Every data point gets a quality score. This feeds directly into the
// Confidence Engine — low quality data = lower confidence = more honest AI.
//
// Six dimensions of quality:
//   Completeness → Freshness → Accuracy → Duplicates → Trust → Consistency
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Data Quality Score ──────────────────────────────────────────────────────

export interface DataQualityScore {
  completeness: number              // 0-100: % of required fields populated
  freshness: number                 // 0-100: based on age of data
  accuracy: number                  // 0-100: cross-provider validation
  duplicateRisk: number             // 0-100: probability of being a duplicate
  trustScore: number                // 0-100: based on provider reliability
  consistency: number               // 0-100: internal data consistency
  overall: number                   // 0-100: weighted composite
  factors: QualityFactor[]
}

export interface QualityFactor {
  dimension: string
  score: number
  weight: number
  weighted: number
  reason: string
  suggestions?: string[]
}

// ─── Quality Assessment ──────────────────────────────────────────────────────

interface QualityInput {
  // Completeness
  requiredFields: string[]
  populatedFields: string[]

  // Freshness
  dataAgeHours?: number              // How old is this data in hours

  // Accuracy
  crossValidationScore?: number      // 0-100 from cross-provider checks

  // Duplicates
  duplicateScore?: number            // 0-100 probability of duplicate

  // Trust
  providerConfidence: number         // 0-100 provider's self-reported confidence
  providerIsTemporary: boolean       // Demo providers get lower trust

  // Consistency
  consistencyIssues?: string[]       // List of detected inconsistencies
}

/**
 * Compute a comprehensive data quality score for any record.
 * This score feeds directly into the Confidence Engine.
 */
export function assessDataQuality(input: QualityInput): DataQualityScore {
  const factors: QualityFactor[] = []

  // ── Completeness (30% weight) ──────────────────────────────────────────────
  const completenessScore = input.requiredFields.length > 0
    ? (input.populatedFields.length / input.requiredFields.length) * 100
    : 50

  const missingFields = input.requiredFields.filter(f => !input.populatedFields.includes(f))
  factors.push({
    dimension: 'Completeness',
    score: Math.round(completenessScore),
    weight: 0.30,
    weighted: completenessScore * 0.30,
    reason: missingFields.length === 0
      ? 'All required fields are populated'
      : `Missing ${missingFields.length} fields: ${missingFields.slice(0, 3).join(', ')}${missingFields.length > 3 ? '...' : ''}`,
    suggestions: missingFields.length > 0
      ? [`Populate: ${missingFields.join(', ')}`]
      : undefined,
  })

  // ── Freshness (25% weight) ─────────────────────────────────────────────────
  const freshnessScore = scoreFreshness(input.dataAgeHours ?? 24)
  factors.push({
    dimension: 'Freshness',
    score: freshnessScore,
    weight: 0.25,
    weighted: freshnessScore * 0.25,
    reason: input.dataAgeHours !== undefined
      ? input.dataAgeHours < 1 ? 'Data is less than 1 hour old'
        : input.dataAgeHours < 24 ? `Data is ${Math.round(input.dataAgeHours)} hours old`
        : `Data is ${Math.round(input.dataAgeHours / 24)} days old`
      : 'Data age unknown — assuming 24h default',
  })

  // ── Trust (20% weight) ─────────────────────────────────────────────────────
  const trustScore = input.providerIsTemporary
    ? Math.min(60, input.providerConfidence) // Cap demo providers at 60
    : input.providerConfidence

  factors.push({
    dimension: 'Trust',
    score: Math.round(trustScore),
    weight: 0.20,
    weighted: trustScore * 0.20,
    reason: input.providerIsTemporary
      ? 'Temporary/demo provider — lower trust ceiling'
      : `Provider confidence: ${Math.round(input.providerConfidence)}%`,
  })

  // ── Consistency (10% weight) ───────────────────────────────────────────────
  const issueCount = input.consistencyIssues?.length ?? 0
  const consistencyScore = Math.max(0, 100 - issueCount * 20)
  factors.push({
    dimension: 'Consistency',
    score: consistencyScore,
    weight: 0.10,
    weighted: consistencyScore * 0.10,
    reason: issueCount === 0
      ? 'No internal consistency issues detected'
      : `${issueCount} consistency issue(s) found`,
    suggestions: input.consistencyIssues,
  })

  // ── Accuracy (10% weight) ──────────────────────────────────────────────────
  const accuracyScore = input.crossValidationScore ?? 50
  factors.push({
    dimension: 'Accuracy',
    score: Math.round(accuracyScore),
    weight: 0.10,
    weighted: accuracyScore * 0.10,
    reason: input.crossValidationScore !== undefined
      ? `Cross-provider validation: ${Math.round(accuracyScore)}%`
      : 'No cross-provider validation available',
  })

  // ── Duplicate Risk (5% weight) ─────────────────────────────────────────────
  const dupScore = 100 - (input.duplicateScore ?? 0)
  factors.push({
    dimension: 'Uniqueness',
    score: Math.round(dupScore),
    weight: 0.05,
    weighted: dupScore * 0.05,
    reason: (input.duplicateScore ?? 0) < 20
      ? 'Low duplicate risk'
      : (input.duplicateScore ?? 0) < 60
      ? 'Moderate duplicate risk'
      : 'High duplicate risk — may be a duplicate record',
  })

  // ── Composite ──────────────────────────────────────────────────────────────
  const overall = Math.round(
    factors.reduce((sum, f) => sum + f.weighted, 0)
  )

  return {
    completeness: Math.round(completenessScore),
    freshness: freshnessScore,
    accuracy: Math.round(accuracyScore),
    duplicateRisk: input.duplicateScore ?? 0,
    trustScore: Math.round(trustScore),
    consistency: consistencyScore,
    overall: Math.min(100, Math.max(0, overall)),
    factors,
  }
}

// ─── Property Quality Assessment ─────────────────────────────────────────────

const PROPERTY_REQUIRED_FIELDS = [
  'id', 'propertyType', 'city', 'community', 'bedrooms',
  'askingPrice', 'carpetAreaSqft', 'latitude', 'longitude',
  'constructionStatus', 'intent',
]

/**
 * Specialized quality assessment for CanonicalProperty records.
 */
export function assessPropertyQuality(
  property: Record<string, unknown>,
  providerConfidence: number,
  isTemporary: boolean,
  dataAgeHours?: number
): DataQualityScore {
  const populated = PROPERTY_REQUIRED_FIELDS.filter(f => {
    const val = property[f]
    return val !== null && val !== undefined && val !== '' && val !== 0
  })

  const issues: string[] = []

  // Check configuration consistency
  const config = property.configuration as Record<string, unknown> | undefined
  if (config) {
    const carpetArea = config.carpetAreaSqft as number | undefined
    const superBuiltUp = config.superBuiltUpSqft as number | undefined

    if (carpetArea && superBuiltUp && carpetArea > superBuiltUp) {
      issues.push('Carpet area exceeds super built-up area')
    }
    if (carpetArea && carpetArea < 50) {
      issues.push('Carpet area suspiciously small (< 50 sqft)')
    }
    if (carpetArea && carpetArea > 50000) {
      issues.push('Carpet area suspiciously large (> 50,000 sqft)')
    }
  }

  // Check price consistency
  const price = property.askingPrice as number | undefined
  const pricePerSqft = property.pricePerSqft as number | undefined
  if (price && pricePerSqft) {
    if (pricePerSqft < 10) issues.push('Price per sqft suspiciously low')
    if (pricePerSqft > 100000) issues.push('Price per sqft suspiciously high')
  }

  return assessDataQuality({
    requiredFields: PROPERTY_REQUIRED_FIELDS,
    populatedFields: populated,
    dataAgeHours,
    providerConfidence,
    providerIsTemporary: isTemporary,
    consistencyIssues: issues.length > 0 ? issues : undefined,
  })
}

// ─── Market Data Quality Assessment ──────────────────────────────────────────

const MARKET_REQUIRED_FIELDS = [
  'marketKey', 'metric', 'value', 'period', 'periodType', 'source',
]

export function assessMarketDataQuality(
  metric: Record<string, unknown>,
  providerConfidence: number,
  isTemporary: boolean,
  dataAgeHours?: number
): DataQualityScore {
  const populated = MARKET_REQUIRED_FIELDS.filter(f => {
    const val = metric[f]
    return val !== null && val !== undefined && val !== ''
  })

  const issues: string[] = []
  const value = metric.value as number | undefined
  if (value !== undefined && value < 0) {
    issues.push('Negative metric value')
  }

  return assessDataQuality({
    requiredFields: MARKET_REQUIRED_FIELDS,
    populatedFields: populated,
    dataAgeHours,
    providerConfidence,
    providerIsTemporary: isTemporary,
    consistencyIssues: issues.length > 0 ? issues : undefined,
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreFreshness(ageHours: number): number {
  if (ageHours <= 1) return 100
  if (ageHours <= 6) return 95
  if (ageHours <= 24) return 85
  if (ageHours <= 72) return 70
  if (ageHours <= 168) return 55     // 1 week
  if (ageHours <= 720) return 35     // 1 month
  if (ageHours <= 2160) return 20    // 3 months
  return 5
}
