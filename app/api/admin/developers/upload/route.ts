import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import {
  buildDeveloperLogoKey,
  sanitizeFilename,
  getS3Client,
  buildPublicAssetUrl,
} from '@/lib/s3'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'

export const runtime = 'nodejs'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

function guessExt(contentType: string) {
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  return 'jpg'
}

function buildDeveloperBannerKey(params: { developerSlug: string; ext?: string; contentType?: string }) {
  const ext = sanitizeFilename(params.ext || guessExt(params.contentType || '') || 'jpg').replace('.', '')
  const devSlug = sanitizeFilename(params.developerSlug || 'unknown')
  const uuid = crypto.randomUUID()
  return `public/developers/${devSlug}/banner/${uuid}.${ext}`
}

// ─── POST: Direct server-side upload (multipart/form-data) ─────────────────
// Called with FormData: { file: File, type: 'logo' | 'banner', developerSlug: string }
export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const type = (formData.get('type') as string) || 'logo'
    const developerSlug = ((formData.get('developerSlug') as string) || 'developer').trim()

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 })
    }

    const contentType = file.type || 'image/jpeg'
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { success: false, message: 'Only PNG, JPG, and WebP images are allowed' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ success: false, message: 'File too large. Max 5MB allowed.' }, { status: 400 })
    }

    const ext = guessExt(contentType)
    const safeSlug = sanitizeFilename(developerSlug || 'developer')

    const key =
      type === 'banner'
        ? buildDeveloperBannerKey({ developerSlug: safeSlug, ext, contentType })
        : buildDeveloperLogoKey({ developerSlug: safeSlug, ext, contentType })

    const buffer = Buffer.from(await file.arrayBuffer())

    const client = getS3Client()
    const bucket = String(process.env.AWS_S3_BUCKET || '').trim()
    if (!bucket) throw new Error('Missing AWS_S3_BUCKET')

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    )

    const url = buildPublicAssetUrl({ key })

    return NextResponse.json({ success: true, url, key })
  } catch (err: any) {
    console.error('[POST /api/admin/developers/upload]', err)
    return NextResponse.json({ success: false, message: err.message || 'Upload failed' }, { status: 500 })
  }
}
