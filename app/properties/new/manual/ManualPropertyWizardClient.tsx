'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

type DuplicateResult = {
  score: number
  level: 'none' | 'soft' | 'strong'
  match: null | {
    projectId: string
    score: number
    name: string
    developer: string
    distanceMeters?: number
    url?: string
  }
}

type MediaItem = {
  id: string
  category: string
  url: string
  altText?: string | null
}

type ManualProperty = {
  id: string
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  title?: string | null
  propertyType?: string | null
  intent?: 'SALE' | 'RENT' | null
  price?: number | null
  currency?: string | null
  constructionStatus?: 'READY' | 'OFF_PLAN' | null
  shortDescription?: string | null

  bedrooms?: number
  bathrooms?: number
  squareFeet?: number

  countryCode?: 'UAE' | 'India'
  city?: string | null
  community?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null

  developerName?: string | null

  amenities?: string[] | null
  customAmenities?: string[] | null

  paymentPlanText?: string | null
  emiNote?: string | null

  authorizedToMarket?: boolean
  exclusiveDeal?: boolean
  ownerContactOnFile?: boolean

  duplicateScore?: number | null
  duplicateMatchedProjectId?: string | null
  duplicateOverrideConfirmed?: boolean

  media?: MediaItem[]
}

type Step = 'basics' | 'location' | 'media' | 'amenities' | 'pricing' | 'declaration' | 'review'

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: any
  return (...args: Parameters<T>) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

