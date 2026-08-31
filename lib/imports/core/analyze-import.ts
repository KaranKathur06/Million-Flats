import { prisma } from '@/lib/prisma'
import { getImportAdapterForEntity } from '@/lib/imports/registry'
import { canTransition } from './state-machine'

/**
 * ARCHITECTURAL PATTERN: Async Background Analysis
 * 
 * Problem: 1000+ records with async DB queries can't complete in 100s HTTP timeout
 * Solution: Return immediately with ANALYZING status, process in background
 * 
 * Benefits:
 * - HTTP request completes in <1s (no timeout)
 * - Analysis happens in background with controlled concurrency
 * - Client polls status endpoint for progress
 * - Connection pool managed at 10-15 parallel queries
 */

type AnalysisSummary = {
  batchId: string
  status: string
  total: number
  ready: number
  warnings: number
  errors: number
}

// Global analysis queue to prevent concurrent analysis of same batch
const analysisQueue = new Map<string, Promise<AnalysisSummary>>()

export async function analyzeImportBatch(input: { batchId: string; ownerAgentId?: string | null; waitForCompletion?: boolean }): Promise<AnalysisSummary> {
  const batch = await (prisma as any).importBatch.findUnique({ where: { id: input.batchId } })
  if (!batch) throw new Error('Import batch not found.')

  const adapter = getImportAdapterForEntity(batch.entityType)
  if (!adapter) throw new Error(`No import adapter is registered for ${batch.entityType}.`)
  if (batch.adapterVersion != null && adapter.adapterVersion !== batch.adapterVersion) {
    throw new Error(`Import adapter version mismatch for ${batch.entityType}: batch ${batch.adapterVersion}, runtime ${adapter.adapterVersion}.`)
  }

  const currentState = String(batch.status || 'UPLOADED')
  if (currentState === 'READY_TO_COMMIT') {
    return {
      batchId: batch.id,
      status: currentState,
      total: batch.totalRecords || 0,
      ready: batch.readyCount || 0,
      warnings: batch.warningCount || 0,
      errors: batch.errorCount || 0,
    }
  }

  // Check if already analyzing or queued
  if (currentState === 'ANALYZING' || analysisQueue.has(batch.id)) {
    return {
      batchId: batch.id,
      status: 'ANALYZING',
      total: batch.totalRecords || 0,
      ready: batch.readyCount || 0,
      warnings: batch.warningCount || 0,
      errors: batch.errorCount || 0,
    }
  }

  // Transition to ANALYZING if needed
  const needsStatusUpdate = currentState !== 'ANALYZING'
  if (needsStatusUpdate && !canTransition(currentState as any, 'ANALYZING')) {
    throw new Error(`Import batch cannot transition from ${currentState} to ANALYZING.`)
  }

  if (needsStatusUpdate) {
    await (prisma as any).importBatch.update({
      where: { id: batch.id },
      data: { status: 'ANALYZING', startedAt: new Date() },
    })
  }

  // For testing: allow synchronous analysis
  if (input.waitForCompletion) {
    return await performBackgroundAnalysis(batch.id, input.ownerAgentId)
  }

  // Production: start background analysis without waiting
  const analysisPromise = performBackgroundAnalysis(batch.id, input.ownerAgentId).catch((error) => {
    console.error(`[Background Analysis] Error analyzing batch ${batch.id}:`, error)
    return {
      batchId: batch.id,
      status: 'FAILED',
      total: batch.totalRecords || 0,
      ready: 0,
      warnings: 0,
      errors: 0,
    }
  })

  // Track analysis in queue
  analysisQueue.set(batch.id, analysisPromise)
  analysisPromise.finally(() => analysisQueue.delete(batch.id))

  // Return immediately - analysis continues in background
  return {
    batchId: batch.id,
    status: 'ANALYZING',
    total: batch.totalRecords || 0,
    ready: batch.readyCount || 0,
    warnings: batch.warningCount || 0,
    errors: batch.errorCount || 0,
  }
}

