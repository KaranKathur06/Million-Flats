import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { analyzeImportBatch, createImportBatch, executeImport, stageImportRecord } from '@/lib/imports/core'

const propertyItemSchema = z.object({
    agentId: z.string().min(1).optional(),
    title: z.string().min(1).max(500),
}).passthrough()

const bulkImportSchema = z.object({
    schemaVersion: z.literal('property-import-v1').optional(),
    agentId: z.string().min(1).optional(),
    properties: z.array(propertyItemSchema).min(1).max(500),
})

function normalizePropertyImportBody(body: any) {
    const mergeEntry = (entry: any) => entry?.property
        ? {
            ...entry.property,
            sourceProvider: entry.source?.provider || entry.property.sourceProvider,
            sourceUrl: entry.source?.sourceUrl || entry.property.sourceUrl,
            sourceListingId: entry.source?.sourceListingId || entry.property.sourceListingId,
        }
        : entry

    if (body?.property) {
        return { schemaVersion: body.schemaVersion, agentId: body.agentId, properties: [mergeEntry(body)] }
    }
    if (Array.isArray(body?.properties)) return { ...body, properties: body.properties.map(mergeEntry) }
    return body
}

export async function POST(req: Request) {
    const auth = await requireAdminSession()
    if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

    try {
        const body = normalizePropertyImportBody(await req.json().catch(() => ({})))
        const parsed = bulkImportSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
        }

        const ownerAgentId = parsed.data.agentId || (parsed.data.properties.every((item) => item.agentId)
            ? parsed.data.properties[0].agentId
            : null)
        if (!ownerAgentId && parsed.data.properties.some((item) => !item.agentId)) {
            return NextResponse.json({ success: false, message: 'An existing agentId is required for every imported property.' }, { status: 422 })
        }

        const content = JSON.stringify(parsed.data.properties)
        const batch = await createImportBatch({
            entityType: 'PROPERTY',
            operation: 'CREATE',
            mode: 'PARTIAL',
            originalFileName: 'legacy-property-import.json',
            format: 'json',
            mimeType: 'application/json',
            byteSize: Buffer.byteLength(content),
            checksum: createHash('sha256').update(content).digest('hex'),
            uploadedByUserId: auth.userId,
            adapterVersion: 1,
            sourceProvider: null,
        })

        for (const [index, property] of parsed.data.properties.entries()) {
            await stageImportRecord({
                batchId: batch.id,
                sourceRecordId: String(property.sourceListingId || property.sourceUrl || index + 1),
                sourceRow: index + 1,
                raw: property,
                sourceProvider: typeof property.sourceProvider === 'string' ? property.sourceProvider : null,
            })
        }

        const { prisma } = await import('@/lib/prisma')
        await (prisma as any).importBatch.update({
            where: { id: batch.id },
            data: { status: 'READY_FOR_REVIEW', totalRecords: parsed.data.properties.length },
        })

        const analysis = await analyzeImportBatch({ batchId: batch.id, ownerAgentId })
        if (analysis.errors > 0 || analysis.status === 'READY_FOR_REVIEW') {
            const results = parsed.data.properties.map((property) => ({
                title: property.title,
                status: 'error' as const,
                reason: 'Import requires review before commit.',
            }))
            return NextResponse.json({
                success: false,
                batchId: batch.id,
                message: 'Import requires review before commit.',
                summary: { total: results.length, created: 0, skipped: 0, errored: results.length },
                results,
            }, { status: 422 })
        }

        const committed = await executeImport({ batchId: batch.id, idempotencyKey: `legacy:${auth.userId}:${batch.id}` })
        if (!('results' in committed)) return NextResponse.json({ success: true, ...committed })

        const titles = parsed.data.properties.map((property) => property.title)
        const results = committed.results.map((result: any, index: number) => ({
            title: titles[index] || result.recordId,
            status: result.status === 'created' ? 'created' as const : result.status === 'skipped' ? 'skipped' as const : 'error' as const,
            reason: result.reason,
        }))

        return NextResponse.json({
            success: true,
            batchId: batch.id,
            media: { status: 'manual_upload_required', message: 'Property data was imported. Upload gallery media manually after review.' },
            summary: { total: results.length, created: committed.created, skipped: committed.skipped, errored: committed.failed },
            results,
        })
    } catch (error: any) {
        console.error('[POST /api/admin/properties/bulk-import]', error)
        return NextResponse.json({ success: false, message: error?.message || 'Internal error' }, { status: 500 })
    }
}
