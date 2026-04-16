// ━━━ VerixShield Price Intelligence Engine — Type Definitions ━━━━━━━━━━━━━

export type VerixShieldStatusType = 'FAIR' | 'OVERPRICED' | 'UNDERPRICED' | 'SUSPICIOUS' | 'INSUFFICIENT_DATA'
export type EntityType = 'MANUAL_PROPERTY' | 'PROJECT'

// ── Input types ──

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
}

// ── Service output types ──

export interface ValuationResult {
  estimatedMin: number
  estimatedMax: number
  estimatedMedian: number
  confidence: number  // 0-100
  confidenceReasons: string[]
  modelVersion: string
}

export interface ComparableProperty {
  id: string
  title: string
  price: number
  pricePerSqft: number
  sqft: number
  bhk: number
  city: string
  community?: string
  distance?: number  // km
  source: string
  similarity: number  // 0-100
}

export interface ComparablesResult {
  comparables: ComparableProperty[]
  avgPricePerSqft: number
  medianPrice: number
  count: number
}

export interface TrendDataPoint {
  period: string      // "2026-04"
  avgPricePerSqft: number
  medianPrice: number
  totalListings: number
  priceChangePercent?: number | null
}

export interface TrendResult {
  trend: TrendDataPoint[]
  overallChange: number  // percentage over full period
  direction: 'up' | 'down' | 'stable'
}

export interface MarketSignalResult {
  demandScore: number     // 0-100
  supplyScore: number     // 0-100
  listingVelocity: number // new listings per week
  avgDaysOnMarket: number
  inventoryMonths?: number | null
  priceToRentRatio?: number | null
  dataPointCount: number
}

export interface RuleEngineResult {
  status: VerixShieldStatusType
  deviation: number        // percentage
  pricePosition: number    // 0-100 percentile
  flags: string[]
  suggestedMinPrice: number
  suggestedMaxPrice: number
}

export interface RentalIntelligence {
  estimatedRentalMin: number
  estimatedRentalMax: number
  rentalYield: number     // percentage
}

export interface PriceDistribution {
  min: number
  p10: number
  p25: number
  median: number
  p75: number
  p90: number
  max: number
}

// ── Orchestrator unified response ──

export interface VerixShieldResponse {
  propertyId: string
  entityType: EntityType

  valuation: {
    min: number
    max: number
    median: number
    confidence: number
    confidenceReasons: string[]
  }

  askingPrice: number | null
  deviation: number
  status: VerixShieldStatusType
  pricePosition: number

  trend: TrendDataPoint[]
  trendDirection: 'up' | 'down' | 'stable'
  trendOverallChange: number

  comparables: ComparableProperty[]
  comparablesStats: {
    count: number
    avgPricePerSqft: number
    medianPrice: number
  }

  distribution: PriceDistribution

  rental: RentalIntelligence

  signals: MarketSignalResult

  negotiation: {
    suggestedMin: number
    suggestedMax: number
    strategy: string
  }

  meta: {
    computedAt: string
    expiresAt: string
    modelVersion: string
    cached: boolean
  }
}
