import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DeveloperDashboardClient from './DeveloperDashboardClient'

export default async function DeveloperDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/developer/auth?tab=login')

  const userId = (session.user as any)?.id
  if (!userId) redirect('/developer/auth?tab=login')

  // Fetch developer profile + project stats + recent leads
  const [profile, projectStats, recentLeads] = await Promise.all([
    (prisma as any).developerProfile.findUnique({
      where: { userId },
      include: { linkedDeveloper: { select: { id: true, name: true, slug: true } } },
    }),
    (prisma as any).project.groupBy({
      by: ['status'],
      where: { ownedByProfileId: { not: null } },
      _count: { _all: true },
    }).catch(() => []),
    (prisma as any).lead.findMany({
      where: {
        developerProfileId: {
          equals: (prisma as any).developerProfile.findUnique({ where: { userId }, select: { id: true } })
        }
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }).catch(() => []),
  ])

  if (!profile) {
    redirect('/developer/onboarding')
  }

  // Fetch lead counts and projects for this developer profile
  const profileId = profile.id

  const [
    projects,
    totalLeads,
    newLeadsThisMonth,
  ] = await Promise.all([
    (prisma as any).project.findMany({
      where: { ownedByProfileId: profileId },
      select: {
        id: true, name: true, status: true, createdAt: true,
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }).catch(() => []),
    (prisma as any).lead.count({ where: { developerProfileId: profileId } }).catch(() => 0),
    (prisma as any).lead.count({
      where: {
        developerProfileId: profileId,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }).catch(() => 0),
  ])

  const projectStatusCounts: Record<string, number> = {}
  if (Array.isArray(projectStats)) {
    for (const g of projectStats) {
      projectStatusCounts[(g as any).status] = (g as any)._count._all
    }
  }

  const dashboardData = {
    profile: {
      id: profile.id,
      companyName: profile.companyName || 'Your Company',
      profileCompletion: profile.profileCompletion || 0,
      onboardingStatus: profile.onboardingStatus,
      kycStatus: profile.kycStatus,
      isVerified: profile.isVerified,
      isFeatured: profile.isFeatured,
      subscriptionPlan: profile.subscriptionPlan,
      aiDeveloperScore: profile.aiDeveloperScore,
      totalLeadsReceived: profile.totalLeadsReceived || totalLeads,
      totalProjectViews: profile.totalProjectViews || 0,
      totalProjectsPublished: profile.totalProjectsPublished || 0,
      linkedDeveloper: profile.linkedDeveloper,
    },
    stats: {
      totalProjects: Object.values(projectStatusCounts).reduce((a: number, b) => a + (b as number), 0),
      publishedProjects: projectStatusCounts['PUBLISHED'] || 0,
      draftProjects: projectStatusCounts['DRAFT'] || 0,
      underReviewProjects: projectStatusCounts['UNDER_REVIEW'] || 0,
      totalLeads,
      newLeadsThisMonth,
    },
    recentProjects: projects,
  }

  return <DeveloperDashboardClient data={dashboardData} />
}
