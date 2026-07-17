'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function UserDetailClient({ initialUser }: { initialUser: any }) {
  const [tab, setTab] = useState('overview')

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex gap-6">
        <div className="flex-1">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 mb-4">
            <div className="flex items-center gap-4">
              <img src={initialUser.image || '/avatar-placeholder.png'} className="w-20 h-20 rounded-full object-cover" />
              <div>
                <h2 className="text-2xl font-bold text-white">{initialUser.name || initialUser.email}</h2>
                <div className="text-sm text-white/60">{initialUser.email}</div>
                <div className="text-sm text-white/60">Role: {initialUser.role}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 mb-6">
            <nav className="flex gap-2 flex-wrap">
              {['overview','profile','verification','properties','crm','security','financial','activity','audit','notes'].map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded ${tab===t?'bg-white/5':'hover:bg-white/3'}`}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
              ))}
            </nav>

            <div className="mt-4">
              {tab === 'overview' && <div>Overview placeholder. Profile completeness: {initialUser.profileCompletion}%</div>}
              {tab === 'profile' && <div>Profile details placeholder.</div>}
              {tab === 'verification' && <div>Verification tab placeholder.</div>}
              {tab === 'properties' && <div>Properties tab placeholder.</div>}
              {tab === 'crm' && <div>CRM tab placeholder.</div>}
              {tab === 'security' && <div>Security tab placeholder.</div>}
              {tab === 'financial' && <div>Financial tab placeholder.</div>}
              {tab === 'activity' && <div>Activity timeline placeholder.</div>}
              {tab === 'audit' && <div>Audit logs placeholder.</div>}
              {tab === 'notes' && <div>Admin notes placeholder.</div>}
            </div>
          </div>
        </div>

        <aside className="w-96">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 mb-4">
            <h3 className="font-bold text-white mb-2">Quick Actions</h3>
            <div className="flex flex-col gap-2">
              <Link href={`/admin/users/${encodeURIComponent(initialUser.id)}`} className="px-3 py-2 rounded bg-white/5">View profile</Link>
              <button onClick={() => alert('Send email not implemented')} className="px-3 py-2 rounded bg-white/5">Send email</button>
              <button onClick={() => alert('Generate login link not implemented')} className="px-3 py-2 rounded bg-white/5">Generate login link</button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 mb-4">
            <h3 className="font-bold text-white mb-2">AI Insights (Verix)</h3>
            <div className="text-sm text-white/60">Predicted LTV: —</div>
            <div className="text-sm text-white/60">Risk: —</div>
            <div className="text-sm text-white/60">Investment intent: —</div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h3 className="font-bold text-white mb-2">Relationship Graph</h3>
            <div className="h-48 bg-white/2 rounded">Graph placeholder</div>
          </div>
        </aside>
      </div>
    </div>
  )
}
