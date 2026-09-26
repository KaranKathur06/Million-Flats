import { convertCurrencyAmount, type DisplayCurrency } from '@/lib/currency'

export type DeveloperPriceCurrency = 'AED' | 'INR'

export function normalizeDeveloperCurrency(value?: string | null): DeveloperPriceCurrency {
  const normalized = String(value || 'AED').trim().toUpperCase()
  return normalized === 'INR' ? 'INR' : 'AED'
}

export function buildDeveloperPriceRange(args: {
  minPrice?: number | null
  maxPrice?: number | null
  sourceCurrency?: string | null
  displayCurrency?: DisplayCurrency
}): string | null {
  const minPrice = Number(args.minPrice)
  const maxPrice = Number(args.maxPrice)
  const sourceCurrency = normalizeDeveloperCurrency(args.sourceCurrency)
  const displayCurrency = args.displayCurrency || sourceCurrency

  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || minPrice <= 0 || maxPrice <= 0) {
    return null
  }

  const convertedMin = convertCurrencyAmount(minPrice, sourceCurrency, displayCurrency)
  const convertedMax = convertCurrencyAmount(maxPrice, sourceCurrency, displayCurrency)

  const formatter = new Intl.NumberFormat(displayCurrency === 'INR' ? 'en-IN' : 'en-AE', {
    style: 'currency',
    currency: displayCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  return `${formatter.format(convertedMin)} - ${formatter.format(convertedMax)}`
}
