import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { deleteFromS3 } from '@/lib/s3'
import { writeAuditLog } from '@/lib/audit'

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAgentSession()
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const id = String(params?.id || '').trim()
    if (!id) return bad('Not found', 404)

    const existing = await (prisma as any).manualProperty.findFirst({
      where: { id, agentId: auth.agentId, sourceType: 'MANUAL' },
      include: { media: true },
    })

    if (!existing) return bad('Not found', 404)

    const status = String(existing.status)
    if (status !== 'DRAFT' && status !== 'REJECTED') {
      return bad('Only drafts can be deleted. Archive published listings instead.')
    }

    const media = Array.isArray(existing.media) ? existing.media : []
    const keys = media.map((m: any) => safeString(m?.s3Key)).filter(Boolean)

    await (prisma as any).manualProperty.delete({ where: { id } })

    await writeAuditLog({
      entityType: 'MANUAL_PROPERTY',
      entityId: id,
      action: 'DRAFT_DELETED',
      performedByUserId: auth.userId,
      meta: { actor: 'agent', deletedMediaCount: keys.length },
    })

    for (const k of keys) {
      await deleteFromS3(k).catch(() => null)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Delete manual property failed', e)
    return NextResponse.json({ success: false, message: 'Failed to delete draft' }, { status: 500 })
  }
}
