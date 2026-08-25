export type ManualPropertyCategory = 'RESIDENTIAL' | 'COMMERCIAL' | 'LAND'
export type ManualPropertyFormStep = 'basics' | 'location' | 'media' | 'amenities' | 'pricing' | 'declaration' | 'review'

export type PaymentPlanStage = {
  id: string
  label: string
  percentage: number
  description?: string
  order: number
}

export type PaymentPlanValidation = {
  totalPercentage: number
  remainingPercentage: number
  valid: boolean
  state: 'empty' | 'incomplete' | 'complete' | 'overallocated' | 'invalid'
  message?: string
}

function finitePercentage(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : 0
}

export function normalizePaymentPlan(raw: unknown): PaymentPlanStage[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((stage, index) => {
      const item = stage && typeof stage === 'object' ? stage as Record<string, unknown> : {}
      return {
        id: String(item.id || `payment-stage-${index + 1}`),
        label: String(item.label || '').trim(),
        percentage: finitePercentage(item.percentage),
        description: String(item.description || '').trim() || undefined,
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
      }
    })
    .sort((a, b) => a.order - b.order)
    .map((stage, index) => ({ ...stage, order: index }))
}

export function parseLegacyPaymentPlanText(value: unknown): PaymentPlanStage[] {
  const text = typeof value === 'string' ? value : ''
  if (!text.trim()) return []
  const stages: PaymentPlanStage[] = []
  for (const [index, line] of text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).entries()) {
    const match = line.match(/^(?:(\d+(?:\.\d+)?)%\s*[-: ]\s*(.+)|(.+?)\s*[-: ]\s*(\d+(?:\.\d+)?)%)$/)
    if (!match) continue
    const percentage = Number(match[1] || match[4])
    const label = String(match[2] || match[3] || '').trim()
    if (label && Number.isFinite(percentage) && percentage > 0) {
      stages.push({ id: `legacy-payment-stage-${index + 1}`, label, percentage, order: stages.length })
    }
  }
  return stages
}

export function paymentPlanValidation(stages: PaymentPlanStage[]): PaymentPlanValidation {
  if (stages.length === 0) return { totalPercentage: 0, remainingPercentage: 100, valid: true, state: 'empty' }
  const totalPercentage = stages.reduce((sum, stage) => sum + finitePercentage(stage.percentage), 0)
  const roundedTotal = Math.round(totalPercentage * 100) / 100
  const remainingPercentage = Math.round((100 - roundedTotal) * 100) / 100
  if (stages.some((stage) => !stage.label || finitePercentage(stage.percentage) <= 0)) {
    return { totalPercentage: roundedTotal, remainingPercentage, valid: false, state: 'invalid', message: 'Every payment stage needs a label and a percentage greater than zero.' }
  }
  if (roundedTotal > 100) return { totalPercentage: roundedTotal, remainingPercentage, valid: false, state: 'overallocated', message: 'Payment stages exceed the base property price.' }
  if (roundedTotal < 100) return { totalPercentage: roundedTotal, remainingPercentage, valid: false, state: 'incomplete', message: `${remainingPercentage}% of the base property price remains unallocated.` }
  return { totalPercentage: roundedTotal, remainingPercentage: 0, valid: true, state: 'complete' }
}

export type ManualPropertyFormData = {
  title?: string | null
  category?: ManualPropertyCategory | null
  propertyType?: string | null
  intent?: 'SALE' | 'RENT' | null
  price?: number | null
  currency?: string | null
  shortDescription?: string | null
  squareFeet?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  city?: string | null
  community?: string | null
  latitude?: number | null
  longitude?: number | null
  media?: Array<{ category?: string | null }>
  amenities?: string[] | null
  authorizedToMarket?: boolean
  constructionStatus?: string | null
  paymentPlan?: unknown
  paymentPlanText?: string | null
}

type PropertyTypeDefinition = {
  category: ManualPropertyCategory
  label: string
  fields: ReadonlySet<string>
  amenities: ReadonlySet<string>
}

const RESIDENTIAL_FIELDS = new Set(['bedrooms', 'bathrooms', 'squareFeet', 'constructionStatus'])
const COMMERCIAL_FIELDS = new Set(['squareFeet', 'constructionStatus'])
const LAND_FIELDS = new Set(['squareFeet'])

