import crypto from 'crypto'

type Visibility = 'public' | 'private'

type BuildS3KeyParams = {
  visibility: Visibility
  module: string
  subModule?: string
  entityId?: string
  fileName: string
  includeTimestamp?: boolean
}

type BuildS3KeyFromFolderParams = {
  folder: string
  fileName: string
  includeTimestamp?: boolean
}

function sanitizePathSegment(value: string) {
  return String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function sanitizeS3Filename(fileName: string) {
  const safe = sanitizePathSegment(fileName || 'upload')
  return safe.slice(0, 140) || 'upload'
}

function splitAndCleanPath(input?: string) {
  if (!input) return [] as string[]
  return String(input)
    .split('/')
    .map((segment) => sanitizePathSegment(segment))
    .filter(Boolean)
}

function assertValidS3Key(key: string) {
  if (!key || key.startsWith('/') || key.includes('//')) {
    throw new Error(`Malformed S3 key: ${key}`)
  }
}

export function buildS3Key(params: BuildS3KeyParams) {
  const visibility = sanitizePathSegment(params.visibility)
  const moduleParts = splitAndCleanPath(params.module)
  const subModuleParts = splitAndCleanPath(params.subModule)
  const entityParts = splitAndCleanPath(params.entityId)

  const fileName = sanitizeS3Filename(params.fileName)
  const includeTimestamp = params.includeTimestamp !== false
  const prefix = includeTimestamp ? `${Date.now()}-${crypto.randomUUID()}-` : `${crypto.randomUUID()}-`
  const finalName = `${prefix}${fileName}`

  if ((visibility !== 'public' && visibility !== 'private') || moduleParts.length === 0 || !fileName) {
    throw new Error('Invalid S3 path params')
  }

  const key = [visibility, ...moduleParts, ...subModuleParts, ...entityParts, finalName].join('/')
  assertValidS3Key(key)
  return key
}

export function buildS3KeyFromFolder(params: BuildS3KeyFromFolderParams) {
  const folderParts = splitAndCleanPath(params.folder)
  const visibility = folderParts[0] as Visibility | undefined
  const module = folderParts[1] || ''
  const remaining = folderParts.slice(2)

  if (!visibility || (visibility !== 'public' && visibility !== 'private')) {
    throw new Error('Invalid S3 folder: visibility must start with public/ or private/')
  }
  if (!module) {
    throw new Error('Invalid S3 folder: module segment is required')
  }

  return buildS3Key({
    visibility,
    module,
    subModule: remaining.join('/') || undefined,
    fileName: params.fileName,
    includeTimestamp: params.includeTimestamp,
  })
}
