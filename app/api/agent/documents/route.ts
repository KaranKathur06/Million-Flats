import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET  /api/agent/documents       — list all documents for the authenticated agent
 * POST /api/agent/documents        — submit a document (fileUrl + documentType)
 */

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { agent: { select: { id: true } } },
  })

  if (!user?.agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const documents = await prisma.agentDocument.findMany({
    where: { agentId: user.agent.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ documents })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { documentType, fileUrl } = body

  const VALID_TYPES = [
    'GOVERNMENT_ID',
    'REAL_ESTATE_LICENSE',
    'SELFIE_VERIFICATION',
    'ADDRESS_PROOF',
    'AGENCY_CERTIFICATE',
  ]

  if (!documentType || !VALID_TYPES.includes(documentType)) {
    return NextResponse.json(
      { error: `Invalid documentType. Must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  if (!fileUrl || typeof fileUrl !== 'string') {
    return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
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

  // Upsert the document (one entry per type per agent)
  const document = await prisma.agentDocument.upsert({
    where: {
      // Fallback: use a synthetic unique — depends on the actual unique constraint
      // In this schema there is no unique([agentId, type]), so we create or update the latest
      id: (
        await prisma.agentDocument.findFirst({
          where: { agentId: user.agent.id, type: documentType as any },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
      )?.id ?? '',
    },
    create: {
      agentId: user.agent.id,
      type: documentType as any,
      fileUrl,
      status: 'PENDING',
    },
    update: {
      fileUrl,
      status: 'PENDING',
      reviewedAt: null,
      rejectionReason: null,
    },
  })

  // Auto-advance agent status when required docs uploaded
  const requiredTypes = ['GOVERNMENT_ID', 'REAL_ESTATE_LICENSE']
  const uploaded = await prisma.agentDocument.findMany({
    where: { agentId: user.agent.id, type: { in: requiredTypes as any[] } },
  })

  const hasAllRequired = requiredTypes.every((t) =>
    uploaded.some((d) => d.type === t)
  )

  if (hasAllRequired && user.agent.status !== 'APPROVED' && user.agent.status !== 'UNDER_REVIEW') {
    await prisma.agent.update({
      where: { id: user.agent.id },
      data: { status: 'DOCUMENTS_UPLOADED' as any },
    })
  }

  return NextResponse.json({ document }, { status: 201 })
}
