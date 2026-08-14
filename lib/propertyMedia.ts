export const SHARED_MEDIA_CATEGORIES = ['hero', 'interior', 'exterior', 'amenities', 'lifestyle', 'floor_plan'] as const

export const PROPERTY_MEDIA_CATEGORIES = SHARED_MEDIA_CATEGORIES

export type PropertyMediaCategory = (typeof PROPERTY_MEDIA_CATEGORIES)[number]

export type SharedMediaCategory = (typeof SHARED_MEDIA_CATEGORIES)[number]

const TO_STORAGE: Record<PropertyMediaCategory, string> = {
  hero: 'COVER',
  interior: 'INTERIOR',
  exterior: 'EXTERIOR',
  amenities: 'AMENITIES',
  lifestyle: 'EXTERIOR',
  floor_plan: 'FLOOR_PLANS',
}

const FROM_STORAGE: Record<string, PropertyMediaCategory> = {
  COVER: 'hero',
  INTERIOR: 'interior',
  EXTERIOR: 'exterior',
  AMENITIES: 'amenities',
  FLOOR_PLANS: 'floor_plan',
}

export function isPropertyMediaCategory(value: unknown): value is PropertyMediaCategory {
  return typeof value === 'string' && (PROPERTY_MEDIA_CATEGORIES as readonly string[]).includes(value.toLowerCase())
}

export function propertyMediaStorageCategory(value: PropertyMediaCategory): string {
  return TO_STORAGE[value]
}

export function propertyMediaCategory(value: string | null | undefined): PropertyMediaCategory {
  return FROM_STORAGE[String(value || '').toUpperCase()] || 'exterior'
}

export const PROPERTY_MEDIA_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const

export const PROPERTY_MEDIA_MAX_IMAGE_BYTES = 100 * 1024 * 1024
