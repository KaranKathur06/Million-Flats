import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { getImportAdapterForEntity } from '@/lib/imports/registry'
import {
  ImportAnalysisOwnershipError,
  claimImportAnalysisAttempt,
  markImportAnalysisRetrying,
  releaseImportAnalysisAttempt,
} from './analysis-lock'
import { canTransition } from './state-machine'

type AnalysisSummary = {
  batchId: string
  status: string
  total: number
  ready: number
  warnings: number
  errors: number
}

type AnalysisRequestMode = 'START' | 'RECOVER' | 'RETRY'
const MAX_ANALYSIS_RECORD_TRANSACTION_RETRIES = 2

export class ImportAnalysisConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportAnalysisConflictError'
  }
}

function compactProjectText(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/l\s*(?:and|&)\s*t/g, 'lnt')
    .replace(/[^a-z0-9]/g, '')
    .replace(/and/g, '')
}

function inferProjectDeveloper(raw: Record<string, unknown>, records: any[]) {
  const existingDeveloperNames = Array.from(new Set(
    records
      .map((record) => record.rawPayload && typeof record.rawPayload === 'object' ? record.rawPayload as Record<string, unknown> : {})
      .map((payload) => payload.developerName ?? payload.developer_name ?? payload.developer)
      .map((value) => String(value ?? '').trim())
      .filter(Boolean),
  ))
  const projectName = compactProjectText(raw.name ?? raw.project_name ?? raw.project_title)
  const matches = existingDeveloperNames.filter((developerName) => {
    const compactDeveloper = compactProjectText(developerName)
    return compactDeveloper.length >= 4 && projectName.includes(compactDeveloper)
  })
  return matches.length === 1 ? matches[0] : null
}

