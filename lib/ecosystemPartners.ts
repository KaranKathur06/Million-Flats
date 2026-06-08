export type EcosystemCategorySlug =
  | 'home-loans-finance'
  | 'legal-documentation'
  | 'property-insurance'
  | 'interior-design-renovation'
  | 'packers-movers'
  | 'property-management'
  | 'vastu-feng-shui'
  | 'tiles-surface-finishing'
  | 'hardware-architectural-fittings'
  | 'cement-structural'
  | 'smart-home-automation'

export type EcosystemCategory = {
  slug: EcosystemCategorySlug
  name:
    | 'Home Loans & Finance'
    | 'Legal & Documentation'
    | 'Property Insurance'
    | 'Interior Design & Renovation'
    | 'Packers & Movers'
    | 'Property Management'
    | 'Vastu / Feng Shui Consultants'
    | 'Tiles & Surface Finishing'
    | 'Hardware & Architectural Fittings'
    | 'Cement & Structural'
    | 'Smart Home & Automation'
  description: string
}

export const ECOSYSTEM_CATEGORIES: EcosystemCategory[] = [
  {
    slug: 'home-loans-finance',
    name: 'Home Loans & Finance',
    description:
      'Discover trusted lenders, compare offers, and get matched to the right home loan partner for your profile.',
  },
  {
    slug: 'legal-documentation',
    name: 'Legal & Documentation',
    description:
      'Connect with verified legal experts for due diligence, agreement drafting, registration, and end-to-end compliance.',
  },
  {
    slug: 'property-insurance',
    name: 'Property Insurance',
    description:
      'Find the right coverage for your home or investment with curated providers and clear, comparable policy summaries.',
  },
  {
    slug: 'interior-design-renovation',
    name: 'Interior Design & Renovation',
    description:
      'Get matched with vetted designers and renovation specialists to bring your dream space to life—on time and on budget.',
  },
  {
    slug: 'packers-movers',
    name: 'Packers & Movers',
    description:
      'Relocate smoothly with verified professionals—transparent pricing, careful handling, and dependable delivery.',
  },
  {
    slug: 'property-management',
    name: 'Property Management',
    description:
      'Hand over the keys to verified property managers and enjoy hands-off ownership with transparent reporting.',
  },
  {
    slug: 'vastu-feng-shui',
    name: 'Vastu / Feng Shui Consultants',
    description:
      'Consult authentic experts to evaluate and improve harmony, wellbeing, and energy flow for your space.',
  },
  {
    slug: 'tiles-surface-finishing',
    name: 'Tiles & Surface Finishing',
    description:
      'Discover trusted suppliers and installers for tiles, stone, and surface finishes—compare options and get matched with verified partners.',
  },
  {
    slug: 'hardware-architectural-fittings',
    name: 'Hardware & Architectural Fittings',
    description:
      'Source quality hardware, fittings, and architectural accessories from verified partners with clear specs and dependable fulfillment.',
  },
  {
    slug: 'cement-structural',
    name: 'Cement & Structural',
    description:
      'Connect with verified suppliers for cement and structural materials—transparent pricing, reliable delivery, and project-ready guidance.',
  },
  {
    slug: 'smart-home-automation',
    name: 'Smart Home & Automation',
    description:
      'Upgrade your home with verified automation partners—supported brands, clean installation, and ongoing AMC/service options.',
  },
]

export function categoryHref(slug: EcosystemCategorySlug) {
  return `/ecosystem-partners/${slug}`
}

export function partnerRegistrationHref(slug: EcosystemCategorySlug) {
  return `/ecosystem-partners/${slug}/partner-registration`
}
