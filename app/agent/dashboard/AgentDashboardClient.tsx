'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { buildPropertySlugPath } from '@/lib/seo'
import { ProfileStatusBadge } from '../_components/AgentProfileSubmitPanel'
import { ModuleLock } from '../../_components/agent/ModuleLock'
import { AgentStatus, agentModuleAccessMap } from '@/lib/agentLifecycle'

/* ─── Types ─────────────────────────────────────────── */
type Listing = {
  id: string
  title: string
  location: string
  priceLabel: string
  status: 'Draft' | 'Active' | 'Sold'
  thumbnailUrl?: string
}

type DraftListing = {
  id: string
  status: string
  title: string
  location: string
  priceLabel: string
  updatedAtLabel: string
  completionPercent: number
}

type Lead = {
  id: string
  propertyTitle: string
  contactMethod: string
  createdAtLabel: string
}

/* ─── Step Icons ─────────────────────────────────────── */
function StepCheck({ done }: { done: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
      done ? 'bg-emerald-100' : 'bg-gray-100'
    }`}>
      {done ? (
        <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
        </svg>
      )}
    </div>
  )
}

/* ─── Stat Card ──────────────────────────────────────── */
function StatCard({ label, value, icon, locked }: { label: string; value: string | number; icon: React.ReactNode; locked?: boolean }) {
  return (
    <div className={`relative rounded-2xl border p-5 bg-white transition-all ${locked ? 'border-gray-100 opacity-75' : 'border-gray-200 hover:shadow-sm hover:border-gray-300'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${locked ? 'bg-gray-100 text-gray-400' : 'bg-[#1e3a5f]/10 text-[#1e3a5f]'}`}>
          {locked ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : icon}
        </div>
        {locked && (
          <span className="text-[10px] font-bold uppercase text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
            Locked
          </span>
        )}
      </div>
      <p className={`mt-3 text-2xl font-bold ${locked ? 'text-gray-300' : 'text-[#1e3a5f]'}`}>
        {locked ? '—' : value}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {locked && (
        <div className="mt-2">
          <Link href="/agent/verification" className="text-xs text-[#1e3a5f] font-semibold hover:underline">
            Unlock with verification →
          </Link>
        </div>
      )}
    </div>
  )
}

/* ─── Main Component ─────────────────────────────────── */
export default function AgentDashboardClient({
  agentName,
  company,
  license,
  approved,
  agentStatus,
  profileStatus,
  publicProfileHref,
  stats,
  profileCompletion,
  submitMeta,
  draftListings,
  listings,
  leads,
}: {
  agentName: string
  company: string
  license: string
  approved: boolean
  agentStatus: AgentStatus
  profileStatus: string
  publicProfileHref: string
  stats: {
    totalListings: number
    activeListings: number
    views30d: number
    leadsReceived: number
    contactClicks: number
  }
  profileCompletion: { percent: number; missing: Array<{ key: string; label: string; href: string }> }
  submitMeta: { license: string; phone: string; bio: string; photo: string; profileCompletion: number }
  draftListings: DraftListing[]
  listings: Listing[]
  leads: Lead[]
}) {
  const router = useRouter()
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [busyId, setBusyId] = useState<string>('')
  const [actionError, setActionError] = useState<string>('')

  const initials = useMemo(() => {
    const parts = (agentName || '').trim().split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] || 'A'
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : ''
    return `${first}${last}`.toUpperCase()
  }, [agentName])

  const access = agentModuleAccessMap(agentStatus)

  const pct = Math.max(0, Math.min(100, Math.round(profileCompletion.percent)))

  /* profile requirements (mirror ProfileSubmitPanel) */
  const missingRequirements = useMemo(() => {
    const missing: string[] = []
    if (!submitMeta.license?.trim()) missing.push('License number')
    if (!submitMeta.phone?.replace(/[^0-9+]/g, '').trim() || submitMeta.phone.replace(/[^0-9+]/g, '').length < 8) missing.push('Phone number')
    if (!submitMeta.photo?.trim()) missing.push('Profile photo')
    if (!submitMeta.bio?.trim() || submitMeta.bio.trim().length < 150) missing.push('Bio (150+ chars)')
    return missing
  }, [submitMeta])

  const profileReady = missingRequirements.length === 0
  const pStatusNorm = String(profileStatus).toUpperCase()
  const isLive = pStatusNorm === 'LIVE'
  const isSubmitted = pStatusNorm === 'SUBMITTED' || pStatusNorm === 'VERIFIED'

  /* Onboarding steps */
  const onboardingSteps = [
    { key: 'profile', label: 'Complete profile info', done: profileReady, href: '/agent/profile' },
    { key: 'docs', label: 'Upload verification documents', done: isSubmitted || isLive, href: '/agent/verification' },
    { key: 'submitted', label: 'Submit for verification', done: isSubmitted || isLive, href: '/agent/verification' },
    { key: 'approved', label: 'Account approved', done: isLive, href: '/agent/verification' },
  ]
  const doneSteps = onboardingSteps.filter((s) => s.done).length
  const setupPct = Math.round((doneSteps / onboardingSteps.length) * 100)

  /* Actions */
  const deleteDraft = async (id: string) => {
    if (!id || busyId) return
    setBusyId(id); setActionError('')
    try {
      const res = await fetch(`/api/manual-properties/${encodeURIComponent(id)}/delete`, { method: 'POST' })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to delete draft')
      router.refresh()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete draft')
    } finally { setBusyId('') }
  }

  const clonePublishedToDraft = async (id: string) => {
    if (!id || busyId) return
    setBusyId(id); setActionError('')
    try {
      const res = await fetch(`/api/manual-properties/${encodeURIComponent(id)}/edit`, { method: 'POST' })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to create draft copy')
      const draftId = String(json?.draftId || '')
      if (!draftId) throw new Error('Missing draftId')
      router.push(`/properties/new/manual?draftId=${encodeURIComponent(draftId)}&mode=edit`)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to create draft copy')
    } finally { setBusyId('') }
  }

  const archivePublished = async (id: string) => {
    if (!id || busyId) return
    setBusyId(id); setActionError('')
    try {
      const res = await fetch(`/api/manual-properties/${encodeURIComponent(id)}/archive`, { method: 'POST' })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to archive listing')
      router.refresh()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to archive listing')
    } finally { setBusyId('') }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ─── HEADER ─── */}
      <div className="relative bg-gradient-to-br from-[#1e3a5f] via-[#1e3a5f] to-[#0c2340] overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-orange-300 rounded-full translate-y-1/2 blur-2xl" />
        </div>
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Agent info */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-lg font-bold text-white">{initials}</span>
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1e3a5f] ${
                  isLive ? 'bg-emerald-400' : isSubmitted ? 'bg-amber-400' : 'bg-gray-400'
                }`} />
              </div>
              <div>
                <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Agent Portal</p>
                <h1 className="text-2xl md:text-3xl font-bold text-white mt-0.5">{agentName || 'Agent'}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <ProfileStatusBadge status={profileStatus} />
                  {license && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-blue-200 border border-white/20">
                      {license}
                    </span>
                  )}
                  {company && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-blue-200 border border-white/20">
                      {company}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <Link href={publicProfileHref} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-colors backdrop-blur-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Public Profile
              </Link>
              <Link href="/agent/profile" className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-white text-[#1e3a5f] text-sm font-semibold hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ─── SETUP PROGRESS CARD (only if not live) ─── */}
        {!isLive && (
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-bold text-[#1e3a5f]">Account Setup</h2>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    setupPct === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>{setupPct}% complete</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-gradient-to-r from-[#1e3a5f] to-blue-400 rounded-full transition-all duration-700"
                    style={{ width: `${setupPct}%` }}
                  />
                </div>
              </div>
              <Link href={onboardingSteps.find((s) => !s.done)?.href || '/agent/verification'}
                className="flex-shrink-0 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#1e3a5f]/90 transition-colors">
                Continue Setup
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {onboardingSteps.map((step, i) => (
                <Link key={step.key} href={step.href} className={`flex items-center gap-3 rounded-xl border p-3 transition-all hover:shadow-sm ${
                  step.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-gray-50 hover:border-[#1e3a5f]/30'
                }`}>
                  <StepCheck done={step.done} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-medium">Step {i + 1}</p>
                    <p className={`text-xs font-semibold leading-tight ${step.done ? 'text-emerald-700' : 'text-gray-700'}`}>
                      {step.label}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ─── STATS GRID ─── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
          <StatCard
            label="Total Listings"
            value={stats.totalListings}
            locked={!access.properties}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
          />
          <StatCard
            label="Active Listings"
            value={stats.activeListings}
            locked={!access.properties}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
          />
          <StatCard
            label="Views (30 days)"
            value={stats.views30d}
            locked={!access.analytics}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
          />
          <StatCard
            label="Leads Received"
            value={stats.leadsReceived}
            locked={!access.leads}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>}
          />
          <StatCard
            label="Contact Clicks"
            value={stats.contactClicks}
            locked={!access.analytics}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
          />
        </div>

        {/* ─── QUICK ACTIONS (for incomplete accounts) ─── */}
        {!isLive && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Link href="/agent/profile" className="group flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-white hover:border-[#1e3a5f]/30 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#1e3a5f]/20 transition-colors">
                <svg className="w-5 h-5 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1e3a5f]">Edit Profile</p>
                <p className="text-xs text-gray-500">Name, bio, contact info</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 ml-auto group-hover:text-[#1e3a5f] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="/agent/verification" className="group flex items-center gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50/50 hover:border-amber-300 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">Upload Documents</p>
                <p className="text-xs text-amber-600">Get verified to list properties</p>
              </div>
              <svg className="w-4 h-4 text-amber-300 ml-auto group-hover:text-amber-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <div className="relative group flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50 opacity-70">
              <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500">Add Property</p>
                <p className="text-xs text-gray-400">Requires verification first</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        )}

        {/* ─── MAIN CONTENT GRID ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2/3: Listings + Leads */}
          <div className="lg:col-span-2 space-y-6">
            {/* Draft Listings */}
            <ModuleLock status={agentStatus} moduleName="Listings" isLocked={!access.properties}>
              {draftListings.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-6 mb-5">
                    <div>
                      <h2 className="text-base font-bold text-[#1e3a5f]">Draft Listings</h2>
                      <p className="mt-0.5 text-xs text-gray-500">Pick up where you left off</p>
                    </div>
                    <Link href="/properties/new/manual"
                      className="inline-flex items-center justify-center h-9 px-3 rounded-xl bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#1e3a5f]/90 transition-colors">
                      New Draft
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {draftListings.map((d) => (
                      <div key={d.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1e3a5f] truncate text-sm">{d.title}</p>
                            <p className="mt-0.5 text-xs text-gray-500 truncate">{d.location}</p>
                          </div>
                          <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            d.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}>
                            {d.status === 'REJECTED' ? 'Rejected' : 'Draft'}
                          </span>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-gray-500">Completion</p>
                            <p className="text-[10px] font-semibold text-gray-700">{Math.max(0, Math.min(100, Math.round(d.completionPercent)))}%</p>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.max(0, Math.min(100, Math.round(d.completionPercent)))}%` }} />
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <Link href={`/properties/new/manual?draftId=${encodeURIComponent(d.id)}&mode=resume`}
                            className="flex-1 inline-flex items-center justify-center h-8 rounded-lg bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#1e3a5f]/90 transition-colors">
                            Resume
                          </Link>
                          <button type="button" onClick={() => deleteDraft(d.id)} disabled={busyId === d.id}
                            className="h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ModuleLock>

            {actionError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700 font-medium">{actionError}</p>
              </div>
            )}

            {/* Published Listings */}
            <ModuleLock status={agentStatus} moduleName="Listings" isLocked={!access.properties}>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-base font-bold text-[#1e3a5f]">My Listings</h2>
                    <p className="mt-0.5 text-xs text-gray-500">Your published and active properties</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setView('grid')}
                      className={`h-8 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                        view === 'grid' ? 'border-[#1e3a5f] text-[#1e3a5f] bg-[#1e3a5f]/5' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>Grid</button>
                    <button type="button" onClick={() => setView('table')}
                      className={`h-8 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                        view === 'table' ? 'border-[#1e3a5f] text-[#1e3a5f] bg-[#1e3a5f]/5' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>Table</button>
                    <Link href="/properties/new"
                      className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-[#1e3a5f] text-white text-xs font-semibold hover:bg-[#1e3a5f]/90 transition-colors">
                      Add New
                    </Link>
                  </div>
                </div>

                {listings.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-10 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#1e3a5f]/10 mx-auto flex items-center justify-center">
                      <svg className="w-6 h-6 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <h3 className="mt-4 text-base font-bold text-[#1e3a5f]">Add your first property</h3>
                    <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">Start building trust with buyers by publishing a complete, verified listing.</p>
                    <Link href="/properties/new"
                      className="mt-5 inline-flex items-center justify-center h-10 px-6 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#1e3a5f]/90 transition-colors">
                      Add First Property
                    </Link>
                  </div>
                ) : view === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {listings.map((l) => {
                      const href = buildPropertySlugPath({ id: l.id, title: l.title }) || `/properties/${encodeURIComponent(l.id)}`
                      return (
                        <div key={l.id} className="rounded-xl border border-gray-200 overflow-hidden bg-white hover:shadow-sm transition-all">
                          <div className="h-36 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                            {l.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={l.thumbnailUrl} alt={l.title} className="h-full w-full object-cover" />
                            ) : (
                              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                              </svg>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-[#1e3a5f] truncate text-sm">{l.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{l.location}</p>
                              </div>
                              <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {l.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-bold text-[#1e3a5f]">{l.priceLabel}</p>
                            <div className="mt-3 flex gap-2">
                              <Link href={href} className="flex-1 inline-flex items-center justify-center h-7 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">View</Link>
                              <button type="button" onClick={() => clonePublishedToDraft(l.id)} disabled={busyId === l.id}
                                className="flex-1 inline-flex items-center justify-center h-7 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                                Edit
                              </button>
                              <button type="button" onClick={() => archivePublished(l.id)} disabled={busyId === l.id}
                                className="h-7 px-2.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                                Archive
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left font-semibold text-gray-600 px-4 py-3 text-xs">Listing</th>
                          <th className="text-left font-semibold text-gray-600 px-4 py-3 text-xs">Status</th>
                          <th className="text-left font-semibold text-gray-600 px-4 py-3 text-xs">Price</th>
                          <th className="text-right font-semibold text-gray-600 px-4 py-3 text-xs">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listings.map((l) => (
                          <tr key={l.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-[#1e3a5f] text-sm">{l.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{l.location}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {l.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-[#1e3a5f] text-sm">{l.priceLabel}</td>
                            <td className="px-4 py-3 text-right">
                              <Link href={buildPropertySlugPath({ id: l.id, title: l.title }) || `/properties/${encodeURIComponent(l.id)}`}
                                className="inline-flex items-center justify-center h-7 px-3 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </ModuleLock>

            {/* Leads */}
            <ModuleLock status={agentStatus} moduleName="Leads Tracking" isLocked={!access.leads}>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-base font-bold text-[#1e3a5f]">Recent Leads</h2>
                    <p className="mt-0.5 text-xs text-gray-500">Recent enquiries and contact intent</p>
                  </div>
                  <Link href="/contact" className="inline-flex items-center justify-center h-8 px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Support</Link>
                </div>
                {leads.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
                    <p className="text-sm text-gray-500">No recent enquiries yet.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left font-semibold text-gray-600 px-4 py-3 text-xs">Property</th>
                          <th className="text-left font-semibold text-gray-600 px-4 py-3 text-xs">Method</th>
                          <th className="text-right font-semibold text-gray-600 px-4 py-3 text-xs">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map((l) => (
                          <tr key={l.id} className="border-t border-gray-100">
                            <td className="px-4 py-3 font-semibold text-[#1e3a5f] text-sm">{l.propertyTitle}</td>
                            <td className="px-4 py-3 text-gray-600 text-xs">{l.contactMethod}</td>
                            <td className="px-4 py-3 text-right text-gray-500 text-xs">{l.createdAtLabel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </ModuleLock>
          </div>

          {/* Right 1/3: Sidebar */}
          <div className="space-y-5">
            {/* Profile Completion */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-bold text-[#1e3a5f]">Profile Strength</h3>
                <span className={`text-xs font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {pct}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    pct >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                    pct >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                    'bg-gradient-to-r from-red-400 to-red-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {profileCompletion.missing.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {profileCompletion.missing.slice(0, 4).map((m) => (
                    <Link key={m.key} href={m.href} className="flex items-center gap-2 text-xs text-gray-600 hover:text-[#1e3a5f] transition-colors group">
                      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                      <span className="group-hover:underline">{m.label}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-emerald-600 font-medium">Profile is complete!</p>
              )}
              <Link href="/agent/profile" className="mt-4 block w-full h-9 rounded-xl border border-gray-200 bg-gray-50 text-[#1e3a5f] text-xs font-semibold flex items-center justify-center hover:bg-gray-100 transition-colors">
                Edit Profile
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#1e3a5f] mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {access.properties ? (
                  <Link href="/properties/new"
                    className="flex items-center gap-3 w-full h-10 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold px-4 hover:bg-[#1e3a5f]/90 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Listing
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 w-full h-10 rounded-xl bg-gray-100 text-gray-400 text-sm font-semibold px-4 cursor-not-allowed">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Add Listing (Locked)
                  </div>
                )}
                <Link href="/agent/verification"
                  className="flex items-center gap-3 w-full h-10 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm font-semibold px-4 hover:bg-amber-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Verification Center
                </Link>
                <Link href={publicProfileHref}
                  className="flex items-center gap-3 w-full h-10 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold px-4 hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Public Profile
                </Link>
                <Link href="/contact"
                  className="flex items-center gap-3 w-full h-10 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold px-4 hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Support / Help
                </Link>
              </div>
            </div>

            {/* Next Steps guidance */}
            {!isLive && (
              <div className="bg-gradient-to-br from-[#1e3a5f] to-[#0c2340] rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-1">Get Fully Verified</h3>
                <p className="text-xs text-blue-200 mb-4">Complete verification to unlock all features and start listing properties.</p>
                <div className="space-y-2.5">
                  {[
                    { icon: '1', text: 'Complete your profile information' },
                    { icon: '2', text: 'Upload Government ID & License' },
                    { icon: '3', text: 'Submit for verification' },
                    { icon: '4', text: 'Get approved — all features unlock' },
                  ].map((step) => (
                    <div key={step.icon} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-white">{step.icon}</span>
                      </div>
                      <p className="text-xs text-blue-200 leading-relaxed">{step.text}</p>
                    </div>
                  ))}
                </div>
                <Link href="/agent/verification"
                  className="mt-5 block w-full h-9 rounded-xl bg-white text-[#1e3a5f] text-xs font-bold flex items-center justify-center hover:bg-gray-100 transition-colors">
                  Go to Verification →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
