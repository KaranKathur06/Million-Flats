import { writeAuditLog } from '@/lib/audit'
import type { AuditAction } from '@/lib/audit'

type PartnerAuditInput = {
  partnerId: string
  adminUserId: string
  beforeState?: Record<string, unknown> | null
  afterState?: Record<string, unknown> | null
  meta?: Record<string, unknown> | null
}

/** Log partner creation */
export async function auditPartnerCreate(input: PartnerAuditInput) {
  return writeAuditLog({
    entityType: 'ECOSYSTEM_PARTNER',
    entityId: input.partnerId,
    action: 'ADMIN_ECOSYSTEM_PARTNER_CREATED',
    performedByUserId: input.adminUserId,
    afterState: input.afterState,
    meta: input.meta,
  })
}

/** Log partner update with before/after diff */
export async function auditPartnerUpdate(input: PartnerAuditInput) {
  return writeAuditLog({
    entityType: 'ECOSYSTEM_PARTNER',
    entityId: input.partnerId,
    action: 'ADMIN_ECOSYSTEM_PARTNER_UPDATED',
    performedByUserId: input.adminUserId,
    beforeState: input.beforeState,
    afterState: input.afterState,
    meta: input.meta,
  })
}

/** Log specific governance changes (status, verification, featured) */
export async function auditPartnerGovernanceChange(input: PartnerAuditInput & { action: AuditAction }) {
  return writeAuditLog({
    entityType: 'ECOSYSTEM_PARTNER',
    entityId: input.partnerId,
    action: input.action,
    performedByUserId: input.adminUserId,
    beforeState: input.beforeState,
    afterState: input.afterState,
    meta: input.meta,
  })
}

/** Log media operations (upload, replace, delete) */
export async function auditPartnerMedia(input: {
  partnerId: string
  adminUserId: string
  action: 'ADMIN_ECOSYSTEM_PARTNER_MEDIA_UPLOADED' | 'ADMIN_ECOSYSTEM_PARTNER_MEDIA_REPLACED' | 'ADMIN_ECOSYSTEM_PARTNER_MEDIA_DELETED'
  mediaType: 'LOGO' | 'COVER'
  storageKey?: string | null
  meta?: Record<string, unknown> | null
}) {
  return writeAuditLog({
    entityType: 'ECOSYSTEM_PARTNER',
    entityId: input.partnerId,
    action: input.action,
    performedByUserId: input.adminUserId,
    meta: { mediaType: input.mediaType, storageKey: input.storageKey, ...input.meta },
  })
}

/**
 * Extract governance-specific audit actions from a before/after diff.
 * Returns the list of specific governance changes that occurred.
 */
export function detectGovernanceChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): { field: string; action: AuditAction; from: unknown; to: unknown }[] {
  const changes: { field: string; action: AuditAction; from: unknown; to: unknown }[] = []

  if (before.status !== after.status) {
    changes.push({
      field: 'status',
      action: 'ADMIN_ECOSYSTEM_PARTNER_STATUS_CHANGED',
      from: before.status,
      to: after.status,
    })
  }

  if (before.isVerified !== after.isVerified) {
    changes.push({
      field: 'isVerified',
      action: 'ADMIN_ECOSYSTEM_PARTNER_VERIFICATION_CHANGED',
      from: before.isVerified,
      to: after.isVerified,
    })
  }

  if (before.isFeatured !== after.isFeatured) {
    changes.push({
      field: 'isFeatured',
      action: 'ADMIN_ECOSYSTEM_PARTNER_FEATURED_CHANGED',
      from: before.isFeatured,
      to: after.isFeatured,
    })
  }

  return changes
}
