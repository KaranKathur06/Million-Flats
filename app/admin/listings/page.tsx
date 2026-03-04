import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AdminListingsTableClient from './AdminListingsTableClient'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : NaN
}

function formatMoney(currency: string, amount: number) {
  const c = currency || 'AED'
  const v = Number.isFinite(amount) ? amount : 0
  return `${c} ${Math.round(v).toLocaleString()}`
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Flistings')
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const status = safeString(searchParams?.status) || ''
  const agent = safeString(searchParams?.agent)
  const city = safeString(searchParams?.city)

  const minPrice = safeNumber(searchParams?.minPrice)
  const maxPrice = safeNumber(searchParams?.maxPrice)

  const where: any = { sourceType: 'MANUAL' }
  if (status) where.status = status
  if (city) where.city = { contains: city, mode: 'insensitive' }

  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    where.price = {
      ...(Number.isFinite(minPrice) ? { gte: minPrice } : null),
      ...(Number.isFinite(maxPrice) ? { lte: maxPrice } : null),
    }
  }

  if (agent) {
    where.agent = {
      user: {
        OR: [
          { name: { contains: agent, mode: 'insensitive' } },
          { email: { contains: agent, mode: 'insensitive' } },
        ],
      },
    }
  }

  const rows = await (prisma as any).manualProperty.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    take: 500,
    select: {
      id: true,
      status: true,
      title: true,
      city: true,
      community: true,
      price: true,
      currency: true,
      createdAt: true,
      submittedAt: true,
      rejectionReason: true,
      archivedAt: true,
      agentId: true,
      agent: {
        select: {
          id: true,
          company: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  })

  const items = (rows as any[]).map((p) => {
    const title = safeString(p?.title) || 'Untitled'
    const agentName = safeString(p?.agent?.user?.name) || safeString(p?.agent?.user?.email) || 'Agent'
    const agentEmail = safeString(p?.agent?.user?.email)
    const location = [safeString(p?.community), safeString(p?.city)].filter(Boolean).join(', ') || '—'
    const createdAt = p?.createdAt ? new Date(p.createdAt).toLocaleString() : ''
    const submittedAt = p?.submittedAt ? new Date(p.submittedAt).toLocaleString() : ''
    const priceLabel = typeof p?.price === 'number' && p.price > 0 ? formatMoney(safeString(p?.currency), p.price) : '—'

    return {
      id: String(p.id),
      status: safeString(p.status),
      title,
      agentName,
      agentEmail,
      agentId: safeString(p.agentId),
      location,
      priceLabel,
      createdAt,
      submittedAt,
      rejectionReason: safeString(p.rejectionReason),
      archivedAt: p?.archivedAt ? new Date(p.archivedAt).toLocaleString() : '',
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
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Listings</h1>
        </div>
        <Link href="/admin" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-white/50 hover:text-white/80 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </Link>
      </div>

      {/* Filter form */}
      <form className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5" method="get">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Status</label>
            <select
              name="status"
              defaultValue={status}
              className="mf-select h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white/90 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] focus:border-amber-400/40"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_REVIEW">Pending</option>
              <option value="APPROVED">Published</option>
              <option value="REJECTED">Rejected</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Agent</label>
            <input
              name="agent"
              defaultValue={agent}
              placeholder="Name or email"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white/90 placeholder:text-white/25 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] focus:outline-none focus:border-amber-400/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">City</label>
            <input
              name="city"
              defaultValue={city}
              placeholder="City name"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white/90 placeholder:text-white/25 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] focus:outline-none focus:border-amber-400/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Min Price</label>
            <input
              name="minPrice"
              defaultValue={Number.isFinite(minPrice) ? String(minPrice) : ''}
              placeholder="0"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white/90 placeholder:text-white/25 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] focus:outline-none focus:border-amber-400/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Max Price</label>
            <input
              name="maxPrice"
              defaultValue={Number.isFinite(maxPrice) ? String(maxPrice) : ''}
              placeholder="∞"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white/90 placeholder:text-white/25 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] focus:outline-none focus:border-amber-400/40"
            />
          </div>

          <div className="flex items-end">
            <button className="h-10 w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[13px] text-[#0b1220] font-semibold shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400 transition-all duration-200">
              Apply
            </button>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <AdminListingsTableClient items={items} currentRole={role} />
      </div>
    </div>
  )
}
