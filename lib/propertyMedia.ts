export const PROPERTY_MEDIA_CATEGORIES = [
  'COVER',
  'EXTERIOR',
  'LIVING_ROOM',
  'BEDROOM',
  'KITCHEN',
  'BATHROOM',
  'VIEW',
  'AMENITIES',
  'FLOOR_PLANS',
  'OTHER',
] as const

// Project media retains its established vocabulary; property media uses the
// schema-backed taxonomy above and should not be coerced into these values.
export const SHARED_MEDIA_CATEGORIES = ['hero', 'exterior', 'amenities', 'lifestyle', 'floor_plan', 'other'] as const

export type PropertyMediaCategory = (typeof PROPERTY_MEDIA_CATEGORIES)[number]

export type PropertyMediaAssetType = 'IMAGE' | 'VIDEO' | 'FLOOR_PLAN' | 'BROCHURE'

export type PropertyMediaCategoryOption = {
  value: PropertyMediaCategory
  label: string
}

export const PROPERTY_MEDIA_CATEGORY_OPTIONS: PropertyMediaCategoryOption[] = [
  { value: 'COVER', label: 'Hero' },
  { value: 'EXTERIOR', label: 'Exterior' },
  { value: 'LIVING_ROOM', label: 'Living Room' },
  { value: 'BEDROOM', label: 'Bedroom' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'BATHROOM', label: 'Bathroom' },
  { value: 'VIEW', label: 'View' },
  { value: 'AMENITIES', label: 'Amenities' },
  { value: 'FLOOR_PLANS', label: 'Floor Plan' },
  { value: 'OTHER', label: 'Other' },
]

const LEGACY_CATEGORY_MAP: Record<string, PropertyMediaCategory> = {
  HERO: 'COVER',
  COVER: 'COVER',
  EXTERIOR: 'EXTERIOR',
  LIFESTYLE: 'OTHER',
  INTERIOR: 'OTHER',
  LIVING_ROOM: 'LIVING_ROOM',
  BEDROOM: 'BEDROOM',
  KITCHEN: 'KITCHEN',
  BATHROOM: 'BATHROOM',
  VIEW: 'VIEW',
  AMENITIES: 'AMENITIES',
  FLOOR_PLAN: 'FLOOR_PLANS',
  FLOOR_PLANS: 'FLOOR_PLANS',
  OTHER: 'OTHER',
}

export function isPropertyMediaCategory(value: unknown): value is PropertyMediaCategory {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LEGACY_CATEGORY_MAP, value.toUpperCase())
}

export function propertyMediaStorageCategory(value: string): PropertyMediaCategory {
  return LEGACY_CATEGORY_MAP[value.toUpperCase()] || 'OTHER'
}

export function propertyMediaCategory(value: string | null | undefined): PropertyMediaCategory {
  return propertyMediaStorageCategory(String(value || ''))
}

export const PROPERTY_MEDIA_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
export const PROPERTY_FLOOR_PLAN_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'application/pdf'] as const

export const PROPERTY_MEDIA_MAX_IMAGE_BYTES = 100 * 1024 * 1024
