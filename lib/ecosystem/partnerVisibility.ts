/**
 * Single source of truth for public partner visibility.
 * Maps CMS fields: status=APPROVED, isVerified=true, isActive=true (published).
 */
export const PUBLIC_PARTNER_VISIBILITY = {
  status: 'APPROVED' as const,
  isActive: true,
  isVerified: true,
}

export function buildPublicPartnerWhere(extra?: Record<string, unknown>) {
  return {
    ...PUBLIC_PARTNER_VISIBILITY,
    ...extra,
  }
}

/** When admin approves a partner, ensure it meets public visibility requirements. */
export function applyApprovalDefaults(data: Record<string, unknown>) {
  if (data.status === 'APPROVED') {
    data.isActive = true
    if (data.isVerified === undefined) data.isVerified = true
  }
  if (data.status === 'REJECTED' || data.status === 'PENDING') {
    data.isActive = false
  }
  return data
}
