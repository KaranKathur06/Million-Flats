'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import PdfDropzone, { type FileMeta } from '@/components/upload/PdfDropzone'
import type { ProjectFormMode, ProjectFormData, DevOption, MediaItem, UnitTypeRow, FloorPlanRow, AmenityRow, NearbyPlaceRow, PaymentPlanRow, LocationData, VideoRow, VariantRow } from './ProjectFormSchema'
import { buildProjectPayload, DEFAULT_FORM_DATA, PROJECT_COUNTRY_OPTIONS, PROJECT_FLOOR_PLAN_ALLOWED_EXTENSIONS, PROJECT_FLOOR_PLAN_ALLOWED_TYPES, PROJECT_FLOOR_PLAN_MAX_SIZE, PROJECT_BROCHURE_ALLOWED_TYPE, PROJECT_BROCHURE_MAX_SIZE, slugify } from './ProjectFormSchema'

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20',
  PUBLISHED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  ARCHIVED: 'bg-white/[0.06] text-white/40 border-white/[0.08]',
}

type ProjectFormProps = {
  mode: ProjectFormMode
  projectId?: string
}

function validatePaymentTotals(paymentPlans: PaymentPlanRow[]) {
  const numeric = paymentPlans
    .filter((row) => row.label.trim() && row.amount.trim())
    .map((row) => Number.parseFloat(row.amount))
    .filter((value) => Number.isFinite(value))

  return numeric.reduce((sum, value) => sum + value, 0)
}

