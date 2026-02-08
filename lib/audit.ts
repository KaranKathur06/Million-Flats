import { prisma } from '@/lib/prisma'

export type AuditEntityType = 'MANUAL_PROPERTY' | 'AGENT' | 'USER'
export type AuditAction =
  | 'DRAFT_DELETED'
  | 'PUBLISHED_ARCHIVED'
  | 'PUBLISHED_CLONED_TO_DRAFT'
  | 'ADMIN_APPROVED'
  | 'ADMIN_REJECTED'
  | 'ADMIN_ARCHIVED'
  | 'ADMIN_RESTORED'
  | 'ADMIN_CLONED_TO_DRAFT'
  | 'ADMIN_AGENT_APPROVED'
  | 'ADMIN_AGENT_SUSPENDED'
  | 'ADMIN_AGENT_BANNED'
  | 'ADMIN_AGENT_ROLE_REVOKED'

export async function writeAuditLog(input: {
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  performedByUserId?: string | null
  meta?: unknown
}) {
  const entityId = String(input.entityId || '').trim()
  if (!entityId) return null

  const data: any = {
    entityType: input.entityType,
    entityId,
    action: input.action,
    performedByUserId: input.performedByUserId || null,
    meta: input.meta ?? null,
  }

  try {
    return await (prisma as any).auditLog.create({ data })
  } catch {
    return null
  }
}
