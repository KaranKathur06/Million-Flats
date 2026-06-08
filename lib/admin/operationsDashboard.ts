import { prisma } from '@/lib/prisma'

export type TrendPoint = { label: string; count: number }
export type PipelinePoint = { status: string; count: number }
export type RecentLeadRow = {
  id: string
  name: string
  email: string
  leadType: string
  status: string
  createdAt: Date
  propertyName: string | null
}
export type ActivityRow = {
  id: string
  action: string
  entityType: string
  entityId: string
  createdAt: Date
  performerName: string | null
}

export type OperationsDashboardData = {
  kpis: {
    listingsTotal: number
    listingsPending: number
    leadsTotal: number
    leadsWeek: number
    agentsTotal: number
    projectsPublished: number
    projectsDraft: number
    threeDTourWeek: number
    threeDTourOpen: number
  }
  leadTrend: TrendPoint[]
  countryTrend: TrendPoint[]
  threeDTourPipeline: PipelinePoint[]
  recentLeads: RecentLeadRow[]
  recentActivity: ActivityRow[]
  listingStats: { drafts: number; pending: number; approved: number; rejected: number; archived: number }
}

function last7DayLabels(): string[] {
  const labels: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    labels.push(d.toLocaleDateString('en-GB', { weekday: 'short' }))
  }
  return labels
}

function bucketLeadsByDay(
  rows: { createdAt: Date }[],
  labels: string[],
): TrendPoint[] {
  const keys = labels.map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
  const counts = new Map(keys.map((k) => [k, 0]))
  for (const row of rows) {
    const k = new Date(row.createdAt).toISOString().slice(0, 10)
    if (counts.has(k)) counts.set(k, (counts.get(k) || 0) + 1)
  }
  return labels.map((label, i) => ({ label, count: counts.get(keys[i]) || 0 }))
}

export async function getOperationsDashboardData(): Promise<OperationsDashboardData> {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)

  const trendStart = new Date(weekStart)

  const open3dStatuses = ['NEW_INQUIRY', 'QUALIFICATION', 'CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION']

  const [
    listingsTotal,
    drafts,
    pending,
    approved,
    rejected,
    archived,
    leadsTotal,
    leadsWeek,
    leadsForTrend,
    agentsTotal,
    projectsPublished,
    projectsDraft,
    threeDTourWeek,
    threeDTourOpen,
    countryGroups,
    threeDTourGroups,
    recentLeads,
    recentActivity,
  ] = await Promise.all([
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL' } }).catch(() => 0),
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL', status: 'DRAFT' } }).catch(() => 0),
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL', status: 'PENDING_REVIEW' } }).catch(() => 0),
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL', status: 'APPROVED' } }).catch(() => 0),
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL', status: 'REJECTED' } }).catch(() => 0),
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL', status: 'ARCHIVED' } }).catch(() => 0),
    prisma.lead.count().catch(() => 0),
    prisma.lead.count({ where: { createdAt: { gte: weekStart } } }).catch(() => 0),
    prisma.lead.findMany({ where: { createdAt: { gte: trendStart } }, select: { createdAt: true } }).catch(() => []),
    prisma.agent.count().catch(() => 0),
    (prisma as any).project.count({ where: { isDeleted: false, status: 'PUBLISHED' } }).catch(() => 0),
    (prisma as any).project.count({ where: { isDeleted: false, status: 'DRAFT' } }).catch(() => 0),
    prisma.lead.count({ where: { leadType: 'THREE_D_TOUR', createdAt: { gte: weekStart } } }).catch(() => 0),
    prisma.lead
      .count({ where: { leadType: 'THREE_D_TOUR', status: { in: open3dStatuses } } })
      .catch(() => 0),
    prisma.lead
      .groupBy({ by: ['country'], _count: { _all: true }, orderBy: { _count: { country: 'desc' } }, take: 5 })
      .catch(() => []),
    prisma.lead
      .groupBy({
        by: ['status'],
        where: { leadType: 'THREE_D_TOUR' },
        _count: { _all: true },
      })
      .catch(() => []),
    prisma.lead
      .findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          leadType: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
          propertyName: true,
        },
      })
      .catch(() => []),
    prisma.auditLog
      .findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          performedBy: { select: { name: true, email: true } },
        },
      })
      .catch(() => []),
  ])

  const dayLabels = last7DayLabels()

  return {
    kpis: {
      listingsTotal,
      listingsPending: pending,
      leadsTotal,
      leadsWeek,
      agentsTotal,
      projectsPublished,
      projectsDraft,
      threeDTourWeek,
      threeDTourOpen,
    },
    leadTrend: bucketLeadsByDay(leadsForTrend, dayLabels),
    countryTrend: countryGroups.map((g) => ({
      label: String(g.country).replace(/_/g, ' '),
      count: g._count._all,
    })),
    threeDTourPipeline: threeDTourGroups
      .map((g) => ({ status: g.status, count: g._count._all }))
      .sort((a, b) => b.count - a.count),
    recentLeads,
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: String(a.entityType),
      entityId: a.entityId,
      createdAt: a.createdAt,
      performerName: a.performedBy?.name || a.performedBy?.email || null,
    })),
    listingStats: { drafts, pending, approved, rejected, archived },
  }
}
