/**
 * lib/developers/developerAuth.ts
 *
 * Developer-specific auth helpers — mirrors agentAuth.ts pattern.
 * Handles DeveloperProfile creation on first login, status resolution,
 * and the jwt/session token enrichment.
 */
import { prisma } from '@/lib/prisma'

export type DeveloperTokenPayload = {
  developerProfileId: string | null
  developerOnboardingStatus: string
  developerKycStatus: string
  isVerified: boolean
  profileCompletion: number
}

/**
 * Fetch the DeveloperProfile for a given userId and return the
 * token payload fields needed by lib/auth.ts jwt() callback.
 */
export async function getDeveloperTokenPayload(
  userId: string
): Promise<DeveloperTokenPayload> {
  const profile = await prisma.developerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      onboardingStatus: true,
      kycStatus: true,
      isVerified: true,
      profileCompletion: true,
    },
  })

  if (!profile) {
    return {
      developerProfileId: null,
      developerOnboardingStatus: 'REGISTERED',
      developerKycStatus: 'PENDING',
      isVerified: false,
      profileCompletion: 0,
    }
  }

  return {
    developerProfileId: profile.id,
    developerOnboardingStatus: profile.onboardingStatus,
    developerKycStatus: profile.kycStatus,
    isVerified: profile.isVerified,
    profileCompletion: profile.profileCompletion,
  }
}

/**
 * Ensure a DeveloperProfile record exists for this user.
 * Called on first login — safe to call multiple times (upsert).
 */
export async function ensureDeveloperProfile(
  userId: string,
  companyName?: string
): Promise<string> {
  const existing = await prisma.developerProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (existing) return existing.id

  const created = await prisma.developerProfile.create({
    data: {
      userId,
      companyName: companyName || null,
      onboardingStatus: 'REGISTERED',
      kycStatus: 'PENDING',
    },
    select: { id: true },
  })

  return created.id
}

/**
 * Normalize DeveloperOnboardingStatus — returns '' if unknown.
 */
export function normalizeDeveloperOnboardingStatus(input: unknown): string {
  const s = typeof input === 'string' ? input.trim().toUpperCase() : ''
  const valid = [
    'REGISTERED', 'EMAIL_VERIFIED', 'PROFILE_INCOMPLETE',
    'PROFILE_COMPLETED', 'DOCUMENTS_UPLOADED', 'UNDER_REVIEW',
    'APPROVED', 'REJECTED', 'SUSPENDED',
  ]
  return valid.includes(s) ? s : 'REGISTERED'
}
