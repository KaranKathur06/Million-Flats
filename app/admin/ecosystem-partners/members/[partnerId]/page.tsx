'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Member = {
  id: string
  inviteEmail: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  status: 'INVITED' | 'ACTIVE' | 'REVOKED'
  user: { id: string; name: string | null; email: string } | null
}

export default function AdminEcosystemMembersPage() {
  const params = useParams<{ partnerId: string }>()
  const partnerId = String(params?.partnerId || '')
  const [members, setMembers] = useState<Member[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER'>('OWNER')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!partnerId) return
    setError('')
    try {
      const response = await fetch(`/api/admin/ecosystem-partner-members/${encodeURIComponent(partnerId)}/members`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to load partner members.')
      setMembers(payload.data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load partner members.')
    }
  }, [partnerId])

  useEffect(() => { void load() }, [load])

  const invite = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/admin/ecosystem-partner-members/${encodeURIComponent(partnerId)}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to send invitation.')
      setNotice(payload.deliveryStatus === 'sent' ? 'Invitation email sent.' : 'Invitation was recorded but email delivery is pending.')
      setEmail('')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to send invitation.')
    }
  }

  const update = async (member: Member, nextRole?: Member['role']) => {
    setError('')
    try {
      const response = await fetch(`/api/admin/ecosystem-partner-members/${encodeURIComponent(partnerId)}/members/${encodeURIComponent(member.id)}`, {
        method: nextRole ? 'PATCH' : 'DELETE',
        headers: nextRole ? { 'Content-Type': 'application/json' } : undefined,
        body: nextRole ? JSON.stringify({ role: nextRole }) : undefined,
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to update partner member.')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update partner member.')
    }
  }

  return (
    <main className="space-y-6 p-6 text-white">
      <header><h1 className="text-2xl font-bold">Partner memberships</h1><p className="mt-1 text-sm text-white/60">Grant partner-scoped access. Existing MillionFlats authentication is required to accept.</p></header>
      {error ? <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div> : null}
      <form onSubmit={invite} className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 md:grid-cols-[1fr_auto_auto]">
        <label className="text-sm">Invite email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
        <div className="flex items-end gap-2">{(['OWNER', 'ADMIN', 'MEMBER'] as const).map((item) => <button key={item} type="button" onClick={() => setRole(item)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${role === item ? 'border-accent-yellow text-accent-yellow' : 'border-white/15 text-white/60'}`}>{item}</button>)}</div>
        <button className="rounded-lg bg-accent-yellow px-4 py-2 text-sm font-semibold text-dark-blue">Send invitation</button>
      </form>
      <section className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5">
        {members.map((member) => <article key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">{member.user?.name || member.inviteEmail}</p><p className="text-xs text-white/50">{member.inviteEmail} · {member.role} · {member.status}</p></div><div className="flex gap-2">{member.status !== 'REVOKED' && member.role !== 'OWNER' ? <><button onClick={() => void update(member, member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Set {member.role === 'ADMIN' ? 'member' : 'admin'}</button><button onClick={() => void update(member)} className="rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-200">Revoke</button></> : null}{member.status !== 'REVOKED' && member.role === 'OWNER' ? <button onClick={() => void update(member, 'ADMIN')} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Transfer ownership</button> : null}</div></article>)}
        {!members.length ? <p className="p-5 text-sm text-white/50">No partner members found.</p> : null}
      </section>
    </main>
  )
}
