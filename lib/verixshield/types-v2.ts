// ━━━ VerixShield v2.1 — Intelligence Engine Type Definitions ━━━━━━━━━━━━━
// Extends v1 types without breaking backwards compatibility

export type VerixShieldStatusV2 = 'FAIR' | 'ABOVE_MARKET' | 'UNDERPRICED' | 'HIGH_RISK' | 'INSUFFICIENT_DATA'
export type EntityType = 'MANUAL_PROPERTY' | 'PROJECT'

// ── Input (extended from v1) ──

export interface PropertyInput {
  id: string
  entityType: EntityType
  title?: string
  price?: number | null
  currency?: string
  sqft?: number
  bhk?: number
  propertyType?: string | null
  city?: string | null
  community?: string | null
  latitude?: number | null
  longitude?: number | null
  amenities?: any
  propertyAge?: number | null
  createdAt?: Date | string
  // v2.1 additions
  floor?: number | null
  totalFloors?: number | null
  view?: string | null
  developerName?: string | null
  furnished?: string | null
}

// ── Data Quality Engine ──

export interface DataQualityFactor {
  name: string
  score: number
  weight: number
  weighted: number
  detail: string
}

export interface DataQualityResult {
  score: number
  status: 'HIGH' | 'MEDIUM' | 'LOW'
  allowValuation: boolean
  factors: DataQualityFactor[]
  recommendation: string
}

// ── Normalized Price Engine ──

export interface NormalizationFactors {
  floor: number
  view: number
  developer: number
  furnishing: number
  buildingQuality: number
  compositeFactor: number
}

export interface NormalizationResult {
  rawPricePerSqft: number
  normalizedPricePerSqft: number
  adjustmentFactors: NormalizationFactors
}

// ── Comparable Engine (v2.1 with normalization) ──

export interface ComparablePropertyV2 {
  id: string
  title: string
  price: number
  pricePerSqft: number
  normalizedPricePerSqft: number
  sqft: number
  bhk: number
  city: string
  community?: string
  distance?: number
  source: string
  similarity: number
  recencyWeight: number
}

export interface ComparablesResultV2 {
  comparables: ComparablePropertyV2[]
  rawComparableCount: number
  avgPricePerSqft: number
  medianPricePerSqft: number
  weightedAvgPricePerSqft: number
  timeWeightedPricePerSqft: number
  medianPrice: number
  count: number
  fallbackLevel: string
  pricePerSqftDistribution: number[]
}

// ── ML Engine (multi-model) ──

export interface MLPrediction {
  predictedPrice: number
  predictedPricePerSqft: number
  predictionVariance: number
  featureImportances: Record<string, number>
  modelVersion: string
  modelSegment: string
}

// ── Fusion Engine ──

export interface FusionResult {
  fusedPricePerSqft: number
  fusedPrice: number
  compWeight: number
  mlWeight: number
  fusionMethod: 'weighted_blend' | 'comps_only' | 'ml_only' | 'heuristic'
  fusionReasons: string[]
  modelSegment: string
}

// ── Distribution Engine ──

export interface DistributionResult {
  min: number
  p10: number
  p25: number
  median: number
  p75: number
  p90: number
  max: number
  sampleSize: number
  method: 'empirical' | 'parametric' | 'synthetic'
}

// ── Confidence Engine (v2.1 — 7 factors) ──

export interface ConfidenceFactor {
  name: string
  score: number
  weight: number
  weighted: number
  reason: string
}

export interface ConfidenceResult {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  factors: ConfidenceFactor[]
  reasons: string[]
}

// ── Market Volatility Index ──

export interface MVIResult {
  index: number
  classification: 'STABLE' | 'NORMAL' | 'ELEVATED' | 'VOLATILE'
  factors: {
    priceVarianceTrend: number
    demandFluctuation: number
    transactionVelocityChange: number
  }
  effectiveThreshold: number
}

// ── Demand Intelligence ──

export interface DemandIntelligenceResult {
  score: number
  level: 'HOT' | 'WARM' | 'NORMAL' | 'COLD'
  signals: {
    viewCount: number
    saveCount: number
    enquiryCount: number
  }
  narrative: string
}

// ── Relative Market Position ──

export interface RelativePositionResult {
  percentile: number
  badge: string
  narrative: string
  comparisonBase: number
}

// ── Historical Accuracy ──

export interface HistoricalAccuracyResult {
  score: number
  mape: number | null
  sampleSize: number
  hasData: boolean
  detail: string
}

// ── Anomaly Detection ──

export interface AnomalyResult {
  status: VerixShieldStatusV2
  deviation: number
  pricePosition: number
  dynamicThreshold: number
  flags: string[]
  suggestedMinPrice: number
  suggestedMaxPrice: number
}

// ── Explanation Engine ──

export interface ExplanationFactor {
  icon: string
  label: string
  value: string
  impact: 'positive' | 'negative' | 'neutral'
}

export interface ExplanationResult {
  summary: string
  dataPoints: number
  timeRange: string
  medianPricePerSqft: number
  methodology: string
  keyFactors: ExplanationFactor[]
  disclaimer: string
}

// ── Existing types carried forward ──

export interface TrendDataPoint {
  period: string
  avgPricePerSqft: number
  medianPrice: number
  totalListings: number
  priceChangePercent?: number | null
}

export interface TrendResult {
  trend: TrendDataPoint[]
  overallChange: number
  direction: 'up' | 'down' | 'stable'
}

export interface MarketSignalResult {
  demandScore: number
  supplyScore: number
  listingVelocity: number
  avgDaysOnMarket: number
  inventoryMonths?: number | null
  priceToRentRatio?: number | null
  dataPointCount: number
}

export interface RentalIntelligence {
  estimatedRentalMin: number
  estimatedRentalMax: number
  rentalYield: number
}

// ── Unified v2.1 Response ──

export interface VerixShieldResponseV2 {
  propertyId: string
  entityType: EntityType

  valuation: {
    low: number
    fair: number
    high: number
    confidence: number
    confidenceGrade: string
    confidenceFactors: ConfidenceFactor[]
  }

  askingPrice: number | null
  deviation: number
  status: VerixShieldStatusV2
  pricePosition: number

  trend: TrendDataPoint[]
  trendDirection: 'up' | 'down' | 'stable'
  trendOverallChange: number

  comparables: ComparablePropertyV2[]
  comparablesStats: {
    count: number
    avgPricePerSqft: number
    medianPrice: number
    fallbackLevel: string
  }

  distribution: DistributionResult

  rental: RentalIntelligence

  signals: MarketSignalResult

  negotiation: {
    suggestedMin: number
    suggestedMax: number
    strategy: string
  }

  dataQuality: DataQualityResult

  normalizedPricePerSqft: number
  adjustmentFactors: NormalizationFactors

  historicalAccuracy: HistoricalAccuracyResult

  marketVolatilityIndex: MVIResult

  demandIntelligence: DemandIntelligenceResult

  relativePosition: RelativePositionResult

  explanation: ExplanationResult

  fusion: {
    method: string
    compWeight: number
    mlWeight: number
    modelSegment: string
    reasons: string[]
  }

  meta: {
    computedAt: string
    expiresAt: string
    modelVersion: string
    cached: boolean
    computeTimeMs?: number
  }
}
