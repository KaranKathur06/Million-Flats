import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AdminEcosystemPartnersTableClient from './AdminEcosystemPartnersTableClient'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function AdminEcosystemPartnersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fecosystem-partners')
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const stage = safeString(searchParams?.stage)
  const category = safeString(searchParams?.category)

  const where: any = {}
  if (stage) where.stage = stage
  if (category) where.category = category

  const rows = await (prisma as any).ecosystemPartnerApplication.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true,
      category: true,
      stage: true,
      logoUrl: true,
      certificateUrl: true,
      companyDetails: true,
      contactInfo: true,
      createdAt: true,
      updatedAt: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
    },
  })

  const items = (rows as any[]).map((r) => ({
    id: safeString(r.id),
    category: safeString(r.category),
    stage: safeString(r.stage),
    logoUrl: safeString(r.logoUrl),
    certificateUrl: safeString(r.certificateUrl),
    companyDetails: r.companyDetails,
    contactInfo: r.contactInfo,
    createdAt: r.createdAt ? new Date(r.createdAt).toLocaleString() : '',
    updatedAt: r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '',
    utm: {
      source: safeString(r.utmSource),
      medium: safeString(r.utmMedium),
      campaign: safeString(r.utmCampaign),
    },
  }))

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
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Ecosystem Partner Applications</h1>
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
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Stage</label>
            <select
              name="stage"
              defaultValue={stage}
              className="mf-select h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 pr-8 text-[13px] text-white/90 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] focus:border-amber-400/40"
            >
              <option value="">All stages</option>
              <option value="APPLIED">APPLIED</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="APPROVED">APPROVED</option>
              <option value="ONBOARDED">ONBOARDED</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Category</label>
            <input
              name="category"
              defaultValue={category}
              placeholder="Category slug"
              className="h-10 w-full md:w-[220px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white/90 placeholder:text-white/25 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] focus:outline-none focus:border-amber-400/40"
            />
          </div>

          <button className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[13px] text-[#0b1220] font-semibold shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400 transition-all duration-200">
            Apply
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <AdminEcosystemPartnersTableClient items={items} currentRole={role} />
      </div>
    </div>
  )
}
