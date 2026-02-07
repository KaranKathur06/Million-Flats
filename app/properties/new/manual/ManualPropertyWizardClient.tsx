'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'
import { buildPropertySlugPath } from '@/lib/seo'

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
  rejectionReason?: string | null
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

  tour3dUrl?: string | null

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

const LAST_MANUAL_DRAFT_KEY = 'millionflats:last_manual_draft_id'

function toNumber(v: string) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export default function ManualPropertyWizardClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const draftIdFromUrl = searchParams?.get('draft') || ''
  const didAutoLoadDraftRef = useRef(false)
  const didAutoCreateDraftRef = useRef(false)

  const [step, setStep] = useState<Step>('basics')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loadingDraft, setLoadingDraft] = useState(false)
  const [uploadingCategory, setUploadingCategory] = useState<string>('')
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<Record<string, string>>({})
  const [mediaBusyId, setMediaBusyId] = useState<string>('')

  const [property, setProperty] = useState<ManualProperty>(() => ({
    id: '',
    status: 'DRAFT',
    currency: 'AED',
    bedrooms: 0,
    bathrooms: 0,
    squareFeet: 0,
    countryCode: 'UAE',
    authorizedToMarket: false,
    exclusiveDeal: false,
    ownerContactOnFile: false,
    amenities: [],
    customAmenities: [],
    media: [],
    tour3dUrl: null,
  }))
  const [duplicate, setDuplicate] = useState<DuplicateResult | null>(null)
  const [duplicateConfirm, setDuplicateConfirm] = useState(false)

  const [amenityIndex, setAmenityIndex] = useState<string[]>([])
  const [customAmenityInput, setCustomAmenityInput] = useState('')

  const propertyId = property?.id || ''
  const propertyRef = useRef(property)
  const lastAutosaveFingerprintRef = useRef<string>('')
  const didHydrateFromServerRef = useRef(false)

  useEffect(() => {
    propertyRef.current = property
  }, [property])

  const rememberDraftId = useCallback((id: string) => {
    if (!id) return
    try {
      window.localStorage.setItem(LAST_MANUAL_DRAFT_KEY, id)
    } catch {
      return
    }
  }, [])

  const statusBanner = useMemo(() => {
    if (!property) return null
    if (property.status === 'APPROVED') {
      return (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-semibold text-green-800">Your property has been approved and is now live.</p>
          <div className="mt-3">
            <Link
              href={buildPropertySlugPath({ id: property.id, title: String(property.title || 'Agent Listing') }) || `/properties/${encodeURIComponent(property.id)}`}
              className="text-sm font-semibold text-dark-blue hover:underline"
            >
              View public listing
            </Link>
          </div>
        </div>
      )
    }

    if (property.status === 'REJECTED') {
      const reason = String(property.rejectionReason || '').trim()
      return (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-800">Your property was rejected for the following reason:</p>
          <p className="mt-2 text-sm text-red-800">{reason || 'No reason provided.'}</p>
          <p className="mt-3 text-xs text-red-700">You can edit and resubmit. Resubmission returns the listing to review.</p>
        </div>
      )
    }

    if (property.status === 'PENDING_REVIEW') {
      return (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm font-semibold text-dark-blue">Your property is under review.</p>
          <p className="mt-2 text-xs text-gray-600">Manual listings are not publicly visible until approved.</p>
        </div>
      )
    }

    return null
  }, [property])

  const coverImages = useMemo(() => {
    const media = property?.media || []
    return media.filter((m) => m.category === 'COVER')
  }, [property?.media])

  const getPreviewUrl = useCallback(
    (m: any) => {
      const id = String(m?.id || '')
      if (id && mediaPreviewUrls[id]) return mediaPreviewUrls[id]
      return String(m?.url || '')
    },
    [mediaPreviewUrls]
  )

  useEffect(() => {
    const media = Array.isArray(property?.media) ? property?.media : []
    if (media.length === 0) return

    const missing = media
      .map((m: any) => ({ id: String(m?.id || ''), url: String(m?.url || '') }))
      .filter((m: any) => m.id && m.url && !mediaPreviewUrls[m.id] && m.url.includes('.amazonaws.com/'))

    if (missing.length === 0) return

    let cancelled = false

    Promise.allSettled(
      missing.map(async (m: any) => {
        const res = await fetch('/api/media/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: m.url, expiresInSeconds: 900 }),
        })
        const json = (await res.json()) as any
        if (!res.ok || !json?.success || !json?.url) return null
        return { id: m.id, signedUrl: String(json.url) }
      })
    ).then((results) => {
      if (cancelled) return
      const updates: Record<string, string> = {}
      for (const r of results) {
        if (r.status !== 'fulfilled') continue
        const v = r.value
        if (!v) continue
        updates[v.id] = v.signedUrl
      }
      if (Object.keys(updates).length > 0) {
        setMediaPreviewUrls((prev) => ({ ...prev, ...updates }))
      }
    })

    return () => {
      cancelled = true
    }
  }, [mediaPreviewUrls, property?.media])

  const isBlankDraft = (p: ManualProperty) => {
    return !p.id && !p.title && !p.city && !p.community && typeof p.price !== 'number' && (p.media?.length || 0) === 0
  }

  const fetchDraft = useCallback(async (id: string, opts?: { mode?: 'auto' | 'manual' }) => {
    setLoadingDraft(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch(`/api/manual-properties/${encodeURIComponent(id)}`)
      const data = (await res.json()) as any
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to load draft')
      }

      const mode = opts?.mode || 'manual'
      const local = propertyRef.current
      const canAutoApply = mode === 'manual' || isBlankDraft(local)

      if (!canAutoApply) {
        setNotice('Draft found in URL. Click “Load Draft” to restore it (this will overwrite the current form).')
        return
      }

      setProperty(data.property)
      didHydrateFromServerRef.current = true
      rememberDraftId(String(data.property?.id || id))
      if (!draftIdFromUrl && String(data.property?.id || '')) {
        router.replace(`/properties/new/manual?draft=${encodeURIComponent(String(data.property.id))}`)
      }
      setDuplicateConfirm(Boolean(data.property?.duplicateOverrideConfirmed))
      const score = Number(data.property?.duplicateScore || 0)
      if (score > 0) {
        setDuplicate({ score, level: score >= 75 ? 'strong' : score >= 50 ? 'soft' : 'none', match: null })
      } else {
        setDuplicate(null)
      }
      setNotice('Draft loaded.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load draft')
    } finally {
      setLoadingDraft(false)
    }
  }, [draftIdFromUrl, rememberDraftId, router])

  useEffect(() => {
    if (!draftIdFromUrl) return
    if (propertyId) return
    if (didAutoLoadDraftRef.current) return
    didAutoLoadDraftRef.current = true
    fetchDraft(draftIdFromUrl, { mode: 'auto' })
  }, [draftIdFromUrl, fetchDraft, propertyId])

  useEffect(() => {
    if (step !== 'amenities') return
    if (amenityIndex.length > 0) return
    fetch('/api/amenities-index')
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j?.amenities)) setAmenityIndex(j.amenities)
      })
      .catch(() => null)
  }, [step, amenityIndex.length])

  const patchById = useCallback(async (id: string, data: Partial<ManualProperty>) => {
    setSaving(true)
    setNotice('')
    try {
      const res = await fetch(`/api/manual-properties/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = (await res.json()) as any
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to save')
      }
      setProperty(json.property)
      didHydrateFromServerRef.current = true
      return json.property as ManualProperty
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
      return null
    } finally {
      setSaving(false)
    }
  }, [])

  const buildSavePayload = useCallback((): Partial<ManualProperty> => {
    return {
      title: property.title ?? null,
      propertyType: property.propertyType ?? null,
      intent: property.intent ?? null,
      price: typeof property.price === 'number' ? property.price : null,
      currency: property.currency || 'AED',
      constructionStatus: property.constructionStatus ?? null,
      shortDescription: property.shortDescription ?? null,
      bedrooms: typeof property.bedrooms === 'number' ? property.bedrooms : 0,
      bathrooms: typeof property.bathrooms === 'number' ? property.bathrooms : 0,
      squareFeet: typeof property.squareFeet === 'number' ? property.squareFeet : 0,
      countryCode: property.countryCode || 'UAE',
      city: property.city ?? null,
      community: property.community ?? null,
      address: property.address ?? null,
      latitude: typeof property.latitude === 'number' ? property.latitude : null,
      longitude: typeof property.longitude === 'number' ? property.longitude : null,
      developerName: property.developerName ?? null,
      amenities: Array.isArray(property.amenities) ? property.amenities : null,
      customAmenities: Array.isArray(property.customAmenities) ? property.customAmenities : null,
      paymentPlanText: property.paymentPlanText ?? null,
      emiNote: property.emiNote ?? null,
      authorizedToMarket: Boolean(property.authorizedToMarket),
      exclusiveDeal: Boolean(property.exclusiveDeal),
      ownerContactOnFile: Boolean(property.ownerContactOnFile),
      duplicateOverrideConfirmed: Boolean(duplicateConfirm),
      duplicateScore: typeof property.duplicateScore === 'number' ? property.duplicateScore : null,
      duplicateMatchedProjectId: property.duplicateMatchedProjectId ?? null,
      tour3dUrl: property.tour3dUrl ?? null,
    }
  }, [duplicateConfirm, property])

  const patch = useCallback(async (data: Partial<ManualProperty>) => {
    if (!propertyId) return
    await patchById(propertyId, data)
  }, [patchById, propertyId])

  const ensureRemoteDraft = useCallback(async () => {
    if (propertyId) return propertyId
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/manual-properties', { method: 'POST' })
      const data = (await res.json()) as any
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to create draft')
      }
      const nextId = String(data.property.id)
      setProperty((p) => ({ ...(p as any), id: nextId, status: data.property.status || 'DRAFT' }))
      router.replace(`/properties/new/manual?draft=${encodeURIComponent(nextId)}`)
      rememberDraftId(nextId)
      return nextId
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create draft')
      return ''
    } finally {
      setSaving(false)
    }
  }, [propertyId, rememberDraftId, router])

  useEffect(() => {
    if (draftIdFromUrl) return
    if (propertyId) return
    if (didAutoCreateDraftRef.current) return
    didAutoCreateDraftRef.current = true

    let remembered = ''
    try {
      remembered = String(window.localStorage.getItem(LAST_MANUAL_DRAFT_KEY) || '')
    } catch {
      remembered = ''
    }

    if (remembered) {
      fetchDraft(remembered, { mode: 'auto' })
      return
    }

    void ensureRemoteDraft()
  }, [draftIdFromUrl, ensureRemoteDraft, fetchDraft, propertyId])

  const autosave = useMemo(
    () =>
      debounce(async (id: string, payload: Partial<ManualProperty>, fingerprint: string) => {
        if (!id) return
        if (!didHydrateFromServerRef.current) return
        if (lastAutosaveFingerprintRef.current === fingerprint) return
        lastAutosaveFingerprintRef.current = fingerprint
        await patchById(id, payload)
      }, 1200),
    [patchById]
  )

  useEffect(() => {
    if (!propertyId) return
    if (saving) return
    if (loadingDraft) return
    if (property?.status && property.status !== 'DRAFT' && property.status !== 'REJECTED') return

    const payload = buildSavePayload()
    const fingerprint = JSON.stringify(payload)
    autosave(propertyId, payload, fingerprint)
  }, [autosave, buildSavePayload, loadingDraft, property?.status, propertyId, saving])

  const saveDraft = async () => {
    setError('')
    setNotice('')
    const id = await ensureRemoteDraft()
    if (!id) return

    const saved = await patchById(id, buildSavePayload())
    if (saved) setNotice('Draft saved.')
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
    [patch, propertyId]
  )

  useEffect(() => {
    if (!property) return
    debouncedDuplicateCheck(property)
  }, [debouncedDuplicateCheck, property])

  const categoryToType = (category: string) => {
    const c = String(category || '').toUpperCase()
    if (c === 'COVER') return 'cover'
    if (c === 'EXTERIOR') return 'exterior'
    if (c === 'INTERIOR') return 'interior'
    if (c === 'FLOOR_PLANS') return 'floorplan'
    if (c === 'VIDEO') return 'video'
    if (c === 'AMENITIES') return 'amenities'
    if (c === 'BROCHURE') return 'brochure'
    return 'interior'
  }

  const upload = async (category: string, file: File) => {
    if (!propertyId) {
      setError('Save draft to start uploading media')
      return
    }
    setError('')
    setUploadingCategory(category)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const altGuess = `${property?.title || 'Property'} - ${category.toLowerCase().replace(/_/g, ' ')}`
      fd.set('altText', altGuess)
      fd.set('propertyId', propertyId)
      fd.set('type', categoryToType(category))

      const res = await fetch(
        '/api/manual-properties/upload',
        { method: 'POST', body: fd }
      )
      const json = (await res.json()) as any
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Upload failed')
      }
      if (Array.isArray(json?.media)) {
        setProperty((p) => ({ ...(p as any), media: json.media }))
      } else {
        await fetchDraft(propertyId)
      }
      setNotice('Uploaded successfully')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingCategory('')
    }
  }

  const deleteMedia = useCallback(
    async (mediaId: string) => {
      if (!propertyId) return
      if (!mediaId) return
      const ok = window.confirm('Remove this upload?')
      if (!ok) return

      setError('')
      setMediaBusyId(mediaId)
      try {
        const res = await fetch(`/api/manual-properties/media/${encodeURIComponent(mediaId)}`, { method: 'DELETE' })
        const json = (await res.json()) as any
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || 'Failed to delete')
        }

        if (Array.isArray(json?.media)) {
          setProperty((p) => ({ ...(p as any), media: json.media }))
        } else {
          await fetchDraft(propertyId)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete')
      } finally {
        setMediaBusyId('')
      }
    },
    [fetchDraft, propertyId]
  )

  const submit = async () => {
    setError('')
    setSaving(true)
    try {
      const id = await ensureRemoteDraft()
      if (!id) return

      const saved = await patchById(id, buildSavePayload())
      if (!saved) return

      const res = await fetch(`/api/manual-properties/${encodeURIComponent(id)}/submit`, {
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

        {statusBanner}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveDraft}
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90"
            disabled={saving}
          >
            Save Draft
          </button>

          {draftIdFromUrl && !propertyId ? (
            <button
              type="button"
              onClick={() => fetchDraft(draftIdFromUrl, { mode: 'manual' })}
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
              disabled={loadingDraft || saving}
            >
              {loadingDraft ? 'Loading…' : 'Load Draft'}
            </button>
          ) : null}
        </div>

        {notice ? (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</div>
        ) : null}

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
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-dark-blue">Property video (optional)</p>
                    <p className="text-xs text-gray-600 mt-1">MP4 or WebM (max 50MB).</p>
                  </div>
                  <label
                    className={`inline-flex items-center justify-center h-11 px-5 rounded-xl font-semibold cursor-pointer ${
                      !propertyId
                        ? 'bg-gray-200 text-gray-500 pointer-events-none'
                        : uploadingCategory === 'VIDEO'
                          ? 'bg-dark-blue text-white opacity-60 pointer-events-none'
                          : 'bg-dark-blue text-white hover:bg-dark-blue/90'
                    }`}
                  >
                    {uploadingCategory === 'VIDEO' ? 'Uploading…' : 'Upload'}
                    <input
                      type="file"
                      className="hidden"
                      accept="video/mp4,video/webm"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) upload('VIDEO', f)
                        e.currentTarget.value = ''
                      }}
                    />
                  </label>
                </div>

                {!propertyId ? <p className="mt-3 text-xs text-gray-600">Save draft to start uploading media</p> : null}

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(property?.media || []).filter((m) => m.category === 'VIDEO').length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
                      <p className="text-sm text-gray-600">No video uploaded.</p>
                    </div>
                  ) : (
                    (property?.media || [])
                      .filter((m) => m.category === 'VIDEO')
                      .slice(0, 2)
                      .map((m) => (
                        <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-3">
                          <a href={getPreviewUrl(m)} target="_blank" className="block hover:underline">
                            <p className="text-xs font-semibold text-dark-blue truncate">{String(m.url || '').split('/').slice(-1)[0]}</p>
                          </a>
                          <p className="text-xs text-gray-500 mt-1 truncate">{m.altText || 'Video'}</p>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="text-xs text-gray-500">
                              {typeof (m as any).sizeBytes === 'number' ? `${Math.round(((m as any).sizeBytes / (1024 * 1024)) * 10) / 10} MB` : ''}
                            </p>
                            <button
                              type="button"
                              disabled={mediaBusyId === m.id}
                              onClick={() => deleteMedia(String(m.id))}
                              className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-60"
                            >
                              {mediaBusyId === m.id ? 'Removing…' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-5">
                <p className="font-semibold text-dark-blue">3D tour link (optional)</p>
                <p className="text-xs text-gray-600 mt-1">Add a hosted 3D walkthrough URL (Matterport, etc.).</p>
                <div className="mt-4">
                  <input
                    value={property?.tour3dUrl || ''}
                    onChange={(e) => setProperty((p) => ({ ...(p as any), tour3dUrl: e.target.value }))}
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if (!v) {
                        patch({ tour3dUrl: null })
                        return
                      }
                      try {
                        const u = new URL(v)
                        if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('invalid')
                        patch({ tour3dUrl: v })
                      } catch {
                        setError('Please enter a valid URL (must start with http:// or https://).')
                      }
                    }}
                    placeholder="https://…"
                    className="w-full h-12 px-4 rounded-xl border border-gray-300"
                  />
                </div>
              </div>

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
                    <label
                      className={`inline-flex items-center justify-center h-11 px-5 rounded-xl font-semibold cursor-pointer ${
                        !propertyId
                          ? 'bg-gray-200 text-gray-500 pointer-events-none'
                          : uploadingCategory === cat
                            ? 'bg-dark-blue text-white opacity-60 pointer-events-none'
                            : 'bg-dark-blue text-white hover:bg-dark-blue/90'
                      }`}
                    >
                      {uploadingCategory === cat ? 'Uploading…' : 'Upload'}
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

                  {!propertyId ? <p className="mt-3 text-xs text-gray-600">Save draft to start uploading media</p> : null}

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
                          <div key={m.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            {cat === 'BROCHURE' ? (
                              <a href={getPreviewUrl(m)} target="_blank" className="block p-3 hover:bg-gray-50">
                                <p className="text-xs font-semibold text-dark-blue truncate">{String(m.url || '').split('/').slice(-1)[0]}</p>
                                <p className="text-xs text-gray-500 mt-1 truncate">{m.altText || 'PDF brochure'}</p>
                              </a>
                            ) : (
                              <a href={getPreviewUrl(m)} target="_blank" className="block">
                                <div className="relative w-full h-32">
                                  <Image
                                    src={getPreviewUrl(m)}
                                    alt={m.altText || label}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              </a>
                            )}
                            <div className="p-3 flex items-center justify-between gap-3">
                              <p className="text-xs text-gray-500 truncate">{m.altText || 'Alt text pending'}</p>
                              <button
                                type="button"
                                disabled={mediaBusyId === m.id}
                                onClick={() => deleteMedia(String(m.id))}
                                className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-60"
                              >
                                {mediaBusyId === m.id ? 'Removing…' : 'Remove'}
                              </button>
                            </div>
                          </div>
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
