import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { batchId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  let batch: any
  try {
    batch = await (prisma as any).importBatch.findUnique({
      where: { id: params.batchId },
      include: { records: { orderBy: { sourceRow: 'asc' } }, issues: { orderBy: { createdAt: 'asc' } } },
    })
  } catch (error: any) {
    if (error?.code !== 'P2022') throw error
    // Older deployments may have the foundation columns but not later optional metadata.
    batch = await (prisma as any).importBatch.findUnique({
      where: { id: params.batchId },
      select: {
        id: true, originalFileName: true, status: true, mode: true, entityType: true,
        totalRecords: true, readyCount: true, warningCount: true, errorCount: true,
        createdCount: true, updatedCount: true, skippedCount: true, failedCount: true, createdAt: true,
        records: { orderBy: { sourceRow: 'asc' }, select: { id: true, sourceRecordId: true, sourceRow: true, status: true, rawPayload: true, normalizedPayload: true, canonicalPayload: true, targetEntityId: true } },
        issues: { orderBy: { createdAt: 'asc' }, select: { id: true, severity: true, stage: true, message: true, resolutionState: true } },
      },
    })
  }
  if (!batch) return NextResponse.json({ success: false, message: 'Import batch not found.' }, { status: 404 })
  batch.records = Array.isArray(batch.records) ? batch.records : []
  batch.issues = Array.isArray(batch.issues) ? batch.issues : []
  return NextResponse.json({ success: true, batch })
}
