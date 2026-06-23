import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Developer Applications | MillionFlats Admin' }

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700',
  DOCUMENTS_UPLOADED: 'bg-blue-100 text-blue-700',
  PROFILE_COMPLETED: 'bg-purple-100 text-purple-700',
  PROFILE_INCOMPLETE: 'bg-gray-100 text-gray-600',
  EMAIL_VERIFIED: 'bg-gray-100 text-gray-500',
  REGISTERED: 'bg-gray-100 text-gray-400',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-red-100 text-red-700',
}

export default async function AdminDeveloperProfilesPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string; q?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/auth/login')
  const role = (session.user as any)?.role
  if (!['ADMIN', 'SUPERADMIN', 'MODERATOR', 'VERIFIER'].includes(role)) redirect('/admin')

  const status = searchParams?.status || ''
  const page = Math.max(1, parseInt(searchParams?.page || '1'))
  const q = searchParams?.q || ''
  const limit = 25

  const where: any = {}
  if (status) where.onboardingStatus = status
  if (q) where.companyName = { contains: q, mode: 'insensitive' }

  const [profiles, total, statusCounts] = await Promise.all([
    (prisma as any).developerProfile.findMany({
      where,
      include: {
        user: { select: { email: true, createdAt: true } },
        linkedDeveloper: { select: { name: true } },
        _count: { select: { documents: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    (prisma as any).developerProfile.count({ where }),
    // Count by status for tabs
    (prisma as any).developerProfile.groupBy({
      by: ['onboardingStatus'],
      _count: { _all: true },
    }),
  ])

  const countMap: Record<string, number> = {}
  for (const s of statusCounts) countMap[s.onboardingStatus] = s._count._all

  const STATUS_FILTERS = [
    { value: '', label: 'All', count: Object.values(countMap).reduce((a: number, b) => a + (b as number), 0) },
    { value: 'UNDER_REVIEW', label: 'Under Review', count: countMap['UNDER_REVIEW'] || 0 },
    { value: 'DOCUMENTS_UPLOADED', label: 'Docs Uploaded', count: countMap['DOCUMENTS_UPLOADED'] || 0 },
    { value: 'APPROVED', label: 'Approved', count: countMap['APPROVED'] || 0 },
    { value: 'PROFILE_COMPLETED', label: 'Profile Complete', count: countMap['PROFILE_COMPLETED'] || 0 },
    { value: 'PROFILE_INCOMPLETE', label: 'Incomplete', count: countMap['PROFILE_INCOMPLETE'] || 0 },
    { value: 'REJECTED', label: 'Rejected', count: countMap['REJECTED'] || 0 },
    { value: 'SUSPENDED', label: 'Suspended', count: countMap['SUSPENDED'] || 0 },
  ]

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Developer Applications</h1>
          <p className="text-gray-500 text-sm mt-1">{total} profile{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <Link
            key={f.value}
            href={`/admin/developer-profiles?status=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
              status === f.value
                ? 'bg-dark-blue text-white border-dark-blue'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${status === f.value ? 'bg-white/20' : 'bg-gray-100'}`}>
                {f.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Company', 'Email', 'Status', 'KYC', 'Completion', 'Docs', 'Linked', 'Joined', ''].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {profiles.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-gray-400 text-sm">
                  No developer profiles found.
                </td>
              </tr>
            ) : (
              profiles.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900 max-w-[180px] truncate">
                    {p.companyName || <span className="text-gray-400 italic">Unnamed</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{p.user?.email}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[p.onboardingStatus] || 'bg-gray-100 text-gray-500'}`}>
                      {(p.onboardingStatus || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.kycStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700'
                      : p.kycStatus === 'REJECTED' ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.kycStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            p.profileCompletion === 100 ? 'bg-emerald-500'
                            : p.profileCompletion >= 60 ? 'bg-blue-500'
                            : 'bg-amber-500'
                          }`}
                          style={{ width: `${p.profileCompletion || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{p.profileCompletion || 0}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{p._count?.documents || 0}</td>
                  <td className="px-5 py-3 text-xs">
                    {p.linkedDeveloper ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {p.linkedDeveloper.name}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{fmt(p.user?.createdAt)}</td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/developer-profiles/${p.id}`}
                      className="text-xs font-semibold text-dark-blue hover:underline whitespace-nowrap"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/developer-profiles?status=${status}&page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                >
                  ← Prev
                </Link>
              )}
              {page * limit < total && (
                <Link
                  href={`/admin/developer-profiles?status=${status}&page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
