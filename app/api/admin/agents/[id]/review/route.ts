import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { prisma } from '@/lib/prisma'

function bad(msg: string, status = 400) {
    return NextResponse.json({ success: false, message: msg }, { status })
}

function getIp(req: Request) {
    const forwarded = req.headers.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0]?.trim() || null
    return req.headers.get('x-real-ip') || null
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const limit = await checkAdminRateLimit({
        performedByUserId: auth.userId,
        action: 'ADMIN_AGENT_UNDER_REVIEW',
        windowMs: 60_000,
        max: 30,
    })
    if (!limit.ok) return bad('Too many requests', 429)

    const agentId = String(params?.id || '').trim()
    if (!agentId) return bad('Not found', 404)

    const agent = await (prisma as any).agent.findFirst({
        where: { id: agentId },
        select: { id: true, verificationStatus: true, profileStatus: true },
    })

    if (!agent) return bad('Agent not found', 404)

    const currentStatus = String(agent.verificationStatus || 'PENDING').toUpperCase()

    if (currentStatus !== 'PENDING' && currentStatus !== 'SUBMITTED') {
        return bad(`Cannot move to review from ${currentStatus} status`, 409)
    }

    const beforeState = {
        verificationStatus: currentStatus,
        profileStatus: String(agent.profileStatus || 'DRAFT'),
    }

    const updated = await (prisma as any).agent.update({
        where: { id: agentId },
        data: { verificationStatus: 'UNDER_REVIEW' } as any,
        select: { id: true, verificationStatus: true, profileStatus: true },
    })

    const afterState = {
        verificationStatus: String(updated.verificationStatus),
        profileStatus: String(updated.profileStatus),
    }

    await writeAuditLog({
        entityType: 'AGENT',
        entityId: agentId,
        action: 'ADMIN_AGENT_UNDER_REVIEW',
        performedByUserId: auth.userId,
        ipAddress: getIp(req),
        beforeState,
        afterState,
        meta: { actorRole: auth.role },
    })

    return NextResponse.json({ success: true, agent: updated })
}
