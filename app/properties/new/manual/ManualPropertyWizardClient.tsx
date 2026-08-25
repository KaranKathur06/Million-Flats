'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import { useSession } from 'next-auth/react'
import { nanoid } from 'nanoid'
import { buildPropertySlugPath } from '@/lib/seo'
import GlobalDropdown from '@/components/ui/GlobalDropdown'
import { singleDropdownValue } from '@/components/ui/dropdownUtils'
import { trackEvent } from '@/lib/tracking'
import toast, { Toaster } from 'react-hot-toast'
import ManualPropertyMediaManager from '@/components/manual/ManualPropertyMediaManager'
import ManualPropertyAmenities from '@/components/manual/ManualPropertyAmenities'
import ManualPropertyPreview from '@/components/ManualPropertyPreview'
import PaymentPlanBuilder from '@/components/PaymentPlanBuilder'
import {
  calculateManualListingQuality,
  categoryForPropertyType,
  countryIso2ForCountry,
  defaultCurrencyForCountry,
  MANUAL_AMENITY_GROUPS,
  MANUAL_PROPERTY_CATEGORIES,
  propertyTypesForCategory,
  suggestManualPropertyTitle,
  validateManualPropertyStep,
  type ManualPropertyCategory,
  normalizePaymentPlan,
  parseLegacyPaymentPlanText,
  paymentPlanValidation,
  type PaymentPlanStage,
} from '@/lib/manualPropertyForm'

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
  position?: number
}

type VerificationDocument = {
  id: string
  category: string
  mimeType?: string | null
  sizeBytes?: number | null
  uploadStatus?: string
  verificationStatus?: string
}

type ValuationSummary = {
  fairValue?: { min?: number; mid?: number; max?: number; currency?: string }
  confidence?: number
  marketPosition?: string
  askingPrice?: number | null
}

