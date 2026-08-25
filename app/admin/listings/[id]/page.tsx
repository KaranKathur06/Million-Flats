import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import ManualPropertyPreview from '@/components/ManualPropertyPreview'
import { buildManualPropertyPath } from '@/lib/manualPropertyRoutes'

export default async function AdminListingViewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)
  if (!session?.user) redirect('/user/login?next=%2Fadmin%2Flistings')
  if (!hasMinRole(role, 'ADMIN')) redirect(`${getHomeRouteForRole(role)}?error=admin_only`)

  const property = await (prisma as any).manualProperty.findFirst({
    where: { id: params.id, sourceType: 'MANUAL' },
    include: {
      media: { orderBy: [{ category: 'asc' }, { position: 'asc' }] },
      agent: { select: { id: true, whatsapp: true, user: { select: { name: true, email: true, phone: true, image: true } } } },
    },
  })
  if (!property) notFound()

  const publicPath = property.status === 'PUBLISHED' ? buildManualPropertyPath({ id: property.id, title: property.title, intent: property.intent }) : null

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><Link href="/admin/listings" className="text-sm text-white/50 hover:text-white">Back to listings</Link><h1 className="mt-2 text-2xl font-bold text-white">View property</h1><p className="mt-1 text-sm text-white/50">Read-only review. Editing is not available from this view.</p></div>
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">{String(property.status || 'UNKNOWN')}</span>{publicPath ? <Link href={publicPath} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-xl bg-amber-400 px-4 text-sm font-semibold text-black hover:bg-amber-300">Open public preview</Link> : null}</div>
    </div>
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b1220] p-2"><ManualPropertyPreview manual={property} previewMode /></div>
  </div>
}