export default function ProjectForm({ mode, projectId: propProjectId }: ProjectFormProps) {
  const router = useRouter()
  const params = useParams()
  const projectId = propProjectId || (params?.id as string | undefined)

  const [developers, setDevelopers] = useState<DevOption[]>([])
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [brochureUploading, setBrochureUploading] = useState(false)
  const [brochureData, setBrochureData] = useState<{ id: string; fileUrl: string; fileName: string; fileSize: number | null } | null>(null)
  const [pendingMedia, setPendingMedia] = useState<Record<string, File[]>>({})
  const [pendingBrochure, setPendingBrochure] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [status, setStatus] = useState('DRAFT')
  const [leadCount, setLeadCount] = useState(0)
  const [formData, setFormData] = useState<ProjectFormData>(DEFAULT_FORM_DATA)

  const paymentTotal = useMemo(() => validatePaymentTotals(formData.paymentPlans), [formData.paymentPlans])
  const paymentIsValid = paymentTotal === 100

  const updateField = <K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const loadDevelopers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/developers')
      const json = await res.json()
      if (json.success) setDevelopers(json.items || [])
    } catch {
      // ignore
    }
  }, [])

  const loadProject = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Project not found')
      const p = json.project
      const nextData: ProjectFormData = {
        name: p.name || '',
        slug: p.slug || '',
        developerId: p.developerId || '',
        countryIso2: p.countryIso2 || 'AE',
        city: p.city || '',
        community: p.community || '',
        description: p.description || '',
        overview: p.overview || '',
        completionYear: p.completionYear ? String(p.completionYear) : '',
        startingPrice: p.startingPrice ? String(p.startingPrice) : '',
        goldenVisa: Boolean(p.goldenVisa),
        isFeatured: Boolean(p.isFeatured),
        featuredOrder: p.featuredOrder !== null && p.featuredOrder !== undefined ? String(p.featuredOrder) : '',
        coverImage: p.coverImage || '',
        status: p.status || 'DRAFT',
        leadCount: p._count?.leads || 0,
        media: (p.media || []).map((m: MediaItem) => ({ ...m })),
        unitTypes: (p.unitTypes || []).map((ut: any) => ({
          id: ut.id,
          unitType: ut.unitType || '',
          bedrooms: ut.bedrooms !== null && ut.bedrooms !== undefined ? String(ut.bedrooms) : '',
          bathrooms: ut.bathrooms !== null && ut.bathrooms !== undefined ? String(ut.bathrooms) : '',
          sizeFrom: ut.sizeFrom ? String(ut.sizeFrom) : '',
          sizeTo: ut.sizeTo ? String(ut.sizeTo) : '',
          priceFrom: ut.priceFrom ? String(ut.priceFrom) : '',
          variants: ((ut.variants && ut.variants.length > 0) ? ut.variants : [{ title: ut.unitType || 'Type A', size: ut.sizeFrom || null, price: ut.priceFrom || null, availabilityStatus: 'AVAILABLE', availableUnitsCount: null }]).map((v: any) => ({
            id: v.id,
            title: v.title || '',
            size: v.size !== null && v.size !== undefined ? String(v.size) : '',
            price: v.price !== null && v.price !== undefined ? String(v.price) : '',
            availabilityStatus: v.availabilityStatus || 'AVAILABLE',
            availableUnitsCount: v.availableUnitsCount !== null && v.availableUnitsCount !== undefined ? String(v.availableUnitsCount) : '',
          })),
        })),
        floorPlans: (p.floorPlans || []).map((fp: any) => ({
          id: fp.id,
          unitType: fp.unitType || '',
          bedrooms: fp.bedrooms !== null && fp.bedrooms !== undefined ? String(fp.bedrooms) : '',
          bathrooms: fp.bathrooms !== null && fp.bathrooms !== undefined ? String(fp.bathrooms) : '',
          size: fp.size || '',
          price: fp.price || '',
          imageUrl: fp.imageUrl || '',
          fileName: fp.imageUrl ? fp.imageUrl.split('/').pop() : '',
          fileType: fp.imageUrl?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
        })),
        highlights: (() => { try { const h = p.highlights ? JSON.parse(p.highlights) : []; return Array.isArray(h) ? h : [''] } catch { return [''] } })(),
        amenities: (p.amenities || []).map((a: any) => ({ id: a.id, name: a.name || '', icon: a.icon || '', category: a.category || '' })),
        nearbyPlaces: (p.nearbyPlaces || []).map((np: any) => ({ id: np.id, name: np.name || '', category: np.category || '', distance: np.distance || '' })),
        paymentPlans: (p.paymentPlans || []).map((pp: any) => ({ id: pp.id, itemType: String(pp.itemType || '').toUpperCase() === 'FEE' ? 'FEE' : 'BASE_PRICE', label: pp.label || '', amount: pp.amount !== null && pp.amount !== undefined ? String(pp.amount) : '', currency: pp.currency || 'AED', milestone: pp.milestone || '' })),
        location: p.location ? { latitude: p.location.latitude != null ? String(p.location.latitude) : '', longitude: p.location.longitude != null ? String(p.location.longitude) : '', address: p.location.address || '', mapUrl: p.location.mapUrl || '' } : { latitude: '', longitude: '', address: '', mapUrl: '' },
        videos: (p.videos || []).map((v: any) => ({ id: v.id, videoUrl: v.videoUrl || '', title: v.title || '', thumbnail: v.thumbnail || '' })),
      }
      setFormData(nextData)
      setStatus(p.status || 'DRAFT')
      setLeadCount(p._count?.leads || 0)
      if (p.brochure) {
        setBrochureData({ id: p.brochure.id, fileUrl: p.brochure.fileUrl, fileName: p.brochure.fileName, fileSize: p.brochure.fileSize ?? null })
      } else {
        setBrochureData(null)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void loadDevelopers() }, [loadDevelopers])
  useEffect(() => { if (mode === 'edit') void loadProject() }, [loadProject, mode])

  const addUnitType = () => updateField('unitTypes', [...formData.unitTypes, { unitType: '', bedrooms: '', bathrooms: '', sizeFrom: '', sizeTo: '', priceFrom: '', variants: [{ title: 'Type A', size: '', price: '', availabilityStatus: 'AVAILABLE', availableUnitsCount: '' }] }])
  const updateUnitType = (idx: number, field: keyof UnitTypeRow, value: string) => setFormData((prev) => ({ ...prev, unitTypes: prev.unitTypes.map((row, i) => i === idx ? { ...row, [field]: value } : row) }))
  const removeUnitType = (idx: number) => setFormData((prev) => ({ ...prev, unitTypes: prev.unitTypes.filter((_, i) => i !== idx) }))
  const addVariant = (unitIdx: number) => setFormData((prev) => ({ ...prev, unitTypes: prev.unitTypes.map((ut, i) => i === unitIdx ? { ...ut, variants: [...(ut.variants || []), { title: `Type ${String.fromCharCode(65 + (ut.variants || []).length)}`, size: '', price: '', availabilityStatus: 'AVAILABLE', availableUnitsCount: '' }] } : ut) }))
  const updateVariant = (unitIdx: number, variantIdx: number, field: keyof VariantRow, value: string) => setFormData((prev) => ({ ...prev, unitTypes: prev.unitTypes.map((ut, i) => i === unitIdx ? { ...ut, variants: (ut.variants || []).map((v, j) => j === variantIdx ? { ...v, [field]: value } : v) } : ut) }))
  const removeVariant = (unitIdx: number, variantIdx: number) => setFormData((prev) => ({ ...prev, unitTypes: prev.unitTypes.map((ut, i) => i === unitIdx ? { ...ut, variants: (ut.variants || []).filter((_, j) => j !== variantIdx) } : ut) }))
  const addFloorPlan = () => setFormData((prev) => ({ ...prev, floorPlans: [...prev.floorPlans, { unitType: '', bedrooms: '', bathrooms: '', size: '', price: '', imageUrl: '', fileName: '', fileType: '' }] }))
  const updateFloorPlan = (idx: number, field: keyof FloorPlanRow, value: string) => setFormData((prev) => ({ ...prev, floorPlans: prev.floorPlans.map((row, i) => i === idx ? { ...row, [field]: value } : row) }))
  const removeFloorPlan = (idx: number) => setFormData((prev) => ({ ...prev, floorPlans: prev.floorPlans.filter((_, i) => i !== idx) }))
  const addHighlight = () => setFormData((prev) => ({ ...prev, highlights: [...prev.highlights, ''] }))
  const updateHighlight = (idx: number, value: string) => setFormData((prev) => ({ ...prev, highlights: prev.highlights.map((row, i) => i === idx ? value : row) }))
  const removeHighlight = (idx: number) => setFormData((prev) => ({ ...prev, highlights: prev.highlights.filter((_, i) => i !== idx) }))
  const addAmenity = () => setFormData((prev) => ({ ...prev, amenities: [...prev.amenities, { name: '', icon: '', category: '' }] }))
  const updateAmenity = (idx: number, field: keyof AmenityRow, value: string) => setFormData((prev) => ({ ...prev, amenities: prev.amenities.map((row, i) => i === idx ? { ...row, [field]: value } : row) }))
  const removeAmenity = (idx: number) => setFormData((prev) => ({ ...prev, amenities: prev.amenities.filter((_, i) => i !== idx) }))
  const addNearbyPlace = () => setFormData((prev) => ({ ...prev, nearbyPlaces: [...prev.nearbyPlaces, { name: '', category: '', distance: '' }] }))
  const updateNearbyPlace = (idx: number, field: keyof NearbyPlaceRow, value: string) => setFormData((prev) => ({ ...prev, nearbyPlaces: prev.nearbyPlaces.map((row, i) => i === idx ? { ...row, [field]: value } : row) }))
  const removeNearbyPlace = (idx: number) => setFormData((prev) => ({ ...prev, nearbyPlaces: prev.nearbyPlaces.filter((_, i) => i !== idx) }))
  const addPaymentPlan = () => setFormData((prev) => ({ ...prev, paymentPlans: [...prev.paymentPlans, { itemType: 'BASE_PRICE', label: '', amount: '', currency: 'AED', milestone: '' }] }))
  const updatePaymentPlan = (idx: number, field: keyof PaymentPlanRow, value: string) => setFormData((prev) => ({ ...prev, paymentPlans: prev.paymentPlans.map((row, i) => i === idx ? { ...row, [field]: value } : row) }))
  const removePaymentPlan = (idx: number) => setFormData((prev) => ({ ...prev, paymentPlans: prev.paymentPlans.filter((_, i) => i !== idx) }))
  const addVideo = () => setFormData((prev) => ({ ...prev, videos: [...prev.videos, { videoUrl: '', title: '', thumbnail: '' }] }))
  const updateVideo = (idx: number, field: keyof VideoRow, value: string) => setFormData((prev) => ({ ...prev, videos: prev.videos.map((row, i) => i === idx ? { ...row, [field]: value } : row) }))
  const removeVideo = (idx: number) => setFormData((prev) => ({ ...prev, videos: prev.videos.filter((_, i) => i !== idx) }))

  const validateForm = () => {
    const errors: string[] = []
    if (!formData.name.trim()) errors.push('Project name')
    if (!formData.slug.trim()) errors.push('Slug')
    if (!formData.developerId) errors.push('Developer')
    if (!formData.countryIso2) errors.push('Country')
    if (!formData.city.trim()) errors.push('City')
    if (!formData.description.trim()) errors.push('Description')
    if (!formData.overview.trim()) errors.push('Overview')
    if (!formData.completionYear) errors.push('Completion year')
    if (!formData.startingPrice) errors.push('Starting price')
    if (!formData.coverImage && !coverFile) errors.push('Hero image')
    if (!formData.unitTypes.some((ut) => ut.unitType.trim())) errors.push('At least one unit type')
    if (!formData.paymentPlans.some((pp) => pp.label.trim() && pp.amount.trim())) errors.push('Payment schedule')
    if (!formData.location.address.trim() && !formData.location.latitude && !formData.location.longitude) errors.push('Location')
    return errors
  }

  const uploadProjectMedia = async (projectIdValue: string) => {
    const uploads = Object.entries(pendingMedia)
    for (const [category, files] of uploads) {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const fd = new FormData()
        fd.append('file', file)
        fd.append('category', category)
        fd.append('sortOrder', String(index + 1))
        const res = await fetch(`/api/admin/projects/${projectIdValue}/media`, { method: 'POST', body: fd })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.message || `Media upload failed for ${file.name}`)
      }
    }
  }

  const uploadBrochureForProject = async (projectIdValue: string) => {
    if (!pendingBrochure) return
    const formDataBody = new FormData()
    formDataBody.append('file', pendingBrochure)
    const res = await fetch(`/api/admin/projects/${projectIdValue}/brochure`, { method: 'POST', body: formDataBody })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.message || 'Brochure upload failed')
    setBrochureData({ id: json.brochure.id, fileUrl: json.brochure.fileUrl, fileName: json.brochure.fileName, fileSize: json.brochure.fileSize ?? null })
  }

  const handleSave = async () => {
    const errors = validateForm()
    if (errors.length) {
      toast.error(`Missing required fields: ${errors.join(', ')}`)
      return
    }
    if (formData.paymentPlans.length > 0 && !paymentIsValid) {
      toast.error('Payment plan totals must equal 100% before submission')
      return
    }

    setSaving(true)
    try {
      const payload = buildProjectPayload(formData)
      const isEdit = mode === 'edit' && Boolean(projectId)
      const endpoint = isEdit ? `/api/admin/projects/${projectId}` : '/api/admin/projects'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save project')

      const createdId = json.project?.id || projectId
      if (createdId) {
        if (coverFile) {
          const heroFormData = new FormData()
          heroFormData.append('file', coverFile)
          heroFormData.append('category', 'hero')
          heroFormData.append('sortOrder', '0')
          const heroRes = await fetch(`/api/admin/projects/${createdId}/media`, { method: 'POST', body: heroFormData })
          const heroJson = await heroRes.json()
          if (!heroRes.ok || !heroJson.success) throw new Error(heroJson.message || 'Hero upload failed')
        }
        if (Object.keys(pendingMedia).length) await uploadProjectMedia(createdId)
        if (pendingBrochure) await uploadBrochureForProject(createdId)
      }

      toast.success(isEdit ? 'Project updated successfully' : 'Project created successfully')
      if (!isEdit) router.push('/admin/projects')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleBrochureUpload = async (file: File) => {
    if (file.type !== PROJECT_BROCHURE_ALLOWED_TYPE) {
      throw new Error('Only PDF files are allowed for brochures')
    }
    if (file.size > PROJECT_BROCHURE_MAX_SIZE) {
      throw new Error('Brochure must be 20MB or less')
    }
    setBrochureUploading(true)
    try {
      setPendingBrochure(file)
      if (mode === 'edit' && projectId) {
        const formDataBody = new FormData()
        formDataBody.append('file', file)
        const res = await fetch(`/api/admin/projects/${projectId}/brochure`, { method: 'POST', body: formDataBody })
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.message || 'Brochure upload failed')
        setBrochureData({ id: json.brochure.id, fileUrl: json.brochure.fileUrl, fileName: json.brochure.fileName, fileSize: json.brochure.fileSize ?? null })
      }
      toast.success('Brochure prepared for save')
    } catch (err: any) {
      toast.error(err.message || 'Brochure upload failed')
      throw err
    } finally {
      setBrochureUploading(false)
    }
  }

  const handleBrochureDelete = async () => {
    if (!projectId) {
      setPendingBrochure(null)
      setBrochureData(null)
      return
    }
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/brochure`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'Delete failed')
      setBrochureData(null)
      toast.success('Brochure deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete brochure')
    }
  }

  const brochureMeta: FileMeta | null = brochureData ? { id: brochureData.id, name: brochureData.fileName, size: brochureData.fileSize || 0, url: brochureData.fileUrl } : null

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-white/50">Loading project…</div>
  }

  return (
    <div className="w-full">
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#1a2035', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' } }} />
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">{mode === 'edit' ? (formData.name || 'Edit Project') : 'Create Project'}</h1>
          <div className="mt-2 flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[status] || ''}`}>{status}</span>
            <span className="text-xs text-white/30">{leadCount} leads</span>
            <span className="text-xs text-white/30">{formData.media.length} media</span>
          </div>
        </div>
        <button onClick={() => void handleSave()} disabled={saving} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${mode === 'edit' ? 'border border-amber-400/20 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20' : 'bg-amber-400 text-black hover:bg-amber-300'} disabled:opacity-50`}>
          {saving ? (mode === 'edit' ? 'Saving…' : 'Creating…') : (mode === 'edit' ? 'Save Changes' : 'Create Project')}
        </button>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Basic Information</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Project Name</label>
              <input value={formData.name} onChange={(e) => { updateField('name', e.target.value); if (!formData.slug) updateField('slug', slugify(e.target.value)) }} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-amber-400/30" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Slug</label>
              <input value={formData.slug} onChange={(e) => updateField('slug', e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Developer</label>
              <select value={formData.developerId} onChange={(e) => updateField('developerId', e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-amber-400/30">
                <option value="" className="text-black">Select…</option>
                {developers.map((d) => <option key={d.id} value={d.id} className="text-black">{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Country</label>
              <select value={formData.countryIso2} onChange={(e) => updateField('countryIso2', e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-amber-400/30">
                {PROJECT_COUNTRY_OPTIONS.map((option) => <option key={option.value} value={option.value} className="text-black">{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">City</label>
              <input value={formData.city} onChange={(e) => updateField('city', e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Community</label>
              <input value={formData.community} onChange={(e) => updateField('community', e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Completion Year</label>
              <input type="number" value={formData.completionYear} onChange={(e) => updateField('completionYear', e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Starting Price</label>
              <input value={formData.startingPrice} onChange={(e) => updateField('startingPrice', e.target.value)} placeholder="e.g. 2.16M or 750K" className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Overview</label>
              <textarea value={formData.overview} onChange={(e) => updateField('overview', e.target.value)} rows={6} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/80 outline-none focus:border-amber-400/30"></textarea>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Description</label>
              <textarea value={formData.description} onChange={(e) => updateField('description', e.target.value)} rows={8} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/80 outline-none focus:border-amber-400/30"></textarea>
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <button type="button" onClick={() => updateField('goldenVisa', !formData.goldenVisa)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.goldenVisa ? 'bg-amber-400' : 'bg-white/[0.1]'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.goldenVisa ? 'translate-x-6' : 'translate-x-1'}`} /></button>
              <span className="text-sm text-white/60">Golden Visa Eligible</span>
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <button type="button" onClick={() => updateField('isFeatured', !formData.isFeatured)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isFeatured ? 'bg-amber-400' : 'bg-white/[0.1]'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.isFeatured ? 'translate-x-6' : 'translate-x-1'}`} /></button>
              <span className="text-sm text-white/60">Featured Project</span>
            </div>
            {formData.isFeatured && <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Featured Order</label><input type="number" value={formData.featuredOrder} onChange={(e) => updateField('featuredOrder', e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30" /></div>}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Media Gallery</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Hero Image</label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.03] p-6 text-center text-sm text-white/50 transition hover:border-amber-400/30 hover:bg-white/[0.05]">
                <span>{coverFile ? coverFile.name : formData.coverImage ? 'Replace hero image' : 'Upload hero image'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Gallery Images</label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.03] p-6 text-center text-sm text-white/50 transition hover:border-amber-400/30 hover:bg-white/[0.05]">
                <span>{Object.values(pendingMedia).flat().length ? `${Object.values(pendingMedia).flat().length} files selected` : 'Upload gallery files'}</span>
                <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  const next = files.reduce<Record<string, File[]>>((acc, file) => {
                    acc.gallery = [...(acc.gallery || []), file]
                    return acc
                  }, {})
                  setPendingMedia(next)
                }} />
              </label>
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Brochure</h3>
            <PdfDropzone value={brochureMeta} onUpload={handleBrochureUpload} onDelete={handleBrochureDelete} loading={brochureUploading} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Unit Types</h2>
            <button type="button" onClick={addUnitType} className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300">+ Add Unit Type</button>
          </div>
          <div className="space-y-4">
            {formData.unitTypes.map((ut, utIdx) => (
              <div key={`${ut.unitType || utIdx}-${utIdx}`} className="rounded-xl border border-white/[0.06] bg-black/10 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <input value={ut.unitType} onChange={(e) => updateUnitType(utIdx, 'unitType', e.target.value)} placeholder="Unit type name" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/80 outline-none" />
                  <button type="button" onClick={() => removeUnitType(utIdx)} className="ml-3 text-xs text-red-400">Remove</button>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <input value={ut.bedrooms} onChange={(e) => updateUnitType(utIdx, 'bedrooms', e.target.value)} placeholder="Bedrooms" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                  <input value={ut.bathrooms} onChange={(e) => updateUnitType(utIdx, 'bathrooms', e.target.value)} placeholder="Bathrooms" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                  <input value={ut.sizeFrom} onChange={(e) => updateUnitType(utIdx, 'sizeFrom', e.target.value)} placeholder="Min Size" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                  <input value={ut.sizeTo} onChange={(e) => updateUnitType(utIdx, 'sizeTo', e.target.value)} placeholder="Max Size" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                </div>
                <div className="mt-3">
                  <input value={ut.priceFrom} onChange={(e) => updateUnitType(utIdx, 'priceFrom', e.target.value)} placeholder="Starting Price" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">Variants</h4>
                    <button type="button" onClick={() => addVariant(utIdx)} className="text-xs text-amber-300">+ Add Variant</button>
                  </div>
                  {ut.variants.map((variant, variantIdx) => (
                    <div key={`${variant.title}-${variantIdx}`} className="mb-2 grid gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 md:grid-cols-4">
                      <input value={variant.title} onChange={(e) => updateVariant(utIdx, variantIdx, 'title', e.target.value)} placeholder="Title" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                      <input value={variant.size} onChange={(e) => updateVariant(utIdx, variantIdx, 'size', e.target.value)} placeholder="Size" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                      <input value={variant.price} onChange={(e) => updateVariant(utIdx, variantIdx, 'price', e.target.value)} placeholder="Price" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                      <div className="flex items-center justify-end gap-2">
                        <select value={variant.availabilityStatus} onChange={(e) => updateVariant(utIdx, variantIdx, 'availabilityStatus', e.target.value as 'AVAILABLE' | 'SOLD_OUT')} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70">
                          <option value="AVAILABLE" className="text-black">Available</option>
                          <option value="SOLD_OUT" className="text-black">Sold Out</option>
                        </select>
                        <button type="button" onClick={() => removeVariant(utIdx, variantIdx)} className="text-xs text-red-400">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Floor Plans</h2>
            <button type="button" onClick={addFloorPlan} className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300">+ Add Floor Plan</button>
          </div>
          <div className="space-y-3">
            {formData.floorPlans.map((fp, idx) => (
              <div key={`${fp.unitType || idx}-${idx}`} className="grid gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-4 md:grid-cols-6">
                <input value={fp.unitType} onChange={(e) => updateFloorPlan(idx, 'unitType', e.target.value)} placeholder="Unit Type" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <input value={fp.bedrooms} onChange={(e) => updateFloorPlan(idx, 'bedrooms', e.target.value)} placeholder="Bedrooms" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <input value={fp.bathrooms} onChange={(e) => updateFloorPlan(idx, 'bathrooms', e.target.value)} placeholder="Bathrooms" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <input value={fp.size} onChange={(e) => updateFloorPlan(idx, 'size', e.target.value)} placeholder="Area" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <input value={fp.price} onChange={(e) => updateFloorPlan(idx, 'price', e.target.value)} placeholder="Price" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <button type="button" onClick={() => removeFloorPlan(idx)} className="text-xs text-red-400">Delete</button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Key Highlights</h2>
            <button type="button" onClick={addHighlight} className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300">+ Add Highlight</button>
          </div>
          <div className="space-y-2">
            {formData.highlights.map((highlight, idx) => (
              <div key={`${highlight || idx}-${idx}`} className="flex items-center gap-2">
                <input value={highlight} onChange={(e) => updateHighlight(idx, e.target.value)} placeholder="Highlight" className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <button type="button" onClick={() => removeHighlight(idx)} className="text-xs text-red-400">Remove</button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Amenities</h2>
            <button type="button" onClick={addAmenity} className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300">+ Add Amenity</button>
          </div>
          <div className="space-y-3">
            {formData.amenities.map((amenity, idx) => (
              <div key={`${amenity.name || idx}-${idx}`} className="grid gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-4 md:grid-cols-3">
                <input value={amenity.name} onChange={(e) => updateAmenity(idx, 'name', e.target.value)} placeholder="Amenity" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <input value={amenity.icon} onChange={(e) => updateAmenity(idx, 'icon', e.target.value)} placeholder="Icon" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <input value={amenity.category} onChange={(e) => updateAmenity(idx, 'category', e.target.value)} placeholder="Category" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Payment Plans</h2>
            <button type="button" onClick={addPaymentPlan} className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300">+ Add Stage</button>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-black/10 p-3 text-sm text-white/60">
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300">Payment total</div>
            <div className={`mt-1 font-semibold ${paymentIsValid ? 'text-emerald-300' : 'text-amber-300'}`}>{paymentTotal.toFixed(0)}%</div>
          </div>
          <div className="space-y-3">
            {formData.paymentPlans.map((pp, idx) => (
              <div key={`${pp.label || idx}-${idx}`} className="grid gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-4 md:grid-cols-5">
                <select value={pp.itemType} onChange={(e) => updatePaymentPlan(idx, 'itemType', e.target.value)} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70">
                  <option value="BASE_PRICE" className="text-black">Base price</option>
                  <option value="FEE" className="text-black">Additional fee</option>
                </select>
                <input value={pp.label} onChange={(e) => updatePaymentPlan(idx, 'label', e.target.value)} placeholder="Stage" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <input value={pp.amount} onChange={(e) => updatePaymentPlan(idx, 'amount', e.target.value)} placeholder="Percentage" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <input value={pp.currency} onChange={(e) => updatePaymentPlan(idx, 'currency', e.target.value)} placeholder="Currency" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <div className="flex items-center justify-between gap-2">
                  <input value={pp.milestone} onChange={(e) => updatePaymentPlan(idx, 'milestone', e.target.value)} placeholder="Milestone" className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                  <button type="button" onClick={() => removePaymentPlan(idx)} className="text-xs text-red-400">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Nearby Places</h2>
            <button type="button" onClick={addNearbyPlace} className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300">+ Add Place</button>
          </div>
          <div className="space-y-3">
            {formData.nearbyPlaces.map((np, idx) => (
              <div key={`${np.name || idx}-${idx}`} className="grid gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-4 md:grid-cols-4">
                <input value={np.name} onChange={(e) => updateNearbyPlace(idx, 'name', e.target.value)} placeholder="Name" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <input value={np.category} onChange={(e) => updateNearbyPlace(idx, 'category', e.target.value)} placeholder="Category" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <input value={np.distance} onChange={(e) => updateNearbyPlace(idx, 'distance', e.target.value)} placeholder="Distance" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <button type="button" onClick={() => removeNearbyPlace(idx)} className="text-xs text-red-400">Delete</button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Location</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <input value={formData.location.address} onChange={(e) => setFormData((prev) => ({ ...prev, location: { ...prev.location, address: e.target.value } }))} placeholder="Address" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
            <input value={formData.location.mapUrl} onChange={(e) => setFormData((prev) => ({ ...prev, location: { ...prev.location, mapUrl: e.target.value } }))} placeholder="Google Maps URL" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
            <input value={formData.location.latitude} onChange={(e) => setFormData((prev) => ({ ...prev, location: { ...prev.location, latitude: e.target.value } }))} placeholder="Latitude" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
            <input value={formData.location.longitude} onChange={(e) => setFormData((prev) => ({ ...prev, location: { ...prev.location, longitude: e.target.value } }))} placeholder="Longitude" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Videos</h2>
            <button type="button" onClick={addVideo} className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300">+ Add Video</button>
          </div>
          <div className="space-y-3">
            {formData.videos.map((video, idx) => (
              <div key={`${video.videoUrl || idx}-${idx}`} className="grid gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-4 md:grid-cols-4">
                <input value={video.title} onChange={(e) => updateVideo(idx, 'title', e.target.value)} placeholder="Title" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <input value={video.videoUrl} onChange={(e) => updateVideo(idx, 'videoUrl', e.target.value)} placeholder="YouTube / Vimeo / MP4 URL" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <input value={video.thumbnail} onChange={(e) => updateVideo(idx, 'thumbnail', e.target.value)} placeholder="Thumbnail URL" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <button type="button" onClick={() => removeVideo(idx)} className="text-xs text-red-400">Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
