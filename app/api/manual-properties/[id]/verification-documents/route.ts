import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { deleteFromS3 } from '@/lib/s3'

export const runtime = 'nodejs'

async function ownedProperty(id: string, agentId: string) {
  return (prisma as any).manualProperty.findFirst({ where: { id, agentId }, select: { id: true, status: true } })
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAgentSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const property = await ownedProperty(params.id, auth.agentId)
  if (!property) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
  const documents = await (prisma as any).manualPropertyVerificationDocument.findMany({
    where: { propertyId: property.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, category: true, mimeType: true, sizeBytes: true, uploadStatus: true, verificationStatus: true, createdAt: true, updatedAt: true },
  })
  return NextResponse.json({ success: true, documents })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAgentSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const property = await ownedProperty(params.id, auth.agentId)
  if (!property || (property.status !== 'DRAFT' && property.status !== 'REJECTED')) return NextResponse.json({ success: false, message: 'Not found or not editable' }, { status: 404 })
  const body = await req.json().catch(() => null)
  const document = await (prisma as any).manualPropertyVerificationDocument.findFirst({ where: { id: String(body?.documentId || ''), propertyId: property.id }, select: { id: true, storageKey: true } })
  if (!document) return NextResponse.json({ success: false, message: 'Document not found' }, { status: 404 })
  await deleteFromS3(document.storageKey).catch(() => null)
  await (prisma as any).manualPropertyVerificationDocument.delete({ where: { id: document.id } })
  return NextResponse.json({ success: true })
}
