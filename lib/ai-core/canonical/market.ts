// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Canonical Market Model
// Phase 0: Intelligence Foundation
//
// Every market metric flows through:
//   Raw → Normalized → Versioned → Timestamped
//
// Market data is never computed live by AI engines.
// Instead, the Snapshot Engine pre-computes hourly snapshots.
// AI engines consume snapshots from this canonical structure.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Period Types ────────────────────────────────────────────────────────────

export type PeriodType =
  | 'HOURLY'
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY'

// ─── Metric Types ────────────────────────────────────────────────────────────

export type MarketMetricType =
  // Pricing metrics
  | 'MEDIAN_PRICE'
  | 'AVG_PRICE'
  | 'AVG_PRICE_PER_SQFT'
  | 'MEDIAN_PRICE_PER_SQFT'
  | 'PRICE_PERCENTILE_25'
  | 'PRICE_PERCENTILE_75'
  | 'PRICE_CHANGE_MOM'           // Month-over-month %
  | 'PRICE_CHANGE_QOQ'           // Quarter-over-quarter %
  | 'PRICE_CHANGE_YOY'           // Year-over-year %
  // Supply & demand
  | 'INVENTORY_MONTHS'
  | 'ABSORPTION_RATE'
  | 'NEW_LISTINGS_COUNT'
  | 'ACTIVE_LISTINGS_COUNT'
  | 'TRANSACTIONS_COUNT'
  | 'DEMAND_INDEX'
  | 'SUPPLY_INDEX'
  // Rental
  | 'RENTAL_YIELD_AVG'
  | 'AVG_RENT_PER_SQFT'
  | 'RENT_CHANGE_YOY'
  | 'PRICE_TO_RENT_RATIO'
  | 'VACANCY_RATE'
  // Activity
  | 'AVG_DAYS_ON_MARKET'
  | 'LIST_TO_SALE_RATIO'
  | 'CONCESSION_RATE'
  | 'PRICE_DROP_FREQUENCY'
  // Custom/composite
  | 'MARKET_HEAT_INDEX'
  | 'INVESTMENT_GRADE_INDEX'
  | 'AFFORDABILITY_INDEX'

// ─── Canonical Market Metric ─────────────────────────────────────────────────

export interface CanonicalMarketMetric {
  // ── Identity ───────────────────────────────────────────────────────────────
  marketKey: string                 // "{countryIso2}:{city}:{community}" or "{countryIso2}:{city}"
  metric: MarketMetricType
  
  // ── Value ──────────────────────────────────────────────────────────────────
  value: number
  unit: MetricUnit                  // What the value represents
  
  // ── Time ───────────────────────────────────────────────────────────────────
  period: string                    // "2024-Q3", "2024-07", "2024-W28", "2024-07-08T10:00"
  periodType: PeriodType
  
  // ── Provenance ─────────────────────────────────────────────────────────────
  source: string                    // Provider name
  confidence: number                // 0-100
  sampleSize?: number               // How many data points contributed
  
  // ── Versioning ─────────────────────────────────────────────────────────────
  version: number                   // Increment on re-computation
  computedAt: string                // ISO date
}

export type MetricUnit =
  | 'CURRENCY'                      // AED, INR, USD (absolute price)
  | 'CURRENCY_PER_SQFT'             // Price per square foot
  | 'PERCENT'                       // Percentage
  | 'COUNT'                         // Absolute count
  | 'MONTHS'                        // Months of supply
  | 'DAYS'                          // Days on market
  | 'RATIO'                         // Dimensionless ratio
  | 'INDEX'                         // 0-100 index score

// ─── Market Snapshot ─────────────────────────────────────────────────────────
// Pre-computed aggregate of all metrics for a market at a point in time.
// Generated hourly by the Snapshot Engine. AI engines read these directly.

export interface MarketSnapshotData {
  // ── Identity ───────────────────────────────────────────────────────────────
  marketKey: string
  city: string
  community?: string
  countryIso2: string
  snapshotAt: string                // ISO date of snapshot generation
  
  // ── Pricing ────────────────────────────────────────────────────────────────
  medianPrice: number
  avgPricePerSqft: number
  medianPricePerSqft: number
  pricePerSqftP25: number           // 25th percentile
  pricePerSqftP75: number           // 75th percentile
  priceChangeMomPct: number
  priceChangeQoqPct: number
  priceChangeYoyPct: number
  
  // ── Supply & Demand ────────────────────────────────────────────────────────
  demandIndex: number               // 0-100
  supplyIndex: number               // 0-100
  inventoryMonths: number
  absorptionRate: number
  activeListings: number
  newListings30d: number
  transactions30d: number
  
