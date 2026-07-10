// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Demo Market Data Provider
// Phase 2: Provider Framework — Temporary Demo Provider
//
// ⚠️  TEMPORARY PROVIDER — isTemporary: true
// This provider generates synthetic market data for development and demos.
// It MUST be replaced with licensed data (DLD, RERA, etc.) before production.
//
// Data carries source: 'DEMO_MARKET' through the entire pipeline.
// UI shows "Demo Data" badge when this source is detected.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type {
  IDataProvider,
  CollectionParams,
  ProviderCollectionResult,
  ValidationResult,
  ProviderHealthStatus,
  FreshnessMetadata,
} from './framework/types'
import type { CanonicalMarketMetric } from '../canonical/market'

// ─── Raw Market Data (synthetic) ─────────────────────────────────────────────

interface RawDemoMarketRecord {
  city: string
  community: string
  countryIso2: string
  metric: string
  value: number
  unit: string
  period: string
  periodType: string
}

// ─── Demo Data Seed ──────────────────────────────────────────────────────────

const DEMO_COMMUNITIES: Record<string, Array<{ name: string; basePrice: number; yield: number }>> = {
  'AE:dubai': [
    { name: 'Downtown Dubai', basePrice: 2800, yield: 5.2 },
    { name: 'Dubai Marina', basePrice: 2200, yield: 6.1 },
    { name: 'Jumeirah Village Circle', basePrice: 1100, yield: 7.8 },
    { name: 'Business Bay', basePrice: 2000, yield: 5.8 },
    { name: 'Dubai Hills Estate', basePrice: 1800, yield: 5.5 },
    { name: 'Palm Jumeirah', basePrice: 3500, yield: 4.8 },
    { name: 'Jumeirah Lake Towers', basePrice: 1400, yield: 6.5 },
    { name: 'Arabian Ranches', basePrice: 1600, yield: 5.0 },
    { name: 'DAMAC Hills', basePrice: 1200, yield: 6.8 },
    { name: 'Al Furjan', basePrice: 1050, yield: 7.2 },
  ],
  'AE:abu dhabi': [
    { name: 'Al Reem Island', basePrice: 1200, yield: 6.5 },
    { name: 'Saadiyat Island', basePrice: 2200, yield: 4.8 },
    { name: 'Yas Island', basePrice: 1400, yield: 6.0 },
    { name: 'Al Raha Beach', basePrice: 1300, yield: 5.5 },
  ],
  'IN:mumbai': [
    { name: 'Worli', basePrice: 35000, yield: 2.5 },
    { name: 'Bandra West', basePrice: 42000, yield: 2.2 },
    { name: 'Powai', basePrice: 18000, yield: 3.5 },
    { name: 'Andheri West', basePrice: 22000, yield: 3.0 },
    { name: 'Thane West', basePrice: 12000, yield: 4.2 },
  ],
}

// ─── Generator ───────────────────────────────────────────────────────────────

