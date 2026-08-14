export type ProjectFormMode = 'create' | 'edit'

export interface DevOption { id: string; name: string; slug: string | null }

export interface MediaItem {
  id?: string
  mediaUrl: string
  mediaType: string
  category?: 'hero' | 'interior' | 'exterior' | 'amenities' | 'lifestyle' | 'floor_plan' | null
  label?: string | null
  sortOrder: number | null
  s3Key?: string | null
}

export interface VariantRow {
  id?: string
  title: string
  size: string
  price: string
  availabilityStatus: 'AVAILABLE' | 'SOLD_OUT'
  availableUnitsCount: string
}

export interface UnitTypeRow {
  id?: string
  unitType: string
  bedrooms: string
  bathrooms: string
  sizeFrom: string
  sizeTo: string
  priceFrom: string
  variants: VariantRow[]
}

export interface FloorPlanRow {
  id?: string
  unitType: string
  bedrooms: string
  bathrooms: string
  size: string
  price: string
  imageUrl: string
  fileName?: string
  fileType?: string
}

export interface AmenityRow { id?: string; name: string; icon: string; category: string }
export interface NearbyPlaceRow { id?: string; name: string; category: string; distance: string }
export interface PaymentPlanRow { id?: string; itemType: 'BASE_PRICE' | 'FEE'; label: string; amount: string; currency: string; milestone: string }
export interface LocationData { latitude: string; longitude: string; address: string; mapUrl: string }
export interface VideoRow { id?: string; videoUrl: string; title: string; thumbnail: string }

export interface ProjectFormData {
  name: string
  slug: string
  developerId: string
  countryIso2: string
  city: string
  community: string
  description: string
  overview: string
  completionYear: string
  startingPrice: string
  goldenVisa: boolean
  isFeatured: boolean
  featuredOrder: string
  coverImage: string
  status: string
  leadCount: number
  media: MediaItem[]
  unitTypes: UnitTypeRow[]
  floorPlans: FloorPlanRow[]
  highlights: string[]
  amenities: AmenityRow[]
  nearbyPlaces: NearbyPlaceRow[]
  paymentPlans: PaymentPlanRow[]
  location: LocationData
  videos: VideoRow[]
}

export const PROJECT_COUNTRY_OPTIONS = [
  { value: 'AE', label: 'UAE' },
  { value: 'IN', label: 'India' },
]

export const MEDIA_CATEGORY_OPTIONS = [
  { value: 'hero', label: 'Hero' },
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'amenities', label: 'Amenities' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'floor_plan', label: 'Floor Plan' },
]

export const PROJECT_FLOOR_PLAN_ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]

export const PROJECT_FLOOR_PLAN_ALLOWED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.pdf'
export const PROJECT_FLOOR_PLAN_MAX_SIZE = 5 * 1024 * 1024
export const PROJECT_BROCHURE_ALLOWED_TYPE = 'application/pdf'
// Brochure max size (bytes). Default to 200MB if not configured via env.
// Do NOT set to Infinity; infra must enforce practical limits.
export const PROJECT_BROCHURE_MAX_SIZE = Number(process.env.NEXT_PUBLIC_PROJECT_BROCHURE_MAX_SIZE) || 300 * 1024 * 1024

export const DEFAULT_FORM_DATA: ProjectFormData = {
  name: '',
  slug: '',
  developerId: '',
  countryIso2: 'AE',
  city: '',
  community: '',
  description: '',
  overview: '',
  completionYear: '',
  startingPrice: '',
  goldenVisa: false,
  isFeatured: false,
  featuredOrder: '',
  coverImage: '',
  status: 'DRAFT',
  leadCount: 0,
  media: [],
  unitTypes: [],
  floorPlans: [],
  highlights: [''],
  amenities: [{ name: '', icon: '', category: '' }],
  nearbyPlaces: [{ name: '', category: '', distance: '' }],
  paymentPlans: [{ itemType: 'BASE_PRICE', label: '', amount: '', currency: 'AED', milestone: '' }],
  location: { latitude: '', longitude: '', address: '', mapUrl: '' },
  videos: [{ videoUrl: '', title: '', thumbnail: '' }],
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120)
}

export function isFloorPlanPdf(urlOrType: string | File | null | undefined) {
  if (!urlOrType) return false
  if (typeof urlOrType === 'string') {
    return /\.pdf$/i.test(urlOrType) || urlOrType.toLowerCase().includes('application/pdf')
  }
  return urlOrType.type?.toLowerCase() === 'application/pdf'
}

