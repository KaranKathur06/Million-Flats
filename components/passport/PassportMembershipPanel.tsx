'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PASSPORT_CATEGORIES, getPassportCategoryMeta } from '@/lib/passport'

type Props = {
  userName?: string | null
  userEmail?: string | null
  initialMembership?: {
    id: string
    category: string
    membershipNumber: string
    status: string
    issueDate: string
    qrCodeValue: string
    paymentReference?: string | null
  } | null
  dashboard?: boolean
}

export default function PassportMembershipPanel({ userName, userEmail, initialMembership, dashboard = false }: Props) {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [busyCategory, setBusyCategory] = useState<string | null>(null)

  const activeCategory = useMemo(() => {
    if (!initialMembership) return null
    return getPassportCategoryMeta(initialMembership.category)
  }, [initialMembership])

  const handleActivate = async (category: string) => {
    setBusyCategory(category)
    setMessage(null)

    try {
      const response = await fetch('/api/passport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessage({
          type: 'error',
          text: data.message || 'Unable to activate this Passport category right now.',
        })
        return
      }

      setMessage({
        type: 'success',
        text: 'Your MillionFlats Passport was activated successfully.',
      })
      window.location.reload()
    } catch {
      setMessage({
        type: 'error',
        text: 'Something went wrong while activating the Passport. Please try again.',
      })
    } finally {
      setBusyCategory(null)
    }
  }

  if (initialMembership && activeCategory) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-[#0d1f38] via-[#16385e] to-[#0f2747] p-6 text-white shadow-xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">MillionFlats Passport</p>
              <h2 className="mt-3 text-3xl font-serif font-bold">{activeCategory.label}</h2>
              <p className="mt-2 max-w-xl text-sm text-cyan-50/85">{activeCategory.description}</p>
            </div>
            <div className="rounded-full border border-cyan-300/60 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">
              {initialMembership.status}
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Member name</p>
              <p className="mt-2 text-lg font-semibold">{userName || 'Member'}</p>
            </div>
            <div className="rounded-2xl bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Membership no.</p>
              <p className="mt-2 text-lg font-semibold">{initialMembership.membershipNumber}</p>
            </div>
            <div className="rounded-2xl bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Issue date</p>
              <p className="mt-2 text-lg font-semibold">{new Date(initialMembership.issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <div className="rounded-2xl bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Verification</p>
              <p className="mt-2 text-lg font-semibold">{initialMembership.qrCodeValue}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0d1f38] transition hover:bg-gray-100"
            >
              Download Passport
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(String(initialMembership.membershipNumber || initialMembership.qrCodeValue || ''))}
              className="rounded-lg border border-cyan-200 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Copy membership number
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Included benefits</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {PASSPORT_CATEGORIES.find((category) => category.value === initialMembership.category)?.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Digital-first membership</p>
        <h2 className="mt-3 text-3xl font-serif font-bold text-slate-900">Choose your MillionFlats Passport</h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Each account can hold one active Passport category. Your membership unlocks trusted property resources, partner access, and a digital verification credential.
        </p>
      </div>

      {message ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {PASSPORT_CATEGORIES.map((category) => {
          const isBusy = busyCategory === category.value
          const isLoggedIn = Boolean(userEmail)

          return (
            <div key={category.value} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{category.label}</h3>
                  <p className="mt-2 text-sm text-slate-600">{category.description}</p>
                </div>
                <div className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">{category.price}</div>
              </div>

              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {category.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => handleActivate(category.value)}
                  disabled={isBusy}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#0d1f38] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a1730] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isBusy ? 'Activating...' : `Activate ${category.label}`}
                </button>
              ) : (
                <Link
                  href={`/auth/login?next=${encodeURIComponent(dashboard ? '/dashboard/passport' : '/passport')}`}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-[#0d1f38] px-4 py-3 text-sm font-semibold text-[#0d1f38] transition hover:bg-[#0d1f38] hover:text-white"
                >
                  Sign in to activate
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
