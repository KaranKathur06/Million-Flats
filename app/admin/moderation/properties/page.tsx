import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

export default async function AdminModerationQueuePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fmoderation%2Fproperties')
  }

  if (role !== 'ADMIN') {
    redirect('/user/dashboard?error=admin_only')
  }

  const status = safeString(searchParams?.status) || 'PENDING_REVIEW'
  const agent = safeString(searchParams?.agent)
  const city = safeString(searchParams?.city)

  const minPrice = safeNumber(searchParams?.minPrice)
  const maxPrice = safeNumber(searchParams?.maxPrice)

  const where: any = {
    sourceType: 'MANUAL',
  }

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

  const items = await (prisma as any).manualProperty.findMany({
    where,
    orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
    take: 200,
    select: {
      id: true,
      title: true,
      city: true,
      community: true,
      price: true,
      currency: true,
      status: true,
      submittedAt: true,
      createdAt: true,
      agent: {
        select: {
          id: true,
          company: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  })

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-[1300px] px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-7">
          <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Admin Moderation</p>
          <h1 className="mt-2 text-3xl font-serif font-bold text-dark-blue">Manual Properties Queue</h1>
          <p className="mt-2 text-gray-600">Only manual listings are reviewed.</p>

          <form className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-3" method="get">
            <select
              name="status"
              defaultValue={status}
              className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="DRAFT">Draft</option>
            </select>

            <input
              name="agent"
              defaultValue={agent}
              placeholder="Agent name/email"
              className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm"
            />

            <input
              name="city"
              defaultValue={city}
              placeholder="City"
              className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm"
            />

            <input
              name="minPrice"
              defaultValue={Number.isFinite(minPrice) ? String(minPrice) : ''}
              placeholder="Min price"
              className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm"
            />

            <input
              name="maxPrice"
              defaultValue={Number.isFinite(maxPrice) ? String(maxPrice) : ''}
              placeholder="Max price"
              className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm"
            />

            <div className="md:col-span-5 flex flex-col sm:flex-row gap-3">
              <button className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-dark-blue text-white font-semibold">
                Apply filters
              </button>
              <Link
                href="/admin/moderation/properties"
                className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
              >
                Reset
              </Link>
            </div>
          </form>

          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b border-gray-200">
                  <th className="py-3 pr-4">Property Title</th>
                  <th className="py-3 pr-4">Agent Name</th>
                  <th className="py-3 pr-4">Source</th>
                  <th className="py-3 pr-4">Location</th>
                  <th className="py-3 pr-4">Price</th>
                  <th className="py-3 pr-4">Submitted At</th>
                  <th className="py-3 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any) => {
                  const title = safeString(it?.title) || 'Untitled'
                  const agentName = safeString(it?.agent?.user?.name) || safeString(it?.agent?.user?.email) || 'Agent'
                  const loc = [safeString(it?.community), safeString(it?.city)].filter(Boolean).join(', ')
                  const submittedAt = it?.submittedAt ? new Date(it.submittedAt).toLocaleString() : ''
                  const price = typeof it?.price === 'number' && it.price > 0 ? formatMoney(safeString(it?.currency), it.price) : '—'

                  return (
                    <tr key={String(it.id)} className="border-b border-gray-100">
                      <td className="py-4 pr-4">
                        <Link
                          href={`/admin/moderation/properties/${encodeURIComponent(String(it.id))}`}
                          className="font-semibold text-dark-blue hover:underline"
                        >
                          {title}
                        </Link>
                      </td>
                      <td className="py-4 pr-4">{agentName}</td>
                      <td className="py-4 pr-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                          Manual Listing
                        </span>
                      </td>
                      <td className="py-4 pr-4">{loc || '—'}</td>
                      <td className="py-4 pr-4">{price}</td>
                      <td className="py-4 pr-4">{submittedAt || '—'}</td>
                      <td className="py-4 pr-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-gray-700 border border-gray-200">
                          {safeString(it?.status) || '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}

                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-600">
                      No listings found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
