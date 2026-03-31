import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'

type S3Env = {
  region: string
  bucket: string
}

function requireS3Env(): S3Env {
  const region = String(process.env.AWS_REGION || '').trim()
  const bucket = String(process.env.AWS_S3_BUCKET || '').trim()

  if (!region) throw new Error('Missing AWS_REGION')
  if (!bucket) throw new Error('Missing AWS_S3_BUCKET')

  return { region, bucket }
}

let cachedClient: S3Client | null = null

export function getS3Client() {
  if (cachedClient) return cachedClient

  const accessKeyId = String(process.env.AWS_ACCESS_KEY_ID || '').trim()
  const secretAccessKey = String(process.env.AWS_SECRET_ACCESS_KEY || '').trim()
  const region = String(process.env.AWS_REGION || '').trim()

  if (!accessKeyId) throw new Error('Missing AWS_ACCESS_KEY_ID')
  if (!secretAccessKey) throw new Error('Missing AWS_SECRET_ACCESS_KEY')
  if (!region) throw new Error('Missing AWS_REGION')

  cachedClient = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  return cachedClient
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

export function buildCanonicalKey(params: {
  visibility: 'public' | 'private'
  folder: string
  filename: string
  includeTimestamp?: boolean
}) {
  const folder = normalizePrefix(params.folder)
  const safeFilename = sanitizeFilename(params.filename || 'upload')
  const uniq = crypto.randomUUID()
  const ts = params.includeTimestamp === false ? '' : `${Date.now()}-`
  const key = `${params.visibility}/${folder}/${ts}${uniq}-${safeFilename}`
  return normalizePrefix(key)
}

export function buildS3ObjectUrl(params: { key: string }) {
  const { region, bucket } = requireS3Env()
  const key = normalizePrefix(params.key)
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key).replace(/%2F/g, '/')}`
}

export function buildPublicAssetUrl(params: { key: string }) {
  const key = normalizePrefix(params.key)
  const base = String(process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '')
  if (base) {
    return `${base}/${encodeURIComponent(key).replace(/%2F/g, '/')}`
  }
  return buildS3ObjectUrl({ key })
}

export function buildS3Key(folder: string, filename: string) {
  const safeFolder = folder.replace(/^\/+/, '').replace(/\/+$/, '')
  const parsed = sanitizeFilename(filename || 'upload')
  const uniq = crypto.randomUUID()
  return `${safeFolder}/${Date.now()}-${uniq}-${parsed}`
}

function requireCanonicalPrefix(key: string) {
  const k = normalizePrefix(key)
  if (!k.startsWith('public/') && !k.startsWith('private/')) {
    throw new Error('Invalid S3 key: must begin with public/ or private/')
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
  return `public/agents/${agentId}/profile-${ts}.${safeExt}`
}

export function buildAgentDocumentKey(params: { agentId: string; documentType: string; ext?: string; contentType?: string }) {
  const ext = sanitizeFilename(params.ext || guessExtensionFromContentType(params.contentType || '') || 'bin').replace('.', '')
  const agentId = sanitizeFilename(params.agentId || '')
  const docType = sanitizeFilename(params.documentType || 'document')
  const uuid = crypto.randomUUID()
  return `private/agents/${agentId}/documents/${docType}/${uuid}.${ext}`
}

export function buildPropertyImageKey(params: { propertyId: string; ext?: string; contentType?: string }) {
  const ext = sanitizeFilename(params.ext || guessExtensionFromContentType(params.contentType || '') || 'bin').replace('.', '')
  const pid = sanitizeFilename(params.propertyId || '')
  const uuid = crypto.randomUUID()
  return `public/properties/${pid}/images/${uuid}.${ext}`
}

export function buildPropertyVideoKey(params: { propertyId: string; ext?: string; contentType?: string }) {
  const ext = sanitizeFilename(params.ext || guessExtensionFromContentType(params.contentType || '') || 'bin').replace('.', '')
  const pid = sanitizeFilename(params.propertyId || '')
  const uuid = crypto.randomUUID()
  return `public/properties/${pid}/videos/${uuid}.${ext}`
}

export function buildEcosystemPartnerLogoKey(params: { partnerId: string; ext?: string; contentType?: string }) {
  const ext = sanitizeFilename(params.ext || guessExtensionFromContentType(params.contentType || '') || 'bin').replace('.', '')
  const partnerId = sanitizeFilename(params.partnerId || '')
  const uuid = crypto.randomUUID()
  return `public/ecosystem/partners/${partnerId}/logo/${uuid}.${ext}`
}

export function buildEcosystemRegistrationDocKey(params: { registrationId: string; ext?: string; contentType?: string }) {
  const extRaw = params.ext || guessExtensionFromContentType(params.contentType || '') || 'pdf'
  const ext = sanitizeFilename(extRaw).replace('.', '')
  const id = sanitizeFilename(params.registrationId || '')
  const uuid = crypto.randomUUID()
  return `private/ecosystem/registrations/${id}/documents/${uuid}.${ext}`
}

export function buildProjectMediaKey(params: { developerSlug: string; projectSlug: string; ext?: string; contentType?: string }) {
  const ext = sanitizeFilename(params.ext || guessExtensionFromContentType(params.contentType || '') || 'bin').replace('.', '')
  const devSlug = sanitizeFilename(params.developerSlug || 'unknown')
  const projSlug = sanitizeFilename(params.projectSlug || 'unknown')
  const uuid = crypto.randomUUID()
  return `public/developers/${devSlug}/${projSlug}/media/${uuid}.${ext}`
}

export function buildProjectGalleryKey(params: { developerSlug: string; projectSlug: string; originalName: string; contentType?: string }) {
  const devSlug = normalizeSlugSegment(params.developerSlug || 'unknown')
  const projSlug = normalizeSlugSegment(params.projectSlug || 'unknown')
  const filename = normalizeProjectImageFilename({ originalName: params.originalName, contentType: params.contentType })
  return `public/projects/${devSlug}/${projSlug}/gallery/${filename}`
}

export function buildDeveloperLogoKey(params: { developerSlug: string; ext?: string; contentType?: string }) {
  const ext = sanitizeFilename(params.ext || guessExtensionFromContentType(params.contentType || '') || 'bin').replace('.', '')
  const devSlug = sanitizeFilename(params.developerSlug || 'unknown')
  const uuid = crypto.randomUUID()
  return `public/developers/${devSlug}/logo/${uuid}.${ext}`
}

export function buildBlogFeaturedImageKey(params: { slug: string; timestamp?: number; ext?: string; contentType?: string }) {
  const ext = sanitizeFilename(params.ext || guessExtensionFromContentType(params.contentType || '') || 'jpg').replace('.', '')
  const slug = normalizeSlugSegment(params.slug || 'blog')
  const ts = params.timestamp ?? Date.now()
  return `public/blogs/${slug}/featured-${ts}.${ext}`
}

export async function uploadToS3(params: {
  buffer: Buffer
  folder: string
  filename: string
  contentType: string
}) {
  const { region, bucket } = requireS3Env()
  const client = getS3Client()

  const key = requireCanonicalPrefix(buildS3Key(params.folder, params.filename))

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: params.buffer,
      ContentType: params.contentType,
    })
  )

  const objectUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key).replace(/%2F/g, '/')}`

  return { bucket, key, objectUrl }
}

