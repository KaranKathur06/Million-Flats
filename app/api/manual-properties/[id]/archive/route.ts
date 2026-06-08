import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { writeAuditLog } from '@/lib/audit'

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
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
      select: { id: true, status: true },
    })

    if (!existing) return bad('Not found', 404)
    if (String(existing.status) !== 'APPROVED') return bad('Only published listings can be archived.')

    const updated = await (prisma as any).manualProperty.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
        archivedBy: 'AGENT',
      } as any,
      select: { id: true, status: true },
    })

    await writeAuditLog({
      entityType: 'MANUAL_PROPERTY',
      entityId: id,
      action: 'PUBLISHED_ARCHIVED',
      performedByUserId: auth.userId,
      meta: { actor: 'agent' },
    })

    return NextResponse.json({ success: true, property: updated })
  } catch (e) {
    console.error('Archive manual property failed', e)
    return NextResponse.json({ success: false, message: 'Failed to archive listing' }, { status: 500 })
  }
}
