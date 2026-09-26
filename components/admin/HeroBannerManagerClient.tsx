'use client'

import { useCallback, useEffect, useState } from 'react'
import { Eye, ImagePlus, Plus, Search, Trash2, Upload, X } from 'lucide-react'

type Scope = 'CITY' | 'COUNTRY' | 'GLOBAL'
type Category = 'BUY' | 'RENT' | 'PROJECTS' | 'GENERIC'
type Slot = 'desktop' | 'mobile'
type CountryCode = 'INDIA' | 'UAE'

type City = { id: string; name: string; countryCode: CountryCode }
type Banner = {
  id: string
  scope: Scope
  scopeKey: string
  category: Category
  cityId: string | null
  countryCode: CountryCode | null
  city: City | null
  headline: string | null
  subheadline: string | null
  desktopImageUrl: string | null
  desktopImageKey: string | null
  desktopImageAlt: string | null
  desktopWidth: number | null
  desktopHeight: number | null
  desktopFileSize: number | null
  desktopMimeType: string | null
  mobileImageUrl: string | null
  mobileImageKey: string | null
  mobileImageAlt: string | null
  mobileWidth: number | null
  mobileHeight: number | null
  mobileFileSize: number | null
  mobileMimeType: string | null
  isActive: boolean
  priority: number
  updatedAt: string
}

type Draft = {
  id?: string
  scope: Scope
  category: Category
  cityId: string
  countryCode: CountryCode
  headline: string
  subheadline: string
  desktopImageAlt: string
  mobileImageAlt: string
  current?: Banner
}

type LocalImage = { file: File; url: string; width: number; height: number }
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_FILE_SIZE = 15 * 1024 * 1024
const CATEGORY_LABEL: Record<Category, string> = { BUY: 'Buy', RENT: 'Rent', PROJECTS: 'Projects', GENERIC: 'Generic' }

