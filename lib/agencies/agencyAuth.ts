/**
 * agencyAuth.ts
 * JWT / session token helpers for the AGENCY role.
 * Mirrors lib/developers/developerAuth.ts
 */

export interface AgencyTokenPayload {
  agencyProfileId: string
  agencyOnboardingStatus: string
  agencyKycStatus: string
  agencyIsVerified: boolean
  agencyProfileCompletion: number
  agencyName: string | null
  agencySlug: string | null
}

/**
 * Shape the agency token fields for NextAuth JWT callback.
 * Call this inside the `jwt` callback when role === 'AGENCY'.
 */
export function buildAgencyTokenPayload(profile: {
  id: string
  onboardingStatus: string
  kycStatus: string
  isVerified: boolean
  profileCompletion: number
  agencyName?: string | null
  slug?: string | null
}): AgencyTokenPayload {
  return {
    agencyProfileId: profile.id,
    agencyOnboardingStatus: profile.onboardingStatus,
    agencyKycStatus: profile.kycStatus,
    agencyIsVerified: profile.isVerified,
    agencyProfileCompletion: profile.profileCompletion,
    agencyName: profile.agencyName ?? null,
    agencySlug: profile.slug ?? null,
  }
}

/**
 * Extract agency fields from a NextAuth token.
 */
export function extractAgencyFields(token: Record<string, unknown>): AgencyTokenPayload {
  return {
    agencyProfileId: String(token.agencyProfileId || ''),
    agencyOnboardingStatus: String(token.agencyOnboardingStatus || 'REGISTERED'),
    agencyKycStatus: String(token.agencyKycStatus || 'PENDING'),
    agencyIsVerified: Boolean(token.agencyIsVerified),
    agencyProfileCompletion: Number(token.agencyProfileCompletion || 0),
    agencyName: token.agencyName ? String(token.agencyName) : null,
    agencySlug: token.agencySlug ? String(token.agencySlug) : null,
  }
}
