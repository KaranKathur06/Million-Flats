import AdminShellHeaderClient from './AdminShellHeaderClient'
import AdminShellLayoutClient from './AdminShellLayoutClient'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080e1a] text-white">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a1019]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1700px]">
          <AdminShellHeaderClient />
        </div>
      </header>

      <AdminShellLayoutClient>{children}</AdminShellLayoutClient>
    </div>
  )
}
