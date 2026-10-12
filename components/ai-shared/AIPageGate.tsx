'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

type PreviewMetric = {
  label: string
  value: string
}

type AIPageGateProps = {
  children: ReactNode
  product: string
  title: string
  description: string
  metrics: PreviewMetric[]
}

export function AIPageGate({
  children,
  product,
  title,
  description,
  metrics,
}: AIPageGateProps) {
  const { status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#f0f2f5] px-4">
        <p className="text-sm font-medium text-gray-500" role="status">Loading {product} preview…</p>
      </div>
    )
  }

  if (status === 'authenticated') return <>{children}</>

  return (
    <main className="min-h-screen bg-[#f0f2f5] px-4 py-12">
      <section className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <header className="bg-[#0a1628] px-6 py-8 text-white sm:px-10">
          <span className="inline-flex rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-200">
            {product} · Sample preview
          </span>
          <h1 className="mt-4 text-3xl font-bold">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">{description}</p>
        </header>

        <div className="space-y-6 p-6 sm:p-10">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            <strong>Static sample data only.</strong> This preview is illustrative; no AI APIs are called and no analysis is run for anonymous visitors.
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                <p className="mt-2 text-2xl font-black text-[#0a1628]">{value}</p>
                <p className="mt-1 text-xs text-gray-400">Illustrative sample</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">Sign in to access the live {product} workspace.</p>
            <Link
              href="/auth/login"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#0a1628] px-5 text-sm font-bold text-white transition-colors hover:bg-[#1a2d4a]"
            >
              Sign in to continue
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
