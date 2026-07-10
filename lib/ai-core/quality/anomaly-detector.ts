// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Anomaly Detector
// Phase 3: Data Quality Engine
//
// Statistical anomaly detection for incoming data.
// Detects: price outliers, area/price ratio violations, temporal inconsistencies.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Anomaly Result ──────────────────────────────────────────────────────────

export interface AnomalyResult {
  isAnomaly: boolean
  anomalies: Anomaly[]
  overallSeverity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface Anomaly {
  type: AnomalyType
  field: string
  value: unknown
  expected?: { min?: number; max?: number; median?: number }
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  zScore?: number                   // How many std deviations from mean
}

export type AnomalyType =
  | 'PRICE_OUTLIER'
  | 'AREA_OUTLIER'
  | 'RATIO_VIOLATION'
  | 'TEMPORAL_INCONSISTENCY'
  | 'STATISTICAL_OUTLIER'
  | 'IMPOSSIBLE_VALUE'

// ─── Price Anomaly Detection ─────────────────────────────────────────────────

/**
 * Detect price anomalies using Z-score method.
 * Compares a property's price per sqft against market statistics.
 */
export function detectPriceAnomaly(
  pricePerSqft: number,
  marketStats: { mean: number; stdDev: number; median: number; count: number }
): Anomaly | null {
  if (marketStats.count < 5 || marketStats.stdDev === 0) return null

  const zScore = (pricePerSqft - marketStats.mean) / marketStats.stdDev

  if (Math.abs(zScore) < 2) return null // Within 2 std deviations = normal

  const severity: Anomaly['severity'] =
    Math.abs(zScore) >= 4 ? 'CRITICAL' :
    Math.abs(zScore) >= 3 ? 'HIGH' : 'MEDIUM'

  const direction = zScore > 0 ? 'above' : 'below'

  return {
    type: 'PRICE_OUTLIER',
    field: 'pricePerSqft',
    value: pricePerSqft,
    expected: {
      min: marketStats.mean - 2 * marketStats.stdDev,
      max: marketStats.mean + 2 * marketStats.stdDev,
      median: marketStats.median,
    },
    severity,
    message: `Price per sqft (${Math.round(pricePerSqft)}) is ${Math.abs(Math.round(zScore * 100) / 100)} std deviations ${direction} market average (${Math.round(marketStats.mean)})`,
    zScore: Math.round(zScore * 100) / 100,
  }
}

// ─── Area Sanity Checks ──────────────────────────────────────────────────────

/**
 * Detect area-related anomalies.
 */
export function detectAreaAnomalies(
  carpetArea: number | undefined,
  superBuiltUp: number | undefined,
  bedrooms: number
): Anomaly[] {
  const anomalies: Anomaly[] = []

  // Impossible values
  if (carpetArea !== undefined) {
    if (carpetArea <= 0) {
      anomalies.push({
        type: 'IMPOSSIBLE_VALUE',
        field: 'carpetAreaSqft',
        value: carpetArea,
        severity: 'CRITICAL',
        message: 'Carpet area is zero or negative',
      })
    } else if (carpetArea < 100) {
      anomalies.push({
        type: 'AREA_OUTLIER',
        field: 'carpetAreaSqft',
        value: carpetArea,
        expected: { min: 100 },
        severity: 'HIGH',
        message: `Carpet area (${carpetArea} sqft) is unusually small`,
      })
    } else if (carpetArea > 100000) {
      anomalies.push({
        type: 'AREA_OUTLIER',
        field: 'carpetAreaSqft',
        value: carpetArea,
        expected: { max: 100000 },
        severity: 'HIGH',
        message: `Carpet area (${carpetArea} sqft) is unusually large`,
      })
    }
  }

  // Carpet vs Super Built-Up ratio
  if (carpetArea && superBuiltUp) {
    const ratio = carpetArea / superBuiltUp
    if (ratio > 1) {
      anomalies.push({
        type: 'RATIO_VIOLATION',
        field: 'builtUpRatio',
        value: ratio,
        expected: { max: 1 },
        severity: 'HIGH',
        message: 'Carpet area exceeds super built-up area — data error',
      })
    } else if (ratio < 0.5) {
      anomalies.push({
        type: 'RATIO_VIOLATION',
        field: 'builtUpRatio',
        value: ratio,
        expected: { min: 0.5 },
        severity: 'MEDIUM',
        message: `Carpet-to-built-up ratio (${Math.round(ratio * 100)}%) is unusually low`,
      })
    }
  }

  // Bedroom vs area sanity
  if (carpetArea && bedrooms > 0) {
    const sqftPerBedroom = carpetArea / bedrooms
    if (sqftPerBedroom < 100) {
      anomalies.push({
        type: 'RATIO_VIOLATION',
        field: 'sqftPerBedroom',
        value: sqftPerBedroom,
        expected: { min: 100 },
        severity: 'MEDIUM',
        message: `${Math.round(sqftPerBedroom)} sqft per bedroom is unusually small`,
      })
    }
  }

  return anomalies
}

// ─── Temporal Consistency ────────────────────────────────────────────────────

/**
 * Detect temporal inconsistencies (future dates, impossible timelines).
 */
export function detectTemporalAnomalies(params: {
  listedAt?: string
  updatedAt?: string
  constructionYear?: number
}): Anomaly[] {
  const anomalies: Anomaly[] = []
  const now = new Date()
  const currentYear = now.getFullYear()

  if (params.listedAt) {
    const listed = new Date(params.listedAt)
    if (listed > now) {
      anomalies.push({
        type: 'TEMPORAL_INCONSISTENCY',
        field: 'listedAt',
        value: params.listedAt,
        severity: 'HIGH',
        message: 'Listed date is in the future',
      })
    }
  }

  if (params.constructionYear) {
    if (params.constructionYear > currentYear + 10) {
      anomalies.push({
        type: 'TEMPORAL_INCONSISTENCY',
        field: 'constructionYear',
        value: params.constructionYear,
        severity: 'MEDIUM',
        message: `Construction year ${params.constructionYear} is more than 10 years in the future`,
      })
    }
    if (params.constructionYear < 1900) {
      anomalies.push({
        type: 'TEMPORAL_INCONSISTENCY',
        field: 'constructionYear',
        value: params.constructionYear,
        severity: 'HIGH',
        message: `Construction year ${params.constructionYear} is before 1900`,
      })
    }
  }

  return anomalies
}

// ─── Full Anomaly Check ──────────────────────────────────────────────────────

/**
 * Run all anomaly checks on a property record and return aggregate result.
 */
export function detectAllAnomalies(params: {
  pricePerSqft?: number
  marketStats?: { mean: number; stdDev: number; median: number; count: number }
  carpetArea?: number
  superBuiltUp?: number
  bedrooms?: number
  listedAt?: string
  updatedAt?: string
  constructionYear?: number
}): AnomalyResult {
  const anomalies: Anomaly[] = []

  // Price
  if (params.pricePerSqft && params.marketStats) {
    const priceAnomaly = detectPriceAnomaly(params.pricePerSqft, params.marketStats)
    if (priceAnomaly) anomalies.push(priceAnomaly)
  }

  // Area
  anomalies.push(
    ...detectAreaAnomalies(params.carpetArea, params.superBuiltUp, params.bedrooms ?? 0)
  )

  // Temporal
  anomalies.push(
    ...detectTemporalAnomalies({
      listedAt: params.listedAt,
      updatedAt: params.updatedAt,
      constructionYear: params.constructionYear,
    })
  )

  // Determine overall severity
  let overallSeverity: AnomalyResult['overallSeverity'] = 'NONE'
  if (anomalies.some(a => a.severity === 'CRITICAL')) overallSeverity = 'CRITICAL'
  else if (anomalies.some(a => a.severity === 'HIGH')) overallSeverity = 'HIGH'
  else if (anomalies.some(a => a.severity === 'MEDIUM')) overallSeverity = 'MEDIUM'
  else if (anomalies.length > 0) overallSeverity = 'LOW'

  return {
    isAnomaly: anomalies.length > 0,
    anomalies,
    overallSeverity,
  }
}
