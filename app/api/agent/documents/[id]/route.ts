import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentProfileSession } from '@/lib/agentAuth'
import { deleteFromS3 } from '@/lib/s3'
import { buildApiErrorEnvelope, buildApiSuccessEnvelope } from '@/lib/api-response'

export const runtime = 'nodejs'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAgentProfileSession()
  if (!auth.ok) {
    return NextResponse.json(buildApiErrorEnvelope(auth.message, 'UNAUTHORIZED'), { status: auth.status })
  }

  const documentId = String(params?.id || '').trim()
  if (!documentId) {
    return NextResponse.json(buildApiErrorEnvelope('Document ID is required', 'MISSING_DOCUMENT_ID'), { status: 400 })
  }

  try {
    const document = await (prisma as any).agentDocument.findFirst({
      where: { id: documentId, agentId: auth.agentId },
      select: { id: true, s3Key: true },
    })

    if (!document) {
      return NextResponse.json(buildApiErrorEnvelope('Document not found', 'NOT_FOUND'), { status: 404 })
    }

    if (document.s3Key) {
      await deleteFromS3(document.s3Key).catch((error) => {
        console.warn('Agent document delete failed in storage, continuing with DB cleanup:', error)
      })
    }

    await prisma.agentDocument.delete({ where: { id: document.id } })

    return NextResponse.json(buildApiSuccessEnvelope({ deleted: true }, 'Document deleted'))
  } catch (error) {
    console.error('Failed to delete agent document:', error)
    return NextResponse.json(buildApiErrorEnvelope('Failed to delete document', 'DELETE_FAILED'), { status: 500 })
  }
}
