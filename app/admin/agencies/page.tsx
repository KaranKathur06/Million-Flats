import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildAssetUrl } from '@/lib/assetUrl'
import AgenciesListClient from './AgenciesListClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Agency Management | MillionFlats Admin' }

export default async function AdminAgenciesPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string; q?: string; country?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  const role = (session.user as any)?.role
  if (!['ADMIN', 'SUPERADMIN', 'MODERATOR', 'VERIFIER'].includes(role)) redirect('/admin')

  const status = searchParams?.status || ''
  const pageNum = Math.max(1, parseInt(searchParams?.page || '1'))
  const q = searchParams?.q || ''
  const country = searchParams?.country || ''
  const limit = 25

  const scopeWhere: any = {}
  if (country) {
    const values = country === 'UAE' ? ['UAE', 'AE'] : country === 'INDIA' ? ['INDIA', 'IN'] : [country]
    scopeWhere.OR = values.map((value) => ({ country: { equals: value, mode: 'insensitive' } }))
  }

  const where: any = { ...scopeWhere }
  if (status === 'ACTIVE') where.onboardingStatus = 'APPROVED'
  else if (status === 'INACTIVE') where.onboardingStatus = { not: 'APPROVED' }
  else if (status === 'DELETED') where.id = '__no_deleted_agency_profiles__'
  else if (status && status !== 'ALL' && status !== 'DELETED') where.onboardingStatus = status
  if (q) {
    where.AND = [{ OR: [
      { agencyName: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
    ] }]
  }

  let profiles: any[] = []
  let total = 0
  let statusCounts: any[] = []

  try {
    ;[profiles, total, statusCounts] = await Promise.all([
      (prisma as any).agencyProfile.findMany({
        where,
        include: {
          user: { select: { email: true, createdAt: true } },
          linkedAgency: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limit,
        take: limit,
      }),
      (prisma as any).agencyProfile.count({ where }),
      (prisma as any).agencyProfile.groupBy({
        by: ['onboardingStatus'],
        _count: { _all: true },
      }),
    ])
  } catch (error) {
    console.error('Failed to load admin agencies page:', error)
    throw error
  }

  const countMap: Record<string, number> = {}
  for (const s of statusCounts) countMap[s.onboardingStatus] = s._count._all

  const [scopeTotal, active, inactive] = await Promise.all([
    (prisma as any).agencyProfile.count({ where: scopeWhere }),
    (prisma as any).agencyProfile.count({ where: { ...scopeWhere, onboardingStatus: 'APPROVED' } }),
    (prisma as any).agencyProfile.count({ where: { ...scopeWhere, onboardingStatus: { not: 'APPROVED' } } }),
  ])

  const normalizedProfiles = profiles.map((profile) => ({
    ...profile,
    logo: buildAssetUrl(profile.logo),
    banner: buildAssetUrl(profile.banner),
  }))

  return (
    <AgenciesListClient
      profiles={normalizedProfiles}
      total={total}
      status={status}
      page={pageNum}
      q={q}
      country={country}
      statusCounts={countMap}
      metrics={{ total: scopeTotal, active, inactive, deleted: 0 }}
    />
  )
}
