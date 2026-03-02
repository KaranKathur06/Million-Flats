import { writeAuditLog, type AuditAction, type AuditEntityType } from '@/lib/audit'

export function getRequestIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return req.headers.get('x-real-ip') || null
}

export async function audit(input: {
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  performedByUserId?: string | null
  req?: Request
  ipAddress?: string | null
  beforeState?: unknown
  afterState?: unknown
  meta?: unknown
}) {
  const ipAddress = input.ipAddress ?? (input.req ? getRequestIp(input.req) : null)
  return await writeAuditLog({
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    performedByUserId: input.performedByUserId || null,
    ipAddress: ipAddress || null,
    beforeState: input.beforeState,
    afterState: input.afterState,
    meta: input.meta,
  })
}