export const MANUAL_PROPERTY_TYPES: readonly PropertyTypeDefinition[] = [
  { category: 'RESIDENTIAL', label: 'Apartment', fields: RESIDENTIAL_FIELDS, amenities: new Set(['Interior', 'Building', 'Outdoor', 'Parking']) },
  { category: 'RESIDENTIAL', label: 'Villa', fields: RESIDENTIAL_FIELDS, amenities: new Set(['Interior', 'Outdoor', 'Parking']) },
  { category: 'RESIDENTIAL', label: 'Penthouse', fields: RESIDENTIAL_FIELDS, amenities: new Set(['Interior', 'Building', 'Outdoor', 'Parking']) },
  { category: 'RESIDENTIAL', label: 'Townhouse', fields: RESIDENTIAL_FIELDS, amenities: new Set(['Interior', 'Outdoor', 'Parking']) },
  { category: 'RESIDENTIAL', label: 'Studio', fields: new Set(['bathrooms', 'squareFeet', 'constructionStatus']), amenities: new Set(['Interior', 'Building']) },
  { category: 'RESIDENTIAL', label: 'Independent House', fields: RESIDENTIAL_FIELDS, amenities: new Set(['Interior', 'Outdoor', 'Parking']) },
  { category: 'LAND', label: 'Plot', fields: LAND_FIELDS, amenities: new Set(['Outdoor']) },
  { category: 'LAND', label: 'Residential Plot', fields: LAND_FIELDS, amenities: new Set(['Outdoor']) },
  { category: 'LAND', label: 'Commercial Plot', fields: LAND_FIELDS, amenities: new Set(['Outdoor']) },
  { category: 'LAND', label: 'Agricultural Land', fields: LAND_FIELDS, amenities: new Set(['Outdoor']) },
  { category: 'COMMERCIAL', label: 'Commercial', fields: COMMERCIAL_FIELDS, amenities: new Set(['Building', 'Parking']) },
  { category: 'COMMERCIAL', label: 'Office', fields: COMMERCIAL_FIELDS, amenities: new Set(['Building', 'Parking']) },
  { category: 'COMMERCIAL', label: 'Retail', fields: COMMERCIAL_FIELDS, amenities: new Set(['Building', 'Parking']) },
  { category: 'COMMERCIAL', label: 'Warehouse', fields: COMMERCIAL_FIELDS, amenities: new Set(['Building', 'Parking']) },
  { category: 'COMMERCIAL', label: 'Showroom', fields: COMMERCIAL_FIELDS, amenities: new Set(['Building', 'Parking']) },
]

export const MANUAL_AMENITY_GROUPS = {
  Interior: ['Air Conditioning', 'Built-in Wardrobes', 'Walk-in Closet', 'Modular Kitchen', 'Smart Home', 'Furnished'],
  Building: ['Elevator', 'Security', 'CCTV', 'Reception', 'Gym', 'Swimming Pool', 'Clubhouse', 'Concierge'],
  Outdoor: ['Garden', 'Balcony', 'Terrace', "Children's Play Area", 'BBQ Area', 'Private Pool', 'Private Garage'],
  Parking: ['Covered Parking', 'Basement Parking', 'Visitor Parking', 'EV Charging'],
} as const

export const MANUAL_PROPERTY_CATEGORIES: readonly { value: ManualPropertyCategory; label: string }[] = [
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'LAND', label: 'Land' },
]

export function categoryForPropertyType(propertyType?: string | null): ManualPropertyCategory | null {
  const definition = MANUAL_PROPERTY_TYPES.find((item) => item.label.toLowerCase() === String(propertyType || '').trim().toLowerCase())
  return definition?.category || null
}

export function propertyTypesForCategory(category?: ManualPropertyCategory | null) {
  return MANUAL_PROPERTY_TYPES.filter((item) => !category || item.category === category)
}

export function visibleManualPropertyFields(data: Pick<ManualPropertyFormData, 'propertyType' | 'category'>): ReadonlySet<string> {
  const category = data.category || categoryForPropertyType(data.propertyType)
  const definition = MANUAL_PROPERTY_TYPES.find((item) => item.label === data.propertyType && item.category === category)
  return definition?.fields || new Set()
}

export function defaultCurrencyForCountry(countryCode?: string | null) {
  return String(countryCode || '').toUpperCase() === 'INDIA' ? 'INR' : 'AED'
}

export function countryIso2ForCountry(countryCode?: string | null) {
  return String(countryCode || '').toUpperCase() === 'INDIA' ? 'IN' : 'AE'
}

export function orderManualPropertyMedia<T extends { category?: string | null; position?: number | null }>(media: T[]) {
  return [...media].sort((a, b) => {
    const aCategory = String(a.category || '').toUpperCase()
    const bCategory = String(b.category || '').toUpperCase()
    const aIsCover = aCategory === 'COVER' || aCategory === 'HERO'
    const bIsCover = bCategory === 'COVER' || bCategory === 'HERO'
    if (aIsCover !== bIsCover) return aIsCover ? -1 : 1
    return Number(a.position || 0) - Number(b.position || 0)
  })
}

