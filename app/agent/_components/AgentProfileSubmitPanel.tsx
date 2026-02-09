'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export type AgentProfileStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'LIVE' | 'SUSPENDED'

function normalizePhone(v: string) {
  return (v || '').replace(/[^0-9+]/g, '').trim()
}

function asStatus(v: unknown): AgentProfileStatus {
  const s = String(v || 'DRAFT').toUpperCase()
  if (s === 'SUBMITTED' || s === 'VERIFIED' || s === 'LIVE' || s === 'SUSPENDED') return s
  return 'DRAFT'
}

export function ProfileStatusBadge({ status }: { status: AgentProfileStatus | string }) {
  const s = asStatus(status)

  const styles =
    s === 'LIVE'
      ? 'bg-green-50 text-green-800 border-green-200'
      : s === 'VERIFIED'
        ? 'bg-blue-50 text-blue-800 border-blue-200'
        : s === 'SUBMITTED'
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : s === 'SUSPENDED'
            ? 'bg-red-50 text-red-800 border-red-200'
            : 'bg-gray-100 text-gray-700 border-gray-200'

  const label =
    s === 'DRAFT'
      ? 'Draft'
      : s === 'SUBMITTED'
        ? 'Submitted'
        : s === 'VERIFIED'
          ? 'Verified'
          : s === 'LIVE'
            ? 'Live'
            : 'Suspended'

  return <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles}`}>Status: {label}</span>
}

export default function AgentProfileSubmitPanel({
  profileStatus,
  license,
  phone,
  bio,
  photo,
  profileCompletion,
}: {
  profileStatus: AgentProfileStatus | string
  license: string
  phone: string
  bio: string
  photo: string
  profileCompletion: number
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitMessage, setSubmitMessage] = useState<string>('')

  const status = asStatus(profileStatus)

  const requirements = useMemo(() => {
    const normalizedPhone = normalizePhone(phone)
    const missing: Array<{ key: string; label: string }> = []

    if (!String(license || '').trim()) missing.push({ key: 'license', label: 'Add license number' })
    if (!normalizedPhone || normalizedPhone.length < 8) missing.push({ key: 'phone', label: 'Add phone number' })
    if (!String(photo || '').trim()) missing.push({ key: 'photo', label: 'Upload profile photo' })

    const bioLen = String(bio || '').trim().length
    if (!bioLen || bioLen < 150) missing.push({ key: 'bio', label: 'Bio must be at least 150 characters' })

    const completionOk = Number(profileCompletion) >= 40
    if (!completionOk) missing.push({ key: 'completion', label: 'Profile completion must be at least 40%' })

    return {
      missing,
      ready: missing.length === 0,
    }
  }, [license, phone, bio, photo, profileCompletion])

  const visible = status === 'DRAFT' || status === 'SUSPENDED'
  const enabled = status === 'DRAFT' && requirements.ready
  const disabledReason =
    status === 'SUSPENDED'
      ? 'Your profile is suspended.'
      : !requirements.ready
        ? 'Complete required fields to submit for verification.'
        : ''

  const submit = async () => {
    if (submitting || !visible || !enabled) return

    setSubmitting(true)
    setFieldErrors({})
    setSubmitMessage('')

    try {
      const res = await fetch('/api/agent/profile/submit', { method: 'POST' })
      const json = (await res.json().catch(() => null)) as any

      if (res.ok && json?.success) {
        router.refresh()
        return
      }

      const errors = (json && typeof json === 'object' ? json.errors : null) || {}
      if (errors && typeof errors === 'object') {
        setFieldErrors(errors)
      }

      setSubmitMessage(String(json?.message || 'Failed to submit profile.'))

      if (res.status === 409) {
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!visible) return null

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-dark-blue">Verification</h3>
          <p className="mt-1 text-sm text-gray-600">
            Submit your profile for review. Once submitted, you can keep editing, but verification is processed from your latest saved profile.
          </p>
        </div>
        <ProfileStatusBadge status={status} />
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={submit}
          disabled={!enabled || submitting}
          title={!enabled ? disabledReason : 'Submit for verification'}
          className={`w-full h-11 rounded-xl font-semibold transition-all ${
            enabled && !submitting
              ? 'bg-dark-blue text-white hover:bg-dark-blue/90'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {submitting ? 'Submitting...' : 'Submit for Verification'}
        </button>

        {!enabled ? (
          <div className="mt-3">
            <p className="text-sm font-semibold text-gray-700">{disabledReason}</p>

            {requirements.missing.length > 0 ? (
              <div className="mt-3 space-y-2">
                {requirements.missing.map((m) => (
                  <p key={m.key} className="text-sm text-gray-700">
                    <span className="text-red-600 mr-2">❌</span>
                    {m.label}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {submitMessage ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-700">{submitMessage}</p>

            {Object.keys(fieldErrors).length > 0 ? (
              <div className="mt-2 space-y-1">
                {Object.entries(fieldErrors).map(([k, v]) => (
                  <p key={k} className="text-sm text-red-700">
                    {String(v)}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
