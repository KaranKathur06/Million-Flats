import { BetaAnalyticsDataClient } from '@google-analytics/data'
import type { GAMetrics } from './types'

let _client: BetaAnalyticsDataClient | null = null
let _configLogged = false

const propertyId = String(process.env.GA4_PROPERTY_ID || process.env.GA_PROPERTY_ID || '').trim()
const gaClientEmail = String(process.env.GA_CLIENT_EMAIL || '').trim()
const gaPrivateKey = String(process.env.GA_PRIVATE_KEY || '').trim()

function maskValue(value: string): string {
  if (!value) return '(missing)'
  if (value.length <= 6) return '***'
  return `${value.slice(0, 3)}***${value.slice(-3)}`
}

function logGAConfig(): void {
  if (_configLogged) return
  _configLogged = true

  console.info('[GAService] GA config check:', {
    propertyId: maskValue(propertyId),
    hasGA4PropertyId: Boolean(process.env.GA4_PROPERTY_ID),
    hasGAPropertyId: Boolean(process.env.GA_PROPERTY_ID),
    hasServiceAccountB64: Boolean(process.env.GA4_SERVICE_ACCOUNT_JSON),
    hasClientEmail: Boolean(gaClientEmail),
    hasPrivateKey: Boolean(gaPrivateKey),
  })
}

function getClient(): BetaAnalyticsDataClient | null {
  if (_client) return _client
  logGAConfig()

  const jsonB64 = process.env.GA4_SERVICE_ACCOUNT_JSON
  if (jsonB64) {
    try {
      const decoded = Buffer.from(jsonB64, 'base64').toString('utf-8')
      const credentials = JSON.parse(decoded)
      _client = new BetaAnalyticsDataClient({ credentials })
      return _client
    } catch (e) {
      console.error('[GAService] Failed to parse GA4_SERVICE_ACCOUNT_JSON:', e)
    }
  }

  if (gaClientEmail && gaPrivateKey) {
    try {
      _client = new BetaAnalyticsDataClient({
        credentials: {
          client_email: gaClientEmail,
          private_key: gaPrivateKey.replace(/\\n/g, '\n'),
        },
      })
      return _client
    } catch (e) {
      console.error('[GAService] Failed to initialize GA client from GA_CLIENT_EMAIL/GA_PRIVATE_KEY:', e)
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    _client = new BetaAnalyticsDataClient()
    return _client
  }

  return null
}

function isMockMode(): boolean {
  return !getClient() || !propertyId
}

const MOCK: GAMetrics = {
  monthlyVisitors: 14_200,
  realtimeUsers: 47,
  countries: 28,
  cities: 40,
}

const lastValid = {
  monthlyVisitors: MOCK.monthlyVisitors,
  realtimeUsers: MOCK.realtimeUsers,
  countries: MOCK.countries,
  cities: MOCK.cities,
}

export async function getMonthlyUsers(): Promise<number> {
  if (isMockMode()) return MOCK.monthlyVisitors

  try {
    const client = getClient()!
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }],
    })

    const value = response.rows?.[0]?.metricValues?.[0]?.value
    const parsed = value ? parseInt(value, 10) : 0
    if (parsed > 0) {
      lastValid.monthlyVisitors = parsed
      return parsed
    }
    return lastValid.monthlyVisitors || MOCK.monthlyVisitors
  } catch (err) {
    console.error('[GAService] getMonthlyUsers failed:', err)
    return lastValid.monthlyVisitors || MOCK.monthlyVisitors
  }
}

export async function getRealtimeUsers(): Promise<number> {
  if (isMockMode()) return MOCK.realtimeUsers

  try {
    const client = getClient()!
    const [response] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: 'activeUsers' }],
    })

    const value = response.rows?.[0]?.metricValues?.[0]?.value
    const parsed = value ? parseInt(value, 10) : 0
    if (parsed > 0) {
      lastValid.realtimeUsers = parsed
      return parsed
    }
    return lastValid.realtimeUsers || MOCK.realtimeUsers
  } catch (err) {
    console.error('[GAService] getRealtimeUsers failed:', err)
    return lastValid.realtimeUsers || MOCK.realtimeUsers
  }
}

async function getUniqueDimensionCount(
  dimension: 'country' | 'city',
  fallback: number,
): Promise<number> {
  if (isMockMode()) return fallback

  try {
    const client = getClient()!
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: dimension }],
      metrics: [{ name: 'activeUsers' }],
      limit: 1000,
    })

    console.log(`[GAService] GA RESPONSE (${dimension}):`, JSON.stringify(response, null, 2))

    const values = (response.rows ?? [])
      .map((row) => String(row.dimensionValues?.[0]?.value || '').trim())
      .filter((value) => value && value !== '(not set)')

    const uniqueCount = new Set(values).size
    if (uniqueCount > 0) {
      if (dimension === 'country') lastValid.countries = uniqueCount
      else lastValid.cities = uniqueCount
      return uniqueCount
    }

    const last = dimension === 'country' ? lastValid.countries : lastValid.cities
    console.warn(`[GAService] Empty ${dimension} response, using fallback path.`)
    return last || fallback
  } catch (err) {
    console.error(`[GAService] getUniqueDimensionCount(${dimension}) failed:`, err)
    const last = dimension === 'country' ? lastValid.countries : lastValid.cities
    return last || fallback
  }
}

export async function getUsersByCountry(): Promise<number> {
  return getUniqueDimensionCount('country', MOCK.countries)
}

export async function getUsersByCity(): Promise<number> {
  return getUniqueDimensionCount('city', MOCK.cities)
}

export async function getPageViews(pagePath: string): Promise<number> {
  if (isMockMode()) return 820

  try {
    const client = getClient()!
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'EXACT', value: pagePath },
        },
      },
    })

    const value = response.rows?.[0]?.metricValues?.[0]?.value
    return value ? parseInt(value, 10) : 0
  } catch (err) {
    console.error(`[GAService] getPageViews("${pagePath}") failed:`, err)
    return 0
  }
}

export async function getAllGAMetrics(): Promise<GAMetrics> {
  const [monthlyVisitors, realtimeUsers, countries, cities] = await Promise.all([
    getMonthlyUsers(),
    getRealtimeUsers(),
    getUsersByCountry(),
    getUsersByCity(),
  ])

  return { monthlyVisitors, realtimeUsers, countries, cities }
}
