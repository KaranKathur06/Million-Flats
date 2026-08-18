'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import PdfDropzone, { type FileMeta } from '@/components/upload/PdfDropzone'
import GlobalDropdown from '@/components/ui/GlobalDropdown'

interface DevOption { id: string; name: string; slug: string | null }
interface MediaItem {
  id: string
  mediaUrl: string
  mediaType: string
  category?: string | null
  label?: string | null
  sortOrder: number | null
  s3Key: string | null
}
interface VariantRow {
  id?: string
  title: string
  size: string
  price: string
  availabilityStatus: 'AVAILABLE' | 'SOLD_OUT'
  availableUnitsCount: string
}
interface UnitTypeRow {
  id?: string
  unitType: string
  bedrooms: string
  bathrooms: string
  sizeFrom: string
  sizeTo: string
  priceFrom: string
  variants: VariantRow[]
}
interface FloorPlanRow {
  id?: string
  unitType: string
  bedrooms: string
  bathrooms: string
  size: string
  price: string
  imageUrl: string
}
interface AmenityRow { id?: string; name: string; icon: string; category: string }
interface NearbyPlaceRow { id?: string; name: string; category: string; distance: string }
interface PaymentPlanRow { id?: string; itemType: 'BASE_PRICE' | 'FEE'; label: string; amount: string; currency: string; milestone: string }
interface LocationData { latitude: string; longitude: string; address: string; mapUrl: string }
interface VideoRow { id?: string; videoUrl: string; title: string; thumbnail: string }
interface ProjectEditorFormProps {
  mode: 'create' | 'edit'
  projectId?: string
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20',
  PUBLISHED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  ARCHIVED: 'bg-white/[0.06] text-white/40 border-white/[0.08]',
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 120)
}

