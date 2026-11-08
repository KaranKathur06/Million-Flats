export const PASSPORT_CATEGORY_META = {
  PROPERTY_BUYERS: {
    label: 'Property Buyers',
    description: 'Priority access to investment intelligence, vetted listings, and buyer support for your next acquisition.',
    price: '₹2,499',
    benefits: ['Priority buying alerts', 'Legal & financing guidance', 'Investor-only events'],
  },
  TENANTS_AND_RENTAL_OWNERS: {
    label: 'Tenants & Rental Owners',
    description: 'Tenant-friendly resources, move-in support, and trusted rental management for a smoother rental journey.',
    price: '₹1,999',
    benefits: ['Rental support', 'Move-in assistance', 'Owner communications'],
  },
  REAL_ESTATE_AGENTS: {
    label: 'Real Estate Agents',
    description: 'A sales-first membership for agents who need visibility, lead quality, and faster completion workflows.',
    price: '₹3,499',
    benefits: ['Qualified leads', 'Market visibility', 'Agent tools'],
  },
  REAL_ESTATE_AGENCIES: {
    label: 'Real Estate Agencies',
    description: 'Scale your agency through stronger discovery, partner access, and local trust signals for active growth.',
    price: '₹5,999',
    benefits: ['Agency visibility', 'Growth partnerships', 'CRM support'],
  },
  REAL_ESTATE_DEVELOPERS: {
    label: 'Real Estate Developers',
    description: 'Build a stronger pipeline with community access, project campaigns, and investor relationship support.',
    price: '₹7,999',
    benefits: ['Project reach', 'Investor access', 'Launch enablement'],
  },
  ECOSYSTEM_PARTNERS: {
    label: 'Ecosystem Partners',
    description: 'For trusted service providers who want a dependable gateway to real-estate clients and strategic referral networks.',
    price: '₹4,499',
    benefits: ['Partner network', 'Client referrals', 'Preferred visibility'],
  },
} as const

export type PassportCategoryKey = keyof typeof PASSPORT_CATEGORY_META

export const PASSPORT_CATEGORIES = Object.entries(PASSPORT_CATEGORY_META).map(([value, config]) => ({
  value: value as PassportCategoryKey,
  label: config.label,
  description: config.description,
  price: config.price,
  benefits: config.benefits,
}))

export function getPassportCategoryMeta(category: string) {
  return PASSPORT_CATEGORY_META[category as PassportCategoryKey] ?? null
}
