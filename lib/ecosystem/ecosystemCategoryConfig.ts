import type { EcosystemCategorySlug } from '@/lib/ecosystemPartners'

export type EcosystemRegistrationField =
  | { type: 'text'; name: string; label: string; placeholder?: string; required?: boolean }
  | { type: 'email'; name: string; label: string; placeholder?: string; required?: boolean }
  | { type: 'tel'; name: string; label: string; placeholder?: string; required?: boolean }
  | { type: 'url'; name: string; label: string; placeholder?: string; required?: boolean }
  | { type: 'number'; name: string; label: string; placeholder?: string; required?: boolean }
  | { type: 'textarea'; name: string; label: string; placeholder?: string; required?: boolean }
  | { type: 'select'; name: string; label: string; options: string[]; required?: boolean }
  | { type: 'multiselect'; name: string; label: string; options: string[]; required?: boolean }
  | { type: 'file'; name: string; label: string; accept?: string; required?: boolean; help?: string }

export type EcosystemRegistrationConfig = {
  slug: EcosystemCategorySlug
  title: string
  description: string
  submitLabel: string
  requiresLicense: boolean
  requiresDocumentUpload: boolean
  baseFields: EcosystemRegistrationField[]
  extraFields: EcosystemRegistrationField[]
}

const BASE_FIELDS: EcosystemRegistrationField[] = [
  { type: 'text', name: 'businessName', label: 'Business Name', required: true },
  { type: 'text', name: 'contactPerson', label: 'Contact Person', required: true },
  { type: 'email', name: 'email', label: 'Email', required: true },
  { type: 'tel', name: 'phone', label: 'Phone', required: true },
  { type: 'tel', name: 'whatsapp', label: 'WhatsApp', required: false },
  { type: 'url', name: 'website', label: 'Website', required: false },
  { type: 'number', name: 'yearsExperience', label: 'Years of Experience', required: false },
  {
    type: 'select',
    name: 'pricingRange',
    label: 'Pricing Range',
    required: false,
    options: ['Budget', 'Mid', 'Premium', 'Luxury'],
  },
  {
    type: 'textarea',
    name: 'description',
    label: 'Business Description',
    placeholder: 'Tell us what you do, your strengths, and what clients can expect.',
    required: true,
  },
  {
    type: 'text',
    name: 'serviceAreas',
    label: 'Service Areas',
    placeholder: 'e.g., Ahmedabad, Gandhinagar (comma separated)',
    required: false,
  },
  { type: 'file', name: 'logo', label: 'Logo', accept: 'image/png,image/jpeg,image/webp', required: false, help: 'Max 2MB (JPG/PNG/WebP)' },
]

