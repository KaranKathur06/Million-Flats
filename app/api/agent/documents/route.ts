import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET  /api/agent/documents — list all documents for the authenticated agent
 * POST /api/agent/documents — submit a document after presigned upload
 * 
 * Body for POST: { documentType, fileUrl, s3Key?, fileName?, mimeType?, sizeBytes? }
 */

const VALID_DOC_TYPES = [
  'GOVERNMENT_ID',
  'REAL_ESTATE_LICENSE',
  'SELFIE_VERIFICATION',
  'ADDRESS_PROOF',
  'AGENCY_CERTIFICATE',
] as const

const REQUIRED_DOC_TYPES = ['GOVERNMENT_ID', 'REAL_ESTATE_LICENSE']

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user: any = await (prisma as any).user.findUnique({
    where: { email: session.user.email },
    select: { agent: { select: { id: true } } },
  })

  if (!user?.agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Fetch from both AgentDocument (new) and AgentVerification (legacy) for backward compatibility
  const [newDocs, legacyDocs] = await Promise.all([
    (prisma as any).agentDocument.findMany({
      where: { agentId: user.agent.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        fileUrl: true,
        s3Key: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        rejectionReason: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    (prisma as any).agentVerification.findMany({
      where: { agentId: user.agent.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        documentType: true,
        documentUrl: true,
        status: true,
        rejectionReason: true,
        reviewedAt: true,
        createdAt: true,
      },
    }),
  ])

  // Normalize legacy docs to match new format
  const normalizedLegacy = (legacyDocs as any[]).map((d: any) => ({
    id: d.id,
    type: d.documentType,
    fileUrl: d.documentUrl,
    s3Key: null,
    fileName: null,
    mimeType: null,
    sizeBytes: null,
    status: d.status,
    rejectionReason: d.rejectionReason,
    reviewedAt: d.reviewedAt,
    createdAt: d.createdAt,
    updatedAt: null,
    source: 'legacy',
  }))

  // Mark new docs source
  const normalizedNew = (newDocs as any[]).map((d: any) => ({
    ...d,
    type: d.type,
    source: 'agent_documents',
  }))

  // Merge, preferring new docs over legacy for same type
  const typeMap = new Map<string, any>()
  for (const doc of [...normalizedLegacy, ...normalizedNew]) {
    const existing = typeMap.get(doc.type)
    if (!existing || doc.source === 'agent_documents') {
      typeMap.set(doc.type, doc)
    }
  }

  const documents = Array.from(typeMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return NextResponse.json({ documents })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { documentType, fileUrl, s3Key, fileName, mimeType, sizeBytes } = body

  if (!documentType || !VALID_DOC_TYPES.includes(documentType)) {
    return NextResponse.json(
      { error: `Invalid documentType. Must be one of: ${VALID_DOC_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  if (!fileUrl || typeof fileUrl !== 'string') {
    return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 })
  }

  const user: any = await (prisma as any).user.findUnique({
    where: { email: session.user.email },
    select: {
      agent: {
        select: { id: true, status: true },
      },
    },
  })

  if (!user?.agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const agentId = user.agent.id

  // Use upsert with unique constraint on agentId + type
  // This will create or update the document for this type
  let document
  try {
    // First try to find existing
    const existing = await (prisma as any).agentDocument.findFirst({
      where: { agentId, type: documentType },
      select: { id: true },
    })

    if (existing) {
      // Update existing document, reset status to PENDING
      document = await (prisma as any).agentDocument.update({
        where: { id: existing.id },
        data: {
          fileUrl,
          s3Key: s3Key || null,
          fileName: fileName || null,
          mimeType: mimeType || null,
          sizeBytes: sizeBytes || null,
          status: 'PENDING',
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: null,
        },
      })
    } else {
      // Create new document
      document = await (prisma as any).agentDocument.create({
        data: {
          agentId,
          type: documentType,
          fileUrl,
          s3Key: s3Key || null,
          fileName: fileName || null,
          mimeType: mimeType || null,
          sizeBytes: sizeBytes || null,
          status: 'PENDING',
        },
      })
    }
  } catch (err) {
    console.error('Failed to save agent document:', err)
    return NextResponse.json({ error: 'Failed to save document' }, { status: 500 })
  }

  // Auto-advance agent status when required docs uploaded
  const requiredDocs = await (prisma as any).agentDocument.findMany({
    where: { agentId, type: { in: REQUIRED_DOC_TYPES } },
    select: { type: true },
  })

  const hasAllRequired = REQUIRED_DOC_TYPES.every((t) =>
    (requiredDocs as any[]).some((d: any) => d.type === t)
  )

  if (hasAllRequired && user.agent.status !== 'APPROVED' && user.agent.status !== 'UNDER_REVIEW') {
    await (prisma as any).agent.update({
      where: { id: agentId },
      data: { status: 'DOCUMENTS_UPLOADED' as any },
    })
  }

  return NextResponse.json({ document }, { status: 201 })
}
