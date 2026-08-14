import { parsePropertyIdFromSlug, slugify } from '@/lib/seo'

export type ManualPropertyIntentValue = 'SALE' | 'RENT'

export function normalizeManualPropertyIntent(value: unknown): ManualPropertyIntentValue {
  const raw = String(value || '').trim().toUpperCase()
  return raw === 'RENT' ? 'RENT' : 'SALE'
}

export function propertyPurposeFromIntent(intent: unknown): 'buy' | 'rent' {
  return normalizeManualPropertyIntent(intent) === 'RENT' ? 'rent' : 'buy'
}

export function buildManualPropertyPath(args: { id: string | number; title?: string | null; intent?: unknown }) {
  const id = String(args.id || '').trim()
  if (!id) return ''
  const purpose = propertyPurposeFromIntent(args.intent)
  const titleSlug = slugify(String(args.title || 'property'))
  const segment = titleSlug ? `${titleSlug}-${encodeURIComponent(id)}` : encodeURIComponent(id)
  return `/${purpose}/${segment}`
}

export function parseManualPropertySlug(slug: string) {
  return parsePropertyIdFromSlug(slug) || String(slug || '').trim()
}
