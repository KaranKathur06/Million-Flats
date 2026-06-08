import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgentSession } from '@/lib/agentAuth'
import { extractS3KeyFromUrl } from '@/lib/s3'
import { generateSignedUrl } from '@/lib/cloudfront'
import { classifyAsset } from '@/lib/assetAuth'
import { trackAssetAccess } from '@/lib/assetTracking'

export const runtime = 'nodejs'

const BodySchema = z.object({
  url: z.string().trim().min(1).optional(),
  key: z.string().trim().min(1).optional(),
  expiresInSeconds: z.number().int().min(30).max(3600).optional(),
})

export async function POST(req: Request) {
  const auth = await requireAgentSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 })
  }

  const key = parsed.data.key || (parsed.data.url ? extractS3KeyFromUrl(parsed.data.url) : null)
  if (!key) {
    return NextResponse.json({ success: false, message: 'Invalid S3 url/key' }, { status: 400 })
  }

  // Use CloudFront signed URL with asset-appropriate TTL
  const classification = classifyAsset(key)
  const ttl = parsed.data.expiresInSeconds ?? classification.ttl

  const signed = await generateSignedUrl({ s3Key: key, ttlSeconds: ttl })

  // Track if this is a protected/private asset (non-blocking)
  if (classification.trackable) {
    trackAssetAccess({
      userId: (auth as any).userId || null,
      userRole: 'AGENT',
      s3Key: key,
      assetType: classification.assetType,
      action: 'view',
      ttlGranted: signed.expiresIn,
    }).catch(() => {})
  }

  return NextResponse.json({
    success: true,
    url: signed.url,
    expiresIn: signed.expiresIn,
    source: signed.source,
  })
}
