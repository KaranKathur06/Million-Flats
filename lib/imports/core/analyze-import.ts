import { prisma } from '@/lib/prisma'
import { getImportAdapterForEntity } from '@/lib/imports/registry'
import { canTransition } from './state-machine'

export async function analyzeImportBatch(input: { batchId: string; ownerAgentId?: string | null }) {
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

  // If already analyzing, continue with the analysis (allows re-analysis)
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

  for (const record of records) {
    const raw = batch.category && batch.entityType === 'ECOSYSTEM_PARTNER' && record.rawPayload && typeof record.rawPayload === 'object' && !('category' in (record.rawPayload as object)) && !('categorySlug' in (record.rawPayload as object))
      ? { ...(record.rawPayload as Record<string, unknown>), categorySlug: batch.category }
      : record.rawPayload || {}
    const mappings = adapter.suggestMappings({ fields: Object.keys(raw) })
    const normalized = adapter.normalize({ raw, sourcePath: record.sourcePath, mappings })
    const canonicalResult = adapter.mapCanonical({ raw, normalized: normalized.normalized, mappings })
    const canonical = canonicalResult.canonical as any
    if (canonical && !canonical.agentId && input.ownerAgentId) canonical.agentId = input.ownerAgentId

    const validation = canonical
      ? adapter.validate({ canonical, raw, normalized: normalized.normalized })
      : { ready: false, warnings: [], errors: canonicalResult.errors }
    const relations = canonical
      ? await adapter.resolveRelations({ canonical, raw })
      : { ready: false, warnings: [], errors: [] }
    const recordWarnings = [...normalized.warnings, ...canonicalResult.warnings, ...validation.warnings, ...relations.warnings]
    const recordErrors = [...normalized.errors, ...canonicalResult.errors, ...validation.errors, ...relations.errors]
    const status = recordErrors.length > 0 ? 'ERROR' : recordWarnings.length > 0 ? 'WARNING' : 'READY'

    if (status === 'READY') ready += 1
    if (status === 'WARNING') warnings += 1
    if (status === 'ERROR') errors += 1

    await (prisma as any).importRecord.update({
      where: { id: record.id },
      data: {
        normalizedPayload: normalized.normalized,
        canonicalPayload: canonical,
        status,
        ownershipPolicy: input.ownerAgentId && !String((normalized.normalized as any)?.agentId || '').trim()
          ? 'configured-owner-agent'
          : 'source-agent',
        overallConfidence: Object.values(canonicalResult.fieldConfidence).length
          ? Object.values(canonicalResult.fieldConfidence).reduce((sum, value) => sum + value, 0) / Object.values(canonicalResult.fieldConfidence).length
          : null,
      },
    })

    for (const issue of [
      ...recordWarnings.map((message) => ({ severity: 'WARNING', message })),
      ...recordErrors.map((message) => ({ severity: 'ERROR', message })),
    ]) {
      await (prisma as any).importIssue.create({
        data: {
          batchId: batch.id,
          recordId: record.id,
          stage: 'ANALYSIS',
          severity: issue.severity,
          code: issue.severity === 'ERROR' ? 'CANONICAL_VALIDATION' : 'QUALITY_WARNING',
          message: issue.message,
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
    data: { status: nextStatus, readyCount: ready, warningCount: warnings, errorCount: errors },
  })

  return { batchId: batch.id, status: nextStatus, total: records.length, ready, warnings, errors }
  } catch (error) {
    await (prisma as any).importBatch.update({
      where: { id: batch.id },
      data: { status: 'FAILED', completedAt: new Date() },
    })
    throw error
  }
}
