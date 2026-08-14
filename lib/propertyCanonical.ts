export type CanonicalCountry = 'India' | 'United Arab Emirates'

export type CanonicalCountryCode = 'IN' | 'AE'

export type CountryOption = {
  value: string
  label: string
  name: string
  iso2: CanonicalCountryCode
}

export type CityOption = {
  value: string
  label: string
  name: string
  countryCode: CanonicalCountryCode
}

export type CommunityOption = {
  value: string
  label: string
  name: string
  countryCode: CanonicalCountryCode
  city: string
}

const COUNTRY_MAP: Record<CanonicalCountryCode, CanonicalCountry> = {
  IN: 'India',
  AE: 'United Arab Emirates',
}

const COUNTRY_NAME_TO_CODE: Record<string, CanonicalCountryCode> = {
  india: 'IN',
  'united arab emirates': 'AE',
  uae: 'AE',
  ae: 'AE',
  in: 'IN',
}

const CITY_COMMUNITIES: Record<CanonicalCountryCode, Record<string, string[]>> = {
  IN: {
    'Navi Mumbai': ['Kharghar', 'Seawoods', 'Seawoods Darave', 'Bhokarpada', 'Juinagar', 'Panvel', 'Airoli', 'Vashi', 'CBD Belapur', 'Belapur', 'Taloja', 'Kamothe', 'Ulwe', 'Nerul', 'Ghansoli', 'Kopar Khairane', 'Sanpada', 'Kalamboli', 'New Panvel', 'Karanjade', 'Dronagiri'],
    Mumbai: ['Andheri', 'Bandra', 'Powai', 'Worli', 'Marine Lines', 'Lower Parel', 'BKC', 'Borivali', 'Dadar', 'Goregaon', 'Juhu', 'Malad', 'Mulund', 'Chembur', 'Ghatkopar', 'Kandivali', 'Parel', 'Prabhadevi', 'Wadala'],
    Pune: ['Kharadi', 'Wagholi', 'Baner', 'Hinjawadi', 'Koregaon Park', 'Hadapsar', 'Wakad', 'Viman Nagar', 'Kalyani Nagar', 'Aundh', 'Balewadi', 'Mundhwa', 'Pimpri Chinchwad'],
    Bengaluru: ['Whitefield', 'Indiranagar', 'Koramangala', 'Electronic City', 'Sarjapur Road', 'Hebbal', 'Yelahanka', 'Marathahalli', 'HSR Layout', 'Jayanagar'],
    Hyderabad: ['Gachibowli', 'Kondapur', 'Madhapur', 'HITEC City', 'Kokapet', 'Manikonda', 'Jubilee Hills', 'Banjara Hills'],
    Delhi: ['Dwarka', 'Rohini', 'Saket', 'Vasant Kunj', 'Greater Kailash', 'Karol Bagh', 'Connaught Place'],
    Gurugram: ['Golf Course Road', 'Golf Course Extension Road', 'Sohna Road', 'Dwarka Expressway', 'Sector 56', 'Sector 57', 'DLF Phase 1', 'DLF Phase 2'],
    Noida: ['Sector 62', 'Sector 75', 'Sector 76', 'Sector 78', 'Sector 137', 'Noida Extension'],
    Alibag: ['Alibag', 'Varsoli', 'Nagaon', 'Kihim', 'Mandwa', 'Bhokarpada'],
    Alibaug: ['Alibaug', 'Varsoli', 'Nagaon', 'Kihim', 'Mandwa', 'Bhokarpada'],
  },
  AE: {
    Dubai: ['Dubai Marina', 'Jumeirah', 'Business Bay', 'Downtown Dubai', 'Palm Jumeirah', 'JVC'],
    'Abu Dhabi': ['Al Reem Island', 'Saadiyat Island', 'Corniche', 'Khalifa City'],
    Sharjah: ['Al Nahda', 'Muwaileh', 'Al Majaz'],
  },
}

const CITY_DATA: Record<CanonicalCountryCode, string[]> = {
  IN: [
    'Mumbai', 'Navi Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Pune', 'Jaipur',
    'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara',
    'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad',
    'Dhanbad', 'Amritsar', 'Prayagraj', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada',
    'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Gurugram', 'Noida', 'Greater Noida', 'Chandigarh', 'Kochi', 'Goa',
    'Alibag', 'Alibaug',
  ],
  AE: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Al Ain'],
}

export function getCountryOptions(): CountryOption[] {
  return Object.entries(COUNTRY_MAP).map(([iso2, name]) => ({
    value: iso2,
    label: name,
    name,
    iso2: iso2 as CanonicalCountryCode,
  }))
}

export function getCityOptions(countryCode: string): CityOption[] {
  const code = normalizeCountryCode(countryCode)
  const cities = CITY_DATA[code] || []
  return cities.map((name) => ({
    value: name,
    label: name,
    name,
    countryCode: code,
  }))
}

