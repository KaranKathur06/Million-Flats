import type { LeadCountry, LeadType } from '@prisma/client'

export type LeadsApiFilters = {
  leadType?: LeadType | ''
  category?: string
  projectId?: string
  status?: string
  country?: LeadCountry | ''
  range?: string
  from?: string
  to?: string
  q?: string
  propertyType?: string
  budgetRange?: string
  assignedTo?: string
}

export function filtersToSearchParams(filters: LeadsApiFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (filters.leadType) p.set('leadType', filters.leadType)
  if (filters.status) p.set('status', filters.status)
  if (filters.country) p.set('country', filters.country)
  if (filters.range) p.set('range', filters.range)
  if (filters.range === 'custom') {
    if (filters.from) p.set('from', filters.from)
    if (filters.to) p.set('to', filters.to)
  }
  if (filters.q) p.set('q', filters.q)
  if (filters.assignedTo) p.set('assignedTo', filters.assignedTo)
  if (filters.leadType === 'ECOSYSTEM' && filters.category) p.set('category', filters.category)
  if (filters.leadType === 'PROJECT' && filters.projectId) p.set('projectId', filters.projectId)
  if (filters.leadType === 'THREE_D_TOUR') {
    if (filters.propertyType) p.set('propertyType', filters.propertyType)
    if (filters.budgetRange) p.set('budgetRange', filters.budgetRange)
    if (filters.category) p.set('category', filters.category)
  }
  return p
}

export async function fetchAdminLeads(searchParams: URLSearchParams) {
  const qs = searchParams.toString()
  const url = `/api/admin/leads${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok || !json?.success) {
    throw new Error(typeof json?.message === 'string' ? json.message : `Request failed (${res.status})`)
  }
  return json
}
