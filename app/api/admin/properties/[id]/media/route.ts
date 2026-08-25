import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { buildAssetUrl } from '@/lib/assetUrl'
import { createSignedPutUrl, s3ObjectExists } from '@/lib/s3'
import { PROPERTY_MEDIA_ALLOWED_TYPES, PROPERTY_MEDIA_CATEGORIES, PROPERTY_MEDIA_MAX_IMAGE_BYTES, isPropertyMediaCategory, propertyMediaCategory, propertyMediaStorageCategory } from '@/lib/propertyMedia'

const maxBytes = Number(process.env.PROJECT_IMAGE_MAX_SIZE_BYTES) || PROPERTY_MEDIA_MAX_IMAGE_BYTES

async function propertyExists(id: string) {
  return (prisma as any).manualProperty.findUnique({ where: { id }, select: { id: true } })
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  if (!await propertyExists(params.id)) return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 })
  const requestedCategory = new URL(req.url).searchParams.get('category')
  const where: Record<string, unknown> = { propertyId: params.id }
  if (requestedCategory) {
    if (!isPropertyMediaCategory(requestedCategory)) return NextResponse.json({ success: false, message: 'Invalid media category' }, { status: 400 })
    where.category = propertyMediaStorageCategory(requestedCategory)
  }
  const media = await (prisma as any).manualPropertyMedia.findMany({ where, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] })
  return NextResponse.json({ success: true, media: media.map((item: any) => ({ ...item, category: propertyMediaCategory(item.category), url: buildAssetUrl(item.s3Key || item.url) || item.url })) })
}

const presignSchema = z.object({ fileName: z.string().min(1).max(160), fileSizeBytes: z.number().int().positive(), contentType: z.string().min(1), category: z.string(), floorPlanTitle: z.string().trim().max(160).optional().nullable(), floorPlanBedroomCount: z.number().int().min(0).max(100).optional().nullable() })

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const parsed = presignSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Invalid upload request' }, { status: 400 })
  const data = parsed.data
  if (!isPropertyMediaCategory(data.category) || !(PROPERTY_MEDIA_ALLOWED_TYPES as readonly string[]).includes(data.contentType.toLowerCase())) return NextResponse.json({ success: false, message: 'Unsupported media category or file format' }, { status: 400 })
  if (data.fileSizeBytes > maxBytes) return NextResponse.json({ success: false, message: `File exceeds ${Math.floor(maxBytes / 1024 / 1024)}MB limit` }, { status: 413 })
  if (!await propertyExists(params.id)) return NextResponse.json({ success: false, message: 'Property not found' }, { status: 404 })
  const signed = await createSignedPutUrl({ folder: `public/properties/${params.id}/images`, filename: data.fileName, contentType: data.contentType, expiresInSeconds: 600 })
  return NextResponse.json({ success: true, uploadUrl: signed.uploadUrl, s3Key: signed.key, expiresIn: signed.expiresIn })
}

const finalizeSchema = presignSchema.extend({ s3Key: z.string().min(1), altText: z.string().max(200).optional().nullable() })

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const parsed = finalizeSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success || !isPropertyMediaCategory(parsed.data?.category)) return NextResponse.json({ success: false, message: 'Invalid media finalization' }, { status: 400 })
  const data = parsed.data
  if (!data.s3Key.startsWith(`public/properties/${params.id}/images/`)) return NextResponse.json({ success: false, message: 'Storage key is not authorized for this property' }, { status: 403 })
  if (!await propertyExists(params.id) || !await s3ObjectExists({ key: data.s3Key })) return NextResponse.json({ success: false, message: 'Property or uploaded object not found' }, { status: 404 })
  const category = propertyMediaStorageCategory(data.category as typeof PROPERTY_MEDIA_CATEGORIES[number])
  const media = await (prisma as any).$transaction(async (tx: any) => {
    if (category === 'COVER') await tx.manualPropertyMedia.updateMany({ where: { propertyId: params.id, category: 'COVER' }, data: { category: 'EXTERIOR' } })
    const last = await tx.manualPropertyMedia.aggregate({ where: { propertyId: params.id }, _max: { position: true } })
    return tx.manualPropertyMedia.create({ data: { propertyId: params.id, category, url: buildAssetUrl(data.s3Key) || data.s3Key, s3Key: data.s3Key, mimeType: data.contentType, sizeBytes: data.fileSizeBytes, altText: data.altText || null, floorPlanTitle: category === 'FLOOR_PLANS' ? data.floorPlanTitle || null : null, floorPlanBedroomCount: category === 'FLOOR_PLANS' ? data.floorPlanBedroomCount ?? null : null, position: (last._max.position ?? -1) + 1 } })
  })
  return NextResponse.json({ success: true, media: { ...media, category: propertyMediaCategory(media.category) } }, { status: 201 })
}
