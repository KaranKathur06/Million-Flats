export type CountryCode = 'UAE' | 'India'

export const DEFAULT_COUNTRY: CountryCode = 'UAE'

export const INR_PER_AED = 22.5

export const UAE_CITIES = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Ras Al Khaimah',
  'Fujairah',
  'Umm Al Quwain',
] as const

export const INDIA_CITIES = [
  'Mumbai',
  'Delhi NCR',
  'Bangalore',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Kolkata',
  'Ahmedabad',
  'Gurgaon',
  'Noida',
] as const

export const CITIES_BY_COUNTRY: Record<CountryCode, readonly string[]> = {
  UAE: UAE_CITIES,
  India: INDIA_CITIES,
}

export const COUNTRY_META: Record<
  CountryCode,
  {
    currency: 'AED' | 'INR'
    locale: 'en-AE' | 'en-IN'
    currencyLabel: string
    minPrice: number
    maxPrice: number
    priceStep: number
  }
> = {
  UAE: {
    currency: 'AED',
    locale: 'en-AE',
    currencyLabel: 'AED',
    minPrice: 100000,
    maxPrice: 50000000,
    priceStep: 100000,
  },
  India: {
    currency: 'INR',
    locale: 'en-IN',
    currencyLabel: '₹',
    minPrice: 1000000,
    maxPrice: 500000000,
    priceStep: 500000,
  },
}

export function isCountryCode(value: unknown): value is CountryCode {
  return value === 'UAE' || value === 'India'
}

export function uiPriceToAed(country: CountryCode, amount: number) {
  if (country === 'India') {
    return Math.round(amount / INR_PER_AED)
  }
  return amount
}

export function aedToUiPrice(country: CountryCode, amountAed: number) {
  if (country === 'India') {
    return Math.round(amountAed * INR_PER_AED)
  }
  return amountAed
}

export function formatCountryPrice(country: CountryCode, amountAed: number) {
  const meta = COUNTRY_META[country]
  const amount = aedToUiPrice(country, amountAed)
  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency: meta.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
