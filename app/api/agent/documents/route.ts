import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET  /api/agent/documents       — list all documents for the authenticated agent
 * POST /api/agent/documents        — submit a document (documentUrl + documentType)
 */

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

  const documents = await (prisma as any).agentVerification.findMany({
    where: { agentId: user.agent.id },
    orderBy: { createdAt: 'desc' },
  })

  // Map to frontend expected shape if necessary, or let frontend use it directly
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

  // Find existing doc of this type
  const existingDoc = await (prisma as any).agentVerification.findFirst({
    where: { agentId: user.agent.id, documentType: documentType as any },
    select: { id: true }
  })

  let document
  if (existingDoc) {
    document = await (prisma as any).agentVerification.update({
      where: { id: existingDoc.id },
      data: {
        documentUrl: fileUrl,
        status: 'PENDING',
        reviewedAt: null,
      }
    })
  } else {
    document = await (prisma as any).agentVerification.create({
      data: {
        agentId: user.agent.id,
        documentType: documentType as any,
        documentUrl: fileUrl,
        status: 'PENDING',
      }
    })
  }

  // Auto-advance agent status when required docs uploaded
  const requiredTypes = ['GOVERNMENT_ID', 'REAL_ESTATE_LICENSE']
  const uploaded = await (prisma as any).agentVerification.findMany({
    where: { agentId: user.agent.id, documentType: { in: requiredTypes as any[] } },
  })

  const hasAllRequired = requiredTypes.every((t) =>
    (uploaded as any[]).some((d: any) => d.documentType === t)
  )

  if (hasAllRequired && user.agent.status !== 'APPROVED' && user.agent.status !== 'UNDER_REVIEW') {
    await (prisma as any).agent.update({
      where: { id: user.agent.id },
      data: { status: 'DOCUMENTS_UPLOADED' as any },
    })
  }

  return NextResponse.json({ document }, { status: 201 })
}
