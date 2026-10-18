import { prisma } from '@/lib/prisma'
import { normalizeCanonicalCity, normalizeCountryCode, normalizeText } from '@/lib/propertyCanonical'

export type CityMarketCode = 'INDIA' | 'UAE'
export type CityMarketIso2 = 'IN' | 'AE'
export type CitySearchStatus = 'none' | 'resolved' | 'legacy' | 'ambiguous' | 'unknown'

export type CitySearchScope = {
  status: CitySearchStatus
  input: string
  name: string | null
  countryCode: CityMarketCode | null
  countryIso2: CityMarketIso2 | null
  cityValues: string[]
  communities: string[]
  cityId: string | null
}

const EMPTY_SCOPE = (input = ''): CitySearchScope => ({
  status: 'none',
  input,
  name: null,
  countryCode: null,
  countryIso2: null,
  cityValues: [],
  communities: [],
  cityId: null,
})

const CITY_ALIASES: Record<string, string[]> = {
  'bangalore': ['Bangalore', 'Bengaluru'],
  'bengaluru': ['Bengaluru', 'Bangalore'],
  'gurgaon': ['Gurgaon', 'Gurugram'],
  'gurugram': ['Gurugram', 'Gurgaon'],
  'delhi': ['Delhi', 'New Delhi'],
  'new delhi': ['New Delhi', 'Delhi'],
  'navi mumbai': ['Navi Mumbai'],
}

function marketCode(country: string): CityMarketCode | null {
  if (country === 'IN' || country === 'INDIA') return 'INDIA'
  if (country === 'AE' || country === 'UAE' || country === 'UNITED ARAB EMIRATES') return 'UAE'
  return null
}

function countryInput(value: string | null | undefined): { provided: boolean; code: CityMarketCode | null } {
  const raw = normalizeText(value).toUpperCase()
  if (!raw) return { provided: false, code: null }
  return { provided: true, code: marketCode(raw) }
}

function normalizedCity(value: string) {
  return normalizeText(value).toLowerCase()
}

function cityCandidates(rawCity: string, countryCode: CityMarketCode | null) {
  const rawNormalized = normalizeText(rawCity)
  const aliases = CITY_ALIASES[normalizedCity(rawNormalized)] || []
  const countryIso = countryCode === 'UAE' ? 'AE' : 'IN'
  const normalized = normalizeCanonicalCity(countryIso, rawNormalized)
  const output = new Set<string>([
    normalized,
    normalized.replace(/\s+city$/i, '').trim(),
    ...aliases,
    rawNormalized,
  ])
  return Array.from(output).filter(Boolean)
}

function variants(values: string[]) {
  const output = new Set<string>()
  for (const value of values) {
    const normalized = normalizeText(value)
    if (!normalized) continue
    output.add(normalized)
    output.add(normalized.replace(/\s+/g, '-'))
    output.add(normalized.replace(/\s+/g, '_'))
  }
  return Array.from(output)
}

function iso2(countryCode: CityMarketCode): CityMarketIso2 {
  return countryCode === 'INDIA' ? 'IN' : 'AE'
}

function exactTextConditions(field: 'city' | 'community', values: string[]) {
  return values.map((value) => ({ [field]: { equals: value, mode: 'insensitive' as const } }))
}

export function buildManualPropertyCityFilter(scope: CitySearchScope) {
  if (scope.status === 'none') return null
  if (scope.status === 'unknown' || scope.status === 'ambiguous') return { id: { in: [] as string[] } }
  const communityValues = variants(scope.communities)
  const values = scope.status === 'resolved'
    ? [...scope.cityValues, ...communityValues]
    : scope.cityValues
  return {
    countryCode: scope.countryCode!,
    OR: [
      ...exactTextConditions('city', values),
      ...(scope.status === 'resolved' ? exactTextConditions('community', communityValues) : []),
    ],
  }
}

