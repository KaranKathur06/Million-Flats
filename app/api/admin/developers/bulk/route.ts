import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { analyzeImportBatch, createImportBatch, executeImport, stageImportRecord } from '@/lib/imports/core'

const schema = z.object({
  developers: z.array(z.record(z.unknown())).min(1).max(200),
  mode: z.enum(['skip', 'update']).optional(),
  restoreDeleted: z.boolean().optional(),
})

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })

  try {
    const content = JSON.stringify(parsed.data.developers)
    const batch = await createImportBatch({ entityType: 'DEVELOPER', operation: parsed.data.mode === 'update' ? 'UPDATE' : 'CREATE', mode: 'PARTIAL', originalFileName: 'legacy-developer-import.json', format: 'json', mimeType: 'application/json', byteSize: Buffer.byteLength(content), checksum: createHash('sha256').update(content).digest('hex'), uploadedByUserId: auth.userId, adapterVersion: 1, sourceProvider: 'LEGACY_DEVELOPER_IMPORT' })
    for (const [index, developer] of parsed.data.developers.entries()) {
      await stageImportRecord({ batchId: batch.id, sourceRecordId: String(developer.sourceRecordId || developer.id || developer.slug || index + 1), sourceRow: index + 1, raw: developer, sourceProvider: 'LEGACY_DEVELOPER_IMPORT' })
    }
    const analysis = await analyzeImportBatch({ batchId: batch.id })
    if (analysis.errors > 0 || analysis.status === 'READY_FOR_REVIEW') return NextResponse.json({ success: false, batchId: batch.id, message: 'Import requires review before commit.', analysis, requiresReview: true }, { status: 422 })
    const result = await executeImport({ batchId: batch.id, idempotencyKey: `legacy-developer:${auth.userId}:${batch.id}` })
    return NextResponse.json({ success: true, batchId: batch.id, message: 'Developer import committed through the universal engine.', ...result })
  } catch (error: any) {
    console.error('[POST /api/admin/developers/bulk]', error)
    return NextResponse.json({ success: false, message: error?.message || 'Developer import failed.' }, { status: 500 })
  }
}