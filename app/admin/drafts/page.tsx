import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AdminDraftsTableClient from './AdminDraftsTableClient'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function AdminDraftsPage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fdrafts')
  }

  if (role !== 'ADMIN') {
    redirect('/user/dashboard?error=admin_only')
  }

  const rows = await (prisma as any).manualProperty.findMany({
    where: { sourceType: 'MANUAL', status: 'DRAFT' },
    orderBy: [{ updatedAt: 'desc' }],
    take: 500,
    select: {
      id: true,
      title: true,
      city: true,
      community: true,
      lastCompletedStep: true,
      createdAt: true,
      updatedAt: true,
      agent: { select: { id: true, user: { select: { name: true, email: true } } } },
    },
  })

  const items = (rows as any[]).map((d) => {
    const title = safeString(d?.title) || 'Untitled draft'
    const agentName = safeString(d?.agent?.user?.name) || safeString(d?.agent?.user?.email) || 'Agent'
    const agentEmail = safeString(d?.agent?.user?.email)
    const location = [safeString(d?.community), safeString(d?.city)].filter(Boolean).join(', ') || '—'

    return {
      id: String(d.id),
      title,
      agentName,
      agentEmail,
      location,
      lastCompletedStep: safeString(d?.lastCompletedStep) || '—',
      createdAt: d?.createdAt ? new Date(d.createdAt).toLocaleString() : '',
      updatedAt: d?.updatedAt ? new Date(d.updatedAt).toLocaleString() : '',
    }
  })

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-7">
        <p className="text-amber-300 font-semibold text-sm uppercase tracking-wider">Admin</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-serif font-bold">Drafts</h1>
          <Link href="/admin" className="text-sm font-semibold text-white/80 hover:text-white">
            Back to dashboard
          </Link>
        </div>

        <div className="mt-6">
          <AdminDraftsTableClient items={items} />
        </div>
      </div>
    </div>
  )
}
