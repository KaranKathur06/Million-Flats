import crypto from 'crypto'
import { buildS3Key as buildStructuredS3Key, buildS3KeyFromFolder } from '@/utils/s3PathBuilder'
import { buildCdnUrl } from '@/lib/cloudfront'
import { extractRelativeKey } from '@/lib/assetUrl'
import { getStorageProvider } from '@/lib/storage'
import { getGcsStorageConfig } from '@/lib/storage/storage.config'

type S3Env = {
  region: string
  bucket: string
}

function requireS3Env(): S3Env {
  const config = getGcsStorageConfig()
  return { region: 'gcs', bucket: config.bucket }
}

export function getS3StorageConfig() {
  const config = getGcsStorageConfig()
  return {
    region: 'gcs',
    bucket: config.bucket,
    projectId: config.projectId,
  }
}

/** @deprecated Direct provider access is removed. Use getStorageProvider(). */
export function getS3Client(): never {
  throw new Error('Direct S3 client access is disabled. Use getStorageProvider().')
}

export function sanitizeFilename(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120)
}

function normalizePrefix(prefix: string) {
  return prefix.replace(/^\/+/, '').replace(/\/+$/, '')
}

export function isPublicKey(key: string) {
  return normalizePrefix(key).startsWith('public/')
}

export function isPrivateKey(key: string) {
  return normalizePrefix(key).startsWith('private/')
}

export function isProtectedKey(key: string) {
  return normalizePrefix(key).startsWith('protected/')
}

export function buildCanonicalKey(params: {
  visibility: 'public' | 'private'
  folder: string
  filename: string
  includeTimestamp?: boolean
}) {
  const folder = normalizePrefix(params.folder)
  const [module = '', ...rest] = folder.split('/').filter(Boolean)
  if (!module) throw new Error('Invalid S3 folder: module segment is required')
  return buildStructuredS3Key({
    visibility: params.visibility,
    module,
    subModule: rest.join('/') || undefined,
    fileName: sanitizeFilename(params.filename || 'upload'),
    includeTimestamp: params.includeTimestamp,
  })
}

/** @deprecated Use buildCdnAssetUrl() directly. */
export function buildS3ObjectUrl(params: { key: string }) {
  const key = normalizePrefix(params.key)
  return buildCdnAssetUrl({ key })
}

/**
 * @deprecated Use buildCdnAssetUrl() for read access.
 */
export function buildPublicAssetUrl(params: { key: string }) {
  const key = normalizePrefix(params.key)
  return buildCdnAssetUrl({ key })
}

/**
 * Build a CDN URL for read access to a storage asset.
 * The configured CDN is required because the GCS bucket is private.
 * This is the PRIMARY function to use for all asset read URLs.
 */
export function buildCdnAssetUrl(params: { key: string }): string {
  const key = normalizePrefix(params.key)
  return buildCdnUrl(key)
}

export function buildS3Key(folder: string, filename: string) {
  return buildS3KeyFromFolder({
    folder,
    fileName: sanitizeFilename(filename || 'upload'),
    includeTimestamp: true,
  })
}

function requireCanonicalPrefix(key: string) {
  const k = normalizePrefix(key)
  if (!k.startsWith('public/') && !k.startsWith('private/') && !k.startsWith('protected/')) {
    throw new Error('Invalid storage key: must begin with public/, private/, or protected/')
  }
  return k
}

function guessExtensionFromContentType(contentType: string) {
  const m = String(contentType || '').toLowerCase()
  if (m.includes('image/jpeg')) return 'jpg'
  if (m.includes('image/png')) return 'png'
  if (m.includes('image/webp')) return 'webp'
  if (m.includes('video/mp4')) return 'mp4'
  if (m.includes('video/webm')) return 'webm'
  if (m.includes('application/pdf')) return 'pdf'
  return ''
}

function normalizeSlugSegment(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function normalizeProjectImageFilename(params: { originalName: string; contentType?: string }) {
  const original = String(params.originalName || '').trim()
  const lastDot = original.lastIndexOf('.')
  const rawBase = lastDot > 0 ? original.slice(0, lastDot) : original
  const rawExt = lastDot > 0 ? original.slice(lastDot + 1) : ''
  const ext = (sanitizeFilename(rawExt || guessExtensionFromContentType(params.contentType || '') || 'jpg').replace('.', '') || 'jpg').toUpperCase()

  const base = String(rawBase || 'IMAGE')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 120) || 'IMAGE'

  return `${base}.${ext}`
}

export function buildAgentProfileImageKey(params: { agentId: string; ext: string; timestamp?: number }) {
  const ts = params.timestamp ?? Date.now()
  const safeExt = sanitizeFilename(params.ext || '').replace('.', '')
  const agentId = sanitizeFilename(params.agentId || '')
  return `public/agents/${agentId}/profile-${ts}.${safeExt}`.replace(/\/+/g, '/')
}

