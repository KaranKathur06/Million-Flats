import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { LeadCountry, LeadType } from '@prisma/client'
import { requireAdminSession } from '@/lib/adminAuth'
import { getLeadStats, getLeadSyncHealth, listLeads, sanitizeLeadFilters } from '@/lib/leads/queries'
import { isLeadCountInSync } from '@/lib/leads/syncHealth'
import { normalizeLeadType } from '@/lib/leads/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const leadTypeSchema = z
  .string()
  .optional()
  .transform((v) => normalizeLeadType(v) || '')

const QuerySchema = z.object({
  leadType: leadTypeSchema,
  category: z.string().optional(),
  ecosystemCategory: z.string().optional(),
  projectId: z.string().optional(),
  status: z.string().optional(),
  country: z
    .string()
    .optional()
    .transform((v) => (v === 'INDIA' || v === 'UAE' ? v : '')),
  range: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
  propertyType: z.string().optional(),
  budgetRange: z.string().optional(),
  assignedTo: z.string().optional(),
  take: z.coerce.number().optional(),
  skip: z.coerce.number().optional(),
  statsOnly: z.enum(['1', 'true']).optional(),
})

function parseFilters(data: z.infer<typeof QuerySchema>) {
  const leadType = (data.leadType || '') as LeadType | ''
  const category = data.category || data.ecosystemCategory || ''

  return sanitizeLeadFilters({
    leadType,
    category,
    projectId: data.projectId || '',
    status: data.status || '',
    country: (data.country || '') as LeadCountry | '',
    range: data.range || '',
    from: data.from || '',
    to: data.to || '',
    q: data.q || '',
    propertyType: data.propertyType || '',
    budgetRange: data.budgetRange || '',
    assignedTo: data.assignedTo || '',
    take: data.take,
    skip: data.skip,
  })
}

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const url = new URL(req.url)
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid query', issues: parsed.error.flatten() }, { status: 400 })
  }

  const filters = parseFilters(parsed.data)
  const stats = await getLeadStats(filters)
  const sync = await getLeadSyncHealth(filters)

  if (parsed.data.statsOnly === '1' || parsed.data.statsOnly === 'true') {
    return NextResponse.json({ success: true, stats, sync })
  }

  const { items, total } = await listLeads(filters)
  const dashboardCount = stats.total
  const tableCount = total
  const filteredInSync = isLeadCountInSync(dashboardCount, tableCount)

  return NextResponse.json(
    {
      success: true,
      stats,
      sync: {
        inSync: filteredInSync,
        dashboardCount,
        tableCount,
        difference: dashboardCount - tableCount,
        globalInSync: sync.inSync,
        globalDifference: sync.difference,
        filteredDifference: sync.filteredDifference ?? 0,
      },
      leads: items.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      })),
      total,
      filters,
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}