type ManualProperty = {
  id: string
  updatedAt?: string | Date | null
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED'
  rejectionReason?: string | null
  title?: string | null
  category?: ManualPropertyCategory | null
  propertyType?: string | null
  intent?: 'SALE' | 'RENT' | null
  price?: number | null
  currency?: string | null
  negotiable?: boolean | null
  bookingAmount?: number | null
  maintenanceCharges?: number | null
  otherCharges?: number | null
  annualRent?: number | null
  securityDeposit?: number | null
  agencyFee?: number | null
  utilitiesIncluded?: boolean | null
  availableFrom?: string | null
  leaseDurationMonths?: number | null
  paymentFrequency?: string | null
  preferredTenantType?: string | null
  petFriendly?: boolean | null
  carpetArea?: number | null
  plotArea?: number | null
  balconyCount?: number | null
  parkingSpaces?: number | null
  propertyAgeYears?: number | null
  floorNumber?: number | null
  totalFloors?: number | null
  facing?: string | null
  view?: string | null
  furnishingStatus?: string | null
  propertyCondition?: string | null
  possessionDate?: string | null
  constructionStatus?: 'READY' | 'OFF_PLAN' | null
  shortDescription?: string | null

  bedrooms?: number
  bathrooms?: number
  squareFeet?: number

  countryCode?: 'UAE' | 'India'
  countryIso2?: 'AE' | 'IN' | null
  city?: string | null
  region?: string | null
  community?: string | null
  locality?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  locationPrecision?: 'EXACT' | 'APPROXIMATE' | null
  publicLocationVisible?: boolean | null

  developerName?: string | null

  amenities?: string[] | null
  customAmenities?: string[] | null

  paymentPlan?: unknown
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
  lastCompletedStep?: Step
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
const STEP_ORDER: Step[] = ['basics', 'location', 'media', 'amenities', 'pricing', 'declaration', 'review']

function toNumber(v: string) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export default function ManualPropertyWizardClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const draftIdFromUrl = searchParams?.get('draft') || searchParams?.get('draftId') || ''
  const modeFromUrl = (searchParams?.get('mode') || '').toLowerCase()
  const didAutoLoadDraftRef = useRef(false)
  const didAutoCreateDraftRef = useRef(false)
  const hydratedDraftIdRef = useRef<string>('')
  const trackedStartRef = useRef(false)

  const safeJson = useCallback(async (res: Response) => {
    try {
      return await res.json()
    } catch {
      return null
    }
  }, [])

  const [step, setStep] = useState<Step>('basics')
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loadingDraft, setLoadingDraft] = useState(false)
  const [uploadingCategory, setUploadingCategory] = useState<string>('')
  const [failedUploads, setFailedUploads] = useState<Record<string, File[]>>({})
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<Record<string, string>>({})
  const [mediaBusyId, setMediaBusyId] = useState<string>('')
  const [resumeDraftId, setResumeDraftId] = useState<string>('')

  useEffect(() => {
    if (modeFromUrl === 'edit') {
      setStep('basics')
    }
  }, [modeFromUrl])

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
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [verificationDocuments, setVerificationDocuments] = useState<VerificationDocument[]>([])
  const [documentCategory, setDocumentCategory] = useState('OWNERSHIP_PROOF')
  const [documentBusy, setDocumentBusy] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [locationResults, setLocationResults] = useState<Array<{ displayName: string; latitude: number; longitude: number }>>([])
  const [locationSearching, setLocationSearching] = useState(false)
  const [valuation, setValuation] = useState<ValuationSummary | null>(null)
  const [valuationLoading, setValuationLoading] = useState(false)
  const [valuationError, setValuationError] = useState('')
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    if (trackedStartRef.current) return
    trackedStartRef.current = true
    trackEvent('listing_started', { workflow: 'manual_property_v2' })
  }, [])

  useEffect(() => {
    if (step === 'review') trackEvent('listing_review_opened', { workflow: 'manual_property_v2' })
  }, [step])

  const propertyId = property?.id || ''
  const propertyRef = useRef(property)
  const lastAutosaveFingerprintRef = useRef<string>('')
  const didHydrateFromServerRef = useRef(false)
  const patchQueueRef = useRef(Promise.resolve())
  const skipNextAutosaveRef = useRef(false)

  const selectedCategory = property.category || categoryForPropertyType(property.propertyType)
  const quality = useMemo(() => calculateManualListingQuality(property), [property])
  const stepErrors = useMemo(() => validateManualPropertyStep(step, property), [property, step])
  const paymentPlan = useMemo(() => {
    const structured = normalizePaymentPlan(property.paymentPlan)
    return structured.length > 0 ? structured : parseLegacyPaymentPlanText(property.paymentPlanText)
  }, [property.paymentPlan, property.paymentPlanText])
  const paymentValidation = useMemo(() => paymentPlanValidation(paymentPlan), [paymentPlan])

  const localDraftKey = propertyId ? `millionflats:manual-draft:${propertyId}` : ''

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine)
    updateOnline()
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  useEffect(() => {
    if (!localDraftKey || loadingDraft || property.status !== 'DRAFT') return
    try {
      const snapshot = { ...property, media: undefined }
      window.localStorage.setItem(localDraftKey, JSON.stringify(snapshot))
    } catch {
      return
    }
  }, [localDraftKey, loadingDraft, property])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
    if (notice) toast.success(notice)
  }, [notice])

  const goToNextStep = useCallback(() => {
    const errors = validateManualPropertyStep(step, property)
    if (Object.keys(errors).length > 0) {
      setError(Object.values(errors)[0])
      return
    }
    setError('')
    trackEvent('listing_step_completed', { workflow: 'manual_property_v2', step })
    setStep(STEP_ORDER[Math.min(STEP_ORDER.length - 1, STEP_ORDER.indexOf(step) + 1)])
  }, [property, step])

  useEffect(() => {
    propertyRef.current = property
  }, [property])

  const mergeProperty = useCallback((next: Partial<ManualProperty>) => {
    setProperty((prev) => {
      const mergedAmenities = next.amenities !== undefined ? (next.amenities ?? []) : prev.amenities
      const mergedCustomAmenities = next.customAmenities !== undefined ? (next.customAmenities ?? []) : prev.customAmenities
      const mergedMedia = next.media !== undefined ? (next.media ?? []) : prev.media
      return {
        ...(prev as any),
        ...(next as any),
        amenities: mergedAmenities,
        customAmenities: mergedCustomAmenities,
        media: mergedMedia,
      }
    })
  }, [])

  const rememberDraftId = useCallback((id: string) => {
    if (!id) return
    try {
      window.localStorage.setItem(LAST_MANUAL_DRAFT_KEY, id)
    } catch {
      return
    }
  }, [])

  const forgetDraftId = useCallback(() => {
    try {
      window.localStorage.removeItem(LAST_MANUAL_DRAFT_KEY)
    } catch {
      return
    }
  }, [])

  useEffect(() => {
    if (propertyId) return
    const fromUrl = String(draftIdFromUrl || '').trim()
    if (fromUrl) {
      setResumeDraftId(fromUrl)
      return
    }
    let remembered = ''
    try {
      remembered = String(window.localStorage.getItem(LAST_MANUAL_DRAFT_KEY) || '')
    } catch {
      remembered = ''
    }
    if (remembered) setResumeDraftId(remembered)
  }, [draftIdFromUrl, propertyId])

  useEffect(() => {
    if (!propertyId || loadingDraft) return
    try {
      const raw = window.localStorage.getItem(`millionflats:manual-draft:${propertyId}`)
      if (!raw) return
      const local = JSON.parse(raw) as ManualProperty
      if (!local || local.id !== propertyId) return
      const remoteUpdated = property.updatedAt ? new Date(String(property.updatedAt)).getTime() : 0
      const localUpdated = local.updatedAt ? new Date(String(local.updatedAt)).getTime() : 0
      if (localUpdated > remoteUpdated) {
        mergeProperty(local)
        setNotice('Recovered unsaved local changes. They will sync when online.')
      }
    } catch {
      return
    }
  }, [propertyId, loadingDraft, mergeProperty, property.updatedAt])

  const statusBanner = useMemo(() => {
    if (!property) return null
    if (property.status === 'PUBLISHED') {
      return (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-semibold text-green-800">Your property has been published and is now live.</p>
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

  const fetchDraft = useCallback(
    async (id: string, opts?: { mode?: 'auto' | 'manual' }) => {
      setLoadingDraft(true)
      setError('')
      setNotice('')
      try {
        const res = await fetch(`/api/manual-properties/${encodeURIComponent(id)}`)
        const data = (await safeJson(res)) as any
        if (!data) throw new Error('Invalid server response')
        if (!res.ok || !data?.success) {
          if (res.status === 404 && String(data?.error || '').toLowerCase() === 'not found') {
            forgetDraftId()
            setResumeDraftId('')
            hydratedDraftIdRef.current = ''
            didAutoLoadDraftRef.current = false
          }
          throw new Error(data?.error || data?.message || 'Failed to load draft')
        }

        const mode = opts?.mode || 'manual'
        const local = propertyRef.current
        const forceApplyFromUrl = modeFromUrl === 'resume' || modeFromUrl === 'edit'
        const canAutoApply = mode === 'manual' || forceApplyFromUrl || isBlankDraft(local)

        if (!canAutoApply) {
          setNotice('Draft found in URL. Click “Load Draft” to restore it (this will overwrite the current form).')
          return
        }

        skipNextAutosaveRef.current = true
        mergeProperty(data.property)
        didHydrateFromServerRef.current = true
        rememberDraftId(String(data.property?.id || id))
        if (!draftIdFromUrl && String(data.property?.id || '')) {
          router.replace(`/properties/new/manual?draft=${encodeURIComponent(String(data.property.id))}`)
        }
        setResumeDraftId('')
        setDuplicateConfirm(Boolean(data.property?.duplicateOverrideConfirmed))
        const score = Number(data.property?.duplicateScore || 0)
        if (score > 0) {
          setDuplicate({ score, level: score >= 75 ? 'strong' : score >= 50 ? 'soft' : 'none', match: null })
        } else {
          setDuplicate(null)
        }
        if (modeFromUrl === 'resume') {
          const last = String((data.property as any)?.lastCompletedStep || '').trim() as Step
          const allowed: Step[] = ['basics', 'location', 'media', 'amenities', 'pricing', 'declaration', 'review']
          if (allowed.includes(last)) setStep(last)
        }
        setNotice('Draft loaded.')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load draft')
      } finally {
        setLoadingDraft(false)
      }
    },
    [draftIdFromUrl, forgetDraftId, mergeProperty, rememberDraftId, router, safeJson, modeFromUrl]
  )

  useEffect(() => {
    if (propertyId) return
    if (!resumeDraftId) return
    if (loadingDraft || saving) return
    if (didAutoLoadDraftRef.current) return
    if (hydratedDraftIdRef.current === resumeDraftId) return

    didAutoLoadDraftRef.current = true
    hydratedDraftIdRef.current = resumeDraftId
    fetchDraft(resumeDraftId, { mode: 'auto' })
  }, [fetchDraft, loadingDraft, propertyId, resumeDraftId, saving])

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

  useEffect(() => {
    if (step !== 'declaration' || !propertyId) return
    fetch(`/api/manual-properties/${encodeURIComponent(propertyId)}/verification-documents`)
      .then((res) => res.json())
      .then((json) => { if (Array.isArray(json?.documents)) setVerificationDocuments(json.documents) })
      .catch(() => null)
  }, [propertyId, step])

  useEffect(() => {
    if (step !== 'location' || locationQuery.trim().length < 3) {
      setLocationResults([])
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLocationSearching(true)
      try {
        const response = await fetch(`/api/manual-properties/geocode?query=${encodeURIComponent(locationQuery)}`, { signal: controller.signal })
        const json = await response.json()
        if (response.ok && Array.isArray(json?.results)) setLocationResults(json.results)
      } catch {
        if (!controller.signal.aborted) setLocationResults([])
      } finally {
        if (!controller.signal.aborted) setLocationSearching(false)
      }
    }, 450)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [locationQuery, step])

  useEffect(() => {
    if (step !== 'review' || !propertyId) return
    let cancelled = false
    setValuationLoading(true)
    setValuationError('')
    fetch('/api/ai/valuation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entityId: propertyId, entityType: 'MANUAL_PROPERTY' }) })
      .then(async (response) => {
        const json = await response.json()
        if (!response.ok || !json?.success) throw new Error(json?.error || 'AIShield valuation is unavailable')
        if (!cancelled) setValuation(json.data)
      })
      .catch((error) => { if (!cancelled) { setValuation(null); setValuationError(error instanceof Error ? error.message : 'AIShield valuation is unavailable') } })
      .finally(() => { if (!cancelled) setValuationLoading(false) })
    return () => { cancelled = true }
  }, [propertyId, step])

  const uploadVerificationDocument = async (file: File) => {
    if (!propertyId) return
    setDocumentBusy(true)
    setError('')
    try {
      const presignRes = await fetch(`/api/manual-properties/${encodeURIComponent(propertyId)}/verification-documents/presign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: documentCategory, filename: file.name, contentType: file.type, sizeBytes: file.size }) })
      const presign = await safeJson(presignRes) as any
      if (!presignRes.ok || !presign?.uploadUrl) throw new Error(presign?.message || 'Could not prepare document upload')
      const uploadRes = await fetch(String(presign.uploadUrl), { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      if (!uploadRes.ok) throw new Error('Document upload failed. Please retry.')
      const completeRes = await fetch(`/api/manual-properties/${encodeURIComponent(propertyId)}/verification-documents/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: documentCategory, storageKey: presign.key, mimeType: file.type, sizeBytes: file.size }) })
      const complete = await safeJson(completeRes) as any
      if (!completeRes.ok || !complete?.document) throw new Error(complete?.message || 'Could not save document')
      setVerificationDocuments((documents) => [complete.document, ...documents])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Document upload failed')
    } finally {
      setDocumentBusy(false)
    }
  }

  const deleteVerificationDocument = async (documentId: string) => {
    if (!propertyId) return
    setDocumentBusy(true)
    try {
      const res = await fetch(`/api/manual-properties/${encodeURIComponent(propertyId)}/verification-documents`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId }) })
      if (!res.ok) throw new Error('Could not remove document')
      setVerificationDocuments((documents) => documents.filter((document) => document.id !== documentId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove document')
    } finally {
      setDocumentBusy(false)
    }
  }

  const patchById = useCallback(async (id: string, data: Partial<ManualProperty>) => {
    const save = async () => {
      setSaving(true)
      setSaveState('saving')
      setNotice('')
      try {
        const res = await fetch(`/api/manual-properties/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const json = (await safeJson(res)) as any
        if (!json) throw new Error('Invalid server response')
        if (!res.ok || !json?.success) {
          const details = json?.details?.message ? `: ${String(json.details.message)}` : ''
          const code = json?.code ? ` (${String(json.code)})` : ''
          throw new Error(String(json?.error || json?.message || 'Failed to save') + code + details)
        }
        setLastSavedAt(new Date())
        setSaveState('saved')
        didHydrateFromServerRef.current = true
        return json.property as ManualProperty
      } catch (e) {
        setSaveState('error')
        setError(e instanceof Error ? e.message : 'Failed to save')
        return null
      } finally {
        setSaving(false)
      }
    }

    const queued = patchQueueRef.current.then(save, save)
    patchQueueRef.current = queued.then(() => undefined, () => undefined)
    return queued
  }, [safeJson])

  useEffect(() => {
    const id = propertyRef.current?.id
    const status = propertyRef.current?.status
    if (!id) return
    if (status && status !== 'DRAFT' && status !== 'REJECTED') return
    if (!didHydrateFromServerRef.current) return
    patchById(id, { lastCompletedStep: step } as any)
  }, [patchById, step])

  const buildSavePayload = useCallback((): Partial<ManualProperty> => {
    return {
      title: property.title ?? null,
      category: selectedCategory ?? null,
      propertyType: property.propertyType ?? null,
      intent: property.intent ?? null,
      price: typeof property.price === 'number' && Number.isFinite(property.price) ? property.price : null,
      currency: property.currency || 'AED',
      negotiable: property.negotiable ?? null,
      bookingAmount: property.bookingAmount ?? null,
      maintenanceCharges: property.maintenanceCharges ?? null,
      otherCharges: property.otherCharges ?? null,
      annualRent: property.annualRent ?? (property.intent === 'RENT' && property.price ? property.price * 12 : null),
      securityDeposit: property.securityDeposit ?? null,
      agencyFee: property.agencyFee ?? null,
      utilitiesIncluded: property.utilitiesIncluded ?? null,
      availableFrom: property.availableFrom ?? null,
      leaseDurationMonths: property.leaseDurationMonths ?? null,
      paymentFrequency: property.paymentFrequency ?? null,
      preferredTenantType: property.preferredTenantType ?? null,
      petFriendly: property.petFriendly ?? null,
      carpetArea: property.carpetArea ?? null,
      plotArea: property.plotArea ?? null,
      balconyCount: property.balconyCount ?? null,
      parkingSpaces: property.parkingSpaces ?? null,
      propertyAgeYears: property.propertyAgeYears ?? null,
      floorNumber: property.floorNumber ?? null,
      totalFloors: property.totalFloors ?? null,
      facing: property.facing ?? null,
      view: property.view ?? null,
      furnishingStatus: property.furnishingStatus ?? null,
      propertyCondition: property.propertyCondition ?? null,
      possessionDate: property.possessionDate ?? null,
      constructionStatus: property.constructionStatus ?? null,
      shortDescription: property.shortDescription ?? null,
      bedrooms: typeof property.bedrooms === 'number' && Number.isFinite(property.bedrooms) ? property.bedrooms : 0,
      bathrooms: typeof property.bathrooms === 'number' && Number.isFinite(property.bathrooms) ? property.bathrooms : 0,
      squareFeet: typeof property.squareFeet === 'number' && Number.isFinite(property.squareFeet) ? property.squareFeet : 0,
      countryCode: property.countryCode || 'UAE',
      countryIso2: property.countryIso2 || countryIso2ForCountry(property.countryCode),
      city: property.city ?? null,
      region: property.region ?? null,
      community: property.community ?? null,
      locality: property.locality ?? null,
      address: property.address ?? null,
      latitude: typeof property.latitude === 'number' && Number.isFinite(property.latitude) ? property.latitude : null,
      longitude: typeof property.longitude === 'number' && Number.isFinite(property.longitude) ? property.longitude : null,
      locationPrecision: property.locationPrecision ?? 'APPROXIMATE',
      publicLocationVisible: property.publicLocationVisible ?? false,
      developerName: property.developerName ?? null,
      amenities: Array.isArray(property.amenities) ? property.amenities : null,
      customAmenities: Array.isArray(property.customAmenities) ? property.customAmenities : null,
      paymentPlan: paymentPlan.length > 0 ? paymentPlan : null,
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
  }, [duplicateConfirm, paymentPlan, property, selectedCategory])

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
      const data = (await safeJson(res)) as any
      if (!data) throw new Error('Invalid server response')
      if (!res.ok || !data?.success) {
        const details = data?.details?.message ? `: ${String(data.details.message)}` : ''
        const code = data?.code ? ` (${String(data.code)})` : ''
        throw new Error(String(data?.error || data?.message || 'Failed to create draft') + code + details)
      }
      const nextId = String(data.property.id)
      mergeProperty({ id: nextId, status: data.property.status || 'DRAFT' })
      router.replace(`/properties/new/manual?draft=${encodeURIComponent(nextId)}`)
      rememberDraftId(nextId)
      didHydrateFromServerRef.current = true
      setResumeDraftId('')
      return nextId
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create draft')
      return ''
    } finally {
      setSaving(false)
    }
  }, [mergeProperty, propertyId, rememberDraftId, router, safeJson])

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
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false
      lastAutosaveFingerprintRef.current = fingerprint
      setSaveState('saved')
      return
    }
    if (lastAutosaveFingerprintRef.current === fingerprint) {
      setSaveState('saved')
      return
    }
    setSaveState('unsaved')
    autosave(propertyId, payload, fingerprint)
  }, [autosave, buildSavePayload, loadingDraft, property?.status, propertyId, saving])

  useEffect(() => {
    if (saveState !== 'saving' && saveState !== 'unsaved' && saveState !== 'error') return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = 'Your listing changes have not finished saving.'
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [saveState])

  const saveDraft = async () => {
    setError('')
    setNotice('')
    const id = await ensureRemoteDraft()
    if (!id) return false

    const saved = await patchById(id, buildSavePayload())
    if (saved) {
      setLastSavedAt(new Date())
      setNotice('Draft saved.')
      trackEvent('listing_draft_saved', { workflow: 'manual_property_v2' })
    }
    return Boolean(saved)
  }

  const saveAndExit = async () => {
    if (await saveDraft()) router.push(getHomeRouteForRole('AGENT'))
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
    if (c === 'FLOOR_PLANS') return 'floorplan'
    if (c === 'VIDEO') return 'video'
    if (c === 'AMENITIES') return 'amenities'
    if (c === 'BROCHURE') return 'brochure'
    return 'other'
  }

  const upload = useCallback(
    async (category: string, file: File) => {
      if (!propertyId) {
        setError('Save draft to start uploading media')
        return
      }
      setError('')
      setUploadingCategory(category)
      try {
        const title = (propertyRef.current as any)?.title || 'Property'
        const altGuess = `${title} - ${category.toLowerCase().replace(/_/g, ' ')}`

        const presignJson = await (await import('@/lib/upload-client')).requestPresign('/api/manual-properties/upload/presign', {
          propertyId,
          category,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          altText: altGuess,
        })

        await (await import('@/lib/upload-client')).uploadToSignedUrl(String(presignJson.uploadUrl), file, (percent) => setUploadProgress((current) => ({ ...current, [`${category}:${file.name}`]: percent })))

        const completeRes = await fetch('/api/manual-properties/upload/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId,
            category,
            url: String(presignJson.objectUrl),
            s3Key: String(presignJson.key),
            mimeType: file.type || null,
            sizeBytes: file.size,
            altText: altGuess,
          }),
        })

        const completeJson = (await safeJson(completeRes)) as any
        if (!completeJson || !completeRes.ok || !completeJson?.success) {
          throw new Error(completeJson?.message || completeJson?.error || 'Failed to finalize upload')
        }

        if (Array.isArray(completeJson?.media)) {
          mergeProperty({ media: completeJson.media })
        }

        setNotice('Uploaded successfully')
        setFailedUploads((current) => ({ ...current, [category]: (current[category] || []).filter((pending) => pending !== file) }))
        setUploadProgress((current) => ({ ...current, [`${category}:${file.name}`]: 100 }))
        trackEvent('listing_media_uploaded', { workflow: 'manual_property_v2', category })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
        setFailedUploads((current) => ({ ...current, [category]: [...(current[category] || []).filter((pending) => pending.name !== file.name), file] }))
        setUploadProgress((current) => ({ ...current, [`${category}:${file.name}`]: 0 }))
        trackEvent('listing_media_failed', { workflow: 'manual_property_v2', category })
      } finally {
        setUploadingCategory('')
      }
    },
    [mergeProperty, propertyId, safeJson]
  )

  const uploadMany = useCallback(
    async (category: string, files: File[]) => {
      if (!files.length) return
      const id = await ensureRemoteDraft()
      if (!id) return
      await Promise.all(files.map((f) => upload(category, f)))
    },
    [ensureRemoteDraft, upload]
  )

  const toggleAmenity = useCallback(
    (amenity: string) => {
      const next = new Set(propertyRef.current?.amenities || [])
      if (next.has(amenity)) next.delete(amenity)
      else next.add(amenity)
      const list = Array.from(next)
      mergeProperty({ amenities: list })
      patch({ amenities: list })
    },
    [mergeProperty, patch]
  )

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
        const json = (await safeJson(res)) as any
        if (!json) throw new Error('Invalid server response')
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || json?.message || 'Failed to delete')
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
    [fetchDraft, propertyId, safeJson]
  )

  const updateMedia = useCallback(async (mediaId: string, data: { category?: string; position?: number }) => {
    setMediaBusyId(mediaId)
    setError('')
    try {
      const res = await fetch(`/api/manual-properties/media/${encodeURIComponent(mediaId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = (await safeJson(res)) as any
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Failed to update media')
      if (Array.isArray(json.media)) setProperty((p) => ({ ...(p as any), media: json.media }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update media')
    } finally {
      setMediaBusyId('')
    }
  }, [safeJson])

  const submit = async () => {
    setError('')
    const validationErrors = validateManualPropertyStep('review', property)
    if (Object.keys(validationErrors).length > 0) {
      setError(Object.values(validationErrors)[0])
      return
    }
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
      const json = (await safeJson(res)) as any
      if (!json) throw new Error('Invalid server response')
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || json?.message || 'Submission failed')
      }

      await fetchDraft(id, { mode: 'manual' })
      setNotice('Submitted successfully')
      trackEvent('listing_submitted', { workflow: 'manual_property_v2' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed')
      trackEvent('listing_submission_failed', { workflow: 'manual_property_v2' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <Toaster position="top-right" toastOptions={{ duration: 4500 }} />
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Manual Listing</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-dark-blue">Add Manual Property</h1>
            <p className="mt-2 text-sm text-gray-600">
              Agent-owned inventory is reviewed before going live.
            </p>
          </div>
          <Link
            href={getHomeRouteForRole('AGENT')}
            onClick={(event) => {
              if (saveState === 'saving' || saveState === 'unsaved' || saveState === 'error') {
                if (!window.confirm('Your listing changes have not finished saving. Leave this page anyway?')) event.preventDefault()
              }
            }}
            className="text-sm font-semibold text-dark-blue hover:underline"
          >
            Back to Agent Portal
          </Link>
        </div>

        {statusBanner}

        {!isOnline ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">You&apos;re offline. Changes are stored locally and will sync when the connection returns.</div> : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveDraft}
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90"
            disabled={saving}
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={saveAndExit}
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
            disabled={saving}
          >
            Save &amp; Exit
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

        {duplicate && duplicate.level !== 'none' ? (
          <div
            className={`mt-6 rounded-2xl border p-5 ${
              duplicate.level === 'strong' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
            }`}
          >
            <p className="font-semibold text-dark-blue">
              {duplicate.level === 'strong'
                ? 'This looks like an existing listing.'
                : 'This property looks similar to an existing listing.'}
            </p>
            <p className="mt-1 text-sm text-gray-700">Confidence: {duplicate.score}/100</p>
            {duplicate.match ? (
              <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
                <p className="font-semibold text-dark-blue">{duplicate.match.name}</p>
                <p className="text-sm text-gray-600 mt-1">{duplicate.match.developer || 'Listing'}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {duplicate.match.url ? (
                    <Link href={duplicate.match.url} className="text-sm font-semibold text-dark-blue hover:underline">
                      View listing
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
              ['declaration', 'Verification'],
              ['review', 'Review'],
            ] as Array<[Step, string]>).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (STEP_ORDER.indexOf(k) <= STEP_ORDER.indexOf(step) + 1) setStep(k)
                }}
                disabled={STEP_ORDER.indexOf(k) > STEP_ORDER.indexOf(step) + 1}
                className={`px-3 py-2 rounded-xl border ${
                  step === k ? 'border-dark-blue bg-gray-50 text-dark-blue' : 'border-gray-200 bg-white text-gray-700 disabled:cursor-not-allowed disabled:opacity-50'
                }`}
              >
                {label}
              </button>
            ))}
            <span className={`ml-auto text-xs ${saveState === 'error' ? 'text-red-700' : saveState === 'unsaved' ? 'text-amber-700' : 'text-gray-500'}`} role="status">
              {saveState === 'saving' ? 'Saving…' : saveState === 'unsaved' ? 'Changes not saved yet' : saveState === 'error' ? 'Save failed - retry' : lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Not saved yet'}
            </span>
          </div>

          {Object.keys(stepErrors).length > 0 && step !== 'review' ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
              Complete {Object.keys(stepErrors).length} required {Object.keys(stepErrors).length === 1 ? 'field' : 'fields'} before continuing.
              <span className="block mt-1 text-xs text-amber-800">{Object.values(stepErrors)[0]}</span>
            </div>
          ) : null}

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

              <GlobalDropdown
                label="Property category"
                value={selectedCategory || ''}
                onChange={(v) => {
                  const next = singleDropdownValue(v) as ManualPropertyCategory
                  setProperty((p) => ({ ...(p as any), category: next, propertyType: null }))
                }}
                options={[
                  { value: '', label: 'Select' },
                  ...MANUAL_PROPERTY_CATEGORIES.map((item) => ({ value: item.value, label: item.label })),
                ]}
                appearance="admin-light"
              />

              <GlobalDropdown
                label="Property type"
                value={property?.propertyType || ''}
                onChange={(v) => {
                  const next = singleDropdownValue(v)
                  setProperty((p) => ({ ...(p as any), propertyType: next }))
                  patch({ propertyType: next || null })
                }}
                options={[{ value: '', label: 'Select category first' }, ...propertyTypesForCategory(selectedCategory).map((item) => ({ value: item.label, label: item.label }))]}
                appearance="admin-light"
              />

              <GlobalDropdown
                label="Sale / Rent"
                value={property?.intent || ''}
                onChange={(v) => {
                  const next = singleDropdownValue(v) as any
                  setProperty((p) => ({ ...(p as any), intent: next || null }))
                  patch({ intent: next || null })
                }}
                options={[
                  { value: '', label: 'Select' },
                  { value: 'SALE', label: 'Sale' },
                  { value: 'RENT', label: 'Rent' },
                ]}
                appearance="admin-light"
              />

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

              <GlobalDropdown
                label="Currency"
                value={property?.currency || 'AED'}
                onChange={(v) => {
                  const next = singleDropdownValue(v)
                  setProperty((p) => ({ ...(p as any), currency: next }))
                  patch({ currency: next })
                }}
                options={[
                  { value: 'AED', label: 'AED' },
                  { value: 'INR', label: 'INR' },
                  { value: 'USD', label: 'USD' },
                ]}
                appearance="admin-light"
              />

              <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Suggested currency for {property?.countryCode === 'India' ? 'India' : 'the UAE'}: <strong>{defaultCurrencyForCountry(property?.countryCode)}</strong>. You can change it for cross-border listings.
              </div>

              <GlobalDropdown
                label="Property status"
                value={property?.constructionStatus || ''}
                onChange={(v) => {
                  const next = singleDropdownValue(v) as any
                  setProperty((p) => ({ ...(p as any), constructionStatus: next || null }))
                  patch({ constructionStatus: next || null })
                }}
                options={[
                  { value: '', label: 'Select' },
                  { value: 'READY', label: 'Ready' },
                  { value: 'OFF_PLAN', label: 'Off-plan' },
                ]}
                appearance="admin-light"
              />

              {selectedCategory !== 'LAND' ? <div>
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
              </div> : null}

              {selectedCategory !== 'LAND' ? <div>
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
              </div> : null}

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

              {selectedCategory === 'LAND' ? <div><label className="block text-sm font-semibold text-gray-700 mb-2">Plot area (sq ft)</label><input type="number" min={0} value={property?.plotArea ?? ''} onChange={(e) => setProperty((p) => ({ ...(p as any), plotArea: toNumber(e.target.value) }))} onBlur={(e) => patch({ plotArea: toNumber(e.target.value) || null })} className="w-full h-12 px-4 rounded-xl border border-gray-300" /></div> : null}
              {selectedCategory !== 'LAND' ? <>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Balconies</label><input type="number" min={0} value={property?.balconyCount ?? ''} onChange={(e) => setProperty((p) => ({ ...(p as any), balconyCount: Math.max(0, Math.floor(toNumber(e.target.value))) }))} onBlur={(e) => patch({ balconyCount: Math.max(0, Math.floor(toNumber(e.target.value))) || null })} className="w-full h-12 px-4 rounded-xl border border-gray-300" /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Parking spaces</label><input type="number" min={0} value={property?.parkingSpaces ?? ''} onChange={(e) => setProperty((p) => ({ ...(p as any), parkingSpaces: Math.max(0, Math.floor(toNumber(e.target.value))) }))} onBlur={(e) => patch({ parkingSpaces: Math.max(0, Math.floor(toNumber(e.target.value))) || null })} className="w-full h-12 px-4 rounded-xl border border-gray-300" /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Property age (years)</label><input type="number" min={0} value={property?.propertyAgeYears ?? ''} onChange={(e) => setProperty((p) => ({ ...(p as any), propertyAgeYears: Math.max(0, Math.floor(toNumber(e.target.value))) }))} onBlur={(e) => patch({ propertyAgeYears: Math.max(0, Math.floor(toNumber(e.target.value))) || null })} className="w-full h-12 px-4 rounded-xl border border-gray-300" /></div>
                <GlobalDropdown
                  label="Furnishing"
                  value={property?.furnishingStatus || ''}
                  onChange={(value) => {
                    const next = singleDropdownValue(value)
                    setProperty((p) => ({ ...(p as any), furnishingStatus: next || null }))
                    patch({ furnishingStatus: next || null })
                  }}
                  options={[
                    { value: '', label: 'Not specified' },
                    { value: 'UNFURNISHED', label: 'Unfurnished' },
                    { value: 'SEMI_FURNISHED', label: 'Semi-furnished' },
                    { value: 'FURNISHED', label: 'Furnished' },
                  ]}
                  appearance="admin-light"
                />
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Floor</label><input type="number" min={0} value={property?.floorNumber ?? ''} onChange={(e) => setProperty((p) => ({ ...(p as any), floorNumber: Math.max(0, Math.floor(toNumber(e.target.value))) }))} onBlur={(e) => patch({ floorNumber: Math.max(0, Math.floor(toNumber(e.target.value))) || null })} className="w-full h-12 px-4 rounded-xl border border-gray-300" /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Total floors</label><input type="number" min={0} value={property?.totalFloors ?? ''} onChange={(e) => setProperty((p) => ({ ...(p as any), totalFloors: Math.max(0, Math.floor(toNumber(e.target.value))) }))} onBlur={(e) => patch({ totalFloors: Math.max(0, Math.floor(toNumber(e.target.value))) || null })} className="w-full h-12 px-4 rounded-xl border border-gray-300" /></div>
                <GlobalDropdown label="Facing" value={property?.facing || ''} onChange={(value) => { const next = singleDropdownValue(value); setProperty((p) => ({ ...(p as any), facing: next || null })); patch({ facing: next || null }) }} options={[{ value: '', label: 'Not specified' }, ...['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'].map((value) => ({ value, label: value }))]} appearance="admin-light" />
                <GlobalDropdown label="View" value={property?.view || ''} onChange={(value) => { const next = singleDropdownValue(value); setProperty((p) => ({ ...(p as any), view: next || null })); patch({ view: next || null }) }} options={[{ value: '', label: 'Not specified' }, ...['Sea view', 'City view', 'Garden view', 'Community view', 'Street view'].map((value) => ({ value, label: value }))]} appearance="admin-light" />
                <GlobalDropdown label="Property condition" value={property?.propertyCondition || ''} onChange={(value) => { const next = singleDropdownValue(value); setProperty((p) => ({ ...(p as any), propertyCondition: next || null })); patch({ propertyCondition: next || null }) }} options={[{ value: '', label: 'Not specified' }, { value: 'NEW', label: 'New' }, { value: 'GOOD', label: 'Good' }, { value: 'NEEDS_RENOVATION', label: 'Needs renovation' }]} appearance="admin-light" />
              </> : null}

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
              <div className="md:col-span-2 rounded-2xl border border-dark-blue/15 bg-blue-50 p-5">
                <label className="block text-sm font-semibold text-dark-blue mb-2">Search for the property or area</label>
                <input value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white" placeholder="Search Dubai Marina, Bandra West, or an address" aria-describedby="location-search-status" />
                <p id="location-search-status" className="mt-2 text-xs text-gray-600">{locationSearching ? 'Searching locations…' : 'Select a result to place the pin automatically. You can still adjust the details below.'}</p>
                {locationResults.length > 0 ? <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">{locationResults.map((result) => <button key={`${result.latitude}-${result.longitude}-${result.displayName}`} type="button" onClick={() => { mergeProperty({ address: result.displayName, latitude: result.latitude, longitude: result.longitude }); patch({ address: result.displayName, latitude: result.latitude, longitude: result.longitude }); setLocationQuery(result.displayName); setLocationResults([]) }} className="block w-full border-b border-gray-100 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 last:border-b-0">{result.displayName}</button>)}</div> : null}
              </div>
              <GlobalDropdown
                label="Country"
                value={property?.countryCode || 'UAE'}
                onChange={(v) => {
                  const next = singleDropdownValue(v) as any
                  const countryIso2 = countryIso2ForCountry(next)
                  setProperty((p) => ({ ...(p as any), countryCode: next, countryIso2, currency: defaultCurrencyForCountry(next) }))
                  patch({ countryCode: next, countryIso2 })
                }}
                options={[
                  { value: 'UAE', label: 'UAE' },
                  { value: 'India', label: 'India' },
                ]}
                appearance="admin-light"
              />
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
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">State / Region</label><input value={property?.region || ''} onChange={(e) => setProperty((p) => ({ ...(p as any), region: e.target.value }))} onBlur={(e) => patch({ region: e.target.value || null })} className="w-full h-12 px-4 rounded-xl border border-gray-300" placeholder="e.g., Maharashtra" /></div>
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
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Locality</label><input value={property?.locality || ''} onChange={(e) => setProperty((p) => ({ ...(p as any), locality: e.target.value }))} onBlur={(e) => patch({ locality: e.target.value || null })} className="w-full h-12 px-4 rounded-xl border border-gray-300" placeholder="e.g., Sector 42" /></div>
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
                  onChange={(e) => {
                    const raw = e.target.value
                    setProperty((p) => ({ ...(p as any), latitude: raw === '' ? null : Number(raw) }))
                  }}
                  onBlur={(e) => {
                    const raw = e.target.value
                    if (raw === '') {
                      patch({ latitude: null })
                      return
                    }
                    const n = Number(raw)
                    patch({ latitude: Number.isFinite(n) ? n : null })
                  }}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Longitude (required)</label>
                <input
                  type="number"
                  value={property?.longitude ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value
                    setProperty((p) => ({ ...(p as any), longitude: raw === '' ? null : Number(raw) }))
                  }}
                  onBlur={(e) => {
                    const raw = e.target.value
                    if (raw === '') {
                      patch({ longitude: null })
                      return
                    }
                    const n = Number(raw)
                    patch({ longitude: Number.isFinite(n) ? n : null })
                  }}
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

              <GlobalDropdown
                label="Location precision"
                value={property?.locationPrecision || 'APPROXIMATE'}
                onChange={(v) => {
                  const next = singleDropdownValue(v) as 'EXACT' | 'APPROXIMATE'
                  setProperty((p) => ({ ...(p as any), locationPrecision: next }))
                  patch({ locationPrecision: next })
                }}
                options={[{ value: 'APPROXIMATE', label: 'Approximate area' }, { value: 'EXACT', label: 'Exact location' }]}
                appearance="admin-light"
              />
              <label className="flex items-center gap-3 text-sm text-gray-700 pt-8">
                <input type="checkbox" checked={Boolean(property?.publicLocationVisible)} onChange={(e) => { setProperty((p) => ({ ...(p as any), publicLocationVisible: e.target.checked })); patch({ publicLocationVisible: e.target.checked }) }} />
                Show this location publicly
              </label>
            </div>
          ) : null}

          {step === 'media' ? (
            <ManualPropertyMediaManager
              propertyId={propertyId}
              media={(property?.media || []) as any}
              onChange={(media) => mergeProperty({ media })}
              tour3dUrl={property?.tour3dUrl}
              onTour3dUrlChange={(value) => setProperty((current) => ({ ...(current as any), tour3dUrl: value }))}
            />
          ) : null}

          {false && step === 'media' ? (
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
                        const files = Array.from(e.target.files || [])
                        if (files.length > 0) uploadMany('VIDEO', files)
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
                ['OTHER', 'Other', false],
                ['FLOOR_PLANS', 'Floor plans', false],
                ['AMENITIES', 'Amenities images', false],
                ['BROCHURE', 'Marketing brochure (PDF)', false],
              ] as Array<[string, string, boolean]>).map(([cat, label, req]) => (
                <div key={cat} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const files = Array.from(event.dataTransfer.files); if (files.length) uploadMany(cat, cat === 'BROCHURE' ? files.slice(0, 1) : files) }} className="rounded-2xl border border-gray-200 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>

                    {Object.entries(uploadProgress).filter(([key, percent]) => key.startsWith(`${cat}:`) && percent < 100).map(([key, percent]) => <div key={key} className="mt-3"><div className="flex justify-between text-xs text-gray-500"><span className="truncate">{key.slice(cat.length + 1)}</span><span>{percent}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-dark-blue transition-all" style={{ width: `${percent}%` }} /></div></div>)}
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
                        multiple={cat !== 'BROCHURE'}
                        accept={cat === 'BROCHURE' ? 'application/pdf' : 'image/*'}
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          if (files.length > 0) uploadMany(cat, files)
                          e.currentTarget.value = ''
                        }}
                      />
                    </label>
                  </div>

                  {(failedUploads[cat] || []).length > 0 ? <div className="mt-3 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"><span>{failedUploads[cat].length} upload{failedUploads[cat].length === 1 ? '' : 's'} failed.</span><button type="button" onClick={() => { const pending = failedUploads[cat] || []; setFailedUploads((current) => ({ ...current, [cat]: [] })); void uploadMany(cat, pending) }} className="font-semibold underline">Retry</button></div> : null}

                  {!propertyId ? <p className="mt-3 text-xs text-gray-600">Save draft to start uploading media</p> : null}

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(property?.media || []).filter((m) => m.category === cat).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
                        <p className="text-sm text-gray-600">No uploads yet.</p>
                      </div>
                    ) : (
                      (property?.media || [])
                        .filter((m) => m.category === cat)
                        .slice(0, 12)
                        .map((m, index, items) => (
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
                              <div className="flex items-center gap-2">
                                {cat !== 'BROCHURE' && cat !== 'VIDEO' ? <>
                                  <button type="button" title="Move media up" disabled={index === 0 || mediaBusyId === m.id} onClick={() => updateMedia(String(m.id), { position: Math.max(0, Number((items[index - 1] as any).position || index - 1)) })} className="text-xs font-semibold text-dark-blue disabled:opacity-40">Up</button>
                                  <button type="button" title="Move media down" disabled={index === items.length - 1 || mediaBusyId === m.id} onClick={() => updateMedia(String(m.id), { position: Number((items[index + 1] as any).position || index + 1) })} className="text-xs font-semibold text-dark-blue disabled:opacity-40">Down</button>
                                  {cat !== 'COVER' ? <button type="button" disabled={mediaBusyId === m.id} onClick={() => updateMedia(String(m.id), { category: 'COVER' })} className="text-xs font-semibold text-dark-blue disabled:opacity-40">Set hero</button> : null}
                                </> : null}
                                <button type="button" disabled={mediaBusyId === m.id} onClick={() => deleteMedia(String(m.id))} className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-60">
                                  {mediaBusyId === m.id ? 'Updating…' : 'Remove'}
                                </button>
                              </div>
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
            <ManualPropertyAmenities
              selected={Array.isArray(property?.amenities) ? property.amenities : []}
              customSelected={Array.isArray(property?.customAmenities) ? property.customAmenities : []}
              propertyType={property?.propertyType}
              propertyCategory={selectedCategory}
              onSelectedChange={(amenities) => { mergeProperty({ amenities }); void patch({ amenities }) }}
              onCustomChange={(customAmenities) => { mergeProperty({ customAmenities }); void patch({ customAmenities }) }}
            />
          ) : null}

          {false && step === 'amenities' ? (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Select amenities</p>
                <div className="rounded-2xl border border-gray-200 p-4 max-h-[360px] overflow-auto">
                  {amenityIndex.length === 0 ? (
                    <p className="text-sm text-gray-600">Loading amenities…</p>
                  ) : (
                    <div className="space-y-5">
                      {(Object.entries(MANUAL_AMENITY_GROUPS) as Array<[string, readonly string[]]>).map(([group, defaults]) => {
                        const values = Array.from(new Set([...defaults, ...amenityIndex.filter((amenity) => defaults.includes(amenity))]))
                        if (selectedCategory === 'LAND' && group !== 'Outdoor') return null
                        return <div key={group}><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{group}</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{values.map((amenity) => { const selected = (property?.amenities || []).includes(amenity); return <button key={amenity} type="button" onClick={() => toggleAmenity(amenity)} className={`rounded-lg border px-3 py-2 text-left text-sm transition ${selected ? 'border-dark-blue bg-dark-blue text-white' : 'border-gray-300 bg-white text-gray-700'}`}>{amenity}</button> })}</div></div>
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{property?.intent === 'RENT' ? 'Monthly rent' : 'Asking price'}</label>
                <input type="number" min={0} value={property?.price ?? ''} onChange={(e) => { const value = toNumber(e.target.value); setProperty((p) => ({ ...(p as any), price: value, annualRent: p.intent === 'RENT' ? value * 12 : p.annualRent })) }} onBlur={(e) => patch({ price: toNumber(e.target.value) || null, annualRent: property?.intent === 'RENT' ? toNumber(e.target.value) * 12 : property?.annualRent })} className="w-full h-12 px-4 rounded-xl border border-gray-300" />
              </div>
              <label className="flex items-center gap-3 text-sm text-gray-700 pt-8">
                <input type="checkbox" checked={Boolean(property?.negotiable)} onChange={(e) => { setProperty((p) => ({ ...(p as any), negotiable: e.target.checked })); patch({ negotiable: e.target.checked }) }} />
                Price is negotiable
              </label>
              {property?.intent === 'RENT' ? <>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Annual rent</label><input type="number" value={property?.annualRent ?? (property?.price ? property.price * 12 : '')} readOnly className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50" /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Security deposit</label><input type="number" min={0} value={property?.securityDeposit ?? ''} onChange={(e) => setProperty((p) => ({ ...(p as any), securityDeposit: toNumber(e.target.value) }))} onBlur={(e) => patch({ securityDeposit: toNumber(e.target.value) || null })} className="w-full h-12 px-4 rounded-xl border border-gray-300" /></div>
                <GlobalDropdown label="Payment frequency" value={property?.paymentFrequency || 'MONTHLY'} onChange={(value) => { const next = singleDropdownValue(value); setProperty((p) => ({ ...(p as any), paymentFrequency: next })); patch({ paymentFrequency: next }) }} options={[{ value: 'MONTHLY', label: 'Monthly' }, { value: 'QUARTERLY', label: 'Quarterly' }, { value: 'YEARLY', label: 'Yearly' }]} appearance="admin-light" />
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Lease duration (months)</label><input type="number" min={1} value={property?.leaseDurationMonths ?? ''} onChange={(e) => setProperty((p) => ({ ...(p as any), leaseDurationMonths: Math.max(1, Math.floor(toNumber(e.target.value))) }))} onBlur={(e) => patch({ leaseDurationMonths: Math.max(1, Math.floor(toNumber(e.target.value))) || null })} className="w-full h-12 px-4 rounded-xl border border-gray-300" /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Available from</label><input type="date" value={property?.availableFrom ? String(property.availableFrom).slice(0, 10) : ''} onChange={(e) => { const value = e.target.value || null; setProperty((p) => ({ ...(p as any), availableFrom: value })); patch({ availableFrom: value }) }} className="w-full h-12 px-4 rounded-xl border border-gray-300" /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Agency fee</label><input type="number" min={0} value={property?.agencyFee ?? ''} onChange={(e) => setProperty((p) => ({ ...(p as any), agencyFee: toNumber(e.target.value) }))} onBlur={(e) => patch({ agencyFee: toNumber(e.target.value) || null })} className="w-full h-12 px-4 rounded-xl border border-gray-300" /></div>
                <label className="flex items-center gap-3 text-sm text-gray-700"><input type="checkbox" checked={Boolean(property?.utilitiesIncluded)} onChange={(e) => { setProperty((p) => ({ ...(p as any), utilitiesIncluded: e.target.checked })); patch({ utilitiesIncluded: e.target.checked }) }} /> Utilities included</label>
                <label className="flex items-center gap-3 text-sm text-gray-700"><input type="checkbox" checked={Boolean(property?.petFriendly)} onChange={(e) => { setProperty((p) => ({ ...(p as any), petFriendly: e.target.checked })); patch({ petFriendly: e.target.checked }) }} /> Pet friendly</label>
              </> : <>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Booking amount</label><input type="number" min={0} value={property?.bookingAmount ?? ''} onChange={(e) => setProperty((p) => ({ ...(p as any), bookingAmount: toNumber(e.target.value) }))} onBlur={(e) => patch({ bookingAmount: toNumber(e.target.value) || null })} className="w-full h-12 px-4 rounded-xl border border-gray-300" /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Maintenance / service charges</label><input type="number" min={0} value={property?.maintenanceCharges ?? ''} onChange={(e) => setProperty((p) => ({ ...(p as any), maintenanceCharges: toNumber(e.target.value) }))} onBlur={(e) => patch({ maintenanceCharges: toNumber(e.target.value) || null })} className="w-full h-12 px-4 rounded-xl border border-gray-300" /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Other charges</label><input type="number" min={0} value={property?.otherCharges ?? ''} onChange={(e) => setProperty((p) => ({ ...(p as any), otherCharges: toNumber(e.target.value) }))} onBlur={(e) => patch({ otherCharges: toNumber(e.target.value) || null })} className="w-full h-12 px-4 rounded-xl border border-gray-300" /></div>
              </>}
              <PaymentPlanBuilder
                value={paymentPlan}
                price={property?.price}
                currency={property?.currency}
                onChange={(stages: PaymentPlanStage[]) => {
                  setProperty((current) => ({ ...(current as any), paymentPlan: stages }))
                  void patch({ paymentPlan: stages })
                }}
              />
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
                <span>I confirm I am authorized to market this property.</span>
              </label>

              <p className="text-sm text-gray-600">I confirm that the information provided is accurate to the best of my knowledge and understand MillionFlats may verify this listing before publishing.</p>

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

              <div className="rounded-2xl border border-gray-200 p-5">
                <p className="font-semibold text-dark-blue">Verification documents (optional)</p>
                <p className="mt-1 text-xs text-gray-600">Documents are private, associated with this property, and remain unverified until reviewed.</p>
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <select value={documentCategory} onChange={(e) => setDocumentCategory(e.target.value)} className="h-11 rounded-xl border border-gray-300 px-3 text-sm">
                    <option value="OWNERSHIP_PROOF">Ownership proof</option><option value="AUTHORIZATION_LETTER">Authorization letter</option><option value="RERA_DOCUMENT">RERA documentation</option><option value="REGISTRATION_DOCUMENT">Registration document</option><option value="DEVELOPER_DOCUMENT">Developer document</option><option value="OTHER">Other</option>
                  </select>
                  <label className="inline-flex h-11 items-center justify-center rounded-xl bg-dark-blue px-5 text-sm font-semibold text-white cursor-pointer disabled:opacity-50">
                    {documentBusy ? 'Uploading…' : 'Upload document'}
                    <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={documentBusy || !propertyId} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadVerificationDocument(file); e.currentTarget.value = '' }} />
                  </label>
                </div>
                <div className="mt-4 space-y-2">
                  {verificationDocuments.length === 0 ? <p className="text-sm text-gray-500">No supporting documents uploaded.</p> : verificationDocuments.map((document) => <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 text-sm"><span>{document.category.replaceAll('_', ' ')}</span><span className="flex items-center gap-3 text-xs text-gray-500">{document.verificationStatus || 'UNVERIFIED'}<button type="button" onClick={() => deleteVerificationDocument(document.id)} className="font-semibold text-red-700">Remove</button></span></div>)}
                </div>
              </div>
            </div>
          ) : null}

          {step === 'review' ? (
            <div className="mt-8 space-y-6">
              <div className="rounded-2xl border border-dark-blue/15 bg-dark-blue px-6 py-5 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Listing Quality</p>
                    <p className="mt-1 text-3xl font-serif font-bold">{quality.score}% Complete</p>
                  </div>
                  <div className="h-16 w-16 rounded-full border-4 border-accent-orange flex items-center justify-center text-sm font-bold">
                    {quality.score}%
                  </div>
                </div>
                {quality.items.some((item) => !item.complete) ? (
                  <div className="mt-4 space-y-1 text-sm text-white/85">
                    {quality.items.filter((item) => !item.complete).slice(0, 4).map((item) => <button key={item.key} type="button" onClick={() => setStep(item.key === 'location' ? 'location' : item.key === 'hero' ? 'media' : item.key === 'amenities' ? 'amenities' : item.key === 'price' ? 'pricing' : 'basics')} className="block text-left underline-offset-2 hover:underline">- {item.label}</button>)}
                  </div>
                ) : <p className="mt-3 text-sm text-white/85">Core listing information is complete.</p>}
              </div>
              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-dark-blue">Internal listing insights</p><p className="mt-1 text-xs text-gray-600">Visible only to you while preparing this listing.</p></div>{valuationLoading ? <span className="text-xs text-gray-500">Calculating...</span> : null}</div>
                {valuation?.fairValue?.mid ? <p className="mt-4 text-sm text-gray-700">Estimated fair value: <strong>{valuation.fairValue.currency || property.currency || 'AED'} {valuation.fairValue.mid.toLocaleString()}</strong></p> : <p className="mt-4 text-sm text-gray-600">{valuationError || 'Valuation is unavailable; the buyer preview is unaffected.'}</p>}
              </section>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4"><p className="text-sm font-semibold text-dark-blue">Buyer preview</p><p className="mt-1 text-xs text-gray-600">This read-only view uses the same listing presentation as the published property.</p></div>
              <ManualPropertyPreview manual={{ ...property, paymentPlan }} previewMode />
              <div className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm font-semibold text-dark-blue">Payment plan readiness</p><p className={`mt-2 text-sm ${paymentValidation.valid ? 'text-emerald-700' : 'text-amber-700'}`}>{paymentPlan.length === 0 ? 'No payment plan added.' : paymentValidation.valid ? 'Payment plan complete: 100% allocated.' : paymentValidation.message}</p></div>

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
              onClick={goToNextStep}
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
