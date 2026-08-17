import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { buildProjectImportPreview } from '@/lib/projectImportV2'
import { z } from 'zod'

const bulkImportPreviewSchema = z.object({
    schemaVersion: z.string().optional(),
    importType: z.enum(['PROJECTS']).optional(),
    source: z.object({
        provider: z.string().optional(),
        sourceUrl: z.string().max(2000).optional().nullable(),
        scrapedAt: z.string().optional().nullable(),
    }).optional(),
    projects: z.array(z.any()).min(1).max(200),
    approvedBy: z.string().max(200).optional().nullable(),
    reviewNote: z.string().max(5000).optional().nullable(),
    submitForApproval: z.boolean().optional(),
})

export async function POST(req: Request) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const parsed = bulkImportPreviewSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const preview = buildProjectImportPreview(parsed.data)

        if (!preview.ok) {
            return NextResponse.json({
                success: false,
                message: 'Import requires review before it can be approved.',
                preview,
                requiresReview: true,
            }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            mode: 'preview-only',
            message: 'Ready for human approval. No database writes were made.',
            requiresReview: false,
            summary: preview.summary,
            preview,
        })
    } catch (err: any) {
        console.error('[POST /api/admin/projects/bulk-import]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
