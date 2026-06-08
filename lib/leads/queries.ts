import type { LeadCountry, LeadType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseDateRange } from '@/lib/leads/constants'
import { ecosystemCategoryToSlug, normalizeEcosystemCategory, normalizeLeadType } from '@/lib/leads/types'

export type LeadListFilters = {
  leadType?: LeadType | ''
  /** Ecosystem enum code (HOME_LOANS, …) */
  category?: string
  /** Project id when filtering project leads */
  projectId?: string
  status?: string
  country?: LeadCountry | ''
  range?: string
  from?: string
  to?: string
  q?: string
  /** 3D Tour filters */
  propertyType?: string
  budgetRange?: string
  assignedTo?: string
  take?: number
  skip?: number
}

/** Strip cross-type filter params that cause zero-result queries. */
export function sanitizeLeadFilters(raw: LeadListFilters): LeadListFilters {
  const leadType = normalizeLeadType(raw.leadType) || (raw.leadType as LeadType | '')

  const out: LeadListFilters = {
    ...raw,
    leadType: leadType || '',
    status: raw.status || '',
    country: raw.country || '',
    range: raw.range || '',
    from: raw.from || '',
    to: raw.to || '',
    q: raw.q || '',
    propertyType: raw.propertyType || '',
    budgetRange: raw.budgetRange || '',
    assignedTo: raw.assignedTo || '',
  }

  if (out.leadType !== 'ECOSYSTEM') {
    out.category = ''
  } else if (out.category) {
    out.category = normalizeEcosystemCategory(out.category) || out.category
  }

  if (out.leadType !== 'PROJECT') {
    out.projectId = ''
  }

  if (out.leadType === 'CONTACT') {
    out.category = ''
    out.projectId = ''
    out.propertyType = ''
    out.budgetRange = ''
  }

  if (out.leadType !== 'THREE_D_TOUR') {
    out.propertyType = ''
    out.budgetRange = ''
  }

  return out
}

export function hasActiveLeadFilters(filters: LeadListFilters) {
  const f = sanitizeLeadFilters(filters)
  return Boolean(
    f.leadType ||
      f.category ||
      f.projectId ||
      f.status ||
      f.country ||
      f.range ||
      f.from ||
      f.to ||
      f.q ||
      f.propertyType ||
      f.budgetRange ||
      f.assignedTo,
  )
}

export function buildLeadWhere(filters: LeadListFilters): Prisma.LeadWhereInput {
  const f = sanitizeLeadFilters(filters)
  const where: Prisma.LeadWhereInput = {}

  if (f.leadType) {
    where.leadType = f.leadType
  }
  if (f.status) where.status = f.status
  if (f.country) where.country = f.country
  if (f.assignedTo) where.assignedTo = f.assignedTo

  if (f.leadType === 'THREE_D_TOUR') {
    if (f.propertyType) where.propertyType = f.propertyType
    if (f.budgetRange) where.budgetRange = f.budgetRange
    if (f.category) where.category = f.category
  }

  if (f.leadType === 'ECOSYSTEM' && f.category) {
    const code = normalizeEcosystemCategory(f.category) || f.category
    const slug = code ? ecosystemCategoryToSlug(code as import('@/lib/leads/types').LeadEcosystemCategory) : ''
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { category: code },
          ...(slug ? [{ category: slug }, { metadata: { path: ['categorySlug'], equals: slug } }] : []),
        ],
      },
    ]
  }

  if (f.leadType === 'PROJECT' && f.projectId) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [{ projectId: f.projectId }, { sourceId: f.projectId }],
      },
    ]
  }

  const createdAt = parseDateRange({ range: f.range, from: f.from, to: f.to })
  if (createdAt) where.createdAt = createdAt

  const q = String(f.q || '').trim()
  if (q) {
    const searchClause: Prisma.LeadWhereInput = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { sourceName: { contains: q, mode: 'insensitive' } },
        { projectOrCompany: { contains: q, mode: 'insensitive' } },
        { propertyName: { contains: q, mode: 'insensitive' } },
        { referralCode: { contains: q, mode: 'insensitive' } },
      ],
    }
    if (where.AND) {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : [where.AND]), searchClause]
    } else {
      where.AND = [searchClause]
    }
  }

  return where
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

export type LeadStats = {
  total: number
  today: number
  week: number
  month: number
  threeDTour: number
  project: number
  contact: number
  ecosystem: number
  /** 3D Tour pipeline KPIs (when filtering or globally) */
  threeDTourDemoScheduled: number
  threeDTourProposalSent: number
  threeDTourWon: number
  threeDTourLost: number
}

