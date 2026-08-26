import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { analyzeImportBatch, createImportBatch, executeImport, stageImportRecord } from '@/lib/imports/core'

const schema = z.object({
  schemaVersion: z.string().optional(),
  importType: z.enum(['PROJECTS']).optional(),
  source: z.object({ provider: z.string().optional(), sourceUrl: z.string().max(2000).optional().nullable(), scrapedAt: z.string().optional().nullable() }).optional(),
  projects: z.array(z.record(z.unknown())).min(1).max(5000),
})

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })

  try {
    const content = JSON.stringify(parsed.data.projects)
    const batch = await createImportBatch({ entityType: 'PROJECT', operation: 'CREATE', mode: 'PARTIAL', originalFileName: 'legacy-project-import.json', format: 'json', mimeType: 'application/json', byteSize: Buffer.byteLength(content), checksum: createHash('sha256').update(content).digest('hex'), uploadedByUserId: auth.userId, adapterVersion: 1, sourceProvider: parsed.data.source?.provider || null })
    for (const [index, project] of parsed.data.projects.entries()) {
      await stageImportRecord({ batchId: batch.id, sourceRecordId: String(project.sourceRecordId || project.id || index + 1), sourceRow: index + 1, raw: project, sourceProvider: parsed.data.source?.provider || null, sourceUrl: typeof project.sourceUrl === 'string' ? project.sourceUrl : parsed.data.source?.sourceUrl || null })
    }
    const analysis = await analyzeImportBatch({ batchId: batch.id })
    if (analysis.errors > 0 || analysis.status === 'READY_FOR_REVIEW') return NextResponse.json({ success: false, batchId: batch.id, message: 'Import requires review before commit.', analysis, requiresReview: true }, { status: 422 })
    const result = await executeImport({ batchId: batch.id, idempotencyKey: `legacy-project:${auth.userId}:${batch.id}` })
    return NextResponse.json({ success: true, batchId: batch.id, message: 'Project import committed through the universal engine.', ...result }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/admin/projects/bulk-import/approve]', error)
    return NextResponse.json({ success: false, message: error?.message || 'Project import failed.' }, { status: 500 })
  }
}