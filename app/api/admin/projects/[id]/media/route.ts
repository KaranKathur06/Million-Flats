import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { uploadToS3Key, buildProjectMediaKey } from '@/lib/s3'

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        // Fetch project + developer to build the S3 key path
        const project = await (prisma as any).project.findUnique({
            where: { id: params.id },
            select: { id: true, slug: true, developer: { select: { slug: true, name: true } } },
        })

        if (!project) {
            return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
        }

        const formData = await req.formData()
        const file = formData.get('file') as File | null
        const mediaType = (formData.get('mediaType') as string) || 'image'
        const sortOrderStr = formData.get('sortOrder') as string
        const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) || 0 : 0

        if (!file) {
            return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 })
        }

        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            return NextResponse.json({ success: false, message: 'File too large (max 50MB)' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const devSlug = project.developer?.slug || project.developer?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'unknown'
        const key = buildProjectMediaKey({
            developerSlug: devSlug,
            projectSlug: project.slug,
            contentType: file.type,
        })

        const { objectUrl } = await uploadToS3Key({ buffer, key, contentType: file.type })

        const media = await (prisma as any).projectMedia.create({
            data: {
                projectId: params.id,
                mediaUrl: objectUrl,
                mediaType,
                s3Key: key,
                sortOrder,
            },
        })

        return NextResponse.json({ success: true, media }, { status: 201 })
    } catch (err: any) {
        console.error('[POST /api/admin/projects/[id]/media]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