function toNumber(v: string) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export default function ManualPropertyWizardClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const draftIdFromUrl = searchParams?.get('draft') || ''

  const [step, setStep] = useState<Step>('basics')
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [property, setProperty] = useState<ManualProperty | null>(null)
  const [duplicate, setDuplicate] = useState<DuplicateResult | null>(null)
  const [duplicateConfirm, setDuplicateConfirm] = useState(false)

  const [amenityIndex, setAmenityIndex] = useState<string[]>([])
  const [customAmenityInput, setCustomAmenityInput] = useState('')

  const propertyId = property?.id || ''

  const coverImages = useMemo(() => {
    const media = property?.media || []
    return media.filter((m) => m.category === 'COVER')
  }, [property?.media])

  const ensureDraft = async () => {
    if (creating) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/manual-properties', { method: 'POST' })
      const data = (await res.json()) as any
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to create draft')
      }
      const nextId = String(data.property.id)
      router.replace(`/properties/new/manual?draft=${encodeURIComponent(nextId)}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create draft')
    } finally {
      setCreating(false)
    }
  }

  const fetchDraft = async (id: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/manual-properties/${encodeURIComponent(id)}`)
      const data = (await res.json()) as any
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to load draft')
      }
      setProperty(data.property)
      setDuplicateConfirm(Boolean(data.property?.duplicateOverrideConfirmed))
      const score = Number(data.property?.duplicateScore || 0)
      if (score > 0) {
        setDuplicate({ score, level: score >= 75 ? 'strong' : score >= 50 ? 'soft' : 'none', match: null })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load draft')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!draftIdFromUrl) {
      ensureDraft()
      return
    }
    fetchDraft(draftIdFromUrl)
  }, [draftIdFromUrl])

  useEffect(() => {
    fetch('/api/amenities-index')
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j?.amenities)) setAmenityIndex(j.amenities)
      })
      .catch(() => null)
  }, [])

  const patch = async (data: Partial<ManualProperty>) => {
    if (!propertyId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/manual-properties/${encodeURIComponent(propertyId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = (await res.json()) as any
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to save')
      }
      setProperty(json.property)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const debouncedDuplicateCheck = useMemo(
    () =>
      debounce(async (draft: ManualProperty) => {
        if (!draft.title && !draft.latitude && !draft.community) {
          setDuplicate(null)
          return
        }
        try {
          const res = await fetch('/api/manual-properties/duplicate-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: draft.title || undefined,
              community: draft.community || undefined,
              city: draft.city || undefined,
              developerName: draft.developerName || undefined,
              latitude: typeof draft.latitude === 'number' ? draft.latitude : undefined,
              longitude: typeof draft.longitude === 'number' ? draft.longitude : undefined,
              price: typeof draft.price === 'number' ? draft.price : undefined,
            }),
          })
          const json = (await res.json()) as any
          const result = json?.result as DuplicateResult | undefined
          if (!result) return
          setDuplicate(result)

          if (propertyId) {
            const nextMatched = result.match?.projectId || null
            const curScore = typeof draft.duplicateScore === 'number' ? draft.duplicateScore : null
            const curMatched = draft.duplicateMatchedProjectId || null

            if (curScore !== result.score || curMatched !== nextMatched) {
              await patch({
                duplicateScore: result.score,
                duplicateMatchedProjectId: nextMatched,
              })
            }
          }
        } catch {
          return
        }
      }, 650),
    []
  )

  useEffect(() => {
    if (!property) return
    debouncedDuplicateCheck(property)
  }, [property?.title, property?.community, property?.developerName, property?.latitude, property?.longitude, property?.price])

  const upload = async (category: string, file: File) => {
    if (!propertyId) return
    setError('')
    try {
      const fd = new FormData()
      fd.set('file', file)
      const altGuess = `${property?.title || 'Property'} - ${category.toLowerCase().replace(/_/g, ' ')}`
      fd.set('altText', altGuess)

      const res = await fetch(
        `/api/manual-properties/upload?propertyId=${encodeURIComponent(propertyId)}&category=${encodeURIComponent(category)}`,
        { method: 'POST', body: fd }
      )
      const json = (await res.json()) as any
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Upload failed')
      }
      await fetchDraft(propertyId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  const submit = async () => {
    if (!propertyId) return
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/manual-properties/${encodeURIComponent(propertyId)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duplicateOverrideConfirmed: duplicateConfirm }),
      })
      const json = (await res.json()) as any
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to submit')
      }
      router.replace('/agent-portal')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit')
    } finally {
      setSaving(false)
    }
  }

  if (creating || loading || !draftIdFromUrl) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <p className="text-gray-600">Preparing your manual listing…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Manual Listing</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-dark-blue">Add Manual Property</h1>
            <p className="mt-2 text-sm text-gray-600">
              Agent-owned inventory is reviewed before going live. Verified projects remain separate.
            </p>
          </div>
          <Link href="/agent-portal" className="text-sm font-semibold text-dark-blue hover:underline">
            Back to Agent Portal
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {duplicate && duplicate.level !== 'none' ? (
          <div
            className={`mt-6 rounded-2xl border p-5 ${
              duplicate.level === 'strong' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
            }`}
          >
            <p className="font-semibold text-dark-blue">
              {duplicate.level === 'strong'
                ? 'This looks like an existing verified project.'
                : 'This property looks similar to an existing verified project.'}
            </p>
            <p className="mt-1 text-sm text-gray-700">Confidence: {duplicate.score}/100</p>
            {duplicate.match ? (
              <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
                <p className="font-semibold text-dark-blue">{duplicate.match.name}</p>
                <p className="text-sm text-gray-600 mt-1">{duplicate.match.developer || 'Verified project'}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {duplicate.match.url ? (
                    <Link href={duplicate.match.url} className="text-sm font-semibold text-dark-blue hover:underline">
                      View Verified Project
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
            {duplicate.level === 'strong' ? (
              <label className="mt-4 flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={duplicateConfirm}
                  onChange={(e) => {
                    setDuplicateConfirm(e.target.checked)
                    patch({ duplicateOverrideConfirmed: e.target.checked })
                  }}
                  className="mt-1"
                />
                <span>
                  I confirm this is a resale / individual unit and not a duplicate project.
                </span>
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            {([
              ['basics', 'Basics'],
              ['location', 'Location'],
              ['media', 'Media'],
              ['amenities', 'Amenities'],
              ['pricing', 'Pricing'],
              ['declaration', 'Declaration'],
              ['review', 'Review'],
            ] as Array<[Step, string]>).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setStep(k)}
                className={`px-3 py-2 rounded-xl border ${
                  step === k ? 'border-dark-blue bg-gray-50 text-dark-blue' : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-500">{saving ? 'Saving…' : 'Saved'}</span>
          </div>

          {step === 'basics' ? (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Property title</label>
                <input
                  value={property?.title || ''}
                  onChange={(e) => setProperty((p) => ({ ...(p as any), title: e.target.value }))}
                  onBlur={(e) => patch({ title: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dark-blue focus:border-dark-blue"
                  placeholder="e.g., 3BR Sea View Apartment in Dubai Marina"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Property type</label>
                <select
                  value={property?.propertyType || ''}
                  onChange={(e) => {
                    setProperty((p) => ({ ...(p as any), propertyType: e.target.value }))
                    patch({ propertyType: e.target.value || null })
                  }}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="">Select</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Villa">Villa</option>
                  <option value="Plot">Plot</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sale / Rent</label>
                <select
                  value={property?.intent || ''}
                  onChange={(e) => {
                    const v = e.target.value as any
                    setProperty((p) => ({ ...(p as any), intent: v || null }))
                    patch({ intent: v || null })
                  }}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="">Select</option>
                  <option value="SALE">Sale</option>
                  <option value="RENT">Rent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Price</label>
                <input
                  type="number"
                  min={0}
                  value={property?.price ?? ''}
                  onChange={(e) => setProperty((p) => ({ ...(p as any), price: toNumber(e.target.value) }))}
                  onBlur={(e) => patch({ price: toNumber(e.target.value) || null })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Currency</label>
                <select
                  value={property?.currency || 'AED'}
                  onChange={(e) => {
                    setProperty((p) => ({ ...(p as any), currency: e.target.value }))
                    patch({ currency: e.target.value })
                  }}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="AED">AED</option>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Property status</label>
                <select
                  value={property?.constructionStatus || ''}
                  onChange={(e) => {
                    const v = e.target.value as any
                    setProperty((p) => ({ ...(p as any), constructionStatus: v || null }))
                    patch({ constructionStatus: v || null })
                  }}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="">Select</option>
                  <option value="READY">Ready</option>
                  <option value="OFF_PLAN">Off-plan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bedrooms</label>
                <input
                  type="number"
                  min={0}
                  value={property?.bedrooms ?? 0}
                  onChange={(e) => {
                    const v = Math.max(0, Math.floor(toNumber(e.target.value)))
                    setProperty((p) => ({ ...(p as any), bedrooms: v }))
                    patch({ bedrooms: v })
                  }}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bathrooms</label>
                <input
                  type="number"
                  min={0}
                  value={property?.bathrooms ?? 0}
                  onChange={(e) => {
                    const v = Math.max(0, Math.floor(toNumber(e.target.value)))
                    setProperty((p) => ({ ...(p as any), bathrooms: v }))
                    patch({ bathrooms: v })
                  }}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Size (sq ft)</label>
                <input
                  type="number"
                  min={0}
                  value={property?.squareFeet ?? 0}
                  onChange={(e) => {
                    const v = Math.max(0, toNumber(e.target.value))
                    setProperty((p) => ({ ...(p as any), squareFeet: v }))
                    patch({ squareFeet: v })
                  }}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Developer (optional)</label>
                <input
                  value={property?.developerName || ''}
                  onChange={(e) => setProperty((p) => ({ ...(p as any), developerName: e.target.value }))}
                  onBlur={(e) => patch({ developerName: e.target.value || null })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300"
                  placeholder="e.g., Emaar"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Short description</label>
                <textarea
                  rows={6}
                  value={property?.shortDescription || ''}
                  onChange={(e) => setProperty((p) => ({ ...(p as any), shortDescription: e.target.value }))}
                  onBlur={(e) => patch({ shortDescription: e.target.value || null })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300"
                  placeholder="Write a premium, factual summary (no spam)."
                />
              </div>
            </div>
          ) : null}

          {step === 'location' ? (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                <select
                  value={property?.countryCode || 'UAE'}
                  onChange={(e) => {
                    const v = e.target.value as any
                    setProperty((p) => ({ ...(p as any), countryCode: v }))
                    patch({ countryCode: v })
                  }}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="UAE">UAE</option>
                  <option value="India">India</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                <input
                  value={property?.city || ''}
                  onChange={(e) => setProperty((p) => ({ ...(p as any), city: e.target.value }))}
                  onBlur={(e) => patch({ city: e.target.value || null })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300"
                  placeholder="e.g., Dubai"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Community / Area</label>
                <input
                  value={property?.community || ''}
                  onChange={(e) => setProperty((p) => ({ ...(p as any), community: e.target.value }))}
                  onBlur={(e) => patch({ community: e.target.value || null })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300"
                  placeholder="e.g., Dubai Marina"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address (optional)</label>
                <input
                  value={property?.address || ''}
                  onChange={(e) => setProperty((p) => ({ ...(p as any), address: e.target.value }))}
                  onBlur={(e) => patch({ address: e.target.value || null })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Latitude (required)</label>
                <input
                  type="number"
                  value={property?.latitude ?? ''}
                  onChange={(e) => setProperty((p) => ({ ...(p as any), latitude: Number(e.target.value) }))}
                  onBlur={(e) => patch({ latitude: Number(e.target.value) || null })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Longitude (required)</label>
                <input
                  type="number"
                  value={property?.longitude ?? ''}
                  onChange={(e) => setProperty((p) => ({ ...(p as any), longitude: Number(e.target.value) }))}
                  onBlur={(e) => patch({ longitude: Number(e.target.value) || null })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300"
                />
              </div>

              <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm text-gray-600">
                  Coordinates are required for map view & search. Tip: open Google Maps, drop a pin, and paste lat/lng here.
                </p>
                {typeof property?.latitude === 'number' && typeof property?.longitude === 'number' ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                    <iframe
                      title="Manual property location"
                      className="w-full h-[320px]"
                      loading="lazy"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(`${property.latitude},${property.longitude}`)}&z=15&output=embed`}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 'media' ? (
            <div className="mt-8 space-y-6">
              {([
                ['COVER', 'Cover image (required)', true],
                ['EXTERIOR', 'Architecture / Exterior', false],
                ['INTERIOR', 'Interior', false],
                ['FLOOR_PLANS', 'Floor plans', false],
                ['AMENITIES', 'Amenities images', false],
                ['BROCHURE', 'Marketing brochure (PDF)', false],
              ] as Array<[string, string, boolean]>).map(([cat, label, req]) => (
                <div key={cat} className="rounded-2xl border border-gray-200 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-dark-blue">{label}</p>
                      {req ? <p className="text-xs text-gray-600 mt-1">Required</p> : null}
                    </div>
                    <label className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 cursor-pointer">
                      Upload
                      <input
                        type="file"
                        className="hidden"
                        accept={cat === 'BROCHURE' ? 'application/pdf' : 'image/*'}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) upload(cat, f)
                          e.currentTarget.value = ''
                        }}
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(property?.media || []).filter((m) => m.category === cat).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
                        <p className="text-sm text-gray-600">No uploads yet.</p>
                      </div>
                    ) : (
                      (property?.media || [])
                        .filter((m) => m.category === cat)
                        .slice(0, 6)
                        .map((m) => (
                          <a key={m.id} href={m.url} target="_blank" className="rounded-xl border border-gray-200 bg-white p-3 hover:bg-gray-50">
                            <p className="text-xs font-semibold text-dark-blue truncate">{m.url.split('/').slice(-1)[0]}</p>
                            <p className="text-xs text-gray-500 mt-1 truncate">{m.altText || 'Alt text pending'}</p>
                          </a>
                        ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {step === 'amenities' ? (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Select amenities</p>
                <div className="rounded-2xl border border-gray-200 p-4 max-h-[360px] overflow-auto">
                  {amenityIndex.length === 0 ? (
                    <p className="text-sm text-gray-600">Loading amenities…</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {amenityIndex.slice(0, 120).map((a) => {
                        const selected = (property?.amenities || []).includes(a)
                        return (
                          <label key={a} className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => {
                                const next = new Set(property?.amenities || [])
                                if (e.target.checked) next.add(a)
                                else next.delete(a)
                                const list = Array.from(next)
                                setProperty((p) => ({ ...(p as any), amenities: list }))
                                patch({ amenities: list })
                              }}
                            />
                            <span>{a}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Custom amenities (max 5, admin review)</p>
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex gap-2">
                    <input
                      value={customAmenityInput}
                      onChange={(e) => setCustomAmenityInput(e.target.value)}
                      className="flex-1 h-11 px-4 rounded-xl border border-gray-300"
                      placeholder="e.g., Private elevator"
                    />
                    <button
                      type="button"
                      className="h-11 px-4 rounded-xl bg-dark-blue text-white font-semibold"
                      onClick={() => {
                        const next = new Set(property?.customAmenities || [])
                        const v = customAmenityInput.trim()
                        if (!v) return
                        if (next.size >= 5) return
                        next.add(v)
                        const list = Array.from(next)
                        setProperty((p) => ({ ...(p as any), customAmenities: list }))
                        patch({ customAmenities: list })
                        setCustomAmenityInput('')
                      }}
                    >
                      Add
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(property?.customAmenities || []).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => {
                          const list = (property?.customAmenities || []).filter((x) => x !== a)
                          setProperty((p) => ({ ...(p as any), customAmenities: list }))
                          patch({ customAmenities: list })
                        }}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200"
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step === 'pricing' ? (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment plan text (optional)</label>
                <textarea
                  rows={5}
                  value={property?.paymentPlanText || ''}
                  onChange={(e) => setProperty((p) => ({ ...(p as any), paymentPlanText: e.target.value }))}
                  onBlur={(e) => patch({ paymentPlanText: e.target.value || null })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">EMI note (optional)</label>
                <input
                  value={property?.emiNote || ''}
                  onChange={(e) => setProperty((p) => ({ ...(p as any), emiNote: e.target.value }))}
                  onBlur={(e) => patch({ emiNote: e.target.value || null })}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300"
                />
              </div>
            </div>
          ) : null}

          {step === 'declaration' ? (
            <div className="mt-8 space-y-5">
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(property?.authorizedToMarket)}
                  onChange={(e) => {
                    setProperty((p) => ({ ...(p as any), authorizedToMarket: e.target.checked }))
                    patch({ authorizedToMarket: e.target.checked })
                  }}
                  className="mt-1"
                />
                <span>
                  I confirm I am authorized to market this property.
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(property?.exclusiveDeal)}
                  onChange={(e) => {
                    setProperty((p) => ({ ...(p as any), exclusiveDeal: e.target.checked }))
                    patch({ exclusiveDeal: e.target.checked })
                  }}
                  className="mt-1"
                />
                <span>Exclusive deal badge (optional)</span>
              </label>

              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(property?.ownerContactOnFile)}
                  onChange={(e) => {
                    setProperty((p) => ({ ...(p as any), ownerContactOnFile: e.target.checked }))
                    patch({ ownerContactOnFile: e.target.checked })
                  }}
                  className="mt-1"
                />
                <span>Owner contact on file (hidden from public)</span>
              </label>
            </div>
          ) : null}

          {step === 'review' ? (
            <div className="mt-8 space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
                <p className="text-sm font-semibold text-dark-blue">Preview</p>
                <p className="mt-2 text-2xl font-serif font-bold text-dark-blue">
                  {property?.title || 'Untitled property'}
                </p>
                <p className="mt-2 text-gray-600">
                  {(property?.city || 'City')} · {(property?.community || 'Community')}
                </p>
                <p className="mt-4 text-sm text-gray-700">{property?.shortDescription || 'Short description pending.'}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-dark-blue border border-gray-200">
                    Agent Listing
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-gray-700 border border-gray-200">
                    Status: {property?.status}
                  </span>
                  {coverImages.length > 0 ? (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-800 border border-green-200">
                      Cover uploaded
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
                      Cover required
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={saving || (duplicate?.level === 'strong' && !duplicateConfirm)}
                className="w-full h-12 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90 disabled:opacity-50"
              >
                Submit for review
              </button>

              <p className="text-xs text-gray-500">
                Your listing will be reviewed before it appears publicly.
              </p>
            </div>
          ) : null}

          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const order: Step[] = ['basics', 'location', 'media', 'amenities', 'pricing', 'declaration', 'review']
                const idx = Math.max(0, order.indexOf(step) - 1)
                setStep(order[idx])
              }}
              className="h-11 px-5 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                const order: Step[] = ['basics', 'location', 'media', 'amenities', 'pricing', 'declaration', 'review']
                const idx = Math.min(order.length - 1, order.indexOf(step) + 1)
                setStep(order[idx])
              }}
              className="h-11 px-5 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