export function buildAgentDocumentKey(params: { agentId: string; documentType: string; ext?: string; contentType?: string }) {
  const ext = sanitizeFilename(params.ext || guessExtensionFromContentType(params.contentType || '') || 'bin').replace('.', '')
  const agentId = sanitizeFilename(params.agentId || '')
  const docType = sanitizeFilename(params.documentType || 'document')
  return buildStructuredS3Key({
    visibility: 'private',
    module: 'agents',
    subModule: `${agentId}/documents/${docType}`,
    fileName: `file.${ext}`,
  })
}

export function buildPropertyImageKey(params: { propertyId: string; ext?: string; contentType?: string }) {
  const ext = sanitizeFilename(params.ext || guessExtensionFromContentType(params.contentType || '') || 'bin').replace('.', '')
  const pid = sanitizeFilename(params.propertyId || '')
  return buildStructuredS3Key({
    visibility: 'public',
    module: 'properties',
    subModule: `${pid}/images`,
    fileName: `image.${ext}`,
  })
}

export function buildPropertyVideoKey(params: { propertyId: string; ext?: string; contentType?: string }) {
  const ext = sanitizeFilename(params.ext || guessExtensionFromContentType(params.contentType || '') || 'bin').replace('.', '')
  const pid = sanitizeFilename(params.propertyId || '')
  return buildStructuredS3Key({
    visibility: 'public',
    module: 'properties',
    subModule: `${pid}/videos`,
    fileName: `video.${ext}`,
  })
}

export function buildEcosystemPartnerLogoKey(params: { partnerId: string; ext?: string; contentType?: string }) {
  const ext = sanitizeFilename(params.ext || guessExtensionFromContentType(params.contentType || '') || 'bin').replace('.', '')
  const partnerId = sanitizeFilename(params.partnerId || '')
  return buildStructuredS3Key({
    visibility: 'public',
    module: 'ecosystem',
    subModule: `partners/${partnerId}/logo`,
    fileName: `logo.${ext}`,
  })
}

export function buildEcosystemPartnerCoverKey(params: { partnerId: string; ext?: string; contentType?: string }) {
  const ext = sanitizeFilename(params.ext || guessExtensionFromContentType(params.contentType || '') || 'bin').replace('.', '')
  const partnerId = sanitizeFilename(params.partnerId || '')
  return buildStructuredS3Key({
    visibility: 'public',
    module: 'ecosystem',
    subModule: `partners/${partnerId}/cover`,
    fileName: `cover.${ext}`,
  })
}


export function buildEcosystemRegistrationDocKey(params: { registrationId: string; ext?: string; contentType?: string }) {
  const extRaw = params.ext || guessExtensionFromContentType(params.contentType || '') || 'pdf'
  const ext = sanitizeFilename(extRaw).replace('.', '')
  const id = sanitizeFilename(params.registrationId || '')
  return buildStructuredS3Key({
    visibility: 'private',
    module: 'ecosystem',
    subModule: `registrations/${id}/documents`,
    fileName: `document.${ext}`,
  })
}

export function buildProjectMediaKey(params: { developerSlug: string; projectSlug: string; ext?: string; contentType?: string }) {
  const ext = sanitizeFilename(params.ext || guessExtensionFromContentType(params.contentType || '') || 'bin').replace('.', '')
  const devSlug = sanitizeFilename(params.developerSlug || 'unknown')
  const projSlug = sanitizeFilename(params.projectSlug || 'unknown')
  return buildStructuredS3Key({
    visibility: 'public',
    module: 'developers',
    subModule: `${devSlug}/${projSlug}/media`,
    fileName: `media.${ext}`,
  })
}

export function buildProjectGalleryKey(params: { developerSlug: string; projectSlug: string; originalName: string; contentType?: string }) {
  return buildProjectMediaTypeKey({ ...params, mediaType: 'other' })
}

export function buildProjectMediaTypeKey(params: { developerSlug: string; projectSlug: string; originalName: string; contentType?: string; mediaType?: string }) {
  const devSlug = normalizeSlugSegment(params.developerSlug || 'unknown')
  const projSlug = normalizeSlugSegment(params.projectSlug || 'unknown')
  const filename = normalizeProjectImageFilename({ originalName: params.originalName, contentType: params.contentType })
  const mt = String(params.mediaType || 'hero').toLowerCase()
  const folder =
    mt === 'hero' ? 'hero'
      : mt === 'other' ? 'other'
        : mt === 'exterior' ? 'exterior'
          : mt === 'amenities' ? 'amenities'
            : mt === 'lifestyle' ? 'lifestyle'
              : mt === 'floor_plan' || mt === 'floor-plan' || mt === 'floorplan' ? 'floor-plans'
                : 'other'
  return `public/projects/${devSlug}/${projSlug}/${folder}/${filename}`
}

export function buildDeveloperLogoKey(params: { developerSlug: string; ext?: string; contentType?: string }) {
  const ext = sanitizeFilename(params.ext || guessExtensionFromContentType(params.contentType || '') || 'bin').replace('.', '')
  const devSlug = sanitizeFilename(params.developerSlug || 'unknown')
  return buildStructuredS3Key({
    visibility: 'public',
    module: 'developers',
    subModule: `${devSlug}/logo`,
    fileName: `logo.${ext}`,
  })
}

