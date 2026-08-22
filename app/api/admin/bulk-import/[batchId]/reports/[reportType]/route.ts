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
  if (params.reportType === 'issues') return NextResponse.json({ success: true, report: batch.issues })
  if (params.reportType === 'records') return NextResponse.json({ success: true, report: batch.records })
  return NextResponse.json({ success: true, report: { id: batch.id, status: batch.status, total: batch.totalRecords, ready: batch.readyCount, warnings: batch.warningCount, errors: batch.errorCount, created: batch.createdCount, skipped: batch.skippedCount, failed: batch.failedCount } })
}
