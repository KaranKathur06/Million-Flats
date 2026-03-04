import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

export default async function AdminHomePage() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/auth/login?next=%2Fadmin')
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const [total, drafts, pending, approved, rejected, archived] = await Promise.all([
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL' } }).catch(() => 0),
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL', status: 'DRAFT' } }).catch(() => 0),
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL', status: 'PENDING_REVIEW' } }).catch(() => 0),
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL', status: 'APPROVED' } }).catch(() => 0),
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL', status: 'REJECTED' } }).catch(() => 0),
    (prisma as any).manualProperty.count({ where: { sourceType: 'MANUAL', status: 'ARCHIVED' } }).catch(() => 0),
  ])

  const stats = [
    { label: 'Total Listings', value: total, color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/20', text: 'text-blue-300', icon: '📊' },
    { label: 'Drafts', value: drafts, color: 'from-slate-400/15 to-slate-500/5', border: 'border-slate-400/15', text: 'text-slate-300', icon: '📝' },
    { label: 'Pending Review', value: pending, color: 'from-amber-400/20 to-amber-500/5', border: 'border-amber-400/20', text: 'text-amber-300', icon: '⏳' },
    { label: 'Published', value: approved, color: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/20', text: 'text-emerald-300', icon: '✅' },
    { label: 'Rejected', value: rejected, color: 'from-rose-500/20 to-rose-600/5', border: 'border-rose-500/20', text: 'text-rose-300', icon: '❌' },
    { label: 'Archived', value: archived, color: 'from-violet-500/20 to-violet-600/5', border: 'border-violet-500/15', text: 'text-violet-300', icon: '📦' },
  ]

  const quickLinks = [
    { href: '/admin/governance?entityType=MANUAL_PROPERTY', label: 'Moderation Queue', primary: true },
    { href: '/admin/listings', label: 'Listings' },
    { href: '/admin/drafts', label: 'Drafts' },
    { href: '/admin/agents', label: 'Agents' },
    { href: '/admin/users', label: 'Users' },
  ]

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Admin
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-[14px] text-white/50">Role-locked internal admin access. Overview of property listings.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`group relative overflow-hidden rounded-2xl border ${s.border} bg-gradient-to-br ${s.color} p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{s.label}</p>
                <p className={`mt-2 text-2xl font-bold ${s.text}`}>{s.value}</p>
              </div>
              <span className="text-lg opacity-60">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-white/40">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`inline-flex items-center justify-center h-10 px-5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${link.primary
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-[#0b1220] shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400'
                  : 'border border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.07] hover:text-white hover:border-white/[0.15]'
                }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
