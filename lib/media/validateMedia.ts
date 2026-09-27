import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { getS3Client } from '@/lib/s3'
import { buildAssetUrl } from '@/lib/assetUrl'

/** Verify uploaded object exists in S3 before persisting to database */
export async function validateStoredMediaKey(key: string): Promise<{ ok: boolean; url: string | null; error?: string }> {
  const trimmed = String(key || '').trim()
  if (!trimmed) {
    return { ok: false, url: null, error: 'Empty media key' }
  }

  const bucket = String(process.env.AWS_S3_BUCKET || '').trim()
  if (!bucket) {
    return { ok: false, url: null, error: 'Missing AWS_S3_BUCKET' }
  }

  try {
    await getS3Client().send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: trimmed,
      })
    )
    return { ok: true, url: buildAssetUrl(trimmed) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Storage verification failed'
    return { ok: false, url: buildAssetUrl(trimmed), error: message }
  }
}

/**
 * Verify the bytes stored in S3 match the media type claimed during presigning.
 * This closes the gap left by browser-provided MIME types and filename extensions.
 */
export async function validateStoredMediaSignature(key: string, contentType: string): Promise<{ ok: boolean; error?: string }> {
  const bucket = String(process.env.AWS_S3_BUCKET || '').trim()
  if (!bucket) return { ok: false, error: 'Storage configuration is incomplete' }

  try {
    const isPdf = String(contentType || '').toLowerCase() === 'application/pdf'
    const result = await getS3Client().send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ...(isPdf ? { Range: 'bytes=0-511' } : {}),
    }))
    const bytes = result.Body && 'transformToByteArray' in result.Body
      ? await (result.Body as any).transformToByteArray() as Uint8Array
      : new Uint8Array()
    if (bytes.length === 0) return { ok: false, error: 'Uploaded file is empty or unreadable' }
    const type = String(contentType || '').toLowerCase()
    const header = bytes.subarray(0, 65536)
    const ascii = new TextDecoder().decode(header).trimStart().toLowerCase()
    const starts = (...expected: number[]) => expected.every((value, index) => bytes[index] === value)
    const valid =
      (type === 'image/jpeg' || type === 'image/jpg') ? starts(0xff, 0xd8, 0xff) :
      type === 'image/png' ? starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a) :
      type === 'image/webp' ? starts(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP' :
      type === 'image/avif' ? String.fromCharCode(...bytes.slice(4, 12)).includes('ftyp') && new TextDecoder().decode(bytes.slice(8, 32)).includes('avif') :
      type === 'application/pdf' ? starts(0x25, 0x50, 0x44, 0x46, 0x2d) :
      type === 'image/svg+xml' ? ascii.startsWith('<svg') || ascii.startsWith('<?xml') && ascii.includes('<svg') :
      false
    if (!valid) return { ok: false, error: 'The uploaded file content does not match its declared media type' }

    if (type.startsWith('image/')) {
      const metadata = await sharp(Buffer.from(bytes), { limitInputPixels: 100_000_000 }).metadata()
      const expectedFormats: Record<string, string[]> = {
        'image/jpeg': ['jpeg'],
        'image/jpg': ['jpeg'],
        'image/png': ['png'],
        'image/webp': ['webp'],
        'image/avif': ['avif'],
        'image/svg+xml': ['svg'],
      }
      const width = Number(metadata.width || 0)
      const height = Number(metadata.height || 0)
      if (!expectedFormats[type]?.includes(String(metadata.format || '').toLowerCase())) {
        return { ok: false, error: 'The uploaded image could not be decoded as the declared format' }
      }
      if (width < 1 || height < 1 || width > 40000 || height > 40000 || width * height > 100_000_000) {
        return { ok: false, error: 'The uploaded image has invalid or unsupported dimensions' }
      }
    }

    return { ok: true }
  } catch (error) {
    console.error('[media signature validation] failed', { key, contentType, error: error instanceof Error ? error.message : 'unknown' })
    return { ok: false, error: 'Unable to validate uploaded file content' }
  }
}
