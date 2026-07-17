import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getUserHealthScore, getLifecycleStage, getCRMStage } from '@/lib/userIntelligence'
import Link from 'next/link'

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)
  if (!session?.user) redirect('/user/login')
  if (!hasMinRole(role, 'ADMIN')) redirect('/')

  const id = String(params.id || '')
  const user = await (prisma as any).user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      phone: true,
      image: true,
      country: true,
      profileCompletion: true,
      emailVerified: true,
      createdAt: true,
      lastLogin: true,
      _count: { select: { savedProperties: true, propertyLeads: true } },
    },
  })

  if (!user) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-6 p-8">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-white/70">User not found.</div>
      </div>
    )
  }

  const healthScore = getUserHealthScore({
    emailVerified: Boolean(user.emailVerified),
    profileCompletion: Number(user.profileCompletion || 0),
    status: safeString(user.status),
    savedPropertiesCount: Number((user as any)._count?.savedProperties || 0),
    propertyLeadsCount: Number((user as any)._count?.propertyLeads || 0),
  })

  const lifecycleStage = getLifecycleStage({
    emailVerified: Boolean(user.emailVerified),
    profileCompletion: Number(user.profileCompletion || 0),
    status: safeString(user.status),
    savedPropertiesCount: Number((user as any)._count?.savedProperties || 0),
    propertyLeadsCount: Number((user as any)._count?.propertyLeads || 0),
  })

  const crmStage = getCRMStage({
    emailVerified: Boolean(user.emailVerified),
    profileCompletion: Number(user.profileCompletion || 0),
    status: safeString(user.status),
    savedPropertiesCount: Number((user as any)._count?.savedProperties || 0),
    propertyLeadsCount: Number((user as any)._count?.propertyLeads || 0),
  })

  const getDisplayName = () => {
    if (safeString(user.name)) return user.name
    if (safeString(user.email)) return user.email
    if (safeString(user.phone)) return 'Unnamed User'
    return 'Anonymous'
  }

  const getPrimaryIdentifier = () => {
    return safeString(user.email) || safeString(user.phone) || 'Unknown'
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">Admin</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">User detail</h1>
          <p className="text-sm text-white/50">Manage user identity, profile completion, and CRM linkage.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/users"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/80 hover:bg-white/10 transition"
          >
            Back to users
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/5 text-xl text-white/90">
                  {user.image ? (
                    <img src={user.image} alt={getDisplayName()} className="h-16 w-16 rounded-3xl object-cover" />
                  ) : (
                    <span>{getDisplayName().slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">{getDisplayName()}</h2>
                  <p className="text-sm text-white/50">{getPrimaryIdentifier()}</p>
                </div>
              </div>
              <div className="grid gap-2 sm:text-right">
                <div className="text-xs uppercase tracking-wider text-white/40">Member since</div>
                <div className="text-sm text-white/90">{new Date(user.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <p className="text-xs uppercase tracking-wider text-white/50">Role</p>
                <p className="mt-2 text-lg font-semibold text-white">{user.role}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <p className="text-xs uppercase tracking-wider text-white/50">Status</p>
                <p className="mt-2 text-lg font-semibold text-white">{(user as any).status || 'Active'}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">Lifecycle stage</div>
                <div className="mt-2 text-lg font-semibold text-white">{lifecycleStage}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">CRM stage</div>
                <div className="mt-2 text-lg font-semibold text-white">{crmStage}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">Health score</div>
                <div className="mt-2 text-lg font-semibold text-white">{healthScore}</div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">Profile completion</div>
                <div className="mt-2 text-lg font-semibold text-white">{user.profileCompletion}%</div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">Email verified</div>
                <div className="mt-2 text-lg font-semibold text-white">{user.emailVerified ? 'Yes' : 'No'}</div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <p className="text-xs uppercase tracking-wider text-white/50">Country</p>
                <p className="mt-2 text-sm text-white/90">{user.country || 'Unknown'}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <p className="text-xs uppercase tracking-wider text-white/50">Last login</p>
                <p className="mt-2 text-sm text-white/90">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Contact Information</h3>
              <div className="space-y-3 text-sm text-white/70">
                <div className="flex justify-between gap-3 border-b border-white/[0.08] pb-3">
                  <span>Email</span>
                  <span className="text-white/90">{user.email || '—'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Phone</span>
                  <span className="text-white/90">{user.phone || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Activity Summary</h3>
                <p className="text-xs text-white/50">User engagement and property interaction metrics.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <div className="text-xs text-white/50">Saved Properties</div>
                <div className="mt-1 text-lg font-semibold text-white">{(user as any)._count?.savedProperties || 0}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <div className="text-xs text-white/50">Property Leads</div>
                <div className="mt-1 text-lg font-semibold text-white">{(user as any)._count?.propertyLeads || 0}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <div className="text-xs text-white/50">Account Age</div>
                <div className="mt-1 text-lg font-semibold text-white">{Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))}d</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Admin actions</h3>
              <div className="grid gap-3">
                <Link
                  href="/admin/users"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 transition text-center"
                >
                  View user list
                </Link>
                <a
                  href={`/api/admin/users/${encodeURIComponent(user.id)}/export`}
                  className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/10 transition text-center"
                >
                  Export user data
                </a>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-white mb-3">CRM integration</h3>
              <div className="space-y-2 text-sm text-white/70">
                <p>CRM lead record will sync automatically from user activity.</p>
                <ul className="list-disc space-y-1 pl-5 text-white/70 text-xs">
                  <li>Registration source</li>
                  <li>Last activity</li>
                  <li>Saved properties</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
