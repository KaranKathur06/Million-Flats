import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { IMPORT_ANALYSIS_STALE_AFTER_MINUTES } from '@/lib/imports/core/constants'

export async function GET(_req: Request, { params }: { params: { batchId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const batch = await (prisma as any).importBatch.findUnique({
    where: { id: params.batchId },
    select: {
      id: true,
      status: true,
      totalRecords: true,
      readyCount: true,
      warningCount: true,
      errorCount: true,
      createdCount: true,
      skippedCount: true,
      failedCount: true,
      startedAt: true,
      updatedAt: true,
      analysisHeartbeatAt: true,
      analysisProcessedCount: true,
      failureSummary: true,
    },
  })
  if (!batch) return NextResponse.json({ success: false, message: 'Import batch not found.' }, { status: 404 })
  const staleAnalysis = batch.status === 'ANALYZING'
    ? await prisma.$queryRaw<Array<{ stale: boolean }>>`
        SELECT (
          COALESCE("analysis_heartbeat_at", "started_at", "updated_at") IS NOT NULL
          AND COALESCE("analysis_heartbeat_at", "started_at", "updated_at")
            <= clock_timestamp() - (${IMPORT_ANALYSIS_STALE_AFTER_MINUTES} * INTERVAL '1 minute')
        ) AS "stale"
        FROM "import_batches"
        WHERE "id" = ${params.batchId}
          AND "status" = 'ANALYZING'
      `
    : []
  const analysisRecoverable = staleAnalysis[0]?.stale === true
  const failureSummary = batch.failureSummary && typeof batch.failureSummary === 'object'
    ? batch.failureSummary as { stage?: unknown; message?: unknown }
    : null
  return NextResponse.json({
    success: true,
    progress: {
      id: batch.id,
      status: batch.status,
      totalRecords: batch.totalRecords,
      readyCount: batch.readyCount,
      warningCount: batch.warningCount,
      errorCount: batch.errorCount,
      createdCount: batch.createdCount,
      skippedCount: batch.skippedCount,
      failedCount: batch.failedCount,
      startedAt: batch.startedAt,
      updatedAt: batch.updatedAt,
      analysisHeartbeatAt: batch.analysisHeartbeatAt,
      analysisProcessedCount: batch.analysisProcessedCount,
      analysisRecoverable,
      analysisFailureMessage: batch.status === 'FAILED' && failureSummary?.stage === 'ANALYSIS'
        ? String(failureSummary.message || 'Analysis failed.')
        : null,
    },
  })
}
