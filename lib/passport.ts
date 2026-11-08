export const PASSPORT_PRICE_INR = 4999
export const PASSPORT_PRICE_PAISE = PASSPORT_PRICE_INR * 100
export const PASSPORT_CURRENCY = 'INR' as const
export const PASSPORT_PRICE_LABEL = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: PASSPORT_CURRENCY,
  maximumFractionDigits: 0,
}).format(PASSPORT_PRICE_INR)

export const PASSPORT_CATEGORY_META = {
  PROPERTY_BUYERS: {
    label: 'Property Buyers',
    description: 'For people buying or exploring a property purchase.',
  },
  TENANTS_AND_RENTAL_OWNERS: {
    label: 'Tenants & Rental Owners',
    description: 'For tenants and owners involved in residential rentals.',
  },
  REAL_ESTATE_AGENTS: {
    label: 'Real Estate Agents',
    description: 'For independent real estate professionals.',
  },
  REAL_ESTATE_AGENCIES: {
    label: 'Real Estate Agencies',
    description: 'For registered real estate businesses and teams.',
  },
  REAL_ESTATE_DEVELOPERS: {
    label: 'Real Estate Developers',
    description: 'For businesses developing property projects.',
  },
  ECOSYSTEM_PARTNERS: {
    label: 'Ecosystem Partners',
    description: 'For businesses providing services across the property ecosystem.',
  },
} as const

export type PassportCategoryKey = keyof typeof PASSPORT_CATEGORY_META

export const PASSPORT_CATEGORIES = Object.entries(PASSPORT_CATEGORY_META).map(([value, config]) => ({
  value: value as PassportCategoryKey,
  label: config.label,
  description: config.description,
}))

export function getPassportCategoryMeta(category: string) {
  if (!Object.prototype.hasOwnProperty.call(PASSPORT_CATEGORY_META, category)) return null
  return PASSPORT_CATEGORY_META[category as PassportCategoryKey]
}
