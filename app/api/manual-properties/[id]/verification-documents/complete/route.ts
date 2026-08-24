import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { s3ObjectExists } from '@/lib/s3'

export const runtime = 'nodejs'

const BodySchema = z.object({
  category: z.enum(['OWNERSHIP_PROOF', 'AUTHORIZATION_LETTER', 'RERA_DOCUMENT', 'REGISTRATION_DOCUMENT', 'DEVELOPER_DOCUMENT', 'OTHER']),
  storageKey: z.string().trim().min(1),
  mimeType: z.string().trim().max(100).optional().nullable(),
  sizeBytes: z.number().int().min(1).max(50 * 1024 * 1024).optional().nullable(),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAgentSession()
    if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    const parsed = BodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ success: false, message: 'Invalid document data' }, { status: 400 })
    const property = await (prisma as any).manualProperty.findFirst({ where: { id: params.id, agentId: auth.agentId }, select: { id: true, status: true } })
    if (!property) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    if (property.status !== 'DRAFT' && property.status !== 'REJECTED') return NextResponse.json({ success: false, message: 'Cannot upload after submission' }, { status: 400 })
    if (!parsed.data.storageKey.startsWith(`private/properties/${property.id}/verification/`)) return NextResponse.json({ success: false, message: 'Storage key is not authorized' }, { status: 403 })
    if (!(await s3ObjectExists({ key: parsed.data.storageKey }).catch(() => false))) return NextResponse.json({ success: false, message: 'Uploaded document not found' }, { status: 404 })

    const document = await (prisma as any).manualPropertyVerificationDocument.create({
      data: { propertyId: property.id, category: parsed.data.category, storageKey: parsed.data.storageKey, mimeType: parsed.data.mimeType || null, sizeBytes: parsed.data.sizeBytes || null, uploadedBy: auth.userId },
      select: { id: true, category: true, mimeType: true, sizeBytes: true, uploadStatus: true, verificationStatus: true, createdAt: true },
    })
    return NextResponse.json({ success: true, document })
  } catch (error) {
    console.error('Verification document complete failed', error)
    return NextResponse.json({ success: false, message: 'Failed to save verification document' }, { status: 500 })
  }
}
