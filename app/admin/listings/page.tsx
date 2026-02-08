import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Flistings')
  }

  if (role !== 'ADMIN') {
    redirect('/user/dashboard?error=admin_only')
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
    <div className="mx-auto max-w-[1500px]">
      <div className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-7">
        <p className="text-amber-300 font-semibold text-sm uppercase tracking-wider">Admin</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-serif font-bold">Listings</h1>
          <Link href="/admin" className="text-sm font-semibold text-white/80 hover:text-white">
            Back to dashboard
          </Link>
        </div>

        <form className="mt-6 grid grid-cols-1 md:grid-cols-6 gap-3" method="get">
            <select
              name="status"
              defaultValue={status}
              className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_REVIEW">Pending</option>
              <option value="APPROVED">Published</option>
              <option value="REJECTED">Rejected</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            <input
              name="agent"
              defaultValue={agent}
              placeholder="Agent name/email"
              className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white placeholder:text-white/40"
            />

            <input
              name="city"
              defaultValue={city}
              placeholder="City"
              className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white placeholder:text-white/40"
            />

            <input
              name="minPrice"
              defaultValue={Number.isFinite(minPrice) ? String(minPrice) : ''}
              placeholder="Min price"
              className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white placeholder:text-white/40"
            />

            <input
              name="maxPrice"
              defaultValue={Number.isFinite(maxPrice) ? String(maxPrice) : ''}
              placeholder="Max price"
              className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white placeholder:text-white/40"
            />

            <button className="h-11 rounded-xl bg-amber-400 text-[#0b1220] font-semibold hover:bg-amber-300">
              Apply
            </button>

        </form>

        <div className="mt-6">
          <AdminListingsTableClient items={items} />
        </div>
      </div>
    </div>
  )
}
