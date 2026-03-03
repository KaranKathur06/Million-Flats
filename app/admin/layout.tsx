import AdminShellHeaderClient from './AdminShellHeaderClient'
import AdminShellLayoutClient from './AdminShellLayoutClient'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-[1700px]">
          <AdminShellHeaderClient />
        </div>
      </header>

      <AdminShellLayoutClient>{children}</AdminShellLayoutClient>
    </div>
  )
}
