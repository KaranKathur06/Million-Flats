import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import { getUserHealthScore, getLifecycleStage, getCRMStage, getRecommendationConfidence } from '@/lib/userIntelligence'
import AdminUsersTableClient from './AdminUsersTableClient'
import RoleSelect from '@/components/admin/RoleSelect'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fusers')
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const roleFilter = safeString(searchParams?.role) || ''
  const qFilter = safeString(searchParams?.q) || ''
  const pageNum = Number(Array.isArray(searchParams?.page) ? searchParams?.page[0] : (searchParams?.page || '1')) || 1
  const limit = Math.min(Number(Array.isArray(searchParams?.limit) ? searchParams?.limit[0] : (searchParams?.limit || '50')) || 50, 500)
  const skip = (pageNum - 1) * limit

  const where: any = {}
  if (roleFilter) where.role = roleFilter.toUpperCase()
  if (qFilter) {
    where.OR = [
      { email: { contains: qFilter, mode: 'insensitive' } },
      { name: { contains: qFilter, mode: 'insensitive' } },
      { phone: { contains: qFilter, mode: 'insensitive' } },
      { id: { contains: qFilter, mode: 'insensitive' } },
    ]
  }

  const rows = await (prisma as any).user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      emailVerified: true,
      profileCompletion: true,
      phone: true,
      image: true,
      lastLogin: true,
      createdAt: true,
      country: { select: { name: true, iso2: true } },
      buyer: { select: { propertyType: true, budgetRange: true } },
      _count: { select: { savedProperties: true, propertyLeads: true } },
    },
  })

  const total = await (prisma as any).user.count({ where })

  const items = (rows as any[]).map((u) => {
    const identityStatus = u.emailVerified ? 'Verified' : 'Unverified'

    const buyerType = u.buyer?.propertyType || (u.role === 'AGENT' ? 'Agent' : u.role === 'DEVELOPER' ? 'Developer' : u.role === 'BUYER' ? 'Buyer' : '')
    const healthScore = getUserHealthScore({
      emailVerified: Boolean(u.emailVerified),
      profileCompletion: Number(u.profileCompletion || 0),
      status: safeString(u.status),
      savedPropertiesCount: Number(u._count.savedProperties || 0),
      propertyLeadsCount: Number(u._count.propertyLeads || 0),
    })

    return {
      id: String(u.id),
      email: safeString(u.email),
      name: safeString(u.name),
      role: safeString(u.role),
      status: safeString(u.status),
      emailVerified: Boolean(u.emailVerified),
      profileCompletion: Number(u.profileCompletion || 0),
      phone: safeString(u.phone),
      image: safeString(u.image),
      lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '',
      createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString() : '',
      country: u.country?.name || String(u.country?.iso2 || '').toUpperCase(),
      identityStatus,
      buyerType,
      healthScore,
      lifecycleStage: getLifecycleStage({
        emailVerified: Boolean(u.emailVerified),
        profileCompletion: Number(u.profileCompletion || 0),
        status: safeString(u.status),
        savedPropertiesCount: Number(u._count.savedProperties || 0),
        propertyLeadsCount: Number(u._count.propertyLeads || 0),
      }),
      crmStage: getCRMStage({
        emailVerified: Boolean(u.emailVerified),
        profileCompletion: Number(u.profileCompletion || 0),
        status: safeString(u.status),
        savedPropertiesCount: Number(u._count.savedProperties || 0),
        propertyLeadsCount: Number(u._count.propertyLeads || 0),
      }),
      recommendationConfidence: getRecommendationConfidence({
        emailVerified: Boolean(u.emailVerified),
        profileCompletion: Number(u.profileCompletion || 0),
        status: safeString(u.status),
        savedPropertiesCount: Number(u._count.savedProperties || 0),
        propertyLeadsCount: Number(u._count.propertyLeads || 0),
      }),
      primaryIdentifier: safeString(u.email) || safeString(u.phone) || 'Unknown',
    }
  })

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Admin
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Users</h1>
        </div>
        <Link href="/admin" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-white/50 hover:text-white/80 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </Link>
      </div>

      {/* Filter form */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[260px]">
            <form method="get" className="flex items-center gap-3">
              <input
                name="q"
                defaultValue={qFilter}
                placeholder="Search users by name, email, phone or ID"
                className="w-full h-10 px-4 rounded-xl border border-white/[0.06] bg-transparent text-white/90 placeholder:text-white/40"
              />
              {roleFilter ? <input type="hidden" name="role" value={roleFilter} /> : null}
              <button type="submit" className="h-10 px-4 rounded-xl bg-white/5 text-sm font-semibold">Search</button>
            </form>
          </div>

          <div className="space-y-1.5">
            <RoleSelect />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 overflow-x-auto">
        <AdminUsersTableClient items={items} currentRole={role} />
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-white/60">Showing {(skip + 1).toLocaleString()} - {Math.min(skip + limit, total).toLocaleString()} of {total.toLocaleString()}</div>
        <div className="flex items-center gap-2">
          {pageNum > 1 ? (
            <Link href={`${'/admin/users'}?${new URLSearchParams({ ...(qFilter ? { q: qFilter } : {}), ...(roleFilter ? { role: roleFilter } : {}), page: String(pageNum - 1), limit: String(limit) }).toString()}`} className="px-3 py-1 rounded-xl bg-white/5">Previous</Link>
          ) : (
            <span className="px-3 py-1 rounded-xl bg-white/5 text-white/30">Previous</span>
          )}

          <div className="px-3 py-1 text-sm text-white/80">Page {pageNum} / {Math.max(1, Math.ceil(total / limit))}</div>

          {skip + limit < total ? (
            <Link href={`${'/admin/users'}?${new URLSearchParams({ ...(qFilter ? { q: qFilter } : {}), ...(roleFilter ? { role: roleFilter } : {}), page: String(pageNum + 1), limit: String(limit) }).toString()}`} className="px-3 py-1 rounded-xl bg-white/5">Next</Link>
          ) : (
            <span className="px-3 py-1 rounded-xl bg-white/5 text-white/30">Next</span>
          )}
        </div>
      </div>
    </div>
  )
}