  // ── Rental ─────────────────────────────────────────────────────────────────
  rentalYieldAvg: number            // % annual
  avgRentPerSqft: number
  rentChangeYoyPct: number
  priceToRentRatio: number
  vacancyRate: number
  
  // ── Activity ───────────────────────────────────────────────────────────────
  avgDaysOnMarket: number
  listToSaleRatio: number
  priceDropFrequency: number        // % of listings with price drops
  
  // ── Composite Scores ───────────────────────────────────────────────────────
  marketHeatIndex: number           // 0-100 (100 = very hot)
  investmentGradeIndex: number      // 0-100
  affordabilityIndex: number        // 0-100 (100 = very affordable)
  
  // ── Data Quality ───────────────────────────────────────────────────────────
  dataQualityScore: number          // 0-100
  sampleSize: number                // Total data points used
  sourceCount: number               // Number of independent sources
  version: number                   // Snapshot version
}

// ─── Market Trend ────────────────────────────────────────────────────────────
// A time-series entry for charting and forecasting.

export interface MarketTrendPoint {
  period: string                    // "2024-Q1", "2024-07"
  periodType: PeriodType
  avgPricePerSqft: number
  medianPrice: number
  transactionCount: number
  priceChangePct?: number           // vs previous period
  rentalYield?: number
  demandIndex?: number
  supplyIndex?: number
}

// ─── Market Heat Classification ──────────────────────────────────────────────

export type MarketHeatLevel =
  | 'VERY_HOT'                      // 90-100: extreme seller's market
  | 'HOT'                           // 75-89: strong seller's market
  | 'WARM'                          // 60-74: slight seller advantage
  | 'NEUTRAL'                       // 45-59: balanced market
  | 'COOL'                          // 30-44: slight buyer advantage
  | 'COLD'                          // 15-29: strong buyer's market
  | 'VERY_COLD'                     // 0-14: extreme buyer's market

/**
 * Classify market heat from a 0-100 heat index.
 */
export function classifyMarketHeat(heatIndex: number): MarketHeatLevel {
  if (heatIndex >= 90) return 'VERY_HOT'
  if (heatIndex >= 75) return 'HOT'
  if (heatIndex >= 60) return 'WARM'
  if (heatIndex >= 45) return 'NEUTRAL'
  if (heatIndex >= 30) return 'COOL'
  if (heatIndex >= 15) return 'COLD'
  return 'VERY_COLD'
}

/**
 * Compute a market heat index from supply/demand signals.
 * 0 = dead cold market, 100 = extremely hot.
 */
export function computeMarketHeatIndex(params: {
  demandIndex: number               // 0-100
  supplyIndex: number               // 0-100
  absorptionRate: number            // Monthly absorption rate
  inventoryMonths: number
  priceChangeMomPct: number         // Month-over-month price change
  avgDaysOnMarket: number
}): number {
  const {
    demandIndex,
    supplyIndex,
    absorptionRate,
    inventoryMonths,
    priceChangeMomPct,
    avgDaysOnMarket,
  } = params

  // Demand/Supply ratio component (40% weight)
  const dsRatio = supplyIndex > 0 ? (demandIndex / supplyIndex) : 1
  const dsScore = Math.min(100, dsRatio * 50)

  // Inventory component (25% weight) — lower inventory = hotter
  const invScore = Math.max(0, 100 - inventoryMonths * 8)

  // Price momentum component (20% weight)
  const momentumScore = Math.min(100, Math.max(0, 50 + priceChangeMomPct * 10))

  // Days on market component (15% weight) — fewer days = hotter
  const domScore = Math.max(0, 100 - avgDaysOnMarket * 1.5)

  const raw =
    dsScore * 0.40 +
    invScore * 0.25 +
    momentumScore * 0.20 +
    domScore * 0.15

  return Math.round(Math.min(100, Math.max(0, raw)))
}

/**
 * Compute an affordability index.
 * 100 = very affordable, 0 = extremely expensive.
 * Based on price-to-income ratio concept, simplified for market-level.
 */
export function computeAffordabilityIndex(params: {
  medianPrice: number
  avgPricePerSqft: number
  rentalYield: number
  priceToRentRatio: number
}): number {
  const { medianPrice, avgPricePerSqft, rentalYield, priceToRentRatio } = params

  // Higher yield = more affordable (for investors)
  const yieldScore = Math.min(100, rentalYield * 12)

  // Lower price-to-rent = more affordable
  const ptrScore = Math.max(0, 100 - priceToRentRatio * 3)

  return Math.round((yieldScore * 0.5 + ptrScore * 0.5))
}
