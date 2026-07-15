'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUserHealthScore, getLifecycleStage, getCRMStage, getRecommendationConfidence } from '@/lib/userIntelligence'

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!id) {
        setError('Missing user identifier.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}/detail`)
        const json = await res.json().catch(() => null)
        if (!active) return
        if (!res.ok || !json?.success) {
          setError(json?.message || 'Unable to load user details.')
          setUser(null)
        } else {
          setUser(json.user)
        }
      } catch (err) {
        setError('Unable to load user details.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [id])

  const getDisplayName = () => {
    if (!user) return 'User details'
    if (safeString(user.name)) return user.name
    if (safeString(user.email)) return user.email
    if (safeString(user.phone)) return 'Unnamed User'
    return 'Anonymous'
  }

  const getPrimaryIdentifier = () => {
    if (safeString(user.email)) return user.email
    if (safeString(user.phone)) return user.phone
    return 'Unknown'
  }

  const intelligence = useMemo(() => {
    if (!user) return null
    return {
      healthScore: Number(user.healthScore ?? 0),
      lifecycleStage: safeString(user.lifecycleStage) || getLifecycleStage({
        emailVerified: Boolean(user.emailVerified),
        profileCompletion: Number(user.profileCompletion || 0),
        status: safeString(user.status),
        savedPropertiesCount: Number(user.savedPropertiesCount || 0),
        propertyLeadsCount: Number(user.propertyLeadsCount || 0),
      }),
      crmStage: safeString(user.crmStage) || getCRMStage({
        emailVerified: Boolean(user.emailVerified),
        profileCompletion: Number(user.profileCompletion || 0),
        status: safeString(user.status),
        savedPropertiesCount: Number(user.savedPropertiesCount || 0),
        propertyLeadsCount: Number(user.propertyLeadsCount || 0),
      }),
      recommendationConfidence: safeString(user.recommendationConfidence) || getRecommendationConfidence({
        emailVerified: Boolean(user.emailVerified),
        profileCompletion: Number(user.profileCompletion || 0),
        status: safeString(user.status),
        savedPropertiesCount: Number(user.savedPropertiesCount || 0),
        propertyLeadsCount: Number(user.propertyLeadsCount || 0),
      }),
    }
  }, [user])

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">Admin</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">User detail</h1>
          <p className="text-sm text-white/50">Manage user identity, profile completion, and CRM linkage.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push('/admin/users')}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/80 hover:bg-white/10 transition"
          >
            Back to users
          </button>
          <button
            type="button"
            disabled={!user}
            onClick={() => router.refresh()}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 text-sm font-semibold text-amber-200 hover:bg-amber-400/10 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <div className="mx-auto inline-flex items-center gap-3 text-white/70">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" />
            <span>Loading user details…</span>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          <p className="font-semibold">{error}</p>
        </div>
      ) : !user ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-white/70">No user found.</div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/5 text-xl text-white/90">
                    {user.image ? (
                      <img src={user.image} alt={getDisplayName()} className="h-16 w-16 rounded-3xl object-cover" />
                    ) : (
                      <span>{getDisplayName().slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{getDisplayName()}</h2>
                    <p className="text-sm text-white/50">{getPrimaryIdentifier()}</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:text-right">
                  <div className="text-xs uppercase tracking-wider text-white/40">Member since</div>
                  <div className="text-sm text-white/90">{new Date(user.createdAt).toLocaleString()}</div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/50">Role</p>
                  <p className="mt-2 text-lg font-semibold text-white">{user.role}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/50">Status</p>
                  <p className="mt-2 text-lg font-semibold text-white">{user.status}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">Lifecycle stage</div>
                  <div className="mt-2 text-lg font-semibold text-white">{user.lifecycleStage || 'N/A'}</div>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">CRM stage</div>
                  <div className="mt-2 text-lg font-semibold text-white">{user.crmStage || 'N/A'}</div>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">Health score</div>
                  <div className="mt-2 text-lg font-semibold text-white">{user.healthScore ?? '—'}</div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">Profile completion</div>
                  <div className="mt-2 text-lg font-semibold text-white">{user.profileCompletion}%</div>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">Email verified</div>
                  <div className="mt-2 text-lg font-semibold text-white">{user.emailVerified ? 'Yes' : 'No'}</div>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">Auth provider</div>
                  <div className="mt-2 text-lg font-semibold text-white">{user.authProvider || 'Email'}</div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/50">Country</p>
                  <p className="mt-2 text-sm text-white/90">{user.country || 'Unknown'}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/50">Last login</p>
                  <p className="mt-2 text-sm text-white/90">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Authentication</h3>
                    <p className="text-xs text-white/50">Identity state and session counts.</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-sm text-white/70">
                  <div className="flex justify-between gap-3 border-b border-white/[0.08] pb-3">
                    <span>Email verified</span>
                    <span>{user.emailVerified ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-white/[0.08] pb-3">
                    <span>Auth provider</span>
                    <span>{user.authProvider || 'Email'}</span>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-white/[0.08] pb-3">
                    <span>Phone</span>
                    <span>{user.phone || '—'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Audit log entries</span>
                    <span>{user.auditLogCount}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Profile completion</h3>
                    <p className="text-xs text-white/50">Fields still missing for this user.</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-white/70">
                  {user.missingFields?.length ? (
                    user.missingFields.map((field: string) => (
                      <div key={field} className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                        {field}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-emerald-200">Profile is complete or user has no missing required fields.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Login history</h3>
                  <p className="text-xs text-white/50">Recent authentication activity for this user.</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-white/50 text-center py-8">Login history will be available soon.</div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-sm font-semibold text-white">Admin actions</h3>
                <div className="mt-4 grid gap-3">
                  <Link
                    href={`/admin/users`}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 transition"
                  >
                    View user list
                  </Link>
                  <button className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm font-semibold text-amber-200 hover:bg-amber-400/10 transition" disabled>
                    Suspend / reactivate (coming)
                  </button>
                  <button className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/10 transition" disabled>
                    Send email notification (coming)
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-sm font-semibold text-white">CRM integration</h3>
                <div className="mt-4 space-y-2 text-sm text-white/70">
                  <p>CRM lead record will sync automatically from user activity, preserving:</p>
                  <ul className="list-disc space-y-1 pl-5 text-white/70">
                    <li>Registration source</li>
                    <li>Last activity</li>
                    <li>Saved properties</li>
                  </ul>
                  <p className="text-xs text-white/50">If this user has not completed profile fields, CRM will mark them as a partial lead.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