function summaryFromBatch(batch: any, status = String(batch.status || 'ANALYZING')): AnalysisSummary {
  return {
    batchId: batch.id,
    status,
    total: batch.totalRecords || 0,
    ready: batch.readyCount || 0,
    warnings: batch.warningCount || 0,
    errors: batch.errorCount || 0,
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Import analysis failed.'
}

function isPrismaTransactionExpired(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2028'
}

export async function analyzeImportBatch(input: {
  batchId: string
  ownerAgentId?: string | null
  waitForCompletion?: boolean
  requestMode?: AnalysisRequestMode
}): Promise<AnalysisSummary> {
  const batch = await (prisma as any).importBatch.findUnique({ where: { id: input.batchId } })
  if (!batch) throw new Error('Import batch not found.')

  const adapter = getImportAdapterForEntity(batch.entityType)
  if (!adapter) throw new Error(`No import adapter is registered for ${batch.entityType}.`)
  const currentState = String(batch.status || 'UPLOADED')
  const requestMode = input.requestMode || 'START'
  if (batch.adapterVersion != null && adapter.adapterVersion !== batch.adapterVersion) {
    const canUpgradeForAnalysis = ['UPLOADED', 'READY_FOR_REVIEW', 'MAPPING_REVIEW', 'NORMALIZING', 'VALIDATING', 'DUPLICATE_REVIEW', 'FAILED', 'RETRYING'].includes(currentState)
    if (!canUpgradeForAnalysis) {
      throw new Error(`Import adapter version mismatch for ${batch.entityType}: batch ${batch.adapterVersion}, runtime ${adapter.adapterVersion}.`)
    }
    await (prisma as any).importBatch.update({
      where: { id: batch.id },
      data: { adapterVersion: adapter.adapterVersion },
    })
  }

  if (currentState === 'READY_TO_COMMIT') return summaryFromBatch(batch, currentState)

  if (requestMode === 'START' && currentState === 'ANALYZING') {
    return summaryFromBatch(batch, currentState)
  }
  if (requestMode === 'RECOVER' && currentState !== 'ANALYZING') {
    throw new ImportAnalysisConflictError('This batch is no longer awaiting analysis recovery. Refresh its status.')
  }
  if (requestMode === 'RETRY' &&
    (!['FAILED', 'RETRYING'].includes(currentState) || (batch.failureSummary as any)?.stage !== 'ANALYSIS')) {
    throw new ImportAnalysisConflictError('This batch does not have a retryable analysis failure. Refresh its status.')
  }
  if (requestMode === 'START' && !canTransition(currentState as any, 'ANALYZING')) {
    throw new Error(`Import batch cannot transition from ${currentState} to ANALYZING.`)
  }
  if (requestMode === 'RETRY' && currentState === 'FAILED' &&
    (!canTransition('FAILED', 'RETRYING') || !canTransition('RETRYING', 'ANALYZING'))) {
    throw new Error(`Import batch cannot transition from ${currentState} to ANALYZING.`)
  }
  if (requestMode === 'RETRY' && currentState === 'RETRYING' && !canTransition('RETRYING', 'ANALYZING')) {
    throw new Error(`Import batch cannot transition from ${currentState} to ANALYZING.`)
  }

  if (requestMode === 'RETRY' && currentState === 'FAILED') {
    const retrying = await markImportAnalysisRetrying(batch.id)
    if (!retrying) {
      throw new ImportAnalysisConflictError('Another request has already started retrying this analysis. Refresh the batch.')
    }
  }

  const attemptId = randomUUID()
  const claimed = await claimImportAnalysisAttempt({
    batchId: batch.id,
    attemptId,
    ownerAgentId: requestMode === 'START' ? input.ownerAgentId : null,
    mode: requestMode,
  })
  if (!claimed) {
    if (requestMode === 'RECOVER') {
      throw new ImportAnalysisConflictError('Another analysis attempt is active or this batch is not stale yet. Refresh the batch before retrying.')
    }
    if (requestMode === 'RETRY') {
      throw new ImportAnalysisConflictError('Another request has already started retrying this analysis. Refresh the batch.')
    }
    const latest = await (prisma as any).importBatch.findUnique({ where: { id: batch.id } })
    if (latest?.status === 'ANALYZING') return summaryFromBatch(latest)
    throw new ImportAnalysisConflictError('The batch changed before analysis could start. Refresh the batch.')
  }

  if (input.waitForCompletion) {
    const savedOwnerAgentId = requestMode === 'START'
      ? input.ownerAgentId ?? batch.analysisOwnerAgentId
      : batch.analysisOwnerAgentId
    return await performBackgroundAnalysis(batch.id, attemptId, savedOwnerAgentId, batch.mode)
  }

  const savedOwnerAgentId = requestMode === 'START'
    ? input.ownerAgentId ?? batch.analysisOwnerAgentId
    : batch.analysisOwnerAgentId
  void performBackgroundAnalysis(
    batch.id,
    attemptId,
    savedOwnerAgentId,
    batch.mode,
  ).catch((error) => {
    if (!(error instanceof ImportAnalysisOwnershipError)) {
      console.error(`[Background Analysis] Error analyzing batch ${batch.id}:`, error)
    }
    return {
      batchId: batch.id,
      status: 'FAILED',
      total: batch.totalRecords || 0,
      ready: 0,
      warnings: 0,
      errors: 0,
    }
  })

  return {
    batchId: batch.id,
    status: 'ANALYZING',
    total: batch.totalRecords || 0,
    ready: 0,
    warnings: 0,
    errors: 0,
  }
}

async function performBackgroundAnalysis(
  batchId: string,
  attemptId: string,
  ownerAgentId: string | null | undefined,
  batchMode: string = 'PARTIAL',
): Promise<AnalysisSummary> {
  try {
    const batch = await (prisma as any).importBatch.findUnique({ where: { id: batchId } })
    if (!batch) throw new Error('Batch not found for background analysis.')

    const adapter = getImportAdapterForEntity(batch.entityType)
    if (!adapter) throw new Error('Adapter not found for background analysis.')

    const records = await (prisma as any).importRecord.findMany({
      where: { batchId: batch.id },
      orderBy: { sourceRow: 'asc' },
    })

    let ready = 0
    let warnings = 0
    let errors = 0
    let processedCount = 0
    const BATCH_SIZE = 15
    const NON_BLOCKING_WARNINGS = batchMode === 'STRICT' ? [] : [
      'PARKING_SOURCE_CONTAMINATED',
      'POSSESSION_SOURCE_CONTAMINATED',
      'FLOOR_SOURCE_CONTAMINATED',
      'PARKING_UNPARSEABLE_CONTAMINATION',
      'POSSESSION_UNPARSEABLE_CONTAMINATION',
      'FLOOR_UNPARSEABLE_CONTAMINATION',
    ]

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const recordsBatch = records.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        recordsBatch.map(async (record: any) => {
          const rawPayload = record.rawPayload && typeof record.rawPayload === 'object'
            ? record.rawPayload as Record<string, unknown>
            : {}
          const hasCategory = ['category', 'categorySlug', 'category_slug', 'partner_category']
            .some((key) => String(rawPayload[key] || '').trim())
          const raw = batch.category && batch.entityType === 'ECOSYSTEM_PARTNER' && !hasCategory
            ? { ...rawPayload, categorySlug: batch.category }
            : rawPayload
          const analysisRaw = batch.entityType === 'PROJECT' && !String(rawPayload.developer ?? rawPayload.developerName ?? rawPayload.developer_name ?? '').trim()
            ? { ...raw, developer: inferProjectDeveloper(rawPayload, records) }
            : raw

          const mappings = adapter.suggestMappings({ fields: Object.keys(analysisRaw) })
          const normalized = adapter.normalize({ raw: analysisRaw, sourcePath: record.sourcePath, mappings })
          const canonicalResult = adapter.mapCanonical({ raw: analysisRaw, normalized: normalized.normalized, mappings })
          const canonical = canonicalResult.canonical as any
          if (canonical && !canonical.agentId && ownerAgentId) canonical.agentId = ownerAgentId

          const validation = canonical
            ? adapter.validate({ canonical, raw, normalized: normalized.normalized })
            : { ready: false, warnings: [], errors: canonicalResult.errors }

          const relations = canonical
            ? await adapter.resolveRelations({ canonical, raw: analysisRaw, db: prisma })
            : { ready: false, warnings: [], errors: [] }

          const recordWarnings = [...normalized.warnings, ...canonicalResult.warnings, ...validation.warnings, ...relations.warnings]
          const recordErrors = [...normalized.errors, ...canonicalResult.errors, ...validation.errors, ...relations.errors]
          const blockingWarnings = recordWarnings.filter(
            (warning: string) => !NON_BLOCKING_WARNINGS.some((code) => warning.includes(code)),
          )
          const status = recordErrors.length > 0 ? 'ERROR' : blockingWarnings.length > 0 ? 'WARNING' : 'READY'

          return { record, normalized, canonicalResult, canonical, recordWarnings, recordErrors, status }
        }),
      )

      for (const result of batchResults) {
        const { record, normalized, canonicalResult, canonical, recordWarnings, recordErrors, status } = result
        const issueRows = [
          ...recordWarnings.map((message: string) => ({
            batchId: batch.id,
            recordId: record.id,
            stage: 'ANALYSIS',
            severity: 'WARNING',
            code: NON_BLOCKING_WARNINGS.some((code) => message.includes(code)) ? 'DATA_QUALITY_INFO' : 'QUALITY_WARNING',
            message,
          })),
          ...recordErrors.map((message: string) => ({
            batchId: batch.id,
            recordId: record.id,
            stage: 'ANALYSIS',
            severity: 'ERROR',
            code: 'CANONICAL_VALIDATION',
            message,
          })),
        ]

        const targetProcessedCount = processedCount + 1
        const normalizedPayloadJson = normalized.normalized == null ? null : JSON.stringify(normalized.normalized)
        const canonicalPayloadJson = canonical == null ? null : JSON.stringify(canonical)
        const overallConfidence = Object.values(canonicalResult.fieldConfidence || {}).length
          ? Object.values(canonicalResult.fieldConfidence || {}).reduce((sum: number, value: any) => sum + (typeof value === 'number' ? value : 0), 0) / Object.values(canonicalResult.fieldConfidence || {}).length
          : null
        let checkpointRetryCount = 0
        while (true) {
          try {
            const checkpoint = await (prisma as any).$queryRaw`
              /* import_analysis_record_checkpoint */
              WITH ownership AS MATERIALIZED (
                SELECT "id"
                FROM "import_batches"
                WHERE "id" = ${batch.id}
                  AND "status" = 'ANALYZING'
                  AND "analysis_attempt_id" = ${attemptId}
                FOR UPDATE
              ),
              record_updated AS (
                UPDATE "import_records" AS record
                SET "normalized_payload" = ${normalizedPayloadJson}::jsonb,
                    "canonical_payload" = ${canonicalPayloadJson}::jsonb,
                    "status" = ${status}::"ImportRecordStatus",
                    "ownership_policy" = ${ownerAgentId && !String((normalized.normalized as any)?.agentId || '').trim()
                      ? 'configured-owner-agent'
                      : 'source-agent'},
                    "overall_confidence" = ${overallConfidence},
                    "updated_at" = clock_timestamp()
                FROM ownership
                WHERE record."id" = ${record.id}
                  AND record."batch_id" = ${batch.id}
                RETURNING record."id"
              ),
              issues_deleted AS (
                DELETE FROM "import_issues" AS issue
                USING record_updated
                WHERE issue."batch_id" = ${batch.id}
                  AND issue."record_id" = record_updated."id"
                  AND issue."stage" = 'ANALYSIS'
                  AND issue."resolution_state" = 'OPEN'
                RETURNING issue."id"
              ),
              issues_inserted AS (
                INSERT INTO "import_issues" (
                  "batch_id", "record_id", "stage", "severity", "code", "message"
                )
                SELECT
                  ${batch.id},
                  record_updated."id",
                  issue_row."stage",
                  issue_row."severity"::"ImportIssueSeverity",
                  issue_row."code",
                  issue_row."message"
                FROM record_updated
                CROSS JOIN (SELECT count(*) FROM issues_deleted) AS deleted_issues
                CROSS JOIN LATERAL jsonb_to_recordset(${JSON.stringify(issueRows)}::jsonb)
                  AS issue_row("stage" text, "severity" text, "code" text, "message" text)
                RETURNING "id"
              ),
              progress_updated AS (
                UPDATE "import_batches" AS batch_progress
                SET "analysis_heartbeat_at" = clock_timestamp(),
                    "analysis_processed_count" = ${targetProcessedCount}
                WHERE batch_progress."id" = ${batch.id}
                  AND batch_progress."status" = 'ANALYZING'
                  AND batch_progress."analysis_attempt_id" = ${attemptId}
                  AND EXISTS (SELECT 1 FROM record_updated)
                  AND (SELECT count(*) FROM issues_inserted) >= 0
                RETURNING batch_progress."id"
              )
              SELECT
                EXISTS (SELECT 1 FROM ownership) AS "ownershipMatched",
                EXISTS (SELECT 1 FROM record_updated) AS "recordMatched",
                EXISTS (SELECT 1 FROM progress_updated) AS "progressUpdated"
            `
            const checkpointResult = checkpoint[0]
            if (!checkpointResult?.ownershipMatched) throw new ImportAnalysisOwnershipError()
            if (!checkpointResult.recordMatched) {
              throw new Error(`Import analysis record ${record.id} was not found in batch ${batch.id}.`)
            }
            if (!checkpointResult.progressUpdated) {
              throw new Error(`Import analysis progress could not be checkpointed for batch ${batch.id}.`)
            }
            break
          } catch (error) {
            if (!isPrismaTransactionExpired(error) || checkpointRetryCount >= MAX_ANALYSIS_RECORD_TRANSACTION_RETRIES) {
              throw error
            }
            checkpointRetryCount += 1
            console.warn(
              `[Background Analysis] Retrying expired checkpoint for batch ${batch.id}, record ${record.id} (attempt ${checkpointRetryCount}/${MAX_ANALYSIS_RECORD_TRANSACTION_RETRIES}).`,
            )
          }
        }

        processedCount = targetProcessedCount
      }

      for (const result of batchResults) {
        if (result.status === 'READY') ready += 1
        if (result.status === 'WARNING') warnings += 1
        if (result.status === 'ERROR') errors += 1
      }
    }

    const nextStatus = errors > 0 || warnings > 0 ? 'READY_FOR_REVIEW' : 'READY_TO_COMMIT'
    if (!canTransition('ANALYZING', nextStatus as any)) {
      throw new Error(`Import batch cannot transition from ANALYZING to ${nextStatus}.`)
    }

    await releaseImportAnalysisAttempt(batch.id, attemptId, nextStatus, {
      readyCount: ready,
      warningCount: warnings,
      errorCount: errors,
    })

    return {
      batchId: batch.id,
      status: nextStatus,
      total: records.length,
      ready,
      warnings,
      errors,
    }
  } catch (error) {
    if (error instanceof ImportAnalysisOwnershipError) throw error

    try {
      await releaseImportAnalysisAttempt(batchId, attemptId, 'FAILED', {
        failureSummary: { stage: 'ANALYSIS', message: getErrorMessage(error) },
      })
    } catch (releaseError) {
      if (releaseError instanceof ImportAnalysisOwnershipError) throw releaseError
      console.error(`[Background Analysis] Could not record failure for batch ${batchId}:`, releaseError)
    }
    throw error
  }
}
