import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { z } from 'zod'
import { applyManualPropertyAdminAction } from '@/lib/manualPropertyAdminLifecycle'

const bulkActionSchema = z.object({
    ids: z.array(z.string().uuid()).min(1).max(100),
    action: z.enum(['approve', 'reject', 'archive', 'delete', 'sold']),
    reason: z.string().max(1000).optional(),
})

function getIp(req: Request) {
    const forwarded = req.headers.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0]?.trim() || null
    return req.headers.get('x-real-ip') || null
}

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

        const lifecycleAction =
            action === 'approve' ? 'publish'
                : action === 'sold' ? 'mark_sold'
                    : action === 'reject' ? 'reject'
                        : 'archive'

        let updated = 0
        const failures: { id: string; message: string }[] = []
        for (const id of ids) {
            const result = await applyManualPropertyAdminAction({
                propertyId: id,
                action: lifecycleAction,
                actorUserId: auth.userId,
                ipAddress: getIp(req),
                reason: reason || null,
            })
            if (result.ok) {
                updated += 1
            } else {
                failures.push({ id, message: result.message })
            }
        }

        return NextResponse.json({
            success: failures.length === 0,
            updated,
            failures,
            action,
        })
    } catch (err: any) {
        console.error('[POST /api/admin/properties/bulk-approve]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