export const ECOSYSTEM_REGISTRATION_CONFIG: Record<EcosystemCategorySlug, EcosystemRegistrationConfig> = {
  'home-loans-finance': {
    slug: 'home-loans-finance',
    title: 'Register as a Home Loans & Finance Partner',
    description: 'Join MillionFlats to receive high-intent loan enquiries from buyers and investors.',
    submitLabel: 'Submit Registration',
    requiresLicense: true,
    requiresDocumentUpload: true,
    baseFields: BASE_FIELDS,
    extraFields: [
      { type: 'multiselect', name: 'loanTypes', label: 'Loan Types', required: true, options: ['Home Loan', 'Loan Against Property', 'Balance Transfer', 'NRI Loan'] },
      { type: 'number', name: 'interestRateMin', label: 'Interest Rate Min (%)', required: false },
      { type: 'number', name: 'interestRateMax', label: 'Interest Rate Max (%)', required: false },
      { type: 'text', name: 'processingFee', label: 'Processing Fee', required: false },
      { type: 'text', name: 'rbiRegistration', label: 'RBI Registration (if applicable)', required: false },
      { type: 'file', name: 'certificate', label: 'Registration/License Document', accept: 'image/png,image/jpeg,image/webp', required: true, help: 'Max 2MB (JPG/PNG/WebP)' },
    ],
  },
  'legal-documentation': {
    slug: 'legal-documentation',
    title: 'Register as a Legal & Documentation Partner',
    description: 'Join MillionFlats to connect with clients needing due diligence, drafting, and registration support.',
    submitLabel: 'Submit Registration',
    requiresLicense: true,
    requiresDocumentUpload: true,
    baseFields: BASE_FIELDS,
    extraFields: [
      { type: 'text', name: 'licenseNumber', label: 'License Number', required: true },
      {
        type: 'multiselect',
        name: 'specialization',
        label: 'Specialization',
        required: true,
        options: ['Due Diligence', 'Agreement Drafting', 'Registration', 'RERA', 'Litigation Support'],
      },
      { type: 'text', name: 'courtRegistration', label: 'Court Registration (if applicable)', required: false },
      { type: 'file', name: 'certificate', label: 'License/Registration Document', accept: 'image/png,image/jpeg,image/webp', required: true, help: 'Max 2MB (JPG/PNG/WebP)' },
    ],
  },
  'property-insurance': {
    slug: 'property-insurance',
    title: 'Register as a Property Insurance Partner',
    description: 'Join MillionFlats to help owners choose the right policy and get high-intent coverage enquiries.',
    submitLabel: 'Submit Registration',
    requiresLicense: true,
    requiresDocumentUpload: true,
    baseFields: BASE_FIELDS,
    extraFields: [
      { type: 'multiselect', name: 'products', label: 'Products', required: true, options: ['Home Insurance', 'Fire & Perils', 'Contents Cover', 'Landlord Insurance'] },
      { type: 'text', name: 'irdaiRegistrationNumber', label: 'IRDAI Registration Number', required: false },
      { type: 'file', name: 'certificate', label: 'License/Registration Document', accept: 'image/png,image/jpeg,image/webp', required: true, help: 'Max 2MB (JPG/PNG/WebP)' },
    ],
  },
  'interior-design-renovation': {
    slug: 'interior-design-renovation',
    title: 'Register as an Interior Design & Renovation Partner',
    description: 'Join MillionFlats to receive qualified design and renovation leads.',
    submitLabel: 'Submit Registration',
    requiresLicense: false,
    requiresDocumentUpload: false,
    baseFields: BASE_FIELDS,
    extraFields: [
      { type: 'number', name: 'projectBudgetMin', label: 'Typical Project Budget Min', required: false },
      { type: 'number', name: 'projectBudgetMax', label: 'Typical Project Budget Max', required: false },
      { type: 'text', name: 'portfolioImages', label: 'Portfolio Links (comma separated)', required: false },
    ],
  },
  'packers-movers': {
    slug: 'packers-movers',
    title: 'Register as a Packers & Movers Partner',
    description: 'Join MillionFlats to receive relocation enquiries at the right time in the customer journey.',
    submitLabel: 'Submit Registration',
    requiresLicense: false,
    requiresDocumentUpload: false,
    baseFields: BASE_FIELDS,
    extraFields: [
      { type: 'multiselect', name: 'serviceTypes', label: 'Service Types', required: true, options: ['Local', 'Inter-city', 'Storage', 'Office'] },
      { type: 'text', name: 'fleetDetails', label: 'Fleet Details', required: false },
    ],
  },
  'property-management': {
    slug: 'property-management',
    title: 'Register as a Property Management Partner',
    description: 'Join MillionFlats to manage premium properties for owners and investors.',
    submitLabel: 'Submit Registration',
    requiresLicense: false,
    requiresDocumentUpload: false,
    baseFields: BASE_FIELDS,
    extraFields: [
      { type: 'text', name: 'unitsManaged', label: 'Units Managed', required: false },
      { type: 'text', name: 'feeStructure', label: 'Fee Structure', required: false },
    ],
  },
  'vastu-feng-shui': {
    slug: 'vastu-feng-shui',
    title: 'Register as a Vastu / Feng Shui Partner',
    description: 'Join MillionFlats to connect with clients looking for harmony and wellbeing consultations.',
    submitLabel: 'Submit Registration',
    requiresLicense: false,
    requiresDocumentUpload: false,
    baseFields: BASE_FIELDS,
    extraFields: [
      { type: 'multiselect', name: 'consultationModes', label: 'Consultation Modes', required: true, options: ['On-site', 'Online', 'Hybrid'] },
      { type: 'text', name: 'philosophy', label: 'Your Approach / Philosophy', required: false },
    ],
  },
  'tiles-surface-finishing': {
    slug: 'tiles-surface-finishing',
    title: 'Register as a Tiles & Surface Finishing Partner',
    description: 'Join MillionFlats to receive enquiries for tiles, stone, and surface finishes.',
    submitLabel: 'Submit Registration',
    requiresLicense: false,
    requiresDocumentUpload: true,
    baseFields: BASE_FIELDS,
    extraFields: [
      { type: 'multiselect', name: 'materials', label: 'Materials', required: true, options: ['Tiles', 'Stone', 'Marble', 'Granite', 'Wood', 'Vinyl'] },
      { type: 'text', name: 'brands', label: 'Supported Brands', required: false },
      { type: 'file', name: 'certificate', label: 'Business/Trade Document (optional)', accept: 'image/png,image/jpeg,image/webp', required: false, help: 'Max 2MB (JPG/PNG/WebP)' },
    ],
  },
  'hardware-architectural-fittings': {
    slug: 'hardware-architectural-fittings',
    title: 'Register as a Hardware & Architectural Fittings Partner',
    description: 'Join MillionFlats to receive sourcing enquiries for fittings and architectural hardware.',
    submitLabel: 'Submit Registration',
    requiresLicense: false,
    requiresDocumentUpload: true,
    baseFields: BASE_FIELDS,
    extraFields: [
      { type: 'multiselect', name: 'productCategories', label: 'Product Categories', required: true, options: ['Door Hardware', 'Kitchen Hardware', 'Bathroom Fittings', 'Wardrobe Systems', 'Locks & Security'] },
      { type: 'text', name: 'supportedBrands', label: 'Supported Brands', required: false },
      { type: 'file', name: 'certificate', label: 'Business/Trade Document (optional)', accept: 'image/png,image/jpeg,image/webp', required: false, help: 'Max 2MB (JPG/PNG/WebP)' },
    ],
  },
  'cement-structural': {
    slug: 'cement-structural',
    title: 'Register as a Cement & Structural Partner',
    description: 'Join MillionFlats to receive high-intent enquiries for cement and structural materials.',
    submitLabel: 'Submit Registration',
    requiresLicense: false,
    requiresDocumentUpload: true,
    baseFields: BASE_FIELDS,
    extraFields: [
      { type: 'multiselect', name: 'materials', label: 'Materials', required: true, options: ['Cement', 'Steel', 'Bricks', 'Blocks', 'Concrete'] },
      { type: 'text', name: 'deliveryCapability', label: 'Delivery Capability', required: false },
      { type: 'file', name: 'certificate', label: 'Business/Trade Document (optional)', accept: 'image/png,image/jpeg,image/webp', required: false, help: 'Max 2MB (JPG/PNG/WebP)' },
    ],
  },
  'smart-home-automation': {
    slug: 'smart-home-automation',
    title: 'Register as a Smart Home & Automation Partner',
    description: 'Join MillionFlats to receive smart home automation enquiries from homeowners and buyers.',
    submitLabel: 'Submit Registration',
    requiresLicense: false,
    requiresDocumentUpload: false,
    baseFields: BASE_FIELDS,
    extraFields: [
      { type: 'multiselect', name: 'supportedBrands', label: 'Supported Brands', required: true, options: ['Philips Hue', 'Google', 'Amazon Alexa', 'Apple HomeKit', 'Sonoff', 'Other'] },
      { type: 'select', name: 'amcAvailable', label: 'AMC Available?', required: false, options: ['Yes', 'No'] },
    ],
  },
}

export function getEcosystemRegistrationConfig(slug: string) {
  const key = slug as EcosystemCategorySlug
  return (ECOSYSTEM_REGISTRATION_CONFIG as any)[key] as EcosystemRegistrationConfig | undefined
}
