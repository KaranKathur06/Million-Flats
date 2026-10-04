import { prisma } from '@/lib/prisma'
import { IMPORT_COMMIT_STALE_AFTER_MINUTES } from './constants'

export class ImportCommitOwnershipError extends Error {
  constructor() {
    super('Import commit attempt lost ownership.')
    this.name = 'ImportCommitOwnershipError'
  }
}

export async function acquireImportCommitLock(batchId: string, attemptId: string) {
  const claimed = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH candidate AS (
      SELECT "id"
      FROM "import_batches"
      WHERE "id" = ${batchId}
        AND (
          "status" IN ('READY_TO_COMMIT', 'READY_FOR_REVIEW')
          OR (
            "entity_type" IN ('PROPERTY', 'PROJECT')
            AND (
              "status" IN ('PARTIALLY_COMMITTED', 'FAILED')
              OR (
                "status" = 'COMMITTING'
                AND COALESCE("commit_heartbeat_at", "started_at", "updated_at")
                  <= clock_timestamp() - make_interval(mins => ${IMPORT_COMMIT_STALE_AFTER_MINUTES})
              )
            )
          )
        )
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "import_batches"
    SET "status" = 'COMMITTING',
        "commit_attempt_id" = ${attemptId},
        "commit_heartbeat_at" = clock_timestamp(),
        "started_at" = clock_timestamp()
    FROM candidate
    WHERE "import_batches"."id" = candidate."id"
    RETURNING "import_batches"."id"
  `
  return claimed.length === 1
}

export async function refreshImportCommitHeartbeat(tx: any, batchId: string, attemptId: string) {
  const updated = await tx.$executeRaw`
    UPDATE "import_batches"
    SET "commit_heartbeat_at" = clock_timestamp()
    WHERE "id" = ${batchId}
      AND "status" = 'COMMITTING'
      AND "commit_attempt_id" = ${attemptId}
  `
  if (updated !== 1) throw new ImportCommitOwnershipError()
}

export async function releaseImportCommitLock(
  batchId: string,
  attemptId: string,
  status: 'READY_FOR_REVIEW' | 'READY_TO_COMMIT' | 'COMMITTED' | 'PARTIALLY_COMMITTED' | 'FAILED',
) {
  const result = await prisma.importBatch.updateMany({
    where: { id: batchId, status: 'COMMITTING', commitAttemptId: attemptId },
    data: {
      status,
      completedAt: ['COMMITTED', 'PARTIALLY_COMMITTED', 'FAILED'].includes(status) ? new Date() : null,
      commitAttemptId: null,
    },
  })
  if (result.count !== 1) throw new ImportCommitOwnershipError()
  return result
}
