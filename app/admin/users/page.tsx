import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AdminUsersTableClient from './AdminUsersTableClient'

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
      verified: true,
      createdAt: true,
    },
  })

  const items = (rows as any[]).map((u) => ({
    id: String(u.id),
    email: safeString(u.email),
    name: safeString(u.name),
    role: safeString(u.role),
    status: safeString(u.status),
    verified: Boolean(u.verified),
    createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString() : '',
  }))

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-7">
        <p className="text-amber-300 font-semibold text-sm uppercase tracking-wider">Admin</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-serif font-bold">Users</h1>
          <Link href="/admin" className="text-sm font-semibold text-white/80 hover:text-white">
            Back to dashboard
          </Link>
        </div>

        <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
            <select
              name="role"
              defaultValue={roleFilter}
              className="h-11 rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white"
            >
              <option value="">All roles</option>
              <option value="USER">USER</option>
              <option value="AGENT">AGENT</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button className="h-11 rounded-xl bg-amber-400 text-[#0b1220] font-semibold px-6 hover:bg-amber-300">Apply</button>

        </form>

        <div className="mt-6 overflow-x-auto">
          <AdminUsersTableClient items={items} currentRole={role} />
        </div>
      </div>
    </div>
  )
}
