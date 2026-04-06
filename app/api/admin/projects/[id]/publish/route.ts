import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { writeAuditLog } from '@/lib/audit'

export async function PUT(_req: Request, { params }: { params: { id: string } }) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const project = await (prisma as any).project.findUnique({
            where: { id: params.id },
            select: { id: true, status: true, isDeleted: true },
        })

        if (!project) {
            return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
        }
        if ((project as any).isDeleted) {
            return NextResponse.json({ success: false, message: 'Deleted project cannot be published' }, { status: 400 })
        }

        // Determine the new status based on body or toggle logic
        let body: any = {}
        try {
            body = await _req.json()
        } catch { }

        const validStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED']
        const newStatus = validStatuses.includes(body.status) ? body.status : null

        if (!newStatus) {
            // Default: toggle between DRAFT <-> PUBLISHED
            const toggled = project.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
            const updated = await (prisma as any).project.update({
                where: { id: params.id },
                data: { status: toggled, archivedAt: toggled === 'ARCHIVED' ? new Date() : null },
                select: { id: true, slug: true, status: true },
            })
            return NextResponse.json({ success: true, project: updated })
        }

        const updated = await (prisma as any).project.update({
            where: { id: params.id },
            data: { status: newStatus, archivedAt: newStatus === 'ARCHIVED' ? new Date() : null },
            select: { id: true, slug: true, status: true },
        })

        if (newStatus === 'ARCHIVED') {
            await writeAuditLog({
                entityType: 'PROJECT',
                entityId: params.id,
                action: 'PROJECT_ARCHIVED',
                performedByUserId: auth.userId,
                meta: { status: newStatus },
            })
        }

        return NextResponse.json({ success: true, project: updated })
    } catch (err: any) {
        console.error('[PUT /api/admin/projects/[id]/publish]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