export function getCommunityOptions(countryCode: string, city: string): CommunityOption[] {
  const code = normalizeCountryCode(countryCode)
  const cleanCity = normalizeCanonicalCity(code, city)
  const map = CITY_COMMUNITIES[code] || {}
  const direct = map[cleanCity] || []
  return direct.map((name) => ({
    value: name,
    label: name,
    name,
    countryCode: code,
    city: normalizeTitleCase(cleanCity) || normalizeTitleCase(city),
  }))
}

export function normalizeCanonicalCity(countryCode: string, city: string | null | undefined) {
  const code = normalizeCountryCode(countryCode)
  const normalized = normalizeText(city).toLowerCase()
  const known = (CITY_DATA[code] || []).find((name) => name.toLowerCase() === normalized)
  return known || normalizeTitleCase(String(city || ''))
}

export function isSupportedCanonicalCity(countryCode: string, city: string | null | undefined) {
  const code = normalizeCountryCode(countryCode)
  const normalized = normalizeText(city).toLowerCase()
  return (CITY_DATA[code] || []).some((name) => name.toLowerCase() === normalized)
}

export function normalizeText(value: string | null | undefined): string {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

export function normalizeCountryCode(country: string | null | undefined): CanonicalCountryCode {
  const normalized = normalizeText(country).toLowerCase()
  if (!normalized) return 'IN'
  if (normalized === 'india' || normalized === 'in') return 'IN'
  if (normalized === 'uae' || normalized === 'united arab emirates' || normalized === 'ae') return 'AE'
  if (normalized === 'us' || normalized === 'uk') return 'IN'
  return COUNTRY_NAME_TO_CODE[normalized] || 'IN'
}

export function normalizeLocationPair(countryInput: unknown, cityInput: unknown, communityInput: unknown) {
  const countryName = normalizeText(
    typeof countryInput === 'string' && countryInput.trim() ? countryInput : COUNTRY_MAP[normalizeCountryCode(String(countryInput || ''))]
  )
  const countryCode = normalizeCountryCode(countryName || String(countryInput || ''))
  const country = COUNTRY_MAP[countryCode] || 'India'

  const city = normalizeTitleCase(String(cityInput || ''))
  const community = normalizeTitleCase(String(communityInput || ''))

  return {
    country,
    countryCode,
    city: city || (countryCode === 'IN' ? 'Navi Mumbai' : 'Dubai'),
    community: community || (countryCode === 'IN' && city === 'Navi Mumbai' ? 'Kharghar' : ''),
  }
}

export function normalizeTitleCase(value: string): string {
  const trimmed = normalizeText(value)
  if (!trimmed) return ''

  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((part) => {
      if (!part) return part
      const lower = part.toLowerCase()
      if (['and', 'of', 'the', 'in', 'on', 'at', 'for', 'to', 'a', 'an'].includes(lower) && part !== 'Navi') {
        return lower
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
    .replace(/\bNavi\b/g, 'Navi')
    .replace(/\bKharghar\b/g, 'Kharghar')
    .replace(/\bJvc\b/g, 'JVC')
}

export function canonicalizePropertyImport(payload: unknown) {
  const result: { ok: boolean; errors: string[]; normalized?: any } = { ok: true, errors: [] }

  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: ['Property payload must be an object.'] }
  }

  const root = payload as Record<string, any>
  const supportedPropertyKeys = new Set([
    'title', 'propertyType', 'intent', 'price', 'currency', 'constructionStatus', 'shortDescription',
    'bedrooms', 'bathrooms', 'squareFeet', 'location', 'country', 'city', 'community', 'countryCode',
    'countryIso2', 'address', 'latitude', 'longitude', 'developerName', 'amenities', 'paymentPlanText',
    'emiNote', 'tour3dUrl', 'status', 'sourceUrl', 'schemaVersion', 'property'
  ])

  const unsupported: string[] = []

  const walk = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${path}[${index}]`))
      return
    }

    if (!value || typeof value !== 'object') return

    Object.entries(value as Record<string, any>).forEach(([key, nested]) => {
      const lower = key.toLowerCase()
      if (!supportedPropertyKeys.has(key) && !supportedPropertyKeys.has(lower)) {
        const isMediaField = /image|media|gallery|photo|cover/.test(lower)
        if (isMediaField) {
          unsupported.push(`Unsupported field: ${key}`)
        }
      }

      if (nested && typeof nested === 'object') {
        walk(nested, `${path}.${key}`)
      }
    })
  }

  walk(payload, 'root')

  if (unsupported.length > 0) {
    result.ok = false
    result.errors = Array.from(new Set(unsupported))
    return result
  }

  const record = root.property && typeof root.property === 'object' ? root.property : root
  const locationBody = record.location || {}
  const country = locationBody.country ?? record.country ?? 'India'
  const city = locationBody.city ?? record.city ?? 'Navi Mumbai'
  const community = locationBody.community ?? record.community ?? 'Kharghar'

  const normalized = normalizeLocationPair(country, city, community)
  result.normalized = {
    ...record,
    country: normalized.country,
    countryCode: normalized.country === 'India' ? 'INDIA' : 'UAE',
    countryIso2: normalized.countryCode,
    city: normalized.city,
    community: normalized.community,
    schemaVersion: root.schemaVersion || 'property-import-v1',
  }

  return result
}
