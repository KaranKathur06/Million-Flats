import { z } from 'zod'
import { getCategorySchema, type CategoryField } from '@/lib/ecosystem/admin/categoryFieldRegistry'
import type { EcosystemCategorySlug } from '@/lib/ecosystemPartners'

// ─── Common partner schema (shared across all categories) ──────────

export const commonPartnerSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Business name is required').max(300),
  slug: z.string().max(200).optional().nullable(),
  tagline: z.string().max(500).optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  description: z.string().optional().nullable(),
  logo: z.string().max(2000).optional().nullable(),
  coverImage: z.string().max(2000).optional().nullable(),
  rating: z.number().min(0).max(5).optional().nullable(),
  yearsExperience: z.number().int().min(0).optional().nullable(),
  experienceDisplay: z.string().max(100).optional().nullable(),
  projectsCompleted: z.number().int().min(0).optional().nullable(),
  teamSize: z.number().int().min(0).optional().nullable(),
  partnerSince: z.number().int().min(1990).max(2100).optional().nullable(),
  locationCoverage: z.string().max(500).optional().nullable(),
  pricingRange: z.string().max(200).optional().nullable(),
  contactPerson: z.string().max(200).optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal('')),
  contactPhone: z.string().max(30).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  gstNumber: z.string().max(50).optional().nullable(),
  registrationNumber: z.string().max(100).optional().nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
  isFeatured: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
  priorityOrder: z.number().int().min(0).optional(),
  metaTitle: z.string().max(300).optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  metaKeywords: z.string().max(500).optional().nullable(),
})

// ─── Category-specific Zod schema builder ──────────────────────────

function fieldToZod(field: CategoryField): z.ZodTypeAny {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
    case 'url':
    case 'textarea':
    case 'boolean-select': {
      let schema: z.ZodTypeAny = z.string()
      if (field.validation?.maxLength) {
        schema = z.string().max(field.validation.maxLength)
      }
      return field.required ? schema : schema.optional().nullable()
    }
    case 'number': {
      let schema: z.ZodTypeAny = z.number()
      if (field.validation?.min != null) schema = z.number().min(field.validation.min)
      if (field.validation?.max != null) schema = z.number().max(field.validation.max)
      return field.required ? schema : schema.optional().nullable()
    }
    case 'select': {
      if (field.options?.length) {
        const schema: z.ZodTypeAny = z.enum(field.options as [string, ...string[]])
        return field.required ? schema : schema.optional().nullable()
      }
      return field.required ? z.string().min(1) : z.string().optional().nullable()
    }
    case 'multiselect':
    case 'tags': {
      const schema: z.ZodTypeAny = z.array(z.string())
      return field.required ? schema.pipe(z.array(z.string()).min(1)) : schema.optional().nullable()
    }
    default:
      return z.unknown().optional()
  }
}

/**
 * Build a Zod schema for category-specific data (the `categoryData` JSON).
 */
export function getCategoryDataSchema(slug: string): z.ZodObject<Record<string, z.ZodTypeAny>> | null {
  const schema = getCategorySchema(slug)
  if (!schema) return null

  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of schema.fields) {
    shape[field.name] = fieldToZod(field)
  }
  return z.object(shape)
}

/**
 * Validate category-specific data against the category's schema.
 * Returns { valid, errors } — errors is a human-readable array.
 */
export function validateCategoryData(
  categorySlug: string,
  categoryData: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const zodSchema = getCategoryDataSchema(categorySlug)
  if (!zodSchema) return { valid: true, errors: [] }

  const result = zodSchema.safeParse(categoryData)
  if (result.success) return { valid: true, errors: [] }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join('.')
    return `${path}: ${issue.message}`
  })

  return { valid: false, errors }
}

/**
 * Build a full partner validation schema (common + category-specific).
 */
export function buildFullPartnerSchema(categorySlug: string) {
  const categoryDataSchema = getCategoryDataSchema(categorySlug)

  return commonPartnerSchema.extend({
    categoryData: categoryDataSchema
      ? categoryDataSchema.optional().nullable()
      : z.record(z.unknown()).optional().nullable(),
  })
}
