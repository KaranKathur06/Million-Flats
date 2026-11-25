import { buildAssetUrl, extractRelativeKey } from '@/lib/assetUrl'
import { generateSignedUrl } from '@/lib/cloudfront'

/** Resolve project media for server-side reads, including protected assets. */
export async function resolveProjectMediaUrl(path?: string | null): Promise<string | null> {
  const directUrl = buildAssetUrl(path)
  if (!directUrl) return null

  const key = extractRelativeKey(path)
  if (!key) return directUrl

  if (key.startsWith('public/')) {
    return directUrl
  }

  const signed = await generateSignedUrl({ s3Key: key, ttlSeconds: 3600 })
  return signed.url
}