export function buildProjectBrochureKey(params: { developerSlug?: string | null; projectSlug: string; originalName: string; contentType?: string }) {
  const devSlug = normalizeSlugSegment(params.developerSlug || '')
  const projSlug = normalizeSlugSegment(params.projectSlug || 'unknown')
  const ext = sanitizeFilename(
    guessExtensionFromContentType(params.contentType || '') || 'pdf'
  ).replace('.', '')
  const rawBase = params.originalName?.replace(/\.[^.]+$/, '') || 'brochure'
  const base = sanitizeFilename(rawBase) || 'brochure'
  const ts = Date.now()
  const filename = `${base}-${ts}.${ext}`

  if (devSlug) {
    return `public/projects/${devSlug}/${projSlug}/brochure/${filename}`
  }
  return `public/projects/${projSlug}/brochure/${filename}`
}

export function buildBlogFeaturedImageKey(params: { slug: string; timestamp?: number }) {
  const slug = normalizeSlugSegment(params.slug || 'blog')
  const ts = params.timestamp ?? Date.now()
  return `public/blogs/${slug}/featured-${ts}.jpg`
}

export async function uploadToS3(params: {
  buffer: Buffer
  folder: string
  filename: string
  contentType: string
}) {
  const { bucket } = requireS3Env()
  const key = requireCanonicalPrefix(buildS3Key(params.folder, params.filename))
  await getStorageProvider().uploadBuffer(params.buffer, {
    key,
    contentType: params.contentType,
  })
  const objectUrl = buildCdnAssetUrl({ key })
  return { bucket, key, objectUrl }
}

export async function uploadToS3Key(params: {
  buffer: Buffer
  key: string
  contentType: string
}) {
  const { bucket } = requireS3Env()
  const key = requireCanonicalPrefix(params.key)
  await getStorageProvider().uploadBuffer(params.buffer, {
    key,
    contentType: params.contentType,
  })
  const objectUrl = buildCdnAssetUrl({ key })
  return { bucket, key, objectUrl }
}

export async function deleteFromS3(key: string) {
  await getStorageProvider().deleteFile(requireCanonicalPrefix(key))
  return { success: true as const }
}

export async function deleteFolderFromS3(prefix: string) {
  const normalizedPrefix = prefix.replace(/^\/+/, '').replace(/\/+$/, '') + '/'
  const deletedCount = await getStorageProvider().deleteFolder(normalizedPrefix)
  return { success: true as const, deletedCount, prefix: normalizedPrefix }
}

export async function createSignedGetUrl(params: { key: string; expiresInSeconds?: number }) {
  const { bucket } = requireS3Env()
  const expiresIn = Math.min(60 * 60, Math.max(30, params.expiresInSeconds ?? 900))
  const result = await getStorageProvider().getSignedReadUrl(requireCanonicalPrefix(params.key), expiresIn)
  return { region: 'gcs', bucket, url: result.url, expiresIn: result.expiresInSeconds }
}

export async function s3ObjectExists(params: { key: string }) {
  return getStorageProvider().fileExists(requireCanonicalPrefix(params.key))
}

export async function getS3ObjectMetadata(params: { key: string }) {
  const result = await getStorageProvider().getFileMetadata(requireCanonicalPrefix(params.key))
  return {
    sizeBytes: result.sizeBytes,
    contentType: result.contentType,
    etag: result.etag,
  }
}

export async function createSignedPutUrl(params: {
  folder: string
  filename: string
  contentType: string
  expiresInSeconds?: number
}) {
  const { bucket } = requireS3Env()
  const key = requireCanonicalPrefix(buildS3Key(params.folder, params.filename))
  const expiresIn = Math.min(60 * 10, Math.max(30, params.expiresInSeconds ?? 600))
  const result = await getStorageProvider().getSignedUploadUrl(
    key,
    expiresIn,
    params.contentType || 'application/octet-stream',
    'public, max-age=31536000, immutable'
  )
  const objectUrl = buildCdnAssetUrl({ key })
  return { region: 'gcs', bucket, key, uploadUrl: result.url, objectUrl, expiresIn: result.expiresInSeconds }
}

export async function createSignedPutUrlForKey(params: {
  key: string
  contentType: string
  cacheControl?: string
  expiresInSeconds?: number
}) {
  const { bucket } = requireS3Env()
  const key = requireCanonicalPrefix(params.key)
  const expiresIn = Math.min(60 * 10, Math.max(30, params.expiresInSeconds ?? 600))
  const result = await getStorageProvider().getSignedUploadUrl(
    key,
    expiresIn,
    params.contentType || 'application/octet-stream',
    params.cacheControl || 'public, max-age=31536000, immutable'
  )
  if (!result.url || !result.url.startsWith('http')) {
    throw new Error('Failed to generate signed upload URL')
  }
  const objectUrl = buildCdnAssetUrl({ key })
  return { region: 'gcs', bucket, key, uploadUrl: result.url, objectUrl, expiresIn: result.expiresInSeconds }
}

export function extractS3KeyFromUrl(objectUrl: string) {
  const normalized = String(objectUrl || '').trim()
  if (!normalized) return null

  const key = extractRelativeKey(normalized)
  if (!key) return null

  return key
}
