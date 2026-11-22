import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { createSignedPutUrlForKey } from '@/lib/s3'
import { prisma } from '@/lib/prisma'
import { buildEcosystemBannerKey, ECOSYSTEM_BANNER_MAX_BYTES, ECOSYSTEM_BANNER_TYPES, normalizeBannerContentType } from '@/lib/ecosystem/banner'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  try {
    const body = await req.json()
    const categoryId = String(body?.categoryId || '').trim()
    const contentType = normalizeBannerContentType(body?.contentType)
    const fileSizeBytes = Number(body?.fileSizeBytes)
    if (!categoryId) return NextResponse.json({ success: false, message: 'Category is required' }, { status: 400 })
    if (!ECOSYSTEM_BANNER_TYPES.includes(contentType as (typeof ECOSYSTEM_BANNER_TYPES)[number])) return NextResponse.json({ success: false, message: 'Unsupported banner image type' }, { status: 400 })
    if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0 || fileSizeBytes > ECOSYSTEM_BANNER_MAX_BYTES) return NextResponse.json({ success: false, message: `Banner images must be smaller than ${Math.floor(ECOSYSTEM_BANNER_MAX_BYTES / 1024 / 1024)}MB.` }, { status: 413 })
    const category = await (prisma as any).ecosystemCategory.findFirst({ where: { id: categoryId, isActive: true }, select: { id: true, slug: true } })
    if (!category) return NextResponse.json({ success: false, message: 'Ecosystem category not found' }, { status: 404 })
    const s3Key = buildEcosystemBannerKey(category.slug, contentType)
    const signed = await createSignedPutUrlForKey({
      key: s3Key,
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
      expiresInSeconds: 600,
    })
    return NextResponse.json({ success: true, uploadUrl: signed.uploadUrl, s3Key, expiresIn: signed.expiresIn })
  } catch (error) {
    console.error('Ecosystem banner presign error:', error)
    return NextResponse.json({ success: false, message: 'Failed to prepare banner upload' }, { status: 500 })
  }
}