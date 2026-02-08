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
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-[1300px] px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-7">
          <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Admin</p>
          <h1 className="mt-2 text-3xl font-serif font-bold text-dark-blue">Dashboard</h1>
          <p className="mt-2 text-gray-600">Role-locked internal admin access.</p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="rounded-2xl border border-gray-200 p-5">
              <p className="text-xs text-gray-600">Total listings</p>
              <p className="mt-2 text-2xl font-bold text-dark-blue">{total}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-5">
              <p className="text-xs text-gray-600">Drafts</p>
              <p className="mt-2 text-2xl font-bold text-dark-blue">{drafts}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-5">
              <p className="text-xs text-gray-600">Pending</p>
              <p className="mt-2 text-2xl font-bold text-dark-blue">{pending}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-5">
              <p className="text-xs text-gray-600">Approved</p>
              <p className="mt-2 text-2xl font-bold text-dark-blue">{approved}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-5">
              <p className="text-xs text-gray-600">Rejected</p>
              <p className="mt-2 text-2xl font-bold text-dark-blue">{rejected}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-5">
              <p className="text-xs text-gray-600">Archived</p>
              <p className="mt-2 text-2xl font-bold text-dark-blue">{archived}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/admin/moderation/properties"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90"
            >
              Moderation Queue
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
