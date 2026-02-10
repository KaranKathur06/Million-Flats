import Link from 'next/link'
import AdminShellHeaderClient from './AdminShellHeaderClient'

const nav = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/listings', label: 'Listings' },
  { href: '/admin/drafts', label: 'Drafts' },
  { href: '/admin/agents', label: 'Agents' },
  { href: '/admin/ecosystem-partners', label: 'Ecosystem Partners' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
  { href: '/admin/settings', label: 'Settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <div className="mx-auto flex max-w-[1700px]">
        <aside className="hidden md:block w-[260px] shrink-0 border-r border-white/10">
          <AdminShellHeaderClient />

          <nav className="px-3 pb-8">
            <div className="space-y-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </aside>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-10">
          {children}
        </main>
      </div>
    </div>
  )
}
