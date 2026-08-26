import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { batchId: string; reportType: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const allowed = new Set(['issues', 'records', 'summary'])
  if (!allowed.has(params.reportType)) return NextResponse.json({ success: false, message: 'Unsupported report type.' }, { status: 400 })
  const batch = await (prisma as any).importBatch.findUnique({ where: { id: params.batchId }, include: { records: true, issues: true } })
  if (!batch) return NextResponse.json({ success: false, message: 'Import batch not found.' }, { status: 404 })
  const report = params.reportType === 'issues' ? batch.issues : params.reportType === 'records' ? batch.records : { id: batch.id, status: batch.status, total: batch.totalRecords, ready: batch.readyCount, warnings: batch.warningCount, errors: batch.errorCount, created: batch.createdCount, skipped: batch.skippedCount, failed: batch.failedCount }
  const rows = Array.isArray(report) ? report : [report]
  const keys = Array.from(new Set(rows.flatMap((row: any) => Object.keys(row))))
  const escape = (value: unknown) => `"${String(value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : value).replaceAll('"', '""')}"`
  const csv = [keys.join(','), ...rows.map((row: any) => keys.map((key) => escape(row[key])).join(','))].join('\n')
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="import-${batch.id}-${params.reportType}.csv"` } })
}
