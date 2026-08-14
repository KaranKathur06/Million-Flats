import { SHARED_MEDIA_CATEGORIES } from './propertyMedia'

export const PROJECT_MEDIA_CATEGORIES = SHARED_MEDIA_CATEGORIES.filter(category => category !== 'floor_plan')

export const PROJECT_MEDIA_CATEGORY_VALUES = SHARED_MEDIA_CATEGORIES

export type ProjectMediaCategory = (typeof PROJECT_MEDIA_CATEGORY_VALUES)[number]

export function normalizeProjectMediaCategory(category: string | null | undefined): ProjectMediaCategory | null {
  const normalized = String(category ?? '').trim().toLowerCase()

  if (!normalized) return null

  if (normalized === 'floor_plan' || normalized === 'floor-plan' || normalized === 'floorplan') {
    return 'floor_plan'
  }

  if (PROJECT_MEDIA_CATEGORIES.includes(normalized as typeof PROJECT_MEDIA_CATEGORIES[number])) {
    return normalized as typeof PROJECT_MEDIA_CATEGORIES[number]
  }

  return null
}

export function isProjectMediaCategory(category: string | null | undefined): boolean {
  return normalizeProjectMediaCategory(category) !== null
}

export function projectMediaCategoryToEnum(category: string | null | undefined): string | null {
  const normalized = normalizeProjectMediaCategory(category)
  if (!normalized) return null
  return normalized === 'floor_plan' ? 'FLOOR_PLAN' : normalized.toUpperCase()
}