function generateDemoData(params: CollectionParams): RawDemoMarketRecord[] {
  const records: RawDemoMarketRecord[] = []
  const cityKey = `${params.countryIso2 ?? 'AE'}:${(params.city ?? 'dubai').toLowerCase()}`
  const communities = DEMO_COMMUNITIES[cityKey] ?? DEMO_COMMUNITIES['AE:dubai']

  const filtered = params.community
    ? communities.filter(c => c.name.toLowerCase() === params.community!.toLowerCase())
    : communities

  const currentQuarter = `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  for (const comm of filtered) {
    const countryIso2 = params.countryIso2 ?? 'AE'
    const city = params.city ?? 'Dubai'

    // Generate realistic-looking metrics with small random variations
    const noise = () => 1 + (Math.random() - 0.5) * 0.1 // ±5% noise

    const metrics: Array<{ metric: string; value: number; unit: string }> = [
      { metric: 'MEDIAN_PRICE_PER_SQFT', value: Math.round(comm.basePrice * noise()), unit: 'CURRENCY_PER_SQFT' },
      { metric: 'AVG_PRICE_PER_SQFT', value: Math.round(comm.basePrice * 1.05 * noise()), unit: 'CURRENCY_PER_SQFT' },
      { metric: 'PRICE_PERCENTILE_25', value: Math.round(comm.basePrice * 0.75 * noise()), unit: 'CURRENCY_PER_SQFT' },
      { metric: 'PRICE_PERCENTILE_75', value: Math.round(comm.basePrice * 1.35 * noise()), unit: 'CURRENCY_PER_SQFT' },
      { metric: 'RENTAL_YIELD_AVG', value: Math.round(comm.yield * noise() * 100) / 100, unit: 'PERCENT' },
      { metric: 'PRICE_CHANGE_YOY', value: Math.round((3 + Math.random() * 12) * 100) / 100, unit: 'PERCENT' },
      { metric: 'PRICE_CHANGE_QOQ', value: Math.round((0.5 + Math.random() * 4) * 100) / 100, unit: 'PERCENT' },
      { metric: 'PRICE_CHANGE_MOM', value: Math.round((0.2 + Math.random() * 2) * 100) / 100, unit: 'PERCENT' },
      { metric: 'AVG_DAYS_ON_MARKET', value: Math.round(25 + Math.random() * 45), unit: 'DAYS' },
      { metric: 'ACTIVE_LISTINGS_COUNT', value: Math.round(50 + Math.random() * 200), unit: 'COUNT' },
      { metric: 'TRANSACTIONS_COUNT', value: Math.round(15 + Math.random() * 80), unit: 'COUNT' },
      { metric: 'ABSORPTION_RATE', value: Math.round((40 + Math.random() * 40) * 100) / 100, unit: 'PERCENT' },
      { metric: 'LIST_TO_SALE_RATIO', value: Math.round((92 + Math.random() * 7) * 100) / 100, unit: 'PERCENT' },
      { metric: 'DEMAND_INDEX', value: Math.round(40 + Math.random() * 50), unit: 'INDEX' },
      { metric: 'SUPPLY_INDEX', value: Math.round(30 + Math.random() * 50), unit: 'INDEX' },
      { metric: 'MARKET_HEAT_INDEX', value: Math.round(45 + Math.random() * 45), unit: 'INDEX' },
      { metric: 'VACANCY_RATE', value: Math.round((3 + Math.random() * 12) * 100) / 100, unit: 'PERCENT' },
    ]

    for (const m of metrics) {
      records.push({
        city,
        community: comm.name,
        countryIso2,
        metric: m.metric,
        value: m.value,
        unit: m.unit,
        period: m.unit === 'PERCENT' && m.metric.includes('YOY') ? currentQuarter : currentMonth,
        periodType: m.metric.includes('YOY') || m.metric.includes('QOQ') ? 'QUARTERLY' : 'MONTHLY',
      })
    }
  }

  return records
}

// ─── Provider Implementation ─────────────────────────────────────────────────

export const demoMarketDataProvider: IDataProvider<RawDemoMarketRecord, CanonicalMarketMetric> = {
  name: 'DEMO_MARKET_DATA',
  displayName: 'Demo Market Data (Synthetic)',
  category: 'MARKET_INDICATORS',
  isTemporary: true, // ⚠️ TEMPORARY — replace before production

  async collect(params: CollectionParams): Promise<ProviderCollectionResult<RawDemoMarketRecord>> {
    const start = Date.now()

    // Simulate slight network delay for realism
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100))

    const data = generateDemoData(params)

    return {
      success: true,
      data,
      source: 'DEMO_MARKET_DATA',
      fetchedAt: new Date().toISOString(),
      latencyMs: Date.now() - start,
      totalAvailable: data.length,
    }
  },

  validate(raw: RawDemoMarketRecord): ValidationResult {
    const errors: ValidationResult['errors'] = []
    if (!raw.city) errors.push({ field: 'city', message: 'Missing city', code: 'REQUIRED' })
    if (!raw.metric) errors.push({ field: 'metric', message: 'Missing metric type', code: 'REQUIRED' })
    if (raw.value === undefined || raw.value === null) errors.push({ field: 'value', message: 'Missing value', code: 'REQUIRED' })
    return { isValid: errors.length === 0, errors, warnings: [] }
  },

  normalize(raw: RawDemoMarketRecord): CanonicalMarketMetric {
    const marketKey = [raw.countryIso2, raw.city, raw.community]
      .map(p => p.toLowerCase().trim().replace(/\s+/g, '_'))
      .join(':')

    return {
      marketKey,
      metric: raw.metric as CanonicalMarketMetric['metric'],
      value: raw.value,
      unit: raw.unit as CanonicalMarketMetric['unit'],
      period: raw.period,
      periodType: raw.periodType as CanonicalMarketMetric['periodType'],
      source: 'DEMO_MARKET_DATA',
      confidence: 40, // Low confidence — this is synthetic data
      sampleSize: Math.round(20 + Math.random() * 50),
      version: 1,
      computedAt: new Date().toISOString(),
    }
  },

  deduplicate(items: CanonicalMarketMetric[]): CanonicalMarketMetric[] {
    const seen = new Set<string>()
    return items.filter(item => {
      const key = `${item.marketKey}:${item.metric}:${item.period}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  },

  getHealth(): ProviderHealthStatus {
    return {
      status: 'HEALTHY',
      lastCheckAt: new Date().toISOString(),
      successRate: 100,
      avgLatencyMs: 80,
      totalRequests24h: 0,
      totalErrors24h: 0,
    }
  },

  getFreshness(): FreshnessMetadata {
    return {
      lastFetchAt: new Date().toISOString(),
      ttlSeconds: 3600, // 1 hour
      isStale: false,
    }
  },

  getConfidence(): number {
    return 40 // Low — synthetic demo data
  },
}
