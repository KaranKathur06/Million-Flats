/**
 * Single source of truth for public partner visibility.
 * status=APPROVED + isActive=true (published). isVerified is a badge, not a visibility gate.
 */
export const PUBLIC_PARTNER_VISIBILITY = {
  status: 'APPROVED' as const,
  isActive: true,
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
  if (data.status === 'SUSPENDED') {
    data.isActive = false
  }
  return data
}

/**
 * Validate that governance state is not contradictory.
 * Returns null if valid, or an error message string if contradictory.
 */
export function preventContradictoryStates(data: {
  status?: string
  isActive?: boolean
  isVerified?: boolean
  isFeatured?: boolean
}): string | null {
  // REJECTED + Active is contradictory
  if (data.status === 'REJECTED' && data.isActive === true) {
    return 'Rejected partners cannot be active.'
  }
  // SUSPENDED + Active is contradictory
  if (data.status === 'SUSPENDED' && data.isActive === true) {
    return 'Suspended partners cannot be active.'
  }
  // PENDING + Verified is contradictory
  if (data.status === 'PENDING' && data.isVerified === true) {
    return 'Pending partners cannot be verified.'
  }
  // PENDING + Featured is contradictory
  if (data.status === 'PENDING' && data.isFeatured === true) {
    return 'Pending partners cannot be featured.'
  }
  return null
}
