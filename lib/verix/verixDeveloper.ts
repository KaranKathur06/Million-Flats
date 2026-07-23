/**
 * lib/AI/AIDeveloper.ts
 *
 * AIDeveloper™ Score Engine
 *
 * Computes a trust & quality score (0–100) for a developer profile.
 * The score is stored on DeveloperProfile.aiDeveloperScore and displayed
 * as a badge on both the developer portal and the public developer page.
 *
 * Score dimensions:
 *  - Profile Quality     (25 pts)  — completeness, description quality, media
 *  - Legal Verification  (30 pts)  — RERA, GST, PAN, KYC status
 *  - Track Record        (20 pts)  — published projects, total units, years active
 *  - Market Activity     (15 pts)  — leads received, project views, recent activity
 *  - Trust Signals       (10 pts)  — admin verified, featured, social links
 */

import { prisma } from '@/lib/prisma'

export interface AIDeveloperBreakdown {
  total: number
  profileQuality: number
  legalVerification: number
  trackRecord: number
  marketActivity: number
  trustSignals: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  label: string
}

/**
 * Compute and persist the AIDeveloper™ score for a given developerProfileId.
 * Returns the breakdown and persists total to DB.
 */
export async function computeAndSaveAiDeveloperScore(
  developerProfileId: string,
  persist = true
): Promise<AIDeveloperBreakdown> {
  const profile = await (prisma as any).developerProfile.findUnique({
    where: { id: developerProfileId },
    include: {
      documents: true,
      _count: {
        select: {
          leads: true,
        },
      },
    },
  })

  if (!profile) throw new Error(`DeveloperProfile ${developerProfileId} not found`)

  // ── 1. Profile Quality (25 pts) ─────────────────────────────────────────────
  let profileQuality = 0
  if (profile.companyName) profileQuality += 3
  if (profile.description && profile.description.length >= 100) profileQuality += 5
  else if (profile.description) profileQuality += 2
  if (profile.shortDescription) profileQuality += 2
  if (profile.website) profileQuality += 2
  if (profile.headquarters) profileQuality += 2
  if (profile.foundedYear) profileQuality += 2
  if (profile.logo) profileQuality += 5
  if (profile.banner) profileQuality += 4
  // Social links
  const socialLinks = [
    profile.instagramUrl, profile.linkedinUrl, profile.facebookUrl,
    profile.youtubeUrl, profile.twitterUrl, profile.whatsapp, profile.telegram,
  ].filter(Boolean).length
  profileQuality += Math.min(4, socialLinks)
  profileQuality = Math.min(25, profileQuality)

  // ── 2. Legal Verification (30 pts) ──────────────────────────────────────────
  let legalVerification = 0
  if (profile.reraNumber) legalVerification += 12
  if (profile.gstNumber) legalVerification += 8
  if (profile.panNumber) legalVerification += 5
  if (profile.kycStatus === 'VERIFIED') legalVerification += 5
  // Bonus: all required docs verified
  const verifiedDocs = (profile.documents || []).filter((d: any) => d.verificationStatus === 'VERIFIED').length
  legalVerification += Math.min(5, verifiedDocs * 2) // up to 5 bonus pts
  legalVerification = Math.min(30, legalVerification)

  // ── 3. Track Record (20 pts) ─────────────────────────────────────────────────
  let trackRecord = 0
  const publishedProjects = await (prisma as any).project.count({
    where: { ownedByProfileId: developerProfileId, status: 'PUBLISHED' },
  })
  const totalProjectsEver = await (prisma as any).project.count({
    where: { ownedByProfileId: developerProfileId },
  })

  trackRecord += Math.min(10, publishedProjects * 2)       // up to 10 pts (5 projects)
  trackRecord += Math.min(5, totalProjectsEver)            // up to 5 pts
  if (profile.yearsExperience >= 10) trackRecord += 5
  else if (profile.yearsExperience >= 5) trackRecord += 3
  else if (profile.yearsExperience >= 2) trackRecord += 1
  trackRecord = Math.min(20, trackRecord)

  // ── 4. Market Activity (15 pts) ─────────────────────────────────────────────
  let marketActivity = 0
  const leadCount = profile._count?.leads || 0
  const viewCount = profile.totalProjectViews || 0

  marketActivity += Math.min(5, Math.floor(leadCount / 10))    // 1pt per 10 leads, max 5
  marketActivity += Math.min(5, Math.floor(viewCount / 100))   // 1pt per 100 views, max 5
  // Recent activity — has a project created in last 90 days
  const recentProject = await (prisma as any).project.findFirst({
    where: {
      ownedByProfileId: developerProfileId,
      createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
  })
  if (recentProject) marketActivity += 5
  marketActivity = Math.min(15, marketActivity)

  // ── 5. Trust Signals (10 pts) ────────────────────────────────────────────────
  let trustSignals = 0
  if (profile.isVerified) trustSignals += 5
  if (profile.isFeatured) trustSignals += 3
  if (profile.linkedDeveloperId) trustSignals += 2  // has a linked public page
  trustSignals = Math.min(10, trustSignals)

  // ── Final score ──────────────────────────────────────────────────────────────
  const total = Math.round(profileQuality + legalVerification + trackRecord + marketActivity + trustSignals)

  const grade =
    total >= 90 ? 'S' :
      total >= 75 ? 'A' :
        total >= 60 ? 'B' :
          total >= 45 ? 'C' :
            total >= 30 ? 'D' : 'F'

  const label =
    grade === 'S' ? 'Platinum Developer' :
      grade === 'A' ? 'Gold Developer' :
        grade === 'B' ? 'Silver Developer' :
          grade === 'C' ? 'Verified Developer' :
            grade === 'D' ? 'Registered Developer' :
              'Unrated'

  if (persist) {
    await (prisma as any).developerProfile.update({
      where: { id: developerProfileId },
      data: { aiDeveloperScore: total },
    })
  }

  return {
    total,
    profileQuality,
    legalVerification,
    trackRecord,
    marketActivity,
    trustSignals,
    grade,
    label,
  }
}

/**
 * Batch-refresh AI scores for all approved developer profiles.
 * Intended for a nightly cron job.
 */
export async function batchRefreshAiScores(): Promise<{
  processed: number
  errors: number
}> {
  const profiles = await (prisma as any).developerProfile.findMany({
    where: { onboardingStatus: 'APPROVED' },
    select: { id: true },
  })

  let processed = 0
  let errors = 0

  for (const p of profiles) {
    try {
      await computeAndSaveAiDeveloperScore(p.id, true)
      processed++
    } catch {
      errors++
    }
  }

  return { processed, errors }
}
