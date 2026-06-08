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
        action: 'ADMIN_DOCUMENT_REJECTED',
        windowMs: 60_000,
        max: 50,
    })
    if (!limit.ok) return bad('Too many requests', 429)

    const documentId = String(params?.id || '').trim()
    if (!documentId) return bad('Not found', 404)

    let body: any = null
    try {
        body = await req.json()
    } catch {
        body = null
    }

    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
    if (!reason) return bad('Rejection reason is required')

    // Try AgentDocument first
    let doc = await (prisma as any).agentDocument.findFirst({
        where: { id: documentId },
        select: { id: true, agentId: true, type: true, status: true },
    })

    if (doc) {
        const currentStatus = String(doc.status || 'PENDING').toUpperCase()

        const updated = await (prisma as any).agentDocument.update({
            where: { id: documentId },
            data: {
                status: 'REJECTED',
                reviewedBy: auth.userId,
                reviewedAt: new Date(),
                rejectionReason: reason,
            } as any,
            select: { id: true, agentId: true, type: true, status: true, rejectionReason: true },
        })

        await writeAuditLog({
            entityType: 'AGENT',
            entityId: String(doc.agentId),
            action: 'ADMIN_DOCUMENT_REJECTED',
            performedByUserId: auth.userId,
            ipAddress: getIp(req),
            beforeState: { documentId, status: currentStatus },
            afterState: { documentId, status: 'REJECTED', reason },
            meta: { documentType: doc.type, actorRole: auth.role, reason },
        })

        return NextResponse.json({ success: true, document: updated })
    }

    // Fall back to legacy AgentVerification
    let verification = await (prisma as any).agentVerification.findFirst({
        where: { id: documentId },
        select: { id: true, agentId: true, documentType: true, status: true },
    })

    if (!verification) return bad('Document not found', 404)

    const prevStatus = String(verification.status || 'PENDING').toUpperCase()

    const updatedVerification = await (prisma as any).agentVerification.update({
        where: { id: documentId },
        data: {
            status: 'REJECTED',
            reviewedAt: new Date(),
        } as any,
        select: { id: true, agentId: true, documentType: true, status: true },
    })

    await writeAuditLog({
        entityType: 'AGENT',
        entityId: String(verification.agentId),
        action: 'ADMIN_DOCUMENT_REJECTED',
        performedByUserId: auth.userId,
        ipAddress: getIp(req),
        beforeState: { documentId, status: prevStatus },
        afterState: { documentId, status: 'REJECTED', reason },
        meta: { documentType: verification.documentType, actorRole: auth.role, reason },
    })

    return NextResponse.json({ success: true, document: updatedVerification })
}
