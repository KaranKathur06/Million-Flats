import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function AdminHomePage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin')
  }

  if (role !== 'ADMIN') {
    redirect('/user/dashboard?error=admin_only')
  }

  const [total, drafts, pending, approved, rejected, archived] = await Promise.all([
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL' } }).catch(() => 0),
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL', status: 'DRAFT' } }).catch(() => 0),
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL', status: 'PENDING_REVIEW' } }).catch(() => 0),
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL', status: 'APPROVED' } }).catch(() => 0),
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL', status: 'REJECTED' } }).catch(() => 0),
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL', status: 'ARCHIVED' } }).catch(() => 0),
  ])

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-7">
        <p className="text-amber-300 font-semibold text-sm uppercase tracking-wider">Admin</p>
        <h1 className="mt-2 text-3xl font-serif font-bold">Dashboard</h1>
        <p className="mt-2 text-white/60">Role-locked internal admin access.</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <p className="text-xs text-white/60">Total listings</p>
            <p className="mt-2 text-2xl font-bold text-white">{total}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <p className="text-xs text-white/60">Drafts</p>
            <p className="mt-2 text-2xl font-bold text-white">{drafts}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <p className="text-xs text-white/60">Pending</p>
            <p className="mt-2 text-2xl font-bold text-white">{pending}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <p className="text-xs text-white/60">Published</p>
            <p className="mt-2 text-2xl font-bold text-white">{approved}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <p className="text-xs text-white/60">Rejected</p>
            <p className="mt-2 text-2xl font-bold text-white">{rejected}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <p className="text-xs text-white/60">Archived</p>
            <p className="mt-2 text-2xl font-bold text-white">{archived}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/admin/moderation/properties"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-amber-400 text-[#0b1220] font-semibold hover:bg-amber-300"
          >
            Moderation Queue
          </Link>

          <Link
            href="/admin/listings"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-white/10 bg-transparent text-white font-semibold hover:bg-white/5"
          >
            Listings
          </Link>

          <Link
            href="/admin/drafts"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-white/10 bg-transparent text-white font-semibold hover:bg-white/5"
          >
            Drafts
          </Link>

          <Link
            href="/admin/agents"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-white/10 bg-transparent text-white font-semibold hover:bg-white/5"
          >
            Agents
          </Link>

          <Link
            href="/admin/users"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-white/10 bg-transparent text-white font-semibold hover:bg-white/5"
          >
            Users
          </Link>
        </div>
      </div>
    </div>
  )
}
