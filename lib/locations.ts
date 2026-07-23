export type CountryOption = {
  value: string
  label: string
  iso2: string
  name: string
  region?: string
}

export type CityOption = {
  value: string
  label: string
  id: string
  name: string
  countryCode: string
  group?: string
}

const PINNED_COUNTRIES = ['IN', 'AE', 'US', 'GB']

const COUNTRY_NAMES: Record<string, string> = {
  IN: 'India',
  AE: 'United Arab Emirates',
  US: 'United States',
  GB: 'United Kingdom',
  SG: 'Singapore',
  SA: 'Saudi Arabia',
  QA: 'Qatar',
  BH: 'Bahrain',
  KW: 'Kuwait',
  OM: 'Oman',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  CH: 'Switzerland',
  JP: 'Japan',
  CN: 'China',
  HK: 'Hong Kong',
  MY: 'Malaysia',
  TH: 'Thailand',
  ID: 'Indonesia',
  PH: 'Philippines',
  ZA: 'South Africa',
  BR: 'Brazil',
  MX: 'Mexico',
}

const FALLBACK_COUNTRY_CODES = Object.keys(COUNTRY_NAMES)

function displayCountry(code: string) {
  try {
    const display = new Intl.DisplayNames(['en'], { type: 'region' })
    return display.of(code) || COUNTRY_NAMES[code] || code
  } catch {
    return COUNTRY_NAMES[code] || code
  }
}

function getSupportedRegionCodes() {
  const intlAny = Intl as any
  if (typeof intlAny.supportedValuesOf === 'function') {
    try {
      const regions = intlAny.supportedValuesOf('region') as string[]
      if (Array.isArray(regions) && regions.length > 0) return regions.filter((r) => /^[A-Z]{2}$/.test(r))
    } catch {
      return FALLBACK_COUNTRY_CODES
    }
  }
  return FALLBACK_COUNTRY_CODES
}

export function getCountryOptions(): CountryOption[] {
  const countries = getSupportedRegionCodes().map((code) => ({
    value: code,
    iso2: code,
    name: displayCountry(code),
    label: displayCountry(code),
    region: PINNED_COUNTRIES.includes(code) ? 'Popular' : 'All Countries',
  }))

  return countries.sort((a, b) => {
    const pa = PINNED_COUNTRIES.includes(a.iso2) ? 0 : 1
    const pb = PINNED_COUNTRIES.includes(b.iso2) ? 0 : 1
    if (pa !== pb) return pa - pb
    return a.name.localeCompare(b.name)
  })
}

const CITY_DATA: Record<string, string[]> = {
  IN: [
    'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Pune', 'Jaipur', 'Surat',
    'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad',
    'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad',
    'Amritsar', 'Navi Mumbai', 'Prayagraj', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada',
    'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Gurugram', 'Noida', 'Greater Noida', 'Chandigarh', 'Kochi', 'Goa',
  ],
  AE: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Al Ain', 'Jumeirah', 'Business Bay'],
  US: [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego',
    'Dallas', 'Austin', 'San Jose', 'Fort Worth', 'Jacksonville', 'Columbus', 'Charlotte', 'San Francisco',
    'Indianapolis', 'Seattle', 'Denver', 'Washington', 'Boston', 'Miami', 'Atlanta', 'Las Vegas',
  ],
  GB: [
    'London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Leeds', 'Bristol', 'Sheffield',
    'Edinburgh', 'Cardiff', 'Leicester', 'Coventry', 'Bradford', 'Nottingham', 'Newcastle upon Tyne',
  ],
  SG: ['Singapore'],
  SA: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Dhahran'],
  QA: ['Doha', 'Al Rayyan', 'Al Wakrah', 'Lusail'],
  BH: ['Manama', 'Riffa', 'Muharraq', 'Hamad Town'],
  KW: ['Kuwait City', 'Hawalli', 'Salmiya', 'Farwaniya'],
  OM: ['Muscat', 'Salalah', 'Sohar', 'Nizwa'],
}

export async function getCityOptions(countryCode: string): Promise<CityOption[]> {
  const code = (countryCode || '').toUpperCase()
  const cities = CITY_DATA[code] || []
  return cities.map((name) => ({
    value: `${code}:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    id: `${code}:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    label: name,
    name,
    countryCode: code,
    group: displayCountry(code),
  }))
}

export function getCountryName(countryCode: string) {
  const code = (countryCode || '').toUpperCase()
  return displayCountry(code)
}

export function parseCityName(cityIdOrName: string) {
  const raw = cityIdOrName || ''
  if (!raw.includes(':')) return raw
  return raw.split(':').slice(1).join(':').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
