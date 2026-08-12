import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { z } from 'zod'

const bulkActionSchema = z.object({
    ids: z.array(z.string().uuid()).min(1).max(100),
    action: z.enum(['approve', 'reject', 'archive', 'delete', 'sold']),
    reason: z.string().max(1000).optional(),
})

export async function POST(req: Request) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const parsed = bulkActionSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const { ids, action, reason } = parsed.data

        let statusUpdate: any = {}
        let moderationAction: string | null = null

        switch (action) {
            case 'approve':
                statusUpdate = { status: 'APPROVED', submittedAt: new Date() }
                moderationAction = 'APPROVE'
                break
            case 'reject':
                statusUpdate = { status: 'REJECTED', rejectionReason: reason || null }
                moderationAction = 'REJECT'
                break
            case 'archive':
                statusUpdate = { status: 'ARCHIVED', archivedAt: new Date(), archivedBy: auth.userId }
                break
            case 'sold':
                statusUpdate = { status: 'SOLD' }
                break
            case 'delete':
                // Soft delete = archive
                statusUpdate = { status: 'ARCHIVED', archivedAt: new Date(), archivedBy: auth.userId }
                break
        }

        const result = await (prisma as any).manualProperty.updateMany({
            where: { id: { in: ids } },
            data: statusUpdate,
        })

        // Log moderation actions
        if (moderationAction) {
            const logEntries = ids.map(id => ({
                propertyId: id,
                adminId: auth.userId,
                action: moderationAction!,
                reason: reason || null,
            }))

            await (prisma as any).manualPropertyModerationLog.createMany({
                data: logEntries,
            }).catch(() => { /* non-critical */ })
        }

        return NextResponse.json({
            success: true,
            updated: result.count,
            action,
        })
    } catch (err: any) {
        console.error('[POST /api/admin/properties/bulk-approve]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
