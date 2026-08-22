import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { getImportAdapterForEntity } from '@/lib/imports/registry'
import { canTransition } from '@/lib/imports/core/state-machine'

export async function POST(req: Request, { params }: { params: { batchId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })

  try {
    const body = await req.json().catch(() => ({}))
    const ownerAgentId = String(body.ownerAgentId || '').trim()
    const batch = await (prisma as any).importBatch.findUnique({ where: { id: params.batchId } })
    if (!batch) return NextResponse.json({ success: false, message: 'Import batch not found.' }, { status: 404 })
    const adapter = getImportAdapterForEntity(batch.entityType)
    if (!adapter) return NextResponse.json({ success: false, message: 'Property adapter required.' }, { status: 422 })

    const currentState = String(batch.status || 'UPLOADED')
    if (!canTransition(currentState as any, 'ANALYZING')) {
      return NextResponse.json({ success: false, message: `Import batch cannot transition from ${currentState} to ANALYZING.` }, { status: 409 })
    }

    await (prisma as any).importBatch.update({ where: { id: batch.id }, data: { status: 'ANALYZING', startedAt: new Date() } })
    const records = await (prisma as any).importRecord.findMany({ where: { batchId: batch.id }, orderBy: { sourceRow: 'asc' } })
    let ready = 0
    let warnings = 0
    let errors = 0

    for (const record of records) {
      const raw = record.rawPayload || {}
      const fields = Object.keys(raw)
      const mappings = adapter.suggestMappings({ fields })
      const normalized = adapter.normalize({ raw, sourcePath: record.sourcePath, mappings })
      const canonicalResult = adapter.mapCanonical({ raw, normalized: normalized.normalized, mappings })
      const canonical = canonicalResult.canonical as any
      if (canonical && !canonical.agentId && ownerAgentId) canonical.agentId = ownerAgentId
      const validation = canonical
        ? adapter.validate({ canonical, raw, normalized: normalized.normalized })
        : { ready: false, warnings: [], errors: canonicalResult.errors }
      const recordWarnings = [...normalized.warnings, ...canonicalResult.warnings, ...validation.warnings]
      const recordErrors = [...normalized.errors, ...canonicalResult.errors, ...validation.errors]
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
          ownershipPolicy: ownerAgentId && !String((normalized.normalized as any).agentId || '').trim() ? 'configured-system-agent' : 'source-agent',
          overallConfidence: Object.values(canonicalResult.fieldConfidence).length
            ? Object.values(canonicalResult.fieldConfidence).reduce((sum, value) => sum + value, 0) / Object.values(canonicalResult.fieldConfidence).length
            : null,
        },
      })

      for (const issue of [...recordWarnings.map((message) => ({ severity: 'WARNING', message })), ...recordErrors.map((message) => ({ severity: 'ERROR', message }))]) {
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

    return NextResponse.json({ success: true, batchId: batch.id, status: nextStatus, total: records.length, ready, warnings, errors })
  } catch (error: any) {
    console.error('[POST /api/admin/bulk-import/[batchId]/analyze]', error)
    return NextResponse.json({ success: false, message: error?.message || 'Import analysis failed.' }, { status: 500 })
  }
}