export async function uploadToS3Key(params: {
  buffer: Buffer
  key: string
  contentType: string
}) {
  const { region, bucket } = requireS3Env()
  const client = getS3Client()

  const key = requireCanonicalPrefix(params.key)

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: params.buffer,
      ContentType: params.contentType,
    })
  )

  const objectUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key).replace(/%2F/g, '/')}`

  return { bucket, key, objectUrl }
}

export async function deleteFromS3(key: string) {
  const { bucket } = requireS3Env()
  const client = getS3Client()

  const normalized = key.replace(/^\/+/, '')

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: normalized,
    })
  )

  return { success: true as const }
}

export async function createSignedGetUrl(params: { key: string; expiresInSeconds?: number }) {
  const { region, bucket } = requireS3Env()
  const client = getS3Client()

  const expiresIn = Math.min(60 * 60, Math.max(30, params.expiresInSeconds ?? 900))

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: requireCanonicalPrefix(params.key),
    }),
    { expiresIn }
  )

  return { region, bucket, url, expiresIn }
}

export async function createSignedPutUrl(params: {
  folder: string
  filename: string
  contentType: string
  expiresInSeconds?: number
}) {
  const { region, bucket } = requireS3Env()
  const client = getS3Client()

  const key = requireCanonicalPrefix(buildS3Key(params.folder, params.filename))
  const expiresIn = Math.min(60 * 10, Math.max(30, params.expiresInSeconds ?? 600))

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: params.contentType || 'application/octet-stream',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
    { expiresIn }
  )

  const objectUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key).replace(/%2F/g, '/')}`

  return { region, bucket, key, uploadUrl, objectUrl, expiresIn }
}

export async function createSignedPutUrlForKey(params: {
  key: string
  contentType: string
  expiresInSeconds?: number
}) {
  const { region, bucket } = requireS3Env()
  const client = getS3Client()

  const key = requireCanonicalPrefix(params.key)
  const expiresIn = Math.min(60 * 10, Math.max(30, params.expiresInSeconds ?? 600))

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: params.contentType || 'application/octet-stream',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
    { expiresIn }
  )

  const objectUrl = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key).replace(/%2F/g, '/')}`

  return { region, bucket, key, uploadUrl, objectUrl, expiresIn }
}

export function extractS3KeyFromUrl(objectUrl: string) {
  const { region, bucket } = requireS3Env()
  const prefix = `https://${bucket}.s3.${region}.amazonaws.com/`
  if (!objectUrl.startsWith(prefix)) return null
  const keyPart = objectUrl.slice(prefix.length)
  return decodeURIComponent(keyPart)
}
