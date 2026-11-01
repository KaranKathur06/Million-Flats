import { redirect } from 'next/navigation'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { prisma } from '@/lib/prisma'
import EcosystemPartnerDashboard from './_components/EcosystemPartnerDashboard'

export const dynamic = 'force-dynamic'

export default async function EcosystemPartnerDashboardPage({
  searchParams,
}: {
  searchParams?: { partnerId?: string }
}) {
  const user = await getAuthenticatedEcosystemUser()
  if (!user) redirect(`/auth/login?callbackUrl=${encodeURIComponent('/dashboard/ecosystem-partner')}`)

  const memberships = await (prisma as any).ecosystemPartnerMembership.findMany({
    where: {
      userId: user.id,
      status: 'ACTIVE',
      partner: { status: 'APPROVED', isActive: true },
    },
    select: {
      id: true,
      partnerId: true,
      role: true,
      partner: { select: { name: true, category: { select: { title: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <EcosystemPartnerDashboard
      memberships={memberships}
      initialPartnerId={searchParams?.partnerId || memberships[0]?.partnerId || ''}
    />
  )
}
