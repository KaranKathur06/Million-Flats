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
    <div className="mx-auto max-w-[1500px]">
      <div className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-7">
        <p className="text-amber-300 font-semibold text-sm uppercase tracking-wider">Admin</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-serif font-bold">Ecosystem Partner Applications</h1>
          <Link href="/admin" className="text-sm font-semibold text-white/80 hover:text-white">
            Back to dashboard
          </Link>
        </div>

        <form className="mt-6 grid grid-cols-1 md:grid-cols-6 gap-3" method="get">
          <select
            name="stage"
            defaultValue={stage}
            className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white"
          >
            <option value="">All stages</option>
            <option value="APPLIED">APPLIED</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="ONBOARDED">ONBOARDED</option>
          </select>

          <input
            name="category"
            defaultValue={category}
            placeholder="Category slug"
            className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white placeholder:text-white/40"
          />

          <button className="h-11 rounded-xl bg-amber-400 text-[#0b1220] font-semibold hover:bg-amber-300">
            Apply
          </button>
        </form>

        <div className="mt-6">
          <AdminEcosystemPartnersTableClient items={items} currentRole={role} />
        </div>
      </div>
    </div>
  )
}
