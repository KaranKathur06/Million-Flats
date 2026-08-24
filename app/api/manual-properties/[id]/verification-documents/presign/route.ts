import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { createSignedPutUrl } from '@/lib/s3'
import { buildAssetUrl } from '@/lib/assetUrl'

export const runtime = 'nodejs'

const BodySchema = z.object({
  category: z.enum(['OWNERSHIP_PROOF', 'AUTHORIZATION_LETTER', 'RERA_DOCUMENT', 'REGISTRATION_DOCUMENT', 'DEVELOPER_DOCUMENT', 'OTHER']),
  filename: z.string().trim().min(1).max(160),
  contentType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  sizeBytes: z.number().int().min(1).max(50 * 1024 * 1024),
})

function safeFilename(name: string) {
  return name.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 120) || 'document'
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAgentSession()
    if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    const parsed = BodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ success: false, message: 'Invalid document data' }, { status: 400 })

    const property = await (prisma as any).manualProperty.findFirst({ where: { id: params.id, agentId: auth.agentId }, select: { id: true, status: true } })
    if (!property) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    if (property.status !== 'DRAFT' && property.status !== 'REJECTED') return NextResponse.json({ success: false, message: 'Cannot upload after submission' }, { status: 400 })

    const signed = await createSignedPutUrl({
      folder: `private/properties/${property.id}/verification`,
      filename: safeFilename(parsed.data.filename),
      contentType: parsed.data.contentType,
      expiresInSeconds: 600,
    })

    return NextResponse.json({ success: true, uploadUrl: signed.uploadUrl, key: signed.key, objectUrl: buildAssetUrl(signed.key) || signed.key, expiresIn: signed.expiresIn })
  } catch (error) {
    console.error('Verification document presign failed', error)
    return NextResponse.json({ success: false, message: 'Failed to prepare document upload' }, { status: 500 })
  }
}
