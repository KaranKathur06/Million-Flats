import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fsettings')
  }

  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    redirect('/user/dashboard?error=admin_only')
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-7">
        <p className="text-amber-300 font-semibold text-sm uppercase tracking-wider">Admin</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-serif font-bold">Settings</h1>
          <Link href="/admin" className="text-sm font-semibold text-white/80 hover:text-white">
            Back to dashboard
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-6">
          <p className="text-white/80 text-sm">Settings panel is intentionally minimal for now.</p>
          <p className="mt-2 text-white/60 text-sm">Future: super-admin controls, feature flags, and policy configs.</p>
        </div>
      </div>
    </div>
  )
}