async function performBackgroundAnalysis(batchId: string, ownerAgentId: string | null | undefined): Promise<AnalysisSummary> {
  const batch = await (prisma as any).importBatch.findUnique({ where: { id: batchId } })
  if (!batch) throw new Error('Batch not found for background analysis.')

  const adapter = getImportAdapterForEntity(batch.entityType)
  if (!adapter) throw new Error('Adapter not found for background analysis.')

  try {
    await (prisma as any).importIssue.deleteMany({
      where: { batchId: batch.id, stage: 'ANALYSIS', resolutionState: 'OPEN' },
    })

    const records = await (prisma as any).importRecord.findMany({
      where: { batchId: batch.id },
      orderBy: { sourceRow: 'asc' },
    })

    let ready = 0
    let warnings = 0
    let errors = 0

    // Use smaller batch size (10-15) to manage database connection pool
    // Sequential batches prevent connection pool exhaustion
    const BATCH_SIZE = 15
    const analysisResults: Array<{
      record: any
      normalized: any
      canonicalResult: any
      canonical: any
      recordWarnings: string[]
      recordErrors: string[]
      status: string
    }> = []

    // Process in sequential batches with controlled parallelism
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const recordsBatch = records.slice(i, i + BATCH_SIZE)

      // Only 15 parallel queries per batch, sequential batches
      const batchResults = await Promise.all(
        recordsBatch.map(async (record: any) => {
          const raw = batch.category && batch.entityType === 'ECOSYSTEM_PARTNER' && record.rawPayload && typeof record.rawPayload === 'object' && !('category' in (record.rawPayload as object)) && !('categorySlug' in (record.rawPayload as object))
            ? { ...(record.rawPayload as Record<string, unknown>), categorySlug: batch.category }
            : record.rawPayload || {}

          const mappings = adapter.suggestMappings({ fields: Object.keys(raw) })
          const normalized = adapter.normalize({ raw, sourcePath: record.sourcePath, mappings })
          const canonicalResult = adapter.mapCanonical({ raw, normalized: normalized.normalized, mappings })
          const canonical = canonicalResult.canonical as any
          if (canonical && !canonical.agentId && ownerAgentId) canonical.agentId = ownerAgentId

          const validation = canonical
            ? adapter.validate({ canonical, raw, normalized: normalized.normalized })
            : { ready: false, warnings: [], errors: canonicalResult.errors }

          const relations = canonical
            ? await adapter.resolveRelations({ canonical, raw })
            : { ready: false, warnings: [], errors: [] }

          const recordWarnings = [...normalized.warnings, ...canonicalResult.warnings, ...validation.warnings, ...relations.warnings]
          const recordErrors = [...normalized.errors, ...canonicalResult.errors, ...validation.errors, ...relations.errors]
          const status = recordErrors.length > 0 ? 'ERROR' : recordWarnings.length > 0 ? 'WARNING' : 'READY'

          return { record, normalized, canonicalResult, canonical, recordWarnings, recordErrors, status }
        })
      )

      analysisResults.push(...batchResults)
    }

    // Non-blocking warnings that don't prevent READY status
    const NON_BLOCKING_WARNINGS = [
      'PARKING_SOURCE_CONTAMINATED',
      'POSSESSION_SOURCE_CONTAMINATED',
      'FLOOR_SOURCE_CONTAMINATED',
      'PARKING_UNPARSEABLE_CONTAMINATION',
      'POSSESSION_UNPARSEABLE_CONTAMINATION',
      'FLOOR_UNPARSEABLE_CONTAMINATION',
    ]

    // Batch update database records (not individual updates)
    for (const result of analysisResults) {
      const { record, normalized, canonicalResult, canonical, recordWarnings, recordErrors, status } = result

      // Filter out non-blocking warnings for status determination
      const blockingWarnings = recordWarnings.filter(
        (w) => !NON_BLOCKING_WARNINGS.some((code) => w.includes(code)),
      )
      const finalStatus = recordErrors.length > 0 ? 'ERROR' : blockingWarnings.length > 0 ? 'WARNING' : 'READY'

      if (finalStatus === 'READY') ready += 1
      if (finalStatus === 'WARNING') warnings += 1
      if (finalStatus === 'ERROR') errors += 1

      await (prisma as any).importRecord.update({
        where: { id: record.id },
        data: {
          normalizedPayload: normalized.normalized,
          canonicalPayload: canonical,
          status: finalStatus,
          ownershipPolicy: ownerAgentId && !String((normalized.normalized as any)?.agentId || '').trim()
            ? 'configured-owner-agent'
            : 'source-agent',
          overallConfidence: Object.values(canonicalResult.fieldConfidence || {}).length
            ? Object.values(canonicalResult.fieldConfidence || {}).reduce((sum: number, value: any) => sum + (typeof value === 'number' ? value : 0), 0) / Object.values(canonicalResult.fieldConfidence || {}).length
            : null,
        },
      })

      for (const message of recordWarnings) {
        const isNonBlocking = NON_BLOCKING_WARNINGS.some((code) => message.includes(code))
        await (prisma as any).importIssue.create({
          data: {
            batchId: batch.id,
            recordId: record.id,
            stage: 'ANALYSIS',
            severity: isNonBlocking ? 'INFO' : 'WARNING',
            code: isNonBlocking ? 'DATA_QUALITY_INFO' : 'QUALITY_WARNING',
            message,
          },
        })
      }

      for (const message of recordErrors) {
        await (prisma as any).importIssue.create({
          data: {
            batchId: batch.id,
            recordId: record.id,
            stage: 'ANALYSIS',            severity: 'ERROR',
            code: 'CANONICAL_VALIDATION',
            message,
          },
        })
      }
    }

    const nextStatus = errors > 0 || warnings > 0 ? 'READY_FOR_REVIEW' : 'READY_TO_COMMIT'
    if (!canTransition('ANALYZING', nextStatus as any)) {
      throw new Error(`Import batch cannot transition from ANALYZING to ${nextStatus}.`)
    }

    await (prisma as any).importBatch.update({
      where: { id: batch.id },
      data: { status: nextStatus, readyCount: ready, warningCount: warnings, errorCount: errors, completedAt: new Date() },
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
    await (prisma as any).importBatch.update({
      where: { id: batchId },
      data: { status: 'FAILED', completedAt: new Date() },
    })
    throw error
  }
}
