import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

const sections = [
  {
    href: '/admin/settings/general',
    title: 'General',
    description: 'Core platform-level configuration and defaults.',
    status: 'Planned',
  },
  {
    href: '/admin/settings/analytics',
    title: 'Analytics',
    description: 'Tracking, attribution, and conversion governance controls.',
    status: 'Planned',
  },
  {
    href: '/admin/settings/integrations',
    title: 'Integrations',
    description: 'Third-party services, webhook endpoints, and API connectors.',
    status: 'Planned',
  },
  {
    href: '/admin/settings/lead-magnets',
    title: 'Lead Magnets',
    description: 'Manage downloadable assets and gated PDF funnels.',
    status: 'Active',
  },
]

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fsettings')
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Admin
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-white/50">Organized configuration areas. Open a section to manage its controls.</p>
        </div>
        <Link href="/admin" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-white/50 hover:text-white/80 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all hover:border-amber-400/30 hover:bg-white/[0.04]"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${section.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/50'}`}
              >
                {section.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-white/55">{section.description}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}

