import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { buildProjectImportPreview } from '@/lib/projectImportV2'
import { z } from 'zod'

function normalizeBulkImportBody(body: unknown): any {
    if (Array.isArray(body)) {
        return {
            schemaVersion: '2.0',
            importType: 'PROJECTS',
            source: {
                provider: 'SQUAREYARDS',
                sourceUrl: null,
                scrapedAt: new Date().toISOString(),
            },
            projects: body,
        }
    }

    if (body && typeof body === 'object' && 'name' in body && !('projects' in body)) {
        return {
            schemaVersion: '2.0',
            importType: 'PROJECTS',
            source: {
                provider: 'SQUAREYARDS',
                sourceUrl: (body as any).sourceUrl || null,
                scrapedAt: (body as any).scrapedAt || new Date().toISOString(),
            },
            projects: [body],
        }
    }

    if (body && typeof body === 'object' && 'projects' in body && Array.isArray((body as any).projects)) {
        return {
            ...body,
            schemaVersion: body && typeof body === 'object' && 'schemaVersion' in body ? (body as any).schemaVersion : '2.0',
            importType: body && typeof body === 'object' && 'importType' in body ? (body as any).importType : 'PROJECTS',
            source: {
                provider: (body as any)?.source?.provider || 'SQUAREYARDS',
                sourceUrl: (body as any)?.source?.sourceUrl || null,
                scrapedAt: (body as any)?.source?.scrapedAt || new Date().toISOString(),
            },
        }
    }

    return body
}

const bulkImportPreviewSchema = z.object({
    schemaVersion: z.string().optional(),
    importType: z.enum(['PROJECTS']).optional(),
    source: z.object({
        provider: z.string().optional(),
        sourceUrl: z.string().max(2000).optional().nullable(),
        scrapedAt: z.string().optional().nullable(),
    }).optional(),
    projects: z.array(z.any()).min(1).max(5000),
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
        const normalizedBody = normalizeBulkImportBody(body)
        const parsed = bulkImportPreviewSchema.safeParse(normalizedBody)

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
