import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AdminUsersTableClient from './AdminUsersTableClient'
import FormSelect from '@/components/FormSelect'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fusers')
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const roleFilter = safeString(searchParams?.role) || ''

  const where: any = {}
  if (roleFilter) where.role = roleFilter.toUpperCase()

  const rows = await (prisma as any).user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
    },
  })

  const items = (rows as any[]).map((u) => ({
    id: String(u.id),
    email: safeString(u.email),
    name: safeString(u.name),
    role: safeString(u.role),
    status: safeString(u.status),
    emailVerified: Boolean(u.emailVerified),
    createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString() : '',
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
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Users</h1>
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
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/35">Role</label>
            <FormSelect
              name="role"
              defaultValue={roleFilter}
              options={[
                { value: '', label: 'All roles' },
                { value: 'USER', label: 'USER' },
                { value: 'AGENT', label: 'AGENT' },
                { value: 'MODERATOR', label: 'MODERATOR' },
                { value: 'VERIFIER', label: 'VERIFIER' },
                { value: 'ADMIN', label: 'ADMIN' },
                { value: 'SUPERADMIN', label: 'SUPERADMIN' },
              ]}
              dense
            />
          </div>
          <button className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[13px] text-[#0b1220] font-semibold shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400 transition-all duration-200">
            Apply
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 overflow-x-auto">
        <AdminUsersTableClient items={items} currentRole={role} />
      </div>
    </div>
  )
}
