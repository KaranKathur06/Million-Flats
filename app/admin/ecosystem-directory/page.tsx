import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AdminEcosystemDirectoryTableClient from './AdminEcosystemDirectoryTableClient'

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
    <div className="mx-auto max-w-[1500px]">
      <div className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-7">
        <p className="text-amber-300 font-semibold text-sm uppercase tracking-wider">Admin</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-serif font-bold">Ecosystem Directory (New)</h1>
          <Link href="/admin" className="text-sm font-semibold text-white/80 hover:text-white">
            Back to dashboard
          </Link>
        </div>

        <form className="mt-6 grid grid-cols-1 md:grid-cols-8 gap-3" method="get">
          <select
            name="status"
            defaultValue={status || ''}
            className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white"
          >
            <option value="">All statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          <select
            name="category"
            defaultValue={categorySlug}
            className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white"
          >
            <option value="">All categories</option>
            {(categories as any[]).map((c) => (
              <option key={String(c.id)} value={safeString(c.slug)}>
                {safeString(c.title)}
              </option>
            ))}
          </select>

          <input
            name="q"
            defaultValue={q}
            placeholder="Search name / email / phone"
            className="md:col-span-3 h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white placeholder:text-white/40"
          />

          <button className="h-11 rounded-xl bg-amber-400 text-[#0b1220] font-semibold hover:bg-amber-300">Apply</button>
        </form>

        <div className="mt-6">
          <AdminEcosystemDirectoryTableClient items={items} currentRole={role} />
        </div>
      </div>
    </div>
  )
}
