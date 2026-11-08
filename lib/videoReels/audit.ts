import type { Prisma } from '@prisma/client'

type VideoAuditEntity = 'REEL' | 'CAMPAIGN' | 'PACKAGE' | 'SETTINGS'

export async function writeVideoAudit(
  tx: Prisma.TransactionClient,
  params: {
    actorUserId: string | null
    entityType: VideoAuditEntity
    entityId: string
    action: string
    beforeState?: Prisma.InputJsonValue
    afterState?: Prisma.InputJsonValue
  },
) {
  await tx.videoCampaignAuditEvent.create({
    data: {
      actorUserId: params.actorUserId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      beforeState: params.beforeState,
      afterState: params.afterState,
    },
  })
}
