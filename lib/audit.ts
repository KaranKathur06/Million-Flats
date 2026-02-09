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
  | 'ADMIN_AGENT_DELETED'
  | 'ADMIN_AGENT_PROFILESTATUS_OVERRIDDEN'
  | 'ADMIN_USER_BANNED'
  | 'ADMIN_USER_DELETED'
  | 'ADMIN_USER_ROLE_CHANGED'
  | 'ADMIN_USER_EMAIL_VERIFIED'
  | 'AGENT_PROFILE_SUBMITTED'

export async function writeAuditLog(input: {
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  performedByUserId?: string | null
  ipAddress?: string | null
  beforeState?: unknown
  afterState?: unknown
  meta?: unknown
}) {
  const entityId = String(input.entityId || '').trim()
  if (!entityId) return null

  const data: any = {
    entityType: input.entityType,
    entityId,
    action: input.action,
    performedByUserId: input.performedByUserId || null,
    ipAddress: input.ipAddress || null,
    beforeState: input.beforeState ?? null,
    afterState: input.afterState ?? null,
    meta: input.meta ?? null,
  }

  try {
    return await (prisma as any).auditLog.create({ data })
  } catch {
    return null
  }
}
