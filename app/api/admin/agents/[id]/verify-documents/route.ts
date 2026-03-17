import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

/**
 * POST /api/admin/agents/[id]/verify-documents
 *
 * Admin approves or rejects a specific document for an agent.
 * Body: { documentId: string, action: 'APPROVED' | 'REJECTED', rejectionReason?: string }
 *
 * After all required documents are APPROVED, agent.status advances to UNDER_REVIEW
 * so the dedicated agent-approval flow can then set it to APPROVED.
 */

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const adminCheck = await requireAdmin(req)
  if (adminCheck) return adminCheck   // returns 401/403 response if not admin

  const { id: agentId } = params
  const body = await req.json()
  const { documentId, action, rejectionReason } = body

  if (!documentId || !action) {
    return NextResponse.json({ error: 'documentId and action are required' }, { status: 400 })
  }
  if (action !== 'APPROVED' && action !== 'REJECTED') {
    return NextResponse.json({ error: 'action must be APPROVED or REJECTED' }, { status: 400 })
  }

  const document = await prisma.agentDocument.findFirst({
    where: { id: documentId, agentId },
  })
  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const updated = await prisma.agentDocument.update({
    where: { id: documentId },
    data: {
      status: action as any,
      reviewedAt: new Date(),
      rejectionReason: action === 'REJECTED' ? (rejectionReason ?? null) : null,
    },
  })

  // If agent has all required docs APPROVED → advance to UNDER_REVIEW
  const REQUIRED_TYPES = ['GOVERNMENT_ID', 'REAL_ESTATE_LICENSE']
  const requiredDocs = await prisma.agentDocument.findMany({
    where: { agentId, type: { in: REQUIRED_TYPES as any[] } },
  })

  const allApproved = REQUIRED_TYPES.every((t) =>
    requiredDocs.some((d) => d.type === t && d.status === 'APPROVED')
  )

  let agentStatus: string | undefined
  if (allApproved) {
    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { status: true } })
    if (
      agent &&
      agent.status !== 'APPROVED' &&
      agent.status !== 'REJECTED'
    ) {
      await prisma.agent.update({
        where: { id: agentId },
        data: { status: 'UNDER_REVIEW' as any },
      })
      agentStatus = 'UNDER_REVIEW'
    }
  }

  return NextResponse.json({ document: updated, agentStatus })
}
