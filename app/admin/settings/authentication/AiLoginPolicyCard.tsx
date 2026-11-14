'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { AI_LOGIN_CONTROLLED_ROUTES } from '@/lib/ai-public-routes'

interface PolicyData {
  loginRequired: boolean
  version: number
  scope: string
  updatedAt: string | null
  updatedBy: {
    id: string
    name: string | null
    email: string
    role: string | null
  } | null
}

interface PolicyResponse {
  success?: boolean
  data?: PolicyData
  error?: string
  requestId?: string
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return 'Not changed yet'

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Timestamp unavailable'
    : date.toLocaleString()
}

async function readPolicyResponse(response: Response): Promise<PolicyResponse> {
  try {
    return (await response.json()) as PolicyResponse
  } catch {
    throw new Error(
      `The server returned an unreadable response (HTTP ${response.status}). Please retry or contact support.`,
    )
  }
}

export default function AiLoginPolicyCard() {
  const { data: session } = useSession()
  const role = String((session?.user as { role?: string } | undefined)?.role ?? '')
    .toUpperCase()
  const canEdit = role === 'SUPERADMIN'

  const [policy, setPolicy] = useState<PolicyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirmationValue, setConfirmationValue] = useState<boolean | null>(null)
  const savingRef = useRef(false)

  const loadPolicy = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/settings/ai-login-policy', {
        cache: 'no-store',
      })
      const result = await readPolicyResponse(response)

      if (!response.ok || !result.data) {
        throw new Error(result.error || 'Unable to load the AI login policy.')
      }

      setPolicy(result.data)
    } catch (loadError) {
      setPolicy(null)
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load the AI login policy.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPolicy()
  }, [loadPolicy])

  const savePolicy = async () => {
    if (!policy || confirmationValue === null || savingRef.current || !canEdit) return

    savingRef.current = true
    setSaving(true)
    setError('')
    setNotice('')
    setSaved(false)

    try {
      const response = await fetch('/api/admin/settings/ai-login-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginRequired: confirmationValue,
          expectedVersion: policy.version,
        }),
      })
      const result = await readPolicyResponse(response)

      if (response.status === 409) {
        setConfirmationValue(null)
        setNotice(
          'Another administrator changed this policy. The latest saved value has been reloaded; review it before confirming again.',
        )
        await loadPolicy()
        return
      }

      if (!response.ok || !result.data) {
        const message = result.error || `Unable to save the AI login policy (HTTP ${response.status}).`
        throw new Error(
          result.requestId ? `${message} Reference: ${result.requestId}` : message,
        )
      }

      setPolicy(result.data)
      setConfirmationValue(null)
      setSaved(true)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save the AI login policy.',
      )
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-sm">
      <div className="border-b border-white/10 bg-white/[0.03] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">
              Access management
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              AI System™ Login Policy
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Control whether visitors must authenticate before accessing the
              six designated AI System™ information pages.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Controlled AI information routes">
              {AI_LOGIN_CONTROLLED_ROUTES.map((route) => (
                <li
                  key={route}
                  className="rounded-md border border-white/10 bg-[#080e1a]/60 px-2 py-1 font-mono text-xs text-slate-300"
                >
                  {route}
                </li>
              ))}
            </ul>
          </div>
          {!loading && policy && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                policy.loginRequired
                  ? 'bg-emerald-500/10 text-emerald-200'
                  : 'bg-amber-500/10 text-amber-200'
              }`}
            >
              {policy.loginRequired ? 'ON · LOGIN REQUIRED' : 'OFF · PUBLIC ACCESS'}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-5 p-6">
        {loading && (
          <div
            className="flex items-center gap-3 py-3 text-sm text-slate-400"
            role="status"
          >
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            Loading saved AI login policy…
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-500/[0.06] px-4 py-3">
            <p className="text-sm text-red-200" role="alert">{error}</p>
            <button
              type="button"
              onClick={() => void loadPolicy()}
              className="rounded-lg border border-red-400/30 px-3 py-1.5 text-sm font-semibold text-red-200 hover:bg-red-500/10"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && policy && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Require login to access AI pages
                </h3>
                <p className="mt-1 max-w-xl text-sm text-slate-400">
                  {policy.loginRequired
                    ? 'Visitors must authenticate before accessing the approved AI System™ information pages.'
                    : 'Approved AI System™ information pages are accessible without login. Protected tools and APIs remain secured.'}
                </p>
              </div>

              {canEdit ? (
                <button
                  type="button"
                  role="switch"
                  aria-label="Require login to access AI pages"
                  aria-checked={policy.loginRequired}
                  disabled={saving}
                  onClick={() => {
                    setError('')
                    setNotice('')
                    setConfirmationValue(!policy.loginRequired)
                  }}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    policy.loginRequired ? 'bg-emerald-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      policy.loginRequired ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              ) : (
                <span className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200">
                  {policy.loginRequired ? 'Login required' : 'Public access'}
                </span>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-[#080e1a]/60 px-4 py-3 text-xs text-slate-400">
              <p>
                Last changed: <strong>{formatUpdatedAt(policy.updatedAt)}</strong>
              </p>
              <p className="mt-1">
                Changed by:{' '}
                <strong>
                  {policy.updatedBy?.name ||
                    policy.updatedBy?.email ||
                    (policy.updatedAt ? 'Administrator' : 'Not changed yet')}
                </strong>
                {policy.updatedBy?.role ? ` (${policy.updatedBy.role})` : ''}
              </p>
            </div>
          </>
        )}

        {notice && (
          <p className="rounded-lg border border-amber-400/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-100" role="status">
            {notice}
          </p>
        )}
        {saved && (
          <p className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200" role="status">
            AI System™ login policy saved successfully.
          </p>
        )}
        {!loading && policy && !canEdit && (
          <p className="text-xs text-slate-400">
            Only Super Admins can change this platform-wide access policy.
          </p>
        )}
      </div>

      {confirmationValue !== null && policy && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setConfirmationValue(null)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-policy-confirm-title"
            aria-describedby="ai-policy-confirm-description"
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1728] p-6 shadow-2xl"
          >
            <h3 id="ai-policy-confirm-title" className="text-lg font-bold text-white">
              {confirmationValue ? 'Require login for AI pages?' : 'Enable public access?'}
            </h3>
            <p id="ai-policy-confirm-description" className="mt-3 text-sm leading-6 text-slate-300">
              {confirmationValue
                ? 'Visitors will need to authenticate before accessing the six designated AI System™ information pages.'
                : 'Unauthenticated visitors will be able to access the six designated AI System™ information pages. Protected dashboards, private AI operations, and APIs will continue to require their existing authorization.'}
            </p>
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200">
              New state: {confirmationValue ? 'ON · Login required' : 'OFF · Public access enabled'}
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-300" role="alert">{error}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmationValue(null)}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void savePolicy()}
                className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {saving ? 'Saving…' : 'Confirm change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
