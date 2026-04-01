import { buildS3ObjectUrl, uploadToS3Key } from '@/lib/s3'
import { buildS3Key, sanitizeS3Filename } from '@/utils/s3PathBuilder'

type UploadVisibility = 'public' | 'private'

type UploadFileInput = {
  file: File
  visibility: UploadVisibility
  module: string
  subModule?: string
  entityId?: string
  maxSizeBytes?: number
  allowedMimeTypes?: string[]
}

export class UploadServiceError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'UploadServiceError'
    this.status = status
  }
}

function normalizeMime(mime: string) {
  return String(mime || '').trim().toLowerCase()
}

function normalizeAllowedMimes(allowedMimeTypes?: string[]) {
  return (allowedMimeTypes || []).map((item) => normalizeMime(item)).filter(Boolean)
}

export async function uploadFile(input: UploadFileInput) {
  const file = input.file
  if (!(file instanceof File)) {
    throw new UploadServiceError('File is required', 400)
  }

  const allowedMimes = normalizeAllowedMimes(input.allowedMimeTypes)
  const mimeType = normalizeMime(file.type || 'application/octet-stream')
  const maxSizeBytes = input.maxSizeBytes ?? 10 * 1024 * 1024

  if (!mimeType) {
    throw new UploadServiceError('File MIME type is missing', 400)
  }
  if (allowedMimes.length > 0 && !allowedMimes.includes(mimeType)) {
    throw new UploadServiceError('Invalid file type', 400)
  }
  if (file.size > maxSizeBytes) {
    throw new UploadServiceError(`File too large (max ${Math.floor(maxSizeBytes / (1024 * 1024))}MB)`, 400)
  }

  const key = buildS3Key({
    visibility: input.visibility,
    module: input.module,
    subModule: input.subModule,
    entityId: input.entityId,
    fileName: sanitizeS3Filename(file.name || 'upload.bin'),
    includeTimestamp: true,
  })

  console.info('[uploadFile] uploading to S3', {
    visibility: input.visibility,
    module: input.module,
    subModule: input.subModule || null,
    entityId: input.entityId || null,
    fileName: file.name,
    mimeType,
    size: file.size,
    key,
  })

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    await uploadToS3Key({
      buffer,
      key,
      contentType: mimeType,
    })

    return {
      key,
      url: buildS3ObjectUrl({ key }),
      mimeType,
      size: file.size,
    }
  } catch (error) {
    console.error('[uploadFile] S3 upload failed', { key, error })
    throw new UploadServiceError('S3 upload failed', 500)
  }
}
