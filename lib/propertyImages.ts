import type { Property } from '@/lib/mockData'

const SAMPLE_IMAGES_BY_TYPE: Record<string, string[]> = {
  apartment: ['/APARTMENT%201.jpg'],
  villa: ['/VILLA%201.png', '/VILLA%202.jpg'],
  penthouse: ['/penthouse.png'],
}

function hashString(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function shuffleDeterministic<T>(items: T[], seed: string) {
  const arr = [...items]
  let s = hashString(seed)
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function normalizeType(propertyType: string) {
  const t = (propertyType || '').trim().toLowerCase()
  if (t.includes('penthouse')) return 'penthouse'
  if (t.includes('apartment')) return 'apartment'
  if (t.includes('villa') || t.includes('mansion') || t.includes('townhouse')) return 'villa'
  return 'villa'
}

export function resolvePropertyImages(args: {
  propertyType: string
  images?: string[]
  seed: string
}) {
  const normalized = normalizeType(args.propertyType)

  const provided = (args.images || []).filter(Boolean)
  const hasLocal = provided.some((src) => src.startsWith('/'))
  const looksLikePlaceholder =
    provided.length > 0 &&
    provided.every((src) => src.includes('images.unsplash.com') || src.includes('unsplash.com'))

  const shouldUseSamples = provided.length === 0 || looksLikePlaceholder

  if (!shouldUseSamples && !hasLocal) {
    return provided
  }

  const base = hasLocal ? provided : SAMPLE_IMAGES_BY_TYPE[normalized] || SAMPLE_IMAGES_BY_TYPE.villa
  return shuffleDeterministic(base, `${normalized}:${args.seed}`)
}

export function resolveImagesForProperty(property: Pick<Property, 'id' | 'propertyType' | 'images'>) {
  return resolvePropertyImages({
    propertyType: property.propertyType,
    images: property.images,
    seed: property.id,
  })
}
