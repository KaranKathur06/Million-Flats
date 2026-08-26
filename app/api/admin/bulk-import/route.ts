import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { createImportBatch, stageImportRecord, type ImportEntityType } from '@/lib/imports/core'
import { getImportAdapterForEntity, listImportAdapters } from '@/lib/imports/registry'
import { csvParser, detectFormat, jsonParser, xlsxParser } from '@/lib/imports/parser'

const MAX_BYTES = Number(process.env.IMPORT_MAX_FILE_SIZE || 10 * 1024 * 1024)
const MAX_RECORDS = Number(process.env.IMPORT_MAX_RECORDS || 5000)

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  const { prisma } = await import('@/lib/prisma')
  const batches = await (prisma as any).importBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      originalFileName: true,
      status: true,
      mode: true,
      totalRecords: true,
      readyCount: true,
      warningCount: true,
      errorCount: true,
      createdCount: true,
      skippedCount: true,
      failedCount: true,
      createdAt: true,
      entityType: true,
      operation: true,
      sourceProvider: true,
      category: true,
    },
  })
  return NextResponse.json({ success: true, batches, adapters: listImportAdapters() })
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ success: false, message: 'A CSV or JSON file is required.' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ success: false, message: `File exceeds the ${MAX_BYTES} byte limit.` }, { status: 413 })

    const formatHint = detectFormat({ content: '', fileName: file.name, mimeType: file.type })
    const content = formatHint === 'xlsx' ? new Uint8Array(await file.arrayBuffer()) : await file.text()
    const input = { content, fileName: file.name, mimeType: file.type }
    const format = detectFormat(input)
    if (format !== 'csv' && format !== 'json' && format !== 'xlsx') return NextResponse.json({ success: false, message: 'Only CSV, XLSX, and JSON files are supported.' }, { status: 415 })

    const parser = format === 'csv' ? csvParser : format === 'xlsx' ? xlsxParser : jsonParser
    const discovery = await parser.inspect(input)
    if (discovery.recordCount > MAX_RECORDS) return NextResponse.json({ success: false, message: `File exceeds the ${MAX_RECORDS} record limit.` }, { status: 413 })

    const entityType = String(form.get('entity') || 'PROPERTY').trim().toUpperCase() as ImportEntityType
    const adapter = getImportAdapterForEntity(entityType)
    if (!adapter) return NextResponse.json({ success: false, message: `No import adapter is registered for ${entityType}.` }, { status: 400 })

    const batch = await createImportBatch({
      entityType,
      operation: String(form.get('operation') || 'CREATE').toUpperCase() as 'CREATE' | 'UPDATE' | 'UPSERT',
      mode: String(form.get('mode') || 'PARTIAL').toUpperCase() as 'STRICT' | 'PARTIAL',
      originalFileName: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
      format,
      mimeType: file.type || (format === 'json' ? 'application/json' : 'text/csv'),
      byteSize: file.size,
      checksum: createHash('sha256').update(content).digest('hex'),
      uploadedByUserId: auth.userId,
      adapterVersion: adapter.adapterVersion,
      sourceProvider: String(form.get('sourceProvider') || '').trim() || null,
      category: String(form.get('category') || '').trim() || null,
    })

    let staged = 0
    for await (const record of parser.parse(input)) {
      await stageImportRecord({
        batchId: batch.id,
        sourceRecordId: record.sourceRecordId,
        sourceRow: record.sourceRow,
        sourcePath: record.sourcePath,
        raw: record.raw,
        sourceProvider: String(form.get('sourceProvider') || '').trim() || null,
      })
      staged += 1
    }

    const { prisma } = await import('@/lib/prisma')
    await (prisma as any).importBatch.update({
      where: { id: batch.id },
      data: { status: 'READY_FOR_REVIEW', totalRecords: staged },
    })

    return NextResponse.json({ success: true, batchId: batch.id, discovery, totalRecords: staged }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/admin/bulk-import]', error)
    return NextResponse.json({ success: false, message: error?.message || 'Import upload failed.' }, { status: 500 })
  }
}
