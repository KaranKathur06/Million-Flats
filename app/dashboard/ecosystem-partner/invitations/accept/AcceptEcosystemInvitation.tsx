'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AcceptEcosystemInvitation({ token }: { token: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<'ready' | 'busy' | 'error'>('ready')
  const [message, setMessage] = useState('Accept the invitation to access your partner workspace.')

  const accept = async () => {
    setStatus('busy')
    setMessage('')
    try {
      const response = await fetch('/api/ecosystem-partners/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to accept invitation.')
      router.replace(`/dashboard/ecosystem-partner?partnerId=${encodeURIComponent(payload.partnerId)}`)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unable to accept invitation.')
    }
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">MillionFlats Ecosystem</p>
        <h1 className="mt-3 text-2xl font-bold">Accept partner invitation</h1>
        <p className={`mt-3 text-sm ${status === 'error' ? 'text-red-700' : 'text-slate-600'}`} role={status === 'error' ? 'alert' : 'status'}>{message}</p>
        <button type="button" disabled={!token || status === 'busy'} onClick={accept} className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {status === 'busy' ? 'Accepting…' : 'Accept invitation'}
        </button>
      </section>
    </main>
  )
}