export function buildProjectCityFilter(scope: CitySearchScope) {
  if (scope.status === 'none') return null
  if (scope.status === 'unknown' || scope.status === 'ambiguous') return { id: { in: [] as string[] } }
  const communityValues = variants(scope.communities)
  const values = scope.status === 'resolved'
    ? [...scope.cityValues, ...communityValues]
    : scope.cityValues
  return {
    countryIso2: scope.countryIso2!,
    OR: [
      ...exactTextConditions('city', values),
      ...(scope.status === 'resolved' ? exactTextConditions('community', communityValues) : []),
    ],
  }
}

export async function resolveCitySearchScope(
  rawCity: string | null | undefined,
  rawCountry?: string | null,
): Promise<CitySearchScope> {
  const input = normalizeText(rawCity)
  if (!input) return EMPTY_SCOPE()

  const country = countryInput(rawCountry)
  if (country.provided && !country.code) return { ...EMPTY_SCOPE(input), status: 'unknown' }

  const candidates = cityCandidates(input, country.code)
  const cityRows = await prisma.city.findMany({
    where: {
      ...(country.code ? { countryCode: country.code } : {}),
      OR: candidates.map((name) => ({ name: { equals: name, mode: 'insensitive' as const } })),
    },
    select: {
      id: true,
      name: true,
      countryCode: true,
      communities: { select: { name: true } },
    },
    take: candidates.length * 2,
  })

  if (cityRows.length > 0) {
    const candidateRank = (name: string) =>
      candidates.findIndex((candidate) => normalizedCity(candidate) === normalizedCity(name))
    const rankedRows = [...cityRows].sort((left, right) => candidateRank(left.name) - candidateRank(right.name))
    const bestRank = candidateRank(rankedRows[0].name)
    const bestRows = rankedRows.filter((row) => candidateRank(row.name) === bestRank)
    if (bestRows.length > 1) return { ...EMPTY_SCOPE(input), status: 'ambiguous' }
    const city = bestRows[0]
    const communities = new Set((city.communities || []).map((community) => community.name))
    if (city.name.toLowerCase() === 'ahmedabad' && city.countryCode === 'INDIA') {
      communities.add('Gift City')
      communities.add('Shilaj')
    }
    return {
      status: 'resolved',
      input,
      name: city.name,
      countryCode: city.countryCode,
      countryIso2: iso2(city.countryCode),
      cityValues: variants([city.name, ...candidates]),
      communities: Array.from(communities),
      cityId: city.id,
    }
  }

  const legacyValues = variants(candidates)
  const legacyConditions = legacyValues.map((name) => ({ city: { equals: name, mode: 'insensitive' as const } }))
  const [propertyMarkets, projectMarkets] = await Promise.all([
    prisma.manualProperty.findMany({
      where: {
        status: 'PUBLISHED',
        sourceType: 'MANUAL',
        ...(country.code ? { countryCode: country.code } : {}),
        OR: legacyConditions,
      },
      select: { countryCode: true },
      distinct: ['countryCode'],
    }),
    prisma.project.findMany({
      where: {
        status: 'PUBLISHED',
        isDeleted: false,
        ...(country.code ? { countryIso2: iso2(country.code) } : {}),
        OR: legacyConditions,
      },
      select: { countryIso2: true },
      distinct: ['countryIso2'],
    }),
  ])

  const markets = new Set<CityMarketCode>()
  propertyMarkets.forEach((row) => markets.add(row.countryCode))
  projectMarkets.forEach((row) => {
    const code = marketCode(row.countryIso2 || '')
    if (code) markets.add(code)
  })
  if (markets.size > 1) return { ...EMPTY_SCOPE(input), status: 'ambiguous' }
  const legacyCountry = country.code || Array.from(markets)[0]
  if (!legacyCountry || markets.size === 0) return { ...EMPTY_SCOPE(input), status: 'unknown' }

  return {
    status: 'legacy',
    input,
    name: null,
    countryCode: legacyCountry,
    countryIso2: iso2(legacyCountry),
    cityValues: legacyValues,
    communities: [],
    cityId: null,
  }
}
