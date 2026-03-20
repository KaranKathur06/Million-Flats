import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AdminEcosystemDirectoryTableClient from './AdminEcosystemDirectoryTableClient'
import FormSelect from '@/components/FormSelect'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function AdminEcosystemDirectoryPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fecosystem-directory')
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const status = safeString(searchParams?.status).toUpperCase()
  const categorySlug = safeString(searchParams?.category)
  const q = safeString(searchParams?.q)

  const where: any = {}
  if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) where.status = status
  if (categorySlug) {
    const category = await (prisma as any).ecosystemCategory.findUnique({ where: { slug: categorySlug }, select: { id: true } })
    if (category?.id) where.categoryId = category.id
    else where.categoryId = '__none__'
  }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { contactEmail: { contains: q, mode: 'insensitive' } },
      { contactPhone: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [categories, rows] = await Promise.all([
    (prisma as any).ecosystemCategory.findMany({ where: { isActive: true }, orderBy: { priorityOrder: 'asc' }, select: { id: true, slug: true, title: true } }).catch(() => []),
    (prisma as any).ecosystemPartner.findMany({
      where,
      orderBy: [{ status: 'asc' }, { isFeatured: 'desc' }, { priorityOrder: 'asc' }, { createdAt: 'desc' }],
      take: 500,
      select: {
        id: true,
        categoryId: true,
        name: true,
        logo: true,
        contactPerson: true,
        contactEmail: true,
        contactPhone: true,
        whatsapp: true,
        website: true,
        status: true,
        subscriptionTier: true,
        isFeatured: true,
        isVerified: true,
        priorityOrder: true,
        categoryData: true,
        serviceAreas: true,
        gstNumber: true,
        registrationNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    }).catch(() => []),
  ])

  const categoryMap = new Map<string, { slug: string; title: string }>((categories as any[]).map((c) => [String(c.id), { slug: safeString(c.slug), title: safeString(c.title) }]))

  const items = (rows as any[]).map((r) => {
    const cat = categoryMap.get(String(r.categoryId))
    return {
      id: safeString(r.id),
      category: cat?.slug || safeString(r.categoryId),
      categoryTitle: cat?.title || '',
      name: safeString(r.name),
      logo: safeString(r.logo),
      contactPerson: safeString(r.contactPerson),
      contactEmail: safeString(r.contactEmail),
      contactPhone: safeString(r.contactPhone),
      status: safeString(r.status),
      subscriptionTier: safeString(r.subscriptionTier),
      isFeatured: Boolean(r.isFeatured),
      isVerified: Boolean(r.isVerified),
      priorityOrder: typeof r.priorityOrder === 'number' ? r.priorityOrder : 0,
      categoryData: r.categoryData,
      serviceAreas: r.serviceAreas,
      gstNumber: safeString(r.gstNumber),
      registrationNumber: safeString(r.registrationNumber),
      createdAt: r.createdAt ? new Date(r.createdAt).toLocaleString() : '',
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '',
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
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Ecosystem Directory</h1>
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
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Status</label>
            <FormSelect
              name="status"
              defaultValue={status || ''}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'PENDING', label: 'PENDING' },
                { value: 'APPROVED', label: 'APPROVED' },
                { value: 'REJECTED', label: 'REJECTED' },
              ]}
              dense
            />
          </div>

          <div className="space-y-1.5 min-w-[150px]">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Category</label>
            <FormSelect
              name="category"
              defaultValue={categorySlug}
              options={[
                { value: '', label: 'All categories' },
                ...(categories as any[]).map((c) => ({
                  value: safeString(c.slug),
                  label: safeString(c.title),
                })),
              ]}
              dense
            />
          </div>

          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Search</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name / email / phone"
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-white/90 placeholder:text-white/25 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] focus:outline-none focus:border-amber-400/40"
            />
          </div>

          <button className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[13px] text-[#0b1220] font-semibold shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400 transition-all duration-200">
            Apply
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <AdminEcosystemDirectoryTableClient items={items} currentRole={role} />
      </div>
    </div>
  )
}
