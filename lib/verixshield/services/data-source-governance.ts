// ━━━ VerixShield v2.1 — Data Source Governance Layer ━━━━━━━━━━━━━━━━━━━━━
// Defines allowed sources, trust scores, freshness SLAs
// Prevents legal risks and dirty data from corrupting valuations

export interface DataSourceConfig {
  name: string
  type: string
  isAllowed: boolean
  freshnessMaxDays: number
  trustScore: number
  scrapingPolicy: 'PERMITTED' | 'RATE_LIMITED' | 'BLOCKED'
  legalNotes: string
}

export const DATA_SOURCE_REGISTRY: DataSourceConfig[] = [
  {
    name: 'MillionFlats Internal Listings',
    type: 'INTERNAL',
    isAllowed: true,
    freshnessMaxDays: 30,
    trustScore: 80,
    scrapingPolicy: 'PERMITTED',
    legalNotes: 'First-party data, agent-submitted and admin-approved',
  },
  {
    name: 'Dubai Land Department (DLD)',
    type: 'GOVERNMENT',
    isAllowed: true,
    freshnessMaxDays: 90,
    trustScore: 100,
    scrapingPolicy: 'PERMITTED',
    legalNotes: 'Government open data — public domain',
  },
  {
    name: 'Property Finder',
    type: 'SCRAPED',
    isAllowed: true,
    freshnessMaxDays: 14,
    trustScore: 65,
    scrapingPolicy: 'RATE_LIMITED',
    legalNotes: 'Rate-limited scraping per robots.txt compliance',
  },
  {
    name: 'Bayut',
    type: 'SCRAPED',
    isAllowed: true,
    freshnessMaxDays: 14,
    trustScore: 65,
    scrapingPolicy: 'RATE_LIMITED',
    legalNotes: 'Rate-limited scraping per robots.txt compliance',
  },
  {
    name: 'Partner API',
    type: 'PARTNER',
    isAllowed: true,
    freshnessMaxDays: 7,
    trustScore: 85,
    scrapingPolicy: 'PERMITTED',
    legalNotes: 'Licensed partner data via API agreement',
  },
]

export function validateSourceAllowed(source: string): boolean {
  const config = DATA_SOURCE_REGISTRY.find(s => s.type === source || s.name === source)
  return config?.isAllowed ?? false
}

export function getSourceTrustScore(source: string): number {
  const config = DATA_SOURCE_REGISTRY.find(s => s.type === source)
  return config?.trustScore ?? 50
}

export function isDataStale(source: string, listedAt: Date): boolean {
  const config = DATA_SOURCE_REGISTRY.find(s => s.type === source)
  if (!config) return true
  const ageInDays = (Date.now() - listedAt.getTime()) / (24 * 60 * 60 * 1000)
  return ageInDays > config.freshnessMaxDays
}

// Map for use in time-weighted comparables
export const SOURCE_QUALITY_WEIGHTS: Record<string, number> = {
  GOVERNMENT: 1.0,
  PARTNER: 0.85,
  INTERNAL: 0.75,
  SCRAPED: 0.55,
}
