import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fusers')
  }

  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    redirect('/user/dashboard?error=admin_only')
  }

  const roleFilter = safeString(searchParams?.role) || ''

  const where: any = {}
  if (roleFilter) where.role = roleFilter.toUpperCase()

  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      verified: true,
      createdAt: true,
    },
  })

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
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-white/70 border-b border-white/10">
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Verified</th>
                <th className="py-3 pr-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-white/5">
                  <td className="py-4 pr-4 text-white">{safeString(u.email)}</td>
                  <td className="py-4 pr-4 text-white/80">{safeString(u.name) || '—'}</td>
                  <td className="py-4 pr-4">
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/90">
                      {safeString(u.role)}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-white/80">{u.verified ? 'Yes' : 'No'}</td>
                  <td className="py-4 pr-4 text-white/70">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-white/60">
                    No users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
