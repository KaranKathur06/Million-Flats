import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { prisma } from '@/lib/prisma'

const REQUIRED_DOC_TYPES = ['GOVERNMENT_ID', 'REAL_ESTATE_LICENSE']

function bad(msg: string, status = 400) {
    return NextResponse.json({ success: false, message: msg }, { status })
}

function getIp(req: Request) {
    const forwarded = req.headers.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0]?.trim() || null
    return req.headers.get('x-real-ip') || null
}

async function checkAndUpdateAgentStatus(agentId: string) {
    // Check if all required documents are approved
    const requiredDocs = await (prisma as any).agentDocument.findMany({
        where: {
            agentId,
            type: { in: REQUIRED_DOC_TYPES },
            status: 'APPROVED',
        },
        select: { type: true },
    })

    const allRequiredApproved = REQUIRED_DOC_TYPES.every((t) =>
        requiredDocs.some((d: any) => d.type === t)
    )

    if (allRequiredApproved) {
        // Get current agent status
        const agent = await (prisma as any).agent.findFirst({
            where: { id: agentId },
            select: { status: true },
        })

        // Only advance if not already UNDER_REVIEW or APPROVED
        if (agent && agent.status !== 'UNDER_REVIEW' && agent.status !== 'APPROVED') {
            await (prisma as any).agent.update({
                where: { id: agentId },
                data: { status: 'UNDER_REVIEW' },
            })
        }
    }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const limit = await checkAdminRateLimit({
        performedByUserId: auth.userId,
        action: 'ADMIN_DOCUMENT_APPROVED',
        windowMs: 60_000,
        max: 50,
    })
    if (!limit.ok) return bad('Too many requests', 429)

    const documentId = String(params?.id || '').trim()
    if (!documentId) return bad('Not found', 404)

    // Try AgentDocument first
    let doc = await (prisma as any).agentDocument.findFirst({
        where: { id: documentId },
        select: { id: true, agentId: true, type: true, status: true },
    })

    if (doc) {
        const currentStatus = String(doc.status || 'PENDING').toUpperCase()
        if (currentStatus === 'APPROVED') {
            return bad('Document already approved', 409)
        }

        const updated = await (prisma as any).agentDocument.update({
            where: { id: documentId },
            data: {
                status: 'APPROVED',
                reviewedBy: auth.userId,
                reviewedAt: new Date(),
                rejectionReason: null,
            } as any,
            select: { id: true, agentId: true, type: true, status: true },
        })

        await writeAuditLog({
            entityType: 'AGENT',
            entityId: String(doc.agentId),
            action: 'ADMIN_DOCUMENT_APPROVED',
            performedByUserId: auth.userId,
            ipAddress: getIp(req),
            beforeState: { documentId, status: currentStatus },
            afterState: { documentId, status: 'APPROVED' },
            meta: { documentType: doc.type, actorRole: auth.role },
        })

        // Auto-update agent status if all required docs approved
        await checkAndUpdateAgentStatus(doc.agentId)

        return NextResponse.json({ success: true, document: updated })
    }

    // Fall back to legacy AgentVerification
    let verification = await (prisma as any).agentVerification.findFirst({
        where: { id: documentId },
        select: { id: true, agentId: true, documentType: true, status: true },
    })

    if (!verification) return bad('Document not found', 404)

    const prevStatus = String(verification.status || 'PENDING').toUpperCase()
    if (prevStatus === 'APPROVED') {
        return bad('Document already approved', 409)
    }

    const updatedVerification = await (prisma as any).agentVerification.update({
        where: { id: documentId },
        data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
        } as any,
        select: { id: true, agentId: true, documentType: true, status: true },
    })

    await writeAuditLog({
        entityType: 'AGENT',
        entityId: String(verification.agentId),
        action: 'ADMIN_DOCUMENT_APPROVED',
        performedByUserId: auth.userId,
        ipAddress: getIp(req),
        beforeState: { documentId, status: prevStatus },
        afterState: { documentId, status: 'APPROVED' },
        meta: { documentType: verification.documentType, actorRole: auth.role },
    })

    // Auto-update agent status if all required docs approved (legacy path)
    await checkAndUpdateAgentStatus(verification.agentId)

    return NextResponse.json({ success: true, document: updatedVerification })
}
