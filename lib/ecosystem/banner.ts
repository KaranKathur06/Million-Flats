import crypto from 'crypto'
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { prisma } from '@/lib/prisma'
import { buildCdnAssetUrl, getS3Client, sanitizeFilename } from '@/lib/s3'
import { revalidatePath, revalidateTag } from 'next/cache'

export const ECOSYSTEM_BANNER_MAX_BYTES = Number(process.env.ECOSYSTEM_BANNER_MAX_BYTES) || 15 * 1024 * 1024
export const ECOSYSTEM_BANNER_RECOMMENDED_WIDTH = 2560
export const ECOSYSTEM_BANNER_RECOMMENDED_HEIGHT = 695
export const ECOSYSTEM_BANNER_MIN_WIDTH = 1280
export const ECOSYSTEM_BANNER_MIN_HEIGHT = 695
export const ECOSYSTEM_BANNER_MIN_ASPECT = 1.35
export const ECOSYSTEM_BANNER_MAX_ASPECT = 4.5
export const ECOSYSTEM_BANNER_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const

export type BannerDimensions = { width: number; height: number }

export function normalizeBannerContentType(value: unknown) {
  const type = String(value || '').trim().toLowerCase()
  return type === 'image/jpg' ? 'image/jpeg' : type
}

export function validateBannerMetadata(input: {
  fileSize: number
  mimeType: string
  width?: number | null
  height?: number | null
}) {
  const mimeType = normalizeBannerContentType(input.mimeType)
  if (!ECOSYSTEM_BANNER_TYPES.includes(mimeType as (typeof ECOSYSTEM_BANNER_TYPES)[number])) {
    return { ok: false as const, message: 'Only JPG, PNG, WebP, and supported AVIF images are allowed.' }
  }
  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0 || input.fileSize > ECOSYSTEM_BANNER_MAX_BYTES) {
    return { ok: false as const, message: `Banner images must be smaller than ${Math.floor(ECOSYSTEM_BANNER_MAX_BYTES / 1024 / 1024)}MB.` }
  }
  if (input.width && input.height) {
    const aspect = input.width / input.height
    if (input.width < ECOSYSTEM_BANNER_MIN_WIDTH || input.height < ECOSYSTEM_BANNER_MIN_HEIGHT || aspect < ECOSYSTEM_BANNER_MIN_ASPECT || aspect > ECOSYSTEM_BANNER_MAX_ASPECT) {
      return { ok: false as const, message: 'This image does not meet the recommended ecosystem banner dimensions. Please upload a suitable hero image.' }
    }
  }
  return { ok: true as const, mimeType }
}

function extensionForType(mimeType: string) {
  const type = normalizeBannerContentType(mimeType)
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  return 'jpg'
}

export function buildEcosystemBannerKey(categorySlug: string, mimeType: string) {
  const slug = String(categorySlug || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'category'
  const suffix = crypto.randomBytes(12).toString('hex')
  return `public/ecosystem/banners/${slug}/hero-${Date.now()}-${suffix}.${extensionForType(mimeType)}`
}

export function safeOriginalName(name: unknown) {
  return sanitizeFilename(String(name || 'banner').replace(/[/\\]/g, '-')) || 'banner'
}

function readUint32(buffer: Buffer, offset: number) {
  return buffer.readUInt32BE(offset)
}

export function detectImageDimensions(buffer: Buffer, mimeType: string): BannerDimensions | null {
  const type = normalizeBannerContentType(mimeType)
  if (type === 'image/png' && buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { width: readUint32(buffer, 16), height: readUint32(buffer, 20) }
  }
  if (type === 'image/webp' && buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buffer.toString('ascii', 12, 16)
    if (chunk === 'VP8X') return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) }
    if (chunk === 'VP8 ' && buffer.length >= 30 && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff }
    }
    if (chunk === 'VP8L' && buffer.length >= 25 && buffer[21] === 0x2f) {
      const bits = buffer.readUInt32LE(21)
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) }
    }
  }
  if (type === 'image/jpeg' && buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue }
      const marker = buffer[offset + 1]
      const length = buffer.readUInt16BE(offset + 2)
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) }
      }
      if (!length) break
      offset += 2 + length
    }
  }
  return null
}

export async function verifyStoredBanner(key: string, declaredType: string, declaredSize: number) {
  const bucket = String(process.env.AWS_S3_BUCKET || '').trim()
  if (!bucket) throw new Error('Missing AWS_S3_BUCKET')
  const s3 = getS3Client()
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
  const fileSize = Number(head.ContentLength || declaredSize)
  const mimeType = normalizeBannerContentType(head.ContentType || declaredType)
  const metadata = validateBannerMetadata({ fileSize, mimeType })
  if (!metadata.ok) throw new Error(metadata.message)
  const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: 'bytes=0-65535' }))
  const bytes = object.Body && 'transformToByteArray' in object.Body ? await object.Body.transformToByteArray() : null
  const dimensions = bytes ? detectImageDimensions(Buffer.from(bytes), mimeType) : null
  if (!dimensions) throw new Error('The uploaded file is not a valid supported image.')
  const dimensionalValidation = validateBannerMetadata({ fileSize, mimeType, ...dimensions })
  if (!dimensionalValidation.ok) throw new Error(dimensionalValidation.message)
  return { fileSize, mimeType, ...dimensions, imageUrl: buildCdnAssetUrl({ key }) }
}

export async function resolveEcosystemBanner(categoryId: string, legacyImage?: string | null) {
  const active = await (prisma as any).ecosystemBanner.findFirst({ where: { categoryId, status: 'ACTIVE' }, orderBy: { version: 'desc' } }).catch(() => null)
  return active?.imageUrl || String(legacyImage || '').trim() || null
}

export function revalidateEcosystemBannerSurfaces(categorySlug: string) {
  revalidateTag('ecosystem-partners')
  revalidatePath(`/ecosystem-partners/${categorySlug}`)
  revalidatePath('/ecosystem-partners')
}