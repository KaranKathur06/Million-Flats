import crypto from 'crypto'
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { buildCdnAssetUrl, getS3Client, sanitizeFilename } from '@/lib/s3'

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
  const bucket = String(process.env.AWS_S3_BUCKET || '').trim()
  if (!bucket) throw new Error('Missing AWS_S3_BUCKET')
  const s3 = getS3Client()
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: input.key }))
  const fileSize = Number(head.ContentLength || 0)
  const mimeType = normalizeHeroImageType(head.ContentType)
  if (head.Metadata?.['uploaded-by'] !== input.uploadedBy) throw new Error('Uploaded asset does not match this admin session.')
  if (head.Metadata?.['hero-banner-id'] !== input.bannerId) throw new Error('Uploaded asset does not match this banner.')
  if (!HERO_BANNER_IMAGE_TYPES.includes(mimeType as (typeof HERO_BANNER_IMAGE_TYPES)[number])) throw new Error('Only JPEG, PNG, WebP, and AVIF images are supported.')
  if (mimeType !== normalizeHeroImageType(input.expectedType)) throw new Error('Uploaded image type does not match the authorized file type.')
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > HERO_BANNER_MAX_BYTES || fileSize !== input.expectedSize) throw new Error('Uploaded image size is invalid or exceeds the 15MB limit.')

  const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: input.key }))
  if (!object.Body || !('transformToByteArray' in object.Body)) throw new Error('Could not inspect uploaded image.')
  const bytes = Buffer.from(await object.Body.transformToByteArray())
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