/** KPI cards — always from `leads` table only. Optional filters apply to all cards consistently. */
export async function getLeadStats(filters: LeadListFilters = {}): Promise<LeadStats> {
  const where = buildLeadWhere(filters)
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 6)
  const monthStart = new Date(todayStart)
  monthStart.setDate(monthStart.getDate() - 29)

  const base = where
  const threeDBase: Prisma.LeadWhereInput = { ...base, leadType: 'THREE_D_TOUR' }

  const [
    total,
    today,
    week,
    month,
    threeDTour,
    project,
    contact,
    ecosystem,
    threeDTourDemoScheduled,
    threeDTourProposalSent,
    threeDTourWon,
    threeDTourLost,
  ] = await Promise.all([
    prisma.lead.count({ where: base }),
    prisma.lead.count({ where: { ...base, createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.lead.count({ where: { ...base, createdAt: { gte: weekStart, lte: todayEnd } } }),
    prisma.lead.count({ where: { ...base, createdAt: { gte: monthStart, lte: todayEnd } } }),
    prisma.lead.count({ where: { ...base, leadType: 'THREE_D_TOUR' } }),
    prisma.lead.count({ where: { ...base, leadType: 'PROJECT' } }),
    prisma.lead.count({ where: { ...base, leadType: 'CONTACT' } }),
    prisma.lead.count({ where: { ...base, leadType: 'ECOSYSTEM' } }),
    prisma.lead.count({ where: { ...threeDBase, status: 'DEMO_SCHEDULED' } }),
    prisma.lead.count({ where: { ...threeDBase, status: 'PROPOSAL_SENT' } }),
    prisma.lead.count({ where: { ...threeDBase, status: 'WON' } }),
    prisma.lead.count({ where: { ...threeDBase, status: 'LOST' } }),
  ])

  return {
    total,
    today,
    week,
    month,
    threeDTour,
    project,
    contact,
    ecosystem,
    threeDTourDemoScheduled,
    threeDTourProposalSent,
    threeDTourWon,
    threeDTourLost,
  }
}

export async function listLeads(filters: LeadListFilters) {
  const where = buildLeadWhere(filters)
  const take = Math.min(Math.max(filters.take ?? 100, 1), 500)
  const skip = Math.max(filters.skip ?? 0, 0)

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      select: {
        id: true,
        leadType: true,
        category: true,
        sourceName: true,
        name: true,
        email: true,
        phone: true,
        projectOrCompany: true,
        country: true,
        status: true,
        assignedTo: true,
        projectId: true,
        propertyType: true,
        propertyName: true,
        propertySize: true,
        budgetRange: true,
        timeline: true,
        referralCode: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.lead.count({ where }),
  ])

  return { items, total, where }
}

export type LeadSyncHealth = {
  totalLeads: number
  threeDTourLeads: number
  projectLeads: number
  contactLeads: number
  ecosystemLeads: number
  tableCountUnfiltered: number
  dashboardTotal: number
  difference: number
  inSync: boolean
  lastLeadCreated: string | null
  lastLeadUpdated: string | null
  filteredTableCount?: number
  filteredDashboardTotal?: number
  filteredDifference?: number
}

export async function getLeadSyncHealth(activeFilters: LeadListFilters = {}): Promise<LeadSyncHealth> {
  const stats = await getLeadStats()
  const { total: tableCountUnfiltered } = await listLeads({})

  const last = await prisma.lead.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { createdAt: true, updatedAt: true },
  })

  const difference = stats.total - tableCountUnfiltered
  const inSync = difference === 0

  if (!inSync) {
    console.error('Lead Synchronization Error', {
      dashboardTotal: stats.total,
      tableCount: tableCountUnfiltered,
      difference,
    })
  }

  const sanitized = sanitizeLeadFilters(activeFilters)
  let filteredTableCount: number | undefined
  let filteredDashboardTotal: number | undefined
  let filteredDifference: number | undefined

  if (hasActiveLeadFilters(sanitized)) {
    const filteredStats = await getLeadStats(sanitized)
    const { total: filteredTable } = await listLeads(sanitized)
    filteredTableCount = filteredTable
    filteredDashboardTotal = filteredStats.total
    filteredDifference = filteredStats.total - filteredTable
    if (filteredDifference !== 0) {
      console.error('Lead Synchronization Error (filtered)', {
        filters: sanitized,
        filteredDashboardTotal: filteredStats.total,
        filteredTableCount: filteredTable,
        filteredDifference,
      })
    }
  }

  return {
    totalLeads: stats.total,
    threeDTourLeads: stats.threeDTour,
    projectLeads: stats.project,
    contactLeads: stats.contact,
    ecosystemLeads: stats.ecosystem,
    tableCountUnfiltered,
    dashboardTotal: stats.total,
    difference,
    inSync,
    lastLeadCreated: last?.createdAt?.toISOString() ?? null,
    lastLeadUpdated: last?.updatedAt?.toISOString() ?? null,
    filteredTableCount,
    filteredDashboardTotal,
    filteredDifference,
  }
}
