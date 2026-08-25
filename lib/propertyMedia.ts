export const SHARED_MEDIA_CATEGORIES = ['hero', 'exterior', 'amenities', 'lifestyle', 'floor_plan', 'other'] as const

export const PROPERTY_MEDIA_CATEGORIES = SHARED_MEDIA_CATEGORIES

export type PropertyMediaCategory = (typeof PROPERTY_MEDIA_CATEGORIES)[number]

export type SharedMediaCategory = (typeof SHARED_MEDIA_CATEGORIES)[number]

const TO_STORAGE: Record<PropertyMediaCategory, string> = {
  hero: 'COVER',
  exterior: 'EXTERIOR',
  amenities: 'AMENITIES',
  lifestyle: 'EXTERIOR',
  floor_plan: 'FLOOR_PLANS',
  other: 'OTHER',
}

const FROM_STORAGE: Record<string, PropertyMediaCategory> = {
  COVER: 'hero',
  EXTERIOR: 'exterior',
  AMENITIES: 'amenities',
  FLOOR_PLANS: 'floor_plan',
  OTHER: 'other',
}

export function isPropertyMediaCategory(value: unknown): value is PropertyMediaCategory {
  return typeof value === 'string' && (PROPERTY_MEDIA_CATEGORIES as readonly string[]).includes(value.toLowerCase())
}

export function propertyMediaStorageCategory(value: PropertyMediaCategory): string {
  return TO_STORAGE[value]
}

export function propertyMediaCategory(value: string | null | undefined): PropertyMediaCategory {
  const normalized = String(value || '').toUpperCase()
  if (normalized === 'INTERIOR') return 'other'
  return FROM_STORAGE[normalized] || 'exterior'
}

export const PROPERTY_MEDIA_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const

export const PROPERTY_MEDIA_MAX_IMAGE_BYTES = 100 * 1024 * 1024
