import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/developer/profile
 * Returns the authenticated developer's profile.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  const role = (session.user as any)?.role
  if (role !== 'DEVELOPER' || !userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const profile = await (prisma as any).developerProfile.findUnique({
    where: { userId },
    include: {
      linkedDeveloper: { select: { id: true, name: true, slug: true, logo: true } },
      documents: true,
    },
  })

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  return NextResponse.json({ profile })
}

/**
 * PATCH /api/developer/profile
 * Updates the developer profile fields and recomputes profile completion score.
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  const role = (session.user as any)?.role
  if (role !== 'DEVELOPER' || !userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // Sanitize allowed fields (prevent over-posting)
  const allowed = [
    'companyName', 'description', 'shortDescription', 'website',
    'foundedYear', 'headquarters', 'countriesServed', 'totalEmployees', 'yearsExperience',
    'reraNumber', 'gstNumber', 'panNumber',
    'projectTypesFocus', 'citiesServed',
    'instagramUrl', 'linkedinUrl', 'facebookUrl', 'youtubeUrl', 'twitterUrl',
    'whatsapp', 'telegram', 'phone', 'phoneCountryCode',
    'logo', 'logoS3Key', 'banner', 'bannerS3Key',
  ]

  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  // Auto-generate slug from company name if not already set
  if (data.companyName && typeof data.companyName === 'string') {
    const existing = await (prisma as any).developerProfile.findUnique({ where: { userId }, select: { slug: true } })
    if (!existing?.slug) {
      data.slug = (data.companyName as string)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }
  }

  // Update the profile
  const profile = await (prisma as any).developerProfile.update({
    where: { userId },
    data,
  })

  // Recompute completion score
  const score = computeProfileCompletion(profile)
  const updated = await (prisma as any).developerProfile.update({
    where: { userId },
    data: {
      profileCompletion: score.total,
      completionCompany: score.company,
      completionVerification: score.verification,
      completionBusiness: score.business,
      completionMedia: score.media,
      completionSocial: score.social,
      // Update onboarding status based on completion
      onboardingStatus: resolveOnboardingStatus(profile.onboardingStatus, score.total),
    },
  })

  return NextResponse.json({ profile: updated, score })
}

/** Compute profile completion score out of 100 */
function computeProfileCompletion(p: any) {
  // Company basics (20 pts)
  let company = 0
  if (p.companyName) company += 5
  if (p.description) company += 5
  if (p.website) company += 3
  if (p.foundedYear) company += 3
  if (p.headquarters) company += 2
  if (p.countriesServed?.length > 0) company += 2

  // Legal verification (25 pts)
  let verification = 0
  if (p.reraNumber) verification += 10
  if (p.gstNumber) verification += 8
  if (p.panNumber) verification += 7

  // Business info (20 pts)
  let business = 0
  if (p.projectTypesFocus?.length > 0) business += 10
  if (p.citiesServed?.length > 0) business += 6
  if (p.yearsExperience) business += 4

  // Media (20 pts)
  let media = 0
  if (p.logo) media += 10
  if (p.banner) media += 10

  // Social (5 pts)
  let social = 0
  const socials = [p.instagramUrl, p.linkedinUrl, p.facebookUrl, p.youtubeUrl, p.twitterUrl, p.whatsapp, p.telegram]
  const filledSocials = socials.filter(Boolean).length
  social = Math.min(5, filledSocials * 1)

  const total = Math.min(100, company + verification + business + media + social)

  return { total, company, verification, business, media, social }
}

/** Resolve onboarding status transitions based on completion */
function resolveOnboardingStatus(current: string, completion: number): string {
  // Only progress forward, never regress
  const order = [
    'REGISTERED', 'EMAIL_VERIFIED', 'PROFILE_INCOMPLETE',
    'PROFILE_COMPLETED', 'DOCUMENTS_UPLOADED', 'UNDER_REVIEW',
    'APPROVED', 'REJECTED', 'SUSPENDED',
  ]

  // Terminal states — don't change
  if (current === 'APPROVED' || current === 'REJECTED' || current === 'SUSPENDED') return current

  if (completion >= 100 && (current === 'PROFILE_INCOMPLETE' || current === 'EMAIL_VERIFIED')) {
    return 'PROFILE_COMPLETED'
  }
  if (completion > 0 && completion < 100 && current === 'EMAIL_VERIFIED') {
    return 'PROFILE_INCOMPLETE'
  }

  return current
}
