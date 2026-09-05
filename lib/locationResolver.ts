import { CITIES_BY_COUNTRY, INDIA_CITIES, UAE_CITIES } from '@/lib/country'

export type ResolvedLocationCountry = 'IN' | 'AE'
export type LocationResolutionConfidence = 'EXPLICIT' | 'CITY' | 'COMMUNITY' | 'CURRENCY' | 'UNKNOWN'

export interface LocationResolution {
  countryIso2: ResolvedLocationCountry | null
  confidence: LocationResolutionConfidence
  needsReview: boolean
  reason: string
}

const COUNTRY_ALIASES: Record<string, ResolvedLocationCountry> = {
  AE: 'AE',
  UAE: 'AE',
  'UNITED ARAB EMIRATES': 'AE',
  IN: 'IN',
  INDIA: 'IN',
  'REPUBLIC OF INDIA': 'IN',
}

const CITY_ALIASES: Record<string, string> = {
  bengaluru: 'Bangalore',
  bangalore: 'Bangalore',
  gurugram: 'Gurgaon',
  gurgaon: 'Gurgaon',
  thiruvananthapuram: 'Trivandrum',
  trivandrum: 'Trivandrum',
  'new delhi': 'New Delhi',
  delhi: 'New Delhi',
}

const COMMUNITY_COUNTRY_HINTS: Array<{ countryIso2: ResolvedLocationCountry; values: string[] }> = [
  {
    countryIso2: 'IN',
    values: [
      'gachibowli', 'hitech city', 'hi-tech city', 'kokapet', 'nanakramguda', 'nallagandla',
      'golf course road', 'new gurgaon', 'dwarka expressway', 'whitefield', 'sarjapur road',
      'electronic city', 'koramangala', 'hinjewadi', 'wakad', 'thane', 'noida extension',
    ],
  },
  {
    countryIso2: 'AE',
    values: [
      'downtown dubai', 'dubai marina', 'business bay', 'jumeirah village circle', 'jvc',
      'palm jumeirah', 'dubai hills', 'dubai creek harbour', 'arabian ranches', 'al reem island',
      'yas island', 'saadiyat island', 'masdar city', 'jumeirah', 'emirates hills',
    ],
  },
]

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[,_-]+/g, ' ').replace(/\s+/g, ' ')
const canonicalCity = (value: unknown) => CITY_ALIASES[normalize(value)] || String(value ?? '').trim()

function explicitCountry(value: unknown): ResolvedLocationCountry | null {
  return COUNTRY_ALIASES[normalize(value).toUpperCase()] || null
}

function countryFromCity(value: unknown): ResolvedLocationCountry | null {
  const city = normalize(canonicalCity(value))
  if (!city) return null
  if (INDIA_CITIES.some((known) => normalize(known) === city)) return 'IN'
  if (UAE_CITIES.some((known) => normalize(known) === city)) return 'AE'
  return null
}

function countryFromCommunity(value: unknown): ResolvedLocationCountry | null {
  const community = normalize(value)
  if (!community) return null
  const matches = COMMUNITY_COUNTRY_HINTS.filter(({ values }) => values.some((hint) => community === hint || community.includes(hint)))
  return matches.length === 1 ? matches[0].countryIso2 : null
}

export function resolveLocationCountry(input: {
  country?: unknown
  city?: unknown
  community?: unknown
  currency?: unknown
  address?: unknown
}): LocationResolution {
  const explicit = explicitCountry(input.country)
  if (explicit) return { countryIso2: explicit, confidence: 'EXPLICIT', needsReview: false, reason: 'Country was provided explicitly.' }

  const city = countryFromCity(input.city)
  if (city) return { countryIso2: city, confidence: 'CITY', needsReview: false, reason: 'Country was inferred from the city.' }

  const community = countryFromCommunity(input.community)
  if (community) return { countryIso2: community, confidence: 'COMMUNITY', needsReview: false, reason: 'Country was inferred from the community.' }

  const currency = normalize(input.currency).toUpperCase()
  if (currency === 'INR') return { countryIso2: 'IN', confidence: 'CURRENCY', needsReview: false, reason: 'Country was inferred from INR currency.' }
  if (currency === 'AED') return { countryIso2: 'AE', confidence: 'CURRENCY', needsReview: false, reason: 'Country was inferred from AED currency.' }

  const address = normalize(input.address)
  const addressCountry = address.includes('india') ? 'IN' : address.includes('uae') || address.includes('united arab emirates') ? 'AE' : null
  if (addressCountry) return { countryIso2: addressCountry, confidence: 'COMMUNITY', needsReview: false, reason: 'Country was inferred from the address.' }

  return { countryIso2: null, confidence: 'UNKNOWN', needsReview: true, reason: 'Country could not be determined from the supplied location data.' }
}

export function getLocationOptions(countryIso2: string, city: string) {
  const country = countryIso2 === 'IN' ? 'INDIA' : countryIso2 === 'AE' ? 'UAE' : null
  const cities = country ? CITIES_BY_COUNTRY[country] : []
  return { cities: cities.map((value) => ({ value, label: value })), communities: [] as Array<{ value: string; label: string }> }
}