export function isValidFloorPlanFile(file: File | null | undefined) {
  if (!file) return false
  const type = file.type?.toLowerCase() || ''
  const matches = PROJECT_FLOOR_PLAN_ALLOWED_TYPES.includes(type)
  return matches && file.size <= PROJECT_FLOOR_PLAN_MAX_SIZE
}

export function buildProjectPayload(values: ProjectFormData) {
  return {
    name: values.name.trim(),
    slug: values.slug.trim() || slugify(values.name),
    developerId: values.developerId,
    countryIso2: values.countryIso2 || null,
    city: values.city.trim() || null,
    community: values.community.trim() || null,
    description: values.description.trim() || null,
    overview: values.overview.trim() || null,
    completionYear: values.completionYear ? parseInt(values.completionYear, 10) : null,
    startingPrice: values.startingPrice ? values.startingPrice.trim() : null,
    goldenVisa: values.goldenVisa,
    isFeatured: values.isFeatured,
    featuredOrder: values.featuredOrder ? parseInt(values.featuredOrder, 10) : null,
    coverImage: values.coverImage || null,
    unitTypes: values.unitTypes.filter((ut) => ut.unitType.trim()).map((ut) => ({
      id: ut.id,
      unitType: ut.unitType.trim(),
      bedrooms: ut.bedrooms ? parseInt(ut.bedrooms, 10) : null,
      bathrooms: ut.bathrooms ? parseInt(ut.bathrooms, 10) : null,
      sizeFrom: ut.sizeFrom ? parseInt(ut.sizeFrom, 10) : null,
      sizeTo: ut.sizeTo ? parseInt(ut.sizeTo, 10) : null,
      priceFrom: ut.priceFrom ? ut.priceFrom.trim() : null,
      variants: ut.variants.filter((v) => v.title.trim()).map((v) => ({
        id: v.id,
        title: v.title.trim(),
        size: v.size ? parseInt(v.size, 10) : null,
        price: v.price ? v.price.trim() : null,
        availabilityStatus: v.availabilityStatus,
        availableUnitsCount: v.availableUnitsCount ? parseInt(v.availableUnitsCount, 10) : null,
      })),
    })),
    floorPlans: values.floorPlans.filter((fp) => fp.unitType.trim() || fp.imageUrl.trim()).map((fp, idx) => ({
      id: fp.id,
      unitType: fp.unitType.trim() || 'Floor Plan',
      bedrooms: fp.bedrooms ? parseInt(fp.bedrooms, 10) : null,
      bathrooms: fp.bathrooms ? parseInt(fp.bathrooms, 10) : null,
      size: fp.size.trim() || null,
      price: fp.price.trim() || null,
      imageUrl: fp.imageUrl.trim() || null,
      sortOrder: idx,
    })),
    highlights: values.highlights.filter((h) => h.trim()),
    amenities: values.amenities.filter((a) => a.name.trim()).map((a) => ({
      id: a.id,
      name: a.name.trim(),
      icon: a.icon.trim() || null,
      category: a.category.trim() || null,
    })),
    nearbyPlaces: values.nearbyPlaces.filter((np) => np.name.trim()).map((np, idx) => ({
      id: np.id,
      name: np.name.trim(),
      category: np.category.trim() || null,
      distance: np.distance.trim() || null,
      sortOrder: idx,
    })),
    paymentPlans: values.paymentPlans.filter((pp) => pp.label.trim() && pp.amount.trim()).map((pp, idx) => ({
      id: pp.id,
      itemType: pp.itemType,
      label: pp.label.trim(),
      amount: pp.amount.trim(),
      currency: pp.currency.trim() || 'AED',
      milestone: pp.milestone.trim() || null,
      sortOrder: idx,
    })),
    location: values.location.address.trim() || values.location.latitude || values.location.longitude ? {
      latitude: values.location.latitude ? parseFloat(values.location.latitude) : null,
      longitude: values.location.longitude ? parseFloat(values.location.longitude) : null,
      address: values.location.address.trim() || null,
      mapUrl: values.location.mapUrl.trim() || null,
    } : null,
    videos: values.videos.filter((v) => v.videoUrl.trim()).map((v, idx) => ({
      id: v.id,
      videoUrl: v.videoUrl.trim(),
      title: v.title.trim() || null,
      thumbnail: v.thumbnail.trim() || null,
      sortOrder: idx,
    })),
  }
}
