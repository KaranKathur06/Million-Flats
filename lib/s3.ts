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

function sanitizeFilename(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120)
}

export function buildS3Key(folder: string, filename: string) {
  const safeFolder = folder.replace(/^\/+/, '').replace(/\/+$/, '')
  const parsed = sanitizeFilename(filename || 'upload')
  const uniq = crypto.randomUUID()
  return `${safeFolder}/${Date.now()}-${uniq}-${parsed}`
}

export async function uploadToS3(params: {
  buffer: Buffer
  folder: string
  filename: string
  contentType: string
}) {
  const { region, bucket } = requireS3Env()
  const client = getS3Client()

  const key = buildS3Key(params.folder, params.filename)

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

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
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
      Key: params.key,
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

  const key = buildS3Key(params.folder, params.filename)
  const expiresIn = Math.min(60 * 10, Math.max(30, params.expiresInSeconds ?? 600))

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: params.contentType || 'application/octet-stream',
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
