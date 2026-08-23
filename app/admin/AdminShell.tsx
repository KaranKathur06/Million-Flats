'use client'

import { AdminWorkspaceProvider } from '@/components/admin/AdminWorkspaceProvider'
import { AdminActionProvider } from '@/components/admin/AdminActionProvider'
import AdminShellHeaderClient from './AdminShellHeaderClient'
import AdminShellLayoutClient from './AdminShellLayoutClient'

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminWorkspaceProvider>
      <AdminActionProvider>
        <header className="sticky top-0 z-50 shrink-0 border-b border-white/[0.06] bg-[#0a1019]/80 backdrop-blur-xl h-[var(--admin-header-height)]">
          <AdminShellHeaderClient />
        </header>
        <AdminShellLayoutClient>{children}</AdminShellLayoutClient>
      </AdminActionProvider>
    </AdminWorkspaceProvider>
  )
}
