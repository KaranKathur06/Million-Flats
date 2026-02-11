import { prisma } from '@/lib/prisma'

export type AuditEntityType = 'MANUAL_PROPERTY' | 'AGENT' | 'USER' | 'ECOSYSTEM_PARTNER_APPLICATION'
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
  | 'AGENT_APPROVED'
  | 'AGENT_APPROVED_OVERRIDE'
  | 'ADMIN_AGENT_SUSPENDED'
  | 'ADMIN_AGENT_BANNED'
  | 'ADMIN_AGENT_ROLE_REVOKED'
  | 'ADMIN_AGENT_DELETED'
  | 'ADMIN_AGENT_PROFILESTATUS_OVERRIDDEN'
  | 'ADMIN_AGENT_GO_LIVE'
  | 'ADMIN_AGENT_UNSUSPENDED'
  | 'ADMIN_USER_BANNED'
  | 'ADMIN_USER_DELETED'
  | 'ADMIN_USER_ROLE_CHANGED'
  | 'ADMIN_USER_EMAIL_VERIFIED'
  | 'USER_EMAIL_VERIFIED'
  | 'AGENT_PROFILE_SUBMITTED'
  | 'ECOSYSTEM_PARTNER_APPLIED'
  | 'ADMIN_ECOSYSTEM_PARTNER_STAGE_CHANGED'

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
