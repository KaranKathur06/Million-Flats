'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

export default function ClaimPackagesClient() {
  const { status } = useSession()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const claim = async () => {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/packages/claim', { method: 'POST' })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) throw new Error(data?.message || 'Could not claim purchases.')
      setMessage(`${data.claimed.purchases} purchase(s) linked to your account.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not claim purchases.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-16">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Package account</p>
      <h1 className="mt-3 text-3xl font-bold text-dark-blue">Claim your purchases</h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">Sign in with the verified email address used at checkout. Matching paid purchases and active entitlements will be linked to your account.</p>
      {status === 'authenticated' ? (
        <button type="button" onClick={() => void claim()} disabled={loading} className="mt-7 h-12 rounded-lg bg-dark-blue px-5 text-sm font-semibold text-white disabled:opacity-60">{loading ? 'Checking purchases…' : 'Claim purchases'}</button>
      ) : (
        <div className="mt-7 flex flex-wrap gap-4">
          <Link href="/auth/login?next=%2Fpackages%2Fclaim" className="inline-flex h-11 items-center rounded-lg bg-dark-blue px-5 text-sm font-semibold text-white">Sign in</Link>
          <Link href="/auth/register" className="inline-flex h-11 items-center rounded-lg border border-gray-300 px-5 text-sm font-semibold text-dark-blue">Create account</Link>
        </div>
      )}
      {message ? <p className="mt-4 text-sm text-gray-700" role="status">{message}</p> : null}
    </main>
  )
}