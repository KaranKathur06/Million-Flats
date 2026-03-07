import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { deleteFromS3 } from '@/lib/s3'

export async function DELETE(
    _req: Request,
    { params }: { params: { id: string; mediaId: string } }
) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const media = await (prisma as any).projectMedia.findUnique({
            where: { id: params.mediaId },
            select: { id: true, projectId: true, s3Key: true },
        })

        if (!media || media.projectId !== params.id) {
            return NextResponse.json({ success: false, message: 'Media not found' }, { status: 404 })
        }

        // Delete from S3 if key exists
        if (media.s3Key) {
            try {
                await deleteFromS3(media.s3Key)
            } catch (s3Err) {
                console.error('[DELETE media] S3 delete failed (non-blocking):', s3Err)
            }
        }

        await (prisma as any).projectMedia.delete({ where: { id: params.mediaId } })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('[DELETE /api/admin/projects/[id]/media/[mediaId]]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
