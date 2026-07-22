import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AgenciesListClient from './AgenciesListClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Agency Management | MillionFlats Admin' }

export default async function AdminAgenciesPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string; q?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  const role = (session.user as any)?.role
  if (!['ADMIN', 'SUPERADMIN', 'MODERATOR', 'VERIFIER'].includes(role)) redirect('/admin')

  const status = searchParams?.status || ''
  const pageNum = Math.max(1, parseInt(searchParams?.page || '1'))
  const q = searchParams?.q || ''
  const limit = 25

  const where: any = {}
  if (status) where.onboardingStatus = status
  if (q) where.agencyName = { contains: q, mode: 'insensitive' }

  const [profiles, total, statusCounts] = await Promise.all([
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

  const countMap: Record<string, number> = {}
  for (const s of statusCounts) countMap[s.onboardingStatus] = s._count._all

  return (
    <AgenciesListClient
      profiles={profiles}
      total={total}
      status={status}
      page={pageNum}
      q={q}
      statusCounts={countMap}
    />
  )
}
