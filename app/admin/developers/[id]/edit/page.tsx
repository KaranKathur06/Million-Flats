'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DeveloperForm from '@/components/admin/DeveloperForm'
import type { DeveloperFormData } from '@/components/admin/DeveloperForm'

interface Props {
  params: { id: string }
}

export default function AdminEditDeveloperPage({ params }: Props) {
  const router = useRouter()
  const [developer, setDeveloper] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/admin/developers/${params.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message || 'Not found')
        setDeveloper(json.developer)
      })
      .catch((err) => setError(err.message || 'Failed to load developer'))
      .finally(() => setLoading(false))
  }, [params.id])

  const initialFormData: Partial<DeveloperFormData> = developer
    ? {
        name: developer.name || '',
        slug: developer.slug || '',
        countryCode: developer.countryCode || 'UAE',
        countryIso2: developer.countryIso2 || 'AE',
        city: developer.city || '',
        logo: developer.logo || '',
        banner: developer.banner || '',
        shortDescription: developer.shortDescription || '',
        description: developer.description || '',
        website: developer.website || '',
        foundedYear: developer.foundedYear ? String(developer.foundedYear) : '',
        isFeatured: developer.isFeatured ?? false,
        featuredRank: developer.featuredRank ? String(developer.featuredRank) : '',
        status: developer.status || 'ACTIVE',
      }
    : {}

  return (
    <div className="max-w-4xl">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/admin/developers"
            className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Developers
          </Link>
          <span className="text-white/20 text-xs">/</span>
          <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Edit
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white/95">
          {loading ? 'Loading…' : developer ? `Edit: ${developer.name}` : 'Developer not found'}
        </h1>
        {developer && (
          <div className="mt-2 flex items-center gap-3">
            <p className="text-sm text-white/40">
              ID: <span className="font-mono text-white/30 text-xs">{developer.id}</span>
            </p>
            {developer.slug && (
              <Link
                href={`/developers/${developer.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200 transition-colors"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Public Profile
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── States ── */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-20 text-white/40">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading developer profile…</span>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">
          <p className="font-semibold mb-1">Error loading developer</p>
          <p className="text-red-300/70">{error}</p>
          <button
            onClick={() => router.push('/admin/developers')}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-300 hover:text-red-200 underline"
          >
            ← Back to Developers
          </button>
        </div>
      )}

      {/* ── Form ── */}
      {developer && !loading && (
        <DeveloperForm
          isEditMode
          developerId={params.id}
          initial={initialFormData}
        />
      )}
    </div>
  )
}
