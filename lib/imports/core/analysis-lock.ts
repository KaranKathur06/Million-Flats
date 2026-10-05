import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { IMPORT_ANALYSIS_STALE_AFTER_MINUTES } from './constants'

export class ImportAnalysisOwnershipError extends Error {
  constructor() {
    super('Import analysis attempt lost ownership.')
    this.name = 'ImportAnalysisOwnershipError'
  }
}

export type ImportAnalysisClaimMode = 'START' | 'RECOVER' | 'RETRY'
type AnalysisReleaseData = {
  readyCount?: number
  warningCount?: number
  errorCount?: number
  failureSummary?: Prisma.InputJsonObject
}

export async function markImportAnalysisRetrying(batchId: string) {
  const updated = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH candidate AS (
      SELECT "id"
      FROM "import_batches"
      WHERE "id" = ${batchId}
        AND "status" = 'FAILED'
        AND "failure_summary"->>'stage' = 'ANALYSIS'
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "import_batches"
    SET "status" = 'RETRYING'
    FROM candidate
    WHERE "import_batches"."id" = candidate."id"
    RETURNING "import_batches"."id"
  `
  return updated.length === 1
}

export async function claimImportAnalysisAttempt(input: {
  batchId: string
  attemptId: string
  ownerAgentId?: string | null
  mode: ImportAnalysisClaimMode
}) {
  const claimed = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH candidate AS (
      SELECT "id"
      FROM "import_batches"
      WHERE "id" = ${input.batchId}
        AND (
          (
            ${input.mode === 'START'}
            AND "status" IN ('UPLOADED', 'READY_FOR_REVIEW', 'VALIDATING')
          )
          OR (
            ${input.mode === 'RECOVER'}
            AND "status" = 'ANALYZING'
            AND COALESCE("analysis_heartbeat_at", "started_at", "updated_at")
              <= clock_timestamp() - (${IMPORT_ANALYSIS_STALE_AFTER_MINUTES} * INTERVAL '1 minute')
          )
          OR (
            ${input.mode === 'RETRY'}
            AND "status" = 'RETRYING'
            AND "failure_summary"->>'stage' = 'ANALYSIS'
          )
        )
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "import_batches"
    SET "status" = 'ANALYZING',
        "analysis_attempt_id" = ${input.attemptId},
        "analysis_heartbeat_at" = clock_timestamp(),
        "analysis_processed_count" = 0,
        "analysis_owner_agent_id" = COALESCE(${input.ownerAgentId ?? null}, "analysis_owner_agent_id"),
        "failure_summary" = NULL,
        "started_at" = clock_timestamp(),
        "completed_at" = NULL
    FROM candidate
    WHERE "import_batches"."id" = candidate."id"
    RETURNING "import_batches"."id"
  `
  return claimed.length === 1
}

export async function refreshImportAnalysisHeartbeat(
  tx: any,
  batchId: string,
  attemptId: string,
  processedCount: number,
) {
  const updated = await tx.$executeRaw`
    UPDATE "import_batches"
    SET "analysis_heartbeat_at" = clock_timestamp(),
        "analysis_processed_count" = ${processedCount}
    WHERE "id" = ${batchId}
      AND "status" = 'ANALYZING'
      AND "analysis_attempt_id" = ${attemptId}
  `
  if (updated !== 1) throw new ImportAnalysisOwnershipError()
}

export async function releaseImportAnalysisAttempt(
  batchId: string,
  attemptId: string,
  status: 'READY_FOR_REVIEW' | 'READY_TO_COMMIT' | 'FAILED',
  data: AnalysisReleaseData = {},
) {
  const result = await prisma.importBatch.updateMany({
    where: { id: batchId, status: 'ANALYZING', analysisAttemptId: attemptId },
    data: {
      ...data,
      status,
      analysisAttemptId: null,
      completedAt: new Date(),
    },
  })
  if (result.count !== 1) throw new ImportAnalysisOwnershipError()
  return result
}
