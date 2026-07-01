import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  const role = (session.user as any)?.role
  if (role !== 'AGENCY' || !userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const profile = await (prisma as any).agencyProfile.findUnique({
    where: { userId },
  })

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  return NextResponse.json({ profile })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any)?.id
  const role = (session.user as any)?.role
  if (role !== 'AGENCY' || !userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  const allowed = [
    'agencyName', 'description', 'shortDescription', 'website',
    'yearEstablished', 'headquarters', 'country', 'city', 'address',
    'agencySize', 'totalAgents',
    'licenseNumber', 'reraNumber', 'vatNumber', 'gstNumber',
    'specializations', 'operatingAreas', 'countriesServed', 'languages',
    'phone', 'email', 'whatsapp',
    'instagramUrl', 'linkedinUrl', 'facebookUrl', 'youtubeUrl', 'twitterUrl',
    'logo', 'logoS3Key', 'banner', 'bannerS3Key',
  ]

  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  // Auto-generate slug from agency name if not set
  if (data.agencyName && typeof data.agencyName === 'string') {
    const existing = await (prisma as any).agencyProfile.findUnique({ where: { userId }, select: { slug: true } })
    if (!existing?.slug) {
      data.slug = (data.agencyName as string)
        .toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }
  }

  const profile = await (prisma as any).agencyProfile.update({
    where: { userId },
    data,
  })

  const score = computeProfileCompletion(profile)

  const updated = await (prisma as any).agencyProfile.update({
    where: { userId },
    data: {
      profileCompletion: score.total,
      completionIdentity: score.identity,
      completionLegal: score.legal,
      completionBusiness: score.business,
      completionMedia: score.media,
      completionSocial: score.social,
      onboardingStatus: resolveStatus(profile.onboardingStatus, score.total),
    },
  })

  return NextResponse.json({ profile: updated, score })
}

function computeProfileCompletion(p: any) {
  let identity = 0
  if (p.agencyName) identity += 8
  if (p.description) identity += 7
  if (p.shortDescription) identity += 5
  if (p.website) identity += 5

  let legal = 0
  if (p.licenseNumber) legal += 10
  if (p.reraNumber) legal += 8
  if (p.vatNumber || p.gstNumber) legal += 7

  let business = 0
  if (p.specializations?.length > 0) business += 8
  if (p.countriesServed?.length > 0) business += 7
  if (p.agencySize) business += 5
  if (p.yearEstablished) business += 5

  let media = 0
  if (p.logo) media += 8
  if (p.banner) media += 7

  let social = 0
  const socials = [p.instagramUrl, p.linkedinUrl, p.facebookUrl, p.youtubeUrl, p.whatsapp]
  social = Math.min(5, socials.filter(Boolean).length)

  const total = Math.min(100, identity + legal + business + media + social)
  return { total, identity, legal, business, media, social }
}

function resolveStatus(current: string, completion: number): string {
  if (['APPROVED', 'REJECTED', 'SUSPENDED'].includes(current)) return current
  if (completion >= 80 && ['EMAIL_VERIFIED', 'PROFILE_INCOMPLETE'].includes(current)) return 'PROFILE_COMPLETED'
  if (completion > 0 && completion < 80 && current === 'EMAIL_VERIFIED') return 'PROFILE_INCOMPLETE'
  return current
}
