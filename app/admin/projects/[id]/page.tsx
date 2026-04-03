'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import SelectDropdown from '@/components/SelectDropdown'
import toast, { Toaster } from 'react-hot-toast'
import PdfDropzone, { type FileMeta } from '@/components/upload/PdfDropzone'

interface DevOption { id: string; name: string; slug: string | null }
interface MediaItem {
    id: string
    mediaUrl: string
    mediaType: string
    category?: 'hero' | 'gallery' | 'interior' | 'exterior' | 'amenities' | 'lifestyle' | 'floor_plan' | null
    label?: string | null
    sortOrder: number | null
    s3Key: string | null
}
interface VariantRow {
    id?: string
    title: string
    size: string
    price: string
    facing: string
    view: string
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
interface PaymentPlanRow { id?: string; stage: string; percentage: string; milestone: string }
interface LocationData { latitude: string; longitude: string; address: string; mapUrl: string }
interface VideoRow { id?: string; videoUrl: string; title: string; thumbnail: string }

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20',
    PUBLISHED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    ARCHIVED: 'bg-white/[0.06] text-white/40 border-white/[0.08]',
}

export default function AdminEditProjectPage() {
    const router = useRouter()
    const params = useParams()
    const projectId = params?.id as string

    const [developers, setDevelopers] = useState<DevOption[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Project data
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [developerId, setDeveloperId] = useState('')
    const [city, setCity] = useState('')
    const [community, setCommunity] = useState('')
    const [countryIso2, setCountryIso2] = useState('AE')
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

    // Media
    const [media, setMedia] = useState<MediaItem[]>([])
    const [uploading, setUploading] = useState(false)
    const [uploadCategory, setUploadCategory] = useState<'hero' | 'gallery' | 'interior' | 'exterior' | 'amenities' | 'lifestyle' | 'floor_plan'>('interior')
    const [uploadVariantId, setUploadVariantId] = useState('')
    const [projectSlugForUpload, setProjectSlugForUpload] = useState('')
    const [developerSlugForUpload, setDeveloperSlugForUpload] = useState('')

    // Unit types
    const [unitTypes, setUnitTypes] = useState<UnitTypeRow[]>([])
    const [floorPlans, setFloorPlans] = useState<FloorPlanRow[]>([])
    const [highlights, setHighlights] = useState<string[]>([])
    const [amenities, setAmenities] = useState<AmenityRow[]>([])
    const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceRow[]>([])
    const [paymentPlans, setPaymentPlans] = useState<PaymentPlanRow[]>([])
    const [location, setLocation] = useState<LocationData>({ latitude: '', longitude: '', address: '', mapUrl: '' })
    const [videos, setVideos] = useState<VideoRow[]>([])
    // Brochure
    const [brochureData, setBrochureData] = useState<{ id: string; fileUrl: string; fileName: string; fileSize: number | null } | null>(null)
    const [brochureUploading, setBrochureUploading] = useState(false)
    const variantOptions = useMemo(() => {
        const opts: Array<{ value: string; label: string }> = [{ value: '', label: 'Select Variant' }]
        for (const ut of unitTypes) {
            for (const v of ut.variants || []) {
                const id = String(v.id || '').trim()
                if (!id) continue
                opts.push({ value: id, label: `${ut.unitType || 'Unit'} • ${v.title || 'Variant'}` })
            }
        }
        return opts
    }, [unitTypes])

    const loadProject = useCallback(async () => {
        setLoading(true)
        try {
            const [projRes, devRes] = await Promise.all([
                fetch(`/api/admin/projects/${projectId}`),
                fetch('/api/admin/developers'),
            ])
            const projJson = await projRes.json()
            const devJson = await devRes.json()

            if (devJson.success) setDevelopers(devJson.items || [])

            if (!projJson.success) throw new Error(projJson.message || 'Not found')
            const p = projJson.project

            setName(p.name || '')
            setSlug(p.slug || '')
            setProjectSlugForUpload(p.slug || '')
            setDeveloperSlugForUpload(p.developer?.slug || '')
            setDeveloperId(p.developerId || '')
            setCity(p.city || '')
            setCommunity(p.community || '')
            setCountryIso2(p.countryIso2 || 'AE')
            setDescription(p.description || '')
            setOverview(p.overview || '')
            setCompletionYear(p.completionYear ? String(p.completionYear) : '')
            setStartingPrice(p.startingPrice ? String(p.startingPrice) : '')
            setGoldenVisa(p.goldenVisa || false)
            setIsFeatured(Boolean(p.isFeatured))
            setFeaturedOrder(p.featuredOrder !== null && p.featuredOrder !== undefined ? String(p.featuredOrder) : '')
            setCoverImage(p.coverImage || '')
            setStatus(p.status || 'DRAFT')
            setLeadCount(p._count?.leads || 0)
            setMedia(p.media || [])
            setUnitTypes(
                (p.unitTypes || []).map((ut: any) => ({
                    id: ut.id,
                    unitType: ut.unitType || '',
                    bedrooms: ut.bedrooms !== null && ut.bedrooms !== undefined ? String(ut.bedrooms) : '',
                    bathrooms: ut.bathrooms !== null && ut.bathrooms !== undefined ? String(ut.bathrooms) : '',
                    sizeFrom: ut.sizeFrom ? String(ut.sizeFrom) : '',
                    sizeTo: ut.sizeTo ? String(ut.sizeTo) : '',
                    priceFrom: ut.priceFrom ? String(ut.priceFrom) : '',
                    variants: ((ut.variants && ut.variants.length > 0) ? ut.variants : [{
                        id: `${ut.id}-default`,
                        title: ut.unitType || 'Type A',
                        size: ut.sizeFrom || null,
                        price: ut.priceFrom || null,
                        facing: null,
                        view: null,
                        availabilityStatus: 'AVAILABLE',
                        availableUnitsCount: null,
                    }]).map((v: any) => ({
                        id: v.id,
                        title: v.title || '',
                        size: v.size !== null && v.size !== undefined ? String(v.size) : '',
                        price: v.price !== null && v.price !== undefined ? String(v.price) : '',
                        facing: v.facing || '',
                        view: v.view || '',
                        availabilityStatus: v.availabilityStatus || ((v.availableUnitsCount ?? 1) === 0 ? 'SOLD_OUT' : 'AVAILABLE'),
                        availableUnitsCount: v.availableUnitsCount !== null && v.availableUnitsCount !== undefined ? String(v.availableUnitsCount) : '',
                    })),
                }))
            )
            const firstVariantId = (p.unitTypes || []).flatMap((ut: any) => (ut.variants || [])).map((v: any) => v.id).find(Boolean) || ''
            setUploadVariantId(firstVariantId)
            setFloorPlans(
                (p.floorPlans || []).map((fp: any) => ({
                    id: fp.id,
                    unitType: fp.unitType || '',
                    bedrooms: fp.bedrooms !== null && fp.bedrooms !== undefined ? String(fp.bedrooms) : '',
                    bathrooms: fp.bathrooms !== null && fp.bathrooms !== undefined ? String(fp.bathrooms) : '',
                    size: fp.size || '',
                    price: fp.price || '',
                    imageUrl: fp.imageUrl || '',
                }))
            )
            // Load highlights from JSON
            try {
                const h = p.highlights ? JSON.parse(p.highlights) : []
                setHighlights(Array.isArray(h) ? h : [])
            } catch { setHighlights([]) }
            // Load amenities
            setAmenities((p.amenities || []).map((a: any) => ({ id: a.id, name: a.name || '', icon: a.icon || '', category: a.category || '' })))
            // Load nearby places
            setNearbyPlaces((p.nearbyPlaces || []).map((np: any) => ({ id: np.id, name: np.name || '', category: np.category || '', distance: np.distance || '' })))
            // Load payment plans
            setPaymentPlans((p.paymentPlans || []).map((pp: any) => ({ id: pp.id, stage: pp.stage || '', percentage: pp.percentage !== null && pp.percentage !== undefined ? String(pp.percentage) : '', milestone: pp.milestone || '' })))
            // Load location
            if (p.location) {
                setLocation({
                    latitude: p.location.latitude != null ? String(p.location.latitude) : '',
                    longitude: p.location.longitude != null ? String(p.location.longitude) : '',
                    address: p.location.address || '',
                    mapUrl: p.location.mapUrl || '',
                })
            }
            // Load videos
            setVideos((p.videos || []).map((v: any) => ({ id: v.id, videoUrl: v.videoUrl || '', title: v.title || '', thumbnail: v.thumbnail || '' })))
            // Load brochure
            if (p.brochure) {
                setBrochureData({
                    id: p.brochure.id,
                    fileUrl: p.brochure.fileUrl,
                    fileName: p.brochure.fileName,
                    fileSize: p.brochure.fileSize ?? null,
                })
            } else {
                setBrochureData(null)
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to load project')
        } finally {
            setLoading(false)
        }
    }, [projectId])

    useEffect(() => { loadProject() }, [loadProject])

    const handleSave = async () => {
        setSaving(true)
        try {
            if (!name.trim()) {
                toast.error('Project name is required')
                setSaving(false)
                return
            }
            if (!slug.trim()) {
                toast.error('Project slug is required')
                setSaving(false)
                return
            }
            if (!developerId) {
                toast.error('Please select a developer')
                setSaving(false)
                return
            }
            const payload: any = {
                name: name.trim(),
                slug: slug.trim(),
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
                    variants: ut.variants
                        .filter((v) => v.title.trim())
                        .map((v) => ({
                            id: v.id,
                            title: v.title.trim(),
                            size: v.size ? parseInt(v.size, 10) : null,
                            price: v.price ? v.price.trim() : null,
                            facing: v.facing.trim() || null,
                            view: v.view.trim() || null,
                            availabilityStatus: v.availabilityStatus,
                            availableUnitsCount: v.availableUnitsCount ? parseInt(v.availableUnitsCount, 10) : null,
                            priceOnRequest: !v.price.trim(),
                            floorPlans: floorPlans
                                .filter((fp) => {
                                    const key = fp.unitType.trim().toLowerCase()
                                    const unitTypeKey = ut.unitType.trim().toLowerCase()
                                    const variantKey = v.title.trim().toLowerCase()
                                    return key === unitTypeKey || key === variantKey
                                })
                                .map((fp) => ({
                                    id: fp.id,
                                    title: fp.unitType.trim() || v.title.trim(),
                                    bedrooms: fp.bedrooms ? parseInt(fp.bedrooms, 10) : null,
                                    bathrooms: fp.bathrooms ? parseInt(fp.bathrooms, 10) : null,
                                    size: fp.size.trim() || null,
                                    price: fp.price.trim() || null,
                                    imageUrl: fp.imageUrl.trim() || null,
                                })),
                        })),
                })),
                floorPlans: floorPlans
                    .filter((fp) => fp.unitType.trim() || fp.imageUrl.trim())
                    .map((fp) => ({
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
                paymentPlans: paymentPlans.filter((pp) => pp.stage.trim()).map((pp, idx) => ({ stage: pp.stage.trim(), percentage: pp.percentage ? parseFloat(pp.percentage) : 0, milestone: pp.milestone.trim() || null, sortOrder: idx })),
                location: location.address.trim() || location.latitude || location.longitude ? {
                    latitude: location.latitude ? parseFloat(location.latitude) : null,
                    longitude: location.longitude ? parseFloat(location.longitude) : null,
                    address: location.address.trim() || null,
                    mapUrl: location.mapUrl.trim() || null,
                } : null,
                videos: videos.filter((v) => v.videoUrl.trim()).map((v, idx) => ({ videoUrl: v.videoUrl.trim(), title: v.title.trim() || null, thumbnail: v.thumbnail.trim() || null, sortOrder: idx })),
            }

            const res = await fetch(`/api/admin/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const json = await res.json()
            if (!json.success) {
                // Show detailed validation errors if available
                if (json.errors) {
                    const errorFields = Object.keys(json.errors)
                    toast.error(`Validation failed: ${errorFields.join(', ')}`)
                } else {
                    toast.error(json.message || 'Failed to save')
                }
                return
            }
            toast.success('Project updated successfully!')
        } catch (err: any) {
            toast.error(err.message || 'Something went wrong. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const handleStatusChange = async (newStatus: string) => {
        try {
            const res = await fetch(`/api/admin/projects/${projectId}/publish`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message)
            setStatus(newStatus)
            toast.success(`Status changed to ${newStatus}`)
        } catch (err: any) {
            toast.error(err.message || 'Failed to change status')
        }
    }

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return
        setUploading(true)
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                const uploadPayload = new FormData()
                uploadPayload.append('file', file)
                uploadPayload.append('developerSlug', developerSlugForUpload || 'unknown')
                uploadPayload.append('projectSlug', projectSlugForUpload || slug || 'unknown')
                uploadPayload.append('mediaType', uploadCategory)

                const uploadRes = await fetch('/api/upload/project-image', { method: 'POST', body: uploadPayload })
                const uploadJson = await uploadRes.json()
                if (!uploadRes.ok || !uploadJson.success || !uploadJson.url) {
                    throw new Error(uploadJson.message || `Upload failed for ${file.name}`)
                }

                const saveRes = await fetch(`/api/admin/projects/${projectId}/media`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: uploadJson.url,
                        s3Key: uploadJson.key || null,
                        label: uploadJson.label || null,
                        category: uploadCategory,
                        unitVariantId: uploadCategory === 'floor_plan' ? (uploadVariantId || null) : null,
                        sortOrder: media.length + i + 1,
                    }),
                })
                const saveJson = await saveRes.json()
                if (!saveRes.ok || !saveJson.success || !saveJson.media) {
                    throw new Error(saveJson.message || `Save failed for ${file.name}`)
                }

                setMedia((prev) => [...prev, saveJson.media])
            }
            toast.success('Media uploaded successfully')
        } catch (err: any) {
            toast.error(err.message || 'Upload failed')
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    const handleMediaDelete = async (mediaId: string) => {
        if (!confirm('Delete this media?')) return
        try {
            const res = await fetch(`/api/admin/projects/${projectId}/media/${mediaId}`, { method: 'DELETE' })
            const json = await res.json()
            if (!json.success) throw new Error(json.message)
            setMedia((prev) => prev.filter((m) => m.id !== mediaId))
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete')
        }
    }
    const findVariantIdForFloorPlan = (floorPlanTitle: string) => {
        const key = floorPlanTitle.trim().toLowerCase()
        for (const ut of unitTypes) {
            for (const v of ut.variants || []) {
                const vKey = v.title.trim().toLowerCase()
                const utKey = ut.unitType.trim().toLowerCase()
                if ((key && (key === vKey || key === utKey)) && v.id) return v.id
            }
        }
        return ''
    }
    const uploadFloorPlanFile = async (idx: number, file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Only image files are allowed for floor plans')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Floor plan image must be 5MB or smaller')
            return
        }
        setUploading(true)
        try {
            const floorPlan = floorPlans[idx]
            const unitVariantId = findVariantIdForFloorPlan(floorPlan?.unitType || '')
            const uploadPayload = new FormData()
            uploadPayload.append('file', file)
            uploadPayload.append('developerSlug', developerSlugForUpload || 'unknown')
            uploadPayload.append('projectSlug', projectSlugForUpload || slug || 'unknown')
            uploadPayload.append('mediaType', 'floor_plan')
            if (unitVariantId) uploadPayload.append('unitVariantId', unitVariantId)

            const uploadRes = await fetch('/api/upload/project-image', { method: 'POST', body: uploadPayload })
            const uploadJson = await uploadRes.json()
            if (!uploadRes.ok || !uploadJson.success || !uploadJson.url) {
                throw new Error(uploadJson.message || 'Floor plan upload failed')
            }

            const saveRes = await fetch(`/api/admin/projects/${projectId}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: uploadJson.url,
                    s3Key: uploadJson.key || null,
                    label: floorPlan?.unitType || uploadJson.label || 'Floor Plan',
                    category: 'floor_plan',
                    unitVariantId: unitVariantId || null,
                    sortOrder: media.length + 1,
                }),
            })
            const saveJson = await saveRes.json()
            if (!saveRes.ok || !saveJson.success) {
                throw new Error(saveJson.message || 'Could not save floor plan media')
            }

            setFloorPlans((prev) => prev.map((row, i) => (i === idx ? { ...row, imageUrl: uploadJson.url } : row)))
            if (saveJson.media) {
                setMedia((prev) => [...prev, saveJson.media])
            }
            toast.success('Floor plan uploaded')
        } catch (err: any) {
            toast.error(err.message || 'Floor plan upload failed')
        } finally {
            setUploading(false)
        }
    }

    const addUnitType = () => setUnitTypes((prev) => [...prev, {
        unitType: '',
        bedrooms: '',
        bathrooms: '',
        sizeFrom: '',
        sizeTo: '',
        priceFrom: '',
        variants: [{
            title: 'Type A',
            size: '',
            price: '',
            facing: '',
            view: '',
            availabilityStatus: 'AVAILABLE',
            availableUnitsCount: '',
        }],
    }])
    const updateUnitType = (idx: number, field: keyof UnitTypeRow, value: string) =>
        setUnitTypes((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)))
    const removeUnitType = (idx: number) => setUnitTypes((prev) => prev.filter((_, i) => i !== idx))
    const addVariant = (unitIdx: number) =>
        setUnitTypes((prev) => prev.map((ut, i) => i === unitIdx ? {
            ...ut,
            variants: [...(ut.variants || []), {
                title: `Type ${String.fromCharCode(65 + (ut.variants || []).length)}`,
                size: '',
                price: '',
                facing: '',
                view: '',
                availabilityStatus: 'AVAILABLE',
                availableUnitsCount: '',
            }],
        } : ut))
    const updateVariant = (unitIdx: number, variantIdx: number, field: keyof VariantRow, value: string) =>
        setUnitTypes((prev) => prev.map((ut, i) => i === unitIdx ? {
            ...ut,
            variants: (ut.variants || []).map((v, j) => (j === variantIdx ? { ...v, [field]: value } : v)),
        } : ut))
    const removeVariant = (unitIdx: number, variantIdx: number) =>
        setUnitTypes((prev) => prev.map((ut, i) => i === unitIdx ? {
            ...ut,
            variants: (ut.variants || []).filter((_, j) => j !== variantIdx),
        } : ut))
    const addFloorPlan = () => setFloorPlans((prev) => [...prev, { unitType: '', bedrooms: '', bathrooms: '', size: '', price: '', imageUrl: '' }])
    const updateFloorPlan = (idx: number, field: keyof FloorPlanRow, value: string) =>
        setFloorPlans((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)))
    const removeFloorPlan = (idx: number) => setFloorPlans((prev) => prev.filter((_, i) => i !== idx))

    // Brochure handlers
    const handleBrochureUploadFile = async (file: File) => {
        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are allowed for brochures')
            throw new Error('Only PDF files are allowed for brochures')
        }
        if (file.size > 20 * 1024 * 1024) {
            toast.error('Brochure file must be 20MB or smaller')
            throw new Error('Brochure file must be 20MB or smaller')
        }
        setBrochureUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch(`/api/admin/projects/${projectId}/brochure`, {
                method: 'POST',
                body: formData,
            })
            const json = await res.json()
            if (!res.ok || !json.success) throw new Error(json.message || 'Upload failed')
            setBrochureData(json.brochure)
            toast.success('Brochure uploaded successfully')
        } catch (err: any) {
            toast.error(err.message || 'Failed to upload brochure')
            throw err
        } finally {
            setBrochureUploading(false)
        }
    }

    const handleBrochureDelete = async () => {
        if (!confirm('Delete the brochure? This cannot be undone.')) return
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

    const brochureMeta: FileMeta | null = brochureData
        ? {
            id: brochureData.id,
            name: brochureData.fileName,
            size: brochureData.fileSize || 0,
            url: brochureData.fileUrl,
        }
        : null

    if (loading) {
        return (
            <div className="flex items-center gap-3 py-20 justify-center text-white/40">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading project…
            </div>
        )
    }

    return (
        <div className="w-full">
            {/* Toast Notification System */}
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#1a2035',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        fontSize: '14px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    },
                    success: {
                        iconTheme: { primary: '#34d399', secondary: '#fff' },
                        style: { borderColor: 'rgba(52, 211, 153, 0.2)' },
                    },
                    error: {
                        iconTheme: { primary: '#f87171', secondary: '#fff' },
                        style: { borderColor: 'rgba(248, 113, 113, 0.2)' },
                        duration: 6000,
                    },
                }}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white/95">{name || 'Edit Project'}</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[status] || ''}`}>
                            {status}
                        </span>
                        <span className="text-xs text-white/30">{leadCount} leads</span>
                        <span className="text-xs text-white/30">{media.length} media</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {status !== 'PUBLISHED' && (
                        <button onClick={() => handleStatusChange('PUBLISHED')}
                            className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-all">
                            Publish
                        </button>
                    )}
                    {status === 'PUBLISHED' && (
                        <button onClick={() => handleStatusChange('DRAFT')}
                            className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-xs font-semibold text-yellow-300 hover:bg-yellow-500/20 transition-all">
                            Unpublish
                        </button>
                    )}
                    {status !== 'ARCHIVED' && (
                        <button onClick={() => handleStatusChange('ARCHIVED')}
                            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/40 hover:text-white/60 transition-all">
                            Archive
                        </button>
                    )}
                </div>
            </div>



            <div className="space-y-6">
                {/* Basic Info */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
                    <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-2">Basic Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Project Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-amber-400/30 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Slug</label>
                            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all font-mono" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Developer</label>
                            <SelectDropdown
                                label="Developer"
                                value={developerId}
                                onChange={setDeveloperId}
                                options={[
                                    { value: '', label: 'Select…' },
                                    ...developers.map((d) => ({ value: d.id, label: d.name }))
                                ]}
                                showLabel={false}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Country</label>
                            <SelectDropdown
                                label="Country"
                                value={countryIso2}
                                onChange={setCountryIso2}
                                options={[
                                    { value: 'AE', label: 'UAE' },
                                    { value: 'IN', label: 'India' }
                                ]}
                                showLabel={false}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">City</label>
                            <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Community</label>
                            <input type="text" value={community} onChange={(e) => setCommunity(e.target.value)}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Completion Year</label>
                            <input type="number" value={completionYear} onChange={(e) => setCompletionYear(e.target.value)}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Starting Price (AED)</label>
                            <input type="text" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} placeholder="e.g. 2.16M or 750K"
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Overview</label>
                            <textarea value={overview} onChange={(e) => setOverview(e.target.value)} rows={8}
                                className="w-full min-h-[200px] max-h-[420px] overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/80 outline-none focus:border-amber-400/30 transition-all resize-y scrollbar-thin scrollbar-thumb-white/20" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Description</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={10}
                                className="w-full min-h-[220px] max-h-[460px] overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/80 outline-none focus:border-amber-400/30 transition-all resize-y scrollbar-thin scrollbar-thumb-white/20" />
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-3">
                            <button type="button" onClick={() => setGoldenVisa(!goldenVisa)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${goldenVisa ? 'bg-amber-400' : 'bg-white/[0.1]'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${goldenVisa ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                            <span className="text-sm text-white/60">Golden Visa Eligible</span>
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-3">
                            <button type="button" onClick={() => setIsFeatured(!isFeatured)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isFeatured ? 'bg-amber-400' : 'bg-white/[0.1]'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isFeatured ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                            <span className="text-sm text-white/60">Featured Project</span>
                        </div>
                        {isFeatured && (
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Featured Order</label>
                                <input type="number" min={0} value={featuredOrder} onChange={(e) => setFeaturedOrder(e.target.value)}
                                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Media Gallery */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Media Gallery ({media.length})</h2>
                        <div className="flex items-center gap-2">
                            <SelectDropdown
                                label="Media Category"
                                value={uploadCategory}
                                onChange={(value) => setUploadCategory(value as 'hero' | 'gallery' | 'interior' | 'exterior' | 'amenities' | 'lifestyle' | 'floor_plan')}
                                options={[
                                    { value: 'hero', label: 'Hero' },
                                    { value: 'gallery', label: 'Gallery' },
                                    { value: 'interior', label: 'Interior' },
                                    { value: 'exterior', label: 'Exterior' },
                                    { value: 'amenities', label: 'Amenities' },
                                    { value: 'lifestyle', label: 'Lifestyle' },
                                    { value: 'floor_plan', label: 'Floor Plan' },
                                ]}
                                variant="dark"
                                dense
                                showLabel={false}
                                className="w-36"
                            />
                            {uploadCategory === 'floor_plan' && (
                                <SelectDropdown
                                    label="Floor Plan Variant"
                                    value={uploadVariantId}
                                    onChange={setUploadVariantId}
                                    options={variantOptions}
                                    variant="dark"
                                    dense
                                    showLabel={false}
                                    className="w-56"
                                />
                            )}
                            <label className={`inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/[0.08] transition-all cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                {uploading ? 'Uploading…' : (
                                    <>
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Upload
                                    </>
                                )}
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleMediaUpload} disabled={uploading} />
                            </label>
                        </div>
                    </div>

                    {media.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {media.map((m) => (
                                <div key={m.id} className="group relative rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.02]">
                                    <img src={m.mediaUrl} alt="" className="w-full h-24 object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={() => handleMediaDelete(m.id)}
                                            className="rounded-lg bg-red-500/80 p-2 text-white hover:bg-red-500 transition-colors">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="px-2 py-1.5">
                                        <p className="text-[10px] text-white/30 truncate">{m.label || m.category || m.mediaType}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-white/25 py-4 text-center">No media uploaded yet</p>
                    )}
                </div>

                {/* Unit Types */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Unit Types</h2>
                        <button type="button" onClick={addUnitType}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/[0.08] transition-all">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Row
                        </button>
                    </div>
                    {unitTypes.length > 0 ? (
                        <div className="space-y-4">
                            {unitTypes.map((ut, idx) => (
                                <div key={ut.id || idx} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                        <input type="text" value={ut.unitType} onChange={(e) => updateUnitType(idx, 'unitType', e.target.value)} placeholder="Unit Type (e.g. 1 Bedroom)"
                                            className="sm:col-span-3 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/80 outline-none focus:border-amber-400/30 transition-all" />
                                        <input type="number" value={ut.bedrooms} onChange={(e) => updateUnitType(idx, 'bedrooms', e.target.value)} placeholder="Beds"
                                            className="sm:col-span-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                        <input type="number" value={ut.bathrooms} onChange={(e) => updateUnitType(idx, 'bathrooms', e.target.value)} placeholder="Baths"
                                            className="sm:col-span-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                        <input type="number" value={ut.sizeFrom} onChange={(e) => updateUnitType(idx, 'sizeFrom', e.target.value)} placeholder="Size Min"
                                            className="sm:col-span-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                        <input type="number" value={ut.sizeTo} onChange={(e) => updateUnitType(idx, 'sizeTo', e.target.value)} placeholder="Size Max"
                                            className="sm:col-span-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                        <input type="text" value={ut.priceFrom} onChange={(e) => updateUnitType(idx, 'priceFrom', e.target.value)} placeholder="Price From (e.g. 750K)"
                                            className="sm:col-span-3 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Variants ({ut.variants?.length || 0})</p>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => addVariant(idx)}
                                                className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-white/60 hover:bg-white/[0.08] transition-all">
                                                + Variant
                                            </button>
                                            <button type="button" onClick={() => removeUnitType(idx)}
                                                className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-medium text-red-300 hover:bg-red-500/20 transition-all">
                                                Remove Type
                                            </button>
                                        </div>
                                    </div>
                                    {(ut.variants || []).map((v, vIdx) => (
                                        <div key={v.id || `${idx}-${vIdx}`} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                            <input type="text" value={v.title} onChange={(e) => updateVariant(idx, vIdx, 'title', e.target.value)} placeholder="Type A"
                                                className="sm:col-span-3 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/80 outline-none focus:border-amber-400/30 transition-all" />
                                            <input type="number" value={v.size} onChange={(e) => updateVariant(idx, vIdx, 'size', e.target.value)} placeholder="Size"
                                                className="sm:col-span-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                            <input type="text" value={v.price} onChange={(e) => updateVariant(idx, vIdx, 'price', e.target.value)} placeholder="2.16M"
                                                className="sm:col-span-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                            <input type="text" value={v.facing} onChange={(e) => updateVariant(idx, vIdx, 'facing', e.target.value)} placeholder="Facing"
                                                className="sm:col-span-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                            <input type="text" value={v.view} onChange={(e) => updateVariant(idx, vIdx, 'view', e.target.value)} placeholder="View"
                                                className="sm:col-span-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                            <input type="number" value={v.availableUnitsCount} onChange={(e) => updateVariant(idx, vIdx, 'availableUnitsCount', e.target.value)} placeholder="Avail."
                                                className="sm:col-span-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                            <SelectDropdown
                                                label="Status"
                                                value={v.availabilityStatus}
                                                onChange={(value) => updateVariant(idx, vIdx, 'availabilityStatus', value)}
                                                options={[
                                                    { value: 'AVAILABLE', label: 'Available' },
                                                    { value: 'SOLD_OUT', label: 'Sold Out' },
                                                ]}
                                                variant="dark"
                                                dense
                                                showLabel={false}
                                                className="sm:col-span-1"
                                            />
                                            <button type="button" onClick={() => removeVariant(idx, vIdx)}
                                                className="sm:col-span-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-2 text-[11px] font-medium text-red-300 hover:bg-red-500/20 transition-all">
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-white/25 py-2">No unit types. Click &quot;Add Row&quot; to add one.</p>
                    )}
                </div>

                {/* Floor Plans */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Floor Plans</h2>
                        <button type="button" onClick={addFloorPlan}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/[0.08] transition-all">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Plan
                        </button>
                    </div>
                    {floorPlans.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left">
                                        <th className="text-[11px] font-bold uppercase tracking-wider text-white/30 pb-2">Title</th>
                                        <th className="text-[11px] font-bold uppercase tracking-wider text-white/30 pb-2">Beds</th>
                                        <th className="text-[11px] font-bold uppercase tracking-wider text-white/30 pb-2">Baths</th>
                                        <th className="text-[11px] font-bold uppercase tracking-wider text-white/30 pb-2">Size</th>
                                        <th className="text-[11px] font-bold uppercase tracking-wider text-white/30 pb-2">Price</th>
                                        <th className="text-[11px] font-bold uppercase tracking-wider text-white/30 pb-2">Floor Plan Image</th>
                                        <th className="pb-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {floorPlans.map((fp, idx) => (
                                        <tr key={fp.id || idx} className="group">
                                            <td className="pr-2 pb-2">
                                                <input type="text" value={fp.unitType} onChange={(e) => updateFloorPlan(idx, 'unitType', e.target.value)}
                                                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/80 outline-none focus:border-amber-400/30 transition-all" />
                                            </td>
                                            <td className="pr-2 pb-2">
                                                <input type="number" value={fp.bedrooms} onChange={(e) => updateFloorPlan(idx, 'bedrooms', e.target.value)}
                                                    className="w-20 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                            </td>
                                            <td className="pr-2 pb-2">
                                                <input type="number" value={fp.bathrooms} onChange={(e) => updateFloorPlan(idx, 'bathrooms', e.target.value)}
                                                    className="w-20 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                            </td>
                                            <td className="pr-2 pb-2">
                                                <input type="text" value={fp.size} onChange={(e) => updateFloorPlan(idx, 'size', e.target.value)}
                                                    className="w-28 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                            </td>
                                            <td className="pr-2 pb-2">
                                                <input type="text" value={fp.price} onChange={(e) => updateFloorPlan(idx, 'price', e.target.value)}
                                                    className="w-28 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                            </td>
                                            <td className="pr-2 pb-2">
                                                <div
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        e.preventDefault()
                                                        const file = e.dataTransfer.files?.[0]
                                                        if (file) uploadFloorPlanFile(idx, file)
                                                    }}
                                                    className="min-w-[260px] rounded-lg border-2 border-dashed border-white/[0.12] bg-white/[0.03] p-2.5"
                                                >
                                                    {fp.imageUrl ? (
                                                        <div className="space-y-2">
                                                            <img src={fp.imageUrl} alt={fp.unitType || 'Floor plan'} className="h-24 w-full rounded-md object-contain bg-white border border-white/10" />
                                                            <div className="flex items-center gap-2">
                                                                <label className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/70 cursor-pointer hover:bg-white/[0.08]">
                                                                    Replace
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="hidden"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0]
                                                                            if (file) uploadFloorPlanFile(idx, file)
                                                                            e.currentTarget.value = ''
                                                                        }}
                                                                    />
                                                                </label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateFloorPlan(idx, 'imageUrl', '')}
                                                                    className="rounded-md border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-300 hover:bg-red-500/20"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <label className="block text-center cursor-pointer">
                                                            <p className="text-[11px] text-white/50 mb-1">Drag & drop or click to upload</p>
                                                            <p className="text-[10px] text-white/35">Image only • Max 5MB</p>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0]
                                                                    if (file) uploadFloorPlanFile(idx, file)
                                                                    e.currentTarget.value = ''
                                                                }}
                                                            />
                                                        </label>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="pb-2">
                                                <button type="button" onClick={() => removeFloorPlan(idx)}
                                                    className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 transition-all">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-xs text-white/25 py-2">No floor plans. Upload as `Floor Plan` or add rows manually.</p>
                    )}
                </div>

                {/* Key Highlights */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Key Highlights ({highlights.length})</h2>
                        <button type="button" onClick={() => setHighlights((prev) => [...prev, ''])}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/[0.08] transition-all">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add
                        </button>
                    </div>
                    {highlights.length > 0 ? (
                        <div className="space-y-2">
                            {highlights.map((h, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input type="text" value={h} onChange={(e) => setHighlights((prev) => prev.map((v, i) => i === idx ? e.target.value : v))} placeholder="e.g. Waterfront apartments"
                                        className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/80 outline-none focus:border-amber-400/30 transition-all" />
                                    <button type="button" onClick={() => setHighlights((prev) => prev.filter((_, i) => i !== idx))}
                                        className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20 transition-all">
                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-white/25 py-2">No highlights. Click &quot;Add&quot; to add one.</p>
                    )}
                </div>

                {/* Amenities */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Amenities ({amenities.length})</h2>
                        <button type="button" onClick={() => setAmenities((prev) => [...prev, { name: '', icon: '', category: '' }])}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/[0.08] transition-all">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add
                        </button>
                    </div>
                    {amenities.length > 0 ? (
                        <div className="space-y-2">
                            {amenities.map((a, idx) => (
                                <div key={a.id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                    <input type="text" value={a.name} onChange={(e) => setAmenities((prev) => prev.map((v, i) => i === idx ? { ...v, name: e.target.value } : v))} placeholder="Amenity name"
                                        className="sm:col-span-5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/80 outline-none focus:border-amber-400/30 transition-all" />
                                    <input type="text" value={a.icon} onChange={(e) => setAmenities((prev) => prev.map((v, i) => i === idx ? { ...v, icon: e.target.value } : v))} placeholder="Icon (emoji or name)"
                                        className="sm:col-span-3 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                    <input type="text" value={a.category} onChange={(e) => setAmenities((prev) => prev.map((v, i) => i === idx ? { ...v, category: e.target.value } : v))} placeholder="Category"
                                        className="sm:col-span-3 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                    <button type="button" onClick={() => setAmenities((prev) => prev.filter((_, i) => i !== idx))}
                                        className="sm:col-span-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-2 text-[11px] font-medium text-red-300 hover:bg-red-500/20 transition-all">
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-white/25 py-2">No amenities. Click &quot;Add&quot; to add one.</p>
                    )}
                </div>

                {/* Payment Plans */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Payment Plans ({paymentPlans.length})</h2>
                        <button type="button" onClick={() => setPaymentPlans((prev) => [...prev, { stage: '', percentage: '', milestone: '' }])}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/[0.08] transition-all">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add Stage
                        </button>
                    </div>
                    {paymentPlans.length > 0 ? (
                        <div className="space-y-2">
                            {paymentPlans.map((pp, idx) => (
                                <div key={pp.id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                    <input type="text" value={pp.stage} onChange={(e) => setPaymentPlans((prev) => prev.map((v, i) => i === idx ? { ...v, stage: e.target.value } : v))} placeholder="Stage (e.g. Down Payment)"
                                        className="sm:col-span-4 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/80 outline-none focus:border-amber-400/30 transition-all" />
                                    <input type="number" value={pp.percentage} onChange={(e) => setPaymentPlans((prev) => prev.map((v, i) => i === idx ? { ...v, percentage: e.target.value } : v))} placeholder="%"
                                        className="sm:col-span-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                    <input type="text" value={pp.milestone} onChange={(e) => setPaymentPlans((prev) => prev.map((v, i) => i === idx ? { ...v, milestone: e.target.value } : v))} placeholder="Milestone (optional)"
                                        className="sm:col-span-5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                    <button type="button" onClick={() => setPaymentPlans((prev) => prev.filter((_, i) => i !== idx))}
                                        className="sm:col-span-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-2 text-[11px] font-medium text-red-300 hover:bg-red-500/20 transition-all">
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-white/25 py-2">No payment plans.</p>
                    )}
                </div>

                {/* Nearby Places / Landmarks */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Nearby Places ({nearbyPlaces.length})</h2>
                        <button type="button" onClick={() => setNearbyPlaces((prev) => [...prev, { name: '', category: '', distance: '' }])}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/[0.08] transition-all">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add Place
                        </button>
                    </div>
                    {nearbyPlaces.length > 0 ? (
                        <div className="space-y-2">
                            {nearbyPlaces.map((np, idx) => (
                                <div key={np.id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                    <input type="text" value={np.name} onChange={(e) => setNearbyPlaces((prev) => prev.map((v, i) => i === idx ? { ...v, name: e.target.value } : v))} placeholder="Place name (e.g. Metro Station)"
                                        className="sm:col-span-5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/80 outline-none focus:border-amber-400/30 transition-all" />
                                    <input type="text" value={np.category} onChange={(e) => setNearbyPlaces((prev) => prev.map((v, i) => i === idx ? { ...v, category: e.target.value } : v))} placeholder="Category"
                                        className="sm:col-span-3 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                    <input type="text" value={np.distance} onChange={(e) => setNearbyPlaces((prev) => prev.map((v, i) => i === idx ? { ...v, distance: e.target.value } : v))} placeholder="Distance (e.g. 14 Min)"
                                        className="sm:col-span-3 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                    <button type="button" onClick={() => setNearbyPlaces((prev) => prev.filter((_, i) => i !== idx))}
                                        className="sm:col-span-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-2 text-[11px] font-medium text-red-300 hover:bg-red-500/20 transition-all">
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-white/25 py-2">No nearby places.</p>
                    )}
                </div>

                {/* Location */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Location</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Address</label>
                            <input type="text" value={location.address} onChange={(e) => setLocation((prev) => ({ ...prev, address: e.target.value }))}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/80 outline-none focus:border-amber-400/30 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Map URL</label>
                            <input type="text" value={location.mapUrl} onChange={(e) => setLocation((prev) => ({ ...prev, mapUrl: e.target.value }))} placeholder="Google Maps embed URL"
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Latitude</label>
                            <input type="text" value={location.latitude} onChange={(e) => setLocation((prev) => ({ ...prev, latitude: e.target.value }))}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all font-mono" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Longitude</label>
                            <input type="text" value={location.longitude} onChange={(e) => setLocation((prev) => ({ ...prev, longitude: e.target.value }))}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all font-mono" />
                        </div>
                    </div>
                </div>

                {/* Videos */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Videos ({videos.length})</h2>
                        <button type="button" onClick={() => setVideos((prev) => [...prev, { videoUrl: '', title: '', thumbnail: '' }])}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/[0.08] transition-all">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add Video
                        </button>
                    </div>
                    {videos.length > 0 ? (
                        <div className="space-y-2">
                            {videos.map((v, idx) => (
                                <div key={v.id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                    <input type="text" value={v.videoUrl} onChange={(e) => setVideos((prev) => prev.map((item, i) => i === idx ? { ...item, videoUrl: e.target.value } : item))} placeholder="Video URL (YouTube, Vimeo, etc.)"
                                        className="sm:col-span-5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/80 outline-none focus:border-amber-400/30 transition-all" />
                                    <input type="text" value={v.title} onChange={(e) => setVideos((prev) => prev.map((item, i) => i === idx ? { ...item, title: e.target.value } : item))} placeholder="Title"
                                        className="sm:col-span-3 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                    <input type="text" value={v.thumbnail} onChange={(e) => setVideos((prev) => prev.map((item, i) => i === idx ? { ...item, thumbnail: e.target.value } : item))} placeholder="Thumbnail URL"
                                        className="sm:col-span-3 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-amber-400/30 transition-all" />
                                    <button type="button" onClick={() => setVideos((prev) => prev.filter((_, i) => i !== idx))}
                                        className="sm:col-span-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-2 text-[11px] font-medium text-red-300 hover:bg-red-500/20 transition-all">
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-white/25 py-2">No videos.</p>
                    )}
                </div>

                {/* Brochure */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                    <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Brochure (PDF)</h2>
                    <PdfDropzone
                        value={brochureMeta}
                        loading={brochureUploading}
                        onUpload={handleBrochureUploadFile}
                        onDelete={async () => {
                            await handleBrochureDelete()
                        }}
                    />
                </div>

                {/* Save button */}
                <div className="flex items-center gap-3 pt-2">
                    <button onClick={handleSave} disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-400/90 px-6 py-3 text-sm font-semibold text-black hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20 disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button onClick={() => router.push('/admin/projects')}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/60 hover:bg-white/[0.08] transition-all">
                        Back to List
                    </button>
                </div>
            </div>
        </div>
    )
}
