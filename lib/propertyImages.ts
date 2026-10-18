import { PROJECT_IMAGE_FALLBACK } from '@/lib/media/fallbacks'

export const PROPERTY_PROJECT_PLACEHOLDER = PROJECT_IMAGE_FALLBACK

export function resolvePropertyImage(image?: string | null) {
  return typeof image === 'string' && image.trim() ? image : PROPERTY_PROJECT_PLACEHOLDER
}

export function resolvePropertyImages(args: {
  propertyType: string
  images?: (string | null | undefined)[] | null
  seed: string
}) {
  const images = (args.images || []).filter(
    (image): image is string => typeof image === 'string' && image.trim().length > 0
  )
  return images.length > 0 ? images : [PROPERTY_PROJECT_PLACEHOLDER]
}

export function resolveImagesForProperty(
  property: Pick<{ id: string; propertyType: string; images?: (string | null | undefined)[] | null }, 'id' | 'propertyType' | 'images'>
) {
  return resolvePropertyImages({
    propertyType: property.propertyType,
    images: property.images,
    seed: property.id,
  })
}