export function suggestManualPropertyTitle(data: Pick<ManualPropertyFormData, 'propertyType' | 'bedrooms' | 'city' | 'community'>) {
  const type = String(data.propertyType || 'Property').trim()
  const bedrooms = Number(data.bedrooms) > 0 ? `${Math.floor(Number(data.bedrooms))}BR ` : ''
  const place = String(data.community || data.city || '').trim()
  return `${bedrooms}${type}${place ? ` in ${place}` : ''}`.trim()
}

export function validateManualPropertyStep(step: ManualPropertyFormStep, data: ManualPropertyFormData) {
  const errors: Record<string, string> = {}
  const fields = visibleManualPropertyFields(data)
  const required = (field: string, message: string, valid: boolean) => {
    if (!valid) errors[field] = message
  }

  if (step === 'basics' || step === 'review') {
    required('title', 'Add a meaningful property title.', String(data.title || '').trim().length >= 6 && String(data.title || '').trim().toLowerCase() !== 'property')
    required('category', 'Select a property category.', Boolean(data.category || categoryForPropertyType(data.propertyType)))
    required('propertyType', 'Select a property type.', Boolean(String(data.propertyType || '').trim()))
    required('intent', 'Select whether this property is for sale or rent.', Boolean(data.intent))
    required('price', data.intent === 'RENT' ? 'Add the monthly rent.' : 'Add the asking price.', Number(data.price) > 0)
    required('squareFeet', 'Add the property area.', Number(data.squareFeet) > 0)
    if (fields.has('constructionStatus')) required('constructionStatus', 'Select the current property status.', Boolean(data.constructionStatus))
    if (fields.has('bedrooms') && data.propertyType !== 'Studio') required('bedrooms', 'Add the number of bedrooms.', Number(data.bedrooms) >= 0)
    if (fields.has('bathrooms')) required('bathrooms', 'Add the number of bathrooms.', Number(data.bathrooms) > 0)
    required('shortDescription', 'Add at least 40 characters describing the property.', String(data.shortDescription || '').trim().length >= 40)
  }

  if (step === 'location' || step === 'review') {
    required('city', 'Select or enter a city.', Boolean(String(data.city || '').trim()))
    required('community', 'Add the community or area.', Boolean(String(data.community || '').trim()))
    required('coordinates', 'Place the property pin on the map.', typeof data.latitude === 'number' && typeof data.longitude === 'number')
  }

  if (step === 'media' || step === 'review') {
    required('heroImage', 'Add a hero image for the listing.', Boolean(data.media?.some((item) => item.category === 'COVER')))
  }

  if (step === 'declaration' || step === 'review') {
    required('authorizedToMarket', 'Confirm that you are authorized to market this property.', data.authorizedToMarket === true)
  }

  if ((step === 'pricing' || step === 'review') && Array.isArray(data.paymentPlan)) {
    const paymentValidation = paymentPlanValidation(normalizePaymentPlan(data.paymentPlan))
    if (!paymentValidation.valid) errors.paymentPlan = paymentValidation.message || 'Complete the payment plan.'
  }

  return errors
}

export type ListingQualityItem = { key: string; label: string; weight: number; complete: boolean }

export function calculateManualListingQuality(data: ManualPropertyFormData): { score: number; items: ListingQualityItem[] } {
  const items: ListingQualityItem[] = [
    { key: 'title', label: 'Add a meaningful title', weight: 15, complete: String(data.title || '').trim().length >= 6 },
    { key: 'purpose', label: 'Select sale or rent', weight: 10, complete: Boolean(data.intent) },
    { key: 'type', label: 'Select a property type', weight: 10, complete: Boolean(data.propertyType) },
    { key: 'price', label: 'Add pricing', weight: 15, complete: Number(data.price) > 0 },
    { key: 'location', label: 'Complete the location', weight: 15, complete: Boolean(data.city && data.community && typeof data.latitude === 'number' && typeof data.longitude === 'number') },
    { key: 'area', label: 'Add the property area', weight: 10, complete: Number(data.squareFeet) > 0 },
    { key: 'description', label: 'Write a detailed description', weight: 10, complete: String(data.shortDescription || '').trim().length >= 40 },
    { key: 'hero', label: 'Add a hero image', weight: 10, complete: Boolean(data.media?.some((item) => item.category === 'COVER')) },
    { key: 'amenities', label: 'Select amenities', weight: 5, complete: Boolean(data.amenities?.length) },
  ]
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  const complete = items.reduce((sum, item) => sum + (item.complete ? item.weight : 0), 0)
  return { score: Math.round((complete / total) * 100), items }
}