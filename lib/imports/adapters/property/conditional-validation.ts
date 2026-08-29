/**
 * Conditional validation: rules depend on property type and transaction intent.
 * Plots don't need bedrooms/floor; apartments do. All need title and location.
 */

export type PropertyTypeRequirement = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL' | 'NOT_APPLICABLE'

export interface ValidationRule {
  field: string
  requirement: PropertyTypeRequirement
  reason: string
}

export interface ConditionalValidationSchema {
  common: ValidationRule[]
  byPropertyType: Record<string, ValidationRule[]>
  byIntent: Record<string, ValidationRule[]>
}

export interface ValidationContext {
  propertyType?: string | null
  intent?: 'SALE' | 'RENT' | null
  bedrooms?: number | null
  bathrooms?: number | null
  squareFeet?: number | null
  floorLevel?: number | null
  price?: number | null
}

export interface ValidationIssue {
  field: string
  severity: 'ERROR' | 'WARNING' | 'INFO'
  code: string
  message: string
}

const SCHEMA: ConditionalValidationSchema = {
  common: [
    { field: 'title', requirement: 'REQUIRED', reason: 'Property must have a descriptive title.' },
    { field: 'agentId', requirement: 'REQUIRED', reason: 'An existing MillionFlats Agent owner is required.' },
    { field: 'city', requirement: 'RECOMMENDED', reason: 'City location helps with searchability and organization.' },
  ],

  byPropertyType: {
    APARTMENT: [
      { field: 'bedrooms', requirement: 'RECOMMENDED', reason: 'BHK configuration is standard for apartments.' },
      { field: 'bathrooms', requirement: 'RECOMMENDED', reason: 'Bathroom count is typical for residential properties.' },
      { field: 'squareFeet', requirement: 'RECOMMENDED', reason: 'Built-up area is standard for apartments.' },
      { field: 'floorLevel', requirement: 'OPTIONAL', reason: 'Floor level is nice-to-have but not critical.' },
    ],
    FLAT: [
      { field: 'bedrooms', requirement: 'RECOMMENDED', reason: 'BHK configuration is standard for flats.' },
      { field: 'bathrooms', requirement: 'RECOMMENDED', reason: 'Bathroom count is typical for residential properties.' },
      { field: 'squareFeet', requirement: 'RECOMMENDED', reason: 'Built-up area is standard for flats.' },
      { field: 'floorLevel', requirement: 'OPTIONAL', reason: 'Floor level is nice-to-have but not critical.' },
    ],
    VILLA: [
      { field: 'bedrooms', requirement: 'RECOMMENDED', reason: 'BHK configuration is standard for villas.' },
      { field: 'bathrooms', requirement: 'RECOMMENDED', reason: 'Bathroom count is typical for villas.' },
      { field: 'squareFeet', requirement: 'RECOMMENDED', reason: 'Plot area or built-up area is useful for villas.' },
      { field: 'floorLevel', requirement: 'NOT_APPLICABLE', reason: 'Floor level does not apply to independent houses.' },
    ],
    HOUSE: [
      { field: 'bedrooms', requirement: 'RECOMMENDED', reason: 'BHK configuration is standard for houses.' },
      { field: 'bathrooms', requirement: 'RECOMMENDED', reason: 'Bathroom count is typical for houses.' },
      { field: 'squareFeet', requirement: 'RECOMMENDED', reason: 'Plot or built-up area is useful for houses.' },
      { field: 'floorLevel', requirement: 'NOT_APPLICABLE', reason: 'Floor level does not apply to independent houses.' },
    ],
    PLOT: [
      { field: 'bedrooms', requirement: 'NOT_APPLICABLE', reason: 'Bedrooms do not apply to plots.' },
      { field: 'bathrooms', requirement: 'NOT_APPLICABLE', reason: 'Bathrooms do not apply to plots.' },
      { field: 'squareFeet', requirement: 'RECOMMENDED', reason: 'Plot area is important for pricing and value.' },
      { field: 'floorLevel', requirement: 'NOT_APPLICABLE', reason: 'Floor level does not apply to plots.' },
    ],
    LAND: [
      { field: 'bedrooms', requirement: 'NOT_APPLICABLE', reason: 'Bedrooms do not apply to land.' },
      { field: 'bathrooms', requirement: 'NOT_APPLICABLE', reason: 'Bathrooms do not apply to land.' },
      { field: 'squareFeet', requirement: 'RECOMMENDED', reason: 'Land area is critical for pricing.' },
      { field: 'floorLevel', requirement: 'NOT_APPLICABLE', reason: 'Floor level does not apply to land.' },
    ],
    BUILDER_FLOOR: [
      { field: 'bedrooms', requirement: 'RECOMMENDED', reason: 'BHK configuration is standard for builder floors.' },
      { field: 'bathrooms', requirement: 'RECOMMENDED', reason: 'Bathroom count is typical.' },
      { field: 'squareFeet', requirement: 'RECOMMENDED', reason: 'Built-up area is useful.' },
      { field: 'floorLevel', requirement: 'RECOMMENDED', reason: 'Floor level identifies the unit.' },
    ],
    OFFICE: [
      { field: 'bedrooms', requirement: 'NOT_APPLICABLE', reason: 'Bedrooms do not apply to office spaces.' },
      { field: 'bathrooms', requirement: 'OPTIONAL', reason: 'Commercial offices may list toilet facilities.' },
      { field: 'squareFeet', requirement: 'RECOMMENDED', reason: 'Office carpet area is important.' },
      { field: 'floorLevel', requirement: 'OPTIONAL', reason: 'Floor location matters for commercial properties.' },
    ],
    SHOP: [
      { field: 'bedrooms', requirement: 'NOT_APPLICABLE', reason: 'Bedrooms do not apply to shops.' },
      { field: 'bathrooms', requirement: 'NOT_APPLICABLE', reason: 'Bathrooms do not apply to shops.' },
      { field: 'squareFeet', requirement: 'RECOMMENDED', reason: 'Shop area is critical for retail valuation.' },
      { field: 'floorLevel', requirement: 'OPTIONAL', reason: 'Floor location can affect foot traffic.' },
    ],
  },

  byIntent: {
    SALE: [
      { field: 'price', requirement: 'RECOMMENDED', reason: 'Sale price is highly relevant.' },
    ],
    RENT: [
      { field: 'price', requirement: 'RECOMMENDED', reason: 'Rent amount is highly relevant.' },
    ],
  },
}

