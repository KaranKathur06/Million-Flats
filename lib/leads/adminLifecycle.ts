import { prisma } from '@/lib/prisma'

export class LeadLifecycleConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LeadLifecycleConflictError'
  }
}

export async function setLeadArchived(input: {
  leadId: string
  actorId: string
  archived: boolean
}) {
  return prisma.$transaction(async (tx) => {
    const db = tx as any
    const current = await db.lead.findUnique({
      where: { id: input.leadId },
      select: { id: true, deletedAt: true },
    })
    if (!current) return { kind: 'not-found' as const }
    if (Boolean(current.deletedAt) === input.archived) {
      throw new LeadLifecycleConflictError(input.archived ? 'Lead is already archived.' : 'Lead is not archived.')
    }

    const now = new Date()
    const changed = await db.lead.updateMany({
      where: {
        id: input.leadId,
        deletedAt: input.archived ? { not: null } : null,
      },
      data: {
        deletedAt: input.archived ? now : null,
        deletedBy: input.archived ? input.actorId : null,
      },
    })
    if (changed.count !== 1) throw new LeadLifecycleConflictError('Lead state changed during the request.')

    await db.auditLog.create({
      data: {
        entityType: 'LEAD',
        entityId: input.leadId,
        action: input.archived ? 'LEAD_ARCHIVED' : 'LEAD_RESTORED',
        performedByUserId: input.actorId,
        beforeState: { archived: !input.archived },
        afterState: { archived: input.archived },
      },
    })

    return { kind: 'updated' as const, deletedAt: input.archived ? now : null }
  })
}
