import type { LeadType } from '@prisma/client'

export type { LeadType } from '@prisma/client'

export type LeadEcosystemCategory =
  | 'HOME_LOANS'
  | 'LEGAL'
  | 'INSURANCE'
  | 'INTERIOR'
  | 'PACKERS'
  | 'PROPERTY_MANAGEMENT'
  | 'VASTU'
  | 'TILES'
  | 'HARDWARE'
  | 'CEMENT'
  | 'SMART_HOME'
  | 'TECHNOLOGY'

/** Legacy URL / DB values → canonical LeadType */
const LEAD_TYPE_ALIASES: Record<string, LeadType> = {
  CONTACT: 'CONTACT',
  CONTACT_FORM: 'CONTACT',
  PROJECT: 'PROJECT',
  PROJECT_INQUIRY: 'PROJECT',
  ECOSYSTEM: 'ECOSYSTEM',
  ECOSYSTEM_REGISTRATION: 'ECOSYSTEM',
  THREE_D_TOUR: 'THREE_D_TOUR',
  '3D_TOUR': 'THREE_D_TOUR',
  '3D Tour Inquiry': 'THREE_D_TOUR',
  'Contact Form': 'CONTACT',
  'Contact Lead': 'CONTACT',
  'Project Inquiry': 'PROJECT',
  'Project Lead': 'PROJECT',
  'Ecosystem Partner Registration': 'ECOSYSTEM',
  'Ecosystem Registration': 'ECOSYSTEM',
  'Ecosystem Lead': 'ECOSYSTEM',
}

export function normalizeLeadType(raw: unknown): LeadType | '' {
  const key = String(raw ?? '').trim()
  if (!key) return ''
  return LEAD_TYPE_ALIASES[key] || LEAD_TYPE_ALIASES[key.toUpperCase()] || ''
}

/** Slug or label → LeadEcosystemCategory code */
const ECOSYSTEM_CATEGORY_ALIASES: Record<string, LeadEcosystemCategory> = {
  HOME_LOANS: 'HOME_LOANS',
  'home-loans-finance': 'HOME_LOANS',
  'Home Loans & Finance': 'HOME_LOANS',
  LEGAL: 'LEGAL',
  'legal-documentation': 'LEGAL',
  'Legal & Documentation': 'LEGAL',
  INSURANCE: 'INSURANCE',
  'property-insurance': 'INSURANCE',
  'Property Insurance': 'INSURANCE',
  INTERIOR: 'INTERIOR',
  'interior-design-renovation': 'INTERIOR',
  'Interior Design & Renovation': 'INTERIOR',
  PACKERS: 'PACKERS',
  'packers-movers': 'PACKERS',
  'Packers & Movers': 'PACKERS',
  PROPERTY_MANAGEMENT: 'PROPERTY_MANAGEMENT',
  'property-management': 'PROPERTY_MANAGEMENT',
  'Property Management': 'PROPERTY_MANAGEMENT',
  VASTU: 'VASTU',
  'vastu-feng-shui': 'VASTU',
  'Vastu / Feng Shui': 'VASTU',
  TILES: 'TILES',
  'tiles-surface-finishing': 'TILES',
  'Tiles & Surface Finishing': 'TILES',
  HARDWARE: 'HARDWARE',
  'hardware-architectural-fittings': 'HARDWARE',
  'Hardware & Architectural Fittings': 'HARDWARE',
  CEMENT: 'CEMENT',
  'cement-structural': 'CEMENT',
  'Cement & Structural': 'CEMENT',
  SMART_HOME: 'SMART_HOME',
  'smart-home-automation': 'SMART_HOME',
  'Smart Home & Automation': 'SMART_HOME',
  TECHNOLOGY: 'TECHNOLOGY',
  'technology-partners': 'TECHNOLOGY',
  'Technology Partners': 'TECHNOLOGY',
}

export function normalizeEcosystemCategory(raw: unknown): LeadEcosystemCategory | '' {
  const key = String(raw ?? '').trim()
  if (!key) return ''
  return ECOSYSTEM_CATEGORY_ALIASES[key] || ECOSYSTEM_CATEGORY_ALIASES[key.toUpperCase()] || ''
}

export function ecosystemCategoryToSlug(code: LeadEcosystemCategory): string {
  const map: Record<LeadEcosystemCategory, string> = {
    HOME_LOANS: 'home-loans-finance',
    LEGAL: 'legal-documentation',
    INSURANCE: 'property-insurance',
    INTERIOR: 'interior-design-renovation',
    PACKERS: 'packers-movers',
    PROPERTY_MANAGEMENT: 'property-management',
    VASTU: 'vastu-feng-shui',
    TILES: 'tiles-surface-finishing',
    HARDWARE: 'hardware-architectural-fittings',
    CEMENT: 'cement-structural',
    SMART_HOME: 'smart-home-automation',
    TECHNOLOGY: 'technology-partners',
  }
  return map[code]
}
