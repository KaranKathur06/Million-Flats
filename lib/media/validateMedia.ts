import { HeadObjectCommand } from '@aws-sdk/client-s3'
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
