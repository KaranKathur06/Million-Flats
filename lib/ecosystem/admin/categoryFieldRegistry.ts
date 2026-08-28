import type { EcosystemCategorySlug } from '@/lib/ecosystemPartners'

// ─── Field type definitions ────────────────────────────────────────────

export type CategoryFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'tags'
  | 'boolean-select'

export type CategoryField = {
  /** Key used in categoryData JSON storage */
  name: string
  /** Human-readable label shown in admin UI */
  label: string
  /** Field renderer type */
  type: CategoryFieldType
  /** Section this field belongs to */
  section: string
  /** Whether field is required for this category */
  required?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Help text shown below the field */
  helpText?: string
  /** Options for select/multiselect/boolean-select fields */
  options?: string[]
  /** Validation constraints */
  validation?: {
    min?: number
    max?: number
    maxLength?: number
    pattern?: string
    patternMessage?: string
  }
  /** Grid span: 1 = half width, 2 = full width (default: 1) */
  colSpan?: 1 | 2
}

export type CategorySection = {
  /** Unique key for the section */
  key: string
  /** Section title displayed in the form */
  title: string
  /** Optional description below the title */
  description?: string
}

export type CategorySchema = {
  /** Category slug — must match EcosystemCategorySlug */
  slug: EcosystemCategorySlug
  /** Display label for this category */
  label: string
  /** Sections that organize the category-specific fields */
  sections: CategorySection[]
  /** All category-specific fields */
  fields: CategoryField[]
}

// ─── Registry ──────────────────────────────────────────────────────────

import { homeLoansCategorySchema } from './categorySchemas/home-loans'
import { legalCategorySchema } from './categorySchemas/legal'
import { insuranceCategorySchema } from './categorySchemas/insurance'
import { interiorCategorySchema } from './categorySchemas/interior'
import { packersCategorySchema } from './categorySchemas/packers'
import { propertyManagementCategorySchema } from './categorySchemas/property-management'
import { vastuCategorySchema } from './categorySchemas/vastu'
import { tilesCategorySchema } from './categorySchemas/tiles'
import { hardwareCategorySchema } from './categorySchemas/hardware'
import { cementCategorySchema } from './categorySchemas/cement'
import { smartHomeCategorySchema } from './categorySchemas/smart-home'
import { technologyCategorySchema } from './categorySchemas/technology'

/**
 * Central registry of all 12 ecosystem category schemas.
 * This is the single source of truth for:
 * - Admin form field rendering
 * - Category-specific validation
 * - categoryData JSON structure
 * - Public profile display
 */
export const CATEGORY_SCHEMA_REGISTRY: Record<EcosystemCategorySlug, CategorySchema> = {
  'home-loans-finance': homeLoansCategorySchema,
  'legal-documentation': legalCategorySchema,
  'property-insurance': insuranceCategorySchema,
  'interior-design-renovation': interiorCategorySchema,
  'packers-movers': packersCategorySchema,
  'property-management': propertyManagementCategorySchema,
  'vastu-feng-shui': vastuCategorySchema,
  'tiles-surface-finishing': tilesCategorySchema,
  'hardware-architectural-fittings': hardwareCategorySchema,
  'cement-structural': cementCategorySchema,
  'smart-home-automation': smartHomeCategorySchema,
  'technology-partners': technologyCategorySchema,
}

/**
 * Get category schema by slug. Returns undefined if slug is not recognized.
 */
export function getCategorySchema(slug: string): CategorySchema | undefined {
  return CATEGORY_SCHEMA_REGISTRY[slug as EcosystemCategorySlug]
}

/**
 * Get category schema by category ID — requires a lookup map.
 * Used when the form has a categoryId but needs the schema.
 */
export function getCategorySchemaBySlug(slug: string): CategorySchema | undefined {
  return CATEGORY_SCHEMA_REGISTRY[slug as EcosystemCategorySlug]
}

/**
 * Get all field names for a category (for extracting from raw form data).
 */
export function getCategoryFieldNames(slug: string): string[] {
  const schema = getCategorySchema(slug)
  if (!schema) return []
  return schema.fields.map((f) => f.name)
}

/**
 * Get required field names for a category.
 */
export function getRequiredCategoryFields(slug: string): string[] {
  const schema = getCategorySchema(slug)
  if (!schema) return []
  return schema.fields.filter((f) => f.required).map((f) => f.name)
}
