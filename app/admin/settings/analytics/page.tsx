import Link from 'next/link'

export default function AdminSettingsAnalyticsPage() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Settings</h1>
        <Link href="/admin/settings" className="text-sm font-semibold text-white/60 hover:text-white/85">Back to Settings</Link>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/60">Analytics settings module is queued for implementation.</div>
    </div>
  )
}