function formatBytes(value: number | null) {
  if (!value) return 'Not uploaded'
  return value < 1024 * 1024 ? `${Math.round(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function inspectImage(file: File): Promise<LocalImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => resolve({ file, url, width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('The selected file is not a readable image.')) }
    image.src = url
  })
}

function uploadWithProgress(url: string, file: File, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', url)
    request.setRequestHeader('Content-Type', file.type)
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`Image upload failed (${request.status}).`))
    request.onerror = () => reject(new Error('Network error during image upload.'))
    request.send(file)
  })
}

export default function HeroBannerManagerClient() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [desktopFile, setDesktopFile] = useState<LocalImage | null>(null)
  const [mobileFile, setMobileFile] = useState<LocalImage | null>(null)
  const [progress, setProgress] = useState<Record<Slot, number | null>>({ desktop: null, mobile: null })
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<{ banner: Banner | Draft; mobile: boolean } | null>(null)
  const [newCityName, setNewCityName] = useState('')
  const [addingCity, setAddingCity] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/hero-banners', { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.message || 'Unable to load hero banners.')
      setBanners(json.data || [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load hero banners.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCities = useCallback(async (countryCode: CountryCode) => {
    try {
      const country = countryCode === 'INDIA' ? 'IN' : 'AE'
      const response = await fetch(`/api/admin/locations?country=${country}&canonicalOnly=true`, { cache: 'no-store' })
      const json = await response.json()
      if (response.ok && json.success) setCities(json.cities || [])
    } catch {
      setCities([])
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => () => {
    if (desktopFile) URL.revokeObjectURL(desktopFile.url)
    if (mobileFile) URL.revokeObjectURL(mobileFile.url)
  }, [desktopFile, mobileFile])
  useEffect(() => {
    if (draft?.scope === 'CITY') void loadCities(draft.countryCode)
  }, [draft?.scope, draft?.countryCode, loadCities])

  const resetEditor = () => {
    setDraft(null)
    setPreview(null)
    setDesktopFile(null)
    setMobileFile(null)
    setProgress({ desktop: null, mobile: null })
    setNewCityName('')
    setAddingCity(false)
    setError('')
  }

  const openNew = () => {
    resetEditor()
    setDraft({ scope: 'CITY', category: 'BUY', cityId: '', countryCode: 'INDIA', headline: '', subheadline: '', desktopImageAlt: '', mobileImageAlt: '' })
  }

  const openEdit = (banner: Banner) => {
    resetEditor()
    setDraft({
      id: banner.id,
      scope: banner.scope,
      category: banner.category,
      cityId: banner.cityId || '',
      countryCode: banner.countryCode || banner.city?.countryCode || 'INDIA',
      headline: banner.headline || '',
      subheadline: banner.subheadline || '',
      desktopImageAlt: banner.desktopImageAlt || '',
      mobileImageAlt: banner.mobileImageAlt || '',
      current: banner,
    })
  }

  const chooseImage = async (slot: Slot, file?: File) => {
    if (!file || !draft) return
    if (!ACCEPTED_TYPES.includes(file.type)) { setError('Use a JPEG, PNG, WebP, or AVIF image.'); return }
    if (file.size > MAX_FILE_SIZE) { setError('Image files must be 15MB or smaller.'); return }
    try {
      const inspected = await inspectImage(file)
      const targetAspect = slot === 'desktop' ? 1920 / 450 : 750 / 400
      const currentAspect = inspected.width / inspected.height
      const aspectWarning = Math.abs(currentAspect - targetAspect) / targetAspect > 0.2
      setError(aspectWarning ? `Warning: ${slot} aspect ratio is ${currentAspect.toFixed(2)}:1. Proposed art ratio is ${targetAspect.toFixed(2)}:1; confirm final crop with design.` : '')
      if (slot === 'desktop') setDesktopFile(inspected)
      else setMobileFile(inspected)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not inspect the image.')
    }
  }

  const addCity = async () => {
    if (!draft || !newCityName.trim()) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/admin/locations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: draft.countryCode === 'INDIA' ? 'IN' : 'AE', name: newCityName }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.message || 'Could not add city.')
      const city = json.city as City
      setCities((previous) => [...previous, city].sort((a, b) => a.name.localeCompare(b.name)))
      setDraft((previous) => previous ? { ...previous, cityId: city.id } : previous)
      setNewCityName('')
      setAddingCity(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add city.')
    } finally { setBusy(false) }
  }

  const saveMetadata = async () => {
    if (!draft || busy) return
    if (draft.scope === 'CITY' && !draft.cityId) { setError('Select or add a city first.'); return }
    if (draft.scope === 'COUNTRY' && !draft.countryCode) { setError('Select a country first.'); return }
    setBusy(true)
    setError('')
    try {
      const saveResponse = await fetch('/api/admin/hero-banners', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: draft.scope,
          category: draft.category,
          cityId: draft.scope === 'CITY' ? draft.cityId : undefined,
          countryCode: draft.scope === 'COUNTRY' ? draft.countryCode : undefined,
          headline: draft.headline,
          subheadline: draft.subheadline,
          desktopImageAlt: draft.desktopImageAlt,
          mobileImageAlt: draft.mobileImageAlt,
        }),
      })
      const saved = await saveResponse.json()
      if (!saveResponse.ok || !saved.success) throw new Error(saved.message || 'Could not save banner details.')
      const banner = saved.data as Banner
      for (const [slot, selectedFile] of [['desktop', desktopFile], ['mobile', mobileFile]] as const) {
        if (!selectedFile) continue
        setProgress((previous) => ({ ...previous, [slot]: 0 }))
        const presignResponse = await fetch('/api/admin/hero-banners/presign', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bannerId: banner.id, slot, contentType: selectedFile.file.type, fileSizeBytes: selectedFile.file.size }),
        })
        const presign = await presignResponse.json()
        if (!presignResponse.ok || !presign.success) throw new Error(presign.message || `Could not prepare ${slot} upload.`)
        await uploadWithProgress(presign.uploadUrl, selectedFile.file, (value) => setProgress((previous) => ({ ...previous, [slot]: value })))
        const finalizeResponse = await fetch('/api/admin/hero-banners/finalize', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bannerId: banner.id, slot, s3Key: presign.s3Key, contentType: selectedFile.file.type, fileSizeBytes: selectedFile.file.size, altText: slot === 'desktop' ? draft.desktopImageAlt : draft.mobileImageAlt }),
        })
        const finalized = await finalizeResponse.json()
        if (!finalizeResponse.ok || !finalized.success) throw new Error(finalized.message || `Could not verify ${slot} image.`)
      }
      await load()
      resetEditor()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the banner.')
    } finally { setBusy(false) }
  }

  const toggleStatus = async (banner: Banner) => {
    const response = await fetch(`/api/admin/hero-banners/${banner.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !banner.isActive }),
    })
    const json = await response.json()
    if (!response.ok || !json.success) { setError(json.message || 'Could not update banner status.'); return }
    await load()
  }

  const removeImage = async (banner: Banner, slot: Slot) => {
    const response = await fetch(`/api/admin/hero-banners/${banner.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ removeSlot: slot }),
    })
    const json = await response.json()
    if (!response.ok || !json.success) { setError(json.message || 'Could not remove image.'); return }
    await load()
    if (draft?.id === banner.id) setDraft((previous) => previous ? { ...previous, current: json.data } : previous)
  }

  const filtered = banners.filter((banner) => {
    const cityLabel = banner.city?.name || banner.countryCode || 'Global'
    return (!search || `${cityLabel} ${banner.headline || ''} ${banner.category}`.toLowerCase().includes(search.toLowerCase()))
      && (!cityFilter || banner.cityId === cityFilter)
      && (!categoryFilter || banner.category === categoryFilter)
      && (!statusFilter || String(banner.isActive) === statusFilter)
  })

  const previewBanner = preview?.banner
  const previewDesktopImage = previewBanner && 'desktopImageUrl' in previewBanner ? previewBanner.desktopImageUrl : null
  const previewMobileImage = previewBanner && 'mobileImageUrl' in previewBanner ? previewBanner.mobileImageUrl : null
  const draftPreviewImage = preview?.mobile
    ? previewMobileImage || mobileFile?.url || previewDesktopImage || desktopFile?.url || draft?.current?.desktopImageUrl
    : previewDesktopImage || desktopFile?.url || draft?.current?.desktopImageUrl
  const draftPreviewHeadline = preview?.banner.headline || 'Your headline appears here'
  const draftPreviewSubtitle = preview?.banner.subheadline || 'Your optional supporting text appears here.'

  return <div className="space-y-5 text-white">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-bold">Hero Banners</h1><p className="mt-1 text-sm text-white/55">Manage city, country, and global search banners.</p></div>
      <button type="button" onClick={openNew} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent-yellow px-4 text-sm font-semibold text-dark-blue"><Plus size={16} /> New banner</button>
    </header>

    <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 lg:flex-row">
      <label className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search city or headline" className="h-10 w-full rounded-md border border-white/10 bg-[#0b1220] pl-9 pr-3 text-sm outline-none focus:border-accent-yellow/50" /></label>
      <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} className="h-10 rounded-md border border-white/10 bg-[#0b1220] px-3 text-sm"><option value="">All cities</option>{Array.from(new Map(banners.filter((item) => item.city).map((item) => [item.city!.id, item.city!])).values()).map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select>
      <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 rounded-md border border-white/10 bg-[#0b1220] px-3 text-sm"><option value="">All categories</option>{Object.entries(CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-md border border-white/10 bg-[#0b1220] px-3 text-sm"><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select>
    </section>

    {error && !draft ? <div role="alert" className="flex items-center justify-between rounded-md border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}<button type="button" onClick={() => void load()} className="font-semibold underline">Retry</button></div> : null}
    {loading ? <div className="border-y border-white/10 py-12 text-center text-sm text-white/45">Loading banners…</div> : <div className="overflow-x-auto border-y border-white/10">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-white/40"><tr><th className="py-3 pr-4 font-medium">Location</th><th className="py-3 pr-4 font-medium">Category</th><th className="py-3 pr-4 font-medium">Assets</th><th className="py-3 pr-4 font-medium">Headline</th><th className="py-3 pr-4 font-medium">Status</th><th className="py-3 pr-4 font-medium">Updated</th><th className="py-3 font-medium">Actions</th></tr></thead>
        <tbody>{filtered.map((banner) => <tr key={banner.id} className="border-t border-white/[0.07]">
          <td className="py-3 pr-4"><div className="font-medium">{banner.city?.name || (banner.countryCode ? banner.countryCode : 'Global')}</div><div className="mt-0.5 text-xs text-white/40">{banner.scope}</div></td>
          <td className="py-3 pr-4">{CATEGORY_LABEL[banner.category]}</td>
          <td className="py-3 pr-4 text-xs text-white/55">D {banner.desktopWidth && banner.desktopHeight ? `${banner.desktopWidth}×${banner.desktopHeight}` : '—'}<br />M {banner.mobileWidth && banner.mobileHeight ? `${banner.mobileWidth}×${banner.mobileHeight}` : '—'}</td>
          <td className="max-w-[220px] truncate py-3 pr-4">{banner.headline || '—'}</td>
          <td className="py-3 pr-4"><span className={banner.isActive ? 'text-emerald-300' : 'text-white/40'}>{banner.isActive ? 'Active' : 'Inactive'}</span></td>
          <td className="py-3 pr-4 text-xs text-white/50">{formatDate(banner.updatedAt)}</td>
          <td className="py-3"><div className="flex items-center gap-1"><button type="button" title="Preview" onClick={() => setPreview({ banner, mobile: false })} className="rounded p-2 text-white/55 hover:bg-white/10 hover:text-white"><Eye size={16} /></button><button type="button" onClick={() => openEdit(banner)} className="rounded px-2 py-1.5 text-xs font-semibold text-white/75 hover:bg-white/10">Edit</button><button type="button" onClick={() => void toggleStatus(banner)} className="rounded px-2 py-1.5 text-xs font-semibold text-accent-yellow hover:bg-white/10">{banner.isActive ? 'Deactivate' : 'Activate'}</button></div></td>
        </tr>)}</tbody>
      </table>
      {!filtered.length ? <p className="py-12 text-center text-sm text-white/45">No banners match these filters.</p> : null}
    </div>}

    {draft ? <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 sm:p-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="hero-banner-editor-title" className="mx-auto my-2 w-full max-w-5xl rounded-lg border border-white/10 bg-[#101a2a] shadow-2xl">
        <header className="flex items-start justify-between border-b border-white/10 px-5 py-4"><div><h2 id="hero-banner-editor-title" className="text-lg font-semibold">{draft.id ? 'Edit hero banner' : 'New hero banner'}</h2><p className="mt-1 text-xs text-white/45">Configuration saves inactive; publish from the list after review.</p></div><button type="button" aria-label="Close editor" onClick={resetEditor} className="rounded p-2 text-white/55 hover:bg-white/10"><X size={18} /></button></header>
        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-white/60">Scope<select disabled={Boolean(draft.id)} value={draft.scope} onChange={(event) => { const scope = event.target.value as Scope; setDraft({ ...draft, scope, category: scope !== 'CITY' && draft.category === 'GENERIC' ? 'BUY' : draft.category, current: undefined }) }} className="mt-1 block h-10 w-full rounded-md border border-white/10 bg-[#0b1220] px-3 text-sm text-white disabled:opacity-50"><option value="CITY">City</option><option value="COUNTRY">Country default</option><option value="GLOBAL">Global default</option></select></label>
              <label className="text-xs font-medium text-white/60">Category<select disabled={Boolean(draft.id)} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })} className="mt-1 block h-10 w-full rounded-md border border-white/10 bg-[#0b1220] px-3 text-sm text-white disabled:opacity-50"><option value="BUY">Buy</option><option value="RENT">Rent</option><option value="PROJECTS">Projects</option>{draft.scope === 'CITY' ? <option value="GENERIC">Generic city</option> : null}</select></label>
              {draft.scope !== 'GLOBAL' ? <label className="text-xs font-medium text-white/60">Country<select disabled={Boolean(draft.id)} value={draft.countryCode} onChange={(event) => setDraft({ ...draft, countryCode: event.target.value as CountryCode, cityId: '' })} className="mt-1 block h-10 w-full rounded-md border border-white/10 bg-[#0b1220] px-3 text-sm text-white disabled:opacity-50"><option value="INDIA">India</option><option value="UAE">United Arab Emirates</option></select></label> : null}
              {draft.scope === 'CITY' ? <div className="text-xs font-medium text-white/60">City<div className="mt-1 flex gap-2"><select disabled={Boolean(draft.id)} value={draft.cityId} onChange={(event) => setDraft({ ...draft, cityId: event.target.value })} className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-[#0b1220] px-3 text-sm text-white disabled:opacity-50"><option value="">Select a city</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select><button type="button" title="Add a city" onClick={() => setAddingCity((value) => !value)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 text-white/65 hover:bg-white/10"><Plus size={16} /></button></div>{addingCity ? <div className="mt-2 flex gap-2"><input value={newCityName} onChange={(event) => setNewCityName(event.target.value)} placeholder="New city name" className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-[#0b1220] px-3 text-sm text-white" /><button type="button" disabled={busy} onClick={() => void addCity()} className="rounded-md bg-white/10 px-3 text-xs font-semibold text-white">Add</button></div> : null}</div> : null}
            </div>

            <label className="block text-xs font-medium text-white/60">Headline<input value={draft.headline} maxLength={200} onChange={(event) => setDraft({ ...draft, headline: event.target.value })} placeholder="Explore homes in Mumbai" className="mt-1 h-10 w-full rounded-md border border-white/10 bg-[#0b1220] px-3 text-sm text-white outline-none focus:border-accent-yellow/50" /></label>
            <label className="block text-xs font-medium text-white/60">Subheadline<textarea value={draft.subheadline} maxLength={500} onChange={(event) => setDraft({ ...draft, subheadline: event.target.value })} rows={3} placeholder="Optional supporting copy" className="mt-1 w-full rounded-md border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none focus:border-accent-yellow/50" /></label>

            {(['desktop', 'mobile'] as Slot[]).map((slot) => {
              const selected = slot === 'desktop' ? desktopFile : mobileFile
              const existingUrl = slot === 'desktop' ? draft.current?.desktopImageUrl : draft.current?.mobileImageUrl
              const width = selected?.width || (slot === 'desktop' ? draft.current?.desktopWidth : draft.current?.mobileWidth)
              const height = selected?.height || (slot === 'desktop' ? draft.current?.desktopHeight : draft.current?.mobileHeight)
              const size = selected?.file.size || (slot === 'desktop' ? draft.current?.desktopFileSize : draft.current?.mobileFileSize) || null
              return <section key={slot} className="border-t border-white/10 pt-4">
                <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">{slot === 'desktop' ? 'Desktop image' : 'Mobile image'}</h3>{existingUrl && draft.id ? <button type="button" onClick={() => void removeImage(draft.current!, slot)} className="inline-flex items-center gap-1 text-xs text-red-300 hover:text-red-200"><Trash2 size={13} /> Remove</button> : null}</div>
                {selected || existingUrl ? <div className="grid gap-3 sm:grid-cols-[180px_1fr]"><img src={selected?.url || existingUrl || ''} alt={slot === 'desktop' ? draft.desktopImageAlt || 'Desktop hero preview' : draft.mobileImageAlt || 'Mobile hero preview'} className={`w-full rounded-md border border-white/10 object-cover ${slot === 'desktop' ? 'aspect-[4.27/1]' : 'aspect-[1.875/1]'}`} /><div className="space-y-2 text-xs text-white/50"><p>{width && height ? `${width} × ${height}px` : 'Dimensions unavailable'} · {formatBytes(size)}{selected ? ` · ${selected.file.type.replace('image/', '').toUpperCase()}` : ''}</p><label className="block text-white/60">Alt text<input value={slot === 'desktop' ? draft.desktopImageAlt : draft.mobileImageAlt} maxLength={300} onChange={(event) => setDraft({ ...draft, [slot === 'desktop' ? 'desktopImageAlt' : 'mobileImageAlt']: event.target.value })} className="mt-1 h-9 w-full rounded-md border border-white/10 bg-[#0b1220] px-3 text-sm text-white" /></label></div></div> : <p className="mb-2 text-xs text-amber-200/80">{slot === 'desktop' ? 'Desktop image missing.' : 'Mobile image missing; desktop image will be used.'}</p>}
                <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-white/15 px-3 py-2.5 text-xs text-white/65 hover:bg-white/[0.04]"><Upload size={15} />{selected || existingUrl ? 'Replace image' : 'Choose image'}<input type="file" accept={ACCEPTED_TYPES.join(',')} className="sr-only" onChange={(event) => void chooseImage(slot, event.target.files?.[0])} /></label>
                {progress[slot] !== null ? <div className="mt-2 h-1.5 overflow-hidden rounded bg-white/10"><div className="h-full bg-accent-yellow transition-[width]" style={{ width: `${progress[slot]}%` }} /></div> : null}
              </section>
            })}
            <p className="text-[11px] leading-5 text-white/40">Provisional artwork targets: desktop 1920 × 450; mobile 750 × 400. Ratios are advisory until confirmed with design. The website renders text as HTML over the image.</p>
          </div>

          <aside className="space-y-3 lg:border-l lg:border-white/10 lg:pl-5"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Preview</h3><div className="flex gap-1"><button type="button" onClick={() => setPreview({ banner: draft, mobile: false })} className="rounded border border-white/10 px-2 py-1 text-[11px] text-white/70">Desktop</button><button type="button" onClick={() => setPreview({ banner: draft, mobile: true })} className="rounded border border-white/10 px-2 py-1 text-[11px] text-white/70">Mobile</button></div></div><div className={`relative isolate flex aspect-[4.27/1] items-center justify-center overflow-hidden rounded-md bg-[#18324b] p-3 text-center ${preview?.mobile ? 'aspect-[1.875/1]' : ''}`}>{draftPreviewImage ? <img src={draftPreviewImage} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" /> : null}<div className="absolute inset-0 -z-10 bg-[#071827]/60" /><div className="max-w-[90%]"><p className="text-[10px] font-semibold uppercase tracking-wide text-accent-yellow">MillionFlats</p><h4 className="mt-1 text-base font-bold leading-tight sm:text-xl">{preview?.banner.headline || draft.headline || 'Your headline appears here'}</h4><p className="mx-auto mt-1 max-w-[95%] text-[10px] leading-4 text-white/80 sm:text-xs">{preview?.banner.subheadline || draft.subheadline || 'Your optional supporting text appears here.'}</p></div></div><p className="text-[11px] leading-5 text-white/40">Mobile image uses a separate asset when uploaded; otherwise the desktop image is reused.</p></aside>
        </div>
        {error ? <p role="alert" className="mx-5 mb-4 rounded-md border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">{error}</p> : null}
        <footer className="flex justify-end gap-2 border-t border-white/10 px-5 py-4"><button type="button" onClick={resetEditor} className="h-9 rounded-md border border-white/10 px-4 text-sm text-white/70">Cancel</button><button type="button" disabled={busy} onClick={() => void saveMetadata()} className="inline-flex h-9 items-center gap-2 rounded-md bg-accent-yellow px-4 text-sm font-semibold text-dark-blue disabled:opacity-50"><ImagePlus size={15} />{busy ? 'Saving…' : 'Save banner'}</button></footer>
      </section>
    </div> : null}

    {preview && !draft ? <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4"><section role="dialog" aria-modal="true" aria-label="Hero banner preview" className="w-full max-w-5xl rounded-lg border border-white/10 bg-[#101a2a] p-4"><header className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold">{preview.banner.headline || 'Banner preview'}</h2><p className="text-xs text-white/45">{preview.mobile ? 'Mobile composition' : 'Desktop composition'}</p></div><div className="flex gap-2"><button type="button" onClick={() => setPreview({ ...preview, mobile: !preview.mobile })} className="rounded border border-white/10 px-3 py-1.5 text-xs">{preview.mobile ? 'Desktop' : 'Mobile'}</button><button type="button" onClick={() => setPreview(null)} aria-label="Close preview" className="rounded p-2 text-white/60 hover:bg-white/10"><X size={16} /></button></div></header><div className={`relative isolate mx-auto flex aspect-[4.27/1] items-center justify-center overflow-hidden rounded-md bg-[#18324b] p-4 text-center ${preview.mobile ? 'max-w-[430px] aspect-[1.875/1]' : ''}`}>{draftPreviewImage ? <img src={draftPreviewImage} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" /> : null}<div className="absolute inset-0 -z-10 bg-[#071827]/60" /><div className="max-w-3xl"><h3 className="text-xl font-bold sm:text-4xl">{draftPreviewHeadline}</h3><p className="mt-2 text-xs text-white/80 sm:text-base">{draftPreviewSubtitle}</p></div></div></section></div> : null}
  </div>
}