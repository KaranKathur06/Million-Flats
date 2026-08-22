import { prisma } from '@/lib/prisma'
import { invalidateAfterOwnershipChange } from './state-machine'

export async function resolveImportOwner(input: { batchId: string; agentId: string; userId: string }) {
  const agentId = String(input.agentId || '').trim()
  if (!agentId) throw new Error('An existing Agent ID is required.')

  return (prisma as any).$transaction(async (tx: any) => {
    const agent = await tx.agent.findUnique({ where: { id: agentId }, select: { id: true } })
    if (!agent) throw new Error('The selected Agent owner does not exist.')

    const batch = await tx.importBatch.findUnique({ where: { id: input.batchId }, select: { id: true } })
    if (!batch) throw new Error('Import batch not found.')

    const records = await tx.importRecord.findMany({
      where: { batchId: input.batchId, status: { not: 'COMMITTED' } },
      select: { id: true, canonicalPayload: true },
    })
    for (const record of records) {
      const payload = record.canonicalPayload && typeof record.canonicalPayload === 'object'
        ? { ...(record.canonicalPayload as Record<string, unknown>), agentId }
        : null
      await tx.importRecord.update({
        where: { id: record.id },
        data: { canonicalPayload: payload, ownershipPolicy: 'existing-agent-match', status: 'NORMALIZED' },
      })
    }

    await tx.importBatch.update({ where: { id: input.batchId }, data: { status: invalidateAfterOwnershipChange() } })
    return { batchId: input.batchId, status: 'VALIDATING' as const, resolvedRecords: records.length, agentId }
  })
}
