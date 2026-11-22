import crypto from 'crypto'
import sharp from 'sharp'
import { buildCdnAssetUrl, sanitizeFilename } from '@/lib/s3'
import { getStorageProvider } from '@/lib/storage'

export const HERO_BANNER_MAX_BYTES = 15 * 1024 * 1024
export const HERO_BANNER_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const

export function normalizeHeroImageType(value: unknown) {
  const type = String(value || '').trim().toLowerCase()
  return type === 'image/jpg' ? 'image/jpeg' : type
}

function extensionForType(type: string) {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/avif') return 'avif'
  return 'jpg'
}

export function buildHeroBannerImageKey(scopeKey: string, category: string, slot: 'desktop' | 'mobile', type: string) {
  const scope = sanitizeFilename(scopeKey.replace(/[:/]/g, '-')) || 'global'
  const suffix = crypto.randomBytes(12).toString('hex')
  return `public/hero-banners/${scope}/${category.toLowerCase()}/${slot}-${Date.now()}-${suffix}.${extensionForType(type)}`
}

export async function verifyStoredHeroImage(input: {
  key: string
  expectedType: string
  expectedSize: number
  uploadedBy: string
  bannerId: string
}) {
  const provider = getStorageProvider()
  const head = await provider.getFileMetadata(input.key)
  const fileSize = head.sizeBytes
  const mimeType = normalizeHeroImageType(head.contentType)
  if (head.metadata['uploaded-by'] !== input.uploadedBy) throw new Error('Uploaded asset does not match this admin session.')
  if (head.metadata['hero-banner-id'] !== input.bannerId) throw new Error('Uploaded asset does not match this banner.')
  if (!HERO_BANNER_IMAGE_TYPES.includes(mimeType as (typeof HERO_BANNER_IMAGE_TYPES)[number])) throw new Error('Only JPEG, PNG, WebP, and AVIF images are supported.')
  if (mimeType !== normalizeHeroImageType(input.expectedType)) throw new Error('Uploaded image type does not match the authorized file type.')
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > HERO_BANNER_MAX_BYTES || fileSize !== input.expectedSize) throw new Error('Uploaded image size is invalid or exceeds the 15MB limit.')

  const os = await import('node:fs/promises')
  const path = await import('node:path')
  const osModule = await import('node:os')
  const tempDirectory = await os.mkdtemp(path.join(osModule.tmpdir(), 'millionflats-banner-'))
  const tempFile = path.join(tempDirectory, 'image')
  await provider.downloadFile(input.key, tempFile)
  const bytes = await os.readFile(tempFile)
  const metadata = await sharp(bytes, { failOn: 'error' }).metadata()
  const formatToType: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' }
  if (!metadata.width || !metadata.height || formatToType[metadata.format || ''] !== mimeType) throw new Error('The uploaded file is not a valid supported image.')

  return {
    width: metadata.width,
    height: metadata.height,
    fileSize,
    mimeType,
    imageUrl: buildCdnAssetUrl({ key: input.key }),
  }
}