export function getValidationRules(context: ValidationContext): ValidationRule[] {
  const rules: ValidationRule[] = [...SCHEMA.common]

  if (context.propertyType) {
    const typeRules = SCHEMA.byPropertyType[context.propertyType] || []
    rules.push(...typeRules)
  }

  if (context.intent && SCHEMA.byIntent[context.intent]) {
    rules.push(...SCHEMA.byIntent[context.intent])
  }

  return rules
}

function getRequirementLevel(rule: ValidationRule, context: ValidationContext): 'ERROR' | 'WARNING' | 'INFO' {
  if (rule.requirement === 'NOT_APPLICABLE') return 'INFO'
  if (rule.requirement === 'REQUIRED') return 'ERROR'
  if (rule.requirement === 'RECOMMENDED') return 'WARNING'
  return 'INFO'
}

export function validateField(
  field: string,
  value: unknown,
  context: ValidationContext,
): ValidationIssue | null {
  const rules = getValidationRules(context)
  const rule = rules.find((r) => r.field === field)

  if (!rule) return null

  if (rule.requirement === 'NOT_APPLICABLE') {
    return {
      field,
      severity: 'INFO',
      code: `NOT_APPLICABLE_${field.toUpperCase()}`,
      message: rule.reason,
    }
  }

  const hasValue = value !== null && value !== undefined && String(value).trim() !== ''

  if (rule.requirement === 'REQUIRED' && !hasValue) {
    return {
      field,
      severity: 'ERROR',
      code: `MISSING_REQUIRED_${field.toUpperCase()}`,
      message: rule.reason,
    }
  }

  if (rule.requirement === 'RECOMMENDED' && !hasValue) {
    return {
      field,
      severity: 'WARNING',
      code: `MISSING_RECOMMENDED_${field.toUpperCase()}`,
      message: rule.reason,
    }
  }

  return null
}

export function validateRecord(canonical: Record<string, unknown>, context: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const fieldsToCheck = [
    'title',
    'agentId',
    'city',
    'bedrooms',
    'bathrooms',
    'squareFeet',
    'floorLevel',
    'price',
  ]

  for (const field of fieldsToCheck) {
    const issue = validateField(field, canonical[field], context)
    if (issue) issues.push(issue)
  }

  return issues
}
