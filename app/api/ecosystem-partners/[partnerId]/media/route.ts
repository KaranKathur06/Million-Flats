import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { NextResponse } from 'next/server'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import {
  PartnerAccessError,
  requirePartnerPermission,
  submitSensitivePartnerChange,
} from '@/lib/ecosystem/membership'
import { buildCdnAssetUrl, deleteFromS3, uploadToS3Key } from '@/lib/s3'
import { buildS3Key } from '@/utils/s3PathBuilder'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function detectRasterMime(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') return 'image/png'
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

export async function POST(
  request: Request,
  { params }: { params: { partnerId: string } }
) {
  const actor = await getAuthenticatedEcosystemUser()
  if (!actor) return NextResponse.json({ success: false, message: 'A verified MillionFlats account is required.' }, { status: 401 })

  let uploadedKey: string | null = null
  try {
    await requirePartnerPermission(params.partnerId, 'profile.stage_sensitive')
    const formData = await request.formData()
    const file = formData.get('file')
    const type = String(formData.get('type') || '').toUpperCase()
    if (!(file instanceof File)) return NextResponse.json({ success: false, message: 'Select an image file.' }, { status: 400 })
    if (type !== 'LOGO' && type !== 'COVER') return NextResponse.json({ success: false, message: 'Choose LOGO or COVER media.' }, { status: 400 })
    const source = Buffer.from(await file.arrayBuffer())
    const sourceMime = detectRasterMime(source)
    if (!sourceMime) return NextResponse.json({ success: false, message: 'Only valid JPEG, PNG or WebP images are supported.' }, { status: 400 })
    const maxBytes = type === 'LOGO' ? 2 * 1024 * 1024 : 10 * 1024 * 1024
    if (source.length > maxBytes) return NextResponse.json({ success: false, message: `The ${type.toLowerCase()} must be no larger than ${type === 'LOGO' ? '2 MB' : '10 MB'}.` }, { status: 400 })

    const image = await sharp(source, { limitInputPixels: 20_000_000 })
      .rotate()
      .resize({ width: type === 'LOGO' ? 1200 : 2400, height: type === 'LOGO' ? 1200 : 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer()
    const partner = await (prisma as any).ecosystemPartner.findFirst({
      where: { id: params.partnerId, status: 'APPROVED', isActive: true },
      select: { name: true },
    })
    if (!partner) return NextResponse.json({ success: false, message: 'Partner access is unavailable.' }, { status: 404 })

    uploadedKey = buildS3Key({
      visibility: 'public',
      module: 'ecosystem',
      subModule: `partners/${params.partnerId}/pending`,
      entityId: randomUUID(),
      fileName: `${type.toLowerCase()}.webp`,
    })
    await uploadToS3Key({ buffer: image, key: uploadedKey, contentType: 'image/webp' })
    const publicUrl = buildCdnAssetUrl({ key: uploadedKey })
    const prefix = type === 'LOGO' ? 'logo' : 'cover'
    const change = await submitSensitivePartnerChange(params.partnerId, actor, {
      [prefix]: publicUrl,
      [`${prefix}StorageKey`]: uploadedKey,
      [`${prefix}FileSize`]: image.length,
    })
    return NextResponse.json({
      success: true,
      data: { changeRequestId: change.id, status: change.status, mediaType: type },
    }, { status: 201 })
  } catch (error) {
    if (uploadedKey) {
      try {
        await deleteFromS3(uploadedKey)
      } catch (cleanupError) {
        console.error('[ecosystem-media] Failed to remove unsubmitted upload', { key: uploadedKey, error: cleanupError })
      }
    }
    if (error instanceof PartnerAccessError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[ecosystem-media] Failed to stage partner media', error)
    return NextResponse.json({ success: false, message: 'Unable to upload partner image.' }, { status: 500 })
  }
}
