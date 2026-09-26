import { unstable_cache, revalidatePath, revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { normalizeCanonicalCity, normalizeCountryCode, normalizeText } from '@/lib/propertyCanonical'

export type HeroBannerCategory = 'BUY' | 'RENT' | 'PROJECTS'
export type HeroBannerSource = 'CITY_CATEGORY' | 'CITY' | 'COUNTRY_CATEGORY' | 'GLOBAL_DEFAULT'
export type MarketCountryCode = 'INDIA' | 'UAE'

export type CanonicalSearchCity = {
  id: string | null
  name: string
  countryCode: MarketCountryCode | null
}

export type ResolvedHeroBanner = {
  desktopImage: string | null
  mobileImage: string | null
  desktopAlt: string
  mobileAlt: string
  headline: string
  subheadline: string
  source: HeroBannerSource
}

type BannerContext = {
  category: HeroBannerCategory
  city?: string | null
  country?: string | null
}

const HERO_BANNER_CACHE_TAG = 'hero-banners'
const CANONICAL_CITY_CACHE_TAG = 'canonical-cities'
const CACHE_SECONDS = 300

const LEGACY_DEFAULTS: Record<HeroBannerCategory, Omit<ResolvedHeroBanner, 'source'>> = {
  BUY: {
    desktopImage: '/HOMEPAGE.jpeg',
    mobileImage: null,
    desktopAlt: 'Premium properties across India and the UAE',
    mobileAlt: 'Premium properties across India and the UAE',
    headline: 'Discover Premium Properties',
    subheadline: 'Browse properties available for purchase across India and the UAE. Search by location, property type, configuration, budget and more.',
  },
  RENT: {
    desktopImage: '/HOMEPAGE.jpeg',
    mobileImage: null,
    desktopAlt: 'Rental properties across India and the UAE',
    mobileAlt: 'Rental properties across India and the UAE',
    headline: 'Find Your Next Home',
    subheadline: 'Discover rental properties across India and the UAE. Search by location, property type, configuration, rent and lifestyle preferences.',
  },
  PROJECTS: {
    desktopImage: null,
    mobileImage: null,
    desktopAlt: 'Premium off-plan developments',
    mobileAlt: 'Premium off-plan developments',
    headline: 'Discover Premium Projects',
    subheadline: 'Browse exclusive off-plan developments from the UAE\'s top developers. Golden Visa eligible properties, luxury towers, and waterfront residences.',
  },
}

function toMarketCountryCode(value?: string | null): MarketCountryCode | null {
  const normalized = normalizeCountryCode(value)
  if (normalized === 'IN') return 'INDIA'
  if (normalized === 'AE') return 'UAE'
  return null
}

export function canonicalCityCandidates(rawCity: string) {
  const normalized = normalizeText(rawCity)
  const commaPrefix = normalized.split(',')[0]?.trim() || ''
  const candidates = new Set<string>()

  for (const value of [normalized, commaPrefix]) {
    if (!value) continue
    const clean = normalizeText(value).toLowerCase()
    candidates.add(clean)
    candidates.add(clean.replace(/\s+city$/i, '').trim())
  }

  return Array.from(candidates).filter(Boolean)
}

export async function resolveCanonicalSearchCity(
  rawCity: string | null | undefined,
  rawCountry?: string | null
): Promise<CanonicalSearchCity | null> {
  const cityValue = String(rawCity || '').trim()
  if (!cityValue) return null

  const countryCode = toMarketCountryCode(rawCountry)
  const candidates = canonicalCityCandidates(cityValue)
  const db = prisma as any

  try {
    const rows = await unstable_cache(
      async () => db.city.findMany({
        where: {
          ...(countryCode ? { countryCode } : {}),
          OR: candidates.map((name) => ({ name: { equals: name, mode: 'insensitive' } })),
        },
        select: { id: true, name: true, countryCode: true },
        take: 3,
      }),
      ['canonical-search-city-v1', countryCode || 'any', ...candidates],
      { revalidate: CACHE_SECONDS, tags: [CANONICAL_CITY_CACHE_TAG] }
    )()

    const uniqueRows = Array.from(new Map(rows.map((row: any) => [row.id, row])).values()) as Array<{ id: string; name: string; countryCode: MarketCountryCode }>
    if (uniqueRows.length === 1) {
      const city = uniqueRows[0]
      return { id: city.id, name: city.name, countryCode: city.countryCode }
    }

    const countryIso = countryCode === 'UAE' ? 'AE' : countryCode === 'INDIA' ? 'IN' : 'IN'
    const canonicalInput = candidates[candidates.length - 1] || cityValue
    const fallbackName = normalizeCanonicalCity(countryIso, canonicalInput)
    return {
      id: null,
      name: fallbackName,
      countryCode: uniqueRows.length > 1 ? null : countryCode,
    }
  } catch (error) {
    console.error('[hero-banner] canonical city lookup failed', error)
    const countryIso = countryCode === 'UAE' ? 'AE' : 'IN'
    const canonicalInput = candidates[candidates.length - 1] || cityValue
    return { id: null, name: normalizeCanonicalCity(countryIso, canonicalInput), countryCode }
  }
}

export function heroBannerScopeKey(scope: 'CITY' | 'COUNTRY' | 'GLOBAL', input?: { cityId?: string; countryCode?: MarketCountryCode }) {
  if (scope === 'CITY' && input?.cityId) return `city:${input.cityId}`
  if (scope === 'COUNTRY' && input?.countryCode) return `country:${input.countryCode}`
  return 'global'
}

export function heroBannerCacheTag(scopeKey: string, category: string) {
  return `hero-banner:${encodeURIComponent(scopeKey)}:${category.toLowerCase()}`
}

function safeImageUrl(value: unknown) {
  const imageUrl = String(value || '').trim()
  if (imageUrl.startsWith('/')) return imageUrl
  try {
    const parsed = new URL(imageUrl)
    return parsed.protocol === 'https:' ? imageUrl : null
  } catch {
    return null
  }
}

async function loadCandidates(scopeKeys: string[], category: HeroBannerCategory) {
  const tags = [HERO_BANNER_CACHE_TAG]
  for (const scopeKey of scopeKeys) {
    tags.push(heroBannerCacheTag(scopeKey, category))
    if (scopeKey.startsWith('city:')) tags.push(heroBannerCacheTag(scopeKey, 'GENERIC'))
  }

  return unstable_cache(
    async () => (prisma as any).heroBanner.findMany({
      where: {
        scopeKey: { in: scopeKeys },
        category: { in: [category, ...(scopeKeys.some((key) => key.startsWith('city:')) ? ['GENERIC'] : [])] },
        isActive: true,
      },
      orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
    }),
    ['hero-banner-candidates-v1', ...scopeKeys, category],
    { revalidate: CACHE_SECONDS, tags }
  )()
}

export async function resolveHeroBanner(context: BannerContext): Promise<ResolvedHeroBanner> {
  const legacy = LEGACY_DEFAULTS[context.category]
  try {
    const canonicalCity = await resolveCanonicalSearchCity(context.city, context.country)
    const countryCode = canonicalCity?.countryCode || toMarketCountryCode(context.country)
    const cityKey = canonicalCity?.id ? heroBannerScopeKey('CITY', { cityId: canonicalCity.id }) : null
    const countryKey = countryCode ? heroBannerScopeKey('COUNTRY', { countryCode }) : null
    const scopeKeys = [cityKey, countryKey, 'global'].filter((value): value is string => Boolean(value))
    const candidates = await loadCandidates(scopeKeys, context.category)

    const priorities: Array<{ key: string; category: string; source: HeroBannerSource }> = []
    if (cityKey) {
      priorities.push({ key: cityKey, category: context.category, source: 'CITY_CATEGORY' })
      priorities.push({ key: cityKey, category: 'GENERIC', source: 'CITY' })
    }
    if (countryKey) priorities.push({ key: countryKey, category: context.category, source: 'COUNTRY_CATEGORY' })
    priorities.push({ key: 'global', category: context.category, source: 'GLOBAL_DEFAULT' })

    const selected = priorities
      .map((priority) => ({ priority, banner: candidates.find((item: any) => item.scopeKey === priority.key && item.category === priority.category) }))
      .find(({ banner }) => banner && (safeImageUrl(banner.desktopImageUrl) || (banner.scope === 'GLOBAL' && banner.category === 'PROJECTS')))

    if (!selected) {
      if (context.city && !cityKey) console.info('[hero-banner] no canonical city record; using default banner', { category: context.category })
      return { ...legacy, source: 'GLOBAL_DEFAULT' }
    }

    const banner = selected.banner
    const desktopImage = safeImageUrl(banner.desktopImageUrl)
    const mobileImage = safeImageUrl(banner.mobileImageUrl)
    return {
      desktopImage,
      mobileImage,
      desktopAlt: String(banner.desktopImageAlt || banner.mobileImageAlt || legacy.desktopAlt),
      mobileAlt: String(banner.mobileImageAlt || banner.desktopImageAlt || legacy.mobileAlt),
      headline: String(banner.headline || legacy.headline),
      subheadline: String(banner.subheadline || legacy.subheadline),
      source: selected.priority.source,
    }
  } catch (error) {
    console.error('[hero-banner] resolution failed; using legacy default', { category: context.category, error })
    return { ...legacy, source: 'GLOBAL_DEFAULT' }
  }
}

export function revalidateHeroBannerSurfaces(scopeKey?: string, category?: string) {
  revalidateTag(HERO_BANNER_CACHE_TAG)
  if (scopeKey && category) revalidateTag(heroBannerCacheTag(scopeKey, category))
  if (scopeKey?.startsWith('city:')) revalidateTag(heroBannerCacheTag(scopeKey, 'GENERIC'))
  revalidatePath('/properties')
  revalidatePath('/buy')
  revalidatePath('/rent')
  revalidatePath('/projects')
}

export function revalidateCanonicalCities() {
  revalidateTag(CANONICAL_CITY_CACHE_TAG)
  revalidatePath('/properties')
  revalidatePath('/buy')
  revalidatePath('/rent')
  revalidatePath('/projects')
}