export default function ProjectEditorForm({ mode, projectId: propProjectId }: ProjectEditorFormProps) {
  const router = useRouter()
  const params = useParams()
  const projectId = propProjectId || (params?.id as string | undefined)

  const [developers, setDevelopers] = useState<DevOption[]>([])
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [developerId, setDeveloperId] = useState('')
  const [countryIso2, setCountryIso2] = useState('AE')
  const [city, setCity] = useState('')
  const [community, setCommunity] = useState('')
  const [description, setDescription] = useState('')
  const [overview, setOverview] = useState('')
  const [completionYear, setCompletionYear] = useState('')
  const [startingPrice, setStartingPrice] = useState('')
  const [goldenVisa, setGoldenVisa] = useState(false)
  const [isFeatured, setIsFeatured] = useState(false)
  const [featuredOrder, setFeaturedOrder] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [status, setStatus] = useState('DRAFT')
  const [leadCount, setLeadCount] = useState(0)

  const [media, setMedia] = useState<MediaItem[]>([])
  const [unitTypes, setUnitTypes] = useState<UnitTypeRow[]>([])
  const [floorPlans, setFloorPlans] = useState<FloorPlanRow[]>([])
  const [highlights, setHighlights] = useState<string[]>([''])
  const [amenities, setAmenities] = useState<AmenityRow[]>([{ name: '', icon: '', category: '' }])
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceRow[]>([{ name: '', category: '', distance: '' }])
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlanRow[]>([{ itemType: 'BASE_PRICE', label: '', amount: '', currency: 'AED', milestone: '' }])
  const [location, setLocation] = useState<LocationData>({ latitude: '', longitude: '', address: '', mapUrl: '' })
  const [videos, setVideos] = useState<VideoRow[]>([{ videoUrl: '', title: '', thumbnail: '' }])
  const [brochureData, setBrochureData] = useState<{ id: string; fileUrl: string; fileName: string; fileSize: number | null } | null>(null)
  const [brochureUploading, setBrochureUploading] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const basePriceScheduleTotal = useMemo(() => {
    return paymentPlans.filter((row) => row.itemType !== 'FEE').reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0)
  }, [paymentPlans])

  const additionalChargesTotal = useMemo(() => {
    return paymentPlans.filter((row) => row.itemType === 'FEE').reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0)
  }, [paymentPlans])

  const totalAcquisitionCost = useMemo(() => {
    return basePriceScheduleTotal + additionalChargesTotal
  }, [additionalChargesTotal, basePriceScheduleTotal])

  const loadDevelopers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/developers')
      const json = await res.json()
      if (json.success) setDevelopers(json.items || [])
    } catch {
      // Ignore
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
      setName(p.name || '')
      setSlug(p.slug || '')
      setDeveloperId(p.developerId || '')
      setCountryIso2(p.countryIso2 || 'AE')
      setCity(p.city || '')
      setCommunity(p.community || '')
      setDescription(p.description || '')
      setOverview(p.overview || '')
      setCompletionYear(p.completionYear ? String(p.completionYear) : '')
      setStartingPrice(p.startingPrice ? String(p.startingPrice) : '')
      setGoldenVisa(Boolean(p.goldenVisa))
      setIsFeatured(Boolean(p.isFeatured))
      setFeaturedOrder(p.featuredOrder !== null && p.featuredOrder !== undefined ? String(p.featuredOrder) : '')
      setCoverImage(p.coverImage || '')
      setStatus(p.status || 'DRAFT')
      setLeadCount(p._count?.leads || 0)
      setMedia(p.media || [])
      setUnitTypes((p.unitTypes || []).map((ut: any) => ({
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
      })))
      setFloorPlans((p.floorPlans || []).map((fp: any) => ({
        id: fp.id,
        unitType: fp.unitType || '',
        bedrooms: fp.bedrooms !== null && fp.bedrooms !== undefined ? String(fp.bedrooms) : '',
        bathrooms: fp.bathrooms !== null && fp.bathrooms !== undefined ? String(fp.bathrooms) : '',
        size: fp.size || '',
        price: fp.price || '',
        imageUrl: fp.imageUrl || '',
      })))
      try {
        const h = p.highlights ? JSON.parse(p.highlights) : []
        setHighlights(Array.isArray(h) ? h : [''])
      } catch {
        setHighlights([''])
      }
      setAmenities((p.amenities || []).map((a: any) => ({ id: a.id, name: a.name || '', icon: a.icon || '', category: a.category || '' })))
      setNearbyPlaces((p.nearbyPlaces || []).map((np: any) => ({ id: np.id, name: np.name || '', category: np.category || '', distance: np.distance || '' })))
      setPaymentPlans((p.paymentPlans || []).map((pp: any) => ({ id: pp.id, itemType: String(pp.itemType || '').toUpperCase() === 'FEE' ? 'FEE' : 'BASE_PRICE', label: pp.label || '', amount: pp.amount !== null && pp.amount !== undefined ? String(pp.amount) : '', currency: pp.currency || 'AED', milestone: pp.milestone || '' })))
      if (p.location) {
        setLocation({ latitude: p.location.latitude != null ? String(p.location.latitude) : '', longitude: p.location.longitude != null ? String(p.location.longitude) : '', address: p.location.address || '', mapUrl: p.location.mapUrl || '' })
      }
      setVideos((p.videos || []).map((v: any) => ({ id: v.id, videoUrl: v.videoUrl || '', title: v.title || '', thumbnail: v.thumbnail || '' })))
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
  useEffect(() => {
    if (mode === 'edit') {
      void loadProject()
    }
  }, [loadProject, mode])

  const addUnitType = () => setUnitTypes((prev) => [...prev, { unitType: '', bedrooms: '', bathrooms: '', sizeFrom: '', sizeTo: '', priceFrom: '', variants: [{ title: 'Type A', size: '', price: '', availabilityStatus: 'AVAILABLE', availableUnitsCount: '' }] }])
  const updateUnitType = (idx: number, field: keyof UnitTypeRow, value: string) => setUnitTypes((prev) => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  const removeUnitType = (idx: number) => setUnitTypes((prev) => prev.filter((_, i) => i !== idx))
  const addVariant = (unitIdx: number) => setUnitTypes((prev) => prev.map((ut, i) => i === unitIdx ? { ...ut, variants: [...(ut.variants || []), { title: `Type ${String.fromCharCode(65 + (ut.variants || []).length)}`, size: '', price: '', availabilityStatus: 'AVAILABLE', availableUnitsCount: '' }] } : ut))
  const updateVariant = (unitIdx: number, variantIdx: number, field: keyof VariantRow, value: string) => setUnitTypes((prev) => prev.map((ut, i) => i === unitIdx ? { ...ut, variants: (ut.variants || []).map((v, j) => j === variantIdx ? { ...v, [field]: value } : v) } : ut))
  const removeVariant = (unitIdx: number, variantIdx: number) => setUnitTypes((prev) => prev.map((ut, i) => i === unitIdx ? { ...ut, variants: (ut.variants || []).filter((_, j) => j !== variantIdx) } : ut))
  const addFloorPlan = () => setFloorPlans((prev) => [...prev, { unitType: '', bedrooms: '', bathrooms: '', size: '', price: '', imageUrl: '' }])
  const updateFloorPlan = (idx: number, field: keyof FloorPlanRow, value: string) => setFloorPlans((prev) => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  const removeFloorPlan = (idx: number) => setFloorPlans((prev) => prev.filter((_, i) => i !== idx))
  const addHighlight = () => setHighlights((prev) => [...prev, ''])
  const updateHighlight = (idx: number, value: string) => setHighlights((prev) => prev.map((row, i) => i === idx ? value : row))
  const removeHighlight = (idx: number) => setHighlights((prev) => prev.filter((_, i) => i !== idx))
  const addAmenity = () => setAmenities((prev) => [...prev, { name: '', icon: '', category: '' }])
  const updateAmenity = (idx: number, field: keyof AmenityRow, value: string) => setAmenities((prev) => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  const removeAmenity = (idx: number) => setAmenities((prev) => prev.filter((_, i) => i !== idx))
  const addNearbyPlace = () => setNearbyPlaces((prev) => [...prev, { name: '', category: '', distance: '' }])
  const updateNearbyPlace = (idx: number, field: keyof NearbyPlaceRow, value: string) => setNearbyPlaces((prev) => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  const removeNearbyPlace = (idx: number) => setNearbyPlaces((prev) => prev.filter((_, i) => i !== idx))
  const addPaymentPlan = () => setPaymentPlans((prev) => [...prev, { itemType: 'BASE_PRICE', label: '', amount: '', currency: 'AED', milestone: '' }])
  const updatePaymentPlan = (idx: number, field: keyof PaymentPlanRow, value: string) => setPaymentPlans((prev) => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  const removePaymentPlan = (idx: number) => setPaymentPlans((prev) => prev.filter((_, i) => i !== idx))
  const addVideo = () => setVideos((prev) => [...prev, { videoUrl: '', title: '', thumbnail: '' }])
  const updateVideo = (idx: number, field: keyof VideoRow, value: string) => setVideos((prev) => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  const removeVideo = (idx: number) => setVideos((prev) => prev.filter((_, i) => i !== idx))

  const validateForm = () => {
    const errors: string[] = []
    if (!name.trim()) errors.push('Project name')
    if (!slug.trim()) errors.push('Slug')
    if (!developerId) errors.push('Developer')
    if (!countryIso2) errors.push('Country')
    if (!city.trim()) errors.push('City')
    if (!description.trim()) errors.push('Description')
    if (!overview.trim()) errors.push('Overview')
    if (!completionYear) errors.push('Completion year')
    if (!startingPrice) errors.push('Starting price')
    const hasHero = Boolean(coverImage || coverFile)
    if (!hasHero) errors.push('Hero image')
    if (!unitTypes.some((ut) => ut.unitType.trim())) errors.push('At least one unit type')
    if (!paymentPlans.some((pp) => pp.label.trim() && pp.amount.trim())) errors.push('Payment schedule')
    if (!location.address.trim() && !location.latitude && !location.longitude) errors.push('Location')
    return errors
  }

  const uploadProjectMedia = async (projectIdValue: string) => {
    if (coverFile) {
      const formData = new FormData()
      formData.append('file', coverFile)
      formData.append('mediaType', 'hero')
      formData.append('sortOrder', '0')
      const res = await fetch(`/api/admin/projects/${projectIdValue}/media`, { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok || !json.success || !json.media?.mediaUrl) throw new Error(json.message || 'Cover image upload failed')
      await fetch(`/api/admin/projects/${projectIdValue}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coverImage: json.media.mediaUrl }) })
    }
    for (let i = 0; i < galleryFiles.length; i += 1) {
      const fd = new FormData()
      fd.append('file', galleryFiles[i])
      fd.append('mediaType', 'interior')
      fd.append('sortOrder', String(i + 1))
      const res = await fetch(`/api/admin/projects/${projectIdValue}/media`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || `Gallery upload failed for ${galleryFiles[i].name}`)
    }
  }

  const uploadBrochure = async (projectIdValue: string) => {
    if (!brochureData) return
    const formData = new FormData()
    formData.append('file', new File([new Blob()], brochureData.fileName, { type: 'application/pdf' }))
  }

  const handleSave = async () => {
    const errors = validateForm()
    if (errors.length) {
      toast.error(`Missing required fields: ${errors.join(', ')}`)
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        developerId,
        countryIso2: countryIso2 || null,
        city: city.trim() || null,
        community: community.trim() || null,
        description: description.trim() || null,
        overview: overview.trim() || null,
        completionYear: completionYear ? parseInt(completionYear, 10) : null,
        startingPrice: startingPrice ? startingPrice.trim() : null,
        goldenVisa,
        isFeatured,
        featuredOrder: featuredOrder ? parseInt(featuredOrder, 10) : null,
        coverImage: coverImage || null,
        unitTypes: unitTypes.filter((ut) => ut.unitType.trim()).map((ut) => ({
          id: ut.id,
          unitType: ut.unitType.trim(),
          bedrooms: ut.bedrooms ? parseInt(ut.bedrooms, 10) : null,
          bathrooms: ut.bathrooms ? parseInt(ut.bathrooms, 10) : null,
          sizeFrom: ut.sizeFrom ? parseInt(ut.sizeFrom, 10) : null,
          sizeTo: ut.sizeTo ? parseInt(ut.sizeTo, 10) : null,
          priceFrom: ut.priceFrom ? ut.priceFrom.trim() : null,
          variants: ut.variants.filter((v) => v.title.trim()).map((v) => ({
            id: v.id,
            title: v.title.trim(),
            size: v.size ? parseInt(v.size, 10) : null,
            price: v.price ? v.price.trim() : null,
            availabilityStatus: v.availabilityStatus,
            availableUnitsCount: v.availableUnitsCount ? parseInt(v.availableUnitsCount, 10) : null,
          })),
        })),
        floorPlans: floorPlans.filter((fp) => fp.unitType.trim() || fp.imageUrl.trim()).map((fp) => ({
          id: fp.id,
          unitType: fp.unitType.trim() || 'Floor Plan',
          bedrooms: fp.bedrooms ? parseInt(fp.bedrooms, 10) : null,
          bathrooms: fp.bathrooms ? parseInt(fp.bathrooms, 10) : null,
          size: fp.size.trim() || null,
          price: fp.price.trim() || null,
          imageUrl: fp.imageUrl.trim() || null,
        })),
        highlights: highlights.filter((h) => h.trim()),
        amenities: amenities.filter((a) => a.name.trim()).map((a) => ({ name: a.name.trim(), icon: a.icon.trim() || null, category: a.category.trim() || null })),
        nearbyPlaces: nearbyPlaces.filter((np) => np.name.trim()).map((np, idx) => ({ name: np.name.trim(), category: np.category.trim() || null, distance: np.distance.trim() || null, sortOrder: idx })),
        paymentPlans: paymentPlans.filter((pp) => pp.label.trim() && pp.amount.trim()).map((pp, idx) => ({ itemType: pp.itemType, label: pp.label.trim(), amount: pp.amount.trim(), currency: pp.currency.trim() || 'AED', milestone: pp.milestone.trim() || null, sortOrder: idx })),
        location: location.address.trim() || location.latitude || location.longitude ? {
          latitude: location.latitude ? parseFloat(location.latitude) : null,
          longitude: location.longitude ? parseFloat(location.longitude) : null,
          address: location.address.trim() || null,
          mapUrl: location.mapUrl.trim() || null,
        } : null,
        videos: videos.filter((v) => v.videoUrl.trim()).map((v, idx) => ({ videoUrl: v.videoUrl.trim(), title: v.title.trim() || null, thumbnail: v.thumbnail.trim() || null, sortOrder: idx })),
      }

      let createdId = projectId
      const endpoint = mode === 'edit' && projectId ? `/api/admin/projects/${projectId}` : '/api/admin/projects'
      const method = mode === 'edit' && projectId ? 'PUT' : 'POST'
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to save project')
      }
      createdId = json.project?.id || createdId
      if (createdId) {
        if (coverFile || galleryFiles.length) await uploadProjectMedia(createdId)
        if (brochureData) {
          try {
            const brochureFormData = new FormData()
            brochureFormData.append('file', new File([new Blob()], brochureData.fileName, { type: 'application/pdf' }))
            await fetch(`/api/admin/projects/${createdId}/brochure`, { method: 'POST', body: brochureFormData })
          } catch {
            // ignore brochure re-upload for existing state
          }
        }
      }
      toast.success(mode === 'edit' ? 'Project updated successfully' : 'Project created successfully')
      if (mode === 'create') {
        router.push('/admin/projects')
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleBrochureUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are allowed for brochures')
    }
    setBrochureUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/admin/projects/${projectId}/brochure`, { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'Brochure upload failed')
      setBrochureData({ id: json.brochure.id, fileUrl: json.brochure.fileUrl, fileName: json.brochure.fileName, fileSize: json.brochure.fileSize ?? null })
      toast.success('Brochure uploaded')
    } catch (err: any) {
      toast.error(err.message || 'Brochure upload failed')
      throw err
    } finally {
      setBrochureUploading(false)
    }
  }

  const handleBrochureDelete = async () => {
    if (!projectId) return
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
          <h1 className="text-2xl font-bold tracking-tight text-white/95">{mode === 'edit' ? (name || 'Edit Project') : 'Create Project'}</h1>
          <div className="mt-2 flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[status] || ''}`}>{status}</span>
            <span className="text-xs text-white/30">{leadCount} leads</span>
            <span className="text-xs text-white/30">{media.length} media</span>
          </div>
        </div>
        {mode === 'edit' ? (
          <div className="flex items-center gap-2">
            <button onClick={() => handleSave()} disabled={saving} className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300 transition-all hover:bg-amber-400/20 disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => handleSave()} disabled={saving} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-amber-300 disabled:opacity-50">{saving ? 'Creating…' : 'Create Project'}</button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Basic Information</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Project Name</label>
              <input value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)) }} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-amber-400/30" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Slug</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Developer</label>
              <GlobalDropdown
                value={developerId}
                onChange={(v) => setDeveloperId(v as string)}
                options={[{ value: '', label: 'Select…' }, ...(developers || []).map((d) => ({ value: d.id, label: d.name }))]}
                showLabel={false}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-amber-400/30"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Country</label>
              <GlobalDropdown
                value={countryIso2}
                onChange={(v) => setCountryIso2(v as string)}
                options={[{ value: 'AE', label: 'UAE' }, { value: 'IN', label: 'India' }]}
                showLabel={false}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-amber-400/30"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Community</label>
              <input value={community} onChange={(e) => setCommunity(e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Completion Year</label>
              <input type="number" value={completionYear} onChange={(e) => setCompletionYear(e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Starting Price</label>
              <input value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} placeholder="e.g. 2.16M or 750K" className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Overview</label>
              <textarea value={overview} onChange={(e) => setOverview(e.target.value)} rows={6} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/80 outline-none focus:border-amber-400/30"></textarea>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/80 outline-none focus:border-amber-400/30"></textarea>
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <button type="button" onClick={() => setGoldenVisa(!goldenVisa)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${goldenVisa ? 'bg-amber-400' : 'bg-white/[0.1]'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${goldenVisa ? 'translate-x-6' : 'translate-x-1'}`} /></button>
              <span className="text-sm text-white/60">Golden Visa Eligible</span>
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <button type="button" onClick={() => setIsFeatured(!isFeatured)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isFeatured ? 'bg-amber-400' : 'bg-white/[0.1]'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isFeatured ? 'translate-x-6' : 'translate-x-1'}`} /></button>
              <span className="text-sm text-white/60">Featured Project</span>
            </div>
            {isFeatured && <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Featured Order</label><input type="number" value={featuredOrder} onChange={(e) => setFeaturedOrder(e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30" /></div>}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Media Gallery</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Hero Image</label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.03] p-6 text-center text-sm text-white/50 transition hover:border-amber-400/30 hover:bg-white/[0.05]">
                <span>{coverFile ? coverFile.name : coverImage ? 'Replace hero image' : 'Upload hero image'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/40">Gallery Images</label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.03] p-6 text-center text-sm text-white/50 transition hover:border-amber-400/30 hover:bg-white/[0.05]">
                <span>{galleryFiles.length ? `${galleryFiles.length} images selected` : 'Upload gallery images'}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))} />
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
            {unitTypes.map((ut, utIdx) => (
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
                        <GlobalDropdown
                          value={variant.availabilityStatus}
                          onChange={(v) => updateVariant(utIdx, variantIdx, 'availabilityStatus', v as 'AVAILABLE' | 'SOLD_OUT')}
                          options={[{ value: 'AVAILABLE', label: 'Available' }, { value: 'SOLD_OUT', label: 'Sold Out' }]}
                          showLabel={false}
                          className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70"
                        />
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
            {floorPlans.map((fp, idx) => (
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
            {highlights.map((highlight, idx) => (
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
            {amenities.map((amenity, idx) => (
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
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Payment Schedule</h2>
            <button type="button" onClick={addPaymentPlan} className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300">+ Add Item</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-white/[0.06] bg-black/10 p-3 text-sm text-white/60">
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300">Base schedule</div>
              <div className="mt-1 font-semibold text-white">{basePriceScheduleTotal ? `${basePriceScheduleTotal.toLocaleString()} AED` : '0 AED'}</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-black/10 p-3 text-sm text-white/60">
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300">Additional fees</div>
              <div className="mt-1 font-semibold text-white">{additionalChargesTotal ? `${additionalChargesTotal.toLocaleString()} AED` : '0 AED'}</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-black/10 p-3 text-sm text-white/60">
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300">Total cost</div>
              <div className="mt-1 font-semibold text-amber-300">{totalAcquisitionCost ? `${totalAcquisitionCost.toLocaleString()} AED` : '0 AED'}</div>
            </div>
          </div>
          <div className="space-y-3">
            {paymentPlans.map((pp, idx) => (
              <div key={pp.id ?? `project-payment-plan-${idx}`} className="grid gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-4 md:grid-cols-5">
                <GlobalDropdown
                  value={pp.itemType}
                  onChange={(v) => updatePaymentPlan(idx, 'itemType', v as 'BASE_PRICE' | 'FEE')}
                  options={[{ value: 'BASE_PRICE', label: 'Base price' }, { value: 'FEE', label: 'Additional fee' }]}
                  showLabel={false}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70"
                />
                <input value={pp.label} onChange={(e) => updatePaymentPlan(idx, 'label', e.target.value)} placeholder="Item label" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
                <input value={pp.amount} onChange={(e) => updatePaymentPlan(idx, 'amount', e.target.value)} placeholder="Amount" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
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
            {nearbyPlaces.map((np, idx) => (
              <div key={np.id ?? `nearby-place-${idx}`} className="grid gap-3 rounded-xl border border-white/[0.06] bg-black/10 p-4 md:grid-cols-4">
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
            <input value={location.address} onChange={(e) => setLocation((prev) => ({ ...prev, address: e.target.value }))} placeholder="Address" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
            <input value={location.mapUrl} onChange={(e) => setLocation((prev) => ({ ...prev, mapUrl: e.target.value }))} placeholder="Google Maps URL" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
            <input value={location.latitude} onChange={(e) => setLocation((prev) => ({ ...prev, latitude: e.target.value }))} placeholder="Latitude" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
            <input value={location.longitude} onChange={(e) => setLocation((prev) => ({ ...prev, longitude: e.target.value }))} placeholder="Longitude" className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Videos</h2>
            <button type="button" onClick={addVideo} className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-300">+ Add Video</button>
          </div>
          <div className="space-y-3">
            {videos.map((video, idx) => (
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
