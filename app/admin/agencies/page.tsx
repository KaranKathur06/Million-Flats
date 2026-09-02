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

  let importedAgencyRows: any[] = []
  try {
    importedAgencyRows = await (prisma as any).agency.findMany({
      where: {
        ...(country ? {
          countryCode: country === 'UAE' ? 'UAE' : country === 'INDIA' ? 'INDIA' : undefined,
        } : {}),
      },
      select: {
        id: true,
        name: true,
        countryCode: true,
        countryIso2: true,
        isFeatured: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limit,
      take: limit,
    })
  } catch {
    importedAgencyRows = []
  }

  const importedProfiles = importedAgencyRows.map((agency) => ({
    id: agency.id,
    agencyName: agency.name,
    slug: null,
    logo: null,
    banner: null,
    country: agency.countryCode || agency.countryIso2 || null,
    city: null,
    email: null,
    user: null,
    onboardingStatus: 'APPROVED',
    kycStatus: 'VERIFIED',
    profileCompletion: 100,
    linkedAgency: null,
    createdAt: agency.createdAt,
    _source: 'agency-table',
  }))

  const mergedProfiles = [...profiles, ...importedProfiles].reduce((acc: any[], profile) => {
    const key = `${(profile.agencyName || 'agency').trim().toLowerCase()}|${String(profile.country || 'unknown').trim().toLowerCase()}`
    const existingIndex = acc.findIndex((entry) => {
      const entryKey = `${(entry.agencyName || 'agency').trim().toLowerCase()}|${String(entry.country || 'unknown').trim().toLowerCase()}`
      return entryKey === key
    })

    if (existingIndex === -1) {
      acc.push(profile)
      return acc
    }

    const existing = acc[existingIndex]
    const shouldReplace =
      (!existing.slug && profile.slug) ||
      (!existing.shortDescription && profile.shortDescription) ||
      (!existing.logo && profile.logo) ||
      (!existing.country && profile.country) ||
      (!existing.city && profile.city) ||
      (existing.onboardingStatus !== 'APPROVED' && profile.onboardingStatus === 'APPROVED')

    if (shouldReplace) acc[existingIndex] = profile
    return acc
  }, [])

  const mergedTotal = mergedProfiles.length

  const countMap: Record<string, number> = {}
  for (const s of statusCounts) countMap[s.onboardingStatus] = s._count._all

  const [scopeTotal, active, inactive] = await Promise.all([
    (prisma as any).agencyProfile.count({ where: scopeWhere }),
    (prisma as any).agencyProfile.count({ where: { ...scopeWhere, onboardingStatus: 'APPROVED' } }),
    (prisma as any).agencyProfile.count({ where: { ...scopeWhere, onboardingStatus: { not: 'APPROVED' } } }),
  ])

  const importedScopeCount = await (prisma as any).agency.count({ where: scopeWhere }).catch(() => 0)
  const importedActiveCount = await (prisma as any).agency.count({ where: { ...scopeWhere, isFeatured: true } }).catch(() => 0)

  const normalizedProfiles = mergedProfiles.map((profile) => ({
    ...profile,
    logo: buildAssetUrl(profile.logo),
    banner: buildAssetUrl(profile.banner),
  }))

  return (
    <AgenciesListClient
      profiles={normalizedProfiles}
      total={mergedTotal}
      status={status}
      page={pageNum}
      q={q}
      country={country}
      statusCounts={countMap}
      metrics={{
        total: scopeTotal + importedScopeCount,
        active: active + importedActiveCount,
        inactive: inactive + Math.max(0, importedScopeCount - importedActiveCount),
        deleted: 0,
      }}
    />
  )
}
