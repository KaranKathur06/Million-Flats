export interface NormalizedPrice {
  amount: number | null
  currency: string | null
  display: string | null
  unresolved: boolean
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  '₹': 'INR',
  rs: 'INR',
  inr: 'INR',
  '$': 'USD',
  usd: 'USD',
  aed: 'AED',
  dh: 'AED',
}

export function normalizePrice(value: unknown, currencyHint?: unknown): NormalizedPrice {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { amount: null, currency: normalizeCurrency(currencyHint), display: null, unresolved: false }
  }

  const display = String(value).trim()
  if (/contact\s+for\s+price|price\s+on\s+request|on\s+request/i.test(display)) {
    return { amount: null, currency: normalizeCurrency(currencyHint), display, unresolved: true }
  }

  const lower = display.toLowerCase().replace(/,/g, '')
  const currency = normalizeCurrency(currencyHint || lower.match(/₹|rs|inr|\$|usd|aed|dh/)?.[0])
  const numeric = Number(lower.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(numeric)) return { amount: null, currency, display, unresolved: true }

  const multiplier = /crore|cr\b/.test(lower) ? 10_000_000 : /lakh|lac\b/.test(lower) ? 100_000 : /million\b/.test(lower) ? 1_000_000 : 1
  return { amount: numeric * multiplier, currency, display, unresolved: false }
}

export function normalizeCurrency(value: unknown): string | null {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return null
  return CURRENCY_SYMBOLS[normalized] || normalized.toUpperCase()
}
